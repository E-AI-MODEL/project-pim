// In-browser document text extraction. 100% client-side, geen upload, geen tracking.
// Ondersteund: .txt, .md, .csv, .json, .html, .docx
// PDF en OCR bewust uitgesteld (zware deps / extra modellen).

export const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_DOC_CHARS = 200_000; // veiligheidsplafond voor pipeline

export interface ExtractedDoc {
  text: string;
  filename: string;
  bytes: number;
  kind: "text" | "docx";
  truncated: boolean;
}

const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|log|html?|xml|rtf)$/i;
const DOCX_EXT = /\.docx$/i;

export function isSupported(file: File): boolean {
  return TEXT_EXT.test(file.name) || DOCX_EXT.test(file.name);
}

export function rejectionReason(file: File): string | null {
  if (file.size > MAX_DOC_BYTES) {
    return `Bestand te groot (${formatBytes(file.size)}). Maximaal ${formatBytes(MAX_DOC_BYTES)}.`;
  }
  if (/\.pdf$/i.test(file.name)) {
    return "PDF wordt nog niet ondersteund. Plak de tekst, of upload .txt / .docx.";
  }
  if (/\.(png|jpe?g|gif|webp|heic|tiff?)$/i.test(file.name)) {
    return "Afbeeldingen worden nog niet ondersteund (geen OCR). Plak de tekst.";
  }
  if (!isSupported(file)) {
    return "Bestandstype niet ondersteund. Gebruik .txt, .md, .csv, .json, .html of .docx.";
  }
  return null;
}

export async function extractDocument(file: File): Promise<ExtractedDoc> {
  const reason = rejectionReason(file);
  if (reason) throw new Error(reason);

  let raw = "";
  let kind: ExtractedDoc["kind"] = "text";

  if (DOCX_EXT.test(file.name)) {
    kind = "docx";
    const mammoth = await import("mammoth/mammoth.browser");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    raw = result.value ?? "";
  } else {
    raw = await file.text();
    // Strip HTML tags ruw voor .html/.xml/.rtf om de pipeline schone tekst te geven.
    if (/\.(html?|xml|rtf)$/i.test(file.name)) {
      raw = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    }
  }

  const cleaned = raw.replace(/\r\n/g, "\n").trim();
  const truncated = cleaned.length > MAX_DOC_CHARS;
  const text = truncated ? cleaned.slice(0, MAX_DOC_CHARS) : cleaned;

  return {
    text,
    filename: file.name,
    bytes: file.size,
    kind,
    truncated,
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
