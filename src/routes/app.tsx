import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ProductShell } from "@/components/pim/product/ProductShell";
import type { ProductMode } from "@/components/pim/product/types";

const searchSchema = z.object({
  mode: fallback(z.enum(["quick", "start", "write"]), "quick").default("quick"),
});

const HEAD_BY_MODE: Record<ProductMode, { title: string; description: string }> = {
  quick: {
    title: "PiM App — Snel proberen",
    description:
      "Plak tekst en zie meteen welke persoonsgegevens erin zitten. Alles blijft lokaal in je browser.",
  },
  start: {
    title: "PiM App — Start & Go",
    description:
      "Begeleide zes-stappen pipeline: detectie, anonimisatie, draft-check, beleid en egress — lokaal.",
  },
  write: {
    title: "PiM App — Schrijven",
    description: "Schrijf met privacy als vangnet. Live controle terwijl je typt.",
  },
};

export const Route = createFileRoute("/app")({
  validateSearch: zodValidator(searchSchema),
  head: ({ match }) => {
    const mode = (match.search as { mode?: ProductMode }).mode ?? "quick";
    const h = HEAD_BY_MODE[mode];
    return {
      meta: [
        { title: h.title },
        { name: "description", content: h.description },
        { property: "og:title", content: h.title },
        { property: "og:description", content: h.description },
      ],
    };
  },
  component: AppRoute,
});

function AppRoute() {
  const { mode } = Route.useSearch();
  return <ProductShell mode={mode} />;
}
