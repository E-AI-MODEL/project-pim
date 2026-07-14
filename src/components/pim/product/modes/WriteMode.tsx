import { Link } from "@tanstack/react-router";
import { PenLine, ArrowRight } from "lucide-react";

/**
 * Placeholder — slice B migreert de editor van /schrijven naar deze modus,
 * op de gedeelde engine. Voor nu een duidelijke deeplink.
 */
export function WriteMode() {
  return (
    <div className="rounded-lg border border-[#3b6fa0]/30 bg-[#0f1b3d]/40 p-8 text-center space-y-4">
      <PenLine className="mx-auto h-8 w-8 text-[#3b6fa0]" />
      <h2 className="font-serif-display text-xl text-[#e8edf3]">Schrijven — in voorbereiding</h2>
      <p className="text-sm text-[#e8edf3]/70 max-w-md mx-auto">
        De schrijfmodus met live-editor komt straks in deze shell. Open voor nu de bestaande editor.
      </p>
      <Link
        to="/schrijven"
        className="inline-flex items-center gap-2 rounded-md bg-[#3b6fa0]/30 hover:bg-[#3b6fa0]/50 px-4 py-2 text-sm text-[#e8edf3] transition-colors"
      >
        Open editor <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
