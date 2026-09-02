import { createFileRoute, redirect } from "@tanstack/react-router";

// Er is nog één werkruimte op /app. Oude deeplinks blijven werken.
export const Route = createFileRoute("/try")({
  beforeLoad: () => {
    throw redirect({ to: "/app", replace: true });
  },
});
