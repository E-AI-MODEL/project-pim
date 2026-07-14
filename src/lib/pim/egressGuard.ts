// Production Egress Guard — handhaaft PIM-besluit op echte browser-egress.

import type { PimDecision, CertifiedPayload } from "./types";
import { draftCheckWithRegistry } from "./processing";
import { runRegistry } from "./detectorRegistry";
import { DEFAULT_DETECTION_SETTINGS } from "./detectionSettings";
import type { RiskLevel } from "./types";

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

async function reconsultPayload(
  payload: CertifiedPayload,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const text = payload.text;
  const detectionSettings = payload.detectionSettings ?? DEFAULT_DETECTION_SETTINGS;
  const spans = await runRegistry(text, { detectionSettings, enableAsync: true });
  const directPii = spans.filter((s) => !s.contextual);
  const HIGH: ReadonlySet<string> = new Set([
    "bsn",
    "iban",
    "email",
    "phone",
    "address",
    "student_id",
  ]);
  let score = 0;
  for (const s of directPii) score += HIGH.has(s.category) ? 0.18 : 0.1;
  for (const s of spans.filter((s) => s.contextual)) score += s.confidence * 0.12;
  score = Math.min(1, score);
  const riskLevel: RiskLevel =
    score >= 0.65 ? "critical" : score >= 0.4 ? "high" : score >= 0.18 ? "medium" : "low";

  if (directPii.length > 0) {
    return {
      ok: false,
      reason: `Egress re-consult BLOCK: ${directPii.length} directe PII in payload`,
    };
  }
  if (riskLevel === "high" || riskLevel === "critical") {
    return { ok: false, reason: `Egress re-consult BLOCK: risk=${riskLevel}` };
  }
  const check = await draftCheckWithRegistry(
    { mode: "anonymous", text, rawHadPii: false },
    "anonymous",
    detectionSettings,
    { async: true },
  );
  if (check.status === "fail") {
    return {
      ok: false,
      reason: `Egress re-consult BLOCK: draftCheck fail (${check.issues.join("; ")})`,
    };
  }
  return { ok: true };
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
        const reconsult = await reconsultPayload(payload);
        if (!reconsult.ok) {
          emitReconsult(reconsult.reason);
          return { executed: false, reason: reconsult.reason };
        }
        emitReconsult(`Egress copy re-consult PASS (${payload.text.length} chars).`);
        await navigator.clipboard.writeText(payload.text);
        return { executed: true, reason: "Anonymous tekst gekopieerd naar klembord." };
      } catch (e) {
        return { executed: false, reason: `Clipboard write faalde: ${(e as Error).message}` };
      }
    }

    case "print": {
      const reconsult = await reconsultPayload(payload);
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
      return { executed: true, reason: "Print-dialog geopend met anonymous tekst." };
    }

    case "share": {
      const reconsult = await reconsultPayload(payload);
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
            reason: "Web Share niet beschikbaar — gekopieerd naar klembord als fallback.",
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
        return { executed: true, reason: "Anonymous tekst gedeeld via Web Share API." };
      } catch (e) {
        return { executed: false, reason: `Share geannuleerd of faalde: ${(e as Error).message}` };
      }
    }

    case "export_file": {
      const reconsult = await reconsultPayload(payload);
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
      return { executed: true, reason: "Anonymous bestand gedownload (geen mapping bijgesloten)." };
    }

    case "send_external_ai": {
      const reconsult = await reconsultPayload(payload);
      if (!reconsult.ok) {
        emitReconsult(reconsult.reason);
        return { executed: false, reason: reconsult.reason };
      }
      emitReconsult(
        `Egress re-consult PASS (${payload.text.length} chars) — geen endpoint geconfigureerd, simulatie.`,
      );
      return {
        executed: true,
        reason:
          "Anonymous payload zou nu naar externe AI gaan (re-consult PASS). Geen endpoint geconfigureerd in deze build — simulatie.",
      };
    }

    default:
      return { executed: false, reason: "Onbekende actie." };
  }
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
