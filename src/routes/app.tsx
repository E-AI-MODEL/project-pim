import { createFileRoute } from "@tanstack/react-router";
import { ProductShell } from "@/components/pim/product/ProductShell";
import type { ProductMode } from "@/components/pim/product/types";
import { normalizeProductMode } from "@/components/pim/product/types";
import { validateAppSearch } from "./app.search";

const HEAD_BY_MODE: Record<ProductMode, { title: string; description: string }> = {
  check: {
    title: "PiM App, Tekst nakijken",
    description:
      "Plak of upload je tekst. Je hoort of je hem mag delen en krijgt een versie zonder persoonsgegevens. Alles blijft op je eigen apparaat.",
  },
  write: {
    title: "PiM App, Zelf schrijven",
    description:
      "Schrijf je tekst en zie meteen welke persoonsgegevens erin staan. PiM haalt ze op verzoek weg, lokaal in je browser.",
  },
};

export const Route = createFileRoute("/app")({
  validateSearch: validateAppSearch,
  head: ({ match }) => {
    const mode = normalizeProductMode((match.search as { mode?: unknown }).mode);
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
