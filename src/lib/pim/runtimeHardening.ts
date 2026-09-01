// Runtime hardening, spec hfst 12.3.
//
// Positionering: dit is zelftest en telemetrie, geen sluitende blokkade.
// De echte grens is de Content-Security-Policy (zie src/lib/security/headers.ts)
// plus het feit dat de app geen third-party scripts laadt. Deze wrappers zijn
// in user-land te omzeilen (new Image().src, <a ping>, EventSource, iframes).
//
// Wat ze wél doen:
//  - fetch/XHR/sendBeacon/WebSocket naar niet-toegestane origins weigeren
//    (fail-closed, want legitiem extern verkeer bestaat in deze app niet);
//  - modelhosts doorlaten (read-only publieke modelbestanden);
//  - elke poging loggen en aan de UI-banner doorgeven.

import { isModelHostname } from "../security/headers";

let installed = false;
const violations: string[] = [];
const listeners = new Set<(v: string[]) => void>();

/**
 * Kill switch. Zet deze op false als een verkeerde allowlist de app breekt;
 * detectie en logging blijven dan werken, alleen het weigeren stopt.
 * Ook te zetten via `window.__pimDisableEgressBlock = true` vóór installatie.
 */
let enforcement = true;

export function setEgressEnforcement(enabled: boolean): void {
  enforcement = enabled;
}

export function isEgressEnforced(): boolean {
  return enforcement;
}

// Zelftest-probe: geen echte egress, alleen een gedragstest van de wrapper.
// We loggen die als info zodat hij niet als fout leest in de console.
export const SELFTEST_PROBE_MARKER = "pim-selftest-probe";

function isSelfTestProbe(url: string): boolean {
  return url.includes(SELFTEST_PROBE_MARKER);
}

export function isSelfTestViolation(msg: string): boolean {
  return msg.startsWith("[PIM zelftest]");
}

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

  const win = window as Window & { __pimDisableEgressBlock?: boolean };
  if (win.__pimDisableEgressBlock === true) enforcement = false;

  const sameOrigin = (url: string) => {
    try {
      return new URL(url, location.href).origin === location.origin;
    } catch {
      return true;
    }
  };
  const isModelHost = (url: string) => {
    try {
      return isModelHostname(new URL(url, location.href).host);
    } catch {
      return false;
    }
  };
  const allowed = (url: string) => sameOrigin(url) || isModelHost(url);

  const record = (msg: string, info = false) => {
    violations.push(msg);
    notify();
    if (info) console.info(msg);
    else console.warn(msg);
  };

  // 1. fetch wrapper
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (!allowed(url)) {
      if (isSelfTestProbe(url)) {
        record(`[PIM zelftest] uitgaande-verkeerdetectie werkt (${SELFTEST_PROBE_MARKER})`, true);
        return origFetch(input as RequestInfo, init);
      }
      const origin = safeOrigin(url);
      const msg = enforcement
        ? `[PIM hardening] externe fetch geweigerd → ${origin}`
        : `[PIM hardening] externe fetch gedetecteerd (handhaving uit) → ${origin}`;
      record(msg);
      if (enforcement) throw new Error(msg);
    }
    return origFetch(input as RequestInfo, init);
  };

  // 2. sendBeacon wrapper
  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      const u = typeof url === "string" ? url : url.toString();
      if (!allowed(u)) {
        record(`[PIM hardening] sendBeacon naar externe origin geweigerd → ${safeOrigin(u)}`);
        return false;
      }
      return origBeacon(u, data);
    };
  }

  // 3. XHR wrapper
  const OrigOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
    const u = typeof url === "string" ? url : url.toString();
    if (!allowed(u)) {
      const msg = enforcement
        ? `[PIM hardening] XHR naar externe origin geweigerd → ${safeOrigin(u)}`
        : `[PIM hardening] XHR naar externe origin → ${safeOrigin(u)}`;
      record(msg);
      if (enforcement) throw new Error(msg);
    }
    // @ts-expect-error pass-through
    return OrigOpen.call(this, method, url, ...rest);
  };

  // 4. WebSocket wrapper
  const OrigWS = window.WebSocket;
  window.WebSocket = new Proxy(OrigWS, {
    construct(target, args: [string | URL, (string | string[])?]) {
      const u = typeof args[0] === "string" ? args[0] : args[0].toString();
      if (!sameOrigin(u)) {
        const msg = `[PIM hardening] WebSocket extern → ${safeOrigin(u)}`;
        record(msg);
        if (enforcement) throw new Error(msg);
      }
      return new target(...args);
    },
  });
}

function safeOrigin(url: string): string {
  try {
    return new URL(url, location.href).origin;
  } catch {
    return url;
  }
}
