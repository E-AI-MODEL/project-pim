import { Outlet, Link, createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { StartHeader } from "@/components/pim/start-go/StartHeader";

export const Route = createFileRoute("/_site")({
  component: SiteLayout,
});

function SiteLayout() {
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
          <Link to="/app" search={{ mode: "quick" }} className="hover:text-foreground">App</Link>
        </div>
      </div>
    </footer>
  );
}
