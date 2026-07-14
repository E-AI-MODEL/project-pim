// Spec §7.1 — header = logo + status + ☰.
import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { LocalStatusPill } from "./LocalStatusPill";
import { BurgerMenu } from "./BurgerMenu";

export function StartHeader() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md border-b border-border/60 bg-background/70">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/40 blur-md rounded-full" />
            <Shield className="relative h-5 w-5 text-primary" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-sm tracking-tight">
              Project <span className="text-primary">PiM</span>
            </div>
            <div className="text-[10px] text-muted-foreground hidden sm:block">
              Veilig delen, lokaal gecontroleerd
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <LocalStatusPill />
          <BurgerMenu />
        </div>
      </div>
    </header>
  );
}
