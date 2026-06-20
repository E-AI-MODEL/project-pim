// Centrale UI-copy voor Start & Go — spec derde analyse §15.
// Eén bron van waarheid; UI-componenten importeren hieruit.

export const COPY = {
  // Hero — werkt voor docent, bestuurder én tech-reviewer
  eyebrow: "Privacy Integrity Monitor",
  title: "Eerst veilig. Dan pas delen.",
  subtitle:
    "Plak je tekst, kies wat je ermee wilt doen, en zie binnen één seconde of het mag — met uitleg. Alles draait lokaal in je browser, niets verlaat dit apparaat tot een toegestane actie is goedgekeurd.",
  placeholder:
    "Plak hier — een leerlingnotitie, mentorgesprek, evaluatie, beleidstekst of e-mailconcept.",
  startButton: "Controleer met PiM",
  startButtonShort: "Controleer",
  privacyHint:
    "Lokaal verwerkt · geen upload · geen tracking · audit-spoor zonder ruwe tekst",
  detailsLink: "Toon details (modelstatus, regels, audit)",
  liveBadge: "Live mee­kijkend",

  // Verdict-zin — voor de docent, in mens-taal
  statusGreen:
    "Deze versie kan veilig de deur uit voor de actie die je koos.",
  statusOrange:
    "Bruikbaar, maar de context blijft herkenbaar. Lees de gemarkeerde plekken nog één keer na.",
  statusRed:
    "Niet delen. PiM vond directe persoonsgegevens of een route die voor dit profiel is uitgesloten.",

  // Headlines op de verdict-kaart
  resultHeadGreen: "Klaar om te delen",
  resultHeadOrange: "Bijna goed — even nakijken",
  resultHeadRed: "Geblokkeerd",

  // Verdict → primaire actie
  buttonAllow: "Kopieer de veilige versie",
  buttonAllowWarning: "Ik heb gecontroleerd — kopieer",
  buttonBlock: "Pas tekst aan en probeer opnieuw",

  // Drie-lagen uitleg per verdict (docent · bestuurder · tech)
  // De UI toont docent + bestuurder direct en tech achter "Toon details".
  layerTeacherAllow:
    "Namen, adressen en andere directe persoonsgegevens zijn weggehaald of vervangen.",
  layerLeaderAllow:
    "Conform AVG-minimalisatie: alleen pseudoniem of geaggregeerde context verlaat het apparaat.",
  layerTeacherWarn:
    "PiM heeft de hard herleidbare gegevens verwijderd, maar de combinatie van kenmerken kan voor insiders nog herkenbaar zijn.",
  layerLeaderWarn:
    "Restrisico op her-identificatie. Geschikt voor interne reflectie, niet voor externe verwerking zonder verwerkersovereenkomst.",
  layerTeacherBlock:
    "Er staan nog BSN, IBAN, telefoonnummers of namen in — of de gekozen actie past niet bij dit profiel.",
  layerLeaderBlock:
    "Fail-closed: PiM weigert export naar externe verwerkers wanneer harde PII aanwezig is of het profiel rules-only voorschrijft.",

  // Mode/doel
  modeAnonymous: "Anoniem",
  modeAnonymousHint: "Namen → rollen. Onomkeerbaar.",
  modePseudonymous: "Pseudoniem (lokaal)",
  modePseudonymousHint: "Namen → codes. Mapping blijft op dit apparaat.",
  targetLabel: "Waar gaat het naartoe?",
  targetExternalAi: "Externe AI (ChatGPT, Claude…)",
  targetCopy: "Klembord",
  targetExport: "Bestand opslaan",
  targetPrint: "Printer",
  targetShare: "Delen / link",
  targetDisplay: "Alleen op dit scherm",

  // Status-pill (§7.1)
  pillLocalActive: "Lokaal actief",
  pillLimited: "Beperkte detectie",
  pillNotReady: "Niet klaar",
  pillTagline: "Privacy-engine draait in je browser",

  // Burgermenu (§7.2)
  menuNewTest: "Nieuwe test",
  menuExamples: "Voorbeelden",
  menuExpertLab: "Expert lab",
  menuTrust: "Trust dashboard",
  menuPipeline: "Pipeline uitleg",
  menuModes: "Modi uitleg",
  menuCompliance: "Compliance",
  menuFlags: "Flags",
  menuSettings: "Instellingen",
  menuAbout: "Over Project PiM",
} as const;