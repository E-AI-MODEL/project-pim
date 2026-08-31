import { useEffect, useState } from "react";
import { AdvancedPanel } from "@/components/pim/start-go/AdvancedPanel";
import { useProductShell } from "./ProductShellContext";
import type { ProductMode } from "./types";
import type { PiiCategory } from "@/lib/pim";
import { readDeviceCapability, type DeviceCapability } from "@/lib/pim/deviceCapability";

/**
 * Instellingen-inhoud voor het gedeelde zijpaneel: waar PiM op let, hoe streng
 * hij meekijkt en wat hij meteen weghaalt. Geldt voor beide schermen.
 */
export function SettingsTab({ mode }: { mode: ProductMode }) {
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
  const [device, setDevice] = useState<DeviceCapability | null>(null);
  useEffect(() => {
    setDevice(readDeviceCapability());
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
    <div>
      {device?.isMobile && (
        <div
          data-testid="mobile-model-advice"
          className="mb-3 rounded-xl border border-[#e5e7ef] bg-white p-3 text-[12px] leading-relaxed text-[#475569]"
        >
          <div className="text-[13px] font-semibold text-[#0f172a]">Op je telefoon</div>
          <p className="mt-1">
            Herkennen van namen, nummers, e-mailadressen en adressen werkt altijd en kost niets.
          </p>
          <p className="mt-1">{device.advice}</p>
        </div>
      )}
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
  );
}
