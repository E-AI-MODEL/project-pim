import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { onNerStatus, loadNerSlm, type NerStatus } from "@/lib/pim/nerSlm";
import { onRewriteStatus, loadRewriteLlm, type RewriteStatus } from "@/lib/pim/rewriteLlm";
import { onModelIntegrity, type ModelIntegrityRecord } from "@/lib/pim/modelCatalog";
import { subscribeDebug, clearDebug, type DebugEvent } from "@/lib/pim/debugBus";

function useEnv() {
  const [env, setEnv] = useState<Record<string, unknown>>({});
  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      gpu?: { requestAdapter?: () => Promise<unknown> };
    };
    (async () => {
      let webgpu = false;
      try {
        webgpu = !!(await nav.gpu?.requestAdapter?.());
      } catch {
        /* noop */
      }
      setEnv({
        webgpu,
        deviceMemory: nav.deviceMemory ?? "onbekend",
        cores: nav.hardwareConcurrency ?? "onbekend",
        crossOriginIsolated: typeof window !== "undefined" ? window.crossOriginIsolated : false,
        online: typeof navigator !== "undefined" ? navigator.onLine : true,
        viewport:
          typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}` : "?",
        dpr: typeof window !== "undefined" ? window.devicePixelRatio : 1,
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      });
    })();
  }, []);
  return env;
}

function StatusDot({ tone }: { tone: "green" | "amber" | "red" | "gray" }) {
  const c =
    tone === "green"
      ? "bg-green-400"
      : tone === "amber"
        ? "bg-amber-400 animate-pulse"
        : tone === "red"
          ? "bg-red-400"
          : "bg-[#3b6fa0]/40";
  return <span className={`inline-block w-2 h-2 rounded-full ${c}`} aria-hidden />;
}

function modelTone(
  s: { loading?: boolean; ready?: boolean; error?: string | null } | null,
): "green" | "amber" | "red" | "gray" {
  if (!s) return "gray";
  if (s.error) return "red";
  if (s.ready) return "green";
  if (s.loading) return "amber";
  return "gray";
}

function useIsMobileLowMem(): { mobile: boolean; lowMem: boolean } {
  const [state, setState] = useState({ mobile: false, lowMem: false });
  useEffect(() => {
    const mobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const lowMem = typeof mem === "number" && mem < 4;
    setState({ mobile, lowMem });
  }, []);
  return state;
}

function StepPill({
  num,
  title,
  sub,
  status,
  pct,
  onClick,
  disabled,
  badge,
}: {
  num: number;
  title: string;
  sub: string;
  status: "ready" | "loading" | "idle" | "error";
  pct?: number;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  const color =
    status === "ready"
      ? "border-green-400/60 bg-green-400/5"
      : status === "loading"
        ? "border-amber-400/60 bg-amber-400/5"
        : status === "error"
          ? "border-red-400/60 bg-red-400/5"
          : "border-[#3b6fa0]/40 bg-[#0f1b3d]/40";
  const label =
    status === "ready"
      ? "actief"
      : status === "loading"
        ? typeof pct === "number"
          ? `${pct}%`
          : "laden…"
        : status === "error"
          ? "fout"
          : "uit";
  return (
    <div className={`rounded-md border ${color} p-3 flex flex-col gap-2 min-w-0`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-plex-mono text-[10px] tracking-[0.18em] uppercase text-[#e8edf3]/55">
            Stap {num}
          </div>
          <div className="font-serif-display text-sm text-[#e8edf3] truncate">{title}</div>
        </div>
        <span className="font-plex-mono text-[10px] uppercase tracking-wider text-[#e8edf3]/70 whitespace-nowrap">
          {label}
        </span>
      </div>
      <div className="text-[11px] text-[#e8edf3]/60 leading-snug">{sub}</div>
      {badge && <div className="text-[10px] text-amber-300/80 font-plex-mono">{badge}</div>}
      {onClick && status !== "ready" && (
        <button
          onClick={onClick}
          disabled={disabled || status === "loading"}
          className="mt-1 text-[11px] font-plex-mono uppercase tracking-wider px-2 py-1 rounded bg-[#3b6fa0]/20 hover:bg-[#3b6fa0]/40 disabled:opacity-40 disabled:cursor-not-allowed text-[#e8edf3] transition-colors"
        >
          {status === "loading" ? "Bezig…" : "Inschakelen"}
        </button>
      )}
      {status === "loading" && typeof pct === "number" && (
        <div className="h-1 rounded bg-[#0f1b3d]/60 overflow-hidden">
          <div className="h-full bg-amber-400/70 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

type Tone = "green" | "amber" | "red" | "gray";
function verdictTone(v?: string): Tone {
  if (v === "ALLOW") return "green";
  if (v === "WARN") return "amber";
  if (v === "BLOCK") return "red";
  return "gray";
}

export function LiveTechMonitor({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [ner, setNer] = useState<NerStatus | null>(null);
  const [llm, setLlm] = useState<RewriteStatus | null>(null);
  const [integrity, setIntegrity] = useState<ModelIntegrityRecord[]>([]);
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const env = useEnv();
  const { mobile, lowMem } = useIsMobileLowMem();
  const [showRaw, setShowRaw] = useState(false);
  const [, setNowTick] = useState(0);

  useEffect(() => onNerStatus(setNer), []);
  useEffect(() => onRewriteStatus(setLlm), []);
  useEffect(() => onModelIntegrity(setIntegrity), []);
  useEffect(() => subscribeDebug(setEvents), []);

  // Slice C.1 — laat het BurgerMenu-item "Diagnostiek" dit paneel openen.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("pim:open-diagnostics", onOpen);
    return () => window.removeEventListener("pim:open-diagnostics", onOpen);
  }, []);

  // Lichte re-render zolang het paneel open is, voor "x ms geleden"-tellertjes.
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNowTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [open]);

  const nerStatus: "ready" | "loading" | "idle" | "error" = ner?.error
    ? "error"
    : ner?.ready
      ? "ready"
      : ner?.loading
        ? "loading"
        : "idle";
  const llmStatus: "ready" | "loading" | "idle" | "error" = llm?.error
    ? "error"
    : llm?.ready
      ? "ready"
      : llm?.loading
        ? "loading"
        : "idle";
  const nerPct =
    ner?.progress?.pct != null
      ? Math.round(ner.progress.pct * (ner.progress.pct > 1 ? 1 : 100))
      : undefined;
  const llmPct = llm?.progress?.pct;
  const llmDisabled = mobile || lowMem;

  // Afgeleide live-data uit debugBus.
  const live = useMemo(() => {
    const lastRun = [...events].reverse().find((e) => e.kind === "pipeline.run");
    const lastExec = [...events].reverse().find((e) => e.kind === "pipeline.execute");
    const counts: Record<string, number> = {};
    for (const e of events) counts[e.kind] = (counts[e.kind] ?? 0) + 1;
    const recent = events[events.length - 1];
    return { lastRun, lastExec, counts, recent };
  }, [events]);

  const ageMs = live.recent ? Date.now() - live.recent.ts : Infinity;
  const isActive = ageMs < 1500;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-[#0f1b3d] border-l-[#3b6fa0]/30 text-[#e8edf3] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="font-serif-display text-[#e8edf3]">Live techniek</SheetTitle>
          <SheetDescription className="text-[#e8edf3]/60 text-xs">
            Realtime kijkje in de pipeline. <strong>Op mobiel is niet alles mogelijk</strong> — de
            generalisatie-LLM (~400 MB) blijft daar uit; NER-SLM werkt wel maar de eerste download
            duurt langer.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="live" className="mt-4">
          <TabsList className="grid grid-cols-4 bg-[#1e3a5f]/40">
            <TabsTrigger value="live" className="text-xs">
              Live
            </TabsTrigger>
            <TabsTrigger value="models" className="text-xs">
              Modellen
            </TabsTrigger>
            <TabsTrigger value="env" className="text-xs">
              Omgeving
            </TabsTrigger>
            <TabsTrigger value="log" className="text-xs">
              Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="mt-3 space-y-3">
            {/* Nu actief */}
            <div className="rounded border border-[#3b6fa0]/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot tone={isActive ? "amber" : "gray"} />
                  <span className="font-serif-display text-sm">
                    {isActive ? "PiM rekent…" : "Wacht op invoer"}
                  </span>
                </div>
                <span className="font-plex-mono text-[10px] text-[#e8edf3]/55">
                  {live.recent
                    ? ageMs < 1000
                      ? `${Math.round(ageMs)} ms geleden`
                      : `${Math.round(ageMs / 1000)} s geleden`
                    : "—"}
                </span>
              </div>
              <div className="text-[11px] text-[#e8edf3]/70 font-plex-mono break-all">
                {live.recent ? `${live.recent.kind} · ${live.recent.msg}` : "Nog geen activiteit."}
              </div>
            </div>

            {/* Laatste beslissing */}
            {live.lastRun && (
              <div className="rounded border border-[#3b6fa0]/30 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-plex-mono text-[10px] uppercase tracking-wider text-[#e8edf3]/55">
                    Laatste run
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot tone={verdictTone(String(live.lastRun.data?.verdict ?? ""))} />
                    <span className="font-plex-mono text-[11px] text-[#e8edf3]">
                      {String(live.lastRun.data?.verdict ?? "—")}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-plex-mono text-[11px]">
                  <span className="text-[#e8edf3]/60">duur</span>
                  <span className="text-right">{String(live.lastRun.data?.ms ?? "—")} ms</span>
                  <span className="text-[#e8edf3]/60">input-lengte</span>
                  <span className="text-right">
                    {String(live.lastRun.data?.inputLen ?? "—")} chars
                  </span>
                  <span className="text-[#e8edf3]/60">directe hits</span>
                  <span className="text-right">{String(live.lastRun.data?.directHits ?? 0)}</span>
                  <span className="text-[#e8edf3]/60">contextuele hits</span>
                  <span className="text-right">
                    {String(live.lastRun.data?.contextualHits ?? 0)}
                  </span>
                  <span className="text-[#e8edf3]/60">modus</span>
                  <span className="text-right">{String(live.lastRun.data?.mode ?? "—")}</span>
                  <span className="text-[#e8edf3]/60">actie</span>
                  <span className="text-right">{String(live.lastRun.data?.action ?? "—")}</span>
                  <span className="text-[#e8edf3]/60">profiel</span>
                  <span className="text-right truncate">
                    {String(live.lastRun.data?.profile ?? "—")}
                  </span>
                  <span className="text-[#e8edf3]/60">draftCheck</span>
                  <span className="text-right">{String(live.lastRun.data?.draftCheck ?? "—")}</span>
                  <span className="text-[#e8edf3]/60">modelGate</span>
                  <span className="text-right truncate">
                    {String(live.lastRun.data?.modelGate ?? "—")}
                  </span>
                  <span className="text-[#e8edf3]/60">payload</span>
                  <span className="text-right truncate">
                    {String(live.lastRun.data?.payloadType ?? "—")}
                  </span>
                </div>
              </div>
            )}

            {/* Egress-poort */}
            {live.lastExec && (
              <div className="rounded border border-[#3b6fa0]/30 p-3 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-plex-mono text-[10px] uppercase tracking-wider text-[#e8edf3]/55">
                    Egress-poort
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot tone={live.lastExec.data?.executed ? "green" : "red"} />
                    <span className="font-plex-mono text-[11px]">
                      {live.lastExec.data?.executed ? "toegestaan" : "geblokt"}
                    </span>
                  </div>
                </div>
                <div className="font-plex-mono text-[11px] text-[#e8edf3]/70 break-words">
                  {String(live.lastExec.data?.action ?? "—")} ·{" "}
                  {String(live.lastExec.data?.reason ?? "—")}
                </div>
              </div>
            )}

            {/* Activiteitstellers */}
            <div className="rounded border border-[#3b6fa0]/30 p-3 space-y-1 text-xs">
              <div className="font-plex-mono text-[10px] uppercase tracking-wider text-[#e8edf3]/55">
                Sessietellers
              </div>
              {Object.keys(live.counts).length === 0 && (
                <div className="text-[#e8edf3]/50 italic">Nog geen activiteit.</div>
              )}
              {Object.entries(live.counts).map(([k, n]) => (
                <div key={k} className="flex justify-between font-plex-mono text-[11px]">
                  <span className="text-[#e8edf3]/60">{k}</span>
                  <span>{n}×</span>
                </div>
              ))}
            </div>

            {/* Modellen-mini */}
            <div className="rounded border border-[#3b6fa0]/30 p-3 space-y-1 text-xs">
              <div className="font-plex-mono text-[10px] uppercase tracking-wider text-[#e8edf3]/55">
                Modellen
              </div>
              <div className="flex items-center justify-between font-plex-mono text-[11px]">
                <span className="flex items-center gap-2">
                  <StatusDot tone={modelTone(ner)} /> NER-SLM
                </span>
                <span className="text-[#e8edf3]/70">
                  {ner?.runtime ?? (ner?.loading ? "laden…" : "uit")}
                </span>
              </div>
              <div className="flex items-center justify-between font-plex-mono text-[11px]">
                <span className="flex items-center gap-2">
                  <StatusDot tone={modelTone(llm)} /> Generalisatie-LLM
                </span>
                <span className="text-[#e8edf3]/70">
                  {llm?.ready ? "actief" : llm?.loading ? "laden…" : "uit"}
                </span>
              </div>
            </div>

            {/* Ruwe data (inklap) */}
            {live.lastRun && (
              <div className="rounded border border-[#3b6fa0]/30 p-3">
                <button
                  onClick={() => setShowRaw((v) => !v)}
                  className="w-full text-left font-plex-mono text-[10px] uppercase tracking-wider text-[#e8edf3]/55 hover:text-[#e8edf3]/80"
                >
                  {showRaw ? "− Ruwe data verbergen" : "+ Ruwe data tonen"}
                </button>
                {showRaw && (
                  <pre className="mt-2 text-[10px] text-[#e8edf3]/70 font-plex-mono break-all whitespace-pre-wrap">
                    {JSON.stringify(live.lastRun.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="models" className="mt-3 space-y-3">
            {/* De 3 stap-kaarten die voorheen op de startpagina stonden. */}
            <div className="grid grid-cols-1 gap-2">
              <StepPill
                num={1}
                title="Regex & regels"
                sub="Lokale patroon-detectie — altijd aan, geen download."
                status="ready"
              />
              <StepPill
                num={2}
                title="NER-SLM"
                sub="DistilBERT NER · ~100 MB · WebGPU/WASM"
                status={nerStatus}
                pct={nerPct}
                badge={mobile ? "Mobiel: eerste laad ~20-40s" : undefined}
                onClick={() => loadNerSlm().catch(() => {})}
              />
              <StepPill
                num={3}
                title="Generalisatie-LLM"
                sub="Qwen2.5-0.5B · ~400 MB · WebGPU"
                status={llmStatus}
                pct={llmPct}
                badge={llmDisabled ? "Alleen desktop met ≥4 GB RAM" : undefined}
                onClick={() => loadRewriteLlm().catch(() => {})}
                disabled={llmDisabled}
              />
            </div>

            <div className="rounded border border-[#3b6fa0]/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <StatusDot tone={modelTone(ner)} />
                <span className="font-serif-display text-sm">NER-SLM details</span>
              </div>
              <div className="font-plex-mono text-[10px] text-[#e8edf3]/60 break-all">
                {ner?.modelId}
              </div>
              <div className="text-xs text-[#e8edf3]/70">
                runtime: <strong>{ner?.runtime ?? "—"}</strong> · verified:{" "}
                <strong>{ner?.verified ? "ja" : "nee"}</strong>
              </div>
              {ner?.error && <div className="text-xs text-red-300">{ner.error}</div>}
            </div>

            <div className="rounded border border-[#3b6fa0]/30 p-3 space-y-1">
              <div className="font-plex-mono text-[10px] uppercase tracking-wider text-[#e8edf3]/55">
                Integrity
              </div>
              {integrity.length === 0 && (
                <div className="text-xs text-[#e8edf3]/50 italic">Nog geen verificatie.</div>
              )}
              {integrity.map((r) => (
                <div key={r.key} className="flex justify-between gap-2 font-plex-mono text-[11px]">
                  <span className="text-[#e8edf3]/70">{r.key}</span>
                  <span
                    className={
                      r.status === "verified"
                        ? "text-green-300"
                        : r.status === "mismatch"
                          ? "text-red-300"
                          : "text-amber-300"
                    }
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="env" className="mt-3">
            <div className="rounded border border-[#3b6fa0]/30 p-3 space-y-1 text-xs">
              {Object.entries(env).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 font-plex-mono text-[11px]">
                  <span className="text-[#e8edf3]/60">{k}</span>
                  <span className="text-[#e8edf3] truncate max-w-[60%] text-right">
                    {String(v)}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="log" className="mt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-plex-mono text-[10px] uppercase tracking-wider text-[#e8edf3]/55">
                {events.length} events
              </span>
              <button
                onClick={clearDebug}
                className="text-[10px] font-plex-mono uppercase tracking-wider px-2 py-1 rounded bg-[#3b6fa0]/20 hover:bg-[#3b6fa0]/40"
              >
                Wissen
              </button>
            </div>
            <div className="rounded border border-[#3b6fa0]/30 p-2 max-h-[60vh] overflow-y-auto font-plex-mono text-[10px] space-y-1">
              {events.length === 0 && (
                <div className="text-[#e8edf3]/40 italic p-2">Nog geen events.</div>
              )}
              {events
                .slice()
                .reverse()
                .map((e, i) => (
                  <div key={i} className="border-b border-[#3b6fa0]/10 pb-1">
                    <div className="flex justify-between text-[#e8edf3]/50">
                      <span>{new Date(e.ts).toLocaleTimeString()}</span>
                      <span>{e.kind}</span>
                    </div>
                    <div className="text-[#e8edf3]/85">{e.msg}</div>
                    {e.data && (
                      <div className="text-[#e8edf3]/55 break-all">{JSON.stringify(e.data)}</div>
                    )}
                  </div>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
