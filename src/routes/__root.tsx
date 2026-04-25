import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Shield } from "lucide-react";

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
      { title: "Project PIM — Privacy Integrity Monitor" },
      { name: "description", content: "Browser-first privacy pipeline voor onderwijsdata. Lokale detectie, deterministische besluitvorming, fail-closed handhaving." },
      { name: "author", content: "Project PIM" },
      { property: "og:title", content: "Project PIM — Privacy Integrity Monitor" },
      { property: "og:description", content: "Browser-first privacy pipeline voor onderwijsdata." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
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
    <html lang="en">
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
            Project <span className="text-primary">PIM</span>
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
            Project PIM
          </div>
          <p className="mt-2 text-muted-foreground text-xs leading-relaxed max-w-sm">
            Browser-first privacy pipeline voor onderwijsdata. Models are sensors. PIM is the decision layer.
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
          </ul>
        </div>
      </div>
      <div className="border-t border-border/40 py-4 text-center text-[11px] text-muted-foreground">
        Specificatie v2.0 · Geen tracking · Geen netwerkverzoeken voor verwerking
      </div>
    </footer>
  );
}
