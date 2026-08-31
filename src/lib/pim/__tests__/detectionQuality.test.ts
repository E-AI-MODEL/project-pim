// Datagedreven detectiekwaliteit: dekt de PII-soorten die in schoolteksten
// voorkomen, plus een paar bekende valkuilen (kleine letters, tussenvoegsels,
// samengestelde achternamen, leerlingnummer met en zonder hoofdletter).
import { describe, expect, it } from "vitest";
import { computeSignals } from "../risk";
import { anonymize } from "../processing";
import { DEFAULT_DETECTION_SETTINGS } from "../detectionSettings";

const TEXT = `Verslag over incident
Op dinsdag 14 mei 2025 was er een incident in groep 7B van de Jan van Brabant school in Eindhoven.
Leerling Emma de Vries (leerlingnummer 12345) raakte betrokken bij een conflict.
Ook piet jansen uit klas 4H2 was erbij, samen met Youssef El Amrani.
De ouders, mevrouw Sarah de Vries (e-mailadres: sarah.devries@email.nl, tel 06-12345678), wonen aan de Dorpsstraat 12 in Best.
BSN 123456782, IBAN NL91ABNA0417164300, geboren 03-04-2014. Leerlingnummer: 987654.`;

const signals = computeSignals(TEXT, [], DEFAULT_DETECTION_SETTINGS, new Set());
const all = [...signals.directPii, ...signals.contextualPii];
const safe = anonymize(TEXT, signals).text;

const EXPECTED: [string, string][] = [
  ["naam met tussenvoegsel", "Emma de Vries"],
  ["samengestelde achternaam", "Youssef El Amrani"],
  ["naam in kleine letters bij klas", "piet jansen"],
  ["naam met aanhef", "mevrouw Sarah de Vries"],
  ["e-mail", "sarah.devries@email.nl"],
  ["telefoon", "06-12345678"],
  ["adres", "Dorpsstraat 12"],
  ["bsn", "123456782"],
  ["iban", "NL91ABNA0417164300"],
  ["geboortedatum", "03-04-2014"],
  ["leerlingnummer klein", "12345"],
  ["leerlingnummer hoofdletter", "987654"],
  ["klascode", "4H2"],
  ["groep met letter", "groep 7B"],
  ["plaatsnaam", "Eindhoven"],
];

describe("detectiekwaliteit, schoolverslag", () => {
  it.each(EXPECTED)("herkent %s", (_label, fragment) => {
    expect(all.some((s) => s.text.includes(fragment) || fragment.includes(s.text))).toBe(true);
  });

  it("kent de juiste categorieen toe aan harde PII", () => {
    const byText = new Map(all.map((s) => [s.text, s.category]));
    expect(byText.get("sarah.devries@email.nl")).toBe("email");
    expect(byText.get("06-12345678")).toBe("phone");
    expect(byText.get("123456782")).toBe("bsn");
    expect(byText.get("NL91ABNA0417164300")).toBe("iban");
    expect(byText.get("12345")).toBe("student_id");
    expect(byText.get("987654")).toBe("student_id");
  });

  it("laat geen harde PII achter in de veilige versie", () => {
    for (const frag of [
      "Emma de Vries",
      "piet jansen",
      "Youssef El Amrani",
      "sarah.devries@email.nl",
      "06-12345678",
      "123456782",
      "NL91ABNA0417164300",
      "12345",
      "987654",
    ]) {
      expect(safe).not.toContain(frag);
    }
  });

  it("houdt de veilige versie leesbaar, geen kapotte of geneste labels", () => {
    expect(safe).not.toMatch(/\[[^\]]*\[/);
    expect(safe.split("\n").length).toBe(TEXT.split("\n").length);
    expect(safe).toContain("Verslag over");
  });

  it("markeert een schone tekst niet", () => {
    const clean = computeSignals(
      "De methode werkt beter, leerlingen scoren gemiddeld hoger op de weektoets.",
      [],
      DEFAULT_DETECTION_SETTINGS,
      new Set(),
    );
    expect(clean.directPii.length).toBe(0);
  });

  it("detecteert tekst die na een eerdere analyse wordt toegevoegd", () => {
    const later = computeSignals(
      TEXT + "\nLater toegevoegd: Karim el Fassi, groep 4A, tel 0612345678.",
      [],
      DEFAULT_DETECTION_SETTINGS,
      new Set(),
    );
    const texts = [...later.directPii, ...later.contextualPii].map((s) => s.text).join(" | ");
    expect(texts).toContain("Karim");
    expect(texts).toContain("0612345678");
  });
});
