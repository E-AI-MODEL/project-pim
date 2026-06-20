import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useEffect } from "react";
import { installRuntimeHardening } from "@/lib/pim/runtimeHardening";
import { runSelfTest } from "@/lib/pim/selfTest";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center panel p-10">
        <h1 className="font-display text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Pagina niet gevonden</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Bij twijfel wordt geblokkeerd. Deze route bestaat niet.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Naar home
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
          "script-src 'self' 'wasm-unsafe-eval'; " +
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
      { title: "Project PiM — Privacy Integrity Monitor (by EAI)" },
      { name: "description", content: "Browser-first privacy pipeline voor onderwijsdata. Lokale detectie, deterministische besluitvorming, fail-closed handhaving." },
      { name: "author", content: "Project PiM" },
      { property: "og:title", content: "Project PiM — Privacy Integrity Monitor (by EAI)" },
      { property: "og:description", content: "Browser-first privacy pipeline voor onderwijsdata. Lokale detectie, deterministische besluitvorming, fail-closed handhaving." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Project PiM — Privacy Integrity Monitor (by EAI)" },
      { name: "twitter:description", content: "Browser-first privacy pipeline voor onderwijsdata. Lokale detectie, deterministische besluitvorming, fail-closed handhaving." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/39dcf18b-d97a-40d8-b7d4-ea9221b8d6bf" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/39dcf18b-d97a-40d8-b7d4-ea9221b8d6bf" },
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
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}

const navLinks = [
  { to: "/", label: "Overview" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/architecture", label: "Architectuur" },
  { to: "/modes", label: "Modi" },
  { to: "/scenarios", label: "Scenarios" },
  { to: "/flags", label: "Flags" },
  { to: "/compliance", label: "Compliance" },
  { to: "/try", label: "Try-it" },
] as const;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md border-b border-border/60 bg-background/70">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/40 blur-md rounded-full" />
            <Shield className="relative h-6 w-6 text-primary" strokeWidth={2.2} />
          </div>
          <div className="font-display font-bold text-base tracking-tight">
            Project <span className="text-primary">PiM</span>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "text-foreground bg-accent/60" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground hover:bg-accent/30" }}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/try"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Try-it
        </Link>
      </div>
      <div className="md:hidden border-t border-border/40 px-3 py-2 flex gap-1 overflow-x-auto">
        {navLinks.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            activeOptions={{ exact: l.to === "/" }}
            activeProps={{ className: "text-foreground bg-accent/60" }}
            inactiveProps={{ className: "text-muted-foreground" }}
            className="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/40 mt-16">
      <div className="mx-auto max-w-7xl px-6 py-10 grid gap-6 md:grid-cols-3 text-sm">
        <div>
          <div className="flex items-center gap-2 font-display font-bold">
            <Shield className="h-4 w-4 text-primary" />
            Project PiM
          </div>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed max-w-sm">
            Browser-first privacy pipeline voor onderwijsdata. Models zijn sensors. PIM is de beslislaag.
          </p>
        </div>
        <div>
          <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Principes</div>
          <ul className="space-y-1 text-muted-foreground text-xs">
            <li>Local-first</li>
            <li>Fail-closed</li>
            <li>Mode isolation</li>
            <li>Data minimization</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Routes</div>
          <ul className="space-y-1 text-muted-foreground text-xs">
            {navLinks.map((l) => (
              <li key={l.to}><Link to={l.to} className="hover:text-foreground">{l.label}</Link></li>
            ))}
            <li><Link to="/trust" className="hover:text-foreground">Trust dashboard</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/40 py-4 text-center text-[11px] text-muted-foreground">
        Specificatie v3-2 · education-nl · Geen tracking · Geen netwerkverzoeken voor verwerking
      </div>
    </footer>
  );
}
