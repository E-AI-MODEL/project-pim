// Terugzetten van codes naar originele waarden, alleen lokaal en in het geheugen.
//
// Externe AI gaat niet altijd netjes om met codes: kleine letters, weggevallen
// nullen ([LEERLING_1]) of een ontbrekend haakje. Deze functie vangt die
// varianten op, zodat een AI-antwoord betrouwbaar terug te zetten is.
// Codes die wel op een PiM-code lijken maar niet in de sleutel staan, worden
// gemeld en niet aangeraakt.

export interface RestoreResult {
  text: string;
  /** Aantal unieke codes dat is teruggezet. */
  restored: number;
  /** Aantal vervangingen in totaal (een code kan vaker voorkomen). */
  replacements: number;
  /** Codes in de tekst die niet in de sleutel staan. */
  unknown: string[];
}

const TOKEN_SHAPE = /\[?\b([A-Za-z]+(?:_[A-Za-z]+)*)_(\d{1,4})\b\]?/g;

function normalize(category: string, num: string): string {
  return `${category.toUpperCase()}_${Number(num)}`;
}

function parseToken(token: string): string | null {
  const m = /^\[([A-Z]+(?:_[A-Z]+)*)_(\d{1,4})\]$/i.exec(token);
  return m ? normalize(m[1], m[2]) : null;
}

export function restoreTextWithMapping(
  text: string,
  mapping: ReadonlyMap<string, string>,
): RestoreResult {
  const lookup = new Map<string, string>();
  for (const [token, original] of mapping) {
    const key = parseToken(token);
    if (key) lookup.set(key, original);
  }
  const used = new Set<string>();
  const unknown = new Set<string>();
  let replacements = 0;

  const out = text.replace(TOKEN_SHAPE, (match, cat: string, num: string) => {
    const hasBracket = match.startsWith("[") || match.endsWith("]");
    const key = normalize(cat, num);
    const original = lookup.get(key);
    if (original === undefined) {
      // Alleen iets dat duidelijk een code is, telt als onbekend.
      if (hasBracket || /^[A-Z_]+_\d+$/.test(match)) unknown.add(match);
      return match;
    }
    // Zonder haakjes alleen vervangen als het in hoofdletters staat; zo raken
    // gewone woorden met een cijfer erachter niet onbedoeld vervangen.
    if (!hasBracket && cat !== cat.toUpperCase()) return match;
    used.add(key);
    replacements += 1;
    return original;
  });

  return { text: out, restored: used.size, replacements, unknown: [...unknown] };
}
