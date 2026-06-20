import { createFileRoute } from "@tanstack/react-router";
import { WriterShell } from "@/components/pim/writer/WriterShell";

export const Route = createFileRoute("/schrijven")({
  head: () => ({
    meta: [
      { title: "Schrijfmodus — Project PiM" },
      { name: "description", content: "Word-achtige editor met Project PiM ingebouwd. Schrijf, plak of importeer .docx — gevoelige gegevens worden direct gemarkeerd of gewist, alles lokaal in je browser." },
      { property: "og:title", content: "Schrijfmodus — Project PiM" },
      { property: "og:description", content: "Schrijf veilig met PiM. Live highlights, auto-redact en .docx-export — 100% lokaal." },
    ],
  }),
  component: WriterShell,
});