import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AdvancedPanel } from "@/components/pim/start-go/AdvancedPanel";
import { useProductShell } from "./ProductShellContext";
import type { ProductMode } from "./types";
import type { PiiCategory } from "@/lib/pim";
import { readDeviceCapability, type DeviceCapability } from "@/lib/pim/deviceCapability";


/**
 * Eén instellingenplek voor beide schermen: waar PiM op let, hoe streng hij
 * meekijkt en wat hij meteen weghaalt. Opent via de knop "Instellingen" in de
 * StatusFooter of via het `pim:open-settings`-event (BurgerMenu). Status en
 * modelinformatie horen in Diagnostiek, niet hier.
 */
export function SettingsPanel({ mode }: { mode: ProductMode }) {
  const {
    settings,
    writerAutoRedact,
    setWriterAutoRedact,
    writerStrict,
    setWriterStrict,
    usesNerSlm,
    nerStatus,
    startNer,
  } = useProductShell();
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<DeviceCapability | null>(null);
  useEffect(() => {
    setDevice(readDeviceCapability());
  }, []);


  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("pim:open-settings", onOpen);
    // Oudere namen die elders nog gebruikt kunnen worden.
    window.addEventListener("pim:open-expert", onOpen);
    window.addEventListener("pim:open-advanced", onOpen);
    return () => {
      window.removeEventListener("pim:open-settings", onOpen);
      window.removeEventListener("pim:open-expert", onOpen);
      window.removeEventListener("pim:open-advanced", onOpen);
    };
  }, []);

  const isWriter = mode === "write";
  const props = settings.advancedPanelProps;
  const writerProps = isWriter
    ? {
        autoRedact: writerAutoRedact,
        onAutoRedactChange: (cat: PiiCategory, scrub: boolean) => {
          const next = new Set(writerAutoRedact);
          if (scrub) next.add(cat);
          else next.delete(cat);
          setWriterAutoRedact(next);
        },
        strict: writerStrict,
        onStrictChange: setWriterStrict,
      }
    : undefined;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full h-full sm:max-w-md bg-[#f6f7fb] border-l border-[#e2e8f0] text-[#0f172a] overflow-y-auto p-5"
        data-testid="settings-panel"
      >
        <SheetHeader className="space-y-1 pb-3 border-b border-[#e2e8f0]">
          <SheetTitle className="font-serif-display text-[#0f172a] text-lg">
            Instellingen
          </SheetTitle>
          <SheetDescription className="text-[#64748b] text-xs">
            Waar PiM op let en hoe streng hij meekijkt. Geldt voor beide schermen.
          </SheetDescription>
        </SheetHeader>
        {device?.isMobile && (
          <div
            data-testid="mobile-model-advice"
            className="mt-3 rounded-xl border border-[#e5e7ef] bg-white p-3 text-[12px] leading-relaxed text-[#475569]"
          >
            <div className="text-[13px] font-semibold text-[#0f172a]">Op je telefoon</div>
            <p className="mt-1">
              Herkennen van namen, nummers, e-mailadressen en adressen werkt altijd en kost niets.
            </p>
            <p className="mt-1">{device.advice}</p>
          </div>
        )}
        <div className="mt-3">
          <AdvancedPanel
            {...props}
            writer={writerProps}
            ner={{
              status: nerStatus,
              onStart: startNer,
              available: usesNerSlm && (device ? device.canRunSmartModel : true),
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

