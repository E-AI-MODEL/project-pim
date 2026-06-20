// Spec §7.2 — 10 menu-items in vaste volgorde.
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { COPY } from "@/lib/pim/copy";

const ITEMS: { to: string; label: string; hash?: string }[] = [
  { to: "/", label: COPY.menuNewTest },
  { to: "/", label: COPY.menuExamples, hash: "voorbeelden" },
  { to: "/try", label: COPY.menuExpertLab },
  { to: "/trust", label: COPY.menuTrust },
  { to: "/pipeline", label: COPY.menuPipeline },
  { to: "/modes", label: COPY.menuModes },
  { to: "/compliance", label: COPY.menuCompliance },
  { to: "/flags", label: COPY.menuFlags },
  { to: "/over", label: COPY.menuSettings, hash: "instellingen" },
  { to: "/over", label: COPY.menuAbout },
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
      {open && (
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
                <li key={`${item.to}-${item.label}-${i}`}>
                  <Link
                    to={item.to}
                    hash={item.hash}
                    onClick={() => setOpen(false)}
                    className="block px-5 py-2.5 text-sm hover:bg-accent/30"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}