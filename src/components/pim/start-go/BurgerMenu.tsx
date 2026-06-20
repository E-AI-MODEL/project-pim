// Spec §7.2 — 10 menu-items in vaste volgorde.
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { COPY } from "@/lib/pim/copy";

type Item =
  | { kind: "link"; to: string; label: string; hash?: string }
  | { kind: "event"; event: string; label: string };

const ITEMS: Item[] = [
  { kind: "event", event: "pim:reset", label: COPY.menuNewTest },
  { kind: "event", event: "pim:open-examples", label: COPY.menuExamples },
  { kind: "link", to: "/schrijven", label: COPY.menuWriter },
  { kind: "link", to: "/try", label: COPY.menuExpertLab },
  { kind: "link", to: "/trust", label: COPY.menuTrust },
  { kind: "link", to: "/pipeline", label: COPY.menuPipeline },
  { kind: "link", to: "/modes", label: COPY.menuModes },
  { kind: "link", to: "/compliance", label: COPY.menuCompliance },
  { kind: "link", to: "/flags", label: COPY.menuFlags },
  { kind: "event", event: "pim:open-advanced", label: COPY.menuSettings },
  { kind: "link", to: "/over", label: COPY.menuAbout },
];

export function BurgerMenu() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60 bg-card/50 hover:bg-card transition-colors"
      >
        <Menu className="h-4 w-4" />
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Sluit menu"
            onClick={() => setOpen(false)}
            className="flex-1 bg-black/60 backdrop-blur-sm"
          />
          <nav className="w-72 max-w-[85vw] bg-background border-l border-border/60 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <span className="font-display font-bold">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Sluiten" className="h-8 w-8 rounded-md hover:bg-accent/40 inline-flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto py-2">
              {ITEMS.map((item, i) => (
                <li key={`${item.label}-${i}`}>
                  {item.kind === "link" ? (
                    <Link
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="block px-5 py-2.5 text-sm hover:bg-accent/30"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        // wacht tot menu dicht is — voorkomt focus-trap-conflict met popovers
                        setTimeout(() => window.dispatchEvent(new CustomEvent(item.event)), 60);
                      }}
                      className="w-full text-left block px-5 py-2.5 text-sm hover:bg-accent/30"
                    >
                      {item.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>,
        document.body,
      )}
    </>
  );
}