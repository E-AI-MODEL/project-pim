import { createFileRoute } from "@tanstack/react-router";
import { StartGoShell } from "@/components/pim/start-go/StartGoShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project PiM — Test tekst voordat je die deelt met AI" },
      { name: "description", content: "Plak tekst, kies modus en doel, klik Start PiM. Lokaal in je browser. Krijg veilige tekst of een duidelijke blokkade." },
      { property: "og:title", content: "Project PiM — Test tekst voordat je die deelt met AI" },
      { property: "og:description", content: "Plak tekst, kies modus en doel, klik Start PiM. Lokaal in je browser." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return <StartGoShell />;
}
