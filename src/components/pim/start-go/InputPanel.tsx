// §8.2 — textarea + voorbeeldknop + Start PiM + korte privacyregel.
import { COPY } from "@/lib/pim/copy";
import { EXAMPLES, ExamplePicker, type Example } from "./ExamplePicker";
import {
  Play,
  Cpu,
  Radio,
  Plus,
  SlidersHorizontal,
  ArrowUp,
  Check,
  FileUp,
  FileText,
  X,
  AlertCircle,
  Eraser,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Mode, Action } from "@/lib/pim/types";
import {
  extractDocument,
  formatBytes,
  rejectionReason,
  MAX_DOC_BYTES,
  type ExtractedDoc,
} from "@/lib/pim/documentReader";
import { useEffect, useRef, useState } from "react";
import { computeSignals, anonymize, DEFAULT_PROFILE } from "@/lib/pim";

interface Props {
  text: string;
  onTextChange: (v: string) => void;
  onStart: () => void;
  onExample: (e: Example) => void;
  busy?: boolean;
  /** Compacte variant zonder hero — voor de Console-layout op /. */
  compact?: boolean;
  /** Mode/action controls — in compact-modus in de toolbar gerenderd. */
  mode?: Mode;
  onModeChange?: (m: Mode) => void;
  action?: Action;
  onActionChange?: (a: Action) => void;
}

const TARGETS: { id: Action; label: string }[] = [
  { id: "send_external_ai", label: COPY.targetExternalAi },
  { id: "copy", label: COPY.targetCopy },
  { id: "export_file", label: COPY.targetExport },
  { id: "print", label: COPY.targetPrint },
  { id: "share", label: COPY.targetShare },
  { id: "display", label: COPY.targetDisplay },
];

export function InputPanel({
  text,
  onTextChange,
  onStart,
  onExample,
  busy,
  compact,
  mode,
  onModeChange,
  action,
  onActionChange,
}: Props) {
  if (compact) {
    return (
      <CompactComposer
        text={text}
        onTextChange={onTextChange}
        onStart={onStart}
        onExample={onExample}
        busy={busy}
        mode={mode}
        onModeChange={onModeChange}
        action={action}
        onActionChange={onActionChange}
      />
    );
  }
  return (
    <section className="space-y-5">
      {!compact && (
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary uppercase tracking-wider">
            {COPY.eyebrow}
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-5xl tracking-tight leading-[1.05]">
            {COPY.title} {COPY.titleLine2}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            {COPY.subtitle}
          </p>
        </div>
      )}

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={COPY.placeholder}
          rows={10}
          spellCheck={false}
          className="w-full rounded-md border px-4 py-3 text-sm leading-relaxed focus:outline-none resize-y transition-colors bg-card/60 border-border/60 focus:ring-2 focus:ring-primary/40 focus:border-primary/40 font-mono min-h-[260px] shadow-inner"
        />
        {text.trim().length > 0 && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full backdrop-blur px-2 py-0.5 text-[10px] font-medium animate-fade-in bg-background/80 text-primary border border-primary/30">
            <Radio className="h-2.5 w-2.5 animate-pulse" />
            {COPY.liveBadge}
          </div>
        )}
      </div>

      <ExamplePicker onPick={onExample} />

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onStart}
          disabled={busy || text.trim().length === 0}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_24px_oklch(0.78_0.16_230/0.35)] hover:shadow-[0_0_36px_oklch(0.78_0.16_230/0.5)] font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="h-4 w-4" />
          {busy ? "Bezig…" : COPY.startButton}
        </button>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Cpu className="h-3 w-3" />
          {COPY.privacyHint}
        </span>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
 * Compact composer — chat-style (à la ChatGPT/Gemini): textarea boven, toolbar
 * onder met [+] voorbeelden, [⚙] modus & bestemming, status, en [↑] verstuur.
 * ------------------------------------------------------------------------- */
function CompactComposer({
  text,
  onTextChange,
  onStart,
  onExample,
  busy,
  mode,
  onModeChange,
  action,
  onActionChange,
}: Omit<Props, "compact">) {
  const canSend = text.trim().length > 0 && !busy;
  const activeTarget = TARGETS.find((t) => t.id === action)?.label ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadedDoc, setLoadedDoc] = useState<ExtractedDoc | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const composerRef = useRef<HTMLElement>(null);
  const [liveScrub, setLiveScrub] = useState(false);
  const [flash, setFlash] = useState(false);
  const [liveScrubToast, setLiveScrubToast] = useState(false);
  const scrubRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Live wissen — debounced. Als directe PII gevonden wordt, vervangen we
  // de inhoud door de geanonimiseerde variant en flashen het kader rood.
  useEffect(() => {
    if (!liveScrub) return;
    if (scrubRef.current) clearTimeout(scrubRef.current);
    if (!text.trim()) return;
    scrubRef.current = setTimeout(() => {
      const sig = computeSignals(text, [], DEFAULT_PROFILE, new Set());
      if (sig.directPii.length === 0) return;
      const cleaned = anonymize(text, sig).text;
      if (cleaned === text) return;
      // Cursor-positie behouden: alleen verplaatsen als de wijziging vóór de cursor zat.
      const ta = textareaRef.current;
      const prevCursor = ta?.selectionStart ?? text.length;
      // Vind eerste verschilpositie tussen oud en nieuw.
      let diff = 0;
      const maxDiff = Math.min(text.length, cleaned.length);
      while (diff < maxDiff && text[diff] === cleaned[diff]) diff++;
      const delta = cleaned.length - text.length;
      const newCursor = prevCursor <= diff ? prevCursor : Math.max(diff, prevCursor + delta);
      onTextChange(cleaned);
      setFlash(true);
      setTimeout(() => setFlash(false), 650);
      requestAnimationFrame(() => {
        const t = textareaRef.current;
        if (t) t.setSelectionRange(newCursor, newCursor);
      });
    }, 350);
    return () => {
      if (scrubRef.current) clearTimeout(scrubRef.current);
    };
  }, [text, liveScrub, onTextChange]);

  useEffect(() => {
    const onOpenExamples = () => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => setAddOpen(true), 120);
    };
    window.addEventListener("pim:open-examples", onOpenExamples);
    return () => window.removeEventListener("pim:open-examples", onOpenExamples);
  }, []);

  async function handleFiles(files: FileList | null) {
    setDocError(null);
    if (!files || files.length === 0) return;
    const file = files[0];
    const reason = rejectionReason(file);
    if (reason) {
      setDocError(reason);
      return;
    }
    setDocBusy(true);
    try {
      const doc = await extractDocument(file);
      if (!doc.text.trim()) {
        setDocError("Geen tekst gevonden in het bestand.");
        return;
      }
      setLoadedDoc(doc);
      onTextChange(doc.text);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : "Kon bestand niet lezen.");
    } finally {
      setDocBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function clearDoc() {
    setLoadedDoc(null);
    setDocError(null);
    onTextChange("");
  }

  return (
    <section ref={composerRef} className="space-y-3 scroll-mt-20">
      {/* Composer-kaart */}
      <div
        className={`rounded-2xl border bg-[#0f1b3d]/70 transition-all overflow-hidden ${
          flash
            ? "border-rose-500/80 shadow-[0_0_0_3px_rgba(244,63,94,0.35)]"
            : "border-[#3b6fa0]/30 focus-within:border-[#3b6fa0]/70 focus-within:shadow-[0_0_0_3px_rgba(59,111,160,0.15)]"
        }`}
      >
        {/* Verborgen file-input voor upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.markdown,.csv,.tsv,.json,.log,.html,.htm,.xml,.rtf,.docx"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* Geladen-document chip */}
        {loadedDoc && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#3b6fa0]/15 bg-[#3b6fa0]/10">
            <FileText className="h-3.5 w-3.5 text-[#3b6fa0]" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-[#e8edf3] truncate font-plex-mono">
                {loadedDoc.filename}
              </div>
              <div className="text-[10px] text-[#e8edf3]/55 font-plex-mono">
                {formatBytes(loadedDoc.bytes)} · {loadedDoc.text.length.toLocaleString("nl-NL")}{" "}
                tekens
                {loadedDoc.truncated && " · ingekort"} · lokaal verwerkt
              </div>
            </div>
            <button
              type="button"
              onClick={clearDoc}
              aria-label="Bestand verwijderen"
              title="Bestand verwijderen"
              className="h-6 w-6 inline-flex items-center justify-center rounded-md text-[#e8edf3]/60 hover:text-[#e8edf3] hover:bg-[#3b6fa0]/20 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend) {
              e.preventDefault();
              onStart();
            }
          }}
          placeholder={COPY.placeholder}
          rows={6}
          spellCheck={false}
          className="w-full bg-transparent px-4 pt-4 pb-2 text-sm leading-relaxed text-[#e8edf3] placeholder:text-[#e8edf3]/35 font-plex-mono resize-y focus:outline-none min-h-[180px]"
        />

        {/* Toolbar */}
        <div className="flex items-center gap-1.5 px-2 py-2 border-t border-[#3b6fa0]/15">
          {/* + Toevoegen: bestand uploaden of voorbeeld kiezen */}
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger asChild>
              <IconBtn label="Bestand of voorbeeld toevoegen">
                {docBusy ? (
                  <span className="h-4 w-4 inline-block animate-spin rounded-full border-2 border-[#e8edf3]/30 border-t-[#e8edf3]" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </IconBtn>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-80 bg-[#0f1b3d] border-[#3b6fa0]/40 text-[#e8edf3] p-2"
            >
              {/* Upload-actie */}
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[#e8edf3]/50 font-plex-mono">
                Document controleren
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full text-left px-2 py-2 rounded-md hover:bg-[#3b6fa0]/20 transition-colors flex items-start gap-2.5"
              >
                <FileUp className="h-4 w-4 mt-0.5 text-[#3b6fa0] shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-[#e8edf3]">Bestand uploaden</div>
                  <div className="text-[11px] text-[#e8edf3]/55 leading-snug mt-0.5">
                    .txt · .md · .csv · .json · .html · .docx — tot {formatBytes(MAX_DOC_BYTES)}.
                    Lokaal verwerkt.
                  </div>
                </div>
              </button>
              <div className="my-1 border-t border-[#3b6fa0]/20" />
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[#e8edf3]/50 font-plex-mono">
                Voorbeelden
              </div>
              <div className="flex flex-col">
                {EXAMPLES.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      setLoadedDoc(null);
                      onExample(e);
                      setAddOpen(false);
                    }}
                    className="text-left px-2 py-2 rounded-md hover:bg-[#3b6fa0]/20 transition-colors"
                  >
                    <div className="text-sm text-[#e8edf3]">{e.label}</div>
                    <div className="text-[11px] text-[#e8edf3]/55 leading-snug mt-0.5">
                      {e.hint}
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* ⚙ Modus & bestemming */}
          {mode && onModeChange && action && onActionChange && (
            <Popover>
              <PopoverTrigger asChild>
                <IconBtn label="Modus & bestemming">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1.5 text-[11px] font-plex-mono text-[#e8edf3]/75">
                    {mode === "anonymous" ? "Anoniem" : "Pseudoniem"} · {shortTarget(action)}
                  </span>
                </IconBtn>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-80 bg-[#0f1b3d] border-[#3b6fa0]/40 text-[#e8edf3] p-4 space-y-4"
              >
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-[#e8edf3]/50 font-plex-mono">
                    Hoe verwerken
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    <ModeOption
                      active={mode === "anonymous"}
                      onClick={() => onModeChange("anonymous")}
                      title={COPY.modeAnonymous}
                      hint={COPY.modeAnonymousHint}
                    />
                    <ModeOption
                      active={mode === "pseudonymous"}
                      onClick={() => onModeChange("pseudonymous")}
                      title={COPY.modePseudonymous}
                      hint={COPY.modePseudonymousHint}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-[#e8edf3]/50 font-plex-mono">
                    {COPY.targetLabel}
                  </div>
                  <select
                    value={action}
                    onChange={(e) => onActionChange(e.target.value as Action)}
                    className="w-full rounded-md border border-[#3b6fa0]/40 bg-[#0a142e] px-2.5 py-2 text-sm text-[#e8edf3] focus:outline-none focus:border-[#3b6fa0]"
                  >
                    {TARGETS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Status midden/rechts */}
          <div className="flex-1 flex justify-end items-center gap-2 pr-1">
            <button
              type="button"
              onClick={() => {
                setLiveScrub((v) => {
                  const next = !v;
                  if (next) {
                    setLiveScrubToast(true);
                    setTimeout(() => setLiveScrubToast(false), 3500);
                  }
                  return next;
                });
              }}
              aria-pressed={liveScrub}
              title={
                liveScrub
                  ? "Live wissen staat aan — BSN, e-mail, telefoon en IBAN worden direct vervangen door een label"
                  : "Live wissen aanzetten — harde PII (BSN, e-mail, telefoon, IBAN) wordt meteen vervangen door een label"
              }
              className={`inline-flex items-center gap-1.5 h-8 px-2 rounded-md text-[11px] font-plex-mono border transition-colors ${
                liveScrub
                  ? "bg-rose-500/15 border-rose-400/50 text-rose-200"
                  : "bg-transparent border-[#3b6fa0]/30 text-[#e8edf3]/55 hover:text-[#e8edf3] hover:border-[#3b6fa0]/60"
              }`}
            >
              {liveScrub && (
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" aria-hidden />
              )}
              <Eraser className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Live wissen</span>
            </button>
            {text.trim().length > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-plex-mono text-[#3b6fa0]">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                {COPY.liveBadge}
              </span>
            ) : (
              <span className="hidden sm:inline text-[10px] font-plex-mono text-[#e8edf3]/40">
                ⌘↵ om te controleren
              </span>
            )}
          </div>

          {/* ↑ Verzenden */}
          <button
            type="button"
            onClick={onStart}
            disabled={!canSend}
            aria-label={COPY.startButton}
            title={COPY.startButton}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-[#3b6fa0] text-[#e8edf3] hover:brightness-110 disabled:bg-[#1e3a5f] disabled:text-[#e8edf3]/30 disabled:cursor-not-allowed transition-all"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Document-foutmelding */}
      {docError && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-200">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="text-[11px] leading-relaxed flex-1">{docError}</div>
          <button
            type="button"
            onClick={() => setDocError(null)}
            aria-label="Sluiten"
            className="h-5 w-5 inline-flex items-center justify-center rounded text-rose-200/70 hover:text-rose-200"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Live wissen — eerste-keer toelichting */}
      {liveScrubToast && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-rose-400/40 bg-rose-500/10 text-rose-200 text-[11px] leading-relaxed">
          <Eraser className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-medium">Live wissen actief.</span> BSN, e-mail, telefoon en IBAN
            worden direct vervangen door een label (bv. <code>[bsn]</code>). Namen en context
            blijven staan totdat je verstuurt.
          </div>
        </div>
      )}

      {/* Hint onder de composer */}
      {text.trim().length === 0 ? (
        <p className="text-[11px] text-[#e8edf3]/50 leading-relaxed px-1">
          {COPY.monitorEmptyHint} Gebruik <span className="text-[#e8edf3]/75">+</span> voor een
          voorbeeld of document.
        </p>
      ) : (
        <p className="text-[11px] text-[#e8edf3]/45 leading-relaxed px-1 font-plex-mono truncate">
          Bestemming: {activeTarget}
        </p>
      )}
    </section>
  );
}

function IconBtn({
  children,
  label,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className="inline-flex items-center h-8 px-2 rounded-md text-[#e8edf3]/70 hover:text-[#e8edf3] hover:bg-[#3b6fa0]/15 transition-colors"
    >
      {children}
    </button>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left px-3 py-2 rounded-md border transition-colors ${
        active
          ? "bg-[#3b6fa0]/25 border-[#3b6fa0]/70"
          : "bg-transparent border-[#3b6fa0]/20 hover:bg-[#3b6fa0]/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        {active && <Check className="h-3.5 w-3.5 text-[#3b6fa0]" />}
      </div>
      <div className="text-[11px] text-[#e8edf3]/55 leading-snug mt-0.5">{hint}</div>
    </button>
  );
}

function shortTarget(a: Action): string {
  switch (a) {
    case "send_external_ai":
      return "Externe AI";
    case "copy":
      return "Klembord";
    case "export_file":
      return "Bestand";
    case "print":
      return "Printer";
    case "share":
      return "Link";
    case "display":
      return "Scherm";
    default:
      return "";
  }
}
