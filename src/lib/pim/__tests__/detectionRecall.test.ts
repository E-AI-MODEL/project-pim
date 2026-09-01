// Meetbare ondergrens voor detectie (P1-4, deels zelf-verifieerbaar).
//
// Klein synthetisch NL-onderwijscorpus met handmatige labels. De test faalt
// zodra de recall per categorie onder de drempel zakt. Draait bewust
// regex/lexicon-only (geen BERT), zodat CI zonder modeldownload een echte
// ondergrens bewaakt. Alle namen en nummers zijn verzonnen.
import { describe, expect, it } from "vitest";
import { computeSignals } from "../risk";
import { DEFAULT_DETECTION_SETTINGS } from "../detectionSettings";
import type { PiiCategory } from "../types";

interface Sample {
  text: string;
  labels: { category: PiiCategory; text: string }[];
}

const CORPUS: Sample[] = [
  {
    text: "Emma de Vries uit groep 7B maakte ruzie met piet jansen tijdens de pauze.",
    labels: [
      { category: "name", text: "Emma de Vries" },
      { category: "name", text: "piet jansen" },
      { category: "class_code", text: "groep 7B" },
    ],
  },
  {
    text: "Mail van moeder: s.dejong@voorbeeld.nl, ze belt liever op 06-12345678.",
    labels: [
      { category: "email", text: "s.dejong@voorbeeld.nl" },
      { category: "phone", text: "06-12345678" },
    ],
  },
  {
    text: "Leerlingnummer 884321 hoort bij Youssef El Amrani, klas 4H2.",
    labels: [
      { category: "student_id", text: "884321" },
      { category: "name", text: "Youssef El Amrani" },
      { category: "class_code", text: "4H2" },
    ],
  },
  {
    text: "Het gezin woont aan de Dorpsstraat 12, 5678 AB Best.",
    labels: [
      { category: "address", text: "Dorpsstraat 12" },
      { category: "postcode", text: "5678 AB" },
    ],
  },
  {
    text: "Voor de vergoeding: BSN 123456782 en IBAN NL91ABNA0417164300.",
    labels: [
      { category: "bsn", text: "123456782" },
      { category: "iban", text: "NL91ABNA0417164300" },
    ],
  },
  {
    text: "Sanne Bakker is geboren op 03-04-2014 en zit sinds vorig jaar op school.",
    labels: [
      { category: "name", text: "Sanne Bakker" },
      { category: "date", text: "03-04-2014" },
    ],
  },
  {
    text: "Meester Ahmed Yilmaz noteerde dat mohammed bouzid vaak te laat komt.",
    labels: [
      { category: "name", text: "Ahmed Yilmaz" },
      { category: "name", text: "mohammed bouzid" },
    ],
  },
  {
    text: "Bericht van vader via 0612345678 of j.vandenberg@school-voorbeeld.nl.",
    labels: [
      { category: "phone", text: "0612345678" },
      { category: "email", text: "j.vandenberg@school-voorbeeld.nl" },
    ],
  },
  {
    text: "Fatima Ouahbi (leerlingnummer 771204) uit klas 2A woont op Kerkweg 8.",
    labels: [
      { category: "name", text: "Fatima Ouahbi" },
      { category: "student_id", text: "771204" },
      { category: "class_code", text: "2A" },
      { category: "address", text: "Kerkweg 8" },
    ],
  },
  {
    text: "De intern begeleider mailde n.dewit@ib-voorbeeld.nl over lars smit uit groep 5.",
    labels: [
      { category: "email", text: "n.dewit@ib-voorbeeld.nl" },
      { category: "name", text: "lars smit" },
      { category: "class_code", text: "groep 5" },
    ],
  },
  {
    text: "Ouders van Tim van der Meer zijn bereikbaar op 010-1234567, postcode 3011 AA.",
    labels: [
      { category: "name", text: "Tim van der Meer" },
      { category: "phone", text: "010-1234567" },
      { category: "postcode", text: "3011 AA" },
    ],
  },
  {
    text: "Aanvraag ouderbijdrage: IBAN NL44RABO0123456789, BSN 111222333, datum 12-09-2025.",
    labels: [
      { category: "iban", text: "NL44RABO0123456789" },
      { category: "bsn", text: "111222333" },
      { category: "date", text: "12-09-2025" },
    ],
  },
  {
    text: "aisha benali en Jeroen Kuipers zitten allebei in groep 8C dit schooljaar.",
    labels: [
      { category: "name", text: "aisha benali" },
      { category: "name", text: "Jeroen Kuipers" },
      { category: "class_code", text: "groep 8C" },
    ],
  },
  // Lastigere gevallen: afwijkende notaties en namen zonder hoofdletter.
  {
    text: "Bel gerust naar +31 6 1234 5678 of naar 06 87 65 43 21 na schooltijd.",
    labels: [
      { category: "phone", text: "+31 6 1234 5678" },
      { category: "phone", text: "06 87 65 43 21" },
    ],
  },
  {
    text: "de moeder van sofie de groot mailde vanochtend naar de leerkracht.",
    labels: [{ category: "name", text: "sofie de groot" }],
  },
  {
    text: "Rekeningnummer NL91 ABNA 0417 1643 00 staat op naam van Karin Vos.",
    labels: [
      { category: "iban", text: "NL91 ABNA 0417 1643 00" },
      { category: "name", text: "Karin Vos" },
    ],
  },
  {
    text: "Zie dossier 20-03-2013, adres Van Goghlaan 145A, 1234 ZZ Amersfoort.",
    labels: [
      { category: "date", text: "20-03-2013" },
      { category: "address", text: "Van Goghlaan 145A" },
      { category: "postcode", text: "1234 ZZ" },
    ],
  },
  {
    text: "Leerlingnr. 90211 van noah van dijk uit groep 6a is gewijzigd.",
    labels: [
      { category: "student_id", text: "90211" },
      { category: "name", text: "noah van dijk" },
      { category: "class_code", text: "groep 6a" },
    ],
  },
  {
    text: "Contact: L.M. de Boer, telefoon 020 123 45 67, mail lm.deboer@voorbeeld.nl.",
    labels: [
      { category: "name", text: "L.M. de Boer" },
      { category: "phone", text: "020 123 45 67" },
      { category: "email", text: "lm.deboer@voorbeeld.nl" },
    ],
  },
];

/**
 * Challenge-set: gevallen die de regels vandaag nog niet allemaal halen.
 * Bewust apart gerapporteerd, met een eigen (lagere) drempel, zodat een
 * bekend gat zichtbaar blijft in plaats van de regressieset te vertroebelen.
 */
const CHALLENGE_CORPUS: Sample[] = [
  {
    text: "Bericht van de vader van Anne-Fleur van 't Hoff-Berger over de studiereis.",
    labels: [{ category: "name", text: "Anne-Fleur van 't Hoff-Berger" }],
  },
  {
    text: "Telefonisch bereikbaar via 0031612345678, of anders via 06.12.34.56.78.",
    labels: [
      { category: "phone", text: "0031612345678" },
      { category: "phone", text: "06.12.34.56.78" },
    ],
  },
  {
    text: "Zijn e-mailadres is jan (at) voorbeeld punt nl, zo staat het in het dossier.",
    labels: [{ category: "email", text: "jan (at) voorbeeld punt nl" }],
  },
  {
    text: "De leerling met nummer 88-43-21 zit in de instroomgroep van dit jaar.",
    labels: [{ category: "student_id", text: "88-43-21" }],
  },
];

/**
 * Teksten zonder persoonsgegevens. Hier hoort niets gemarkeerd te worden;
 * de test bewaakt een bovengrens aan valse positieven, zodat "liever te veel
 * arceren" niet stilletjes verandert in "alles arceren".
 */
const CLEAN_CORPUS: string[] = [
  "De rekenmethode wordt volgend jaar vervangen door een nieuwe versie.",
  "In de teamvergadering bespraken we het rooster en de surveillance op het plein.",
  "Het schoolplein wordt in de zomervakantie opnieuw bestraat.",
  "Wij werken met een leerlingvolgsysteem en bespreken de resultaten per groep.",
  "De ouderavond gaat over huiswerkbegeleiding en mediawijsheid.",
  "Er is meer aandacht nodig voor begrijpend lezen in de bovenbouw.",
  "De methode voor spelling sluit aan bij de referentieniveaus.",
  "Volgende week staat de studiedag over formatief evalueren gepland.",
];

/**
 * Precisieset: teksten die er alleen op lijken. Elke tekst noemt per
 * categorie wat er hoogstens gemarkeerd mag worden; alles daarbuiten telt
 * als valse positief voor die categorie.
 */
interface PrecisieSample {
  text: string;
  /** Categorieën die in deze tekst nooit terecht zijn. */
  verboden: PiiCategory[];
}

const PRECISIE_CORPUS: PrecisieSample[] = [
  {
    text: "Het bedrag van 123456789 euro subsidie staat los van postcodegebied 1234 AB.",
    verboden: ["bsn", "student_id"],
  },
  {
    text: "De school staat aan de Van Goghlaan en werkt samen met de Jansenstraat verderop.",
    verboden: ["name"],
  },
  {
    text: "In de geschiedenisles behandelen we Willem van Oranje en Anne Frank als lesstof.",
    verboden: ["student_id", "bsn", "phone"],
  },
  {
    text: "Het artikelnummer 0612345678 uit de methodecatalogus is vervallen per 2025.",
    verboden: ["bsn", "iban"],
  },
  {
    text: "Rekenopgave: tel 020 op bij 1234567 en noteer de uitkomst in je schrift.",
    verboden: ["bsn", "iban", "email"],
  },
];

/** Ondergrens per categorie op de regressieset. Liever te veel arceren. */
const THRESHOLDS: Partial<Record<PiiCategory, number>> = {
  email: 1,
  phone: 1,
  bsn: 1,
  iban: 1,
  postcode: 1,
  student_id: 1,
  date: 1,
  address: 0.9,
  class_code: 0.9,
  name: 0.8,
};

/** Ondergrens over de hele challenge-set. Lager: dit is bekend lastig werk. */
const CHALLENGE_THRESHOLD = 0.4;

/** Hoogste toegestane aandeel schone zinnen met een markering. */
const MAX_FALSE_POSITIVE_RATE = 0.34;

/** Hoogste toegestane aantal verboden markeringen over de precisieset. */
const MAX_PRECISIE_FOUTEN = 1;

function spansFor(text: string) {
  const signals = computeSignals(text, [], DEFAULT_DETECTION_SETTINGS, new Set());
  return [...signals.directPii, ...signals.contextualPii];
}

/**
 * Een label telt pas als gevonden wanneer de markering het label grotendeels
 * dekt. Zo kan een losse letter of cijfer de recall niet kunstmatig ophogen.
 */
function overlapsFound(sample: Sample, label: { category: PiiCategory; text: string }): boolean {
  return spansFor(sample.text).some((s) => {
    if (s.text.includes(label.text)) return true;
    if (!label.text.includes(s.text)) return false;
    return s.text.length >= label.text.length * 0.6;
  });
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

interface Bucket {
  found: number;
  total: number;
  missed: string[];
}

function score(corpus: Sample[]): Map<PiiCategory, Bucket> {
  const per = new Map<PiiCategory, Bucket>();
  for (const sample of corpus) {
    for (const label of sample.labels) {
      const bucket = per.get(label.category) ?? { found: 0, total: 0, missed: [] };
      bucket.total += 1;
      if (overlapsFound(sample, label)) bucket.found += 1;
      else bucket.missed.push(label.text);
      per.set(label.category, bucket);
    }
  }
  return per;
}

describe("regressieset, synthetisch NL-onderwijscorpus", () => {
  const perCategory = score(CORPUS);

  for (const [category, threshold] of Object.entries(THRESHOLDS) as [PiiCategory, number][]) {
    it(`haalt de recall-drempel voor ${category} (>= ${pct(threshold)})`, () => {
      const bucket = perCategory.get(category);
      expect(bucket, `geen corpuslabels voor ${category}`).toBeDefined();
      const recall = bucket!.found / bucket!.total;
      expect(
        recall,
        `behaald ${pct(recall)} (${bucket!.found}/${bucket!.total}), gemist: ${
          bucket!.missed.join(", ") || "niets"
        }`,
      ).toBeGreaterThanOrEqual(threshold);
    });
  }

  it("haalt over het hele corpus een totale recall van minstens 90%", () => {
    let found = 0;
    let total = 0;
    for (const bucket of perCategory.values()) {
      found += bucket.found;
      total += bucket.total;
    }
    const recall = found / total;
    expect(recall, `behaald ${pct(recall)} (${found}/${total})`).toBeGreaterThanOrEqual(0.9);
  });
});

describe("challenge-set, bekend lastige notaties", () => {
  const perCategory = score(CHALLENGE_CORPUS);
  let found = 0;
  let total = 0;
  const gemist: string[] = [];
  for (const bucket of perCategory.values()) {
    found += bucket.found;
    total += bucket.total;
    gemist.push(...bucket.missed);
  }

  it(`haalt minstens ${pct(CHALLENGE_THRESHOLD)} recall op de challenge-set`, () => {
    const recall = found / total;
    expect(
      recall,
      `behaald ${pct(recall)} (${found}/${total}), gemist: ${gemist.join(", ") || "niets"}`,
    ).toBeGreaterThanOrEqual(CHALLENGE_THRESHOLD);
  });

  it("legt nog minstens één echt gat bloot: de set is niet volledig opgelost", () => {
    expect(
      found,
      "de challenge-set wordt volledig gehaald; voeg lastigere gevallen toe of promoveer deze naar de regressieset",
    ).toBeLessThan(total);
  });
});

describe("precisie op teksten die er alleen op lijken", () => {
  it("markeert bijna niets in teksten zonder persoonsgegevens", () => {
    const flagged = CLEAN_CORPUS.filter((t) => spansFor(t).length > 0);
    const rate = flagged.length / CLEAN_CORPUS.length;
    expect(
      rate,
      `behaald ${pct(1 - rate)} schoon, onterecht gemarkeerd: ${flagged.join(" | ")}`,
    ).toBeLessThanOrEqual(MAX_FALSE_POSITIVE_RATE);
  });

  it("markeert geen verboden categorieën in bijna-treffers", () => {
    const fouten: string[] = [];
    for (const sample of PRECISIE_CORPUS) {
      for (const span of spansFor(sample.text)) {
        if (sample.verboden.includes(span.category)) {
          fouten.push(`${span.category}: "${span.text}" in "${sample.text.slice(0, 40)}…"`);
        }
      }
    }
    expect(
      fouten.length,
      `${fouten.length} verboden markeringen: ${fouten.join(" | ")}`,
    ).toBeLessThanOrEqual(MAX_PRECISIE_FOUTEN);
  });
});
