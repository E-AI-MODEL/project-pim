// Production Egress Guard, handhaaft PIM-besluit op echte browser-egress.
//
// De re-consult is bewust onafhankelijk van de gebruikersinstellingen:
// hij draait altijd op maximale sterkte en negeert uitgezette categorieën.
// Een tweede mening die dezelfde configuratie erft, is geen tweede mening.
//
// De re-consult is ook fail-closed: een laag die hoorde te draaien en faalde
// blokkeert de actie. Een laag die de gebruiker bewust uit heeft gezet volgt
// het degrade_no_export-precedent: lokaal kopiëren/printen/delen mag met een
// zichtbare waarschuwing, exporteren en versturen niet.

import type { PimDecision, CertifiedPayload } from "./types";
import { draftCheckWithRegistry } from "./processing";
import { runRegistryDetailed } from "./detectorRegistry";
import { computeSignals } from "./risk";
import {
  MAX_STRENGTH_DETECTION_SETTINGS,
  coerceDetectionSettings,
  usesBert,
} from "./detectionSettings";

const reconsultLog: string[] = [];
const reconsultListeners = new Set<(v: string[]) => void>();
function emitReconsult(msg: string) {
  reconsultLog.push(`${new Date().toISOString()} ${msg}`);
  if (reconsultLog.length > 50) reconsultLog.shift();
  for (const l of reconsultListeners) l([...reconsultLog]);
  console.info("[PIM egress]", msg);
}
export function onEgressReconsult(cb: (v: string[]) => void): () => void {
  reconsultListeners.add(cb);
  cb([...reconsultLog]);
  return () => reconsultListeners.delete(cb);
}
export function getEgressReconsultLog(): string[] {
  return [...reconsultLog];
}

/** Acties waarbij een bewust uitgezette laag alsnog hard blokkeert. */
const STRICT_ACTIONS: ReadonlySet<string> = new Set(["export_file", "send_external_ai"]);

export interface ReconsultResult {
  ok: boolean;
  reason: string;
  /** Zichtbare waarschuwing bij een gedegradeerde, maar toegestane actie. */
  warning?: string;
}

/**
 * Tweede mening op de exacte payload. Altijd maximale sterkte, altijd alle
 * categorieën, ongeacht wat de gebruiker heeft ingesteld.
 */
export async function reconsultPayload(
  payload: CertifiedPayload,
  action: PimDecision["action"] = "copy",
): Promise<ReconsultResult> {
  const text = payload.text;
  const userSettings = coerceDetectionSettings(payload.detectionSettings);
  const userBertOff = !usesBert(userSettings);
  const settings = {
    ...MAX_STRENGTH_DETECTION_SETTINGS,
    bert: userBertOff ? MAX_STRENGTH_DETECTION_SETTINGS.bert : userSettings.bert,
  };
  const strict = STRICT_ACTIONS.has(action);

  const { spans, layers } = await runRegistryDetailed(text, {
    detectionSettings: settings,
    enableAsync: true,
  });

  // Fail-closed: elke verwachte laag die niet gedraaid heeft, blokkeert.
  const failed = layers.filter((l) => l.status === "failed");
  const bertFailedWhileUserDisabled = failed.filter((l) => l.kind === "nerSlm" && userBertOff);
  const hardFailed = failed.filter((l) => !(l.kind === "nerSlm" && userBertOff));

  if (hardFailed.length > 0) {
    const ids = hardFailed.map((l) => `${l.id}${l.error ? ` (${l.error})` : ""}`).join("; ");
    return {
      ok: false,
      reason: `Egress re-consult BLOCK: controlelaag draaide niet, dus geen zekerheid: ${ids}`,
    };
  }

  let warning: string | undefined;
  if (bertFailedWhileUserDisabled.length > 0) {
    if (strict) {
      return {
        ok: false,
        reason:
          "Egress re-consult BLOCK: BERT staat uit, dus exporteren en versturen zijn niet toegestaan.",
      };
    }
    warning = "Let op: BERT stond uit. PiM controleerde alleen met regels en woordenlijsten.";
  }

  // Scoring via de centrale risicofunctie; geen tweede set gewichten hier.
  const nerSpans = spans.filter((s) => s.ruleId.startsWith("slm."));
  const signals = computeSignals(text, nerSpans, settings);

  if (signals.directPii.length > 0) {
    return {
      ok: false,
      reason: `Egress re-consult BLOCK: ${signals.directPii.length} directe PII in payload`,
    };
  }
  if (signals.riskLevel === "high" || signals.riskLevel === "critical") {
    return { ok: false, reason: `Egress re-consult BLOCK: risk=${signals.riskLevel}` };
  }

  const check = await draftCheckWithRegistry(
    { mode: "anonymous", text, rawHadPii: false },
    "anonymous",
    settings,
    {
      async: true,
    },
  );
  if (check.status === "fail") {
    return {
      ok: false,
      reason: `Egress re-consult BLOCK: draftCheck fail (${check.issues.join("; ")})`,
    };
  }
  return { ok: true, reason: "Egress re-consult PASS", warning };
}

export interface EgressResult {
  executed: boolean;
  reason: string;
}

export async function executeAction(
  decision: PimDecision,
  payload: CertifiedPayload,
): Promise<EgressResult> {
  if (decision.verdict === "BLOCK") {
    return { executed: false, reason: `Geblokkeerd door PIM: ${decision.reasonCode}` };
  }

  const egressActions: PimDecision["action"][] = [
    "copy",
    "export_file",
    "print",
    "share",
    "send_external_ai",
  ];
  if (
    egressActions.includes(decision.action) &&
    payload.payloadType !== "draft_anonymous_certified"
  ) {
    emitReconsult(
      `Egress guard BLOCK: payloadType='${payload.payloadType}' niet toegestaan voor '${decision.action}'.`,
    );
    return {
      executed: false,
      reason: `Egress guard BLOCK: payload-type '${payload.payloadType}' mag niet naar buiten.`,
    };
  }

  switch (decision.action) {
    case "display":
    case "save_local":
    case "restore":
      return { executed: true, reason: "Lokale actie uitgevoerd binnen browser." };

    case "copy": {
      try {
        if (!navigator.clipboard)
          return { executed: false, reason: "Clipboard API niet beschikbaar." };
        const reconsult = await reconsultPayload(payload, decision.action);
        if (!reconsult.ok) {
          emitReconsult(reconsult.reason);
          return { executed: false, reason: reconsult.reason };
        }
        emitReconsult(`Egress copy re-consult PASS (${payload.text.length} chars).`);
        await navigator.clipboard.writeText(payload.text);
        return {
          executed: true,
          reason: withWarning("Anonymous tekst gekopieerd naar klembord.", reconsult.warning),
        };
      } catch (e) {
        return { executed: false, reason: `Clipboard write faalde: ${(e as Error).message}` };
      }
    }

    case "print": {
      const reconsult = await reconsultPayload(payload, decision.action);
      if (!reconsult.ok) {
        emitReconsult(reconsult.reason);
        return { executed: false, reason: reconsult.reason };
      }
      emitReconsult(`Egress print re-consult PASS (${payload.text.length} chars).`);
      const w = window.open("", "_blank", "width=600,height=600");
      if (!w) return { executed: false, reason: "Popup geblokkeerd door browser." };
      w.document.write(
        `<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap;padding:24px">${escapeHtml(payload.text)}</pre>`,
      );
      w.document.close();
      w.focus();
      w.print();
      return {
        executed: true,
        reason: withWarning("Print-dialog geopend met anonymous tekst.", reconsult.warning),
      };
    }

    case "share": {
      const reconsult = await reconsultPayload(payload, decision.action);
      if (!reconsult.ok) {
        emitReconsult(reconsult.reason);
        return { executed: false, reason: reconsult.reason };
      }
      emitReconsult(`Egress share re-consult PASS (${payload.text.length} chars).`);
      const navAny = navigator as Navigator & { share?: (d: { text?: string }) => Promise<void> };
      if (!navAny.share) {
        try {
          await navigator.clipboard.writeText(payload.text);
          return {
            executed: true,
            reason: "Web Share niet beschikbaar, gekopieerd naar klembord als fallback.",
          };
        } catch {
          return {
            executed: false,
            reason: "Web Share niet beschikbaar en clipboard fallback faalde.",
          };
        }
      }
      try {
        await navAny.share({ text: payload.text });
        return {
          executed: true,
          reason: withWarning("Anonymous tekst gedeeld via Web Share API.", reconsult.warning),
        };
      } catch (e) {
        return { executed: false, reason: `Share geannuleerd of faalde: ${(e as Error).message}` };
      }
    }

    case "export_file": {
      const reconsult = await reconsultPayload(payload, decision.action);
      if (!reconsult.ok) {
        emitReconsult(reconsult.reason);
        return { executed: false, reason: reconsult.reason };
      }
      emitReconsult(`Egress export re-consult PASS (${payload.text.length} chars).`);
      const blob = new Blob([payload.text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pim-anonymous-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return {
        executed: true,
        reason: withWarning(
          "Anonymous bestand gedownload (geen mapping bijgesloten).",
          reconsult.warning,
        ),
      };
    }

    case "send_external_ai": {
      const reconsult = await reconsultPayload(payload, decision.action);
      if (!reconsult.ok) {
        emitReconsult(reconsult.reason);
        return { executed: false, reason: reconsult.reason };
      }
      emitReconsult(
        `Egress re-consult PASS (${payload.text.length} chars), geen endpoint geconfigureerd, simulatie.`,
      );
      return {
        executed: true,
        reason:
          "Anonymous payload zou nu naar externe AI gaan (re-consult PASS). Geen endpoint geconfigureerd in deze build, simulatie.",
      };
    }

    default:
      return { executed: false, reason: "Onbekende actie." };
  }
}

function withWarning(reason: string, warning?: string): string {
  return warning ? `${reason} ${warning}` : reason;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
