// Renders original text with inline highlights on each PII span.
// Direct PII = rood/oranje; contextueel = amber. Tooltip via native title.
import type { PiiSpan } from "@/lib/pim/types";

const CAT_LABEL: Record<string, string> = {
  email: "e-mail",
  phone: "telefoonnummer",
  bsn: "BSN",
  iban: "IBAN",
  postcode: "postcode",
  name: "naam",
  school: "school",
  date: "datum",
  address: "adres",
  student_id: "leerlingnummer",
  class_code: "klas",
  credit_card: "creditcard",
  license_plate: "kenteken",
  url: "link",
  ip_address: "IP-adres",
  social_handle: "handle",
  birthdate_text: "geboortedatum",
  context_small_group: "kleine groep",
  context_care: "zorgcontext",
  context_incident: "incident",
  context_role: "rol",
  context_health: "gezondheid",
  context_family: "gezinscontext",
  context_legal: "justitie",
  context_financial: "financieel",
  context_protected_class: "bijzondere categorie",
  context_performance: "schoolprestatie",
  context_location_specific: "locatie",
};

interface Props {
  text: string;
  spans: PiiSpan[];
  className?: string;
}

export function TextHighlighter({ text, spans, className }: Props) {
  if (!text) {
    return (
      <div className={`text-xs text-muted-foreground italic ${className ?? ""}`}>Geen tekst.</div>
    );
  }

  // Sort + dedupe overlapping spans (highest confidence wins), same logic als detectors.
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.confidence - a.confidence);
  const merged: PiiSpan[] = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) {
      if (s.confidence > last.confidence) merged[merged.length - 1] = s;
      continue;
    }
    merged.push(s);
  }

  const parts: Array<{ kind: "text" | "span"; text: string; span?: PiiSpan }> = [];
  let cursor = 0;
  for (const s of merged) {
    if (s.start > cursor) parts.push({ kind: "text", text: text.slice(cursor, s.start) });
    parts.push({ kind: "span", text: text.slice(s.start, s.end), span: s });
    cursor = s.end;
  }
  if (cursor < text.length) parts.push({ kind: "text", text: text.slice(cursor) });

  const hasFindings = merged.length > 0;

  return (
    <div className={className}>
      <pre className="rounded-xl border border-[#e5e7ef] bg-white p-4 text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-[40vh] overflow-auto text-[#0f172a]">
        {parts.map((p, i) => {
          if (p.kind === "text") return <span key={i}>{p.text}</span>;
          const s = p.span!;
          const isDirect = !s.contextual;
          const cls = isDirect
            ? "bg-rose-100 text-rose-900 border-b-2 border-rose-400 rounded-sm px-0.5"
            : "bg-amber-100 text-amber-900 border-b-2 border-amber-400 rounded-sm px-0.5";
          const label = CAT_LABEL[s.category] ?? s.category;
          return (
            <mark
              key={i}
              title={`${isDirect ? "Direct" : "Contextueel"} · ${label} · ${(s.confidence * 100).toFixed(0)}% zeker · ${s.ruleId}`}
              className={`${cls} cursor-help`}
            >
              {p.text}
            </mark>
          );
        })}
      </pre>
      {hasFindings && (
        <div className="flex flex-wrap items-center gap-3 mt-2 px-1 text-[10px] text-[#64748b] font-plex-mono">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-rose-100 border-b-2 border-rose-400" />
            direct herleidbaar
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border-b-2 border-amber-400" />
            contextueel
          </span>
          <span className="ml-auto">hover voor details</span>
        </div>
      )}
    </div>
  );
}
