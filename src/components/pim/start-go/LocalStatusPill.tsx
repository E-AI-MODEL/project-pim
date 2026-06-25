import { useEffect, useState } from "react";
import { onSelfTest, getSelfTest } from "@/lib/pim/selfTest";
import { onModelIntegrity, type ModelIntegrityRecord } from "@/lib/pim/modelCatalog";
import { COPY } from "@/lib/pim/copy";

type Status = "ok" | "checking" | "attention";

export function LocalStatusPill() {
  const [selfTestStatus, setSelfTestStatus] = useState(getSelfTest()?.status ?? "running");
  const [integrity, setIntegrity] = useState<ModelIntegrityRecord[]>([]);

  useEffect(() => {
    const off1 = onSelfTest((r) => setSelfTestStatus(r.status));
    const off2 = onModelIntegrity(setIntegrity);
    return () => { off1(); off2(); };
  }, []);

  const hasModelMismatch = integrity.some((r) => r.status === "mismatch");

  let status: Status = "ok";
  let label: string = COPY.pillLocalActive;
  let title = "Basiscontrole draait lokaal in je browser.";

  if (selfTestStatus === "running" || selfTestStatus === "idle") {
    status = "checking";
    label = "Controle start";
    title = "PiM start de lokale controle. Je tekst blijft in de browser.";
  } else if (selfTestStatus === "fail") {
    status = "attention";
    label = "Controle nodig";
    title = "De lokale basiscontrole draait, maar de self-test vraagt aandacht. Bekijk Trust voor details.";
  } else if (hasModelMismatch) {
    status = "attention";
    label = "Modelcheck nodig";
    title = "Een optioneel model wijkt af. De lokale basiscontrole blijft actief.";
  }

  const color =
    status === "ok" ? "bg-green-500/15 text-green-400 border-green-500/30" :
    status === "checking" ? "bg-sky-500/15 text-sky-300 border-sky-500/30" :
    "bg-orange-500/15 text-orange-300 border-orange-500/30";

  const dot =
    status === "ok" ? "bg-green-400" :
    status === "checking" ? "bg-sky-300" :
    "bg-orange-300";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${color}`}
      title={title}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
