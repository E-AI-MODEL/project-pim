import { COPY } from "@/lib/pim/copy";

export function AnonPseudoStrip() {
  return (
    <div className="border-t hairline pt-6 mt-4">
      <p className="text-center text-sm text-[#0f172a]/65 max-w-3xl mx-auto leading-relaxed">
        {COPY.anonVsPseudo}
      </p>
    </div>
  );
}
