## Doel

Drie verbeteringen, mét correcte woordkeuze: **PiM blokkeert geen tekst** — het vervangt gevoelige woorden door een placeholder/label, of laat jou kiezen (die keuze is pas mogelijk nadat het in-browser model is gedownload).

1. **Geavanceerd-menu** simpeler + Expert duidelijk + cijfers vervangen door uitleg.
2. **"Gum"-functie** controleren en verduidelijken.
3. **Word-functie** controleren op missende features.

---

## 1. Geavanceerd-menu — uitleg vóór cijfers, juiste woorden

### Woordgebruik (overal toepassen, geen "blokkeren")

| Niet meer | Wel |
|---|---|
| "blokkeert de actie" | "vervangt het woord door een label, bv. `[naam]` of `[bsn]`" |
| "drempel waarop PiM blokkeert" | "gevoeligheid: hoe snel PiM een woord vervangt of markeert" |
| "streng = vaker blokkeren" | "streng = sneller vervangen / markeren" |

Korte uitleg-blok bovenaan paneel:
> PiM stopt nooit je tekst. Het **vervangt** harde PII (BSN, e-mail, telefoon, IBAN) direct door een label zoals `[bsn]`. Voor twijfelgevallen (namen, context) krijg je een **keuze**: vervangen of laten staan. Die keuze-modus werkt pas nadat het NER-model in je browser is gedownload (zie Modellen).

### A. Basis vs Expert-toggle

Bovenaan paneel: **Basis · Expert**.

- **Basis** (default): profielkeuze + 3 grote knoppen per actie (Streng / Standaard / Soepel) + per-categorie aan/uit met uitleg. Geen percentages.
- **Expert**: zelfde + sliders + getalswaardes + Modellen-tab. Gele info-strook:
  > **Expert-modus.** Je stelt de gevoeligheid handmatig in (0–100). Hoger = PiM laat meer staan, lager = vervangt sneller. Niet zeker? Kies een profiel of klik Standaard.

### B. Gevoeligheid per bestemming — 3 knoppen i.p.v. naakte slider

Per actie (Externe AI, Bestand, Printer, Klembord, Link delen, Lokaal opslaan, Alleen scherm):

```
Externe AI                              [ Streng ] [ Standaard ] [ Soepel ]
ChatGPT, Copilot, Gemini buiten je organisatie.
→ Streng: vervangt al bij 1 signaal (bv. één naam).
```

Uitleg-regel verandert mee per niveau (geen percentage in Basis):

| Niveau | Wat PiM doet |
|---|---|
| Streng | Vervangt direct bij elk signaal — ook twijfelgevallen |
| Standaard | Vervangt harde PII direct, twijfel krijg je als keuze |
| Soepel | Vervangt alleen overduidelijke treffers, rest laat staan |

In **Expert** verschijnt eronder de slider met label:
*"Gevoeligheid: 0,65 — PiM vervangt vanaf score 65/100. Lager = strenger."*

### C. Profiel-kaarten

2e regel "Wanneer kiezen?":
- *Strikt* — klassenlijsten, oudergesprekken, leerlingdossiers
- *Gebalanceerd* — dagelijks werk, AI-tools
- *Soepel* — interne notities, brainstorm

### D. Detectoren

Rode info-strook: *"Uit = PiM ziet die categorie niet meer en vervangt niets in die groep. Alleen doen voor demo of false-positive debug."*. Per categorie korte `title`-tooltip met voorbeeld.

### E. Modellen-tab (Expert)

Bovenaan: *"NER-model nodig voor de keuze-modus op namen en context. 'Verified' = exact gematcht op onze hash-lijst. 'Failed' = niet gebruiken, herlaad de pagina."*

Geen wijziging in `lib/pim`-logica, alleen UI + copy.

## 2. "Gum" controleren

**Composer — `InputPanel.tsx` "Live wissen"**
- Werkt: 350 ms debounce, `anonymize()` vervangt directe PII door label, rode flash.
- Bug: cursor springt altijd naar `cleaned.length`. Fix: alleen verplaatsen als de vervanging vóór de cursor zat.
- Eerste-keer mini-toast: *"Live wissen actief — BSN, e-mail, telefoon en IBAN worden direct vervangen door een label."*

**Writer — `WriterShell.tsx` Auto-wis/Markeer-popover**
- Werkt: harde PII achteraan vervangen, 1-char cursor-marge ✅
- Overbodige `*Key`-strings in deps opruimen.
- Popover-copy: *"Auto-wis = meteen vervangen door label · Markeer = onderstrepen, jij klikt om te vervangen of laten staan."* (geen "blokkeer"-woord).

## 3. Word-functie (`docxIO.ts`)

| Aspect | Status | Actie |
|---|---|---|
| Import tekst/headings/lijsten (mammoth) | ✅ | — |
| Afbeeldingen in docx | stilzwijgend genegeerd | Waarschuwing "Afbeeldingen niet meegenomen" |
| `result.messages` mammoth-warnings | nu genegeerd | Teruggeven, tonen als gele strook |
| Export `bold`/`italic` | ✅ | — |
| Export `underline`/`strike` | **ontbreekt** | Toevoegen in `runsFor()` |
| Export heading 3 | ✅ | — |
| Paginaformaat | niet gezet, inconsistent | Expliciet A4 (11906×16838 DXA) + 2,5 cm marges |
| Bestandsnaam timestamp | ✅ | — |
| Plakken uit Word | Tiptap native ✅ | QA |
| Auto-redact na import | `update`-event triggert scan ✅ | — |
| Genested lijsten | platgeslagen | FIXME-comment |

## Files

- `src/components/pim/start-go/AdvancedPanel.tsx` — Basis/Expert-toggle, 3 knop-niveaus, herschreven uitleg ("vervangen" i.p.v. "blokkeren"), info-strook bovenaan.
- `src/components/pim/start-go/InputPanel.tsx` — cursor-fix Live wissen, eerste-keer toast.
- `src/components/pim/writer/WriterShell.tsx` — popover-copy, deps opruimen, import-warnings tonen.
- `src/components/pim/writer/docxIO.ts` — underline/strike, A4 page-properties, warnings teruggeven.

## Niet in scope

Geen wijziging aan detector-defaults, profielen, NER of pipeline-logica. Geen multi-level lijsten in export.
