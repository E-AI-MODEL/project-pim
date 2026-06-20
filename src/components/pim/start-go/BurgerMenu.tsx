// Spec §7.2 — 10 menu-items in vaste volgorde.
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Menu, X, FileText, PenLine, FlaskConical, ShieldCheck,
  Workflow, Layers, CheckCircle, Flag, Settings, Info, Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { COPY } from "@/lib/pim/copy";

type Item =
  | { kind: "link"; to: string; label: string; icon: React.ReactNode; hash?: string }
  | { kind: "event"; event: string; label: string; icon: React.ReactNode };

const ITEMS: Item[] = [
  { kind: "event", event: "pim:reset", label: COPY.menuNewTest, icon: <Sparkles className="h-4 w-4" /> },
  { kind: "link",   to: "/schrijven", label: COPY.menuWriter, icon: <PenLine className="h-4 w-4" /> },
  { kind: "link",   to: "/try", label: COPY.menuExpertLab, icon: <FlaskConical className="h-4 w-4" /> },
  { kind: "link",   to: "/trust", label: COPY.menuTrust, icon: <ShieldCheck className="h-4 w-4" /> },
  { kind: "link",   to: "/pipeline", label: COPY.menuPipeline, icon: <Workflow className="h-4 w-4" /> },
  { kind: "link",   to: "/modes", label: COPY.menuModes, icon: <Layers className="h-4 w-4" /> },
  { kind: "link",   to: "/compliance", label: COPY.menuCompliance, icon: <CheckCircle className="h-4 w-4" /> },
  { kind: "link",   to: "/flags", label: COPY.menuFlags, icon: <Flag className="h-4 w-4" /> },
  { kind: "event", event: "pim:open-advanced", label: COPY.menuSettings, icon: <Settings className="h-4 w-4" /> },
  { kind: "link",   to: "/over", label: COPY.menuAbout, icon: <Info className="h-4 w-4" /> },
];

export function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-card/60 text-foreground/80 hover:bg-card hover:text-foreground transition-all"
      >
        <Menu className="h-4 w-4" />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Sluit menu"
            onClick={() => setOpen(false)}
            className="flex-1 bg-black/40 backdrop-blur-sm transition-opacity"
          />
          <nav className="w-64 max-w-[85vw] bg-background border-l border-border/40 shadow-2xl shadow-black/20 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Sluiten"
                className="h-7 w-7 rounded-md hover:bg-accent/50 inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto py-1">
              {ITEMS.map((item, i) => (
                <li key={`${item.label}-${i}`}>
                  {item.kind === "link" ? (
                    <Link
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={[
                        "flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-md mx-2 my-0.5 transition-colors",
                        isActive(item.to)
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/80 hover:bg-accent/40 hover:text-foreground",
                      ].join(" ")}
                    >
                      <span className={isActive(item.to) ? "text-primary" : "text-muted-foreground"}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setTimeout(() => window.dispatchEvent(new CustomEvent(item.event)), 60);
                      }}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-md mx-2 my-0.5 text-foreground/80 hover:bg-accent/40 hover:text-foreground transition-colors"
                    >
                      <span className="text-muted-foreground">{item.icon}</span>
                      {item.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="px-4 py-3 border-t border-border/30">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>PiM Privacy Control</span>
              </div>
            </div>
          </nav>
        </div>,
        document.body,
      )}
    </>
  );
}
