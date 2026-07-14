import { createFileRoute, redirect } from "@tanstack/react-router";

// Fase 3 slice B, de schrijfmodus zit nu binnen `/app?mode=write`. We houden
// `/schrijven` beschikbaar als redirect zodat bestaande bookmarks/deeplinks
// niet breken.
export const Route = createFileRoute("/schrijven")({
  beforeLoad: () => {
    throw redirect({ to: "/app", search: { mode: "write" }, replace: true });
  },
});
