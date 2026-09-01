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
];

/** Ondergrens per categorie. Bewust conservatief: liever te veel arceren. */
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

function overlapsFound(sample: Sample, label: { category: PiiCategory; text: string }): boolean {
  const signals = computeSignals(sample.text, [], DEFAULT_DETECTION_SETTINGS, new Set());
  const spans = [...signals.directPii, ...signals.contextualPii];
  return spans.some((s) => s.text.includes(label.text) || label.text.includes(s.text));
}

describe("detectie-ondergrens, synthetisch NL-onderwijscorpus", () => {
  const perCategory = new Map<PiiCategory, { found: number; total: number; missed: string[] }>();

  for (const sample of CORPUS) {
    for (const label of sample.labels) {
      const bucket = perCategory.get(label.category) ?? { found: 0, total: 0, missed: [] };
      bucket.total += 1;
      if (overlapsFound(sample, label)) bucket.found += 1;
      else bucket.missed.push(label.text);
      perCategory.set(label.category, bucket);
    }
  }

  for (const [category, threshold] of Object.entries(THRESHOLDS) as [PiiCategory, number][]) {
    it(`haalt de recall-drempel voor ${category} (>= ${threshold})`, () => {
      const bucket = perCategory.get(category);
      expect(bucket, `geen corpuslabels voor ${category}`).toBeDefined();
      const recall = bucket!.found / bucket!.total;
      expect(recall, `gemist: ${bucket!.missed.join(", ")}`).toBeGreaterThanOrEqual(threshold);
    });
  }
});
