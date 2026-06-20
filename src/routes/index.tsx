import { createFileRoute } from "@tanstack/react-router";
import { COPY } from "@/lib/pim/copy";
import { MonitorShell } from "@/components/pim/start-go/MonitorShell";
import { UspGrid } from "@/components/pim/start-go/UspGrid";
import { AnonPseudoStrip } from "@/components/pim/start-go/AnonPseudoStrip";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project PiM — Controleer je tekst op privacy voordat je hem deelt" },
      { name: "description", content: "PiM controleert tekst lokaal in je browser op persoonsgegevens. Niets verlaat je apparaat. Anoniem of pseudoniem, met uitleg voor jou, je organisatie en je tech-collega." },
      { property: "og:title", content: "Project PiM — Controleer je tekst op privacy voordat je hem deelt" },
      { property: "og:description", content: "Lokale privacy-controle in je browser. Anoniem of pseudoniem. Egress Guard tot jij goedkeurt." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="pim-landing">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-10 sm:py-14 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: narrative */}
          <div className="flex flex-col space-y-10 lg:space-y-12">
            <header className="space-y-6">
              <div className="inline-block border-l-2 border-[#3b6fa0] pl-4">
                <span className="font-plex-mono text-[11px] font-semibold tracking-[0.22em] uppercase text-[#3b6fa0]">
                  {COPY.eyebrow}
                </span>
              </div>
              <h1 className="font-serif-display text-[2rem] sm:text-[2.5rem] lg:text-[3rem] leading-[1.15] text-[#e8edf3]">
                {COPY.title}
                <br />
                {COPY.titleLine2}
              </h1>
              <p className="text-base sm:text-lg text-[#e8edf3]/75 leading-relaxed max-w-xl">
                {COPY.subtitle}
              </p>
            </header>

            <UspGrid />
          </div>

          {/* Right: live monitor */}
          <div className="lg:sticky lg:top-20">
            <MonitorShell />
          </div>
        </div>

        <AnonPseudoStrip />
      </div>
    </div>
  );
}
