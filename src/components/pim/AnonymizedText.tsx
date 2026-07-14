// Rendert een geanonimiseerde / pseudonieme draft-tekst met chips voor de tokens.
// Pure UI: geen logica-aanpassing op de pipeline.
// Tokens die we herkennen:
//   1) Generalisatie-labels uit processing.ts: [email], [persoon], [bsn], etc.
//   2) Pseudonieme tokens: [CATEGORY_001]
const TOKEN_RE =
  /\[(?:email|telefoonnummer|bsn|iban|postcode|persoon|school|datum|adres|leerlingnummer|klas|groep|zorgcontext|incident|rol|geredacteerd)\]|\[[A-Z_]+_\d{3}\]/g;

export function AnonymizedText({ text, streaming }: { text: string; streaming?: boolean }) {
  const parts: Array<{ kind: "text" | "chip"; value: string; key: number }> = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push({ kind: "text", value: text.slice(last, idx), key: i++ });
    parts.push({ kind: "chip", value: m[0], key: i++ });
    last = idx + m[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last), key: i++ });

  return (
    <pre className="font-mono text-sm whitespace-pre-wrap bg-background/70 border border-border/60 rounded-lg p-3 max-h-72 overflow-auto text-foreground/95 leading-relaxed">
      {parts.map((p) =>
        p.kind === "text" ? (
          <span key={p.key}>{p.value}</span>
        ) : (
          <span
            key={p.key}
            className="inline-flex items-center px-1.5 rounded border border-primary/40 bg-primary/15 text-primary font-semibold mx-0.5 align-baseline"
            title="Geanonimiseerde of pseudonieme placeholder"
          >
            {p.value}
          </span>
        ),
      )}
      {streaming && (
        <span className="inline-block w-2 h-4 bg-purple/80 align-middle animate-pulse ml-0.5" />
      )}
    </pre>
  );
}
