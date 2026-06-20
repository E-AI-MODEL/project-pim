// Advanced panel — geeft gebruikers sturing over profiel, drempels en toont
// modelintegriteit. Alleen UI; alle beslislogica blijft in src/lib/pim.
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown, RotateCcw, ShieldCheck, ShieldAlert, SlidersHorizontal,
  Layers, Gauge, Filter, Cpu,
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
            {overriddenCount > 0 && ` · ${overriddenCount} drempel${overriddenCount === 1 ? "" : "s"} aangepast`}
            {offCount > 0 && ` · ${offCount} uit`}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border/30">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none bg-transparent border-b border-border/30 px-2 h-auto p-0 gap-0 overflow-x-auto">
              {[
                { v: "profile",    icon: Layers, label: "Profiel" },
                { v: "thresholds", icon: Gauge,  label: "Drempels" },
                { v: "detectors",  icon: Filter, label: "Detectoren" },
                { v: "models",     icon: Cpu,    label: "Modellen" },
              ].map(({ v, icon: Icon, label }) => (
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
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            {/* DREMPELS */}
            <TabsContent value="thresholds" className="p-4 m-0 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-muted-foreground leading-snug">
                  Lager = strenger. Boven de drempel blokkeert PiM de actie.
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
              <div className="space-y-3">
                {TUNEABLE.map((a) => {
                  const def = DEFAULT_ANON_THRESHOLDS[a];
                  const val = thresholds[a] ?? def;
                  const isOverride = thresholds[a] !== undefined && thresholds[a] !== def;
                  return (
                    <div key={a} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-foreground">
                          {ACTION_LABELS[a]}
                        </label>
                        <span className={`text-[11px] tabular-nums ${isOverride ? "text-primary font-medium" : "text-muted-foreground"}`}>
                          {(val * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={1}
                        step={0.01}
                        value={[val]}
                        onValueChange={([v]) => onThresholdChange(a, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* DETECTOREN */}
            <TabsContent value="detectors" className="p-4 m-0 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-muted-foreground leading-snug">
                  Schakel categorieën uit voor demo of debug van false positives.
                </p>
                {offCount > 0 && (
                  <button
                    type="button"
                    onClick={onResetCategories}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent/40 shrink-0"
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
                        return (
                          <label
                            key={cat}
                            className="flex items-center justify-between px-3 py-2 hover:bg-accent/30 cursor-pointer"
                          >
                            <span className={`text-xs ${off ? "text-muted-foreground line-through" : "text-foreground"}`}>
                              {CATEGORY_LABELS[cat] ?? cat}
                            </span>
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

            {/* MODELLEN */}
            <TabsContent value="models" className="p-4 m-0">
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
          </Tabs>
        </div>
      )}
    </section>
  );
}