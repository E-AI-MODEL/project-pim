// Advanced panel — geeft gebruikers sturing over profiel, drempels en toont
// modelintegriteit. Alleen UI; alle beslislogica blijft in src/lib/pim.
import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw, ShieldCheck, ShieldAlert } from "lucide-react";
import {
  PIPELINE_PROFILES,
  RELEASE_1_PROFILES,
  DEFAULT_ANON_THRESHOLDS,
  type PipelineProfileId,
  type Action,
  type ModelIntegrityRecord,
} from "@/lib/pim";

const ACTION_LABELS: Record<Action, string> = {
  send_external_ai: "Externe AI",
  export_file: "Bestand",
  print: "Printer",
  copy: "Klembord",
  share: "Link delen",
  save_local: "Lokaal opslaan",
  display: "Alleen scherm",
  restore: "Herstel mapping",
};

const TUNEABLE: Action[] = [
  "send_external_ai", "export_file", "print", "copy", "share", "save_local", "display",
];

interface Props {
  profileId: PipelineProfileId;
  onProfileChange: (id: PipelineProfileId) => void;
  thresholds: Partial<Record<Action, number>>;
  onThresholdChange: (action: Action, value: number) => void;
  onResetThresholds: () => void;
  integrity: ModelIntegrityRecord[];
}

export function AdvancedPanel({
  profileId, onProfileChange, thresholds, onThresholdChange, onResetThresholds, integrity,
}: Props) {
  const [open, setOpen] = useState(false);
  const profile = PIPELINE_PROFILES[profileId];

  return (
    <section className="rounded-2xl border border-[#3b6fa0]/30 bg-[#0f1b3d]/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#3b6fa0]/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 text-[#e8edf3]/60" /> : <ChevronRight className="h-4 w-4 text-[#e8edf3]/60" />}
          <span className="text-[10px] uppercase tracking-wider font-plex-mono text-[#e8edf3]/55">Advanced</span>
          <span className="text-sm text-[#e8edf3]/85">Profiel, drempels & integriteit</span>
        </div>
        <span className="text-[11px] font-plex-mono text-[#e8edf3]/45 truncate max-w-[40%]">{profile.label}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-5 border-t border-[#3b6fa0]/15">
          {/* Pipeline profile */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-plex-mono text-[#e8edf3]/50">Pipeline-profiel</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.values(PIPELINE_PROFILES)).map((p) => {
                const enabled = RELEASE_1_PROFILES.includes(p.id);
                const active = p.id === profileId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!enabled}
                    onClick={() => enabled && onProfileChange(p.id)}
                    className={`text-left rounded-md border px-3 py-2 transition-colors ${
                      active
                        ? "bg-[#3b6fa0]/25 border-[#3b6fa0]/70"
                        : "border-[#3b6fa0]/20 hover:bg-[#3b6fa0]/10"
                    } ${!enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#e8edf3]">{p.label}</span>
                      <span className="text-[9px] font-plex-mono uppercase tracking-wider text-[#e8edf3]/50">
                        {p.releaseStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#e8edf3]/55 mt-1 leading-snug">{p.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(p.detectors).filter(([, on]) => on).map(([k]) => (
                        <span key={k} className="text-[9px] font-plex-mono px-1.5 py-0.5 rounded bg-[#3b6fa0]/20 text-[#e8edf3]/70">
                          {k}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thresholds */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider font-plex-mono text-[#e8edf3]/50">
                Risico-drempels (anoniem)
              </div>
              <button
                type="button"
                onClick={onResetThresholds}
                className="inline-flex items-center gap-1 text-[10px] font-plex-mono text-[#e8edf3]/60 hover:text-[#e8edf3] px-2 py-1 rounded hover:bg-[#3b6fa0]/15"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
            <p className="text-[11px] text-[#e8edf3]/50 leading-snug">
              Lager = strenger. Boven de drempel blokkeert PiM de actie. Pseudoniem-modus negeert deze drempels (egress altijd geblokkeerd).
            </p>
            <div className="space-y-2 pt-1">
              {TUNEABLE.map((a) => {
                const def = DEFAULT_ANON_THRESHOLDS[a];
                const val = thresholds[a] ?? def;
                const isOverride = thresholds[a] !== undefined && thresholds[a] !== def;
                return (
                  <div key={a} className="grid grid-cols-[110px_1fr_56px] items-center gap-2">
                    <label className="text-[11px] text-[#e8edf3]/80 truncate">{ACTION_LABELS[a]}</label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={val}
                      onChange={(e) => onThresholdChange(a, parseFloat(e.target.value))}
                      className="accent-[#3b6fa0]"
                    />
                    <span className={`text-[10px] font-plex-mono text-right ${isOverride ? "text-[#e8edf3]" : "text-[#e8edf3]/50"}`}>
                      {(val * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Model integrity */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider font-plex-mono text-[#e8edf3]/50">Modelintegriteit</div>
            {integrity.length === 0 ? (
              <p className="text-[11px] text-[#e8edf3]/50">Nog geen modellen gecheckt.</p>
            ) : (
              <ul className="space-y-1">
                {integrity.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px]">
                    {r.verified ? (
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="font-plex-mono">
                      <div className="text-[#e8edf3]/85">{r.modelId}</div>
                      <div className="text-[#e8edf3]/45 text-[10px]">
                        {r.verified ? "verified" : "MISMATCH"} · {r.reason ?? "—"}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}