// Strict-mode validators — verlagen false positives op identifier-detectors.

/** BSN-elfproef (NL). 9 cijfers; sum(d[i]*w[i]) mod 11 == 0 met w = [9..2,-1]. */
export function isValidBsn(raw: string): boolean {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 9) return false;
  const w = [9, 8, 7, 6, 5, 4, 3, 2, -1];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (d.charCodeAt(i) - 48) * w[i];
  return sum % 11 === 0;
}

/** IBAN mod-97 controle (ISO 13616). */
export function isValidIban(raw: string): boolean {
  const s = raw.replace(/\s+/g, "").toUpperCase();
  if (s.length < 15 || s.length > 34) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    let v: number;
    if (code >= 48 && code <= 57) v = code - 48;
    else if (code >= 65 && code <= 90) v = code - 55;
    else return false;
    // mod 97 op een string met >9 cijfers stuk-voor-stuk
    if (v < 10) {
      remainder = (remainder * 10 + v) % 97;
    } else {
      remainder = (remainder * 100 + v) % 97;
    }
  }
  return remainder === 1;
}

// Leerlingnummer/studentnummer heeft géén wiskundige checksum (het is een vrij
// toegekend nummer). In strict-modus eisen we daarom CONTEXT: een 6–8-cijferig
// getal telt alleen als leerlingnummer wanneer er vlakbij een trefwoord staat.
// Zo verdwijnen willekeurige getallen (jaartallen, bedragen, codes) als FP.
const STUDENT_ID_CONTEXT = /(?:leerling(?:nummer|-?id)?|lln\.?|studentnummer|student-?id|inschrijfnummer|onderwijsnummer|pgn)/i;

export function hasStudentIdContext(plain: string, start: number, end: number): boolean {
  const before = plain.slice(Math.max(0, start - 40), start);
  const after = plain.slice(end, Math.min(plain.length, end + 20));
  return STUDENT_ID_CONTEXT.test(before) || STUDENT_ID_CONTEXT.test(after);
}

/** Kenteken-formaat (NL sidecodes 1–10, ruw). */
const PLATE_VALID = /^(?:[A-Z]{2}-\d{2}-\d{2}|\d{2}-[A-Z]{2}-\d{2}|\d{2}-\d{2}-[A-Z]{2}|[A-Z]{2}-\d{2}-[A-Z]{2}|\d{2}-[A-Z]{2}-[A-Z]{2}|[A-Z]{2}-[A-Z]{2}-\d{2}|\d-[A-Z]{3}-\d{2}|[A-Z]{3}-\d{2}-[A-Z]|\d{2}-[A-Z]{3}-\d|[A-Z]-\d{3}-[A-Z]{2})$/;
export function isValidLicensePlate(raw: string): boolean {
  return PLATE_VALID.test(raw.toUpperCase());
}