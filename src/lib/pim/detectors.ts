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
  // Internationale telefoon: +CC met 7–14 cijfers (niet NL — die match hierboven al).
  { id: "rule.phone_intl", category: "phone", regex: /\+(?!31\b)[1-9]\d{0,3}[\s-]?\d(?:[\s-]?\d){6,13}\b/g, confidence: 0.8 },
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
  // Creditcard (Visa/MC/Amex/Discover/JCB style). Confidence niet 1.0 omdat we Luhn niet checken.
  { id: "rule.credit_card", category: "credit_card", regex: /\b(?:\d[ -]?){12,18}\d\b/g, confidence: 0.7 },
  // NL kenteken — diverse sidecodes (AA-12-AA, 12-AAA-1, etc.). Conservatief.
  { id: "rule.license_plate", category: "license_plate", regex: /\b[A-Z]{1,3}-?\d{1,3}-?[A-Z0-9]{1,3}\b/g, confidence: 0.55 },
  // URL (http/https/www).
  { id: "rule.url", category: "url", regex: /\b(?:https?:\/\/|www\.)[^\s<>"']{2,}/gi, confidence: 0.9 },
  // IPv4.
  { id: "rule.ip_address", category: "ip_address", regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b/g, confidence: 0.85 },
  // IPv6 (compact + full). Conservatief: minstens twee `::` of zes hex-groepen.
  { id: "rule.ipv6", category: "ip_address", regex: /\b(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}\b/gi, confidence: 0.75 },
  // Single-name met titel/prefix: "meneer De Vries", "juf Karin", "dhr. Jansen".
  { id: "rule.name_titled", category: "name", regex: /\b(?:meneer|mevrouw|mw\.?|dhr\.?|mevr\.?|meester|juf|meester|dr\.?|prof\.?)\s+(?:[A-Z][a-zà-ÿ]+)(?:\s+(?:van|de|der|den|ten|ter)\s+[A-Z][a-zà-ÿ]+|\s+[A-Z][a-zà-ÿ]+)?/gi, confidence: 0.85 },
  // Naam na introductie-patroon: "ik heet Klaas", "mijn naam is Sanne", "noem mij Jan".
  // Variable-length lookbehind wordt door moderne V8/Safari ondersteund.
  { id: "rule.name_intro", category: "name", regex: /(?<=\b(?:ik heet|mijn naam is|noem (?:mij|me)|ik ben)\s+)[A-Z][a-zà-ÿ]+(?:\s+(?:van|de|der|den|ten|ter)\s+[A-Z][a-zà-ÿ]+|\s+[A-Z][a-zà-ÿ]+)?/g, confidence: 0.8 },
  // Social handle (@user).
  { id: "rule.social_handle", category: "social_handle", regex: /(?<![A-Za-z0-9])@[A-Za-z0-9_]{3,}/g, confidence: 0.75 },
  // Geboortedatum/datum in tekst: "12 januari 1985" — NL maanden.
  { id: "rule.birthdate_text", category: "birthdate_text", regex: /\b\d{1,2}\s+(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{2,4}\b/gi, confidence: 0.8 },
  // Contextual signals (lower confidence, contextual=true)
  { id: "ctx.small_group", category: "context_small_group", regex: /\b(?:groep\s*[1-8]|klas\s*[1-6][a-z]?|brugklas)\b/gi, contextual: true, confidence: 0.5 },
  { id: "ctx.care", category: "context_care", regex: /\b(?:zorgleerling|dyslexie|dyscalculie|adhd|autisme|asperger|pleegzorg|pleeggezin|jeugdzorg|gedragsproblemen|ondersteuningsbehoefte)\b/gi, contextual: true, confidence: 0.7 },
  { id: "ctx.incident", category: "context_incident", regex: /\b(?:incident|schorsing|geschorst|conflict|misbruik|geweld|melding|klacht)\b/gi, contextual: true, confidence: 0.6 },
  { id: "ctx.role", category: "context_role", regex: /\b(?:directeur|conrector|teamleider|intern begeleider|ib'?er|mentor|vertrouwenspersoon)\b/gi, contextual: true, confidence: 0.45 },
  // Gezondheid (geen specifieke diagnose hier — dat zit in ctx.care; deze vangt
  // medicatie/behandeling/therapie). GDPR Art 9.
  { id: "ctx.health", category: "context_health", regex: /\b(?:medicatie|medicijn(?:en)?|ritalin|concerta|antidepressivum|antidepressiva|therapie|psycholoog|psychiater|behandeling|diagnose|ziekte|ziek(?:te)?verzuim|epilep(?:sie|tisch)|chronisch ziek)\b/gi, contextual: true, confidence: 0.8 },
  // Familiesituatie / thuissituatie (verhoogt herleidbaarheid sterk in kleine groep).
  { id: "ctx.family", category: "context_family", regex: /\b(?:gescheiden ouders|echtscheiding|co-?ouderschap|alleenstaande (?:moeder|vader|ouder)|pleeggezin|pleegouders?|stiefvader|stiefmoeder|uithuisplaatsing|voogd(?:ij)?|onder toezicht|OTS)\b/gi, contextual: true, confidence: 0.75 },
  // Justitie / politie.
  { id: "ctx.legal", category: "context_legal", regex: /\b(?:politie|justitie|officier van justitie|reclassering|taakstraf|halt(?:-?afdoening)?|jeugddetentie|aangifte|verdachte|strafblad|veroordeeld|OM-?zitting)\b/gi, contextual: true, confidence: 0.8 },
  // Financieel.
  { id: "ctx.financial", category: "context_financial", regex: /\b(?:uitkering|bijstand|schuldhulpverlening|schulden|armoede|voedselbank|kwijtschelding|kinderbijslag|toeslagen|loon|salaris|inkomen)\b/gi, contextual: true, confidence: 0.65 },
  // GDPR Art 9 — beschermde categorieën (etniciteit, religie, seksuele oriëntatie, politiek).
  { id: "ctx.protected_class", category: "context_protected_class", regex: /\b(?:moslim|islamitisch|jood(?:s|in)?|christelijk|katholiek|protestants|hindoe(?:istisch)?|boeddhist(?:isch)?|atheïst|homo(?:seksueel)?|lesbisch|biseksueel|transgender|trans (?:man|vrouw|persoon)|non-?binair|queer|marokkaans|turks|surinaams|antilliaans|allochtoon|vluchteling|asielzoeker|statushouder|ongedocumenteerd|stemt? (?:pvv|vvd|cda|d66|groenlinks|sp|pvda|fvd))\b/gi, contextual: true, confidence: 0.85 },
  // Schoolprestaties (in combinatie met naam zeer herleidbaar).
  { id: "ctx.performance", category: "context_performance", regex: /\b(?:gezakt|blijven zitten|doublure|doubleert|onvoldoende(?:s)?|cijfer\s+\d(?:[.,]\d)?|gemiddelde\s+\d(?:[.,]\d)?|examen(?:resultaten|cijfers)?|herkans(?:t|en|ing))\b/gi, contextual: true, confidence: 0.45 },
  // Specifieke locatie (lokaal/adres-achtig) — verhoogt herleidbaarheid.
  { id: "ctx.location_specific", category: "context_location_specific", regex: /\b(?:lokaal\s+\d{1,3}[a-z]?|aula|kantine|fietsenstalling|gymzaal|sportveld|schoolplein|teamkamer|docentenkamer)\b/gi, contextual: true, confidence: 0.35 },
];

export function detectPii(text: string, disabledCategories?: ReadonlySet<PiiCategory>): PiiSpan[] {
  const spans: PiiSpan[] = [];
  for (const r of RULES) {
    if (disabledCategories?.has(r.category)) continue;
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
  // Post-filter: Luhn-check op credit_card om false positives (bv. lange
  // willekeurige cijferreeksen of telefoonnummers) eruit te halen.
  const filtered = spans.filter((s) => s.category !== "credit_card" || luhnValid(s.text));
  // Deduplicate overlapping spans — keep highest confidence
  filtered.sort((a, b) => a.start - b.start || b.confidence - a.confidence);
  const merged: PiiSpan[] = [];
  for (const s of filtered) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) {
      if (s.confidence > last.confidence) merged[merged.length - 1] = s;
      continue;
    }
    merged.push(s);
  }
  return merged;
}

function luhnValid(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export const ALL_CATEGORIES: readonly PiiCategory[] = Array.from(new Set(RULES.map((r) => r.category)));
