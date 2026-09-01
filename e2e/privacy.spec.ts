import { expect, test } from "@playwright/test";

/**
 * De privacybelofte in een echte browser, niet in jsdom:
 * 1. tijdens een volledige sessie gaat er geen enkel verzoek naar een host
 *    buiten de app en de toegestane modelhosts;
 * 2. het klembord bevat na een kopieerpoging nooit ruwe persoonsgegevens:
 *    of PiM blokkeert (klembord blijft leeg), of er staat gemaskeerde tekst.
 *
 * Draait los van vitest: `bun run test:e2e` (eenmalig `bunx playwright install chromium`).
 */

const MODEL_HOST_SUFFIXES = [
  "huggingface.co",
  "hf.co",
  "githubusercontent.com",
  "github.com",
  "jsdelivr.net",
  "unpkg.com",
];

const GEHEIMEN = ["Emma de Vries", "s.dejong@voorbeeld.nl", "06-12345678"];
const GEVOELIGE_TEKST = `Emma de Vries uit groep 7B, e-mail s.dejong@voorbeeld.nl, telefoon 06-12345678.`;

function isToegestaan(url: string, baseURL: string): boolean {
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  const host = new URL(url).hostname;
  if (host === new URL(baseURL).hostname) return true;
  return MODEL_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
}

test("houdt alle verkeer binnen en zet geen ruwe persoonsgegevens op het klembord", async ({
  page,
  context,
  baseURL,
}) => {
  const base = baseURL ?? "http://localhost:8080";
  const overtredingen: string[] = [];

  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (!isToegestaan(url, base)) {
      overtredingen.push(url);
      await route.abort();
      return;
    }
    await route.continue();
  });

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${base}/app`, { waitUntil: "domcontentloaded" });

  // Typen als een gebruiker: dat is wat de live-analyse in gang zet.
  const editor = page.locator("textarea").first();
  await editor.click();
  await page.keyboard.type(GEVOELIGE_TEKST);

  const status = page.getByTestId("analysis-status").first();
  await expect(status).toHaveAttribute("data-state", "ready", { timeout: 20_000 });

  // PiM heeft de gegevens gevonden en gearceerd.
  await expect(page.getByText("naam", { exact: true }).first()).toBeVisible();

  // Kopieerpoging: of de knop bestaat (dan moet de inhoud gemaskeerd zijn),
  // of PiM blokkeert de actie (dan blijft het klembord leeg).
  const kopieer = page.getByRole("button", { name: /kopieer/i }).first();
  if (await kopieer.isVisible().catch(() => false)) {
    await kopieer.click();
    await page.waitForTimeout(500);
  }

  const klembord = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));

  expect(overtredingen, `verzoeken naar derden: ${overtredingen.join(", ")}`).toEqual([]);
  for (const geheim of GEHEIMEN) {
    expect(klembord, `klembord bevat nog ${geheim}`).not.toContain(geheim);
  }
});
