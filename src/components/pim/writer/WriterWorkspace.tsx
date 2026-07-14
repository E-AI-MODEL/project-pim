// WriterWorkspace, inhoudscomponent voor de schrijfmodus binnen ProductShell.
//
// Dit is de refactor van WriterShell zonder eigen paginachrome:
// - geen eigen <header>, geen LiveTechMonitor (die zit in de gedeelde StatusFooter);
// - geen eigen usePimEngine, de shell-engine uit ProductShellContext wordt gebruikt;
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
  ShieldCheck,
  User,
  Hash,
  Mail,
  Calendar,
  MapPin,
  Copy as CopyIcon,
  Send,
  Eye,
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
    requestAction,
    writerContent,
    setWriterContent,
    writerAutoRedact: autoRedact,
    setWriterAutoRedact: setAutoRedactRaw,
    writerStrict: strict,
  } = useProductShell();
  const { detectionSettings, disabledCategories } = settings;

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
  const [foundSpans, setFoundSpans] = useState<PiiSpan[]>([]);
  const [safeText, setSafeText] = useState<string>("");
  const [egressMsg, setEgressMsg] = useState<string | null>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [analysisStale, setAnalysisStale] = useState(false);
  const usesNerSlm = usesBert(detectionSettings);
  const { nerSpans, nerStatus, startNer } = useNerSpans(plainText, { enabled: usesNerSlm });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);
  const applyingAnalysisRef = useRef(false);

  const pimPlugin = useMemo(() => createPimPlugin(), []);
  const initialContent =
    writerContent ??
    "<h1>Verslag over incident</h1><p>Op dinsdag 14 mei 2025 was er een incident in groep 7B van de Jan van Brabant school in Eindhoven.</p><p>Leerling Emma de Vries (leerlingnummer 12345) raakte betrokken bij een conflict tijdens de pauze op het schoolplein.</p><p>De ouders, mevrouw Sarah de Vries (e-mailadres: sarah.devries@email.nl), zijn op 14 mei 2025 geïnformeerd.</p><p>Er zijn verdere maatregelen genomen en de situatie is nu stabiel.</p>";
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none focus:outline-none min-h-[60vh] px-8 py-8 text-[15px] leading-relaxed",
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
    setHasAnalyzed(true);
    setAnalysisStale(false);
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
    // Bereken samengevatte bevindingen + veilige versie voor het rechter paneel.
    const allVisible = [...toMark];
    setFoundSpans(allVisible);
    setSafeText(buildSafeText(plain, all));
    if (toReplace.length > 0) {
      toReplace.sort((a, b) => b.from - a.from);
      const tr = editor.state.tr;
      for (const r of toReplace) tr.replaceWith(r.from, r.to, editor.schema.text(r.label));
      tr.setMeta("addToHistory", false);
      applyingAnalysisRef.current = true;
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
    const markAnalysisStale = () => {
      if (applyingAnalysisRef.current) {
        applyingAnalysisRef.current = false;
        return;
      }
      setClicked(null);
      if (hasAnalyzed) setAnalysisStale(true);
    };
    editor.on("update", markAnalysisStale);
    return () => {
      editor.off("update", markAnalysisStale);
    };
  }, [editor, hasAnalyzed]);

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
      setImportError("Alleen .docx-bestanden, voor andere formaten gebruik je de homepage.");
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
    setFoundSpans([]);
    setSafeText("");
    setPlainText("");
    setHasAnalyzed(false);
    setAnalysisStale(false);
    setWriterContent(null);
  }, [editor, setWriterContent]);
  // ProductShell luistert al naar "pim:reset" en wist gedeelde tekst; hier
  // wissen we tegelijk de editor zodat write-mode ook mee-reset.
  useEffect(() => {
    window.addEventListener("pim:reset", onClear);
    return () => window.removeEventListener("pim:reset", onClear);
  }, [onClear]);

  if (!mounted || !editor) return null;
  const totalFindings = foundSpans.length;
  const riskScore = Math.min(9, totalFindings);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" data-testid="writer-workspace">
      {/* LEFT, editor card */}
      <section className="rounded-2xl border border-[#e5e7ef] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-[#eef0f5] px-4 py-2.5">
          <Toolbar editor={editor} />
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={scan}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#6d4aff] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#5b3dea]"
            >
              <ShieldCheck className="h-4 w-4" />
              Analyseer
            </button>
            <LightAction icon={<Upload className="h-4 w-4" />} label="Import" onClick={onImportClick} />
            <LightAction icon={<Download className="h-4 w-4" />} label="Export" onClick={onExport} />
            <LightAction icon={<Trash2 className="h-4 w-4" />} label="Leeg" onClick={onClear} />
          </div>
        </div>
        {importError && (
          <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {importError}
          </div>
        )}
        {importWarnings.length > 0 && (
          <div className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {importWarnings.join(" · ")}
          </div>
        )}
        <div ref={editorRootRef} className="flex-1">
          <EditorContent editor={editor} />
        </div>
        <div className="border-t border-[#eef0f5] px-4 py-2.5 flex items-center justify-between text-[12px] text-[#64748b]">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#6d4aff]" />
            {hasAnalyzed
              ? analysisStale
                ? "Tekst gewijzigd, analyseer opnieuw."
                : "Analyse klaar."
              : "Klik op Analyseer om je tekst te controleren."}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${totalFindings > 0 ? "bg-rose-500" : "bg-emerald-500"}`} />
            {totalFindings > 0 ? `risicoscore ${riskScore}` : "geen risico"}
          </span>
        </div>
      </section>

      {/* RIGHT, privacy panel */}
      <aside className="space-y-3">
        <FindingsCard
          spans={foundSpans}
          score={riskScore}
          analyzed={hasAnalyzed}
          stale={analysisStale}
        />
        <SafeVersionCard
          safeText={safeText}
          hasFindings={totalFindings > 0}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(safeText);
              setEgressMsg("Veilige versie staat op je klembord.");
            } catch {
              setEgressMsg("Kopiëren lukte niet, probeer het opnieuw.");
            }
          }}
          onDownload={() => {
            const blob = new Blob([safeText], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `pim-veilige-versie-${new Date().toISOString().slice(0, 10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          onSendAI={async () => {
            const r = await requestAction({ action: "send_external_ai", payloadText: safeText });
            setEgressMsg(r.executed ? `✓ ${r.reason}` : `✗ ${r.reason}`);
          }}
        />
        {egressMsg && (
          <div className="rounded-lg border border-[#e5e7ef] bg-white px-3 py-2 text-[12px] text-[#334155]">
            {egressMsg}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-[#94a3b8]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            Lokaal · {stats.scrubbed} gewist · {stats.marked} gemarkeerd
          </span>
          <WriterStatusBar
            nerStatus={nerStatus}
            onStartNer={startNer}
            detectionSettings={detectionSettings}
          />
        </div>
      </aside>

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
          className="z-50 rounded-xl border border-[#e5e7ef] bg-white p-2 shadow-lg flex gap-2"
        >
          <button
            className="rounded-md bg-[#6d4aff] px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-[#5b3dea]"
            onClick={replaceClicked}
          >
            Vervang
          </button>
          <button
            className="rounded-md border border-[#e5e7ef] px-2.5 py-1 text-[12px] text-[#334155] hover:bg-[#f6f7fb]"
            onClick={ignoreClicked}
          >
            Negeer
          </button>
          <button
            className="rounded-md px-2 py-1 text-[#64748b] hover:bg-[#f1f2f7]"
            onClick={() => setClicked(null)}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function LightAction({
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
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e5e7ef] bg-white px-2.5 text-[12px] font-medium text-[#334155] transition-colors hover:bg-[#f6f7fb]"
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (label: string, icon: React.ReactNode, action: () => void, active = false) => (
    <button
      type="button"
      title={label}
      onClick={action}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-[#475569] transition-colors hover:bg-[#f1f2f7] ${active ? "bg-[#6d4aff]/10 text-[#6d4aff]" : ""}`}
    >
      {icon}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-0.5">
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
      <span className="mx-1 h-5 w-px bg-[#e5e7ef]" />
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
    ? "bg-emerald-500"
    : nerStatus?.loading
      ? "bg-amber-400 animate-pulse"
      : nerStatus?.error
        ? "bg-rose-500"
        : "bg-slate-300";
  const canStart = detectionSettings.bert !== "off" && !nerStatus?.working && !nerStatus?.loading;
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] text-[#64748b]">
      <span className={`h-2 w-2 rounded-full ${tone}`} />
      <span>{label}</span>
      {canStart && (
        <button
          onClick={onStartNer}
          className="font-medium text-[#6d4aff] underline underline-offset-2 hover:text-[#5b3dea]"
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

// ============================================================================
// Privacy sidebar
// ============================================================================

type Group = {
  key: string;
  label: string;
  icon: React.ReactNode;
  cats: readonly PiiCategory[];
};

const GROUPS: readonly Group[] = [
  {
    key: "names",
    label: "Persoonsnamen",
    icon: <User className="h-3.5 w-3.5" />,
    cats: ["name"],
  },
  {
    key: "ids",
    label: "Identificatoren",
    icon: <Hash className="h-3.5 w-3.5" />,
    cats: ["bsn", "iban", "student_id", "id_document", "license_plate", "class_code", "credit_card"],
  },
  {
    key: "contact",
    label: "Contactgegevens",
    icon: <Mail className="h-3.5 w-3.5" />,
    cats: ["email", "phone", "address", "postcode", "url", "social_handle", "ip_address"],
  },
  {
    key: "dates",
    label: "Data",
    icon: <Calendar className="h-3.5 w-3.5" />,
    cats: ["date", "birthdate_text"],
  },
  {
    key: "loc",
    label: "Locaties & context",
    icon: <MapPin className="h-3.5 w-3.5" />,
    cats: ["school", "context_location_specific", "context_incident", "context_care", "context_health", "context_family", "context_legal", "context_financial"],
  },
];

function FindingsCard({
  spans,
  score,
  analyzed,
  stale,
}: {
  spans: PiiSpan[];
  score: number;
  analyzed: boolean;
  stale: boolean;
}) {
  const counts = new Map<string, number>();
  for (const s of spans) {
    for (const g of GROUPS) {
      if ((g.cats as readonly string[]).includes(s.category)) {
        counts.set(g.key, (counts.get(g.key) ?? 0) + 1);
        break;
      }
    }
  }
  const total = spans.length;
  const title = !analyzed
    ? "Nog niet geanalyseerd"
    : stale
      ? "Analyse verouderd"
      : total > 0
        ? "Gevoelige informatie gevonden"
        : "Geen gevoelige informatie gevonden";
  const subtitle = !analyzed
    ? "Klik op Analyseer om deze tekst te controleren."
    : stale
      ? "Je hebt daarna nog tekst aangepast. Analyseer opnieuw."
      : total > 0
        ? "PiM vond persoonsgegevens en gevoelige context in je tekst."
        : "Je tekst is schoon, er staan geen persoonsgegevens in.";
  const iconTone = !analyzed || stale
    ? "bg-amber-50 text-amber-600"
    : total > 0
      ? "bg-[#6d4aff]/10 text-[#6d4aff]"
      : "bg-emerald-50 text-emerald-600";
  const scoreTone = !analyzed || stale
    ? "text-amber-600"
    : total > 0
      ? "text-[#6d4aff]"
      : "text-emerald-600";
  return (
    <div className="rounded-2xl border border-[#e5e7ef] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#eef0f5] flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
          Privacycontrole
        </div>
      </div>
      <div className="px-4 py-4 flex items-start gap-3">
          <span className={`shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconTone}`}>
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-[#0f172a]">{title}</div>
          <div className="text-[12px] text-[#64748b] leading-snug mt-0.5">{subtitle}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-2xl font-bold leading-none ${scoreTone}`}>
            {analyzed ? score : "–"}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[#94a3b8] mt-0.5">punten</div>
        </div>
      </div>
      <div className="px-4 pb-2">
        {total > 0 && (
          <>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b] px-1 pb-2 flex items-center justify-between">
              <span>Wat PiM vond</span>
              <span className="text-[#94a3b8]">{total}</span>
            </div>
            <ul className="divide-y divide-[#eef0f5] border-t border-[#eef0f5]">
              {GROUPS.filter((g) => (counts.get(g.key) ?? 0) > 0).map((g) => {
                const n = counts.get(g.key) ?? 0;
                return (
                  <li key={g.key} className="flex items-center gap-2.5 py-2 px-1 text-[13px]">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#f1f2f7] text-[#64748b]">
                      {g.icon}
                    </span>
                    <span className="text-[#0f172a]">{g.label}</span>
                    <span className="ml-auto text-[12px] tabular-nums text-[#0f172a] font-semibold">
                      {n}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function SafeVersionCard({
  safeText,
  hasFindings,
  onCopy,
  onDownload,
  onSendAI,
}: {
  safeText: string;
  hasFindings: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onSendAI: () => void;
}) {
  const [showFull, setShowFull] = useState(false);
  const preview = safeText.length > 260 && !showFull ? safeText.slice(0, 260) + "…" : safeText;
  return (
    <div className="rounded-2xl border border-[#e5e7ef] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#eef0f5] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-[#0f172a]">Veilige versie</div>
            <div className="text-[11px] text-[#64748b]">
              {hasFindings ? "Klaar om te delen" : "Nog niets aangepast"}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowFull((v) => !v)}
          className="inline-flex items-center gap-1 text-[12px] text-[#64748b] hover:text-[#0f172a]"
        >
          <Eye className="h-3.5 w-3.5" />
          {showFull ? "Vouw in" : "Bekijk"}
        </button>
      </div>
      <div className="px-4 py-3 text-[12.5px] text-[#334155] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
        {preview || <span className="text-[#94a3b8]">Nog geen tekst om te tonen.</span>}
      </div>
      <div className="grid grid-cols-3 gap-1.5 border-t border-[#eef0f5] p-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#6d4aff] hover:bg-[#5b3dea] px-2 py-2 text-[12px] font-semibold text-white"
        >
          <CopyIcon className="h-3.5 w-3.5" />
          Kopiëren
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e5e7ef] bg-white hover:bg-[#f6f7fb] px-2 py-2 text-[12px] font-medium text-[#334155]"
        >
          <Download className="h-3.5 w-3.5" />
          Downloaden
        </button>
        <button
          type="button"
          onClick={onSendAI}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e5e7ef] bg-white hover:bg-[#f6f7fb] px-2 py-2 text-[12px] font-medium text-[#334155]"
        >
          <Send className="h-3.5 w-3.5" />
          Naar AI
        </button>
      </div>
    </div>
  );
}

function buildSafeText(plain: string, spans: PiiSpan[]): string {
  if (!plain) return "";
  // Ontdubbel overlappende spans (detectors leveren soms meerdere spans op
  // hetzelfde bereik). Zonder deze stap corrupte je "conflict tijdens" tot
  // "de[incident]p het schoolplein".
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: PiiSpan[] = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) continue;
    merged.push(s);
  }
  let out = "";
  let cursor = 0;
  for (const s of merged) {
    out += plain.slice(cursor, s.start);
    out += GENERALIZATIONS[s.category] ?? "[…]";
    cursor = s.end;
  }
  out += plain.slice(cursor);
  return out;
}
