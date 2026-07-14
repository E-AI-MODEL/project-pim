// Spec §8.5, risk / categorieën / detectoren / modelstatus / policyregel / audit / pipeline.
import { useState } from "react";
import type { PimDecision, PrivacySignals } from "@/lib/pim/types";
import type { ModelIntegrityRecord } from "@/lib/pim/modelCatalog";
import { COPY } from "@/lib/pim/copy";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  decision: PimDecision;
  signals: PrivacySignals;
  integrity: ModelIntegrityRecord[];
}

export function DetailsDrawer({ decision, signals, integrity }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-[#e5e7ef] bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium text-[#334155] hover:bg-[#f6f7fb]"
        aria-expanded={open}
      >
        <span className="text-[#0f172a]">{COPY.detailsLink}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 text-xs text-[#334155]">
          <Row k="Verdict" v={`${decision.verdict} · ${decision.flag ?? decision.reasonCode}`} />
          <Row k="Profiel" v={decision.profileId ?? "-"} />
          <Row k="Payload-type" v={decision.payloadType ?? "-"} />
          <Row
            k="Risk score"
            v={`${(signals.riskScore * 100).toFixed(0)}% · ${signals.riskLevel}`}
          />
          <Row
            k="Categorieën"
            v={
              [...signals.directPii, ...signals.contextualPii].map((s) => s.category).join(", ") ||
              "geen"
            }
          />
          <Row k="Detectoren (rule IDs)" v={signals.ruleIds.join(", ") || "-"} />
          <Row k="Policyregel" v={`${decision.ruleId} (${decision.policyVersion})`} />
          <Row
            k="Modelintegriteit"
            v={
              integrity.length === 0
                ? "geen models geladen"
                : integrity.map((r) => `${r.key}=${r.status}`).join(" · ")
            }
          />
          <p className="text-[11px] text-[#64748b] pt-1 border-t border-[#eef0f5]">
            Audit-metadata (timestamp + verdict + ruleId) is bewaard. Geen ruwe tekst, geen
            drafttekst, geen mapping.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-foreground/90 break-all">{v}</span>
    </div>
  );
}
