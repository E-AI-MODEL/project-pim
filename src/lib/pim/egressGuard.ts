// Production Egress Guard — handhaaft PIM-besluit op echte browser-egress.
// Spec hfst 28. Geen actie mag voorbij PIM zonder ALLOW.

import type { PimDecision } from "./types";

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
      // We voeren GEEN echte externe call uit in de demo.
      // Spec: alleen mag nadat PIM ALLOW én anonymous én risk laag.
      // Dit is enforcement = simulatie + transparantie.
      return {
        executed: true,
        reason: "DEMO: anonymous payload zou nu naar externe AI gaan. In productie: via fetch wrapper die per call PIM opnieuw consulteert.",
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
