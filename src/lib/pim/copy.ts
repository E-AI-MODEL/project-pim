// Centrale UI-copy voor Start & Go — spec derde analyse §15.
// Eén bron van waarheid; UI-componenten importeren hieruit.

export const COPY = {
  // Hero — werkt voor docent, bestuurder én tech-reviewer
  eyebrow: "Privacy Integrity Monitor",
  title: "Eerst veilig. Dan pas delen.",
  subtitle:
    "Plak je tekst, kies wat je ermee wilt doen, en zie binnen één seconde of het mag — met uitleg. Alles draait lokaal in je browser, niets verlaat dit apparaat tot een toegestane actie is goedgekeurd.",
  placeholder:
    "Plak hier je tekst — bijvoorbeeld een leerlingnotitie, een mentorgesprek, een evaluatie of een e-mailconcept.",
  startButton: "Controleer deze tekst",
  startButtonShort: "Controleer",
  privacyHint:
    "Verwerking blijft in je browser; geen upload, geen tracking, en de audit-log bevat nooit je tekst.",
  detailsLink: "Toon technische details (modelstatus, regels, audit)",
  liveBadge: "Leest met je mee",

  // Verdict-zin — voor de docent, in mens-taal
  statusGreen:
    "Deze versie is veilig genoeg voor de actie die je koos.",
  statusOrange:
    "Bruikbaar, maar de context blijft herkenbaar. Lees de gemarkeerde stukken nog één keer rustig na.",
  statusRed:
    "Niet delen. PiM vond herleidbare persoonsgegevens, of deze actie is voor dit profiel niet toegestaan.",

  // Headlines op de verdict-kaart
  resultHeadGreen: "Klaar om te delen",
  resultHeadOrange: "Bijna klaar — nog even nalezen",
  resultHeadRed: "Geblokkeerd",

  // Verdict → primaire actie
  buttonAllow: "Voer de gekozen actie uit",
  buttonAllowWarning: "Ik heb het nagelezen — ga door",
  buttonBlock: "Tekst aanpassen en opnieuw proberen",

  // Drie-lagen uitleg per verdict (docent · bestuurder · tech)
  layerTeacherAllow:
    "Namen, adressen en andere direct herleidbare gegevens zijn weggehaald of vervangen.",
  layerLeaderAllow:
    "Voldoet aan dataminimalisatie uit de AVG: alleen geanonimiseerde of pseudonieme inhoud verlaat dit apparaat.",
  layerTeacherWarn:
    "De duidelijke persoonsgegevens zijn weg, maar de combinatie van kenmerken kan voor wie de situatie kent nog herkenbaar zijn.",
  layerLeaderWarn:
    "Er blijft een restrisico op her-identificatie. Geschikt voor intern gebruik; voor externe verwerking is een verwerkersovereenkomst nodig.",
  layerTeacherBlock:
    "Er staan nog persoonsgegevens in (zoals een naam, BSN, IBAN of telefoonnummer), of deze actie past niet bij het gekozen profiel.",
  layerLeaderBlock:
    "PiM blokkeert standaard bij twijfel: zodra er herleidbare persoonsgegevens aanwezig zijn, of het profiel alleen vaste regels toelaat, gaat er niets naar buiten.",

  // Mode/doel
  modeAnonymous: "Anoniem",
  modeAnonymousHint: "Namen worden vervangen door rollen. Niet terug te draaien.",
  modePseudonymous: "Pseudoniem (lokaal)",
  modePseudonymousHint: "Namen worden vervangen door codes. De koppeling blijft op dit apparaat.",
  targetLabel: "Bestemming",
  targetExternalAi: "Externe AI (ChatGPT, Claude…)",
  targetCopy: "Naar het klembord",
  targetExport: "Opslaan als bestand",
  targetPrint: "Printer",
  targetShare: "Delen via link",
  targetDisplay: "Alleen op dit scherm",

  // Status-pill (§7.1)
  pillLocalActive: "Lokaal actief",
  pillLimited: "Beperkte detectie",
  pillNotReady: "Nog niet gereed",
  pillTagline: "De privacy-engine draait in je browser",

  // Burgermenu (§7.2)
  menuNewTest: "Nieuwe controle",
  menuExamples: "Voorbeelden",
  menuExpertLab: "Expert lab",
  menuTrust: "Vertrouwensdashboard",
  menuPipeline: "Hoe de pipeline werkt",
  menuModes: "Verwerkingsmodi",
  menuCompliance: "Compliance",
  menuFlags: "Beslissingscodes",
  menuSettings: "Instellingen",
  menuAbout: "Over Project PiM",
} as const;