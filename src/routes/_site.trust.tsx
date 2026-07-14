import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Inbox,
  Activity,
  Radio,
  Info,
  FlaskConical,
} from "lucide-react";
import { PageHero } from "@/components/pim/PageHero";
import {
  onViolations,
  onReviewQueue,
  onModelIntegrity,
  onEgressReconsult,
  onSelfTest,
  runSelfTest,
  type ReviewItem,
  type ModelIntegrityRecord,
  type SelfTestReport,
  PIPELINE_PROFILES,
  DEFAULT_PROFILE,
  MODEL_CATALOG,
} from "@/lib/pim";

export const Route = createFileRoute("/_site/trust")({
  head: () => ({
    meta: [
      { title: "Vertrouwensdashboard — Project PiM" },
      {
        name: "description",
        content:
          "Live status van de privacy-waarborgen: pipeline, runtime-hardening, modelintegriteit, egress-pogingen en reviewrij.",
      },
      { property: "og:title", content: "Vertrouwensdashboard — Project PiM" },
      {
        property: "og:description",
        content: "Live inzicht in wat Project PiM in je browser doet en niet doet.",
      },
    ],
  }),
  component: TrustPage,
});

function TrustPage() {
  const [violations, setViolations] = useState<string[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [integrity, setIntegrity] = useState<ModelIntegrityRecord[]>([]);
  const [reconsult, setReconsult] = useState<string[]>([]);
  const [selfTest, setSelfTest] = useState<SelfTestReport | null>(null);

  useEffect(() => {
    const off1 = onViolations(setViolations);
    const off2 = onReviewQueue(setReviews);
    const off3 = onModelIntegrity(setIntegrity);
    const off4 = onEgressReconsult(setReconsult);
    const off5 = onSelfTest(setSelfTest);
    return () => {
      off1();
      off2();
      off3();
      off4();
      off5();
    };
  }, []);

  const profile = PIPELINE_PROFILES[DEFAULT_PROFILE];
  const hardeningOk = typeof window !== "undefined";
  const lastViolation = violations[violations.length - 1] ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHero
        eyebrow="Transparantie"
        title="Vertrouwensdashboard"
        description="Live status van de privacy-waarborgen. Je ziet alleen metingen en metadata, nooit je tekst zelf."
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
          <Row label="Status">
            {hardeningOk ? "Actief — fetch/XHR/sendBeacon/WebSocket gewrapt" : "Niet geladen"}
          </Row>
          <Row label="Egress-pogingen">{violations.length}</Row>
          <Row label="Laatste poging">
            <span className="break-all text-[11px]">{lastViolation ?? "—"}</span>
          </Row>
        </Card>

        <Card title="Modelintegriteit" icon={Cpu} accent="cyan">
          <div className="text-[11px] text-muted-foreground mb-2">
            Catalog vs. runtime — alleen modellen die in deze sessie geladen zijn hebben een actuele
            hash.
          </div>
          <ul className="space-y-1.5">
            {(Object.keys(MODEL_CATALOG) as (keyof typeof MODEL_CATALOG)[]).map((key) => {
              const cat = MODEL_CATALOG[key];
              const rec = integrity.find((m) => m.key === key);
              const status = rec?.status ?? "unverified";
              const statusClass =
                status === "verified"
                  ? "text-green"
                  : status === "placeholder"
                    ? "text-orange"
                    : status === "mismatch" || status === "missing"
                      ? "text-red"
                      : "text-muted-foreground";
              return (
                <li key={key} className="border border-border/40 rounded p-2 space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-mono text-[11px] truncate">{key}</span>
                    <span className={`font-mono text-[10px] uppercase ${statusClass}`}>
                      {status}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground truncate">
                    {cat.modelId}
                  </div>
                  <div className="flex justify-between gap-2 font-mono text-[10px]">
                    <span className="text-muted-foreground">release</span>
                    <span>{cat.releaseStatus}</span>
                  </div>
                  <div className="flex justify-between gap-2 font-mono text-[10px]">
                    <span className="text-muted-foreground">expected</span>
                    <span className="truncate">{shortHash(cat.expectedConfigSha256)}</span>
                  </div>
                  <div className="flex justify-between gap-2 font-mono text-[10px]">
                    <span className="text-muted-foreground">actual</span>
                    <span className="truncate">{rec?.actual ? shortHash(rec.actual) : "—"}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Review queue" icon={Inbox} accent={reviews.length > 0 ? "orange" : "green"}>
          <Row label="Items">{reviews.length}</Row>
          <Row label="Onopgelost">{reviews.filter((r) => !r.resolved).length}</Row>
          <div className="mt-2 max-h-40 overflow-auto space-y-1">
            {reviews
              .slice(-8)
              .reverse()
              .map((r) => (
                <div
                  key={r.id}
                  className="font-mono text-[10px] flex items-center justify-between gap-2 border border-border/40 rounded px-2 py-1"
                >
                  <span className="text-muted-foreground">
                    {new Date(r.ts).toLocaleTimeString()}
                  </span>
                  <span className={r.guardStatus === "fail" ? "text-red" : "text-orange"}>
                    {r.guardStatus} · {r.riskLevel}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <Card
          title="Boot self-test"
          icon={FlaskConical}
          accent={
            selfTest?.status === "pass" ? "green" : selfTest?.status === "fail" ? "red" : "orange"
          }
        >
          <Row label="Status">{selfTest?.status ?? "running…"}</Row>
          <Row label="Golden cases">
            {selfTest
              ? `${selfTest.golden.filter((g) => g.ok).length}/${selfTest.golden.length}`
              : "—"}
          </Row>
          <Row label="Ruleset hash">
            <span className="font-mono text-[10px]">
              {selfTest ? shortHash(selfTest.rulesetHash) : "—"}
            </span>
          </Row>
          <Row label="Hardening probe">
            <span className={selfTest?.hardening.probeLogged ? "text-green" : "text-red"}>
              {selfTest ? (selfTest.hardening.probeLogged ? "gelogd" : "NIET gelogd") : "—"}
            </span>
          </Row>
          {selfTest && selfTest.golden.some((g) => !g.ok) && (
            <div className="mt-2 max-h-32 overflow-auto space-y-1">
              {selfTest.golden
                .filter((g) => !g.ok)
                .map((g) => (
                  <div
                    key={g.id}
                    className="font-mono text-[10px] text-red border border-red/30 rounded px-2 py-1"
                  >
                    {g.id} mist: {g.missing.join(", ")}
                  </div>
                ))}
            </div>
          )}
          <button
            onClick={() => {
              void runSelfTest();
            }}
            className="mt-3 text-[11px] font-mono uppercase tracking-wider px-2 py-1 border border-border/60 rounded hover:bg-accent/40"
          >
            Opnieuw uitvoeren
          </button>
          <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
            Verifieert dat regex/lexicon/ctx-detectors een vaste synthetische corpus correct
            herkennen en dat de fetch-wrapper externe pogingen daadwerkelijk logt. Fail = niet
            vertrouwen op egress-laag.
          </p>
        </Card>

        <Card
          title="Egress re-consult"
          icon={Radio}
          accent={reconsult.some((r) => r.includes("BLOCK")) ? "red" : "green"}
        >
          <Row label="Calls">{reconsult.length}</Row>
          <Row label="Geblokkeerd">{reconsult.filter((r) => r.includes("BLOCK")).length}</Row>
          <div className="mt-2 max-h-44 overflow-auto space-y-1">
            {reconsult.length === 0 ? (
              <div className="text-[11px] text-muted-foreground">
                Nog geen externe-AI egress aangevraagd in deze sessie.
              </div>
            ) : (
              reconsult
                .slice(-8)
                .reverse()
                .map((r, i) => (
                  <div
                    key={i}
                    className={
                      "font-mono text-[10px] border border-border/40 rounded px-2 py-1 break-words " +
                      (r.includes("BLOCK") ? "text-red" : "text-foreground/80")
                    }
                  >
                    {r}
                  </div>
                ))
            )}
          </div>
        </Card>

        <Card title="Hash-policy disclaimer" icon={Info} accent="orange">
          <p className="text-[11px] text-foreground/80 leading-relaxed">
            De huidige hash-pin is een <span className="font-mono">trust-on-first-pin</span> over de
            canonieke descriptor <span className="font-mono">{"<modelId>@<revision>"}</span>, niet
            over de gedownloade ONNX-weights. Een gecompromitteerde mirror die dezelfde id+revision
            serveert met andere bytes wordt hierdoor <em>niet</em> gevangen. Voor productie-release
            is een fetch-interceptor nodig die de werkelijke weight-bytes hasht vóór instantiatie en
            faalt bij mismatch.
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
            Status: <span className="text-orange font-mono">design-only</span> entries blokkeren
            productie-egress via de release-gate;{" "}
            <span className="text-green font-mono">verified</span> entries passeren alleen de
            demo-gate.
          </p>
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
      <span className="text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
        {label}
      </span>
      <span className="text-foreground text-right break-words min-w-0">{children}</span>
    </div>
  );
}

function shortHash(h: string): string {
  if (h.startsWith("PLACEHOLDER:")) return h.slice(0, 24) + "…";
  return h.slice(0, 12) + "…" + h.slice(-4);
}
