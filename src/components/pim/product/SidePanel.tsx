import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiagnosticsBody } from "@/components/pim/start-go/LiveTechMonitor";
import { AboutTab } from "./AboutTab";

export type SidePanelTab = "settings" | "diagnostics" | "about";

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
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f1f2f7] hover:text-[#0f172a] transition-colors"
    >
      <Menu className="h-4 w-4" />
    </button>
  );
}

/**
 * Het gedeelde zijpaneel: instellingen, diagnostiek en informatie op één
 * plek, altijd rechts, altijd op dezelfde manier te sluiten. Zonder
 * `settings` (bijvoorbeeld op de informatiepagina's) vervalt dat tabblad.
 */
export function SidePanel({ settings }: { settings?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SidePanelTab>(settings ? "settings" : "about");

  useEffect(() => {
    const openWith = (t: SidePanelTab) => () => {
      setTab(t === "settings" && !settings ? "about" : t);
      setOpen(true);
    };
    const onMenu = openWith(settings ? "settings" : "about");
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full h-full sm:max-w-md bg-[#f6f7fb] border-l border-[#e2e8f0] text-[#0f172a] overflow-y-auto p-5"
        data-testid="side-panel"
      >
        <SheetHeader className="space-y-1 pb-3 border-b border-[#e2e8f0]">
          <SheetTitle className="font-serif-display text-[#0f172a] text-lg">Menu</SheetTitle>
          <SheetDescription className="text-[#64748b] text-xs">
            Instellingen, diagnostiek en achtergrond. Sluit met Escape of naast het paneel te
            klikken.
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as SidePanelTab)}
          className="mt-3"
        >
          <TabsList
            className={`grid w-full bg-[#eef0f6] ${settings ? "grid-cols-3" : "grid-cols-2"}`}
          >
            {settings && (
              <TabsTrigger value="settings" className="text-xs" data-testid="tab-settings">
                Instellingen
              </TabsTrigger>
            )}
            <TabsTrigger value="diagnostics" className="text-xs" data-testid="tab-diagnostics">
              Diagnostiek
            </TabsTrigger>
            <TabsTrigger value="about" className="text-xs" data-testid="tab-about">
              Over
            </TabsTrigger>
          </TabsList>

          {settings && (
            <TabsContent value="settings" className="mt-3" data-testid="settings-panel">
              {settings}
            </TabsContent>
          )}
          <TabsContent value="diagnostics" className="mt-3">
            <DiagnosticsBody />
          </TabsContent>
          <TabsContent value="about" className="mt-3">
            <AboutTab onNavigate={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
