// Slice C.1 — bewijst dat de publieke chrome (StartHeader/SiteFooter) alleen
// onder de _site-layout leeft. /app rendert enkel de ProductShell-chrome.
// We toetsen dit statisch op basis van de route-configuratie i.p.v. een
// volledige router-mount, zodat de test snel en deterministisch is.

import { describe, expect, it } from "vitest";
import { Route as RootRoute } from "@/routes/__root";
import { Route as SiteRoute } from "@/routes/_site";
import { Route as AppRoute } from "@/routes/app";

describe("Route chrome scheiding", () => {
  it("root-layout heeft geen eigen StartHeader/SiteFooter component-import", () => {
    // De root-component moet uitsluitend <Outlet /> renderen; publieke chrome
    // hoort in _site.tsx.
    const src = RootRoute.options.component?.toString() ?? "";
    expect(src).not.toMatch(/StartHeader/);
    expect(src).not.toMatch(/SiteFooter/);
  });

  it("_site-layout draagt de publieke chrome", () => {
    const src = SiteRoute.options.component?.toString() ?? "";
    expect(src).toMatch(/StartHeader/);
    expect(src).toMatch(/SiteFooter/);
  });

  it("/app render de ProductShell, niet de publieke chrome", () => {
    const src = AppRoute.options.component?.toString() ?? "";
    expect(src).toMatch(/ProductShell/);
    expect(src).not.toMatch(/StartHeader/);
  });

  it("/app-route ligt niet onder de _site-layout", () => {
    const opts = AppRoute.options as unknown as { id?: string; path?: string };
    expect(String(opts.id ?? "").includes("_site")).toBe(false);
    expect(String(opts.path ?? "").includes("_site")).toBe(false);
  });
});
