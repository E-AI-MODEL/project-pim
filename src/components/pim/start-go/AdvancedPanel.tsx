// Advanced panel — geeft gebruikers sturing over profiel, gevoeligheid en
// detectoren. Twee weergaves: Basis (knoppen + uitleg) en Expert (sliders +
// getallen + modellen-tab). Alle beslislogica blijft in src/lib/pim.
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown, RotateCcw, ShieldCheck, ShieldAlert, SlidersHorizontal,
  Layers, Gauge, Filter, Cpu, Info, AlertTriangle,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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

const ACTION_HINT: Partial<Record<Action, string>> = {
  send_external_ai: "ChatGPT, Copilot, Gemini buiten je organisatie.",
  export_file: "Download als .txt, .docx of .pdf.",
  print: "Naar een fysieke of netwerk-printer.",
  copy: "Kopieer naar klembord (Ctrl/⌘+C).",
  share: "Link of bericht delen.",
  save_local: "Opslaan in deze browser of in een bestand.",
  display: "Alleen tonen op dit scherm — niets verstuurd.",
};

// Drie vaste niveaus voor de Basis-modus. "Standaard" = profiel-default.
const STRICT_OFFSET = -0.15;   // strenger dan default
const RELAXED_OFFSET = +0.25;  // soepeler dan default
function clampThreshold(v: number) { return Math.max(0.05, Math.min(0.95, v)); }
function levelFor(value: number, def: number): "strict" | "default" | "relaxed" | "custom" {
  const eps = 0.005;
  if (Math.abs(value - def) < eps) return "default";
  if (Math.abs(value - clampThreshold(def + STRICT_OFFSET)) < eps) return "strict";
  if (Math.abs(value - clampThreshold(def + RELAXED_OFFSET)) < eps) return "relaxed";
  return "custom";
}
const LEVEL_HINT = {
  strict:  "Vervangt direct bij elk signaal — ook twijfelgevallen.",
  default: "Vervangt harde PII direct; twijfel krijg je als keuze.",
  relaxed: "Vervangt alleen overduidelijke treffers, rest blijft staan.",
  custom:  "Eigen instelling.",
} as const;

const TUNEABLE: Action[] = [
  "send_external_ai", "export_file", "print", "copy", "share", "save_local", "display",
];

// Categorieën gegroepeerd op betekenis — zo wordt de lijst scanbaar.
const CATEGORY_SECTIONS: { label: string; cats: PiiCategory[] }[] = [
  {
    label: "Identiteit",
    cats: ["name", "bsn", "student_id", "birthdate_text", "date"],
  },
  {
    label: "Contact",
    cats: ["email", "phone", "url", "social_handle", "ip_address"],
  },
  {
    label: "Financieel",
    cats: ["iban", "credit_card"],
  },
  {
    label: "Locatie & school",
    cats: ["postcode", "address", "school", "class_code", "license_plate"],
  },
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
  url: "URL", ip_address: "IP-adres", social_handle: "Social handle",
  context_small_group: "Kleine groep", context_care: "Zorg",
  context_incident: "Incident", context_role: "Rol", context_health: "Gezondheid",
  context_family: "Gezin", context_legal: "Juridisch",
  context_financial: "Financieel", context_protected_class: "Beschermde klasse",
  context_performance: "Prestatie", context_location_specific: "Specifieke locatie",
};

const CATEGORY_EXAMPLE: Partial<Record<PiiCategory, string>> = {
  bsn: "9-cijferig burgerservicenummer, bv. 123456789",
  iban: "Bankrekening, bv. NL91ABNA0417164300",
  email: "naam@school.nl",
  phone: "06-12345678",
  postcode: "1012 AB",
  name: "Voor- of achternaam (NER-model)",
  date: "12-03-2025 of 12 maart 2025",
  url: "https://...",
  ip_address: "192.168.1.10",
  credit_card: "Creditcardnummer (16 cijfers)",
  license_plate: "Kenteken, bv. 12-AB-34",
};

const PROFILE_WHEN: Partial<Record<PipelineProfileId, string>> = {};

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
  const [tab, setTab] = useState("profile");
  const [expert, setExpert] = useState(false);
  const profile = PIPELINE_PROFILES[profileId];
  const sectionRef = useRef<HTMLElement>(null);

  // Modellen-tab is alleen in Expert beschikbaar — fallback bij toggle.
  useEffect(() => {
    if (!expert && tab === "models") setTab("profile");
  }, [expert, tab]);

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

  return (
    <section
      ref={sectionRef}
      className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden scroll-mt-20"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors"
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground leading-tight">
            Geavanceerde instellingen
          </div>
          <div className="text-[11px] text-muted-foreground leading-snug truncate">
            {profile.label}
            {overriddenCount > 0 && ` · ${overriddenCount} gevoeligheid${overriddenCount === 1 ? "" : "en"} aangepast`}
            {offCount > 0 && ` · ${offCount} uit`}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border/30">
          {/* Korte uitleg + Basis/Expert-toggle */}
          <div className="px-4 pt-3 pb-2 space-y-2 border-b border-border/30">
            <p className="text-[11px] text-muted-foreground leading-snug">
              PiM stopt nooit je tekst. Het <span className="text-foreground font-medium">vervangt</span> harde PII (BSN, e-mail, telefoon, IBAN) direct door een label zoals <code className="text-foreground">[bsn]</code>. Voor twijfelgevallen (namen, context) krijg je een <span className="text-foreground font-medium">keuze</span>: vervangen of laten staan — die keuze-modus werkt pas nadat het NER-model in je browser is gedownload.
            </p>
            <div className="inline-flex items-center rounded-full border border-border/50 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setExpert(false)}
                className={`px-3 py-1 rounded-full transition-colors ${!expert ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Basis
              </button>
              <button
                type="button"
                onClick={() => setExpert(true)}
                className={`px-3 py-1 rounded-full transition-colors ${expert ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Expert
              </button>
            </div>
            {expert && (
              <div className="flex items-start gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 text-amber-200 px-2.5 py-1.5 text-[11px] leading-snug">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">Expert-modus.</span> Je stelt de gevoeligheid handmatig in (0–100). Hoger = PiM laat meer staan, lager = vervangt sneller. Niet zeker? Kies een profiel of klik Standaard.
                </div>
              </div>
            )}
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none bg-transparent border-b border-border/30 px-2 h-auto p-0 gap-0 overflow-x-auto">
              {([
                { v: "profile",    icon: Layers, label: "Profiel" },
                { v: "thresholds", icon: Gauge,  label: "Gevoeligheid" },
                { v: "detectors",  icon: Filter, label: "Detectoren" },
                ...(expert ? [{ v: "models", icon: Cpu, label: "Modellen" }] : []),
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

            {/* PROFIEL */}
            <TabsContent value="profile" className="p-4 m-0 space-y-2">
              <p className="text-xs text-muted-foreground">
                Een profiel bepaalt welke detectoren actief zijn en hoe streng PiM standaard reageert.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {Object.values(PIPELINE_PROFILES).map((p) => {
                  const enabled = RELEASE_1_PROFILES.includes(p.id);
                  const active = p.id === profileId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!enabled}
                      onClick={() => enabled && onProfileChange(p.id)}
                      className={`text-left rounded-lg border p-3 transition-all ${
                        active
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/40 hover:border-border hover:bg-accent/30"
                      } ${!enabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>
                          {p.label}
                        </span>
                        {active && (
                          <span className="text-[9px] uppercase tracking-wider text-primary font-semibold">
                            actief
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">
                        {p.description}
                      </p>
                      {PROFILE_WHEN[p.id] && (
                        <p className="text-[10px] text-muted-foreground/70 mt-1 italic">
                          Wanneer: {PROFILE_WHEN[p.id]}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/60 pt-1">
                Tip: <em>Strikt</em> voor klassenlijsten en oudergesprekken · <em>Gebalanceerd</em> voor dagelijks werk met AI-tools · <em>Soepel</em> voor interne notities en brainstorm.
              </p>
            </TabsContent>

            {/* GEVOELIGHEID */}
            <TabsContent value="thresholds" className="p-4 m-0 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-muted-foreground leading-snug">
                  Bepaal per bestemming hoe snel PiM een gevoelig woord vervangt door een label.
                </p>
                {overriddenCount > 0 && (
                  <button
                    type="button"
                    onClick={onResetThresholds}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent/40 shrink-0"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {TUNEABLE.map((a) => {
                  const def = DEFAULT_ANON_THRESHOLDS[a];
                  const val = thresholds[a] ?? def;
                  const isOverride = thresholds[a] !== undefined && thresholds[a] !== def;
                  const lvl = levelFor(val, def);
                  const strictVal  = clampThreshold(def + STRICT_OFFSET);
                  const relaxedVal = clampThreshold(def + RELAXED_OFFSET);
                  return (
                    <div key={a} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <label className="text-xs font-medium text-foreground">
                            {ACTION_LABELS[a]}
                          </label>
                          {ACTION_HINT[a] && (
                            <div className="text-[10px] text-muted-foreground/80 leading-snug">{ACTION_HINT[a]}</div>
                          )}
                        </div>
                        {expert && (
                          <span className={`text-[11px] tabular-nums shrink-0 ml-2 ${isOverride ? "text-primary font-medium" : "text-muted-foreground"}`}>
                            {val.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {/* 3 grote niveau-knoppen */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "strict",  label: "Streng",     v: strictVal },
                          { id: "default", label: "Standaard",  v: def },
                          { id: "relaxed", label: "Soepel",     v: relaxedVal },
                        ].map((b) => {
                          const active = lvl === b.id;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => onThresholdChange(a, b.v)}
                              className={`rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                                active
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent/30"
                              }`}
                            >
                              {b.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 leading-snug px-0.5">
                        → {LEVEL_HINT[lvl]}
                      </div>
                      {expert && (
                        <div className="pt-1">
                          <Slider
                            min={0}
                            max={1}
                            step={0.01}
                            value={[val]}
                            onValueChange={([v]) => onThresholdChange(a, v)}
                          />
                          <div className="text-[10px] text-muted-foreground/70 mt-1">
                            Gevoeligheid: <span className="text-foreground tabular-nums">{val.toFixed(2)}</span> — PiM vervangt vanaf score {(val * 100).toFixed(0)}/100. Lager = strenger.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* DETECTOREN */}
            <TabsContent value="detectors" className="p-4 m-0 space-y-3">
              <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 text-rose-200/90 px-2.5 py-1.5 text-[11px] leading-snug">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">Uit = PiM ziet die categorie niet meer</span> en vervangt niets in die groep. Alleen doen voor demo of false-positive debug.
                </div>
                {offCount > 0 && (
                  <button
                    type="button"
                    onClick={onResetCategories}
                    className="inline-flex items-center gap-1 text-[11px] text-rose-100 hover:text-white px-2 py-1 rounded hover:bg-rose-500/20 shrink-0"
                  >
                    <RotateCcw className="h-3 w-3" /> Alles aan
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {CATEGORY_SECTIONS.map((section) => (
                  <div key={section.label}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1.5">
                      {section.label}
                    </div>
                    <div className="rounded-lg border border-border/40 divide-y divide-border/30 overflow-hidden">
                      {section.cats.map((cat) => {
                        const off = disabledCategories.has(cat);
                        const example = CATEGORY_EXAMPLE[cat];
                        return (
                          <label
                            key={cat}
                            className="flex items-center justify-between px-3 py-2 hover:bg-accent/30 cursor-pointer gap-2"
                            title={example}
                          >
                            <div className="min-w-0">
                              <span className={`text-xs ${off ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                {CATEGORY_LABELS[cat] ?? cat}
                              </span>
                              {example && (
                                <div className="text-[10px] text-muted-foreground/70 truncate">{example}</div>
                              )}
                            </div>
                            <Switch
                              checked={!off}
                              onCheckedChange={() => onToggleCategory(cat)}
                              aria-label={CATEGORY_LABELS[cat] ?? cat}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* MODELLEN — alleen in Expert */}
            {expert && (
            <TabsContent value="models" className="p-4 m-0">
              <p className="text-[11px] text-muted-foreground leading-snug mb-2">
                Het NER-model is nodig voor de keuze-modus op namen en context. <span className="text-foreground font-medium">'Verified'</span> = exact gematcht op onze hash-lijst (geen tampering). <span className="text-foreground font-medium">'Failed'</span> = niet gebruiken, herlaad de pagina.
              </p>
              {integrity.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nog geen modellen gecheckt.</p>
              ) : (
                <ul className="space-y-1.5">
                  {integrity.map((r, i) => {
                    const ok = r.status === "verified";
                    return (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 rounded-lg border border-border/40 px-3 py-2"
                      >
                        {ok ? (
                          <ShieldCheck className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <ShieldAlert className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">{r.modelId}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {r.status} · {r.message}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>
            )}
          </Tabs>
        </div>
      )}
    </section>
  );
}