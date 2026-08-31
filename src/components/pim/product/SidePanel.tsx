import { useEffect, useState } from "react";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
  FlaskConical,
  Info,
  Workflow,
  Layers,
  Flag,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DiagnosticsBody } from "@/components/pim/start-go/LiveTechMonitor";
import { ClearStorageButton } from "./AboutTab";
import { COPY } from "@/lib/pim/copy";

export type SidePanelView = "menu" | "settings" | "diagnostics";

const LINKS = [
  { to: "/over", label: COPY.menuAbout, icon: <Info className="h-4 w-4" /> },
  { to: "/pipeline", label: COPY.menuPipeline, icon: <Workflow className="h-4 w-4" /> },
  { to: "/modes", label: COPY.menuModes, icon: <Layers className="h-4 w-4" /> },
  { to: "/flags", label: COPY.menuFlags, icon: <Flag className="h-4 w-4" /> },
  { to: "/trust", label: COPY.menuTrust, icon: <ShieldCheck className="h-4 w-4" /> },
  { to: "/compliance", label: COPY.menuCompliance, icon: <CheckCircle className="h-4 w-4" /> },
];

const ROW =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-[#334155] hover:bg-[#f1f2f7] hover:text-[#0f172a]";

/**
 * Eén knop rechtsboven voor alles wat geen tekstwerk is. Opent het gedeelde
 * zijpaneel via een event, zodat header en paneel losgekoppeld blijven.
 */
export function MenuButton() {
  return (
    <button
      type="button"
      aria-label="Menu"
      data-testid="open-menu"
      onClick={() => window.dispatchEvent(new CustomEvent("pim:open-menu"))}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f1f2f7] hover:text-[#0f172a] transition-colors"
    >
      <Menu className="h-4 w-4" />
    </button>
  );
}

/**
 * Het gedeelde zijpaneel: het menu zelf is de startpagina, instellingen en
 * diagnostiek zijn onderdelen daarvan. Altijd rechts, altijd op dezelfde
 * manier te sluiten. Zonder `settings` (informatiepagina's) vervalt dat item.
 */
export function SidePanel({ settings }: { settings?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<SidePanelView>("menu");
  const navigate = useNavigate();

  useEffect(() => {
    const openWith = (v: SidePanelView) => () => {
      if (v === "settings" && !settings) {
        // Zonder eigen instellingencontext (achtergrondpagina's): ga naar het
        // nakijkscherm; het daar gemonteerde paneel opent direct de settings.
        void navigate({ to: "/app", search: { mode: "check" } });
        setTimeout(() => window.dispatchEvent(new CustomEvent("pim:open-settings")), 80);
        return;
      }
      setView(v);
      setOpen(true);
    };
    const onMenu = openWith("menu");
    const onSettings = openWith("settings");
    const onDiagnostics = openWith("diagnostics");
    window.addEventListener("pim:open-menu", onMenu);
    window.addEventListener("pim:open-settings", onSettings);
    // Oudere namen die elders nog gebruikt kunnen worden.
    window.addEventListener("pim:open-expert", onSettings);
    window.addEventListener("pim:open-advanced", onSettings);
    window.addEventListener("pim:open-diagnostics", onDiagnostics);
    return () => {
      window.removeEventListener("pim:open-menu", onMenu);
      window.removeEventListener("pim:open-settings", onSettings);
      window.removeEventListener("pim:open-expert", onSettings);
      window.removeEventListener("pim:open-advanced", onSettings);
      window.removeEventListener("pim:open-diagnostics", onDiagnostics);
    };
  }, [settings]);

  const title =
    view === "settings" ? "Instellingen" : view === "diagnostics" ? "Diagnostiek" : "Menu";

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setView("menu");
      }}
    >
      <SheetContent
        side="right"
        className="w-full h-full sm:max-w-sm bg-[#f6f7fb] border-l border-[#e2e8f0] text-[#0f172a] overflow-y-auto p-0"
        data-testid="side-panel"
      >
        <SheetHeader className="sticky top-0 flex-row items-center gap-2 space-y-0 border-b border-[#e2e8f0] bg-[#f6f7fb] px-3 py-2.5">
          {view !== "menu" && (
            <button
              type="button"
              aria-label="Terug naar menu"
              data-testid="panel-back"
              onClick={() => setView("menu")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#64748b] hover:bg-[#eef0f6] hover:text-[#0f172a]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <SheetTitle className="text-[13px] font-semibold uppercase tracking-wide text-[#64748b]">
            {title}
          </SheetTitle>
          <SheetClose
            aria-label="Sluiten"
            className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-[#64748b] hover:bg-[#eef0f6] hover:text-[#0f172a]"
          >
            <X className="h-4 w-4" />
          </SheetClose>
        </SheetHeader>

        <div className="p-3">
          {view === "menu" && (
            <div className="space-y-2" data-testid="panel-menu">
              <nav className="rounded-xl border border-[#e2e8f0] bg-white p-1">
                <ul>
                  <li>
                    <button
                      type="button"
                      data-testid="menu-item-settings"
                      onClick={() => {
                        if (settings) {
                          setView("settings");
                        } else {
                          // Achtergrondpagina: instellingen wonen in het
                          // nakijkscherm; navigeer en open ze daar.
                          setOpen(false);
                          void navigate({ to: "/app", search: { mode: "check" } }).then(() => {
                            setTimeout(
                              () => window.dispatchEvent(new CustomEvent("pim:open-settings")),
                              50,
                            );
                          });
                        }
                      }}
                      className={ROW}
                    >
                      <span className="text-[#94a3b8]">
                        <SlidersHorizontal className="h-4 w-4" />
                      </span>
                      <span className="flex-1 text-left">
                        Instellingen
                        {!settings && (
                          <span className="block text-[11px] font-normal text-[#94a3b8]">
                            In Tekst nakijken
                          </span>
                        )}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#cbd5e1]" />
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      data-testid="menu-item-diagnostics"
                      onClick={() => setView("diagnostics")}
                      className={ROW}
                    >
                      <span className="text-[#94a3b8]">
                        <FlaskConical className="h-4 w-4" />
                      </span>
                      <span className="flex-1 text-left">Diagnostiek</span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#cbd5e1]" />
                    </button>
                  </li>
                </ul>
              </nav>

              <div className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-[#94a3b8]">
                Achtergrond
              </div>
              <nav className="rounded-xl border border-[#e2e8f0] bg-white p-1" data-testid="about-tab">
                <ul>
                  {LINKS.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} onClick={() => setOpen(false)} className={ROW}>
                        <span className="text-[#94a3b8]">{l.icon}</span>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="rounded-xl border border-[#e2e8f0] bg-white p-1">
                <ClearStorageButton className={ROW} />
              </div>

              <p className="px-1 pt-1 text-[11px] leading-relaxed text-[#94a3b8]">
                Alles gebeurt op dit apparaat. Je tekst wordt niet verstuurd.
              </p>
            </div>
          )}

          {view === "settings" && settings && (
            <div data-testid="settings-panel">{settings}</div>
          )}

          {view === "diagnostics" && <DiagnosticsBody />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
