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
  Upload, Download, Shield, ShieldCheck, Trash2, X, Cpu, Loader2, AlertTriangle,
} from "lucide-react";
import {
  computeSignals, usesBert,
  type PiiCategory, type PiiSpan, type NerStatus,
} from "@/lib/pim";
import { useNerSpans } from "@/hooks/useNerSpans";
import { usePimSettings } from "@/hooks/usePimSettings";
import { LiveTechMonitor } from "@/components/pim/start-go/LiveTechMonitor";
import { AdvancedPanel } from "@/components/pim/start-go/AdvancedPanel";
import { GENERALIZATIONS, DEFAULT_AUTO_REDACT, CATEGORY_LABELS } from "./pimGeneralizations";
import { createPimPlugin, pimPluginKey, extractPlain, spanToRange, buildDecorations } from "./pimPlugin";
import { importDocxToEditor, exportEditorToDocx } from "./docxIO";
import { isValidBsn, isValidIban, isValidLicensePlate, hasStudentIdContext } from "./validators";

interface ClickedSpan { from: number; to: number; cat: PiiCategory; text: string; x: number; y: number; }

export function WriterShell() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [autoRedact, setAutoRedact] = useState<Set<PiiCategory>>(() => new Set(DEFAULT_AUTO_REDACT));
  const [strict, setStrict] = useState(false);
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ scrubbed: 0, marked: 0 });
  const [clicked, setClicked] = useState<ClickedSpan | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const { detectionSettings, disabledCategories, advancedPanelProps } = usePimSettings();
  const [plainText, setPlainText] = useState("");
  const usesNerSlm = usesBert(detectionSettings);
  const { nerSpans, nerStatus, startNer } = useNerSpans(plainText, { enabled: usesNerSlm });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRootRef = useRef<HTMLDivElement>(null);

  const pimPlugin = useMemo(() => createPimPlugin(), []);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: "<h1>Nieuwe notitie</h1><p>Begin met typen — PiM leest mee. Namen krijgen een onderstreping; harde PII (BSN, e-mail, telefoon…) wordt direct vervangen door een label.</p>",
    editorProps: { attributes: { class: "prose prose-invert max-w-none focus:outline-none min-h-[50vh] px-6 py-8 text-[15px] leading-relaxed" } },
  });

  useEffect(() => {
    if (!editor) return;
    const view = editor.view;
    view.updateState(view.state.reconfigure({ plugins: [...view.state.plugins, pimPlugin] }));
  }, [editor, pimPlugin]);

  const scan = useCallback(() => {
    if (!editor) return;
    const { plain, map } = extractPlain(editor.state.doc);
    setPlainText(plain);
    const signals = computeSignals(plain, nerSpans, detectionSettings, disabledCategories);
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
        if (r.to + 1 <= cursorFrom) toReplace.push({ ...r, label: GENERALIZATIONS[s.category] ?? "[geredacteerd]" });
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
    editor.view.dispatch(editor.state.tr.setMeta(pimPluginKey, { decorations: buildDecorations(toMark, map, editor.state.doc) }));
    setStats((p) => ({ scrubbed: p.scrubbed, marked: toMark.length }));
  }, [editor, autoRedact, ignored, strict, detectionSettings, disabledCategories, nerSpans]);

  useEffect(() => {
    if (!editor) return;
    let raf = 0;
    const debounced = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setTimeout(scan, 120)); };
    editor.on("update", debounced); debounced();
    return () => { cancelAnimationFrame(raf); editor.off("update", debounced); };
  }, [editor, scan]);

  useEffect(() => {
    const root = editorRootRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(".pim-pii") as HTMLElement | null;
      if (!target) { setClicked(null); return; }
      const rect = target.getBoundingClientRect();
      setClicked({ from: Number(target.dataset.from), to: Number(target.dataset.to), cat: target.dataset.cat as PiiCategory, text: target.dataset.text ?? "", x: rect.left, y: rect.bottom + window.scrollY });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [editor]);

  const replaceClicked = () => {
    if (!editor || !clicked) return;
    editor.chain().focus().command(({ tr }) => { tr.replaceWith(clicked.from, clicked.to, editor.schema.text(GENERALIZATIONS[clicked.cat] ?? "[geredacteerd]")); return true; }).run();
    setClicked(null);
  };
  const ignoreClicked = () => {
    if (!clicked) return;
    setIgnored((prev) => { const next = new Set(prev); next.add(`${clicked.cat}:${clicked.text.toLowerCase()}`); return next; });
    setClicked(null);
  };

  const onImportClick = () => fileInputRef.current?.click();
  const onFile = async (files: FileList | null) => {
    setImportError(null); setImportWarnings([]);
    if (!files || files.length === 0 || !editor) return;
    const file = files[0];
    if (!/\.docx$/i.test(file.name)) { setImportError("Alleen .docx-bestanden — voor andere formaten gebruik je de homepage."); return; }
    try { const { warnings } = await importDocxToEditor(file, editor); if (warnings.length > 0) setImportWarnings(warnings); }
    catch (err) { setImportError(err instanceof Error ? err.message : "Kon document niet lezen."); }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const onExport = async () => {
    if (!editor) return;
    const { plain } = (await import("./pimPlugin")).extractPlain(editor.state.doc);
    const sig = computeSignals(plain, nerSpans, detectionSettings, disabledCategories);
    const total = sig.directPii.length + sig.contextualPii.length;
    if (total > 0) {
      const cats = Array.from(new Set([...sig.directPii, ...sig.contextualPii].map((s) => s.category))).join(", ");
      const choice = window.prompt(`Let op: het document bevat nog ${total} gevoelige term${total === 1 ? "" : "en"} (${cats}).\n\nTyp 'wis' om alles automatisch te vervangen door labels, 'ja' om toch te exporteren, of laat leeg om te annuleren.`, "");
      if (!choice) return;
      if (choice.trim().toLowerCase() === "wis") { setAutoRedact(new Set<PiiCategory>([...autoRedact, ...sig.directPii.map((s) => s.category), ...sig.contextualPii.map((s) => s.category)])); await new Promise((r) => setTimeout(r, 250)); }
      else if (choice.trim().toLowerCase() !== "ja") return;
    }
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    await exportEditorToDocx(editor, `pim-notitie-${ts}.docx`);
  };
  const onClear = useCallback(() => {
    if (!editor) return;
    editor.commands.setContent("<p></p>"); setIgnored(new Set()); setStats({ scrubbed: 0, marked: 0 });
  }, [editor]);
  useEffect(() => { window.addEventListener("pim:reset", onClear); return () => window.removeEventListener("pim:reset", onClear); }, [onClear]);

  if (!mounted || !editor) return null;
  return (
    <div className="min-h-screen bg-[#0a142e] text-[#e8edf3]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a142e]/90 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-[#7fb4ff]" /><span className="font-serif-display text-lg">PiM schrijven</span><WriterStatusBar nerStatus={nerStatus} onStartNer={startNer} /></div>
        <div className="flex items-center gap-2"><LiveTechMonitor triggerLabel="Status" /><button onClick={onImportClick} className="btn-lite"><Upload className="h-4 w-4" /> Import</button><button onClick={onExport} className="btn-lite"><Download className="h-4 w-4" /> Export</button><button onClick={onClear} className="btn-lite"><Trash2 className="h-4 w-4" /> Leeg</button></div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <AdvancedPanel {...advancedPanelProps} writer={{ autoRedact, onAutoRedactChange: (cat, scrub) => setAutoRedact((p) => { const n = new Set(p); if (scrub) n.add(cat); else n.delete(cat); return n; }), strict, onStrictChange: setStrict }} ner={{ status: nerStatus, onStart: startNer, available: usesNerSlm }} />
        {importError && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{importError}</div>}
        {importWarnings.length > 0 && <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">{importWarnings.join(" · ")}</div>}
        <Toolbar editor={editor} />
        <div ref={editorRootRef} className="rounded-2xl border border-white/10 bg-[#0f1b3d] shadow-xl overflow-hidden"><EditorContent editor={editor} /></div>
        <div className="text-xs text-[#e8edf3]/55 flex gap-3"><span>Gewist: {stats.scrubbed}</span><span>Gemarkeerd: {stats.marked}</span></div>
      </main>
      <input ref={fileInputRef} type="file" accept=".docx" hidden onChange={(e) => void onFile(e.target.files)} />
      {clicked && <div style={{ position: "absolute", left: clicked.x, top: clicked.y }} className="z-50 rounded-xl border border-white/15 bg-[#101b35] p-2 shadow-xl flex gap-2"><button className="btn-lite" onClick={replaceClicked}>Vervang</button><button className="btn-lite" onClick={ignoreClicked}>Negeer</button><button className="btn-lite" onClick={() => setClicked(null)}><X className="h-3 w-3" /></button></div>}
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (label: string, icon: React.ReactNode, action: () => void, active = false) => <button type="button" title={label} onClick={action} className={`btn-lite ${active ? "bg-[#3b6fa0]/40" : ""}`}>{icon}</button>;
  return <div className="rounded-xl border border-white/10 bg-[#0f1b3d] p-2 flex flex-wrap gap-1">{btn("Vet", <Bold className="h-4 w-4" />, () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}{btn("Cursief", <Italic className="h-4 w-4" />, () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}{btn("Kop 1", <Heading1 className="h-4 w-4" />, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive("heading", { level: 1 }))}{btn("Kop 2", <Heading2 className="h-4 w-4" />, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}{btn("Lijst", <List className="h-4 w-4" />, () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}{btn("Nummerlijst", <ListOrdered className="h-4 w-4" />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}{btn("Quote", <Quote className="h-4 w-4" />, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}<span className="mx-1 w-px bg-white/10" />{btn("Ongedaan", <Undo2 className="h-4 w-4" />, () => editor.chain().focus().undo().run())}{btn("Opnieuw", <Redo2 className="h-4 w-4" />, () => editor.chain().focus().redo().run())}</div>;
}

function WriterStatusBar({ nerStatus, onStartNer }: { nerStatus: NerStatus | null; onStartNer: () => void }) {
  const ready = !!nerStatus?.working;
  return <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#e8edf3]/60"><span className={`h-2 w-2 rounded-full ${ready ? "bg-emerald-400" : nerStatus?.loading ? "bg-amber-300 animate-pulse" : nerStatus?.error ? "bg-red-400" : "bg-[#3b6fa0]"}`} />{ready ? "BERT werkt" : nerStatus?.loading ? "BERT laden/testen" : nerStatus?.error ? "BERT fout" : "BERT uit"}{!ready && <button onClick={onStartNer} className="underline underline-offset-2">Zet aan</button>}</div>;
}
