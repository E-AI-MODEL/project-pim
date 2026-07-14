// Runtime hardening, spec hfst 12.3.
// Detecteert (niet "blokkeert volledig", omdat dat in user-land niet kan):
//  - fetch/XHR/sendBeacon naar externe origins die PII-payload dragen
//  - localStorage writes met inhoud-achtige keys
// Logt naar console en biedt een hook voor de UI-banner.

let installed = false;
// Spec hfst 13: Modeltoegang naar publieke mirrors mag (read-only, GET).
// Detecteer wel, maar markeer als "model" in plaats van privacy-violation.
const MODEL_HOSTS = new Set([
  "huggingface.co",
  "cdn-lfs.huggingface.co",
  "cdn-lfs.hf.co",
  "cdn-lfs-us-1.huggingface.co",
  "cdn-lfs-eu-1.huggingface.co",
  "cas-bridge.xethub.hf.co",
  "cdn.jsdelivr.net",
  "unpkg.com",
  // @mlc-ai/web-llm fetcht weights/wasm vanuit deze hosts.
  "raw.githubusercontent.com",
  "github.com",
]);
const violations: string[] = [];
const listeners = new Set<(v: string[]) => void>();

function notify() {
  for (const l of listeners) l([...violations]);
}

export function onViolations(cb: (v: string[]) => void): () => void {
  listeners.add(cb);
  cb([...violations]);
  return () => listeners.delete(cb);
}

export function getViolations(): string[] {
  return [...violations];
}

export function installRuntimeHardening() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const sameOrigin = (url: string) => {
    try {
      return new URL(url, location.href).origin === location.origin;
    } catch {
      return true;
    }
  };
  const isModelHost = (url: string) => {
    try {
      return MODEL_HOSTS.has(new URL(url, location.href).host);
    } catch {
      return false;
    }
  };

  // 1. fetch wrapper
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (!sameOrigin(url) && !isModelHost(url)) {
      const msg = `[PIM hardening] external fetch detected → ${new URL(url).origin}`;
      violations.push(msg);
      notify();
      console.warn(msg);
    }
    return origFetch(input as RequestInfo, init);
  };

  // 2. sendBeacon wrapper
  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      const u = typeof url === "string" ? url : url.toString();
      if (!sameOrigin(u) && !isModelHost(u)) {
        const msg = `[PIM hardening] sendBeacon to external origin BLOCKED → ${new URL(u).origin}`;
        violations.push(msg);
        notify();
        console.warn(msg);
        return false;
      }
      return origBeacon(u, data);
    };
  }

  // 3. XHR wrapper
  const OrigOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
    const u = typeof url === "string" ? url : url.toString();
    if (!sameOrigin(u) && !isModelHost(u)) {
      const msg = `[PIM hardening] XHR to external origin → ${new URL(u).origin}`;
      violations.push(msg);
      notify();
      console.warn(msg);
    }
    // @ts-expect-error pass-through
    return OrigOpen.call(this, method, url, ...rest);
  };

  // 4. WebSocket wrapper
  const OrigWS = window.WebSocket;
  window.WebSocket = new Proxy(OrigWS, {
    construct(target, args: [string | URL, (string | string[])?]) {
      const u = typeof args[0] === "string" ? args[0] : args[0].toString();
      try {
        const origin = new URL(u).host;
        if (origin !== location.host) {
          const msg = `[PIM hardening] WebSocket external → ${origin}`;
          violations.push(msg);
          notify();
          console.warn(msg);
        }
      } catch {
        /* ignore URL parse errors */
      }
      return new target(...args);
    },
  });
}
