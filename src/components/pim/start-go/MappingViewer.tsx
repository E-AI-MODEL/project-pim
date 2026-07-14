// Pseudoniem token → origineel mapping viewer. Lokaal, geen egress.
import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Copy, KeyRound, Search } from "lucide-react";

interface Props {
  mapping: Map<string, string>;
}

export function MappingViewer({ mapping }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => {
    const arr = Array.from(mapping.entries()).map(([token, original]) => {
      const catMatch = /\[([A-Z_]+)_\d{3}\]/.exec(token);
      const category = catMatch ? catMatch[1].toLowerCase() : "-";
      return { token, original, category };
    });
    const q = filter.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter(
      (r) =>
        r.token.toLowerCase().includes(q) ||
        r.original.toLowerCase().includes(q) ||
        r.category.includes(q),
    );
  }, [mapping, filter]);

  if (mapping.size === 0) return null;

  async function copyAsJson() {
    const obj: Record<string, string> = {};
    for (const [k, v] of mapping.entries()) obj[k] = v;
    try {
      await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.04] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-violet-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-violet-300" />
          ) : (
            <ChevronRight className="h-4 w-4 text-violet-300" />
          )}
          <KeyRound className="h-3.5 w-3.5 text-violet-300" />
          <span className="text-sm font-medium text-foreground/90">Pseudoniem-mapping</span>
          <span className="text-[10px] font-plex-mono text-muted-foreground">
            {mapping.size} {mapping.size === 1 ? "token" : "tokens"} · alleen op dit apparaat
          </span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-violet-500/15 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter op token, origineel of categorie…"
                className="w-full rounded-md border border-border/50 bg-background/40 pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:border-violet-400/60"
              />
            </div>
            <button
              type="button"
              onClick={copyAsJson}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium border border-violet-400/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 transition-colors"
            >
              <Copy className="h-3 w-3" />
              {copied ? "Gekopieerd" : "Kopieer als JSON"}
            </button>
          </div>
          <div className="max-h-[40vh] overflow-auto rounded-md border border-border/40">
            <table className="w-full text-xs">
              <thead className="bg-muted/20 sticky top-0">
                <tr className="text-left">
                  <th className="px-2.5 py-1.5 font-medium text-muted-foreground font-plex-mono">
                    Token
                  </th>
                  <th className="px-2.5 py-1.5 font-medium text-muted-foreground font-plex-mono">
                    Origineel
                  </th>
                  <th className="px-2.5 py-1.5 font-medium text-muted-foreground font-plex-mono">
                    Categorie
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2.5 py-3 text-center text-muted-foreground">
                      Geen tokens gevonden.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr
                      key={r.token}
                      className="border-t border-border/30 hover:bg-violet-500/[0.04]"
                    >
                      <td className="px-2.5 py-1.5 font-mono text-violet-200 break-all">
                        {r.token}
                      </td>
                      <td className="px-2.5 py-1.5 text-foreground/90 break-all">{r.original}</td>
                      <td className="px-2.5 py-1.5 text-muted-foreground font-plex-mono">
                        {r.category}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Deze koppeling blijft op dit apparaat. Egress is fail-closed: de mapping verlaat je
            browser nooit, ook niet via copy/share/export. JSON-kopie is alleen voor lokale
            handmatige acties.
          </p>
        </div>
      )}
    </div>
  );
}
