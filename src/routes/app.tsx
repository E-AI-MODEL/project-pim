import { createFileRoute } from "@tanstack/react-router";
import { ProductShell } from "@/components/pim/product/ProductShell";
import { validateAppSearch } from "./app.search";

const TITLE = "PiM, jouw werkruimte";
const DESCRIPTION =
  "Schrijf, plak of open een tekst. PiM kijkt lokaal na welke persoonsgegevens erin staan en geeft pas groen licht als delen veilig is.";

export const Route = createFileRoute("/app")({
  validateSearch: validateAppSearch,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: AppRoute,
});

function AppRoute() {
  return <ProductShell />;
}
