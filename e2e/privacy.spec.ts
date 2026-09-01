import { expect, test } from "@playwright/test";
import { SECURITY_HEADERS } from "../src/lib/security/headers";

/**
 * De privacybelofte in een echte browser, niet in jsdom:
 * 1. tijdens een volledige sessie gaat er geen enkel verzoek naar een host
 *    buiten de app en de toegestane modelhosts;
 * 2. het klembord bevat na een kopieerpoging nooit ruwe persoonsgegevens;
 * 3. de securityheaders die de app belooft, staan ook echt op de respons.
 *
 * De test is bewust streng: hij mag niet slagen doordat er niets gebeurde.
 * Elke fase legt een bewijs vast (analyse klaar, arcering zichtbaar,
 * kopieerpoging uitgevoerd of aantoonbaar geblokkeerd).
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

  // Klembord vooraf vullen met een herkenbare waarde. Zo kan de test het
  // verschil zien tussen "geblokkeerd" en "er is niets gebeurd".
  await page.evaluate(() => navigator.clipboard.writeText("PIM-KLEMBORD-BEGINWAARDE"));

  // Wachten tot de app echt reageert. Vóór hydratatie gaan toetsaanslagen
  // verloren en zou de test slagen op een scherm dat niets doet.
  const editor = page.locator("textarea").first();
  const status = page.getByTestId("analysis-status").first();
  const nakijken = page.getByTestId("run-analysis").first();

  await expect
    .poll(
      async () => {
        await editor.click();
        await editor.press("Control+a");
        await page.keyboard.type(GEVOELIGE_TEKST);
        await page.waitForTimeout(400);
        // Staat de app op handmatig nakijken, dan is er een knop nodig.
        if (await nakijken.isVisible().catch(() => false)) await nakijken.click();
        await page.waitForTimeout(600);
        return { tekst: await editor.inputValue(), staat: await status.getAttribute("data-state") };
      },
      { timeout: 40_000, message: "de app werd niet interactief of keek de tekst niet na" },
    )
    .toEqual({ tekst: GEVOELIGE_TEKST, staat: "ready" });


  // PiM heeft de gegevens gevonden en gearceerd. Zonder dit bewijs is de
  // rest van de test betekenisloos.
  await expect(page.getByText("naam", { exact: true }).first()).toBeVisible();

  // Kopieerpoging: of de knop bestaat (dan moet de inhoud gemaskeerd zijn),
  // of PiM blokkeert de actie (dan blijft de beginwaarde staan).
  const kopieer = page.getByRole("button", { name: /kopieer/i }).first();
  const kopieerZichtbaar = await kopieer.isVisible().catch(() => false);
  const geblokkeerd = await page
    .getByRole("button", { name: /geblokt|aanpassen en opnieuw/i })
    .first()
    .isVisible()
    .catch(() => false);

  // Precies één van beide moet waar zijn: er is iets gebeurd.
  expect(
    kopieerZichtbaar || geblokkeerd,
    "geen kopieerknop en geen blokkade zichtbaar: de flow is stil blijven staan",
  ).toBe(true);

  if (kopieerZichtbaar) {
    await kopieer.click();
    await page.waitForTimeout(500);
  }

  const klembord = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));

  expect(overtredingen, `verzoeken naar derden: ${overtredingen.join(", ")}`).toEqual([]);
  for (const geheim of GEHEIMEN) {
    expect(klembord, `klembord bevat nog ${geheim}`).not.toContain(geheim);
  }
  if (!kopieerZichtbaar) {
    // Geblokkeerd betekent: het klembord is niet aangeraakt.
    expect(klembord).toBe("PIM-KLEMBORD-BEGINWAARDE");
  }
});

test("de pagina levert de beloofde securityheaders", async ({ page, baseURL }) => {
  const base = baseURL ?? "http://localhost:8080";
  const respons = await page.goto(`${base}/app`, { waitUntil: "domcontentloaded" });
  expect(respons, "geen respons van de app").not.toBeNull();
  const headers = respons!.headers();

  for (const [naam, waarde] of Object.entries(SECURITY_HEADERS)) {
    const gemeten = headers[naam.toLowerCase()];
    expect(gemeten, `header ontbreekt: ${naam}`).toBeTruthy();
    expect(gemeten, `header wijkt af van de code: ${naam}`).toBe(waarde);
  }
});
