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
  const categories = [...signals.directPii, ...signals.contextualPii].map((s) => s.category).join(", ") || "geen";
  const models = integrity.length === 0 ? "geen models geladen" : integrity.map((r) => `${r.key}=${r.status}`).join(" | ");
  return (
    <div className="rounded-md border border-border/40 bg-card/40">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium hover:bg-accent/20" aria-expanded={open}>
        <span className="text-primary">{COPY.detailsLink}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 text-xs">
          <Row k="Verdict" v={`${decision.verdict} | ${decision.flag ?? decision.reasonCode}`} />
          <Row k="Payload-type" v={decision.payloadType ?? "-"} />
          <Row k="Risk score" v={`${(signals.riskScore * 100).toFixed(0)}% | ${signals.riskLevel}`} />
          <Row k="Categorieen" v={categories} />
          <Row k="Detectoren" v={signals.ruleIds.join(", ") || "-"} />
          <Row k="Policyregel" v={`${decision.ruleId} (${decision.policyVersion})`} />
          <Row k="Modelintegriteit" v={models} />
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="grid grid-cols-[140px_1fr] gap-2"><span className="text-muted-foreground">{k}</span><span className="font-mono text-foreground/90 break-all">{v}</span></div>;
}
