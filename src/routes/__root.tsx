import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useEffect } from "react";
import { installRuntimeHardening } from "@/lib/pim/runtimeHardening";
import { runSelfTest } from "@/lib/pim/selfTest";
import { StartHeader } from "@/components/pim/start-go/StartHeader";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center panel p-10">
        <h1 className="font-display text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Pagina niet gevonden</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Deze pagina bestaat niet. PiM houdt zich aan zijn eigen regel: bij twijfel niets doorlaten.
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
        content:
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: blob: https://storage.googleapis.com; " +
          "font-src 'self' data:; " +
          "connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co https://cas-bridge.xethub.hf.co https://cdn.jsdelivr.net https://unpkg.com https://raw.githubusercontent.com https://github.com; " +
          "worker-src 'self' blob:; " +
          "object-src 'none'; " +
          "base-uri 'self'; " +
          "form-action 'self'; " +
          "frame-ancestors 'none'",
      },
      { title: "Project PiM" },
      { name: "description", content: "Project PiM controleert tekst lokaal in je browser op persoonsgegevens. Eerst veilig, dan pas delen — met uitleg." },
      { name: "author", content: "Project PiM" },
      { property: "og:title", content: "Project PiM" },
      { property: "og:description", content: "Project PiM controleert tekst lokaal in je browser op persoonsgegevens. Eerst veilig, dan pas delen — met uitleg." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Project PiM" },
      { name: "twitter:description", content: "Project PiM controleert tekst lokaal in je browser op persoonsgegevens. Eerst veilig, dan pas delen — met uitleg." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/ed0bcc87-d534-440f-a0b5-007a242bd0d8" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/ed0bcc87-d534-440f-a0b5-007a242bd0d8" },
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

  return (
    <div className="min-h-screen flex flex-col">
      <StartHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/40 mt-16 py-6">
      <div className="mx-auto max-w-5xl px-6 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span>Project PiM — volledig lokaal, zonder tracking</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/over" className="hover:text-foreground">Over</Link>
          <Link to="/trust" className="hover:text-foreground">Trust</Link>
          <Link to="/try" className="hover:text-foreground">Expert lab</Link>
        </div>
      </div>
    </footer>
  );
}