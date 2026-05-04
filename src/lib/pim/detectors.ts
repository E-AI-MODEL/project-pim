import type { PiiSpan, PiiCategory } from "./types";

interface RuleDef {
  id: string;
  category: PiiCategory;
  regex: RegExp;
  contextual?: boolean;
  confidence?: number;
}

const RULES: RuleDef[] = [
  { id: "rule.email", category: "email", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, confidence: 0.99 },
  { id: "rule.phone", category: "phone", regex: /\b(?:\+31|0)[\s-]?[1-9](?:[\s-]?\d){8}\b/g, confidence: 0.92 },
  { id: "rule.bsn", category: "bsn", regex: /\b\d{9}\b/g, confidence: 0.85 },
  // Leerlingnummer: 6-8 cijfers. Negative lookahead/lookbehind voorkomt overlap met BSN (9) en jaartallen in datums.
  { id: "rule.student_id", category: "student_id", regex: /(?<!\d)\d{6,8}(?!\d)/g, confidence: 0.55 },
  { id: "rule.iban", category: "iban", regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7,16}\b/g, confidence: 0.95 },
  { id: "rule.postcode", category: "postcode", regex: /\b\d{4}\s?[A-Z]{2}\b/g, confidence: 0.9 },
  { id: "rule.date", category: "date", regex: /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g, confidence: 0.7 },
  // Klascode VO (NL): jaar (1-6) + stroom (H/V/M/G/A/T) + optionele letter/cijfer. Bv 4H1, V5B, 3V, 2M, 6Va.
  { id: "rule.class_code", category: "class_code", regex: /\b(?:[1-6][HVMGAT][a-zA-Z]?\d?|[HVMGAT][1-6][a-zA-Z]?)\b/g, contextual: true, confidence: 0.6 },
  // Naive name: capitalised word, not at sentence start. Browser SLM stub.
  { id: "rule.name", category: "name", regex: /\b(?:[A-Z][a-zà-ÿ]{2,})(?:\s+(?:van|de|der|den|ten|ter)\s+[A-Z][a-zà-ÿ]+|\s+[A-Z][a-zà-ÿ]{2,})\b/g, confidence: 0.6 },
  { id: "rule.school", category: "school", regex: /\b(?:basisschool|middelbare school|gymnasium|havo|vwo|vmbo|mbo|hbo)\s+[A-Z][\wà-ÿ]+(?:\s+[A-Z][\wà-ÿ]+)?/gi, confidence: 0.8 },
  { id: "rule.address", category: "address", regex: /\b[A-Z][a-zà-ÿ]+(?:straat|laan|weg|plein|gracht|kade|hof|park)\s+\d{1,4}[a-z]?\b/g, confidence: 0.85 },
  // Contextual signals (lower confidence, contextual=true)
  { id: "ctx.small_group", category: "context_small_group", regex: /\b(?:groep\s*[1-8]|klas\s*[1-6][a-z]?|brugklas)\b/gi, contextual: true, confidence: 0.5 },
  { id: "ctx.care", category: "context_care", regex: /\b(?:zorgleerling|dyslexie|dyscalculie|adhd|autisme|asperger|pleegzorg|pleeggezin|jeugdzorg|gedragsproblemen|ondersteuningsbehoefte)\b/gi, contextual: true, confidence: 0.7 },
  { id: "ctx.incident", category: "context_incident", regex: /\b(?:incident|schorsing|geschorst|conflict|misbruik|geweld|melding|klacht)\b/gi, contextual: true, confidence: 0.6 },
  { id: "ctx.role", category: "context_role", regex: /\b(?:directeur|conrector|teamleider|intern begeleider|ib'?er|mentor|vertrouwenspersoon)\b/gi, contextual: true, confidence: 0.45 },
];

export function detectPii(text: string): PiiSpan[] {
  const spans: PiiSpan[] = [];
  for (const r of RULES) {
    const re = new RegExp(r.regex.source, r.regex.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      spans.push({
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
        category: r.category,
        ruleId: r.id,
        confidence: r.confidence ?? 0.7,
        contextual: !!r.contextual,
      });
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  // Deduplicate overlapping spans — keep highest confidence
  spans.sort((a, b) => a.start - b.start || b.confidence - a.confidence);
  const merged: PiiSpan[] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) {
      if (s.confidence > last.confidence) merged[merged.length - 1] = s;
      continue;
    }
    merged.push(s);
  }
  return merged;
}
