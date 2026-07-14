// Slice B — /try en /schrijven zijn opgegaan in /app. We toetsen dat de
// route-modules een router-native redirect naar de juiste modus gooien
// (geen window.location, geen loops).

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

describe("Slice B — redirects", () => {
  it("/try → /app?mode=quick", () => {
    const r = invokeBeforeLoad(TryRoute as unknown as { options: Record<string, unknown> }) as {
      options: { to?: string; search?: { mode?: string }; replace?: boolean };
    };
    expect(r.options.to).toBe("/app");
    expect(r.options.search?.mode).toBe("quick");
    expect(r.options.replace).toBe(true);
  });

  it("/schrijven → /app?mode=write", () => {
    const r = invokeBeforeLoad(
      SchrijvenRoute as unknown as { options: Record<string, unknown> },
    ) as { options: { to?: string; search?: { mode?: string }; replace?: boolean } };
    expect(r.options.to).toBe("/app");
    expect(r.options.search?.mode).toBe("write");
    expect(r.options.replace).toBe(true);
  });

  it("redirect target route (/app) accepteert alle drie modi zonder terug te wijzen", async () => {
    const { validateAppSearch } = await import("@/routes/app.search");
    for (const mode of ["quick", "start", "write"] as const) {
      expect(validateAppSearch({ mode }).mode).toBe(mode);
    }
    // Onbekende mode valt terug op quick (default doel van /try),
    // dus /try → /app?mode=quick → validator → quick. Geen redirect-loop.
    expect(validateAppSearch({ mode: "bogus" }).mode).toBe("quick");
  });
});
