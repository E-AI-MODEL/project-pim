import { it } from "vitest";
import { computeSignals } from "@/lib/pim/risk";
import { DEFAULT_DETECTION_SETTINGS } from "@/lib/pim/detectionSettings";
const T=["Het schoolplein wordt in de zomervakantie opnieuw bestraat.","Wij werken met een leerlingvolgsysteem en bespreken de resultaten per groep.","De ouderavond gaat over huiswerkbegeleiding en mediawijsheid.","Aanvraag ouderbijdrage: IBAN NL02RABO0123456789, BSN 111222333, datum 12-09-2025."];
it("x",()=>{for(const t of T){const s=computeSignals(t,[],DEFAULT_DETECTION_SETTINGS,new Set());console.log(t,"=>",[...s.directPii,...s.contextualPii].map(x=>`${x.category}:${x.text}`));}});
