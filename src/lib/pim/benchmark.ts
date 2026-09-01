// Zelfmeting van snelheid op de daadwerkelijke doelhardware (P1-3).
//
// De auditomgeving heeft geen WebGPU; die meting kan alleen op het apparaat
// van de school zelf. Deze module maakt dat zelf-verifieerbaar: de uitrolpartij
// draait de meting in Diagnostiek en leest de uitkomst af, zonder dat er iets
// het apparaat verlaat. Alle testtekst is verzonnen en blijft lokaal.
import { computeSignals } from "./risk";
import { DEFAULT_DETECTION_SETTINGS } from "./detectionSettings";
import { detectPersonsSlmDetailed, getNerRuntime, getNerStatus } from "./nerSlm";

const SAMPLE = [
  "Emma de Vries uit groep 7B heeft moeite met rekenen; moeder (s.dejong@voorbeeld.nl,",
  "06-12345678) wil een gesprek. Leerlingnummer 884321. Het gezin woont aan de",
  "Dorpsstraat 12, 5678 AB Best. Meester Ahmed Yilmaz noteerde dat piet jansen vaak",
  "te laat komt. Sanne Bakker is geboren op 03-04-2014 en zit sinds vorig jaar in",
  "klas 4H2. Voor de vergoeding is IBAN NL91ABNA0417164300 doorgegeven.",
].join(" ");

export interface BenchmarkResult {
  /** Aantal tekens dat per meting is verwerkt. */
  chars: number;
  /** Aantal herhalingen. */
  runs: number;
  /** Gemiddelde duur van de regel/lexicon-laag in ms. */
  rulesMsAvg: number;
  /** Tekens per seconde voor de regel/lexicon-laag. */
  rulesCharsPerSec: number;
  /** Gemiddelde duur van de taalmodel-laag in ms, als die geladen is. */
  nerMsAvg: number | null;
  /** Runtime waarop het taalmodel draaide. */
  nerRuntime: "webgpu" | "wasm" | null;
  /** Korte, leesbare uitkomst voor niet-technische lezers. */
  verdict: "snel" | "bruikbaar" | "traag";
}

/** Bouwt een tekst van ongeveer `targetChars` tekens uit het vaste voorbeeld. */
function buildText(targetChars: number): string {
  let out = SAMPLE;
  while (out.length < targetChars) out += " " + SAMPLE;
  return out.slice(0, targetChars);
}

/**
 * Meet de doorlooptijd van de detectie op dit apparaat. Draait de regellaag
 * altijd, en de taalmodel-laag alleen als het model al geladen is (anders zou
 * de meting een download bevatten in plaats van rekentijd).
 */
export async function runDetectionBenchmark(
  opts: { chars?: number; runs?: number } = {},
): Promise<BenchmarkResult> {
  const chars = opts.chars ?? 4000;
  const runs = opts.runs ?? 5;
  const text = buildText(chars);

  // Eén warme ronde, zodat JIT-opwarming niet als resultaat telt.
  computeSignals(text, [], DEFAULT_DETECTION_SETTINGS, new Set());

  const t0 = performance.now();
  for (let i = 0; i < runs; i++) {
    computeSignals(text, [], DEFAULT_DETECTION_SETTINGS, new Set());
  }
  const rulesMsAvg = (performance.now() - t0) / runs;

  let nerMsAvg: number | null = null;
  if (getNerStatus().ready) {
    const n0 = performance.now();
    await detectPersonsSlmDetailed(text);
    nerMsAvg = performance.now() - n0;
  }

  const totalMs = rulesMsAvg + (nerMsAvg ?? 0);
  const verdict: BenchmarkResult["verdict"] =
    totalMs < 250 ? "snel" : totalMs < 1500 ? "bruikbaar" : "traag";

  return {
    chars,
    runs,
    rulesMsAvg,
    rulesCharsPerSec: rulesMsAvg > 0 ? Math.round(chars / (rulesMsAvg / 1000)) : 0,
    nerMsAvg,
    nerRuntime: getNerRuntime(),
    verdict,
  };
}
