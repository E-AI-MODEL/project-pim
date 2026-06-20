import { createFileRoute } from "@tanstack/react-router";
import { StartGoShell } from "@/components/pim/start-go/StartGoShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project PiM — Eerst veilig. Dan pas delen." },
      { name: "description", content: "Browser-eerste privacy-controle voor onderwijsdata: plak tekst, kies bestemming, krijg binnen één seconde een uitlegbaar oordeel. Lokaal verwerkt, geen upload." },
      { property: "og:title", content: "Project PiM — Eerst veilig. Dan pas delen." },
      { property: "og:description", content: "Plak tekst, kies bestemming, krijg binnen één seconde een uitlegbaar privacy-oordeel. 100% lokaal in je browser." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return <StartGoShell />;
}
