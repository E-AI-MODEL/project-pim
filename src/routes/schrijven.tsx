import { createFileRoute, redirect } from "@tanstack/react-router";

// Er is nog één werkruimte op /app. Oude deeplinks blijven werken.
export const Route = createFileRoute("/schrijven")({
  beforeLoad: () => {
    throw redirect({ to: "/app", replace: true });
  },
});
