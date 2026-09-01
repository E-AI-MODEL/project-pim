# Lokale AI duidelijker aanbieden + namen met kleine letters oppakken

## 1. Lokale AI wordt een echt aanbod, geen voetnoot

Nu staat het alleen als klein grijs regeltje ("BERT 100 MB niet geladen · Zet aan") onderin de schrijfwerkruimte, en verder verstopt in de zijbalk bij Instellingen. In Tekst nakijken is het helemaal niet zichtbaar.

Er komt één gedeelde aanbodkaart die in beide werkruimtes boven de bevindingen staat, zolang de lokale AI nog niet aan staat:

```text
[ ✦ Zet de lokale AI aan                                    ]
[ Herkent ook namen die geen vaste vorm hebben.             ]
[ Eenmalige download van ~100 MB, daarna blijft alles       ]
[ in je browser.                                            ]
[ [ Zet lokale AI aan ]        Werken zonder AI kan ook     ]
```

- Zichtbaar in Tekst nakijken én Zelf schrijven, op dezelfde plek en in dezelfde stijl.
- Tijdens het laden verandert de kaart in een voortgangsregel ("Model laden, 42%"), daarna in een rustige groene bevestiging die vanzelf naar de statusregel verdwijnt.
- Bij een fout: korte uitleg plus "Opnieuw proberen".
- De gebruiker kan de kaart wegklikken voor deze sessie; de bestaande "Zet aan" in de statusregel en de schakelaar in Instellingen blijven bestaan als terugval.
- Staat de AI uit in Instellingen (BERT = uit), dan verschijnt de kaart niet.

## 2. Namen met kleine letters ruimer oppakken

De naamregels eisen nu bijna overal een hoofdletter. Kleine letters worden alleen gepakt na een sterke aanleiding ("ik heet jan"), in een opsomming, of vlak voor een klas/groep. "gisteren sprak ik jan de vries" of "sanne huilde" glipt er dus doorheen.

Omdat er een arceerstap tussen zit (jij beslist per markering) mag de detectie ruimer zijn:

- Voor- en achternaam in kleine letters overal in de tekst, inclusief tussenvoegsels ("jan de vries", "sanne van den berg", "youssef el amrani"), met een stopwoordenlijst voor gewone woordparen.
- Enkele naam in kleine letters direct na een rolwoord: leerling, leerlinge, ouder, moeder, vader, broer, zus, mentor, juf, meester, meneer, mevrouw, collega, verzorger.
- Enkele naam in kleine letters bij een persoonlijk werkwoord of bezit ("… zei", "… vertelde", "… huilde", "…'s moeder", "de moeder van …").
- Kleine letters bij bestaande cues die nu alleen hoofdletters aankunnen: aanhef in kleine letters ("dhr. jansen", "juf karin"), initialen ("j.p. de vries"), koppelnamen ("jan-peter"), apostrofnamen ("'t hart").
- Namen die al elders in de tekst mét hoofdletter zijn gevonden, worden ook in kleine-letter-vorm gemarkeerd in de rest van de tekst.

Deze ruime regels krijgen een lagere zekerheid en tellen als contextsignaal, zodat:
- ze wel gearceerd worden en in de bevindingen komen,
- ze het eindoordeel niet onterecht op "niet delen" zetten,
- de drempels in Instellingen blijven werken.

Om ruis beheersbaar te houden gaat de stopwoordenlijst mee omhoog: veelgebruikte schoolwoorden, werkwoorden, plaats- en tijdwoorden worden uitgesloten.

## Technische uitwerking

- Nieuw `src/components/pim/product/LocalAiOffer.tsx`: leest `usesNerSlm`, `nerEnabled`, `nerStatus`, `startNer` uit `ProductShellContext`; rendert aanbod, voortgang, fout of niets. Gebruikt in `modes/CheckMode.tsx` en `writer/WriterWorkspace.tsx`.
- `WriterStatusBar` in `WriterWorkspace.tsx` blijft, maar zonder dubbele nadruk.
- `src/lib/pim/detectors.ts`: nieuwe/verruimde `name`-regels (`rule.name_lower_pair`, `rule.name_lower_role`, `rule.name_lower_verb`, casing-tolerante varianten van `name_titled` en `name_initials`), plus een naverwerkingsstap die eerder gevonden namen hoofdletterongevoelig terugzoekt in de tekst. Nieuwe regels `contextual: true` met confidence rond 0.45-0.6.
- Stopwoordenlijst uit `detectors.ts` centraliseren zodat de nieuwe regels dezelfde lijst delen.
- Tests: uitbreiding van `detectorsWide.test.ts` en `detectionQuality.test.ts` met kleine-letter-gevallen en negatieve gevallen (neutrale zinnen blijven schoon); UI-test dat de AI-aanbodkaart in beide modi verschijnt en na starten verdwijnt.
