import { useEffect, useRef, useState } from "react";
import {
  ChevronDown, RotateCcw, ShieldCheck, ShieldAlert, SlidersHorizontal,
  Layers, Gauge, Filter, Cpu, Info, AlertTriangle,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { NerVariantPicker } from "./NerVariantPicker";
import {
  PIPELINE_PROFILES,
  RELEASE_1_PROFILES,
  DEFAULT_ANON_THRESHOLDS,
  type PipelineProfileId,
  type Action,
  type ModelIntegrityRecord,
  type PiiCategory,
  type NerStatus,
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

const ACTION_HINT: Partial<Record<Action, string>> = {
  send_external_ai: "AI-tool buiten je organisatie.",
  export_file: "Download als bestand.",
  print: "Fysieke of netwerkprinter.",
  copy: "Kopiëren naar klembord.",
  share: "Delen via browser.",
  save_local: "Alleen in deze browser.",
  display: "Niets versturen.",
};

const STRICT_OFFSET = -0.15;
const RELAXED_OFFSET = +0.25;
function clampThreshold(v: number) { return Math.max(0.05, Math.min(0.95, v)); }
function levelFor(value: number, def: number): "strict" | "default" | "relaxed" | "custom" {
  const eps = 0.005;
  if (Math.abs(value - def) < eps) return "default";
  if (Math.abs(value - clampThreshold(def + STRICT_OFFSET)) < eps) return "strict";
  if (Math.abs(value - clampThreshold(def + RELAXED_OFFSET)) < eps) return "relaxed";
  return "custom";
}
const LEVEL_HINT = {
  strict: "vervangt sneller",
  default: "aanbevolen",
  relaxed: "laat meer staan",
  custom: "eigen waarde",
} as const;

const TUNEABLE: Action[] = [
  "send_external_ai", "export_file", "print", "copy", "share", "save_local", "display",
];

const CATEGORY_SECTIONS: { label: string; cats: PiiCategory[] }[] = [
  { label: "Identiteit", cats: ["name", "bsn", "student_id", "id_document", "birthdate_text", "date"] },
  { label: "Contact", cats: ["email", "phone", "url", "social_handle", "ip_address"] },
  { label: "Financieel", cats: ["iban", "credit_card"] },
  { label: "Locatie & school", cats: ["postcode", "address", "school", "class_code", "license_plate"] },
  {
    label: "Context",
    cats: [
      "context_small_group", "context_care", "context_incident", "context_role",
      "context_health", "context_family", "context_legal", "context_financial",
      "context_protected_class", "context_performance", "context_location_specific",
    ],
  },
];

const CATEGORY_LABELS: Partial<Record<PiiCategory, string>> = {
  email: "E-mail", phone: "Telefoon", bsn: "BSN", iban: "IBAN",
  credit_card: "Creditcard", postcode: "Postcode", address: "Adres",
  name: "Naam", school: "School", date: "Datum", birthdate_text: "Geboortedatum",
  student_id: "Leerling-ID", class_code: "Klascode", license_plate: "Kenteken",
  id_document: "Documentnummer",
  url: "URL", ip_address: "IP-adres", social_handle: "Social handle",
  context_small_group: "Kleine groep", context_care: "Zorg",
  context_incident: "Incident", context_role: "Rol", context_health: "Gezondheid",
  context_family: "Gezin", context_legal: "Juridisch",
  context_financial: "Financieel", context_protected_class: "Beschermde klasse",
  context_performance: "Prestatie", context_location_specific: "Specifieke locatie",
};

const CATEGORY_EXAMPLE: Partial<Record<PiiCategory, string>> = {
  bsn: "BSN", iban: "IBAN", email: "e-mail", phone: "06-nummer",
  postcode: "postcode", name: "naam", date: "datum", url: "link",
  ip_address: "IP", credit_card: "creditcard", license_plate: "kenteken",
  id_document: "documentnummer",
};

const PROFILE_SHORT_LABEL: Partial<Record<PipelineProfileId, string>> = {
  "education-nl-full": "Onderwijs — Volledig",
  "education-nl-rules-only": "Onderwijs — Alleen regels",
  "healthcare-nl": "Zorg (ontwerp)",
  "generic-nl": "Algemeen NL (ontwerp)",
  "generic-en": "Algemeen EN (ontwerp)",
};
const PROFILE_SHORT_DESC: Partial<Record<PipelineProfileId, string>> = {
  "education-nl-full": "Regels + naamherkenning + onderwijscontext.",
  "education-nl-rules-only": "Geen modeldownload, beperkt delen.",
  "healthcare-nl": "Nog niet vrijgegeven.",
  "generic-nl": "Nog niet vrijgegeven.",
  "generic-en": "Nog niet vrijgegeven.",
};

export interface AdvancedPanelProps {
  profileId: PipelineProfileId;
  onProfileChange: (id: PipelineProfileId) => void;
  thresholds: Partial<Record<Action, number>>;
  onThresholdChange: (action: Action, value: number) => void;
  onResetThresholds: () => void;
  integrity: ModelIntegrityRecord[];
  disabledCategories: ReadonlySet<PiiCategory>;
  onToggleCategory: (cat: PiiCategory) => void;
  onResetCategories: () => void;
  writer?: {
    autoRedact: ReadonlySet<PiiCategory>;
    onAutoRedactChange: (cat: PiiCategory, scrub: boolean) => void;
    strict: boolean;
    onStrictChange: (v: boolean) => void;
  };
  ner?: {
    status: NerStatus | null;
    onStart: () => void;
    available: boolean;
  };
}

export function AdvancedPanel({
  profileId, onProfileChange, thresholds, onThresholdChange, onResetThresholds, integrity,
  disabledCategories, onToggleCategory, onResetCategories, writer, ner,
}: AdvancedPanelProps) {
  const isWriter = !!writer;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(isWriter ? "detectors" : "profile");
  const [expert, setExpert] = useState(false);
  const profile = PIPELINE_PROFILES[profileId];
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    };
    window.addEventListener("pim:open-advanced", onOpen);
    return () => window.removeEventListener("pim:open-advanced", onOpen);
  }, []);

  const overriddenCount = TUNEABLE.filter(
    (a) => thresholds[a] !== undefined && thresholds[a] !== DEFAULT_ANON_THRESHOLDS[a],
  ).length;
  const offCount = disabledCategories.size;
  const scrubCount = writer ? writer.autoRedact.size : 0;

  return (
    <section
      ref={sectionRef}
      className={`scroll-mt-20 rounded-2xl overflow-hidden border bg-card/55 shadow-sm ${
        isWriter ? "border-primary/25 ring-1 ring-primary/10" : "border-border/40"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground leading-tight">
            <span>{isWriter ? "Schrijfinstellingen" : "Geavanceerde instellingen"}</span>
            {isWriter && <span className="rounded-full border border-primary/25 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-primary">compact</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <Chip>{profile.label}</Chip>
            {writer && <Chip>{scrubCount} wis</Chip>}
            {offCount > 0 && <Chip>{offCount} uit</Chip>}
            {overriddenCount > 0 && <Chip>{overriddenCount} drempels</Chip>}
            {writer?.strict && <Chip>strenge cijfers</Chip>}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border/30 bg-background/30">
          <div className="px-4 py-2.5 border-b border-border/30 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
              {isWriter ? (
                <>
                  <Legend tone="scrub">Wis = label</Legend>
                  <Legend tone="mark">Markeer = klik-keuze</Legend>
                  <Legend tone="off">Uit = negeer</Legend>
                </>
              ) : (
                <>
                  <Legend tone="scrub">Streng = sneller vervangen</Legend>
                  <Legend tone="mark">Standaard = aanbevolen</Legend>
                  <Legend tone="off">Uit = niet scannen</Legend>
                </>
              )}
            </div>
            <div className="inline-flex items-center rounded-full border border-border/50 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setExpert(false)}
                className={`px-2.5 py-1 rounded-full transition-colors ${!expert ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Basis
              </button>
              <button
                type="button"
                onClick={() => setExpert(true)}
                className={`px-2.5 py-1 rounded-full transition-colors ${expert ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Tech
              </button>
            </div>
          </div>

          {expert && (
            <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-amber-400/35 bg-amber-400/10 text-amber-200 px-2.5 py-2 text-[11px] leading-snug">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>Tech-modus toont drempels en modelintegriteit. Lager = strenger, hoger = laat meer staan.</div>
            </div>
          )}

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none bg-transparent border-b border-border/30 px-2 h-auto p-0 gap-0 overflow-x-auto">
              {([
                ...(isWriter ? [{ v: "detectors", icon: Filter, label: "Schrijven" }] : []),
                { v: "profile", icon: Layers, label: "Profiel" },
                { v: "thresholds", icon: Gauge, label: "Drempels" },
                ...(!isWriter ? [{ v: "detectors", icon: Filter, label: "Detectoren" }] : []),
                { v: "models", icon: Cpu, label: "Modellen" },
              ] as Array<{ v: string; icon: typeof Layers; label: string }>).map(({ v, icon: Icon, label }) => (
                <TabsTrigger
                  key={v}
                  value={v}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-3 py-2 text-xs font-medium text-muted-foreground gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="profile" className="p-3 m-0 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(PIPELINE_PROFILES).map((p) => {
                  const enabled = RELEASE_1_PROFILES.includes(p.id);
                  const active = p.id === profileId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!enabled}
                      onClick={() => enabled && onProfileChange(p.id)}
                      className={`text-left rounded-lg border p-2.5 transition-all ${
                        active ? "border-primary bg-primary/5" : "border-border/40 hover:border-border hover:bg-accent/30"
                      } ${!enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-medium ${active ? "text-primary" : "text-foreground"}`}>{PROFILE_SHORT_LABEL[p.id] ?? p.label}</span>
                        {active && <span className="text-[9px] uppercase tracking-wider text-primary font-semibold">actief</span>}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{PROFILE_SHORT_DESC[p.id] ?? p.description}</p>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="thresholds" className="p-3 m-0 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground leading-snug">Drempels bepalen hoe snel PiM een tekst blokkeert of waarschuwt.</p>
                {overriddenCount > 0 && (
                  <button type="button" onClick={onResetThresholds} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent/40 shrink-0">
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TUNEABLE.map((a) => {
                  const def = DEFAULT_ANON_THRESHOLDS[a];
                  const val = thresholds[a] ?? def;
                  const isOverride = thresholds[a] !== undefined && thresholds[a] !== def;
                  const lvl = levelFor(val, def);
                  const strictVal = clampThreshold(def + STRICT_OFFSET);
                  const relaxedVal = clampThreshold(def + RELAXED_OFFSET);
                  return (
                    <div key={a} className="rounded-lg border border-border/40 p-2 space-y-1.5 bg-background/25">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">{ACTION_LABELS[a]}</div>
                          {ACTION_HINT[a] && <div className="text-[10px] text-muted-foreground truncate">{ACTION_HINT[a]}</div>}
                        </div>
                        <span className={`text-[10px] shrink-0 ${isOverride ? "text-primary font-medium" : "text-muted-foreground"}`}>{expert ? val.toFixed(2) : LEVEL_HINT[lvl]}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: "strict", label: "Streng", v: strictVal },
                          { id: "default", label: "Std", v: def },
                          { id: "relaxed", label: "Soepel", v: relaxedVal },
                        ].map((b) => {
                          const active = lvl === b.id;
                          return (
                            <button key={b.id} type="button" onClick={() => onThresholdChange(a, b.v)} className={`rounded-md border px-1.5 py-1 text-[10px] font-medium transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/30"}`}>{b.label}</button>
                          );
                        })}
                      </div>
                      {expert && (
                        <div className="pt-1">
                          <Slider min={0} max={1} step={0.01} value={[val]} onValueChange={([v]) => onThresholdChange(a, v)} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="detectors" className="p-3 m-0 space-y-3">
              {writer && (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-stretch">
                  <button
                    type="button"
                    onClick={() => writer.onStrictChange(!writer.strict)}
                    aria-pressed={writer.strict}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${writer.strict ? "border-amber-400/50 bg-amber-400/10" : "border-border/50 bg-background/25 hover:bg-accent/30"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">Strenge cijfercontrole</span>
                      <span className={`text-[10px] uppercase tracking-wider ${writer.strict ? "text-amber-200" : "text-muted-foreground"}`}>{writer.strict ? "aan" : "uit"}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">BSN, IBAN, kenteken en leerling-ID alleen bij geldige context.</div>
                  </button>
                  {offCount > 0 && (
                    <button type="button" onClick={onResetCategories} className="rounded-lg border border-border/50 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent/30 inline-flex items-center justify-center gap-1">
                      <RotateCcw className="h-3 w-3" /> Alles scannen
                    </button>
                  )}
                </div>
              )}

              {!writer && (
                <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 text-rose-200/90 px-2.5 py-1.5 text-[11px] leading-snug">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div className="flex-1"><span className="font-medium">Uit = PiM ziet die categorie niet meer.</span> Alleen gebruiken voor demo of false-positive debug.</div>
                  {offCount > 0 && <button type="button" onClick={onResetCategories} className="text-[11px] text-rose-100 hover:text-white px-2 py-1 rounded hover:bg-rose-500/20 shrink-0">Alles aan</button>}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {CATEGORY_SECTIONS.map((section) => (
                  <div key={section.label} className="rounded-xl border border-border/40 bg-background/25 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2 px-1">{section.label}</div>
                    <div className={writer ? "grid grid-cols-1 sm:grid-cols-2 gap-1.5" : "space-y-1"}>
                      {section.cats.map((cat) => {
                        const off = disabledCategories.has(cat);
                        const example = CATEGORY_EXAMPLE[cat];
                        return (
                          <label key={cat} className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 cursor-pointer transition-colors ${off ? "border-rose-500/25 bg-rose-500/5" : "border-border/30 hover:bg-accent/25"}`} title={example}>
                            <div className="min-w-0">
                              <span className={`block text-[11px] font-medium truncate ${off ? "text-rose-200" : "text-foreground"}`}>{CATEGORY_LABELS[cat] ?? cat}</span>
                              {!writer && example && <div className="text-[10px] text-muted-foreground/70 truncate">{example}</div>}
                            </div>
                            {writer ? (
                              <CategoryTriToggle
                                mode={off ? "off" : writer.autoRedact.has(cat) ? "scrub" : "mark"}
                                onChange={(m) => {
                                  const currentlyOff = off;
                                  if (m === "off" && !currentlyOff) onToggleCategory(cat);
                                  else if (m !== "off" && currentlyOff) onToggleCategory(cat);
                                  writer.onAutoRedactChange(cat, m === "scrub");
                                }}
                              />
                            ) : (
                              <Switch checked={!off} onCheckedChange={() => onToggleCategory(cat)} aria-label={CATEGORY_LABELS[cat] ?? cat} />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="models" className="p-3 m-0 space-y-3">
              {ner && ner.available && (
                <div className="space-y-2">
                  <NerToggleRow status={ner.status} onStart={ner.onStart} />
                  <NerVariantPicker tone="light" onChange={() => { if (ner.status?.ready || ner.status?.loading) ner.onStart(); }} />
                </div>
              )}
              {expert ? (
                <IntegrityList integrity={integrity} />
              ) : (
                <p className="text-[11px] text-muted-foreground">Modeldetails staan onder Tech. Normaal hoef je hier niets te doen.</p>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border/50 px-1.5 py-0.5 bg-background/35">{children}</span>;
}

function Legend({ tone, children }: { tone: "scrub" | "mark" | "off"; children: React.ReactNode }) {
  const cls = tone === "scrub"
    ? "border-emerald-400/35 text-emerald-200 bg-emerald-400/10"
    : tone === "mark"
      ? "border-amber-400/35 text-amber-200 bg-amber-400/10"
      : "border-rose-400/35 text-rose-200 bg-rose-400/10";
  return <span className={`rounded-full border px-2 py-0.5 ${cls}`}>{children}</span>;
}

function CategoryTriToggle({
  mode, onChange,
}: {
  mode: "off" | "mark" | "scrub";
  onChange: (m: "off" | "mark" | "scrub") => void;
}) {
  const opts: { v: "off" | "mark" | "scrub"; label: string }[] = [
    { v: "off", label: "Uit" },
    { v: "mark", label: "Markeer" },
    { v: "scrub", label: "Wis" },
  ];
  const activeTone = {
    off: "bg-rose-500/20 text-rose-100 border-rose-400/45",
    mark: "bg-amber-400/15 text-amber-100 border-amber-400/45",
    scrub: "bg-emerald-400/15 text-emerald-100 border-emerald-400/45",
  } as const;
  return (
    <div className="shrink-0 inline-grid grid-cols-3 rounded-md border border-border/50 bg-background/45 p-0.5 gap-0.5">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={(e) => { e.preventDefault(); onChange(o.v); }}
          aria-pressed={mode === o.v}
          className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors border ${
            mode === o.v ? activeTone[o.v] : "border-transparent text-muted-foreground hover:bg-accent/30"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function NerToggleRow({ status, onStart }: { status: NerStatus | null; onStart: () => void }) {
  const kind = status?.error ? "error" : status?.ready ? "ready" : status?.loading ? "loading" : "idle";
  const rawPct = status?.progress?.pct;
  const pct = typeof rawPct === "number" ? Math.round(rawPct <= 1 ? rawPct * 100 : rawPct) : undefined;
  const sub =
    kind === "ready" ? "Actief — vindt ook namen die regels missen"
    : kind === "loading" ? (typeof pct === "number" ? `Downloaden… ${pct}%` : "Model downloaden…")
    : kind === "error" ? "Laden mislukt"
    : "Lokaal naam-model (~100 MB), eenmalige download";
  const label = kind === "ready" ? "Aan" : kind === "loading" ? "Bezig" : kind === "error" ? "Opnieuw" : "Aanzetten";
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background/30 px-2.5 py-2">
      <div className="min-w-0">
        <div className="text-xs font-medium text-foreground">Naamherkenning</div>
        <div className="text-[11px] text-muted-foreground leading-snug">{sub}</div>
      </div>
      <button type="button" onClick={onStart} disabled={kind === "ready" || kind === "loading"} className="shrink-0 h-7 px-2 rounded-md border border-border/60 text-[11px] hover:bg-accent/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {label}
      </button>
    </div>
  );
}

function IntegrityList({ integrity }: { integrity: ModelIntegrityRecord[] }) {
  if (integrity.length === 0) return <p className="text-xs text-muted-foreground">Nog geen modellen gecheckt.</p>;
  return (
    <ul className="space-y-1.5">
      {integrity.map((r, i) => {
        const display = integrityDisplay(r);
        const Icon = display.ok ? ShieldCheck : ShieldAlert;
        return (
          <li key={i} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 ${display.tone}`}>
            <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${display.icon}`} />
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground truncate">{r.modelId}</div>
              <div className="text-[11px] text-muted-foreground">{display.label} · {display.message}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function integrityDisplay(r: ModelIntegrityRecord): { ok: boolean; label: string; message: string; tone: string; icon: string } {
  if (r.status === "verified") {
    return { ok: true, label: "Gepind", message: r.message, tone: "border-emerald-500/25 bg-emerald-500/5", icon: "text-emerald-500" };
  }
  if (r.status === "placeholder") {
    return { ok: false, label: "Ontwerpmodel", message: "niet actief voor gewone egress", tone: "border-amber-400/25 bg-amber-400/5", icon: "text-amber-400" };
  }
  return { ok: false, label: r.status, message: r.message, tone: "border-rose-500/25 bg-rose-500/5", icon: "text-rose-500" };
}
