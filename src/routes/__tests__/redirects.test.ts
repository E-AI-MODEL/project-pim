// /try en /schrijven zijn opgegaan in de ene werkruimte op /app. We toetsen
// dat de route-modules een router-native redirect gooien (geen loops).

import { describe, expect, it } from "vitest";
import { Route as TryRoute } from "@/routes/try";
import { Route as SchrijvenRoute } from "@/routes/schrijven";

function invokeBeforeLoad(route: { options: Record<string, unknown> }): unknown {
  const before = route.options.beforeLoad as ((opts: unknown) => unknown) | undefined;
  if (!before) throw new Error("route has no beforeLoad");
  try {
    before({});
  } catch (e) {
    return e;
  }
  throw new Error("beforeLoad did not throw a redirect");
}

describe("Redirects naar de werkruimte", () => {
  it.each([
    ["/try", TryRoute],
    ["/schrijven", SchrijvenRoute],
  ])("%s → /app", (_path, route) => {
    const r = invokeBeforeLoad(route as unknown as { options: Record<string, unknown> }) as {
      options: { to?: string; replace?: boolean; search?: unknown };
    };
    expect(r.options.to).toBe("/app");
    expect(r.options.replace).toBe(true);
    expect(r.options.search).toBeUndefined();
  });

  it("de doelroute accepteert elke oude search zonder terug te wijzen", async () => {
    const { validateAppSearch } = await import("@/routes/app.search");
    expect(validateAppSearch({ mode: "check" })).toEqual({});
    expect(validateAppSearch({ mode: "bogus" })).toEqual({});
  });
});
