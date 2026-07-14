import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_ANON_THRESHOLDS,
  DETECTION_LAYER_COPY,
  setNerVariant,
  type Action,
  type DetectionLayerSettings,
  type ModelIntegrityRecord,
  type NerStatus,
  type PiiCategory,
} from "@/lib/pim";

const CATEGORY_SECTIONS: { label: string; cats: PiiCategory[] }[] = [
  {
    label: "Identiteit",
    cats: ["name", "bsn", "student_id", "id_document", "birthdate_text", "date"],
  },
  { label: "Contact", cats: ["email", "phone", "url", "social_handle", "ip_address"] },
  { label: "Financieel", cats: ["iban", "credit_card"] },
  {
    label: "Locatie & school",
    cats: ["postcode", "address", "school", "class_code", "license_plate"],
  },
  {
    label: "Context",
    cats: [
      "context_small_group",
      "context_care",
      "context_incident",
      "context_role",
      "context_health",
      "context_family",
      "context_legal",
      "context_financial",
      "context_protected_class",
      "context_performance",
      "context_location_specific",
    ],
  },
];

const CATEGORY_LABELS: Partial<Record<PiiCategory, string>> = {
  email: "E-mail",
  phone: "Telefoon",
  bsn: "BSN",
  iban: "IBAN",
  credit_card: "Creditcard",
  postcode: "Postcode",
  address: "Adres",
  name: "Naam",
  school: "School",
  date: "Datum",
  birthdate_text: "Geboortedatum",
  student_id: "Leerling-ID",
  class_code: "Klascode",
  license_plate: "Kenteken",
  id_document: "Documentnummer",
  url: "URL",
  ip_address: "IP-adres",
  social_handle: "Social handle",
  context_small_group: "Kleine groep",
  context_care: "Zorg",
  context_incident: "Incident",
  context_role: "Rol",
  context_health: "Gezondheid",
  context_family: "Gezin",
  context_legal: "Juridisch",
  context_financial: "Financieel",
  context_protected_class: "Bijzondere categorie",
  context_performance: "Prestatie",
  context_location_specific: "Specifieke locatie",
};

type BertChoice = DetectionLayerSettings["bert"];

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
  ner?: { status: NerStatus | null; onStart: () => void; available: boolean };
}

export function AdvancedPanel({
  detectionSettings,
  onDetectionSettingsChange,
  thresholds,
  onThresholdChange,
  onResetThresholds,
  integrity,
  disabledCategories,
  onToggleCategory,
  onResetCategories,
  writer,
  ner,
}: AdvancedPanelProps) {
  const isWriter = !!writer;
  const [open, setOpen] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setTimeout(
        () => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        50,
      );
    };
    window.addEventListener("pim:open-advanced", onOpen);
    return () => window.removeEventListener("pim:open-advanced", onOpen);
  }, []);

  const overriddenCount = Object.keys(thresholds).filter(
    (a) => thresholds[a as Action] !== DEFAULT_ANON_THRESHOLDS[a as Action],
  ).length;
  const offCount = disabledCategories.size;
  const scrubCount = writer ? writer.autoRedact.size : 0;

  const updateSettings = (patch: Partial<DetectionLayerSettings>) => {
    onDetectionSettingsChange({ ...detectionSettings, ...patch, regex: true });
  };

  return (
    <section
      ref={sectionRef}
      className={`scroll-mt-20 overflow-hidden rounded-[1.75rem] border bg-[#0b1f36]/92 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur ${isWriter ? "border-cyan-400/30 ring-1 ring-cyan-400/15" : "border-white/10"}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.035]"
      >
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/35 bg-cyan-400/10 shadow-[inset_0_0_20px_rgba(34,211,238,0.08)]">
          <SlidersHorizontal className="h-5 w-5 text-cyan-300" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold leading-tight text-[#eef6ff]">
            {isWriter ? "Als PiM iets vindt" : "Zoeken"}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300/85">
            <Chip>Regex aan</Chip>
            {detectionSettings.lexicon && <Chip>Lexicon</Chip>}
            {detectionSettings.context && <Chip>Context</Chip>}
            <Chip>{bertLabel(detectionSettings.bert)}</Chip>
            {writer && <Chip>{scrubCount}× Wis</Chip>}
            {offCount > 0 && <Chip>{offCount} technisch uit</Chip>}
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-300/75 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-white/10 bg-[#07192d]/62 p-4 sm:p-5 space-y-4">
          {isWriter ? (
            <WriterActions writer={writer} />
          ) : (
            <LayerSettings settings={detectionSettings} updateSettings={updateSettings} ner={ner} />
          )}

          <div className="rounded-2xl border border-white/8 bg-[#07182a]/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[#eef6ff]">Technische instellingen</div>
                <p className="mt-1 text-xs text-slate-300/72">
                  Alleen voor debug. Uit betekent: PiM zoekt die categorie niet meer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTechnical((v) => !v)}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.06]"
              >
                {showTechnical ? "Verberg" : "Toon"}
              </button>
            </div>

            {showTechnical && (
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2.5 text-xs leading-snug text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>Gebruik dit alleen voor testen. Markeer is veiliger dan Uit.</div>
                </div>
                {offCount > 0 && (
                  <button
                    type="button"
                    onClick={onResetCategories}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.06]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Alles weer zoeken
                  </button>
                )}
                <CategoryToggles
                  disabledCategories={disabledCategories}
                  onToggleCategory={onToggleCategory}
                />
                {overriddenCount > 0 && (
                  <button
                    type="button"
                    onClick={onResetThresholds}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-200 hover:bg-white/[0.06]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Drempels resetten
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
  settings,
  updateSettings,
  ner,
}: {
  settings: DetectionLayerSettings;
  updateSettings: (patch: Partial<DetectionLayerSettings>) => void;
  ner?: AdvancedPanelProps["ner"];
}) {
  const selectBert = (value: BertChoice) => {
    if (value === "100mb") setNerVariant("small");
    if (value === "180mb") setNerVariant("large");
    updateSettings({ bert: value });
  };
  const status = modelStatus(ner?.status, settings.bert);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <LayerCard
          title={DETECTION_LAYER_COPY.regex.title}
          description={DETECTION_LAYER_COPY.regex.description}
          status="Altijd aan"
        />
        <LayerCard
          title={DETECTION_LAYER_COPY.lexicon.title}
          description={DETECTION_LAYER_COPY.lexicon.description}
          status={settings.lexicon ? "Aan" : "Uit"}
        >
          <Switch
            checked={settings.lexicon}
            onCheckedChange={(v) => updateSettings({ lexicon: v })}
            aria-label="Lexicon"
          />
        </LayerCard>
        <LayerCard
          title={DETECTION_LAYER_COPY.context.title}
          description={DETECTION_LAYER_COPY.context.description}
          status={settings.context ? "Aan" : "Uit"}
        >
          <Switch
            checked={settings.context}
            onCheckedChange={(v) => updateSettings({ context: v })}
            aria-label="Context"
          />
        </LayerCard>
      </div>

      <div className="rounded-2xl border border-white/8 bg-[#07182a]/70 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[#eef6ff]">BERT</h3>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${status.className}`}>
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-300/75">
              Lokaal taalmodel dat woorden labelt als persoon, organisatie of plaats. Regex, Lexicon
              en Context blijven aan.
            </p>
          </div>
          {settings.bert !== "off" && ner && (
            <button
              type="button"
              onClick={ner.onStart}
              disabled={ner.status?.loading || ner.status?.working}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ner.status?.loading
                ? "Laden en testen…"
                : ner.status?.working
                  ? "BERT werkt"
                  : "Laden en testen"}
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <BertOption
            value="off"
            selected={settings.bert === "off"}
            title="Uit"
            text="Alleen Regex, Lexicon en Context."
            onClick={selectBert}
          />
          <BertOption
            value="100mb"
            selected={settings.bert === "100mb"}
            title="100 MB"
            text="Sneller en lichter."
            onClick={selectBert}
          />
          <BertOption
            value="180mb"
            selected={settings.bert === "180mb"}
            title="180 MB"
            text="Groter en zwaarder."
            onClick={selectBert}
          />
        </div>

        {(ner?.status?.healthError || ner?.status?.error) && settings.bert !== "off" && (
          <div className="mt-3 rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs text-red-100 break-words">
            {ner.status.healthError ?? ner.status.error}
          </div>
        )}
      </div>
    </div>
  );
}

function BertOption({
  value,
  selected,
  title,
  text,
  onClick,
}: {
  value: BertChoice;
  selected: boolean;
  title: string;
  text: string;
  onClick: (value: BertChoice) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`rounded-2xl border p-3 text-left transition-colors ${selected ? "border-cyan-300/70 bg-cyan-300/14 text-[#eef6ff]" : "border-white/8 bg-white/[0.025] text-slate-300 hover:bg-white/[0.055]"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        {selected && <CheckCircle2 className="h-4 w-4 text-cyan-200" />}
      </div>
      <p className="mt-1 text-xs text-slate-300/70">{text}</p>
    </button>
  );
}

function WriterActions({ writer }: { writer: NonNullable<AdvancedPanelProps["writer"]> }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#07182a]/70 p-4 space-y-4">
      <div>
        <div className="text-sm font-semibold text-[#eef6ff]">Als PiM iets vindt</div>
        <p className="mt-1 text-xs text-slate-300/72">
          Kies per soort gegeven: automatisch wissen of alleen markeren.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {CATEGORY_SECTIONS.map((section) => (
          <div
            key={section.label}
            className="rounded-2xl border border-white/8 bg-white/[0.025] p-3"
          >
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {section.label}
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {section.cats.map((cat) => {
                const scrub = writer.autoRedact.has(cat);
                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-[#07182a]/55 px-2.5 py-2"
                  >
                    <span className="block truncate text-xs font-medium text-slate-100">
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                    <div className="inline-flex rounded-lg border border-white/10 bg-black/12 p-0.5 gap-0.5">
                      <button
                        type="button"
                        onClick={() => writer.onAutoRedactChange(cat, true)}
                        className={`rounded-md px-2 py-1 text-[10px] font-semibold ${scrub ? "bg-emerald-300/18 text-emerald-100" : "text-slate-400 hover:text-slate-100"}`}
                      >
                        Wis
                      </button>
                      <button
                        type="button"
                        onClick={() => writer.onAutoRedactChange(cat, false)}
                        className={`rounded-md px-2 py-1 text-[10px] font-semibold ${!scrub ? "bg-amber-300/18 text-amber-100" : "text-slate-400 hover:text-slate-100"}`}
                      >
                        Markeer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => writer.onStrictChange(!writer.strict)}
        className={`rounded-2xl border px-3 py-2.5 text-left transition-colors ${writer.strict ? "border-amber-300/45 bg-amber-300/10" : "border-white/8 bg-white/[0.025] hover:bg-white/[0.055]"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-100">Strenge cijfercontrole</span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${writer.strict ? "text-amber-100" : "text-slate-400"}`}
          >
            {writer.strict ? "aan" : "uit"}
          </span>
        </div>
      </button>
    </div>
  );
}

function LayerCard({
  title,
  description,
  status,
  children,
}: {
  title: string;
  description: string;
  status: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#07182a]/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#eef6ff]">{title}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.035] px-2 py-0.5 text-[11px] text-slate-300">
              {status}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300/75">{description}</p>
        </div>
        {children && <div className="shrink-0 pt-0.5">{children}</div>}
      </div>
    </div>
  );
}

function CategoryToggles({
  disabledCategories,
  onToggleCategory,
}: {
  disabledCategories: ReadonlySet<PiiCategory>;
  onToggleCategory: (cat: PiiCategory) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {CATEGORY_SECTIONS.map((section) => (
        <div key={section.label} className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
          <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {section.label}
          </div>
          <div className="space-y-1.5">
            {section.cats.map((cat) => {
              const off = disabledCategories.has(cat);
              return (
                <label
                  key={cat}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-2.5 py-2 transition-colors ${off ? "border-rose-400/25 bg-rose-400/8" : "border-white/8 bg-[#07182a]/50 hover:bg-white/[0.055]"}`}
                >
                  <span
                    className={`block truncate text-xs font-medium ${off ? "text-rose-100" : "text-slate-100"}`}
                  >
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
  );
}

function IntegrityList({ integrity }: { integrity: ModelIntegrityRecord[] }) {
  if (integrity.length === 0)
    return <p className="text-xs text-slate-400">Nog geen modelchecks.</p>;
  return (
    <ul className="space-y-1.5">
      {integrity.map((r) => (
        <li
          key={r.key}
          className="flex justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2 font-plex-mono text-[11px]"
        >
          <span className="truncate text-slate-400">{r.key}</span>
          <span className="text-slate-100">{r.status}</span>
        </li>
      ))}
    </ul>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/8 bg-black/14 px-2 py-0.5 shadow-sm">
      {children}
    </span>
  );
}

function bertLabel(value: BertChoice): string {
  if (value === "off") return "BERT uit";
  return value === "100mb" ? "BERT 100 MB" : "BERT 180 MB";
}

function modelStatus(
  status: NerStatus | null | undefined,
  bert: BertChoice,
): { label: string; className: string } {
  if (bert === "off")
    return { label: "Uit", className: "border-white/10 bg-white/[0.035] text-slate-300" };
  if (status?.working)
    return {
      label: "Werkt",
      className: "border-emerald-300/35 bg-emerald-300/12 text-emerald-100",
    };
  if (status?.loading)
    return {
      label: "Laden/testen",
      className: "border-amber-300/35 bg-amber-300/12 text-amber-100",
    };
  if (status?.error || status?.healthError)
    return { label: "Fout", className: "border-red-300/35 bg-red-300/12 text-red-100" };
  return {
    label: `${bert === "100mb" ? "100 MB" : "180 MB"} niet geladen`,
    className: "border-white/10 bg-white/[0.035] text-slate-300",
  };
}
