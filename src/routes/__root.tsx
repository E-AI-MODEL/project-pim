import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { installRuntimeHardening } from "@/lib/pim/runtimeHardening";
import { META_CONTENT_SECURITY_POLICY } from "@/lib/security/headers";
import { runSelfTest } from "@/lib/pim/selfTest";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center panel p-10">
        <h1 className="font-display text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Pagina niet gevonden</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Deze pagina bestaat niet. PiM houdt zich aan zijn eigen regel: bij twijfel niets
          doorlaten.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Terug naar de startpagina
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        httpEquiv: "Content-Security-Policy",
        // Afgeleid van src/lib/security/headers.ts, zodat de allowlist voor
        // modelhosts op één plek staat. De HTTP-header uit src/start.ts is
        // leidend; deze meta is de fallback voor statisch geserveerde HTML.
        content: META_CONTENT_SECURITY_POLICY,
      },
      { title: "Project PiM" },
      {
        name: "description",
        content:
          "Project PiM controleert tekst lokaal in je browser op persoonsgegevens. Eerst veilig, dan pas delen, met uitleg.",
      },
      { name: "author", content: "Project PiM" },
      { property: "og:title", content: "Project PiM" },
      {
        property: "og:description",
        content:
          "Project PiM controleert tekst lokaal in je browser op persoonsgegevens. Eerst veilig, dan pas delen, met uitleg.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Project PiM" },
      {
        name: "twitter:description",
        content:
          "Project PiM controleert tekst lokaal in je browser op persoonsgegevens. Eerst veilig, dan pas delen, met uitleg.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/ed0bcc87-d534-440f-a0b5-007a242bd0d8",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/ed0bcc87-d534-440f-a0b5-007a242bd0d8",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  // App-brede runtime hardening: patch fetch/XHR/sendBeacon/WebSocket
  // bij de eerste render, niet pas wanneer Try-it geopend wordt.
  useEffect(() => {
    installRuntimeHardening();
    // Boot self-test: golden-set + ruleset-hash + hardening-probe.
    // Niet-blokkerend; resultaat verschijnt op /trust.
    runSelfTest().catch((e) => console.error("[PIM self-test] error", e));
  }, []);

  return <Outlet />;
}
