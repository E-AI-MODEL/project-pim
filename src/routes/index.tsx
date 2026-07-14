import { createFileRoute } from "@tanstack/react-router";
import { COPY } from "@/lib/pim/copy";
import { MonitorShell } from "@/components/pim/start-go/MonitorShell";
import { UspGrid } from "@/components/pim/start-go/UspGrid";
import { AnonPseudoStrip } from "@/components/pim/start-go/AnonPseudoStrip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project PiM — Controleer je tekst op privacy voordat je hem deelt" },
      {
        name: "description",
        content:
          "PiM controleert tekst lokaal in je browser op persoonsgegevens. Niets verlaat je apparaat. Anoniem of pseudoniem, met uitleg voor jou, je organisatie en je tech-collega.",
      },
      {
        property: "og:title",
        content: "Project PiM — Controleer je tekst op privacy voordat je hem deelt",
      },
      {
        property: "og:description",
        content:
          "Lokale privacy-controle in je browser. Anoniem of pseudoniem. Egress Guard tot jij goedkeurt.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="pim-landing">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-6 sm:py-10 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-16 items-start">
          {/* Hero — col 1 on desktop, top on mobile */}
          <header className="order-1 lg:order-1 lg:col-start-1 space-y-4 sm:space-y-6">
            <div className="inline-block border-l-2 border-[#3b6fa0] pl-4">
              <span className="font-plex-mono text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] uppercase text-[#3b6fa0]">
                {COPY.eyebrow}
              </span>
            </div>
            <h1 className="font-serif-display text-2xl sm:text-[2.25rem] lg:text-[3rem] leading-[1.2] lg:leading-[1.15] text-[#e8edf3]">
              {COPY.title}
              <br />
              {COPY.titleLine2}
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-[#e8edf3]/75 leading-relaxed max-w-xl">
              {COPY.subtitle}
            </p>
          </header>

          {/* Live Monitor — col 2 on desktop spanning 2 rows; second on mobile so it's reachable */}
          <div className="order-2 lg:order-2 lg:col-start-2 lg:row-span-2 lg:sticky lg:top-20">
            <MonitorShell />
          </div>

          {/* USPs — col 1 row 2 on desktop, below monitor on mobile */}
          <div className="order-3 lg:order-3 lg:col-start-1">
            <UspGrid />
          </div>
        </div>

        <AnonPseudoStrip />
      </div>
    </div>
  );
}
