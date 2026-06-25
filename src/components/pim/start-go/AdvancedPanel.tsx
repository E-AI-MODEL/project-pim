import { useEffect, useRef, useState } from "react";
import { ChevronDown, RotateCcw, SlidersHorizontal, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { NerVariantPicker } from "./NerVariantPicker";
import {
  DEFAULT_ANON_THRESHOLDS,
  DETECTION_LAYER_COPY,
  type Action,
  type DetectionLayerSettings,
  type ModelIntegrityRecord,
  type PiiCategory,
  type NerStatus,
} from "@/lib/pim";

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
  id_document: "Documentnummer", url: "URL", ip_address: "IP-adres", social_handle: "Social handle",
  context_small_group: "Kleine groep", context_care: "Zorg", context_incident: "Incident",
  context_role: "Rol", context_health: "Gezondheid", context_family: "Gezin",
  context_legal: "Juridisch", context_financial: "Financieel",
  context_protected_class: "Bijzondere categorie", context_performance: "Prestatie",
  context_location_specific: "Specifieke locatie",
};

export interface AdvancedPanelProps {
  detectionSettings: DetectionLayerSettings;
  onDetectionSettingsChange: (settings: DetectionLayerSettings) => void;
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
  detectionSettings, onDetectionSettingsChange, thresholds, onThresholdChange, onResetThresholds,
  integrity, disabledCategories, onToggleCategory, onResetCategories, writer, ner,
}: AdvancedPanelProps) {
  const isWriter = !!writer;
  const [open, setOpen] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    };
    window.addEventListener("pim:open-advanced", onOpen);
    return () => window.removeEventListener("pim:open-advanced", onOpen);
  }, []);

  const overriddenCount = Object.keys(thresholds).filter((a) => thresholds[a as Action] !== DEFAULT_ANON_THRESHOLDS[a as Action]).length;
  const offCount = disabledCategories.size;
  const scrubCount = writer ? writer.autoRedact.size : 0;

  const updateSettings = (patch: Partial<DetectionLayerSettings>) => {
    onDetectionSettingsChange({ ...detectionSettings, ...patch, regex: true });
  };

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
          <div className="text-sm font-medium text-foreground leading-tight">
            {isWriter ? "Als PiM iets vindt" : "Zoeken"}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <Chip>Regex aan</Chip>
            {detectionSettings.lexicon && <Chip>Lexicon</Chip>}
            {detectionSettings.context && <Chip>Context</Chip>}
            <Chip>{detectionSettings.bert === "off" ? "BERT uit" : detectionSettings.bert === "100mb" ? "BERT 100 MB" : "BERT 180 MB"}</Chip>
            {writer && <Chip>{scrubCount} wis</Chip>}
            {offCount > 0 && <Chip>{offCount} technisch uit</Chip>}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-border/30 bg-background/30 p-4 space-y-4">
          {isWriter ? (
            <WriterActions writer={writer} />
          ) : (
            <LayerSettings settings={detectionSettings} updateSettings={updateSettings} ner={ner} />
          )}

          <div className="rounded-xl border border-border/40 bg-background/25 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-foreground">Technische instellingen</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Alleen nodig voor debug. Uit betekent: PiM zoekt die categorie niet meer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTechnical((v) => !v)}
                className="rounded-md border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent/30"
              >
                {showTechnical ? "Verberg" : "Toon"}
              </button>
            </div>

            {showTechnical && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-lg border border-amber-400/35 bg-amber-400/10 text-amber-200 px-2.5 py-2 text-[11px] leading-snug">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div>Gebruik dit alleen voor testen. Markeer is veiliger dan Uit.</div>
                </div>
                {offCount > 0 && (
                  <button type="button" onClick={onResetCategories} className="rounded-lg border border-border/50 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent/30 inline-flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Alles weer zoeken
                  </button>
                )}
                <CategoryToggles disabledCategories={disabledCategories} onToggleCategory={onToggleCategory} />
                {overriddenCount > 0 && (
                  <button type="button" onClick={onResetThresholds} className="rounded-lg border border-border/50 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent/30 inline-flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" /> Drempels resetten
                  </button>
                )}
                <IntegrityList integrity={integrity} />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function LayerSettings({
  settings, updateSettings, ner,
}: {
  settings: DetectionLayerSettings;
  updateSettings: (patch: Partial<DetectionLayerSettings>) => void;
  ner?: AdvancedPanelProps["ner"];
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <LayerCard title={DETECTION_LAYER_COPY.regex.title} description={DETECTION_LAYER_COPY.regex.description} status="aan" />
      <LayerCard title={DETECTION_LAYER_COPY.lexicon.title} description={DETECTION_LAYER_COPY.lexicon.description} status={settings.lexicon ? "aan" : "uit"}>
        <Switch checked={settings.lexicon} onCheckedChange={(v) => updateSettings({ lexicon: v })} aria-label="Lexicon" />
      </LayerCard>
      <LayerCard title={DETECTION_LAYER_COPY.context.title} description={DETECTION_LAYER_COPY.context.description} status={settings.context ? "aan" : "uit"}>
        <Switch checked={settings.context} onCheckedChange={(v) => updateSettings({ context: v })} aria-label="Context" />
      </LayerCard>
      <LayerCard title="BERT" description="Kies één lokaal taalmodel. Wisselen zet Regex, Lexicon en Context niet uit." status={settings.bert === "off" ? "uit" : settings.bert === "100mb" ? "100 MB" : "180 MB"}>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {(["off", "100mb", "180mb"] as const).map((v) => (
            <button key={v} type="button" onClick={() => updateSettings({ bert: v })} className={`rounded-md border px-2 py-1 text-[11px] ${settings.bert === v ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:bg-accent/30"}`}>
              {v === "off" ? "Uit" : v === "100mb" ? "100 MB" : "180 MB"}
            </button>
          ))}
        </div>
      </LayerCard>
      {ner && settings.bert !== "off" && (
        <div className="space-y-2">
          <NerVariantPicker tone="light" onChange={() => { if (ner.status?.ready || ner.status?.loading) ner.onStart(); }} />
          <button type="button" onClick={ner.onStart} disabled={ner.status?.loading || ner.status?.working} className="rounded-md border border-border/60 px-3 py-2 text-xs hover:bg-accent/30 disabled:opacity-50">
            {ner.status?.loading ? "BERT laden/testen…" : ner.status?.working ? "BERT werkt" : "BERT laden en testen"}
          </button>
          {(ner.status?.healthError || ner.status?.error) && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-200 break-words">
              {ner.status.healthError ?? ner.status.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WriterActions({ writer }: { writer: NonNullable<AdvancedPanelProps["writer"]> }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/25 p-3 space-y-3">
      <div>
        <div className="text-xs font-semibold text-foreground">Als PiM iets vindt</div>
        <p className="text-[11px] text-muted-foreground mt-0.5">Kies per soort gegeven: automatisch wissen of alleen markeren.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {CATEGORY_SECTIONS.map((section) => (
          <div key={section.label} className="rounded-xl border border-border/40 bg-background/25 p-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2 px-1">{section.label}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {section.cats.map((cat) => {
                const scrub = writer.autoRedact.has(cat);
                return (
                  <div key={cat} className="flex items-center justify-between gap-2 rounded-lg border border-border/30 px-2 py-1.5">
                    <span className="block text-[11px] font-medium truncate text-foreground">{CATEGORY_LABELS[cat] ?? cat}</span>
                    <div className="inline-flex rounded-md border border-border/50 bg-background/45 p-0.5 gap-0.5">
                      <button type="button" onClick={() => writer.onAutoRedactChange(cat, true)} className={`rounded px-1.5 py-0.5 text-[9px] font-medium border ${scrub ? "bg-emerald-400/15 text-emerald-100 border-emerald-400/45" : "border-transparent text-muted-foreground hover:bg-accent/30"}`}>Wis</button>
                      <button type="button" onClick={() => writer.onAutoRedactChange(cat, false)} className={`rounded px-1.5 py-0.5 text-[9px] font-medium border ${!scrub ? "bg-amber-400/15 text-amber-100 border-amber-400/45" : "border-transparent text-muted-foreground hover:bg-accent/30"}`}>Markeer</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => writer.onStrictChange(!writer.strict)} className={`rounded-lg border px-3 py-2 text-left transition-colors ${writer.strict ? "border-amber-400/50 bg-amber-400/10" : "border-border/50 bg-background/25 hover:bg-accent/30"}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground">Strenge cijfercontrole</span>
          <span className={`text-[10px] uppercase tracking-wider ${writer.strict ? "text-amber-200" : "text-muted-foreground"}`}>{writer.strict ? "aan" : "uit"}</span>
        </div>
      </button>
    </div>
  );
}

function LayerCard({ title, description, status, children }: { title: string; description: string; status: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/25 p-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className="rounded-full border border-border/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">{status}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{description}</p>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

function CategoryToggles({ disabledCategories, onToggleCategory }: { disabledCategories: ReadonlySet<PiiCategory>; onToggleCategory: (cat: PiiCategory) => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {CATEGORY_SECTIONS.map((section) => (
        <div key={section.label} className="rounded-xl border border-border/40 bg-background/25 p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2 px-1">{section.label}</div>
          <div className="space-y-1">
            {section.cats.map((cat) => {
              const off = disabledCategories.has(cat);
              return (
                <label key={cat} className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 cursor-pointer transition-colors ${off ? "border-rose-500/25 bg-rose-500/5" : "border-border/30 hover:bg-accent/25"}`}>
                  <span className={`block text-[11px] font-medium truncate ${off ? "text-rose-200" : "text-foreground"}`}>{CATEGORY_LABELS[cat] ?? cat}</span>
                  <Switch checked={!off} onCheckedChange={() => onToggleCategory(cat)} aria-label={CATEGORY_LABELS[cat] ?? cat} />
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function IntegrityList({ integrity }: { integrity: ModelIntegrityRecord[] }) {
  if (integrity.length === 0) return <p className="text-xs text-muted-foreground">Nog geen modelchecks.</p>;
  return (
    <ul className="space-y-1.5">
      {integrity.map((r) => (
        <li key={r.key} className="flex justify-between gap-2 font-plex-mono text-[11px] rounded border border-border/30 px-2 py-1">
          <span className="text-muted-foreground truncate">{r.key}</span>
          <span>{r.status}</span>
        </li>
      ))}
    </ul>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border/50 px-1.5 py-0.5 bg-background/35">{children}</span>;
}
