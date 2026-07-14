// §6.1 — "Gebruik voorbeeldtekst" — drie compacte starters.
import { COPY } from "@/lib/pim/copy";

export interface Example {
  id: string;
  label: string;
  hint: string;
  text: string;
}

export const EXAMPLES: Example[] = [
  {
    id: "clean",
    label: "Vakinhoud",
    hint: "Vakinhoud zonder herleidbare gegevens — verwacht: groen.",
    text:
      "Tussenevaluatie nieuwe rekenmethode na acht weken. Automatiseren tot 100 " +
      "gaat aantoonbaar sneller: gemiddelde tijd op de weektoets daalde van 7'20\" " +
      "naar 5'45\". Differentiatiebladen op niveau 1-2-3 worden in 4 van de 5 lessen " +
      "ingezet; de instructiegroep krimpt na de eerste oefenronde. Spreiding op de " +
      "blok­toets is kleiner (sd 1,2 → 0,8).",
  },
  {
    id: "context",
    label: "Mentor-notitie (contextueel)",
    hint: "Naam + klascode — verwacht: oranje, anoniemversie aangeboden.",
    text:
      "Gesprek gevoerd met Tom de Vries (4H2) over de aanloop naar het schoolexamen " +
      "Nederlands. Twee PTA-deadlines vallen in dezelfde week van november: " +
      "literatuurdossier (5 boeken) en betoog (800 woorden). Leerling overziet de " +
      "stof, maar plant op dagniveau in plaats van op weekniveau.",
  },
  {
    id: "hard",
    label: "Zorgnotitie (harde PII)",
    hint: "BSN, IBAN, telefoon, adres — verwacht: rood / niet delen.",
    text:
      "Betreft: Sarah Jansen, groep 6, basisschool De Wilg te Utrecht. Geboortedatum " +
      "14-03-2015, BSN 123456782, leerlingnummer 4582193. Adres: Bredestraat 12, " +
      "3511 AB Utrecht. Contact ouders: vader op 06-12345678, e-mail " +
      "jansen@voorbeeld.nl. Eigen bijdrage via IBAN NL91ABNA0417164300.",
  },
];

export function ExamplePicker({ onPick }: { onPick: (e: Example) => void }) {
  return (
    <div id="voorbeelden" className="flex flex-wrap gap-2">
      <span className="text-xs text-muted-foreground self-center mr-1">{COPY.menuExamples}:</span>
      {EXAMPLES.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onPick(e)}
          title={e.hint}
          className="px-2.5 py-1 rounded-md text-xs border border-border/60 bg-card/40 hover:bg-card transition-colors"
        >
          {e.label}
        </button>
      ))}
    </div>
  );
}
