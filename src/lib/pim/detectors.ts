import type { PiiSpan, PiiCategory } from "./types";

interface RuleDef {
  id: string;
  category: PiiCategory;
  regex: RegExp;
  contextual?: boolean;
  confidence?: number;
}

/**
 * Gedeelde stopwoordenlijst voor de ruime kleine-letter-naamregels.
 * Bewust breed: veelgebruikte school-, werk-, tijd- en functiewoorden mogen
 * nooit als naam worden gemarkeerd. Alle regels die kleine letters toelaten
 * gebruiken deze lijst, zodat de ruis op één plek beheerd wordt.
 */
const NAME_STOP_WORDS = [
  "de","het","een","die","dat","deze","dit","daar","hier","zijn","haar","hun","onze","jullie",
  "mijn","jouw","uw","geen","elke","alle","beide","ook","nog","weer","toen","dan","maar","want",
  "omdat","zodat","terwijl","tijdens","binnen","buiten","zonder","tegen","door","over","onder",
  "naast","achter","voor","niet","wel","heel","erg","zeer","meer","minder","veel","weinig","iets",
  "niets","alles","iemand","niemand","anderen","elkaar","hem","hen","jou","mij","zich",
  "leerling","leerlinge","leerlingen","kind","kinderen","jongen","jongens","meisje","meisjes",
  "docent","docenten","leraar","leraren","mentor","meester","juf","meneer","mevrouw","ouder",
  "ouders","moeder","vader","broer","zus","verzorger","collega","collegas","team","school",
  "klas","groep","les","lessen","toets","toetsen","cijfer","cijfers","rapport","huiswerk",
  "rekenen","lezen","spelling","taal","gedrag","wiskunde","begrijpend","technisch","planning",
  "motivatie","concentratie","aandacht","zorg","respect","succes","resultaat","gesprek",
  "incident","conflict","situatie","afspraak","plan","plek","tijd","dag","dagen","week","weken",
  "maand","jaar","jaren","vandaag","gisteren","morgen","vanmiddag","vanochtend","vanavond",
  "maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag","zondag",
  "januari","februari","maart","april","juni","juli","augustus","september","oktober",
  "november","december","bsn","iban","tel","mail","email","nummer","adres","datum","kvk",
  "aan","met","bij","uit","naar","tot","om","af","te","er","ze","we","je","ik","hij","zij","was",
  "waren","ben","opdracht","opdrachten","later","eerder","straks","daarna","daarvoor","hierover",
  "les","werk","werken","gewerkt","plezier","oefening","oefeningen","boek","bord","plein","zin",
  "goed","beter","slecht","prima","lastig","moeilijk","makkelijk","samen","steeds","vaak","soms",
  "gaat","ging","komt","kwam","heeft","hebben","werd","wordt","kunnen","moeten","willen","zegt",
] as const;

const STOP = NAME_STOP_WORDS.join("|");

/** Bouwt een regex met `{{STOP}}` als plaatshouder voor de stopwoordenlijst. */
function nameRe(source: string, flags: string): RegExp {
  return new RegExp(source.replace(/\{\{STOP\}\}/g, STOP), flags);
}

const RULES: RuleDef[] = [
  {
    id: "rule.email",
    category: "email",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    confidence: 0.99,
  },
  {
    id: "rule.phone",
    category: "phone",
    regex: /\b(?:\+31|0)[\s-]?[1-9](?:[\s-]?\d){8}\b/g,
    confidence: 0.92,
  },
  // Internationale telefoon: +CC met 7-14 cijfers (niet NL, die match hierboven al).
  {
    id: "rule.phone_intl",
    category: "phone",
    regex: /\+(?!31\b)[1-9]\d{0,3}[\s-]?\d(?:[\s-]?\d){6,13}\b/g,
    confidence: 0.8,
  },
  { id: "rule.bsn", category: "bsn", regex: /\b\d{9}\b/g, confidence: 0.85 },
  // Leerlingnummer: 6-8 cijfers zonder context. Negative lookahead/lookbehind
  // voorkomt overlap met BSN (9) en jaartallen in datums.
  {
    id: "rule.student_id",
    category: "student_id",
    regex: /(?<!\d)\d{6,8}(?!\d)/g,
    confidence: 0.55,
  },
  // Leerlingnummer met expliciete context (leerlingnummer 12345, studentnr: 4821, etc).
  // Case-insensitive trefwoord en 4-8 cijfers, ook korte nummers worden herkend.
  {
    id: "rule.student_id_ctx",
    category: "student_id",
    regex:
      /(?<=\b(?:leerling(?:nummer|-?id)?|lln\.?|studentnummer|student-?id|inschrijfnummer|onderwijsnummer|pgn)[\s:#.]{0,4})\d{4,8}\b/gi,
    confidence: 0.92,
  },
  {
    id: "rule.iban",
    category: "iban",
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7,16}\b/g,
    confidence: 0.95,
  },
  // Identiteitsdocument (paspoort/ID-kaart/rijbewijs). Alleen na een trefwoord
  // gematcht (variabele lookbehind) zodat we niet elk 7-10-teken codewoord
  // oppikken. Het trefwoord zelf blijft staan; alleen het nummer wordt PII.
  {
    id: "rule.id_document",
    category: "id_document",
    regex:
      /(?<=\b(?:paspoort(?:[-\s]?nummer)?|identiteitsbewijs|identiteits[-\s]?kaart|id[-\s]?kaart|rijbewijs(?:[-\s]?nummer)?|document[-\s]?nummer)\b[\s:#.]{0,4})[A-Z0-9]{7,10}\b/gi,
    confidence: 0.8,
  },
  { id: "rule.postcode", category: "postcode", regex: /\b\d{4}\s?[A-Z]{2}\b/g, confidence: 0.9 },
  {
    id: "rule.date",
    category: "date",
    regex: /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g,
    confidence: 0.7,
  },
  // ISO-datum (jaar-maand-dag): 2025-03-12. Apart van rule.date, die alleen
  // dag-eerst NL-notatie ving en ISO daardoor compleet miste.
  {
    id: "rule.date_iso",
    category: "date",
    regex: /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g,
    confidence: 0.8,
  },
  // Klascode VO (NL): jaar (1-6) + stroom (H/V/M/G/A/T) + optionele letter/cijfer. Bv 4H1, V5B, 3V, 2M, 6Va.
  {
    id: "rule.class_code",
    category: "class_code",
    regex: /\b(?:[1-6][HVMGAT][a-zA-Z]?\d?|[HVMGAT][1-6][a-zA-Z]?)\b/g,
    contextual: true,
    confidence: 0.6,
  },
  // Naam: voornaam + (tussenvoegsels) + één of twee achternaamdelen.
  // Ondersteunt NL tussenvoegsels ("Emma de Vries") en samengestelde
  // achternamen met hoofdletterdeel ("Youssef El Amrani").
  // Een korte blocklist voorkomt dat een voorafgaand zelfstandig naamwoord
  // ("Leerling Emma de Vries") in de span wordt meegetrokken.
  {
    id: "rule.name",
    category: "name",
    regex:
      /\b(?!(?:Leerling|Leerlinge|Leerlingen|Ouder|Ouders|Docent|Docenten|Mentor|Groep|Klas|School|Meneer|Mevrouw|Juf|Meester|Deze|Onze|Onder)\b)[A-Z][a-zà-ÿ]{2,}(?:\s+(?:van|de|der|den|ten|ter|el|al|bin|ben|di|da|del|op|in)\b)*(?:\s+[A-Z][a-zà-ÿ]+){1,2}\b/g,
    confidence: 0.6,
  },
  {
    id: "rule.school",
    category: "school",
    regex:
      /\b(?:basisschool|middelbare school|gymnasium|havo|vwo|vmbo|mbo|hbo)\s+[A-Z][\wà-ÿ]+(?:\s+[A-Z][\wà-ÿ]+)?/gi,
    confidence: 0.8,
  },
  {
    id: "rule.address",
    category: "address",
    regex: /\b[A-Z][a-zà-ÿ]+(?:straat|laan|weg|plein|gracht|kade|hof|park)\s+\d{1,4}[a-z]?\b/g,
    confidence: 0.85,
  },
  // Creditcard (Visa/MC/Amex/Discover/JCB style). Confidence niet 1.0 omdat we Luhn niet checken.
  {
    id: "rule.credit_card",
    category: "credit_card",
    regex: /\b(?:\d[ -]?){12,18}\d\b/g,
    confidence: 0.7,
  },
  // NL kenteken, diverse sidecodes (AA-12-AA, 12-AAA-1, etc.). Conservatief.
  {
    id: "rule.license_plate",
    category: "license_plate",
    regex: /\b[A-Z]{1,3}-?\d{1,3}-?[A-Z0-9]{1,3}\b/g,
    confidence: 0.55,
  },
  // URL (http/https/www).
  {
    id: "rule.url",
    category: "url",
    regex: /\b(?:https?:\/\/|www\.)[^\s<>"']{2,}/gi,
    confidence: 0.9,
  },
  // IPv4.
  {
    id: "rule.ip_address",
    category: "ip_address",
    regex:
      /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g,

    confidence: 0.85,
  },
  // IPv6 (compact + full). Conservatief: minstens twee `::` of zes hex-groepen.
  {
    id: "rule.ipv6",
    category: "ip_address",
    regex: /\b(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}\b/gi,
    confidence: 0.75,
  },
  // Single-name met titel/prefix: "meneer De Vries", "juf Karin", "dhr. Jansen".
  {
    id: "rule.name_titled",
    category: "name",
    regex:
      /\b(?:meneer|mevrouw|mw\.?|dhr\.?|mevr\.?|meester|juf|meester|dr\.?|prof\.?)\s+(?:[A-Z][a-zà-ÿ]+)(?:\s+(?:van|de|der|den|ten|ter)\s+[A-Z][a-zà-ÿ]+|\s+[A-Z][a-zà-ÿ]+)?/gi,
    confidence: 0.85,
  },
  // Naam na introductie-patroon: "ik heet Klaas", "mijn naam is Sanne", "noem mij Jan".
  // Variable-length lookbehind wordt door moderne V8/Safari ondersteund.
  {
    id: "rule.name_intro",
    category: "name",
    regex:
      /(?<=\b(?:ik heet|mijn naam is|noem (?:mij|me)|ik ben)\s+)[A-Z][a-zà-ÿ]+(?:\s+(?:van|de|der|den|ter|ten)\s+[A-Z][a-zà-ÿ]+|\s+[A-Z][a-zà-ÿ]+)?/g,
    confidence: 0.8,
  },
  // Kleine-letter-namen na een STERKE introductie-cue ("ik heet jan jansen").
  // Bewust zonder "ik ben" (dat geeft "ik ben ziek/moe" als false positive).
  // `i`-flag laat de naam in willekeurige casing toe; merge ontdubbelt overlap
  // met rule.name_intro. Iets lagere confidence dan de hoofdletter-variant.
  {
    id: "rule.name_intro_ci",
    category: "name",
    regex:
      /(?<=\b(?:ik heet|mijn naam is|noem (?:mij|me))\s+)[a-zà-ÿ]{2,}(?:\s+(?:van|de|der|den|ten|ter)\s+[a-zà-ÿ]+|\s+[a-zà-ÿ]{2,})?/gi,
    confidence: 0.7,
  },
  // Lowercase namen na opsommings-triggers ("met jan en piet", "onder andere
  // jacobus en frank"). Bewust smal: alleen na expliciete triggers, minimaal
  // 3 letters, en met een korte stopwoord-blocklist zodat we niet elk woord
  // pakken. Contextueel + lage confidence: PiM markeert, gebruiker beslist.
  {
    id: "rule.name_lower_list",
    category: "name",
    // Alleen kleine letters na de trigger: hoofdletterwoorden zoals "BSN" of
    // "IBAN" zijn geen namen en horen hier niet in.
    regex:
      /(?<=\b(?:[Mm]et|[Ee]n|[Oo]nder\s?andere|[Nn]amelijk|[Zz]oals|[Ww]aaronder|[Tt]ussen)\s+)(?!(?:de|het|een|die|dat|deze|dit|hun|onze|jullie|zijn|haar|mijn|jouw|ouders?|leerling(?:en)?|docent(?:en)?|mentor|meester|juf|meneer|mevrouw|kinderen|leraren|klasgenoten|jongens|meisjes|team|groep|school|klas|bsn|iban|tel|mail|email|nummer|adres|datum|rekenen|lezen|spelling|taal|gedrag|huiswerk|wiskunde|begrijpend|technisch|studievaardigheden|concentratie|planning|motivatie|toets(?:en)?|cijfers?|moeite|elkaar|hem|hen|haar|jou|iemand|niemand|anderen|collega'?s?|betrekking|ingang|nadruk|name|plezier|elkaar|aandacht|succes|resultaat|zorg|respect|ingang)\b)[a-zà-ÿ]{3,}(?:\s+en\s+(?!(?:de|het|een|zijn|haar)\b)[a-zà-ÿ]{3,})?/g,
    confidence: 0.55,
    contextual: true,
  },
  // Naam in kleine letters die direct wordt gevolgd door een klas-/groepsaanduiding:
  // "piet jansen uit klas 4H2", "sanne de boer in groep 6". Smal genoeg om
  // gewone woordparen niet te raken, want de klas-cue moet erachter staan.
  {
    id: "rule.name_lower_class",
    category: "name",
    regex:
      /\b(?!(?:een|het|die|dat|deze|dit|zijn|haar|onze|hun|jullie|geen|elke|alle|ook|nog|weer|toen|daar|hier|iets|niets|meer|zeer|erg|heel|leerling|leerlingen|kind|kinderen|jongen|meisje|docent|mentor|ouder|ouders|conflict|incident|situatie|gesprek|plek|les|tijd|dag|week|jaar)\b)[a-zà-ÿ]{3,}(?:\s+(?:van|de|der|den|ten|ter))?\s+(?!(?:klas|groep|les|uit|in|van)\b)[a-zà-ÿ]{3,}(?=\s+(?:uit|in|van)\s+(?:klas|groep)\b)/gi,
    confidence: 0.6,
    contextual: true,
  },
  // Voor- en achternaam in kleine letters, overal in de tekst, inclusief
  // tussenvoegsels ("jan de vries", "sanne van den berg"). Ruim opgezet:
  // liever iets te veel markeren, want de gebruiker kan per markering
  // "Negeer" kiezen. Daarom contextueel en met lage zekerheid.
  {
    id: "rule.name_lower_pair",
    category: "name",
    // Met tussenvoegsel: "jan de vries", "sanne van den berg", "youssef el amrani".
    regex: nameRe(
      "\\b(?!(?:{{STOP}})\\b)[a-zà-ÿ]{3,}\\s+(?:van|de|der|den|ten|ter|el|al|bin|di|da|del)(?:\\s+(?:de|der|den|het))?\\s+(?!(?:{{STOP}})\\b)[a-zà-ÿ]{3,}\\b",
      "g",
    ),
    confidence: 0.5,
    contextual: true,
  },
  {
    id: "rule.name_lower_pair_suffix",
    category: "name",
    // Zonder tussenvoegsel, maar met een achternaam-vorm: "jan jansen",
    // "sanne bakker", "karim hoekstra". De achternaamuitgang houdt gewone
    // woordparen ("met plezier", "gewerkt aan") buiten de deur.
    regex: nameRe(
      "\\b(?!(?:{{STOP}})\\b)[a-zà-ÿ]{3,}\\s+(?!(?:{{STOP}})\\b)[a-zà-ÿ]{2,}(?:sen|zen|sma|stra|inga|ink|berg|bergen|veld|velde|man|mans|huis|dijk|dijks|kamp|broek|meijer|meyer|bakker|smit|smits|vries|boer|horst|laar|hoven|beek|dam|hout|kerk|koning|visser|jansen|hoekstra|willems|peters|kuipers|mulder|graaf|linden|water|hart)\\b",
      "g",
    ),
    confidence: 0.45,
    contextual: true,
  },
  // Enkele naam in kleine letters direct na een rolwoord:
  // "leerling sanne", "de moeder van youssef", "juf karin".
  {
    id: "rule.name_lower_role",
    category: "name",
    regex: nameRe(
      "(?<=\\b(?:leerling|leerlinge|leerlingen|ouder|ouders|moeder|vader|broer|zus|mentor|juf|meester|meneer|mevrouw|collega|verzorger|klasgenoot|klasgenootje)\\s+(?:van\\s+)?)(?!(?:{{STOP}})\\b)[a-zà-ÿ]{3,}(?:\\s+(?:van|de|der|den|ten|ter|el|al)\\s+[a-zà-ÿ]{2,})?",
      "gi",
    ),
    confidence: 0.55,
    contextual: true,
  },
  // Enkele naam in kleine letters vlak voor een persoonlijk werkwoord of bezit:
  // "sanne huilde", "jan vertelde", "youssefs moeder".
  {
    id: "rule.name_lower_verb",
    category: "name",
    regex: nameRe(
      "\\b(?!(?:{{STOP}})\\b)[a-zà-ÿ]{3,}(?='?s?\\s+(?:zei|zegt|vertelde|vertelt|huilde|huilt|reageerde|reageert|weigerde|weigert|sloeg|slaat|schreeuwde|liep|loopt|zat|zit|kwam|moeder|vader|ouders|mentor|gedrag|dossier)\\b)",
      "g",
    ),
    confidence: 0.45,
    contextual: true,
  },
  // Koppelnaam en apostrofnaam in kleine letters: "jan-peter", "'t hart".
  {
    id: "rule.name_lower_compound",
    category: "name",
    regex: nameRe(
      "\\b(?!(?:{{STOP}})\\b)[a-zà-ÿ]{3,}-[a-zà-ÿ]{3,}\\b|(?:'|’)t\\s+[a-zà-ÿ]{3,}\\b",
      "g",
    ),
    confidence: 0.45,
    contextual: true,
  },
  // Social handle (@user).
  {
    id: "rule.social_handle",
    category: "social_handle",
    regex: /(?<![A-Za-z0-9])@[A-Za-z0-9_]{3,}/g,
    confidence: 0.75,
  },
  // Geboortedatum/datum in tekst: "12 januari 1985", NL maanden.
  {
    id: "rule.birthdate_text",
    category: "birthdate_text",
    regex:
      /\b\d{1,2}\s+(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{2,4}\b/gi,
    confidence: 0.8,
  },
  // Contextual signals (lower confidence, contextual=true)
  {
    id: "ctx.small_group",
    category: "context_small_group",
    regex: /\b(?:groep\s*[1-8][a-z]?|klas\s*[1-6][a-z]?|brugklas)\b/gi,
    contextual: true,
    confidence: 0.75,
  },
  {
    id: "ctx.care",
    category: "context_care",
    regex:
      /\b(?:zorgleerling|dyslexie|dyscalculie|adhd|autisme|asperger|pleegzorg|pleeggezin|jeugdzorg|gedragsproblemen|ondersteuningsbehoefte)\b/gi,
    contextual: true,
    confidence: 0.7,
  },
  {
    id: "ctx.incident",
    category: "context_incident",
    regex: /\b(?:incident|schorsing|geschorst|conflict|misbruik|geweld|melding|klacht)\b/gi,
    contextual: true,
    confidence: 0.6,
  },
  {
    id: "ctx.role",
    category: "context_role",
    regex:
      /\b(?:directeur|conrector|teamleider|intern begeleider|ib'?er|mentor|vertrouwenspersoon)\b/gi,
    contextual: true,
    confidence: 0.45,
  },
  // Gezondheid (geen specifieke diagnose hier, dat zit in ctx.care; deze vangt
  // medicatie/behandeling/therapie). GDPR Art 9.
  {
    id: "ctx.health",
    category: "context_health",
    regex:
      /\b(?:medicatie|medicijn(?:en)?|ritalin|concerta|antidepressivum|antidepressiva|therapie|psycholoog|psychiater|behandeling|diagnose|ziekte|ziek(?:te)?verzuim|epilep(?:sie|tisch)|chronisch ziek)\b/gi,
    contextual: true,
    confidence: 0.8,
  },
  // Familiesituatie / thuissituatie (verhoogt herleidbaarheid sterk in kleine groep).
  {
    id: "ctx.family",
    category: "context_family",
    regex:
      /\b(?:gescheiden ouders|echtscheiding|co-?ouderschap|alleenstaande (?:moeder|vader|ouder)|pleeggezin|pleegouders?|stiefvader|stiefmoeder|uithuisplaatsing|voogd(?:ij)?|onder toezicht|OTS)\b/gi,
    contextual: true,
    confidence: 0.75,
  },
  // Justitie / politie.
  {
    id: "ctx.legal",
    category: "context_legal",
    regex:
      /\b(?:politie|justitie|officier van justitie|reclassering|taakstraf|halt(?:-?afdoening)?|jeugddetentie|aangifte|verdachte|strafblad|veroordeeld|OM-?zitting)\b/gi,
    contextual: true,
    confidence: 0.8,
  },
  // Financieel.
  {
    id: "ctx.financial",
    category: "context_financial",
    regex:
      /\b(?:uitkering|bijstand|schuldhulpverlening|schulden|armoede|voedselbank|kwijtschelding|kinderbijslag|toeslagen|loon|salaris|inkomen)\b/gi,
    contextual: true,
    confidence: 0.65,
  },
  // GDPR Art 9, beschermde categorieën (etniciteit, religie, seksuele oriëntatie, politiek).
  {
    id: "ctx.protected_class",
    category: "context_protected_class",
    regex:
      /\b(?:moslim|islamitisch|jood(?:s|in)?|christelijk|katholiek|protestants|hindoe(?:istisch)?|boeddhist(?:isch)?|atheïst|homo(?:seksueel)?|lesbisch|biseksueel|transgender|trans (?:man|vrouw|persoon)|non-?binair|queer|marokkaans|turks|surinaams|antilliaans|allochtoon|vluchteling|asielzoeker|statushouder|ongedocumenteerd|stemt? (?:pvv|vvd|cda|d66|groenlinks|sp|pvda|fvd))\b/gi,
    contextual: true,
    confidence: 0.85,
  },
  // Schoolprestaties (in combinatie met naam zeer herleidbaar).
  {
    id: "ctx.performance",
    category: "context_performance",
    regex:
      /\b(?:gezakt|blijven zitten|doublure|doubleert|onvoldoende(?:s)?|cijfer\s+\d(?:[.,]\d)?|gemiddelde\s+\d(?:[.,]\d)?|examen(?:resultaten|cijfers)?|herkans(?:t|en|ing))\b/gi,
    contextual: true,
    confidence: 0.45,
  },
  // Specifieke locatie (lokaal/adres-achtig) verhoogt herleidbaarheid.
  {
    id: "ctx.location_specific",
    category: "context_location_specific",
    regex:
      /\b(?:lokaal\s+\d{1,3}[a-z]?|aula|kantine|fietsenstalling|gymzaal|sportveld|schoolplein|teamkamer|docentenkamer)\b/gi,
    contextual: true,
    confidence: 0.35,
  },

  /* ===================================================================
   * Uitgebreide set: slordige notatie, typefouten en bewuste versluiering.
   * Deze regels staan bewust op een lagere confidence dan hun strakke
   * tegenhanger hierboven; merge houdt de sterkste match over.
   * =================================================================== */

  // E-mail met spaties, (at)/[at]/ apenstaartje en "punt" in plaats van tekens.
  {
    id: "rule.email_obfuscated",
    category: "email",
    regex:
      /\b[A-Za-z0-9._%+-]{2,}\s*(?:[[(<{]\s*)?(?:@|at|apenstaartje)(?:\s*[\])>}])?\s*[A-Za-z0-9-]{2,}(?:\s*(?:\.|\s(?:punt|dot)\s)\s*[A-Za-z0-9-]{2,}){1,3}\b/gi,
    confidence: 0.75,
  },
  // Telefoon met punten, haakjes of losse cijfergroepen: 06.12.34.56.78,
  // +31(0)6 12345678, 0031 6 1234 5678, 06 12 34 56 78.
  {
    id: "rule.phone_loose",
    category: "phone",
    regex: /(?<!\d)(?:\+31|0031|\(0\)|0)[\s.()\-]{0,4}6(?:[\s.\-]{0,2}\d){8}(?!\d)/g,
    confidence: 0.9,

  },
  // Telefoonnummer na een trefwoord, ook als de notatie afwijkt.
  {
    id: "rule.phone_ctx",
    category: "phone",
    regex:
      /(?<=\b(?:tel(?:efoon)?(?:nummer)?|mobiel|mob\.?|gsm|whatsapp|app|bereikbaar op|bel)\b[\s:.#]{0,4})(?:\+?\d[\s.\-()]{0,2}){8,14}/gi,
    confidence: 0.8,
  },
  // BSN met punten, streepjes of spaties. De elfproef filtert dit alsnog.
  {
    id: "rule.bsn_sep",
    category: "bsn",
    regex: /(?<!\d)\d{3}[.\-\s]\d{3}[.\-\s]\d{3}(?!\d)/g,
    confidence: 0.8,
  },
  // Postcode zonder spatie, met streepje, of in kleine letters.
  {
    id: "rule.postcode_loose",
    category: "postcode",
    regex:
      /\b\d{4}[\s-]{0,2}(?!(?:en|de|te|op|in|is|of|om|er|na|zo|ze|we|je|ik|hij|uur|km|kg)\b)[A-Za-z]{2}\b/g,
    confidence: 0.7,
  },
  // IBAN in kleine letters of met spaties/streepjes tussen de groepjes.
  {
    id: "rule.iban_loose",
    category: "iban",
    regex: /\b[A-Za-z]{2}\s?\d{2}(?:[\s.-]?[A-Za-z0-9]{2,4}){3,7}\b/g,
    confidence: 0.75,
  },
  // KvK, btw en andere zakelijke identificatie, alleen met trefwoord ervoor.
  {
    id: "rule.company_id",
    category: "id_document",
    regex:
      /(?<=\b(?:kvk(?:[-\s]?nummer)?|handelsregister|btw(?:[-\s]?(?:nummer|id))?|vat)\b[\s:.#]{0,4})(?:NL)?[A-Z0-9]{8,14}\b/gi,
    confidence: 0.8,
  },
  // Zorg- en onderwijsidentificatie na trefwoord: polis, UZOVI, BRIN, DUO,
  // verzekerings-, dossier- en zaaknummer, V-nummer.
  {
    id: "rule.reference_number",
    category: "id_document",
    regex:
      /(?<=\b(?:polis(?:nummer)?|verzekerings(?:nummer)?|uzovi|zorgverzekering(?:snummer)?|brin(?:[-\s]?nummer)?|duo[-\s]?nummer|dossier(?:nummer)?|zaak(?:nummer)?|v[-\s]?nummer|klantnummer|debiteurennummer)\b[\s:.#]{0,4})[A-Z0-9][A-Z0-9.\-]{3,15}\b/gi,
    confidence: 0.75,
  },
  // Leerlingnummer: meer trefwoorden en slordige notatie (nr., #, dubbele punt).
  {
    id: "rule.student_id_ctx_wide",
    category: "student_id",
    regex:
      /(?<=\b(?:leerling[-\s]?(?:nummer|nr\.?|code|id)?|lln\.?[-\s]?(?:nr\.?)?|student[-\s]?(?:nummer|nr\.?|id)|pgn|onderwijs[-\s]?nummer|inschrijf[-\s]?nummer|examen[-\s]?nummer|kandidaat[-\s]?nummer)\b[\s:.#nr]{0,5})\d{4,9}\b/gi,
    confidence: 0.9,
  },
  // Klas en groep in alle gangbare schrijfwijzen: groep7, Groep 7B, gr. 7,
  // klas2a, 4 vwo, 4-VWO, havo4, brugklas 1c.
  {
    id: "ctx.group_loose",
    category: "context_small_group",
    regex: /\b(?:groep|gr\.?|klas|brugklas|mentorgroep|leerjaar|lj\.?)\s*-?\s*\d{1,2}\s*[a-hA-H]?\b/gi,
    contextual: true,
    confidence: 0.7,
  },
  {
    id: "rule.class_stream",
    category: "class_code",
    regex:
      /\b(?:[1-6]\s*-?\s*(?:havo|vwo|vmbo|mavo|gymnasium|gym|atheneum|kader|basis|tl|gl)|(?:havo|vwo|vmbo|mavo|gymnasium|gym|atheneum)\s*-?\s*[1-6])[a-z]?\b/gi,
    contextual: true,
    confidence: 0.65,
  },
  // Datum met punten of tweecijferig jaar: 01.01.2026, 1-1-26.
  {
    id: "rule.date_dotted",
    category: "date",
    regex: /(?<!\d)\d{1,2}[.]\d{1,2}[.]\d{2,4}(?!\d)/g,
    confidence: 0.7,
  },
  // Datum met afgekorte of verbogen maand: 1 jan 2026, 1e januari 2026.
  {
    id: "rule.date_month_short",
    category: "birthdate_text",
    regex:
      /\b\d{1,2}(?:e|ste|de)?\s+(?:jan|feb|mrt|maa|apr|mei|jun|jul|aug|sep|sept|okt|nov|dec)[a-z]*\.?(?:\s+(?:19|20)?\d{2})?\b/gi,
    confidence: 0.7,
  },
  // Leeftijd, alleen relevant samen met de rest van de tekst.
  {
    id: "ctx.age",
    category: "birthdate_text",
    regex: /\b(?:\d{1,2}\s*(?:-|\s)?jaar(?:\s+oud)?|leeftijd[\s:]{1,3}\d{1,2})\b/gi,
    contextual: true,
    confidence: 0.4,
  },
  // Schooljaar: 2025/2026, 2025-26.
  {
    id: "ctx.school_year",
    category: "date",
    regex: /\b(?:schooljaar\s*)?20\d{2}\s*[/-]\s*(?:20)?\d{2}\b/gi,
    contextual: true,
    confidence: 0.4,
  },
  // Adres met huisnummertoevoeging, postbus, of "woont aan de ...".
  {
    id: "rule.address_wide",
    category: "address",
    regex:
      /\b[A-Z][a-zà-ÿ'’]+(?:\s[A-Z]?[a-zà-ÿ'’]+)?\s?(?:straat|laan|weg|plein|gracht|kade|hof|park|dijk|singel|dreef|pad|steeg|baan)\s+\d{1,4}\s?[-a-zA-Z]{0,3}\b/g,
    confidence: 0.8,
  },
  {
    id: "rule.postbus",
    category: "address",
    regex: /\bpostbus\s*\d{1,6}\b/gi,
    confidence: 0.8,
  },
  {
    id: "rule.name_initials_lower",
    category: "name",
    regex:
      /\b(?:[a-z]\.\s?){1,3}(?:(?:van|de|der|den|ten|ter|het|op)\s+){0,2}[a-zà-ÿ'’-]{3,}\b/g,
    contextual: true,
    confidence: 0.6,
  },
  {
    id: "rule.address_intro",
    category: "address",
    regex:
      /(?<=\b(?:woont?\s+(?:aan|op)\s+(?:de\s+|het\s+)?|adres[\s:]{1,3})\s*)[A-Z]?[a-zà-ÿ'’]+(?:straat|laan|weg|plein|gracht|kade|hof|park|dijk|singel)\s*\d{0,4}[a-z]?/gi,
    confidence: 0.75,
  },
  // MAC-adres.
  {
    id: "rule.mac_address",
    category: "ip_address",
    regex: /\b(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}\b/gi,
    confidence: 0.8,
  },
  // Domein zonder protocol, inclusief pad: school.nl/leerlingen, meet.google.com/abc-def.
  {
    id: "rule.bare_domain",
    category: "url",
    regex: /\b(?!\d)[a-z0-9-]{2,}(?:\.[a-z0-9-]{2,}){1,3}\/[^\s<>"']*[^\s<>"'.,;:!?)\]]/gi,
    confidence: 0.7,
  },
  // Initialen met achternaam: J.P. de Vries, A. Jansen.
  {
    id: "rule.name_initials",
    category: "name",
    regex:
      /\b(?:[A-Z]\.\s?){1,3}(?:(?:van|de|der|den|ten|ter|het|op)\s+){0,2}[A-Z][a-zà-ÿ'’-]{2,}\b/g,
    confidence: 0.8,
  },
  // Tussenvoegsels aan elkaar of afgekort: vd Berg, v.d. Berg, v/d Berg.
  {
    id: "rule.name_prefix_short",
    category: "name",
    regex: /\b(?:v\.?\s?\/?\s?d\.?|vd\.?|v\.\s?d\.)\s+[A-Z][a-zà-ÿ'’-]{2,}\b/g,
    confidence: 0.7,
  },
  // Apostrof- en koppelnamen: 't Hart, d'Angelo, Jan-Peter Bakker.
  {
    id: "rule.name_apostrophe",
    category: "name",
    regex:
      /\b(?:['’]t|d['’])\s?[A-Z][a-zà-ÿ-]{2,}\b|\b[A-Z][a-zà-ÿ]+-[A-Z][a-zà-ÿ]+(?:\s+[A-Z][a-zà-ÿ'’-]+)?\b/g,
    confidence: 0.7,
  },
  // Naam zonder hoofdletter na een expliciete cue: "leerling jan de vries",
  // "betreft: sanne bakker", "gesprek met piet".
  {
    id: "rule.name_after_cue",
    category: "name",
    regex:
      /(?<=\b(?:leerling(?:e|en)?|student|kandidaat|betreft|inzake|gesprek met|ouders? van|contactpersoon|mentor van)\b[\s:,.]{1,3})[a-zà-ÿ]{3,}(?:\s+(?:van|de|der|den|ten|ter|el|al)\b)*(?:\s+[a-zà-ÿ]{2,}){0,2}/gi,
    confidence: 0.6,
    contextual: true,
  },
  // Bewuste versluiering na een naam-cue: j4n, s@nne, p i e t.
  {
    id: "rule.name_obfuscated",
    category: "name",
    regex:
      /(?<=\b(?:ik heet|mijn naam is|naam[\s:]{1,3}|noem (?:mij|me))\s*)(?:[A-Za-z][A-Za-z0-9@$!*.]{2,}|(?:[A-Za-z]\s){2,}[A-Za-z])/g,
    confidence: 0.55,
  },
  // Nummer met sterretjes of streepjes als maskering: 1234-****-5678.
  {
    id: "rule.masked_number",
    category: "id_document",
    regex: /\b(?:\d[\s*x-]{0,2}){4,}\*{2,}(?:[\s*x-]{0,2}\d){2,}\b/gi,
    contextual: true,
    confidence: 0.45,
  },
  // Extra signaalwoorden bij bestaande contextcategorieën.
  {
    id: "ctx.care_extra",
    category: "context_care",
    regex:
      /\b(?:opp|ontwikkelingsperspectief|arrangement|lwoo|passend onderwijs|remedial teaching|rt'?er|logopedie|ergotherapie|dyslexieverklaring|cito(?:-score)?|lvs|handelingsplan|zorgplan|zat|ib'?er|ondersteuningsteam)\b/gi,
    contextual: true,
    confidence: 0.65,
  },
  {
    id: "ctx.incident_extra",
    category: "context_incident",
    regex:
      /\b(?:pesten|gepest|vechtpartij|wapen|drugs|alcohol|diefstal|vernieling|spijbelen|verzuim(?:melding)?|time-?out|uit de les gestuurd|schorsingsbesluit|verwijder(?:ing|d))\b/gi,
    contextual: true,
    confidence: 0.6,
  },
  {
    id: "ctx.family_extra",
    category: "context_family",
    regex:
      /\b(?:thuissituatie|huiselijk geweld|veilig thuis|mishandeling|verwaarlozing|opvoedondersteuning|gezinsvoogd|mantelzorg|rouw|overlijden)\b/gi,
    contextual: true,
    confidence: 0.75,
  },
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
  // Post-filters beperken brede nummermatches.
  // BSN gebruikt de Nederlandse elfproef; creditcard gebruikt Luhn.
  const filtered = spans.filter((s) => {
    if (s.category === "bsn") return bsnElfproefValid(s.text);
    if (s.category === "credit_card") return luhnValid(s.text);
    if (s.category === "iban") return ibanMod97Valid(s.text);

    return true;
  });
  // Deduplicate overlapping spans, keep highest confidence
  filtered.sort((a, b) => a.start - b.start || b.confidence - a.confidence);
  const merged: PiiSpan[] = [];
  for (const s of filtered) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) {
      // Een overlappende treffer neemt het alleen over als hij zekerder is
      // én niet korter, anders knipt een deelmatch (bv. een telefoonpatroon
      // binnen een IBAN) de bredere treffer weg.
      const lastLen = last.end - last.start;
      const curLen = s.end - s.start;
      if (s.confidence > last.confidence && curLen >= lastLen) merged[merged.length - 1] = s;

      continue;
    }
    merged.push(s);
  }
  return withNameEchoes(text, merged, disabledCategories);
}

/**
 * Naverwerking: namen die ergens mét hoofdletter zijn gevonden, komen in
 * dezelfde tekst vaak ook in kleine letters voor ("Sanne ... sanne").
 * Die echo's worden alsnog gemarkeerd, hoofdletterongevoelig en met een
 * lagere zekerheid, zolang ze niet in een bestaande span vallen.
 */
function withNameEchoes(
  text: string,
  spans: PiiSpan[],
  disabledCategories?: ReadonlySet<PiiCategory>,
): PiiSpan[] {
  if (disabledCategories?.has("name")) return spans;
  const words = new Set<string>();
  for (const s of spans) {
    if (s.category !== "name") continue;
    for (const w of s.text.split(/[\s,]+/)) {
      const clean = w.replace(/[^\p{L}'’-]/gu, "");
      if (clean.length >= 3 && !NAME_STOP_WORDS.includes(clean.toLowerCase() as never)) {
        words.add(clean.toLowerCase());
      }
    }
  }
  if (words.size === 0) return spans;

  const extra: PiiSpan[] = [];
  const covered = (a: number, b: number) => spans.some((s) => a < s.end && b > s.start);
  for (const w of words) {
    const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (covered(start, end)) continue;
      if (extra.some((s) => start < s.end && end > s.start)) continue;
      extra.push({
        start,
        end,
        text: m[0],
        category: "name",
        ruleId: "rule.name_echo",
        confidence: 0.5,
        contextual: true,
      });
    }
  }
  if (extra.length === 0) return spans;
  return [...spans, ...extra].sort((a, b) => a.start - b.start);
}

// IBAN mod-97 (ISO 13616). Tolerant voor spaties, punten, streepjes en
// kleine letters, zodat slordig getypte rekeningnummers toch worden gezien.
function ibanMod97Valid(raw: string): boolean {
  const s = raw.replace(/[\s.-]/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 48 && code <= 57) remainder = (remainder * 10 + (code - 48)) % 97;
    else if (code >= 65 && code <= 90) remainder = (remainder * 100 + (code - 55)) % 97;
    else return false;
  }
  return remainder === 1;
}

function bsnElfproefValid(raw: string): boolean {

  const digits = raw.replace(/\D/g, "");
  if (!/^\d{9}$/.test(digits)) return false;
  if (/^0+$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += (digits.charCodeAt(i) - 48) * (9 - i);
  }
  sum -= digits.charCodeAt(8) - 48;
  return sum % 11 === 0;
}

function luhnValid(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export const ALL_CATEGORIES: readonly PiiCategory[] = Array.from(
  new Set(RULES.map((r) => r.category)),
);
