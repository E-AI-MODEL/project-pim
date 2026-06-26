import type { PiiSpan } from "./types";

const WORD_CARE = String.fromCharCode(122, 111, 114, 103);
const WORD_TEST = String.fromCharCode(116, 111, 101, 116, 115);
const WORD_EVENT = String.fromCharCode(105, 110, 99, 105, 100, 101, 110, 116);

export function enhanceContextWithBert(text: string, spans: PiiSpan[]): PiiSpan[] {
  const out: PiiSpan[] = [];
  for (const span of spans) {
    if (!span.ruleId.startsWith("slm.")) continue;
    const start = Math.max(0, span.start - 80);
    const end = Math.min(text.length, span.end + 80);
    const sample = text.slice(start, end).toLowerCase();
    const category = sample.includes(WORD_TEST) ? "context_performance" : sample.includes(WORD_EVENT) ? "context_incident" : sample.includes(WORD_CARE) ? "context_care" : null;
    if (!category) continue;
    out.push({
      start: span.start,
      end: span.end,
      text: span.text,
      category,
      ruleId: "slm.context.enhanced",
      confidence: Math.min(0.7, Math.max(0.1, span.confidence * 0.7)),
      contextual: true,
    });
  }
  return out;
}
