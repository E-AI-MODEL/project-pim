import { createFileRoute, redirect } from "@tanstack/react-router";

// Fase 3 slice B, `/try` is opgegaan in de ProductShell. We redirecten
// permanent naar de Snel-proberen-modus zodat oude links blijven werken.
export const Route = createFileRoute("/try")({
  beforeLoad: () => {
    throw redirect({ to: "/app", search: { mode: "quick" }, replace: true });
  },
});
