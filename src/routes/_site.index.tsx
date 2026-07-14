import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { UspGrid } from "@/components/pim/start-go/UspGrid";
import { ArrowRight, PenLine, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_site/")({
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
    <div className="bg-[#f6f7fb] text-[#0f172a]">
      <section className="mx-auto max-w-5xl px-5 sm:px-8 py-14 sm:py-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7ef] bg-white px-3 py-1 text-[11px] font-medium text-[#475569]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#6d4aff]" />
          Draait volledig in je browser
        </span>
        <h1 className="mt-5 text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1] max-w-3xl">
          Weet zeker dat je tekst geen privé­gegevens bevat,
          <span className="text-[#6d4aff]"> voordat je hem deelt.</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-[#475569] max-w-2xl leading-relaxed">
          Plak een stuk tekst of schrijf een verslag. PiM streept namen,
          adressen en andere persoonsgegevens direct aan — zonder iets te
          versturen.
        </p>
        <div className="mt-7 flex flex-wrap gap-2.5">
          <Link
            to="/app"
            search={{ mode: "quick" }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6d4aff] hover:bg-[#5b3dea] px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
          >
            Snel controleren
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/app"
            search={{ mode: "write" }}
            className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7ef] bg-white hover:bg-[#eef0f5] px-4 py-2.5 text-sm font-semibold text-[#334155]"
          >
            <PenLine className="h-4 w-4" />
            Schrijven met PiM
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 sm:px-8 pb-20">
        <UspGrid />
      </section>
    </div>
  );
}
