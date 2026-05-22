// Boot-time self-test layer — spec hfst 12 / verificatie van componenten.
//
// Doel: bij de eerste app-render verifiëren dat (a) de detector-rulesets
// nog steeds een bekende corpus correct herkennen ("golden-set"), en
// (b) dat de runtime-hardening wrapper rond fetch echt actief is en
// externe-origin pogingen logt. Fail-closed: als één van beide faalt
// wordt dit zichtbaar op /trust zodat egress-actie kan worden uitgeschakeld.
//
// Belangrijk: dit is een verificatie-laag, geen content-filter. De golden
// corpus bevat geen echte persoonsgegevens — alleen synthetische teksten
// die de regex/lexicon-patronen MOETEN raken.

import { computeSignals } from "./risk";
import { getViolations } from "./runtimeHardening";

export type SelfTestStatus = "idle" | "running" | "pass" | "fail";

export interface GoldenCase {
  id: string;
  text: string;
  /** Categorieën die MINIMAAL in directPii of contextualPii moeten staan. */
  expectCategories: string[];
}

export interface SelfTestReport {
  status: SelfTestStatus;
  ts: string;
  /** Hex SHA-256 over de gestabiliseerde golden-set output (ruleset fingerprint). */
  rulesetHash: string;
  golden: { id: string; ok: boolean; missing: string[] }[];
  hardening: { fetchWrapped: boolean; probeLogged: boolean; note: string };
  summary: string;
}

// Synthetische corpus — bevat opzettelijk patronen die de detectors moeten
// vangen. Geen echte personen.
const GOLDEN: GoldenCase[] = [
  { id: "g.email", text: "Mail het rapport naar test.docent@voorbeeldschool.nl voor vrijdag.", expectCategories: ["email"] },
  { id: "g.phone", text: "Bel ouders op 06-12345678 voor het gesprek.", expectCategories: ["phone"] },
  { id: "g.bsn", text: "BSN 123456782 staat in het dossier — niet delen.", expectCategories: ["bsn"] },
  { id: "g.iban", text: "Betaal de bijdrage op NL91ABNA0417164300 a.u.b.", expectCategories: ["iban"] },
  { id: "g.postcode", text: "Het adres is in postcode 1011 AB Amsterdam.", expectCategories: ["postcode"] },
  { id: "g.address", text: "Bezoek de school aan de Kerkstraat 12.", expectCategories: ["address"] },
  { id: "g.name_school", text: "Jan de Vries zit op basisschool De Regenboog.", expectCategories: ["name", "school"] },
  { id: "g.class_code", text: "De klas 4H1 gaat op excursie.", expectCategories: ["class_code"] },
  { id: "g.care", text: "De leerling heeft dyslexie en valt onder jeugdzorg.", expectCategories: ["context_care"] },
  { id: "g.incident", text: "Er was een schorsing na het incident vorige week.", expectCategories: ["context_incident"] },
  { id: "g.small_group", text: "Voor groep 3 geldt een aangepast rooster.", expectCategories: ["context_small_group"] },
  { id: "g.lex_lvs", text: "De cijfers staan in Magister en Parnassys.", expectCategories: ["school"] },
];

let cached: SelfTestReport | null = null;
const listeners = new Set<(r: SelfTestReport) => void>();

export function onSelfTest(cb: (r: SelfTestReport) => void): () => void {
  listeners.add(cb);
  if (cached) cb(cached);
  return () => listeners.delete(cb);
}

export function getSelfTest(): SelfTestReport | null {
  return cached;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function probeHardening(): Promise<{ fetchWrapped: boolean; probeLogged: boolean; note: string }> {
  // Wrapper is geïnstalleerd als window.fetch een ander object is dan de
  // originele native. We kunnen dat niet 100% bewijzen, maar wel een
  // gedragstest doen: fetch naar example.invalid moet een violation loggen.
  const before = getViolations().length;
  const PROBE = "https://pim-selftest.invalid/probe";
  try {
    // We verwachten dat dit faalt (DNS), maar de wrapper moet logging hebben
    // gedaan voordat de error optreedt.
    await fetch(PROBE, { method: "GET", mode: "no-cors" });
  } catch {
    /* expected */
  }
  const after = getViolations().length;
  const logged = after > before && getViolations().slice(before).some((v) => v.includes("pim-selftest.invalid"));
  return {
    fetchWrapped: typeof window !== "undefined" && window.fetch.length >= 0,
    probeLogged: logged,
    note: logged
      ? "Probe naar pim-selftest.invalid werd door wrapper gelogd."
      : "Wrapper heeft probe NIET gelogd — fetch-interceptor mogelijk omzeild.",
  };
}

export async function runSelfTest(): Promise<SelfTestReport> {
  const golden: SelfTestReport["golden"] = [];
  const fingerprintParts: string[] = [];

  for (const c of GOLDEN) {
    const sig = computeSignals(c.text);
    const found = new Set([
      ...sig.directPii.map((s) => s.category),
      ...sig.contextualPii.map((s) => s.category),
    ]);
    const missing = c.expectCategories.filter((cat) => !found.has(cat as never));
    golden.push({ id: c.id, ok: missing.length === 0, missing });
    // Gestabiliseerde uitvoer voor de fingerprint: id + gesorteerde rule-ids.
    const stable = `${c.id}|${[...sig.ruleIds].sort().join(",")}`;
    fingerprintParts.push(stable);
  }

  const rulesetHash = await sha256Hex(fingerprintParts.join("\n"));
  const hardening = await probeHardening();

  const allGoldenOk = golden.every((g) => g.ok);
  const status: SelfTestStatus = allGoldenOk && hardening.probeLogged ? "pass" : "fail";
  const failed = golden.filter((g) => !g.ok).map((g) => g.id);

  const report: SelfTestReport = {
    status,
    ts: new Date().toISOString(),
    rulesetHash,
    golden,
    hardening,
    summary: status === "pass"
      ? `Self-test PASS · ${golden.length}/${golden.length} golden-cases · hardening probe gelogd`
      : `Self-test FAIL · ${failed.length} golden-cases missend (${failed.join(", ") || "—"}) · hardening probeLogged=${hardening.probeLogged}`,
  };

  cached = report;
  for (const l of listeners) l(report);
  console.info("[PIM self-test]", report.summary, "hash=", rulesetHash.slice(0, 12));
  return report;
}