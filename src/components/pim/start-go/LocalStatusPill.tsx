// Spec §7.1 — 3-staten statuspill, gevoed door self-test + modelgate.
import { useEffect, useState } from "react";
import { onSelfTest, getSelfTest } from "@/lib/pim/selfTest";
import { onModelIntegrity, type ModelIntegrityRecord } from "@/lib/pim/modelCatalog";
import { COPY } from "@/lib/pim/copy";

type Status = "ok" | "limited" | "not-ready";

export function LocalStatusPill() {
  const [selfTestStatus, setSelfTestStatus] = useState(getSelfTest()?.status ?? "running");
  const [integrity, setIntegrity] = useState<ModelIntegrityRecord[]>([]);

  useEffect(() => {
    const off1 = onSelfTest((r) => setSelfTestStatus(r.status));
    const off2 = onModelIntegrity(setIntegrity);
    return () => { off1(); off2(); };
  }, []);

  let status: Status;
  let label: string;
  if (selfTestStatus === "fail") {
    status = "not-ready";
    label = COPY.pillNotReady;
  } else {
    const ner = integrity.find((r) => r.key === "ner_multilingual");
    if (ner && (ner.status === "mismatch" || ner.status === "missing")) {
      status = "not-ready";
      label = COPY.pillNotReady;
    } else if (!ner || ner.status === "placeholder" || ner.status === "unverified") {
      status = "limited";
      label = COPY.pillLimited;
    } else {
      status = "ok";
      label = COPY.pillLocalActive;
    }
  }

  const color =
    status === "ok" ? "bg-green-500/15 text-green-400 border-green-500/30" :
    status === "limited" ? "bg-orange-500/15 text-orange-400 border-orange-500/30" :
    "bg-red-500/15 text-red-400 border-red-500/30";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${color}`}
      title={`Self-test: ${selfTestStatus}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status === "ok" ? "bg-green-400" : status === "limited" ? "bg-orange-400" : "bg-red-400"}`} />
      {label}
    </span>
  );
}