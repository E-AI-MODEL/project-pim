// Eén bron voor de modelhost-allowlist en de securityheaders.
//
// Deze module wordt gebruikt door:
//  - vite.config.ts (dev/preview headers)
//  - src/start.ts (server-respons van TanStack Start, productie)
//  - src/lib/pim/runtimeHardening.ts (browser-wrappers)
//
// Zo kunnen CSP `connect-src` en de browser-allowlist niet meer uiteenlopen.
// Let op: geen imports met een `@/`-alias, vite.config.ts laadt dit bestand direct.

/**
 * Hosts waar modelbestanden (config, tokenizer, gewichten, ONNX WASM) vandaan
 * mogen komen. `*` is een wildcard voor precies één labelniveau of meer.
 * Alleen publieke, read-only modelbestanden; nooit gebruikerstekst.
 */
export const MODEL_HOST_PATTERNS: readonly string[] = [
  "huggingface.co",
  "*.huggingface.co",
  "hf.co",
  "*.hf.co",
  "cdn.jsdelivr.net",
  "unpkg.com",
  // @mlc-ai/web-llm haalt weights/wasm hier vandaan.
  "raw.githubusercontent.com",
  "github.com",
  "objects.githubusercontent.com",
];

/** True als `host` op de modelhost-allowlist staat. */
export function isModelHostname(host: string): boolean {
  const h = host.toLowerCase();
  return MODEL_HOST_PATTERNS.some((pattern) => {
    if (pattern.startsWith("*.")) {
      const base = pattern.slice(2);
      return h === base || h.endsWith(`.${base}`);
    }
    return h === pattern;
  });
}

const MODEL_CONNECT_SRC = MODEL_HOST_PATTERNS.map((p) => `https://${p}`).join(" ");

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // 'unsafe-inline' is nodig: TanStack Start hydrateert via inline scripts
  // zonder nonce. Zonder dit blijft de app dood staan in productie.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
  "worker-src 'self' blob:",
  `connect-src 'self' ${MODEL_CONNECT_SRC}`,
  "form-action 'self'",
].join("; ");

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/**
 * Variant voor de <meta http-equiv> in de root-route. Wijkt bewust af:
 *  - geen `frame-ancestors` (werkt alleen als HTTP-header, geeft anders een
 *    console-fout);
 *  - `img-src` staat de og-image-host toe;
 *  - `script-src` staat 'unsafe-inline' toe voor de SSR-hydratatiescripts.
 * De HTTP-header uit SECURITY_HEADERS blijft leidend.
 */
export const META_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://storage.googleapis.com",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
  "worker-src 'self' blob:",
  `connect-src 'self' ${MODEL_CONNECT_SRC}`,
  "form-action 'self'",
].join("; ");
