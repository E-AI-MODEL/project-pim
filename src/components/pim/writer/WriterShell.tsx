// Schrijfmodus — Word-achtige editor met PiM ingebouwd.
// - Live highlights tijdens typen
// - Klik op gemarkeerde tekst: vervang / negeer
// - Harde PII (BSN/IBAN/email/telefoon/...) wordt direct auto-geredact
// - Import .docx (mammoth) + export .docx (docx package)

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Undo2, Redo2,
  Upload, Download, Settings2, Shield, Trash2, X, Check,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  computeSignals, DEFAULT_PROFILE, type PiiCategory, type PiiSpan,
} from "@/lib/pim";
import { GENERALIZATIONS, DEFAULT_AUTO_REDACT, CATEGORY_LABELS } from "./pimGeneralizations";
import {
  createPimPlugin, pimPluginKey, extractPlain, spanToRange, buildDecorations,
} from "./pimPlugin";
import { importDocxToEditor, exportEditorToDocx } from "./docxIO";

interface ClickedSpan {
  from: number;
  to: number;
  cat: PiiCategory;
  text: string;
  x: number;
  y: number;
}

export function WriterShell() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [autoRedact, setAutoRedact] = useState<Set<PiiCategory>>(
    () => new Set(DEFAULT_AUTO_REDACT),
  );
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ scrubbed: 0, marked: 0 });
  const [clicked, setClicked] = useState<ClickedSpan | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);

  const pimPlugin = useMemo(() => createPimPlugin(), []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content:
      "<h1>Nieuwe notitie</h1><p>Begin met typen — PiM leest mee. Namen krijgen een onderstreping; harde PII (BSN, e-mail, telefoon…) wordt direct vervangen door een label.</p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none focus:outline-none min-h-[50vh] px-6 py-8 text-[15px] leading-relaxed",
      },
    },
  });

  // Plugin registreren zodra de editor er is.
  useEffect(() => {
    if (!editor) return;
    const view = editor.view;
    const newState = view.state.reconfigure({
      plugins: [...view.state.plugins, pimPlugin],
    });
    view.updateState(newState);
  }, [editor, pimPlugin]);

  // Scan + redact loop.
  const autoRedactKey = useMemo(() => Array.from(autoRedact).sort().join(","), [autoRedact]);
  const ignoredKey = useMemo(() => Array.from(ignored).sort().join("|"), [ignored]);

  const scan = useCallback(() => {
    if (!editor) return;
    const { plain, map } = extractPlain(editor.state.doc);
    const signals = computeSignals(plain, [], DEFAULT_PROFILE, new Set());
    let all = [...signals.directPii, ...signals.contextualPii];

    // Aanscherping: identifier-validators verwerpen willekeurige cijferreeksen.
    if (strict) {
      all = all.filter((s) => {
        if (s.category === "bsn") return isValidBsn(s.text);
        if (s.category === "iban") return isValidIban(s.text);
        if (s.category === "license_plate") return isValidLicensePlate(s.text);
        return true;
      });
    }

    // Bugfix: nooit redacten terwijl gebruiker er nog in typt.
    const sel = editor.state.selection;
    const cursorFrom = Math.min(sel.from, sel.to);

    // 1) Auto-redact: harde PII direct vervangen, achteraan beginnen.
    const toReplace: { from: number; to: number; label: string }[] = [];
    const toMark: PiiSpan[] = [];
    for (const s of all) {
      const r = spanToRange(s, map);
      if (!r) continue;
      if (autoRedact.has(s.category)) {
        // 1 char veiligheidsmarge na de span: wacht tot cursor er voorbij is.
        if (r.to + 1 <= cursorFrom) {
          toReplace.push({ ...r, label: GENERALIZATIONS[s.category] ?? "[geredacteerd]" });
        } else {
          toMark.push(s); // tijdelijk markeren tot de cursor voorbij is
        }
      } else {
        const ignKey = `${s.category}:${s.text.toLowerCase()}`;
        if (!ignored.has(ignKey)) toMark.push(s);
      }
    }

    if (toReplace.length > 0) {
      toReplace.sort((a, b) => b.from - a.from);
      const tr = editor.state.tr;
      for (const r of toReplace) {
        tr.replaceWith(r.from, r.to, editor.schema.text(r.label));
      }
      tr.setMeta("addToHistory", false);
      editor.view.dispatch(tr);
      setStats((p) => ({ scrubbed: p.scrubbed + toReplace.length, marked: p.marked }));
      return; // volgende update herloopt
    }

    const decorations = buildDecorations(toMark, map, editor.state.doc);
    const tr = editor.state.tr.setMeta(pimPluginKey, { decorations });
    editor.view.dispatch(tr);
    setStats((p) => ({ scrubbed: p.scrubbed, marked: toMark.length }));
  }, [editor, autoRedact, ignored, strict]);

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
  }, [editor, scan, autoRedactKey, ignoredKey, strict]);

  // Klik op highlight → popover.
  useEffect(() => {
    const root = editorRootRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(".pim-pii") as HTMLElement | null;
      if (!target) {
        setClicked(null);
        return;
      }
      const from = Number(target.dataset.from);
      const to = Number(target.dataset.to);
      const cat = target.dataset.cat as PiiCategory;
      const text = target.dataset.text ?? "";
      const rect = target.getBoundingClientRect();
      setClicked({ from, to, cat, text, x: rect.left, y: rect.bottom + window.scrollY });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [editor]);

  const replaceClicked = () => {
    if (!editor || !clicked) return;
    const label = GENERALIZATIONS[clicked.cat] ?? "[geredacteerd]";
    editor.chain().focus().command(({ tr }) => {
      tr.replaceWith(clicked.from, clicked.to, editor.schema.text(label));
      return true;
    }).run();
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
    if (!files || files.length === 0 || !editor) return;
    const file = files[0];
    if (!/\.docx$/i.test(file.name)) {
      setImportError("Alleen .docx-bestanden — voor andere formaten gebruik je de homepage.");
      return;
    }
    try {
      await importDocxToEditor(file, editor);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Kon document niet lezen.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const onExport = async () => {
    if (!editor) return;
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    await exportEditorToDocx(editor, `pim-notitie-${ts}.docx`);
  };
  const onClear = () => {
    if (!editor) return;
    editor.commands.setContent("<p></p>");
    setIgnored(new Set());
    setStats({ scrubbed: 0, marked: 0 });
  };

  if (!mounted || !editor) {
    return <div className="p-10 text-sm text-muted-foreground">Editor laden…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10 space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary uppercase tracking-wider mb-2">
            <Shield className="h-3 w-3" /> Schrijfmodus · live PiM
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight">
            Schrijf veilig — PiM redigeert mee
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Type of plak (ook uit Word). Harde PII verdwijnt direct, naam-achtige
            signalen krijgen een onderstreping — klik om te vervangen of te negeren.
          </p>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        className="sr-only"
        onChange={(e) => onFile(e.target.files)}
      />

      <WriterToolbar
        editor={editor}
        autoRedact={autoRedact}
        setAutoRedact={setAutoRedact}
        onImport={onImportClick}
        onExport={onExport}
        onClear={onClear}
        stats={stats}
      />

      {importError && (
        <div className="text-xs rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-200 px-3 py-2">
          {importError}
        </div>
      )}

      <div
        ref={editorRootRef}
        className="relative rounded-2xl border border-border/60 bg-card/40 shadow-sm overflow-hidden"
      >
        <EditorContent editor={editor} />
      </div>

      {clicked && (
        <ClickedPopover
          clicked={clicked}
          onReplace={replaceClicked}
          onIgnore={ignoreClicked}
          onClose={() => setClicked(null)}
        />
      )}

      {ignored.size > 0 && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
          <span>Genegeerd:</span>
          {Array.from(ignored).map((k) => {
            const [, text] = k.split(":");
            return (
              <button
                key={k}
                type="button"
                onClick={() => setIgnored((prev) => { const n = new Set(prev); n.delete(k); return n; })}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 hover:bg-accent/30"
                title="Klik om de markering weer te tonen"
              >
                {text} <X className="h-2.5 w-2.5" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WriterToolbar({
  editor, autoRedact, setAutoRedact, onImport, onExport, onClear, stats,
}: {
  editor: Editor;
  autoRedact: Set<PiiCategory>;
  setAutoRedact: (s: Set<PiiCategory>) => void;
  onImport: () => void;
  onExport: () => void;
  onClear: () => void;
  stats: { scrubbed: number; marked: number };
}) {
  const btn = "inline-flex items-center justify-center h-8 w-8 rounded-md text-foreground/70 hover:text-foreground hover:bg-accent/40 transition-colors";
  const btnActive = "bg-accent/60 text-foreground";
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border/60 bg-card/40 px-2 py-1.5">
      <button className={`${btn} ${editor.isActive("bold") ? btnActive : ""}`} onClick={() => editor.chain().focus().toggleBold().run()} title="Vet"><Bold className="h-4 w-4" /></button>
      <button className={`${btn} ${editor.isActive("italic") ? btnActive : ""}`} onClick={() => editor.chain().focus().toggleItalic().run()} title="Cursief"><Italic className="h-4 w-4" /></button>
      <span className="h-5 w-px bg-border/60 mx-1" />
      <button className={`${btn} ${editor.isActive("heading", { level: 1 }) ? btnActive : ""}`} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Kop 1"><Heading1 className="h-4 w-4" /></button>
      <button className={`${btn} ${editor.isActive("heading", { level: 2 }) ? btnActive : ""}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Kop 2"><Heading2 className="h-4 w-4" /></button>
      <button className={`${btn} ${editor.isActive("bulletList") ? btnActive : ""}`} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Opsomming"><List className="h-4 w-4" /></button>
      <button className={`${btn} ${editor.isActive("orderedList") ? btnActive : ""}`} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Nummering"><ListOrdered className="h-4 w-4" /></button>
      <button className={`${btn} ${editor.isActive("blockquote") ? btnActive : ""}`} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citaat"><Quote className="h-4 w-4" /></button>
      <span className="h-5 w-px bg-border/60 mx-1" />
      <button className={btn} onClick={() => editor.chain().focus().undo().run()} title="Ongedaan maken"><Undo2 className="h-4 w-4" /></button>
      <button className={btn} onClick={() => editor.chain().focus().redo().run()} title="Opnieuw"><Redo2 className="h-4 w-4" /></button>
      <span className="h-5 w-px bg-border/60 mx-1" />
      <button className={btn} onClick={onImport} title="Importeer .docx"><Upload className="h-4 w-4" /></button>
      <button className={btn} onClick={onExport} title="Exporteer .docx"><Download className="h-4 w-4" /></button>
      <button className={btn} onClick={onClear} title="Leegmaken"><Trash2 className="h-4 w-4" /></button>
      <span className="h-5 w-px bg-border/60 mx-1" />
      <Popover>
        <PopoverTrigger asChild>
          <button className={btn} title="PiM-instellingen per categorie"><Settings2 className="h-4 w-4" /></button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-3 space-y-2 max-h-[60vh] overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Per categorie</div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            <span className="font-medium text-foreground">Auto-wis</span> = direct vervangen door label.
            Anders = onderstrepen; jij beslist.
          </p>
          <ul className="space-y-1">
            {(Object.keys(CATEGORY_LABELS) as PiiCategory[]).map((cat) => {
              const on = autoRedact.has(cat);
              return (
                <li key={cat} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{CATEGORY_LABELS[cat]}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(autoRedact);
                      if (on) next.delete(cat); else next.add(cat);
                      setAutoRedact(next);
                    }}
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border transition-colors ${
                      on
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-transparent border-border/60 text-muted-foreground hover:border-border"
                    }`}
                  >
                    {on ? <Check className="h-3 w-3" /> : null}
                    {on ? "Auto-wis" : "Markeer"}
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
      <span className="flex-1" />
      <span className="text-[11px] text-muted-foreground px-2">
        {stats.scrubbed > 0 && <>{stats.scrubbed} gewist · </>}{stats.marked} gemarkeerd
      </span>
    </div>
  );
}

function ClickedPopover({
  clicked, onReplace, onIgnore, onClose,
}: {
  clicked: ClickedSpan;
  onReplace: () => void;
  onIgnore: () => void;
  onClose: () => void;
}) {
  const label = GENERALIZATIONS[clicked.cat] ?? "[geredacteerd]";
  return (
    <div
      role="dialog"
      style={{ position: "absolute", left: clicked.x, top: clicked.y + 4, zIndex: 60 }}
      className="rounded-lg border border-border/70 bg-popover shadow-lg p-2 flex items-center gap-1 text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="px-2 text-muted-foreground">
        <span className="font-medium text-foreground">{CATEGORY_LABELS[clicked.cat]}</span>
      </span>
      <button
        type="button"
        onClick={onReplace}
        className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-2.5 py-1 hover:bg-primary/90 font-medium"
      >
        Vervang met {label}
      </button>
      <button
        type="button"
        onClick={onIgnore}
        className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1 hover:bg-accent/40"
      >
        Negeer
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Sluiten"
        className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-accent/40"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}