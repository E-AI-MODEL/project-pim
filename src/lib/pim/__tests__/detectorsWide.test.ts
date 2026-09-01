import { describe, expect, it } from "vitest";
import { detectPii } from "../detectors";
import type { PiiCategory } from "../types";

function found(text: string): Array<[PiiCategory, string]> {
  return detectPii(text).map((s) => [s.category, s.text] as [PiiCategory, string]);
}

function hasCategory(text: string, category: PiiCategory): boolean {
  return detectPii(text).some((s) => s.category === category);
}

describe("detectors, slordige notatie en varianten", () => {
  it("herkent versluierde e-mail", () => {
    expect(hasCategory("mail: sanne.devries (at) school punt nl", "email")).toBe(true);
    expect(hasCategory("bereikbaar op jan [at] example.nl", "email")).toBe(true);
  });

  it("herkent telefoonnummers met punten, haakjes en landcode", () => {
    for (const t of ["06.12.34.56.78", "+31(0)6 12345678", "0031 6 1234 5678", "06-12345678"]) {
      expect(hasCategory(t, "phone")).toBe(true);
    }
  });

  it("herkent BSN met scheidingstekens maar alleen bij een geldige elfproef", () => {
    expect(hasCategory("BSN 123.456.782", "bsn")).toBe(true);
    expect(hasCategory("BSN 123.456.789", "bsn")).toBe(false);
  });

  it("herkent IBAN met spaties en kleine letters, en weigert onzin", () => {
    expect(hasCategory("IBAN nl91 abna 0417 1643 00", "iban")).toBe(true);
    expect(hasCategory("IBAN NL00ABNA0000000000", "iban")).toBe(false);
  });

  it("herkent postcode zonder spatie of in kleine letters", () => {
    expect(hasCategory("woont in 1234ab Amsterdam", "postcode")).toBe(true);
    expect(hasCategory("we spreken om 1000 uur af", "postcode")).toBe(false);
  });

  it("herkent leerlingnummer bij meer trefwoorden", () => {
    expect(hasCategory("lln nr. 123456", "student_id")).toBe(true);
    expect(hasCategory("examennummer 98765", "student_id")).toBe(true);
  });

  it("herkent klas- en groepsvarianten", () => {
    for (const t of ["groep 7b", "gr. 7", "klas2a", "brugklas 1c", "leerjaar 3"]) {
      expect(detectPii(t).length).toBeGreaterThan(0);
    }
    expect(detectPii("4-vwo").length).toBeGreaterThan(0);
    expect(detectPii("havo 4").length).toBeGreaterThan(0);
  });

  it("herkent initialen, tussenvoegsels en koppelnamen", () => {
    expect(hasCategory("J.P. de Vries", "name")).toBe(true);
    expect(hasCategory("leerling j.p. de vries", "name")).toBe(true);
    expect(hasCategory("vd Berg", "name")).toBe(true);
    expect(hasCategory("Jan-Peter Bakker", "name")).toBe(true);
  });

  it("herkent adres, postbus en zakelijke nummers", () => {
    expect(hasCategory("Kerkstraat 12a", "address")).toBe(true);
    expect(hasCategory("Postbus 1234", "address")).toBe(true);
    expect(hasCategory("KvK nummer 12345678", "id_document")).toBe(true);
    expect(hasCategory("Polisnummer: AB1234567", "id_document")).toBe(true);
  });

  it("herkent MAC-adres en domein zonder protocol, zonder eindpunt mee te nemen", () => {
    expect(hasCategory("MAC 00:1A:2B:3C:4D:5E", "ip_address")).toBe(true);
    const url = detectPii("zie school.nl/leerlingen/123.").find((s) => s.category === "url");
    expect(url?.text).toBe("school.nl/leerlingen/123");
  });

  it("herkent datums met punten en afgekorte maanden", () => {
    expect(detectPii("01.01.2026").length).toBeGreaterThan(0);
    expect(detectPii("afspraak 1 jan 2026").length).toBeGreaterThan(0);
  });

  it("laat een telefoonpatroon binnen een IBAN de IBAN niet wegknippen", () => {
    const spans = found("IBAN nl91 abna 0417 1643 00.");
    expect(spans.some(([c]) => c === "iban")).toBe(true);
    expect(spans.some(([c]) => c === "phone")).toBe(false);
  });

  it("markeert neutrale zinnen niet", () => {
    const neutraal =
      "Vandaag ging het goed in de les en we hebben met plezier gewerkt aan de opdracht.";
    expect(detectPii(neutraal)).toHaveLength(0);
  });
});

describe("namen in kleine letters", () => {
  it("herkent voor- en achternaam met tussenvoegsel", () => {
    expect(hasCategory("gisteren sprak ik jan de vries hierover", "name")).toBe(true);
    expect(hasCategory("sanne van den berg belde", "name")).toBe(true);
  });

  it("herkent een achternaam-vorm zonder tussenvoegsel", () => {
    expect(hasCategory("ik zag jan jansen op het plein", "name")).toBe(true);
  });

  it("herkent een enkele naam na een rolwoord of werkwoord", () => {
    expect(hasCategory("de moeder van youssef belde", "name")).toBe(true);
    expect(hasCategory("sanne huilde in de klas", "name")).toBe(true);
  });

  it("markeert een echo van een eerder gevonden naam", () => {
    const spans = detectPii("Emma de Vries kwam binnen. Later vertrok emma weer.");
    expect(spans.some((s) => s.text === "emma")).toBe(true);
  });

  it("laat gewone zinnen met rust", () => {
    for (const t of [
      "Vandaag ging het goed in de les en we hebben met plezier gewerkt aan de opdracht.",
      "We bespreken de planning van volgende week.",
    ]) {
      expect(detectPii(t).filter((s) => s.category === "name")).toHaveLength(0);
    }
  });
});
