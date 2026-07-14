// Spec §7.2 — menu-items in vaste volgorde.
// Slice C.1 — primaire taken los van technische items. Secundaire
// (expert/diagnostiek) staan onder "Meer", standaard ingeklapt.
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Menu,
  X,
  FileText,
  PenLine,
  FlaskConical,
  ShieldCheck,
  Workflow,
  Layers,
  CheckCircle,
  Flag,
  Settings,
  Info,
  FilePlus2,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { COPY } from "@/lib/pim/copy";
import { clearAllLocalData } from "@/lib/pim";

type Item =
  | { kind: "link"; to: string; label: string; icon: React.ReactNode; hash?: string }
  | { kind: "event"; event: string; label: string; icon: React.ReactNode }
  | { kind: "new-text"; label: string; icon: React.ReactNode }
  | { kind: "clear-storage"; label: string; icon: React.ReactNode };

type Group = { label: string; items: Item[]; collapsible?: boolean };

const PRIMARY: Group = {
  label: "Werken met tekst",
  items: [
    { kind: "new-text", label: COPY.menuNewTest, icon: <FilePlus2 className="h-4 w-4" /> },
    {
      kind: "link",
      to: "/schrijven",
      label: COPY.menuWriter,
      icon: <PenLine className="h-4 w-4" />,
    },
    {
      kind: "event",
      event: "pim:open-advanced",
      label: COPY.menuSettings,
      icon: <Settings className="h-4 w-4" />,
    },
    { kind: "link", to: "/over", label: COPY.menuAbout, icon: <Info className="h-4 w-4" /> },
  ],
};

const MORE: Group = {
  label: "Expert & diagnostiek",
  collapsible: true,
  items: [
    {
      kind: "event",
      event: "pim:open-diagnostics",
      label: "Diagnostiek",
      icon: <FlaskConical className="h-4 w-4" />,
    },
    {
      kind: "link",
      to: "/pipeline",
      label: COPY.menuPipeline,
      icon: <Workflow className="h-4 w-4" />,
    },
    { kind: "link", to: "/modes", label: COPY.menuModes, icon: <Layers className="h-4 w-4" /> },
    { kind: "link", to: "/flags", label: COPY.menuFlags, icon: <Flag className="h-4 w-4" /> },
    {
      kind: "link",
      to: "/trust",
      label: COPY.menuTrust,
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      kind: "link",
      to: "/compliance",
      label: COPY.menuCompliance,
      icon: <CheckCircle className="h-4 w-4" />,
    },
    { kind: "clear-storage", label: COPY.menuClearStorage, icon: <Trash2 className="h-4 w-4" /> },
  ],
};

const GROUPS: Group[] = [PRIMARY, MORE];
// Legacy const kept for downstream reference; unused elsewhere.
const _LEGACY_GROUPS: Group[] = [
  {
    label: "Werken met tekst",
    items: [
      {
        kind: "event",
        event: "pim:reset",
        label: COPY.menuNewTest,
        icon: <FilePlus2 className="h-4 w-4" />,
      },
      {
        kind: "link",
        to: "/schrijven",
        label: COPY.menuWriter,
        icon: <PenLine className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Tech-expert",
    items: [
      {
        kind: "link",
        to: "/try",
        label: COPY.menuExpertLab,
        icon: <FlaskConical className="h-4 w-4" />,
      },
      {
        kind: "link",
        to: "/pipeline",
        label: COPY.menuPipeline,
        icon: <Workflow className="h-4 w-4" />,
      },
      { kind: "link", to: "/modes", label: COPY.menuModes, icon: <Layers className="h-4 w-4" /> },
      { kind: "link", to: "/flags", label: COPY.menuFlags, icon: <Flag className="h-4 w-4" /> },
    ],
  },
  {
    label: "Vertrouwen & beleid",
    items: [
      {
        kind: "link",
        to: "/trust",
        label: COPY.menuTrust,
        icon: <ShieldCheck className="h-4 w-4" />,
      },
      {
        kind: "link",
        to: "/compliance",
        label: COPY.menuCompliance,
        icon: <CheckCircle className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "Systeem",
    items: [
      {
        kind: "event",
        event: "pim:open-advanced",
        label: COPY.menuSettings,
        icon: <Settings className="h-4 w-4" />,
      },
      { kind: "clear-storage", label: COPY.menuClearStorage, icon: <Trash2 className="h-4 w-4" /> },
      { kind: "link", to: "/over", label: COPY.menuAbout, icon: <Info className="h-4 w-4" /> },
    ],
  },
];

export function BurgerMenu() {
  const [open, setOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const handleNewText = () => {
    // Bevestig alleen wanneer de writer echt tekstinhoud heeft.
    const cached =
      typeof document !== "undefined"
        ? document.body.getAttribute("data-pim-writer-has-content") === "1"
        : false;
    if (cached) {
      const ok = window.confirm(
        "Er staat tekst in de schrijfmodus. Weet je zeker dat je alles wilt " +
          "wissen en met een nieuwe tekst wilt beginnen?",
      );
      if (!ok) return;
    }
    setOpen(false);
    // Reset engine + invoer via bestaande handler in ProductShell.
    window.dispatchEvent(new CustomEvent("pim:reset"));
    // Navigeer naar Controleren-modus.
    navigate({ to: "/app", search: { mode: "quick" } });
    // Focushint voor het hoofdtekstveld.
    setTimeout(() => window.dispatchEvent(new CustomEvent("pim:focus-primary")), 80);
  };

  const handleClearStorage = async () => {
    if (clearing) return;
    const includeModels = window.confirm(
      "Lokale opslag wissen?\n\n" +
        "Dit ruimt je werkdata op: token-mappings, de review-queue, en lokale " +
        "opslag van deze browser. Klik OK om ook de gedownloade modellen " +
        "(NER ~100 MB, Qwen ~400 MB) te wissen. Die worden dan opnieuw " +
        "gedownload zodra je ze weer aanzet.\n\n" +
        "Annuleer om niets te wissen.",
    );
    if (!includeModels && !window.confirm("Alleen werkdata wissen, modellen behouden?")) {
      return;
    }
    setClearing(true);
    try {
      const r = await clearAllLocalData({ includeModels });
      window.dispatchEvent(new CustomEvent("pim:reset"));
      setOpen(false);
      const parts = [
        `${r.localStorage + r.sessionStorage} opslagsleutels`,
        r.modelsCleared ? `${r.caches} caches · ${r.indexedDb} databases` : "modellen behouden",
      ];
      window.alert(
        `Lokale opslag gewist (${parts.join(", ")}).` +
          (r.errors.length
            ? `\n\nLet op: ${r.errors.length} onderdeel kon niet volledig worden gewist.`
            : ""),
      );
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
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
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex">
            <button
              type="button"
              aria-label="Sluit menu"
              onClick={() => setOpen(false)}
              className="flex-1 bg-black/40 backdrop-blur-sm transition-opacity"
            />
            <nav className="w-64 max-w-[85vw] bg-background border-l border-border/40 shadow-2xl shadow-black/20 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Menu
                </span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Sluiten"
                  className="h-7 w-7 rounded-md hover:bg-accent/50 inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {GROUPS.map((group, gi) => (
                  <section
                    key={group.label}
                    className={gi > 0 ? "mt-2 pt-2 border-t border-border/30" : ""}
                  >
                    {group.collapsible ? (
                      <button
                        type="button"
                        onClick={() => setMoreOpen((v) => !v)}
                        aria-expanded={moreOpen}
                        className="w-full flex items-center justify-between px-4 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 hover:text-foreground"
                      >
                        <span>{group.label}</span>
                        {moreOpen ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>
                    ) : (
                      <h3 className="px-4 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                        {group.label}
                      </h3>
                    )}
                    <ul hidden={group.collapsible && !moreOpen}>
                      {group.items.map((item, i) => (
                        <li key={`${item.label}-${i}`}>
                          {item.kind === "link" ? (
                            <Link
                              to={item.to}
                              onClick={() => setOpen(false)}
                              className={[
                                "flex items-center gap-3 px-4 py-2 text-[13px] font-medium rounded-md mx-2 my-0.5 transition-colors",
                                isActive(item.to)
                                  ? "bg-primary/10 text-primary"
                                  : "text-foreground/80 hover:bg-accent/40 hover:text-foreground",
                              ].join(" ")}
                            >
                              <span
                                className={
                                  isActive(item.to) ? "text-primary" : "text-muted-foreground"
                                }
                              >
                                {item.icon}
                              </span>
                              {item.label}
                            </Link>
                          ) : item.kind === "clear-storage" ? (
                            <button
                              type="button"
                              onClick={handleClearStorage}
                              disabled={clearing}
                              className="w-full text-left flex items-center gap-3 px-4 py-2 text-[13px] font-medium rounded-md mx-2 my-0.5 text-foreground/80 hover:bg-rose-500/10 hover:text-rose-200 disabled:opacity-50 transition-colors"
                            >
                              <span className="text-muted-foreground">
                                {clearing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  item.icon
                                )}
                              </span>
                              {clearing ? "Bezig met wissen…" : item.label}
                            </button>
                          ) : item.kind === "new-text" ? (
                            <button
                              type="button"
                              data-testid="menu-new-text"
                              onClick={handleNewText}
                              className="w-full text-left flex items-center gap-3 px-4 py-2 text-[13px] font-medium rounded-md mx-2 my-0.5 text-foreground/80 hover:bg-accent/40 hover:text-foreground transition-colors"
                            >
                              <span className="text-muted-foreground">{item.icon}</span>
                              {item.label}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setOpen(false);
                                setTimeout(
                                  () => window.dispatchEvent(new CustomEvent(item.event)),
                                  60,
                                );
                              }}
                              className="w-full text-left flex items-center gap-3 px-4 py-2 text-[13px] font-medium rounded-md mx-2 my-0.5 text-foreground/80 hover:bg-accent/40 hover:text-foreground transition-colors"
                            >
                              <span className="text-muted-foreground">{item.icon}</span>
                              {item.label}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
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
