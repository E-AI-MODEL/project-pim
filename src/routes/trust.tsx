import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle, Cpu, Inbox, Activity } from "lucide-react";
import { PageHero } from "@/components/pim/PageHero";
import {
  onViolations,
  onReviewQueue,
  onModelIntegrity,
  type ReviewItem,
  type ModelIntegrityRecord,
  PIPELINE_PROFILES,
  DEFAULT_PROFILE,
} from "@/lib/pim";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Trust Dashboard — Project PiM" },
      {
        name: "description",
        content:
          "Live status van privacy-invarianten: pipeline, runtime hardening, modelintegriteit, egress-pogingen, review queue.",
      },
      { property: "og:title", content: "Trust Dashboard — Project PiM" },
      {
        property: "og:description",
        content: "Live transparantie over de PIM privacy-pipeline in jouw browser.",
      },
    ],
  }),
  component: TrustPage,
});

function TrustPage() {
  const [violations, setViolations] = useState<string[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [integrity, setIntegrity] = useState<ModelIntegrityRecord[]>([]);

  useEffect(() => {
    const off1 = onViolations(setViolations);
    const off2 = onReviewQueue(setReviews);
    const off3 = onModelIntegrity(setIntegrity);
    return () => {
      off1();
      off2();
      off3();
    };
  }, []);

  const profile = PIPELINE_PROFILES[DEFAULT_PROFILE];
  const hardeningOk = typeof window !== "undefined";
  const lastViolation = violations[violations.length - 1] ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHero
        eyebrow="Transparantie"
        title="Trust Dashboard"
        subtitle="Live status van de privacy-invarianten. Geen inhoud — alleen meta-informatie."
      />

      <div className="grid md:grid-cols-2 gap-4 mt-8">
        <Card title="Pipeline" icon={Activity} accent="green">
          <Row label="Profiel">{profile.label}</Row>
          <Row label="Egress-policy">{profile.egressPolicy}</Row>
          <Row label="Release">{profile.releaseStatus}</Row>
          <Row label="Detectoren">
            {Object.entries(profile.detectors)
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(", ")}
          </Row>
        </Card>

        <Card title="Runtime hardening" icon={ShieldCheck} accent={hardeningOk ? "green" : "red"}>
          <Row label="Status">{hardeningOk ? "Actief — fetch/XHR/sendBeacon/WebSocket gewrapt" : "Niet geladen"}</Row>
          <Row label="Egress-pogingen">{violations.length}</Row>
          <Row label="Laatste poging">
            <span className="break-all text-[11px]">{lastViolation ?? "—"}</span>
          </Row>
        </Card>

        <Card title="Modelintegriteit" icon={Cpu} accent="cyan">
          {integrity.length === 0 ? (
            <div className="text-xs text-muted-foreground">Nog geen modellen geladen in deze sessie.</div>
          ) : (
            <ul className="space-y-1.5">
              {integrity.map((m, i) => (
                <li key={i} className="font-mono text-[11px] flex justify-between gap-3">
                  <span className="truncate text-foreground">{m.key}</span>
                  <span
                    className={
                      m.status === "verified"
                        ? "text-green"
                        : m.status === "placeholder"
                          ? "text-orange"
                          : m.status === "mismatch" || m.status === "missing"
                            ? "text-red"
                            : "text-muted-foreground"
                    }
                  >
                    {m.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Review queue" icon={Inbox} accent={reviews.length > 0 ? "orange" : "green"}>
          <Row label="Items">{reviews.length}</Row>
          <Row label="Onopgelost">{reviews.filter((r) => !r.resolved).length}</Row>
          <div className="mt-2 max-h-40 overflow-auto space-y-1">
            {reviews.slice(-8).reverse().map((r) => (
              <div
                key={r.id}
                className="font-mono text-[10px] flex items-center justify-between gap-2 border border-border/40 rounded px-2 py-1"
              >
                <span className="text-muted-foreground">{new Date(r.ts).toLocaleTimeString()}</span>
                <span className={r.guardStatus === "fail" ? "text-red" : "text-orange"}>
                  {r.guardStatus} · {r.riskLevel}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="panel p-4 mt-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Privacy invarianten
          </span>
        </div>
        <ul className="text-xs text-foreground/80 space-y-1 list-disc pl-5">
          <li>Lokale verwerking — alle detectie en mapping blijft in de browser.</li>
          <li>Fail-closed — bij twijfel BLOCK in plaats van doorlaten.</li>
          <li>AES-GCM mapping — pseudonieme tokens leven alleen versleuteld in geheugen.</li>
          <li>Audit zonder inhoud — alleen meta (mode, verdict, ruleId, timestamp).</li>
          <li>Egress wrapper — externe fetches worden gelogd; alleen modelhosts whitelisted.</li>
        </ul>
      </div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "green" | "red" | "orange" | "cyan";
  children: React.ReactNode;
}) {
  const color =
    accent === "green"
      ? "text-green border-green/30"
      : accent === "red"
        ? "text-red border-red/40"
        : accent === "orange"
          ? "text-orange border-orange/40"
          : "text-cyan border-cyan/40";
  return (
    <div className={"panel p-4 " + color}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4" />
        <span className="font-display font-bold text-sm uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-3 text-xs">
      <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">{label}</span>
      <span className="text-foreground text-right break-words min-w-0">{children}</span>
    </div>
  );
}