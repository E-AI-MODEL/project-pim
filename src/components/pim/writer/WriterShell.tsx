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
  Upload, Download, Shield, Trash2, X,
} from "lucide-react";
import {
  computeSignals, PIPELINE_PROFILES,
  type PiiCategory, type PiiSpan,
} from "@/lib/pim";
import { useNerSpans } from "@/hooks/useNerSpans";
import { usePimSettings } from "@/hooks/usePimSettings";
import { LiveTechMonitor } from "@/components/pim/start-go/LiveTechMonitor";
import { AdvancedPanel } from "@/components/pim/start-go/AdvancedPanel";
import { GENERALIZATIONS, DEFAULT_AUTO_REDACT, CATEGORY_LABELS } from "./pimGeneralizations";
import {
  createPimPlugin, pimPluginKey, extractPlain, spanToRange, buildDecorations,
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

export function WriterShell() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [autoRedact, setAutoRedact] = useState<Set<PiiCategory>>(
    () => new Set(DEFAULT_AUTO_REDACT),
  );
  const [strict, setStrict] = useState(false);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ scrubbed: 0, marked: 0 });
  const [clicked, setClicked] = useState<ClickedSpan | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  // Profiel + detector-instellingen, gedeeld met de homepage (spoor C).
  const { profileId, disabledCategories, setCategoryEnabled } = usePimSettings();
  // Platte tekst van de editor — gedeeld met de NER-hook zodat /schrijven
  // dezelfde SLM-naamherkenning krijgt als de homepage (spoor A/D). De SLM
  // wordt pas geladen na een expliciete klik in het instellingen-paneel.
  const [plainText, setPlainText] = useState("");
  const usesNerSlm = PIPELINE_PROFILES[profileId].detectors.nerSlm;
  const { nerSpans, nerStatus, startNer } = useNerSpans(plainText, { enabled: usesNerSlm });
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
  const scan = useCallback(() => {
    if (!editor) return;
    const { plain, map } = extractPlain(editor.state.doc);
    // Deel de platte tekst met de NER-hook; die levert (gedebounced) SLM-spans
    // terug die we hieronder samen met regex/lexicon door computeSignals halen.
    setPlainText(plain);
    const signals = computeSignals(plain, nerSpans, profileId, disabledCategories);
    let all = [...signals.directPii, ...signals.contextualPii];

    // Aanscherping: identifier-validators verwerpen willekeurige cijferreeksen.
    if (strict) {
      all = all.filter((s) => {
        if (s.category === "bsn") return isValidBsn(s.text);
        if (s.category === "iban") return isValidIban(s.text);
        if (s.category === "license_plate") return isValidLicensePlate(s.text);
        if (s.category === "student_id") return hasStudentIdContext(plain, s.start, s.end);
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
  }, [editor, autoRedact, ignored, strict, profileId, disabledCategories, nerSpans]);

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
    // Lichte egress-gate: scan plain text vóór .docx-export. Bij residuele
    // PII krijgt de gebruiker een keuze (toch / wis-alles / annuleer) i.p.v.
    // stilzwijgend exporteren — consistent met de "schrijf veilig" claim.
    const { plain } = (await import("./pimPlugin")).extractPlain(editor.state.doc);
    const sig = computeSignals(plain, nerSpans, profileId, disabledCategories);
    const total = sig.directPii.length + sig.contextualPii.length;
    if (total > 0) {
      const cats = Array.from(new Set([...sig.directPii, ...sig.contextualPii].map((s) => s.category))).join(", ");
      const choice = window.prompt(
        `Let op: het document bevat nog ${total} gevoelige term${total === 1 ? "" : "en"} (${cats}).\n\n` +
          `Typ 'wis' om alles automatisch te vervangen door labels, 'ja' om toch te exporteren, of laat leeg om te annuleren.`,
        "",
      );
      if (!choice) return;
      if (choice.trim().toLowerCase() === "wis") {
        // Tijdelijk alles auto-redacten: voeg alle gevonden categorieën toe
        // aan autoRedact en wacht één scan-cycle af voordat we exporteren.
        const allCats = new Set<PiiCategory>([...autoRedact, ...sig.directPii.map((s) => s.category), ...sig.contextualPii.map((s) => s.category)]);
        setAutoRedact(allCats);
        await new Promise((r) => setTimeout(r, 250));
      } else if (choice.trim().toLowerCase() !== "ja") {
        return;
      }
    }
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
        <LiveTechMonitor
          trigger={
            <button className="font-plex-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-[#3b6fa0]/20 hover:bg-[#3b6fa0]/40 text-foreground/80 transition-colors inline-flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live techniek
            </button>
          }
        />
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
        disabledCategories={disabledCategories}
        setCategoryEnabled={setCategoryEnabled}
        strict={strict}
        setStrict={setStrict}
        nerStatus={nerStatus}
        onStartNer={startNer}
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
      {importWarnings.length > 0 && (
        <div className="text-xs rounded-md border border-amber-400/40 bg-amber-400/10 text-amber-200 px-3 py-2 space-y-1">
          <div className="font-medium">Let op bij import</div>
          <ul className="list-disc pl-4 space-y-0.5">
            {importWarnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
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

/** Eén categorie heeft drie standen die de twee oude systemen verenigen. */
type CategoryMode = "off" | "mark" | "scrub";

function WriterToolbar({
  editor, autoRedact, setAutoRedact, disabledCategories, setCategoryEnabled,
  strict, setStrict, nerStatus, onStartNer, onImport, onExport, onClear, stats,
}: {
  editor: Editor;
  autoRedact: Set<PiiCategory>;
  setAutoRedact: (s: Set<PiiCategory>) => void;
  disabledCategories: ReadonlySet<PiiCategory>;
  setCategoryEnabled: (cat: PiiCategory, enabled: boolean) => void;
  strict: boolean;
  setStrict: (v: boolean) => void;
  nerStatus: NerStatus | null;
  onStartNer: () => void;
  onImport: () => void;
  onExport: () => void;
  onClear: () => void;
  stats: { scrubbed: number; marked: number };
}) {
  // Leid de stand af uit de twee onderliggende bronnen, en zet ze samen.
  const modeOf = (cat: PiiCategory): CategoryMode =>
    disabledCategories.has(cat) ? "off" : autoRedact.has(cat) ? "scrub" : "mark";
  const setMode = (cat: PiiCategory, mode: CategoryMode) => {
    setCategoryEnabled(cat, mode !== "off");
    const next = new Set(autoRedact);
    if (mode === "scrub") next.add(cat); else next.delete(cat);
    setAutoRedact(next);
  };
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
        <PopoverContent align="end" className="w-80 p-3 space-y-3 max-h-[70vh] overflow-y-auto">
          <NerToggleRow nerStatus={nerStatus} onStartNer={onStartNer} />
          <NerVariantPicker
            tone="light"
            onChange={() => { if (nerStatus?.ready || nerStatus?.loading) onStartNer(); }}
          />

          <div className="h-px bg-border/40" />

          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Controle</div>
          <button
            type="button"
            onClick={() => setStrict(!strict)}
            aria-pressed={strict}
            className={`w-full flex items-start justify-between gap-2 rounded-md border p-2.5 text-left transition-colors ${
              strict
                ? "border-amber-400/50 bg-amber-400/10"
                : "border-border/60 hover:bg-accent/40"
            }`}
          >
            <span className="min-w-0">
              <span className="block text-xs font-medium text-foreground">Strenge cijfercontrole</span>
              <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                Filtert willekeurige cijferreeksen: BSN-elfproef, IBAN mod-97, kenteken-formaat en leerlingnummer-context moeten kloppen.
              </span>
            </span>
            <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${
              strict ? "bg-amber-400/20 text-amber-200 border-amber-400/50" : "text-muted-foreground border-border/60"
            }`}>
              {strict ? "Aan" : "Uit"}
            </span>
          </button>

          <div className="h-px bg-border/40" />

          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Per categorie</div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            <span className="font-medium text-foreground">Uit</span> = niet detecteren ·{" "}
            <span className="font-medium text-foreground">Markeer</span> = onderstrepen, jij beslist ·{" "}
            <span className="font-medium text-foreground">Wis</span> = meteen vervangen door een label.
          </p>
          <ul className="space-y-1">
            {(Object.keys(CATEGORY_LABELS) as PiiCategory[]).map((cat) => (
              <li key={cat} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{CATEGORY_LABELS[cat]}</span>
                <CategoryModeToggle mode={modeOf(cat)} onChange={(m) => setMode(cat, m)} />
              </li>
            ))}
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

/** Segmented control: Uit / Markeer / Wis — één heldere keuze per categorie. */
function CategoryModeToggle({ mode, onChange }: { mode: CategoryMode; onChange: (m: CategoryMode) => void }) {
  const opts: { v: CategoryMode; label: string }[] = [
    { v: "off", label: "Uit" },
    { v: "mark", label: "Markeer" },
    { v: "scrub", label: "Wis" },
  ];
  const activeTone: Record<CategoryMode, string> = {
    off: "bg-muted text-foreground",
    mark: "bg-accent/60 text-foreground",
    scrub: "bg-primary/20 text-primary",
  };
  return (
    <div className="shrink-0 inline-flex rounded-md border border-border/60 overflow-hidden">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          aria-pressed={mode === o.v}
          className={`px-2 py-0.5 text-[11px] transition-colors ${
            mode === o.v ? activeTone[o.v] : "text-muted-foreground hover:bg-accent/30"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Compacte naamherkenning-schakelaar — laadt de SLM ook vanuit /schrijven. */
function NerToggleRow({ nerStatus, onStartNer }: { nerStatus: NerStatus | null; onStartNer: () => void }) {
  const kind = nerStatus?.error ? "error" : nerStatus?.ready ? "ready" : nerStatus?.loading ? "loading" : "idle";
  const rawPct = nerStatus?.progress?.pct;
  const pct = typeof rawPct === "number" ? Math.round(rawPct <= 1 ? rawPct * 100 : rawPct) : undefined;
  const Icon = kind === "loading" ? Loader2 : kind === "error" ? AlertTriangle : Cpu;
  const sub =
    kind === "ready" ? "Actief — vindt ook namen die regels missen"
    : kind === "loading" ? (typeof pct === "number" ? `Downloaden… ${pct}%` : "Model downloaden…")
    : kind === "error" ? "Laden mislukt"
    : "Lokaal model (~100 MB), eenmalige download";
  const label = kind === "ready" ? "Aan" : kind === "loading" ? "Bezig" : kind === "error" ? "Opnieuw" : "Aanzetten";
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${kind === "loading" ? "animate-spin" : ""} ${kind === "ready" ? "text-emerald-400" : "text-muted-foreground"}`} />
        <div className="min-w-0">
          <div className="text-xs font-medium text-foreground">Naamherkenning (SLM)</div>
          <div className="text-[11px] text-muted-foreground leading-snug">{sub}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onStartNer}
        disabled={kind === "ready" || kind === "loading"}
        className="shrink-0 h-7 px-2 rounded-md border border-border/60 text-[11px] hover:bg-accent/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {label}
      </button>
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