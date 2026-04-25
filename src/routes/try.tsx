import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/pim/PageHero";
import {
  computeSignals, anonymize, pseudonymize, draftCheck, decide, executeAction,
  createMappingContainer, restoreFromContainer, destroyContainer,
  installRuntimeHardening, onViolations,
  type Mode, type Action, type Verdict, type AuditEvent, type MappingHandle,
} from "@/lib/pim";
import { Shield, ShieldAlert, ShieldCheck, ShieldX, Copy, Eye, Save, RotateCcw, Send, Download, Printer, Share2, Lock, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/try")({
  head: () => ({
    meta: [
      { title: "Try-it — Project PIM" },
      { name: "description", content: "Test de PIM privacy pipeline live op je eigen tekst. Detectie, generalisatie, AES-GCM mapping, egress guard — alles in jouw browser." },
      { property: "og:title", content: "Try Project PIM live" },
      { property: "og:description", content: "Live PIM privacy pipeline — alles lokaal." },
    ],
  }),
  component: TryPage,
});

const SAMPLE = `Notitie van mentor over Sarah Jansen (groep 6) van basisschool De Wilg in Utrecht.
Vader van Sarah belde 06-12345678 over recent incident op 14-03-2026 — zorgleerling met dyslexie.
Postcode 3511AB, Bredestraat 12. Mail: jansen@example.com. BSN 123456782.`;

const ACTIONS: { id: Action; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "display", label: "Display", icon: Eye },
  { id: "copy", label: "Copy", icon: Copy },
  { id: "save_local", label: "Save", icon: Save },
  { id: "restore", label: "Restore", icon: RotateCcw },
  { id: "export_file", label: "Export", icon: Download },
  { id: "send_external_ai", label: "Send AI", icon: Send },
  { id: "print", label: "Print", icon: Printer },
  { id: "share", label: "Share", icon: Share2 },
];

function TryPage() {
  const [text, setText] = useState(SAMPLE);
  const [mode, setMode] = useState<Mode>("anonymous");
  const [action, setAction] = useState<Action>("display");
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [handle, setHandle] = useState<MappingHandle | null>(null);
  const [restored, setRestored] = useState<string | null>(null);
  const [egress, setEgress] = useState<{ ok: boolean; msg: string } | null>(null);
  const [violations, setViolations] = useState<string[]>([]);

  // Install runtime hardening once on mount.
  useEffect(() => {
    installRuntimeHardening();
    const off = onViolations(setViolations);
    return off;
  }, []);

  const signals = useMemo(() => computeSignals(text), [text]);

  // For pseudonymous: generate plain mapping in-memory once, then push to AES container async
  const processed = useMemo(() => {
    if (mode === "anonymous") return { draft: anonymize(text, signals), plainMap: null as Map<string, string> | null };
    const r = pseudonymize(text, signals);
    return { draft: r.draft, plainMap: r.mapping };
  }, [text, mode, signals]);

  // Async: encrypt mapping into AES-GCM container whenever pseudonymous draft changes
  useEffect(() => {
    setRestored(null);
    if (mode !== "pseudonymous" || !processed.plainMap || processed.plainMap.size === 0) {
      if (handle) { destroyContainer(handle); setHandle(null); }
      return;
    }
    let cancelled = false;
    (async () => {
      const h = await createMappingContainer(processed.plainMap!);
      if (cancelled) destroyContainer(h);
      else {
        if (handle) destroyContainer(handle);
        setHandle(h);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processed.draft.text, mode]);

  const guard = useMemo(() => draftCheck(processed.draft, mode), [processed.draft, mode]);
  const decision = useMemo(
    () => decide({ mode, action, signals, draftCheck: guard, modelVerified: true }),
    [mode, action, signals, guard],
  );

  const onAct = async () => {
    setEgress(null);
    setRestored(null);
    let payloadText = processed.draft.text;

    // Restore-actie: alleen lokaal, alleen via AES container
    if (decision.action === "restore" && decision.verdict !== "BLOCK") {
      if (!handle) {
        setEgress({ ok: false, msg: "Geen mapping container — restore onmogelijk." });
        return;
      }
      payloadText = await restoreFromContainer(handle, processed.draft.text);
      setRestored(payloadText);
    }

    const result = await executeAction(decision, { text: payloadText, mode });
    setEgress({ ok: result.executed, msg: result.reason });

    setAudit((a) => [{
      ts: decision.timestamp,
      action: decision.action,
      mode: decision.mode,
      verdict: decision.verdict,
      reasonCode: decision.reasonCode,
      ruleId: decision.ruleId,
      riskLevel: decision.riskLevel,
      policyVersion: decision.policyVersion,
    }, ...a].slice(0, 20));
  };

  return (
    <>
      <PageHero
        eyebrow="Try-it · live, lokaal, AES-GCM"
        title={<>Test de pipeline op <span className="text-primary">echte tekst</span></>}
        description="Type of plak een fragment, kies modus en actie. Mapping wordt versleuteld met AES-GCM. Egress wordt écht uitgevoerd via clipboard, print, share of download — maar alleen na PIM ALLOW."
      />

      {violations.length > 0 && (
        <div className="mx-auto max-w-7xl px-6 mt-4">
          <div className="panel p-4 border-orange/50 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-semibold text-orange mb-1">Runtime hardening detecteerde {violations.length} egress-poging(en):</div>
              <ul className="font-mono text-muted-foreground space-y-0.5">
                {violations.slice(-3).map((v, i) => <li key={i}>· {v}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-6 py-10 grid gap-5 lg:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-cyan">01 · Raw input</div>
                <h3 className="font-display font-bold">Onderwijsfragment</h3>
              </div>
              <button onClick={() => setText(SAMPLE)} className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-accent">Reset</button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full font-mono text-sm bg-background/60 border border-border/60 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Plak hier docentnotitie, leerlingtekst, dossierfragment..."
            />
          </div>

          <div className="panel p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-cyan mb-1">02 · Detectie & signals</div>
            <h3 className="font-display font-bold mb-4">Privacy signals</h3>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <Stat label="Direct PII" value={signals.directPii.length} accent="orange" />
              <Stat label="Contextueel" value={signals.contextualPii.length} accent="cyan" />
              <Stat label="Risk score" value={`${(signals.riskScore * 100).toFixed(0)}%`} accent={signals.riskScore > 0.4 ? "red" : signals.riskScore > 0.18 ? "orange" : "green"} />
            </div>
            <div className="mb-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Risk level: <span className="text-foreground capitalize">{signals.riskLevel}</span></div>
              <div className="h-2 rounded-full bg-card overflow-hidden border border-border/40">
                <div className="h-full transition-all" style={{
                  width: `${signals.riskScore * 100}%`,
                  background: signals.riskScore > 0.4 ? "var(--red)" : signals.riskScore > 0.18 ? "var(--orange)" : "var(--green)",
                }} />
              </div>
            </div>
            {signals.directPii.length + signals.contextualPii.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {[...signals.directPii, ...signals.contextualPii].map((s, i) => (
                  <span key={i} className={`font-mono text-[11px] px-2 py-0.5 rounded-full border ${s.contextual ? "border-cyan/40 bg-cyan/10 text-cyan" : "border-orange/40 bg-orange/10 text-orange"}`}>
                    {s.category}: {s.text.length > 24 ? s.text.slice(0, 22) + "…" : s.text}
                  </span>
                ))}
              </div>
            )}
            {signals.reasons.length > 0 && (
              <ul className="mt-3 text-xs text-muted-foreground space-y-1">
                {signals.reasons.map((r, i) => <li key={i}>· {r}</li>)}
              </ul>
            )}
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="font-mono text-[11px] uppercase tracking-wider text-purple">03 · Processed draft ({mode})</div>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                guard.status === "pass" ? "border-green/40 bg-green/10 text-green" :
                guard.status === "repair" ? "border-orange/40 bg-orange/10 text-orange" :
                "border-red/50 bg-red/10 text-red"
              }`}>
                Draft Check: {guard.status}
              </span>
            </div>
            <h3 className="font-display font-bold mb-3">{mode === "anonymous" ? "Anonymous candidate" : "Pseudonymous candidate"}</h3>
            <pre className="font-mono text-sm whitespace-pre-wrap bg-background/60 border border-border/60 rounded-lg p-3 max-h-64 overflow-auto">
{processed.draft.text}
            </pre>
            {guard.issues.length > 0 && (
              <ul className="mt-3 text-xs text-orange space-y-1">
                {guard.issues.map((i, k) => <li key={k}>⚠ {i}</li>)}
              </ul>
            )}
            {handle && (
              <div className="mt-4 panel p-3 border-cyan/40 bg-cyan/5">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="h-3.5 w-3.5 text-cyan" />
                  <span className="font-mono text-[11px] text-cyan uppercase tracking-wider">Secure Mapping Container</span>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  Handle: <span className="text-foreground">{handle.id.slice(0, 12)}…</span> · {handle.tokenCount} tokens · AES-GCM 256
                </div>
                <div className="font-mono text-[10px] text-muted-foreground mt-1">
                  Originelen versleuteld in module-private register. UI heeft geen directe toegang.
                </div>
              </div>
            )}
            {restored !== null && (
              <div className="mt-3 panel p-3 border-cyan/40">
                <div className="font-mono text-[11px] text-cyan uppercase tracking-wider mb-1">Restored (alleen lokaal)</div>
                <pre className="font-mono text-xs whitespace-pre-wrap text-foreground/90">{restored}</pre>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-orange mb-2">04 · Mode</div>
            <div className="grid grid-cols-2 gap-2">
              {(["anonymous", "pseudonymous"] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                  mode === m
                    ? m === "anonymous" ? "bg-purple/15 border-purple text-purple" : "bg-cyan/15 border-cyan text-cyan"
                    : "bg-card/40 border-border/60 text-muted-foreground hover:border-border"
                }`}>{m}</button>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-orange mb-2">05 · Action</div>
            <div className="grid grid-cols-4 gap-1.5">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <button key={a.id} onClick={() => setAction(a.id)} className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-[10px] font-medium transition-all border ${
                    action === a.id ? "bg-primary/15 border-primary text-primary" : "bg-card/40 border-border/50 text-muted-foreground hover:border-border"
                  }`} title={a.label}>
                    <Icon className="h-4 w-4" />
                    <span className="leading-none">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <VerdictCard verdict={decision.verdict} reason={decision.reason} reasonCode={decision.reasonCode} ruleId={decision.ruleId} flag={decision.flag} onAct={onAct} egress={egress} />

          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-green">07 · Minimal audit</div>
                <h3 className="font-display font-bold text-sm">Metadata only — geen inhoud</h3>
              </div>
              {audit.length > 0 && <button onClick={() => setAudit([])} className="text-[11px] text-muted-foreground hover:text-foreground">Wis</button>}
            </div>
            {audit.length === 0 ? (
              <p className="text-xs text-muted-foreground">Geen events. Klik "Voer actie uit" om een audit-record te maken.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-auto">
                {audit.map((e, i) => (
                  <div key={i} className="font-mono text-[10.5px] p-2 rounded-md bg-background/50 border border-border/40 grid grid-cols-[auto_1fr] gap-x-2">
                    <span className={
                      e.verdict === "ALLOW" ? "text-green" :
                      e.verdict === "ALLOW_WITH_WARNING" ? "text-orange" : "text-red"
                    }>{e.verdict}</span>
                    <span className="text-muted-foreground truncate">{e.action} · {e.mode} · {e.ruleId}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent: "orange" | "cyan" | "green" | "red" }) {
  return (
    <div className={`rounded-lg border p-3 bg-card/40 border-${accent}/30`}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl font-bold text-${accent} mt-0.5`}>{value}</div>
    </div>
  );
}

function VerdictCard({ verdict, reason, reasonCode, ruleId, flag, onAct, egress }: {
  verdict: Verdict; reason: string; reasonCode: string; ruleId: string; flag?: string;
  onAct: () => void; egress: { ok: boolean; msg: string } | null;
}) {
  const cfg = {
    ALLOW: { Icon: ShieldCheck, klass: "verdict-allow", bar: "bar-green", border: "border-green/50", glow: "shadow-[var(--shadow-glow-green)]" },
    ALLOW_WITH_WARNING: { Icon: ShieldAlert, klass: "verdict-warn", bar: "bar-orange", border: "border-orange/50", glow: "shadow-[var(--shadow-glow-orange)]" },
    BLOCK: { Icon: ShieldX, klass: "verdict-block", bar: "bar-red", border: "border-red/60", glow: "shadow-[var(--shadow-glow-red)]" },
  }[verdict];
  const { Icon } = cfg;
  return (
    <div className={`pipeline-stage p-6 ${cfg.border} ${cfg.glow}`}>
      <div className={`stage-bar ${cfg.bar} -mx-6 -mt-6 mb-5`} />
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        <Shield className="h-3.5 w-3.5" /> 06 · PIM Decision
      </div>
      <div className="flex items-start gap-3">
        <Icon className={`h-10 w-10 ${cfg.klass} flex-shrink-0`} />
        <div className="min-w-0">
          <div className={`font-display font-black text-2xl leading-none ${cfg.klass}`}>{verdict}</div>
          {flag && <div className="font-mono text-[10px] text-primary mt-1 truncate">{flag}</div>}
          <div className="font-mono text-[10px] text-muted-foreground">{ruleId}</div>
        </div>
      </div>
      <p className="mt-4 text-sm text-foreground/90 leading-relaxed">{reason}</p>
      <div className="mt-3 font-mono text-[10px] text-muted-foreground">reasonCode: {reasonCode}</div>
      <button onClick={onAct} className="mt-5 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
        Voer actie uit (egress + audit)
      </button>
      {egress && (
        <div className={`mt-3 p-3 rounded-lg border text-xs ${egress.ok ? "border-green/40 bg-green/5 text-green" : "border-red/40 bg-red/5 text-red"}`}>
          <div className="font-semibold mb-0.5">{egress.ok ? "Egress uitgevoerd" : "Egress geblokkeerd"}</div>
          <div className="text-foreground/80">{egress.msg}</div>
        </div>
      )}
    </div>
  );
}
