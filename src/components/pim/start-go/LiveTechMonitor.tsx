import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { onNerStatus, loadNerSlm, type NerStatus } from "@/lib/pim/nerSlm";
import { onRewriteStatus, loadRewriteLlm, type RewriteStatus } from "@/lib/pim/rewriteLlm";
import { onModelIntegrity, type ModelIntegrityRecord } from "@/lib/pim/modelCatalog";
import { subscribeDebug, clearDebug, type DebugEvent } from "@/lib/pim/debugBus";

function useEnv() {
  const [env, setEnv] = useState<Record<string, unknown>>({});
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number; gpu?: { requestAdapter?: () => Promise<unknown> } };
    (async () => {
      let webgpu = false;
      try { webgpu = !!(await nav.gpu?.requestAdapter?.()); } catch { /* noop */ }
      setEnv({
        webgpu,
        deviceMemory: nav.deviceMemory ?? "onbekend",
        cores: nav.hardwareConcurrency ?? "onbekend",
        crossOriginIsolated: typeof window !== "undefined" ? window.crossOriginIsolated : false,
        online: typeof navigator !== "undefined" ? navigator.onLine : true,
        viewport: typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}` : "?",
        dpr: typeof window !== "undefined" ? window.devicePixelRatio : 1,
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      });
    })();
  }, []);
  return env;
}

function StatusDot({ tone }: { tone: "green" | "amber" | "red" | "gray" }) {
  const c = tone === "green" ? "bg-green-400" : tone === "amber" ? "bg-amber-400 animate-pulse" : tone === "red" ? "bg-red-400" : "bg-[#3b6fa0]/40";
  return <span className={`inline-block w-2 h-2 rounded-full ${c}`} aria-hidden />;
}

function modelTone(s: { loading?: boolean; ready?: boolean; error?: string | null } | null): "green" | "amber" | "red" | "gray" {
  if (!s) return "gray";
  if (s.error) return "red";
  if (s.ready) return "green";
  if (s.loading) return "amber";
  return "gray";
}

export function LiveTechMonitor({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [ner, setNer] = useState<NerStatus | null>(null);
  const [llm, setLlm] = useState<RewriteStatus | null>(null);
  const [integrity, setIntegrity] = useState<ModelIntegrityRecord[]>([]);
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const env = useEnv();

  useEffect(() => onNerStatus(setNer), []);
  useEffect(() => onRewriteStatus(setLlm), []);
  useEffect(() => onModelIntegrity(setIntegrity), []);
  useEffect(() => subscribeDebug(setEvents), []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-[#0f1b3d] border-l-[#3b6fa0]/30 text-[#e8edf3] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif-display text-[#e8edf3]">Live techniek</SheetTitle>
          <SheetDescription className="text-[#e8edf3]/60 text-xs">
            Realtime kijkje in de pipeline. <strong>Op mobiel is niet alles mogelijk</strong> — de generalisatie-LLM (~400 MB) blijft daar uit; NER-SLM werkt wel maar de eerste download duurt langer.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="pipeline" className="mt-4">
          <TabsList className="grid grid-cols-4 bg-[#1e3a5f]/40">
            <TabsTrigger value="pipeline" className="text-xs">Pipeline</TabsTrigger>
            <TabsTrigger value="models" className="text-xs">Modellen</TabsTrigger>
            <TabsTrigger value="env" className="text-xs">Omgeving</TabsTrigger>
            <TabsTrigger value="log" className="text-xs">Log</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-3 space-y-2">
            {events.filter((e) => e.kind === "pipeline.run" || e.kind === "pipeline.execute").slice(-1).map((e, i) => (
              <div key={i} className="rounded border border-[#3b6fa0]/30 p-3 space-y-2 text-xs">
                <div className="font-plex-mono text-[10px] uppercase tracking-wider text-[#e8edf3]/55">Laatste run</div>
                {Object.entries(e.data ?? {}).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 font-plex-mono text-[11px]">
                    <span className="text-[#e8edf3]/60">{k}</span>
                    <span className="text-[#e8edf3] truncate">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            ))}
            {events.filter((e) => e.kind === "pipeline.run" || e.kind === "pipeline.execute").length === 0 && (
              <div className="text-xs text-[#e8edf3]/50 italic p-3">Nog geen run — typ tekst in het paneel om te starten.</div>
            )}
          </TabsContent>

          <TabsContent value="models" className="mt-3 space-y-3">
            <div className="rounded border border-[#3b6fa0]/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <StatusDot tone={modelTone(ner)} />
                <span className="font-serif-display text-sm">NER-SLM (Download 1)</span>
              </div>
              <div className="font-plex-mono text-[10px] text-[#e8edf3]/60 break-all">{ner?.modelId}</div>
              <div className="text-xs text-[#e8edf3]/70">
                runtime: <strong>{ner?.runtime ?? "—"}</strong> · verified: <strong>{ner?.verified ? "ja" : "nee"}</strong>
              </div>
              {ner?.progress && (
                <div className="space-y-1">
                  <div className="text-[10px] text-[#e8edf3]/55 truncate">{ner.progress.file}</div>
                  <div className="h-1 rounded bg-[#0f1b3d] overflow-hidden">
                    <div className="h-full bg-amber-400/70" style={{ width: `${Math.min(100, Math.round((ner.progress.pct ?? 0) * 100))}%` }} />
                  </div>
                </div>
              )}
              {ner?.error && <div className="text-xs text-red-300">{ner.error}</div>}
              {!ner?.ready && !ner?.loading && (
                <button onClick={() => loadNerSlm().catch(() => {})} className="text-[11px] font-plex-mono uppercase tracking-wider px-2 py-1 rounded bg-[#3b6fa0]/30 hover:bg-[#3b6fa0]/50">
                  Nu laden
                </button>
              )}
            </div>

            <div className="rounded border border-[#3b6fa0]/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <StatusDot tone={modelTone(llm)} />
                <span className="font-serif-display text-sm">Generalisatie-LLM (Download 2)</span>
              </div>
              <div className="font-plex-mono text-[10px] text-[#e8edf3]/60 break-all">{llm?.modelId}</div>
              {llm?.progress && (
                <div className="space-y-1">
                  <div className="text-[10px] text-[#e8edf3]/55 truncate">{llm.progress.text}</div>
                  <div className="h-1 rounded bg-[#0f1b3d] overflow-hidden">
                    <div className="h-full bg-amber-400/70" style={{ width: `${llm.progress.pct ?? 0}%` }} />
                  </div>
                </div>
              )}
              {llm?.error && <div className="text-xs text-red-300">{llm.error}</div>}
              {!llm?.ready && !llm?.loading && (
                <button onClick={() => loadRewriteLlm().catch(() => {})} className="text-[11px] font-plex-mono uppercase tracking-wider px-2 py-1 rounded bg-[#3b6fa0]/30 hover:bg-[#3b6fa0]/50">
                  Nu laden (~400 MB)
                </button>
              )}
            </div>

            <div className="rounded border border-[#3b6fa0]/30 p-3 space-y-1">
              <div className="font-plex-mono text-[10px] uppercase tracking-wider text-[#e8edf3]/55">Integrity</div>
              {integrity.length === 0 && <div className="text-xs text-[#e8edf3]/50 italic">Nog geen verificatie.</div>}
              {integrity.map((r) => (
                <div key={r.key} className="flex justify-between gap-2 font-plex-mono text-[11px]">
                  <span className="text-[#e8edf3]/70">{r.key}</span>
                  <span className={r.status === "verified" ? "text-green-300" : r.status === "mismatch" ? "text-red-300" : "text-amber-300"}>{r.status}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="env" className="mt-3">
            <div className="rounded border border-[#3b6fa0]/30 p-3 space-y-1 text-xs">
              {Object.entries(env).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 font-plex-mono text-[11px]">
                  <span className="text-[#e8edf3]/60">{k}</span>
                  <span className="text-[#e8edf3] truncate max-w-[60%] text-right">{String(v)}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="log" className="mt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-plex-mono text-[10px] uppercase tracking-wider text-[#e8edf3]/55">
                {events.length} events
              </span>
              <button onClick={clearDebug} className="text-[10px] font-plex-mono uppercase tracking-wider px-2 py-1 rounded bg-[#3b6fa0]/20 hover:bg-[#3b6fa0]/40">
                Wissen
              </button>
            </div>
            <div className="rounded border border-[#3b6fa0]/30 p-2 max-h-[60vh] overflow-y-auto font-plex-mono text-[10px] space-y-1">
              {events.length === 0 && <div className="text-[#e8edf3]/40 italic p-2">Nog geen events.</div>}
              {events.slice().reverse().map((e, i) => (
                <div key={i} className="border-b border-[#3b6fa0]/10 pb-1">
                  <div className="flex justify-between text-[#e8edf3]/50">
                    <span>{new Date(e.ts).toLocaleTimeString()}</span>
                    <span>{e.kind}</span>
                  </div>
                  <div className="text-[#e8edf3]/85">{e.msg}</div>
                  {e.data && <div className="text-[#e8edf3]/55 break-all">{JSON.stringify(e.data)}</div>}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}