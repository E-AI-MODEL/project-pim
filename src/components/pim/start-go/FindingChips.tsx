import type { PiiSpan } from "@/lib/pim/types";

const CAT_LABEL: Record<string, string> = {
  bsn: "BSN", iban: "IBAN", email: "e-mail", phone: "telefoonnummer",
  postcode: "postcode", address: "adres", name: "naam", school: "school",
  date: "datum", student_id: "leerlingnummer", class_code: "klas",
  context_small_group: "kleine groep", context_care: "zorgcontext",
  context_incident: "incident", context_role: "rol",
};

export function FindingChips({ spans }: { spans: PiiSpan[] }) {
  if (!spans.length) return null;
  const counts = new Map<string, number>();
  for (const s of spans) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  return (
    <div className="flex flex-wrap gap-1.5">
      {[...counts.entries()].map(([cat, n]) => (
        <span key={cat} className="inline-flex items-center gap-1 rounded-md border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-200">
          {CAT_LABEL[cat] ?? cat}{n > 1 ? ` ×${n}` : ""}
        </span>
      ))}
    </div>
  );
}