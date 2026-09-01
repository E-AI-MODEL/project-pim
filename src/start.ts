import { createStart, createMiddleware } from "@tanstack/react-start";
import { SECURITY_HEADERS } from "./lib/security/headers";

// Securityheaders horen in de serverrespons, niet in een hostspecifiek
// `_headers`-bestand: deze app draait als Worker, niet op Cloudflare Pages.
const securityHeadersMiddleware = createMiddleware({ type: "request" }).server(
  async ({ next }) => {
    const result = await next();
    const headers = new Headers(result.response.headers);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
    return {
      ...result,
      response: new Response(result.response.body, {
        status: result.response.status,
        statusText: result.response.statusText,
        headers,
      }),
    };
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware],
}));
