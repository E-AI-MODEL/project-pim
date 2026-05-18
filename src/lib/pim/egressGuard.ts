// Production Egress Guard — handhaaft PIM-besluit op echte browser-egress.
// Spec hfst 28. Geen actie mag voorbij PIM zonder ALLOW.

import type { PimDecision } from "./types";
import { computeSignals } from "./risk";
import { draftCheck } from "./processing";

/** Logger so the trust dashboard / console can show re-consult outcomes. */
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

/**
 * Re-consult PIM on the actual payload right before egress.
 * Spec hfst 28: een eerder ALLOW-besluit op de input geldt niet automatisch
 * voor de output die naar buiten gaat. Daarom hier nogmaals detectie +
 * draftCheck op de exacte string die over de lijn zou gaan.
 */
function reconsultPayload(text: string): { ok: true } | { ok: false; reason: string } {
  const signals = computeSignals(text);
  if (signals.directPii.length > 0) {
    return {
      ok: false,
      reason: `Egress re-consult BLOCK: ${signals.directPii.length} directe PII in payload (${signals.directPii
        .map((s) => s.category)
        .slice(0, 3)
        .join(", ")})`,
    };
  }
  if (signals.riskLevel === "high" || signals.riskLevel === "critical") {
    return { ok: false, reason: `Egress re-consult BLOCK: risk=${signals.riskLevel}` };
  }
  const check = draftCheck({ mode: "anonymous", text, rawHadPii: false }, "anonymous");
  if (check.status === "fail") {
    return { ok: false, reason: `Egress re-consult BLOCK: draftCheck fail (${check.issues.join("; ")})` };
  }
  return { ok: true };
}

export interface EgressResult {
  executed: boolean;
  reason: string;
}

export async function executeAction(
  decision: PimDecision,
  payload: { text: string; mode: string },
): Promise<EgressResult> {
  if (decision.verdict === "BLOCK") {
    return { executed: false, reason: `Geblokkeerd door PIM: ${decision.reasonCode}` };
  }

  switch (decision.action) {
    case "display":
    case "save_local":
    case "restore":
      // Lokaal — UI handelt het af; egress guard markeert "uitgevoerd".
      return { executed: true, reason: "Lokale actie uitgevoerd binnen browser." };

    case "copy": {
      try {
        if (!navigator.clipboard) return { executed: false, reason: "Clipboard API niet beschikbaar." };
        await navigator.clipboard.writeText(payload.text);
        return { executed: true, reason: "Anonymous tekst gekopieerd naar klembord." };
      } catch (e) {
        return { executed: false, reason: `Clipboard write faalde: ${(e as Error).message}` };
      }
    }

    case "print": {
      // Open een sandboxed print-frame met alleen de geaccepteerde tekst.
      const w = window.open("", "_blank", "width=600,height=600");
      if (!w) return { executed: false, reason: "Popup geblokkeerd door browser." };
      w.document.write(`<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap;padding:24px">${escapeHtml(payload.text)}</pre>`);
      w.document.close();
      w.focus();
      w.print();
      return { executed: true, reason: "Print-dialog geopend met anonymous tekst." };
    }

    case "share": {
      const navAny = navigator as Navigator & { share?: (d: { text?: string }) => Promise<void> };
      if (!navAny.share) {
        // Fallback: clipboard
        try {
          await navigator.clipboard.writeText(payload.text);
          return { executed: true, reason: "Web Share niet beschikbaar — gekopieerd naar klembord als fallback." };
        } catch {
          return { executed: false, reason: "Web Share niet beschikbaar en clipboard fallback faalde." };
        }
      }
      try {
        await navAny.share({ text: payload.text });
        return { executed: true, reason: "Anonymous tekst gedeeld via Web Share API." };
      } catch (e) {
        return { executed: false, reason: `Share geannuleerd of faalde: ${(e as Error).message}` };
      }
    }

    case "export_file": {
      const blob = new Blob([payload.text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pim-anonymous-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return { executed: true, reason: "Anonymous bestand gedownload (geen mapping bijgesloten)." };
    }

    case "send_external_ai": {
      // Spec hfst 28: per egress-call OPNIEUW PIM consulteren op de
      // werkelijke payload. Een eerder ALLOW op de input is niet genoeg —
      // de string die over de lijn gaat moet zelfstandig schoon zijn.
      const reconsult = reconsultPayload(payload.text);
      if (!reconsult.ok) {
        emitReconsult(reconsult.reason);
        return { executed: false, reason: reconsult.reason };
      }
      emitReconsult(`Egress re-consult PASS (${payload.text.length} chars) — geen externe endpoint geconfigureerd, simulatie.`);
      // In productie wordt hier een fetch gedaan naar de geconfigureerde
      // externe AI. De runtimeHardening fetch-wrapper logt + filtert dat
      // verkeer al; deze re-consult is de tweede sluis.
      return {
        executed: true,
        reason: "Anonymous payload zou nu naar externe AI gaan (re-consult PASS). Geen endpoint geconfigureerd in deze build — simulatie.",
      };
    }

    default:
      return { executed: false, reason: "Onbekende actie." };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );
}
