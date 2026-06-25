import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/try")({
  head: () => ({
    meta: [
      { title: "Project PiM" },
      {
        name: "description",
        content:
          "De experimentele testpagina is gesloten. Project PiM bouwt nu alleen aan de startcontrole en de schrijfmodus.",
      },
      { property: "og:title", content: "Project PiM" },
      {
        property: "og:description",
        content:
          "De experimentele testpagina is gesloten. Gebruik de startcontrole of de schrijfmodus.",
      },
    ],
  }),
  component: TryPage,
});

function TryPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-white/45">
          /try staat uit
        </div>
        <h1 className="font-serif-display text-3xl font-semibold tracking-tight sm:text-5xl">
          Project PiM bouwt nu op twee plekken.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
          De oude expertpagina blijft zwart, zodat de inhoud van de startcontrole en de schrijfmodus niet meer door elkaar loopt.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            Naar controle
          </Link>
          <Link
            to="/schrijven"
            className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
          >
            Naar schrijven
          </Link>
        </div>
      </div>
    </div>
  );
}
