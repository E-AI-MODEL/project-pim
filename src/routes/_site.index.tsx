import { createFileRoute, Link } from "@tanstack/react-router";
import { UspGrid } from "@/components/pim/start-go/UspGrid";

export const Route = createFileRoute("/_site/")({
  head: () => ({
    meta: [
      { title: "Project PiM, Controleer je tekst op privacy voordat je hem deelt" },
      {
        name: "description",
        content:
          "PiM controleert tekst lokaal in je browser op persoonsgegevens. Niets verlaat je apparaat. Anoniem of pseudoniem, met uitleg voor jou, je organisatie en je tech-collega.",
      },
      {
        property: "og:title",
        content: "Project PiM, Controleer je tekst op privacy voordat je hem deelt",
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
      <article className="mx-auto max-w-2xl px-6 sm:px-8 py-16 sm:py-24">
        <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#94a3b8]">
          Project PiM &middot; Privacy Integrity Monitor
        </p>

        <h1 className="mt-6 font-serif-display text-[2rem] sm:text-[2.75rem] leading-[1.15] text-[#0f172a]">
          Een tekst delen begint met weten wat erin staat.
        </h1>

        <div className="mt-8 space-y-5 text-[16px] leading-[1.75] text-[#334155]">
          <p>
            PiM leest mee terwijl jij typt of een stuk tekst plakt. Namen,
            adressen, BSN, telefoonnummers en andere persoonsgegevens worden
            zichtbaar gemaakt, zodat je bewust kunt kiezen wat je wél en niet
            deelt.
          </p>
          <p>
            De controle draait volledig in je browser. Geen server, geen upload,
            geen log. Wat je typt blijft van jou.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px]">
          <Link
            to="/app"
            search={{ mode: "quick" }}
            className="text-[#6d4aff] font-medium hover:underline underline-offset-4"
          >
            Snel een tekst controleren &rarr;
          </Link>
          <Link
            to="/app"
            search={{ mode: "write" }}
            className="text-[#334155] hover:text-[#0f172a] hover:underline underline-offset-4"
          >
            Schrijven met PiM
          </Link>
          <Link
            to="/over"
            className="text-[#64748b] hover:text-[#0f172a] hover:underline underline-offset-4"
          >
            Over het project
          </Link>
        </div>
      </article>

      <section className="mx-auto max-w-2xl px-6 sm:px-8 pb-24">
        <div className="border-t border-[#e5e7ef] pt-10">
          <h2 className="font-serif-display text-[1.35rem] text-[#0f172a] mb-6">
            Vier principes
          </h2>
          <UspGrid />
        </div>
      </section>
    </div>
  );
}
