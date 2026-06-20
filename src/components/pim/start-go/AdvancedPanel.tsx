// Advanced panel — geeft gebruikers sturing over profiel, drempels en toont
// modelintegriteit. Alleen UI; alle beslislogica blijft in src/lib/pim.
import { useState } from "react";
import { ChevronDown, RotateCcw, ShieldCheck, ShieldAlert, SlidersHorizontal } from "lucide-react";
import {
  PIPELINE_PROFILES,
  RELEASE_1_PROFILES,
  DEFAULT_ANON_THRESHOLDS,
  type PipelineProfileId,
  type Action,
  type ModelIntegrityRecord,
  type PiiCategory,
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

// Categorieën die je kunt aan/uitzetten — gegroepeerd op relevantie.
const CATEGORY_GROUPS: PiiCategory[] = [
  "email", "phone", "bsn", "iban", "credit_card", "postcode", "address",
  "name", "school", "date", "birthdate_text", "student_id", "class_code",
  "license_plate", "url", "ip_address", "social_handle",
  "context_small_group", "context_care", "context_incident", "context_role",
  "context_health", "context_family", "context_legal", "context_financial",
  "context_protected_class", "context_performance", "context_location_specific",
];

interface Props {
  profileId: PipelineProfileId;
  onProfileChange: (id: PipelineProfileId) => void;
  thresholds: Partial<Record<Action, number>>;
  onThresholdChange: (action: Action, value: number) => void;
  onResetThresholds: () => void;
  integrity: ModelIntegrityRecord[];
  disabledCategories: ReadonlySet<PiiCategory>;
  onToggleCategory: (cat: PiiCategory) => void;
  onResetCategories: () => void;
}

export function AdvancedPanel({
  profileId, onProfileChange, thresholds, onThresholdChange, onResetThresholds, integrity,
  disabledCategories, onToggleCategory, onResetCategories,
}: Props) {
  const [open, setOpen] = useState(false);
  const profile = PIPELINE_PROFILES[profileId];

  return (
    <section className="rounded-2xl border border-[#3b6fa0]/30 bg-[#0f1b3d]/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#3b6fa0]/10 transition-colors"
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3b6fa0]/15 border border-[#3b6fa0]/30">
          <SlidersHorizontal className="h-4 w-4 text-[#e8edf3]/80" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#e8edf3] leading-tight">
            Geavanceerde instellingen
          </div>
          <div className="text-[11px] text-[#e8edf3]/55 leading-snug truncate">
            Profiel · drempels · detectoren
          </div>
        </div>
        <span className="hidden sm:inline-flex text-[10px] font-plex-mono px-2 py-1 rounded-md bg-[#3b6fa0]/15 border border-[#3b6fa0]/25 text-[#e8edf3]/70 truncate max-w-[40%]">
          {profile.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#e8edf3]/55 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
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

          {/* Detector categorieën */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider font-plex-mono text-[#e8edf3]/50">
                Detectoren (categorieën)
              </div>
              <button
                type="button"
                onClick={onResetCategories}
                className="inline-flex items-center gap-1 text-[10px] font-plex-mono text-[#e8edf3]/60 hover:text-[#e8edf3] px-2 py-1 rounded hover:bg-[#3b6fa0]/15"
              >
                <RotateCcw className="h-3 w-3" /> Alles aan
              </button>
            </div>
            <p className="text-[11px] text-[#e8edf3]/50 leading-snug">
              Uitschakelen verlaagt detectie — alleen voor demo of false-positive-debug.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {CATEGORY_GROUPS.map((cat) => {
                const off = disabledCategories.has(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onToggleCategory(cat)}
                    className={`text-[10px] font-plex-mono px-2 py-1 rounded border transition-colors ${
                      off
                        ? "border-[#3b6fa0]/15 bg-transparent text-[#e8edf3]/35 line-through"
                        : "border-[#3b6fa0]/40 bg-[#3b6fa0]/15 text-[#e8edf3]/85 hover:bg-[#3b6fa0]/25"
                    }`}
                  >
                    {cat}
                  </button>
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
                {integrity.map((r, i) => {
                  const ok = r.status === "verified";
                  return (
                    <li key={i} className="flex items-start gap-2 text-[11px]">
                      {ok ? (
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="font-plex-mono">
                        <div className="text-[#e8edf3]/85">{r.modelId}</div>
                        <div className="text-[#e8edf3]/45 text-[10px]">
                          {r.status} · {r.message}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}