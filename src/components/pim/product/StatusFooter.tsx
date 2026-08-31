/**
 * Footer met alleen status. Instellingen, diagnostiek en informatie zitten in
 * het gedeelde zijpaneel (knop rechtsboven in de header).
 */
export function StatusFooter() {
  return (
    <footer className="border-t border-[#e5e7ef] bg-white">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 text-[12px] text-[#64748b] sm:px-6">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
        <span className="truncate text-[#334155] sm:hidden">Lokale modus</span>
        <span className="hidden shrink-0 font-medium text-[#334155] sm:inline">PiM v1.0.0</span>
        <span className="hidden text-[#cbd5e1] sm:inline">·</span>
        <span className="hidden truncate sm:inline">Je tekst blijft op dit apparaat</span>
      </div>
    </footer>
  );
}
