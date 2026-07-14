// Gedeelde NER-SLM hook, spoor A.
// Vóór deze hook draaide de SLM-integratie alleen inline in StartGoShell, en
// gebruikte /schrijven het model helemaal niet (computeSignals(plain, [], …)).
// Eén hook → identiek gedrag op beide pagina's; het model is een globale
// singleton, dus één keer inschakelen werkt overal.

import { useCallback, useEffect, useState } from "react";
import {
  onNerStatus,
  loadNerSlm,
  retryNerSlm,
  detectPersonsSlm,
  type NerStatus,
  type PiiSpan,
} from "@/lib/pim";

interface UseNerSpansResult {
  /** SLM-spans voor de huidige tekst (leeg als uit/niet gereed). */
  nerSpans: PiiSpan[];
  nerStatus: NerStatus | null;
  ready: boolean;
  /** Start (of herstart) de modeldownload, expliciete user-actie. */
  startNer: () => void;
}

/**
 * Detecteert personen/locaties via de NER-SLM, gedebounced op tekstwijziging.
 * Laadt het model NIET vanzelf, `startNer()` is een bewuste actie. Zolang het
 * model niet gereed is, blijft `nerSpans` leeg en valt de pipeline terug op
 * regex + lexicon.
 */
export function useNerSpans(text: string, opts: { enabled: boolean }): UseNerSpansResult {
  const { enabled } = opts;
  const [status, setStatus] = useState<NerStatus | null>(null);
  const [spans, setSpans] = useState<PiiSpan[]>([]);

  useEffect(() => onNerStatus(setStatus), []);

  const ready = !!status?.ready;

  useEffect(() => {
    if (!enabled || !ready || !text.trim()) {
      setSpans([]);
      return;
    }
    let cancelled = false;
    const id = window.setTimeout(() => {
      detectPersonsSlm(text)
        .then((s) => {
          if (!cancelled) setSpans(s);
        })
        .catch(() => {
          if (!cancelled) setSpans([]);
        });
    }, 260);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [text, enabled, ready]);

  const startNer = useCallback(() => {
    if (status?.error) retryNerSlm();
    void loadNerSlm().catch(() => {});
  }, [status?.error]);

  return {
    nerSpans: enabled && ready ? spans : [],
    nerStatus: status,
    ready,
    startNer,
  };
}
