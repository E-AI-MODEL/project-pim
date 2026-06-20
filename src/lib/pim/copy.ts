// Centrale UI-copy voor Start & Go — spec derde analyse §15.
// Eén bron van waarheid; UI-componenten importeren hieruit.

export const COPY = {
  // §15
  title: "Test tekst voordat je die deelt met AI",
  subtitle:
    "PiM maakt eerst een veilige versie. Alles draait lokaal in je browser. Delen kan pas als de gekozen actie is toegestaan.",
  placeholder: "Plak hier een docentnotitie, leerlingtekst of verslag...",
  startButton: "Start PiM",
  privacyHint:
    "Je tekst blijft in deze browser totdat jij een toegestane actie kiest.",
  detailsLink: "Waarom dit oordeel?",

  // §10 statusteksten (exact)
  statusGreen: "Deze draft lijkt veilig genoeg voor de gekozen actie.",
  statusOrange:
    "Deze draft is bruikbaar, maar de context kan herkenbaar zijn. Controleer de details.",
  statusRed:
    "Niet delen. PiM vond nog directe persoonsgegevens of een verboden route.",

  // §15 resultaatkoppen
  resultHeadGreen: "Veilige draft klaar",
  resultHeadOrange: "Controle nodig",
  resultHeadRed: "Niet delen",

  // §10 verdict → primaire knop
  buttonAllow: "Kopieer veilige tekst",
  buttonAllowWarning: "Controleer en kopieer",
  buttonBlock: "Maak opnieuw veilig",

  // Mode/doel
  modeAnonymous: "Anoniem",
  modePseudonymous: "Pseudoniem (lokaal)",
  targetLabel: "Doel",
  targetExternalAi: "Externe AI",
  targetCopy: "Kopiëren",
  targetExport: "Export bestand",
  targetPrint: "Print",
  targetShare: "Delen",
  targetDisplay: "Lokaal tonen",

  // Status-pill (§7.1)
  pillLocalActive: "lokaal actief",
  pillLimited: "beperkte detectie",
  pillNotReady: "niet klaar",

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