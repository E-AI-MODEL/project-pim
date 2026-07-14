// Centrale UI-copy voor Start & Go — spec derde analyse §15.
// Eén bron van waarheid; UI-componenten importeren hieruit.

export const COPY = {
  // Hero — werkt voor docent, bestuurder én tech-reviewer
  eyebrow: "Privacy Integrity Monitor",
  title: "Controleer je tekst op privacy,",
  titleLine2: "voordat je hem deelt.",
  subtitle:
    "PiM leest mee in je browser, herkent gevoelige gegevens en zegt of je veilig kunt delen — alles gebeurt lokaal, zonder ingewikkelde technische stappen.",
  placeholder: "Plak of typ je tekst — of kies hieronder een voorbeeld.",
  startButton: "Controleer deze tekst",
  startButtonShort: "Controleer",
  privacyHint: "Verwerking blijft in je browser. Geen upload, geen tracking.",
  detailsLink: "Toon technische details (modelstatus, regels, audit)",
  liveBadge: "Leest mee",

  // USP-grid op de landing — 2×2
  uspLocalTitle: "Niets verlaat je apparaat",
  uspLocalBody:
    "De controle gebeurt in je browser. Geen upload, geen server, geen log van je tekst.",
  uspDualTitle: "Anoniem of pseudoniem",
  uspDualBody:
    "Anoniem maakt namen definitief onleesbaar. Pseudoniem vervangt ze door codes — de sleutel blijft op dit apparaat.",
  uspExplainTitle: "Uitleg per rol",
  uspExplainBody:
    "Eén verdict, drie lezingen: wat het voor jou betekent, voor je organisatie en voor je tech-collega.",
  uspEgressTitle: "Egress Guard",
  uspEgressBody:
    "De uitgang zit op slot. PiM verstuurt niets — pas nadat jij de actie goedkeurt, gaat de veilige versie eruit.",

  // Mini-strip onderaan
  anonVsPseudo:
    "Anoniem is onomkeerbaar. Pseudoniem is omkeerbaar, maar alleen op dit apparaat. Jij kiest per tekst wat past.",

  // Monitor frame
  monitorLabel: "Live monitor",
  monitorStatus: "Local Guard actief",
  monitorEmptyHint: "Kies een voorbeeld of typ je eigen tekst — PiM geeft direct een verdict.",

  // Verdict-zin — voor de docent, in mens-taal
  statusGreen: "Deze versie is veilig genoeg voor de actie die je koos.",
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
  pillNotReady: "Controle nodig",
  pillTagline: "De privacy-engine draait in je browser",

  // Burgermenu (§7.2)
  menuNewTest: "Nieuwe tekst",
  menuExamples: "Voorbeelden",
  menuWriter: "Schrijven",
  menuExpertLab: "Tech-expert lab",
  menuTrust: "Vertrouwensdashboard",
  menuPipeline: "Hoe de pipeline werkt",
  menuModes: "Verwerkingsmodi",
  menuCompliance: "Compliance",
  menuFlags: "Beslissingscodes",
  menuSettings: "Instellingen",
  menuClearStorage: "Lokale opslag wissen",
  menuAbout: "Over Project PiM",

  // Tech-laag — voor de tech-collega / reviewer
  layerTechAllow:
    "Verdict ALLOW · draftCheck=pass · payloadType=draft_anonymous_certified. Egress-reconsult draait opnieuw async NER op de exacte payload.",
  layerTechWarn:
    "Verdict ALLOW_WITH_WARNING · risk net onder drempel of repair-status op draft. Reconsult vóór egress blijft van kracht; mapping/raw nooit egress.",
  layerTechBlock:
    "Verdict BLOCK · zie ruleId / reasonCode. Fail-closed: residuele directe PII, mode-mix, payloadType ≠ draft_anonymous_certified, of profiel-policy blokkeert deze actie.",
} as const;
