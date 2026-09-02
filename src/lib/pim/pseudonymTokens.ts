/** Pseudoniemtokens ([PERSOON_001]) mogen nooit naar een taalmodel, ook lokaal niet. */
export function hasPseudonymTokens(text: string): boolean {
  return /\[[A-Z][A-Z_]*_\d+\]/.test(text);
}
