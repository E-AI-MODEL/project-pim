// WriterWorkspace — inhoudscomponent voor de schrijfmodus binnen ProductShell.
//
// Dit is de refactor van WriterShell zonder eigen paginachrome:
// - geen eigen <header>, geen LiveTechMonitor (die zit in de gedeelde StatusFooter);
// - geen eigen usePimEngine — de shell-engine uit ProductShellContext wordt gebruikt;
// - AppHeader, TrustBadge, BurgerMenu, ModeSwitcher, LocalStatusPill komen uit
//   de ProductShell. De workspace levert alleen editor + writer-specifieke acties
//   (import/export/leeg, AdvancedPanel writer-tab, live highlights).

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Upload,
  Download,
  Trash2,
  X,
} from "lucide-react";
import {
  usesBert,
  type DetectionLayerSettings,
  type PiiCategory,
  type PiiSpan,
  type NerStatus,
} from "@/lib/pim";
import { useNerSpans } from "@/hooks/useNerSpans";
import { useProductShell } from "@/components/pim/product/ProductShellContext";
import { GENERALIZATIONS } from "./pimGeneralizations";
import {
  createPimPlugin,
  pimPluginKey,
  extractPlain,
  spanToRange,
  buildDecorations,
} from "./pimPlugin";
import { importDocxToEditor, exportEditorToDocx } from "./docxIO";
import { isValidBsn, isValidIban, isValidLicensePlate, hasStudentIdContext } from "./validators";

interface ClickedSpan {
  from: number;
  to: number;
  cat: PiiCategory;
  text: string;
  x: number;
  y: number;
}

export function WriterWorkspace() {
  // ProductShell-context is de bron van waarheid voor engine, settings en reset.
  const {
    evaluate,
    settings,
    writerContent,
    setWriterContent,
    writerAutoRedact: autoRedact,
    setWriterAutoRedact: setAutoRedactRaw,
    writerStrict: strict,
  } = useProductShell();
  const { detectionSettings, disabledCategories } = settings;
  const setAutoRedact = useCallback(
    (updater: (prev: ReadonlySet<PiiCategory>) => ReadonlySet<PiiCategory>) => {
      setAutoRedactRaw(updater(autoRedact));
    },
    [autoRedact, setAutoRedactRaw],
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ scrubbed: 0, marked: 0 });
  const [clicked, setClicked] = useState<ClickedSpan | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [plainText, setPlainText] = useState("");
  const usesNerSlm = usesBert(detectionSettings);
  const { nerSpans, nerStatus, startNer } = useNerSpans(plainText, { enabled: usesNerSlm });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);

  const pimPlugin = useMemo(() => createPimPlugin(), []);
  const initialContent =
    writerContent ??
    "<h1>Nieuwe notitie</h1><p>Begin met typen — PiM leest mee. Namen worden gemarkeerd; harde gegevens zoals BSN, e-mail en telefoonnummer worden direct vervangen door een label.</p>";
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none focus:outline-none min-h-[50vh] px-6 py-8 text-[15px] leading-relaxed",
      },
    },
  });

  // Persist editorinhoud in de shell zodat modewissel (write → quick → write)
  // de tekst behoudt. We schrijven pas bij unmount en niet tijdens typen om
  // renderloops te vermijden.
  useEffect(() => {
    if (!editor) return;
    return () => {
      try {
        setWriterContent(editor.getHTML());
      } catch {
        /* editor may already be destroyed */
      }
    };
  }, [editor, setWriterContent]);

  useEffect(() => {
    if (!editor) return;
    const view = editor.view;
    view.updateState(view.state.reconfigure({ plugins: [...view.state.plugins, pimPlugin] }));
  }, [editor, pimPlugin]);

  const scan = useCallback(() => {
    if (!editor) return;
    const { plain, map } = extractPlain(editor.state.doc);
    setPlainText(plain);
    const next = evaluate({ text: plain, mode: "anonymous", extraSpans: nerSpans });
    const signals = next.signals;
    if (!signals) return;
    let all = [...signals.directPii, ...signals.contextualPii];
    if (strict) {
      all = all.filter((s) => {
        if (s.category === "bsn") return isValidBsn(s.text);
        if (s.category === "iban") return isValidIban(s.text);
        if (s.category === "license_plate") return isValidLicensePlate(s.text);
        if (s.category === "student_id") return hasStudentIdContext(plain, s.start, s.end);
        return true;
      });
    }
    const sel = editor.state.selection;
    const cursorFrom = Math.min(sel.from, sel.to);
    const toReplace: { from: number; to: number; label: string }[] = [];
    const toMark: PiiSpan[] = [];
    for (const s of all) {
      const r = spanToRange(s, map);
      if (!r) continue;
      if (autoRedact.has(s.category)) {
        if (r.to + 1 <= cursorFrom)
          toReplace.push({ ...r, label: GENERALIZATIONS[s.category] ?? "[geredacteerd]" });
        else toMark.push(s);
      } else {
        const ignKey = `${s.category}:${s.text.toLowerCase()}`;
        if (!ignored.has(ignKey)) toMark.push(s);
      }
    }
    if (toReplace.length > 0) {
      toReplace.sort((a, b) => b.from - a.from);
      const tr = editor.state.tr;
      for (const r of toReplace) tr.replaceWith(r.from, r.to, editor.schema.text(r.label));
      tr.setMeta("addToHistory", false);
      editor.view.dispatch(tr);
      setStats((p) => ({ scrubbed: p.scrubbed + toReplace.length, marked: p.marked }));
      return;
    }
    editor.view.dispatch(
      editor.state.tr.setMeta(pimPluginKey, {
        decorations: buildDecorations(toMark, map, editor.state.doc),
      }),
    );
    setStats((p) => ({ scrubbed: p.scrubbed, marked: toMark.length }));
  }, [editor, autoRedact, ignored, strict, nerSpans, evaluate]);

  useEffect(() => {
    if (!editor) return;
    let raf = 0;
    const debounced = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTimeout(scan, 120));
    };
    editor.on("update", debounced);
    debounced();
    return () => {
      cancelAnimationFrame(raf);
      editor.off("update", debounced);
    };
  }, [editor, scan]);

  useEffect(() => {
    const root = editorRootRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(".pim-pii") as HTMLElement | null;
      if (!target) {
        setClicked(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setClicked({
        from: Number(target.dataset.from),
        to: Number(target.dataset.to),
        cat: target.dataset.cat as PiiCategory,
        text: target.dataset.text ?? "",
        x: rect.left,
        y: rect.bottom + window.scrollY,
      });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [editor]);

  const replaceClicked = () => {
    if (!editor || !clicked) return;
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.replaceWith(
          clicked.from,
          clicked.to,
          editor.schema.text(GENERALIZATIONS[clicked.cat] ?? "[geredacteerd]"),
        );
        return true;
      })
      .run();
    setClicked(null);
  };
  const ignoreClicked = () => {
    if (!clicked) return;
    setIgnored((prev) => {
      const next = new Set(prev);
      next.add(`${clicked.cat}:${clicked.text.toLowerCase()}`);
      return next;
    });
    setClicked(null);
  };

  const onImportClick = () => fileInputRef.current?.click();
  const onFile = async (files: FileList | null) => {
    setImportError(null);
    setImportWarnings([]);
    if (!files || files.length === 0 || !editor) return;
    const file = files[0];
    if (!/\.docx$/i.test(file.name)) {
      setImportError("Alleen .docx-bestanden — voor andere formaten gebruik je de homepage.");
      return;
    }
    try {
      const { warnings } = await importDocxToEditor(file, editor);
      if (warnings.length > 0) setImportWarnings(warnings);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Kon document niet lezen.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const onExport = async () => {
    if (!editor) return;
    const { plain } = (await import("./pimPlugin")).extractPlain(editor.state.doc);
    const next = evaluate({ text: plain, mode: "anonymous", extraSpans: nerSpans });
    const sig = next.signals ?? { directPii: [], contextualPii: [] };
    const total = sig.directPii.length + sig.contextualPii.length;
    if (total > 0) {
      const cats = Array.from(
        new Set([...sig.directPii, ...sig.contextualPii].map((s) => s.category)),
      ).join(", ");
      const choice = window.prompt(
        `Let op: het document bevat nog ${total} gevoelige term${total === 1 ? "" : "en"} (${cats}).\n\nTyp 'wis' om alles automatisch te vervangen door labels, 'ja' om toch te exporteren, of laat leeg om te annuleren.`,
        "",
      );
      if (!choice) return;
      if (choice.trim().toLowerCase() === "wis") {
        setAutoRedactRaw(
          new Set<PiiCategory>([
            ...autoRedact,
            ...sig.directPii.map((s) => s.category),
            ...sig.contextualPii.map((s) => s.category),
          ]),
        );
        await new Promise((r) => setTimeout(r, 250));
      } else if (choice.trim().toLowerCase() !== "ja") return;
    }
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    await exportEditorToDocx(editor, `pim-notitie-${ts}.docx`);
  };
  const onClear = useCallback(() => {
    if (!editor) return;
    editor.commands.setContent("<p></p>");
    setIgnored(new Set());
    setStats({ scrubbed: 0, marked: 0 });
    setWriterContent(null);
  }, [editor, setWriterContent]);
  // ProductShell luistert al naar "pim:reset" en wist gedeelde tekst; hier
  // wissen we tegelijk de editor zodat write-mode ook mee-reset.
  useEffect(() => {
    window.addEventListener("pim:reset", onClear);
    return () => window.removeEventListener("pim:reset", onClear);
  }, [onClear]);

  if (!mounted || !editor) return null;
  return (
    <div className="space-y-4" data-testid="writer-workspace">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#101f3d] px-4 py-3">
        <WriterStatusBar
          nerStatus={nerStatus}
          onStartNer={startNer}
          detectionSettings={detectionSettings}
        />
        <div className="flex shrink-0 items-center gap-2">
          <WorkspaceAction
            icon={<Upload className="h-4 w-4" />}
            label="Import"
            onClick={onImportClick}
          />
          <WorkspaceAction
            icon={<Download className="h-4 w-4" />}
            label="Export"
            onClick={onExport}
          />
          <WorkspaceAction icon={<Trash2 className="h-4 w-4" />} label="Leeg" onClick={onClear} />
        </div>
      </div>
      <AdvancedPanel
        {...advancedPanelProps}
        writer={{
          autoRedact,
          onAutoRedactChange: (cat, scrub) =>
            setAutoRedact((p) => {
              const n = new Set(p);
              if (scrub) n.add(cat);
              else n.delete(cat);
              return n;
            }),
          strict,
          onStrictChange: setStrict,
        }}
        ner={{ status: nerStatus, onStart: startNer, available: usesNerSlm }}
      />
      {importError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {importError}
        </div>
      )}
      {importWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          {importWarnings.join(" · ")}
        </div>
      )}
      <Toolbar editor={editor} />
      <div
        ref={editorRootRef}
        className="rounded-[1.75rem] border border-white/10 bg-[#101f3d] shadow-[0_18px_55px_rgba(0,0,0,0.25)] overflow-hidden"
      >
        <EditorContent editor={editor} />
      </div>
      <div className="text-xs text-[#e8edf3]/55 flex gap-3">
        <span>Gewist: {stats.scrubbed}</span>
        <span>Gemarkeerd: {stats.marked}</span>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        hidden
        onChange={(e) => void onFile(e.target.files)}
      />
      {clicked && (
        <div
          style={{ position: "absolute", left: clicked.x, top: clicked.y }}
          className="z-50 rounded-xl border border-white/15 bg-[#101b35] p-2 shadow-xl flex gap-2"
        >
          <button className="btn-lite" onClick={replaceClicked}>
            Vervang
          </button>
          <button className="btn-lite" onClick={ignoreClicked}>
            Negeer
          </button>
          <button className="btn-lite" onClick={() => setClicked(null)}>
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function WorkspaceAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/[0.07]"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (label: string, icon: React.ReactNode, action: () => void, active = false) => (
    <button
      type="button"
      title={label}
      onClick={action}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-200 transition-colors hover:bg-white/[0.07] ${active ? "bg-cyan-300/14 text-cyan-100" : ""}`}
    >
      {icon}
    </button>
  );
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101f3d] p-2 flex flex-wrap gap-1">
      {btn(
        "Vet",
        <Bold className="h-4 w-4" />,
        () => editor.chain().focus().toggleBold().run(),
        editor.isActive("bold"),
      )}
      {btn(
        "Cursief",
        <Italic className="h-4 w-4" />,
        () => editor.chain().focus().toggleItalic().run(),
        editor.isActive("italic"),
      )}
      {btn(
        "Kop 1",
        <Heading1 className="h-4 w-4" />,
        () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        editor.isActive("heading", { level: 1 }),
      )}
      {btn(
        "Kop 2",
        <Heading2 className="h-4 w-4" />,
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        editor.isActive("heading", { level: 2 }),
      )}
      {btn(
        "Lijst",
        <List className="h-4 w-4" />,
        () => editor.chain().focus().toggleBulletList().run(),
        editor.isActive("bulletList"),
      )}
      {btn(
        "Nummerlijst",
        <ListOrdered className="h-4 w-4" />,
        () => editor.chain().focus().toggleOrderedList().run(),
        editor.isActive("orderedList"),
      )}
      {btn(
        "Quote",
        <Quote className="h-4 w-4" />,
        () => editor.chain().focus().toggleBlockquote().run(),
        editor.isActive("blockquote"),
      )}
      <span className="mx-1 w-px bg-white/10" />
      {btn("Ongedaan", <Undo2 className="h-4 w-4" />, () => editor.chain().focus().undo().run())}
      {btn("Opnieuw", <Redo2 className="h-4 w-4" />, () => editor.chain().focus().redo().run())}
    </div>
  );
}

function WriterStatusBar({
  nerStatus,
  onStartNer,
  detectionSettings,
}: {
  nerStatus: NerStatus | null;
  onStartNer: () => void;
  detectionSettings: DetectionLayerSettings;
}) {
  const label = writerBertLabel(nerStatus, detectionSettings);
  const tone = nerStatus?.working
    ? "bg-emerald-400"
    : nerStatus?.loading
      ? "bg-amber-300 animate-pulse"
      : nerStatus?.error
        ? "bg-red-400"
        : "bg-cyan-400/70";
  const canStart = detectionSettings.bert !== "off" && !nerStatus?.working && !nerStatus?.loading;
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-300/70">
      <span className={`h-2 w-2 rounded-full ${tone}`} />
      <span>{label}</span>
      {canStart && (
        <button
          onClick={onStartNer}
          className="font-medium text-slate-200 underline underline-offset-2 hover:text-white"
        >
          Zet aan
        </button>
      )}
    </div>
  );
}

function writerBertLabel(status: NerStatus | null, settings: DetectionLayerSettings): string {
  if (settings.bert === "off") return "BERT uit";
  const size = settings.bert === "100mb" ? "BERT 100 MB" : "BERT 180 MB";
  if (status?.working) return `${size} werkt`;
  if (status?.loading) return `${size} laden/testen`;
  if (status?.error || status?.healthError) return `${size} fout`;
  return `${size} niet geladen`;
}
