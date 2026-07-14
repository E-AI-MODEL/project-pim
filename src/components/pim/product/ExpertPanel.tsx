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

/**
 * Slice C, één gedeeld expertpaneel voor detectielagen, drempels,
 * categorie-instellingen, strict mode en integriteitsdetails. Vervangt
 * de per-modus AdvancedPanels. Opent via de "Expertinstellingen"-knop in
 * de StatusFooter of via het `pim:open-advanced`-event (BurgerMenu).
 *
 * Writer-specifieke instellingen (auto-redact per categorie, strenge
 * cijfercontrole) worden alleen getoond wanneer de shell in write-mode
 * staat; de state leeft op ProductShell-niveau zodat de WriterWorkspace
 * zelf géén AdvancedPanel meer hoeft te tonen.
 */
export function ExpertPanel({ mode }: { mode: ProductMode }) {
  const { settings, writerAutoRedact, setWriterAutoRedact, writerStrict, setWriterStrict } =
    useProductShell();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("pim:open-expert", onOpen);
    // Legacy naam die de BurgerMenu al gebruikt.
    window.addEventListener("pim:open-advanced", onOpen);
    return () => {
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
        className="w-full sm:max-w-md bg-[#f6f7fb] border-l border-[#e2e8f0] text-[#0f172a] overflow-y-auto p-5"
        data-testid="expert-panel"
      >
        <SheetHeader className="space-y-1 pb-3 border-b border-[#e2e8f0]">
          <SheetTitle className="font-serif-display text-[#0f172a] text-lg">Expertinstellingen</SheetTitle>
          <SheetDescription className="text-[#64748b] text-xs">
            Detectielagen, drempels en categorieën. Geldt voor alle modi.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-3">
          <AdvancedPanel {...props} writer={writerProps} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
