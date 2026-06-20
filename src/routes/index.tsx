import { createFileRoute } from "@tanstack/react-router";
import { StartGoShell } from "@/components/pim/start-go/StartGoShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project PiM — Eerst veilig. Dan pas delen." },
      { name: "description", content: "Een lokale privacy-controle voor onderwijs. Plak je tekst, kies een bestemming en krijg binnen één seconde een uitlegbaar oordeel. Niets verlaat je apparaat." },
      { property: "og:title", content: "Project PiM — Eerst veilig. Dan pas delen." },
      { property: "og:description", content: "Plak je tekst, kies een bestemming, en zie binnen één seconde of het mag — met uitleg. Volledig lokaal in je browser." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return <StartGoShell />;
}
