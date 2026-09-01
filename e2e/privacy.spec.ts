import { expect, test, type Page } from "@playwright/test";
import { SECURITY_HEADERS } from "../src/lib/security/headers";

/**
 * De privacybelofte in een echte browser, niet in jsdom:
 * 1. tijdens een volledige sessie gaat er geen enkel verzoek naar een host
 *    buiten de app en de toegestane modelhosts;
 * 2. het klembord bevat na een kopieerpoging nooit ruwe persoonsgegevens,
 *    maar wel de maskeertokens van PiM;
 * 3. zet de gebruiker persoonsgegevens terug in de veilige versie, dan is
 *    kopiëren aantoonbaar geblokkeerd en blijft het klembord onaangeroerd;
 * 4. de securityheaders die de app belooft, staan ook echt op de respons.
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
const BEGINWAARDE = "PIM-KLEMBORD-BEGINWAARDE";

function isToegestaan(url: string, baseURL: string): boolean {
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  const host = new URL(url).hostname;
  if (host === new URL(baseURL).hostname) return true;
  return MODEL_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
}

/**
 * Zet de bestemming op "kopiëren". De standaard is "externe AI"; die actie is
 * in dit profiel altijd geblokkeerd, waardoor de test nooit bij een echte
 * kopieerpoging zou komen.
 */
async function kiesBestemmingKopieren(page: Page): Promise<void> {
  const knop = page.getByRole("button", { name: /modus & bestemming/i }).first();
  const keuze = page.locator("select").first();
  // Vóór hydratatie doet de knop niets; blijven proberen tot het menu opent.
  await expect
    .poll(
      async () => {
        if (!(await keuze.isVisible().catch(() => false))) {
          await knop.click({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(500);
        }
        return await keuze.isVisible().catch(() => false);
      },
      { timeout: 40_000, message: "het menu Modus & bestemming ging niet open" },
    )
    .toBe(true);
  await keuze.selectOption("copy");
  await page.keyboard.press("Escape");
}

/**
 * Zet de lokale AI-laag uit. Staat BERT aan zonder geverifieerd model, dan
 * blokkeert de modelpoort iedere uitgaande actie (fail-closed). Deze test wil
 * juist het toegestane pad meten; het geblokkeerde pad heeft een eigen test.
 */
async function zetLokaleAiUit(page: Page): Promise<void> {
  const uit = page.getByRole("button", { name: /^Uit\b/ }).first();
  await expect
    .poll(
      async () => {
        if (!(await uit.isVisible().catch(() => false))) {
          await page
            .getByRole("button", { name: /^menu$/i })
            .first()
            .click({ timeout: 3000 })
            .catch(() => {});
          await page.waitForTimeout(300);
          await page
            .getByRole("button", { name: /instellingen/i })
            .first()
            .click({ timeout: 3000 })
            .catch(() => {});
          await page.waitForTimeout(400);
          // De zoeklagen zitten in een uitklapbaar blok.
          await page
            .getByRole("button", { name: /BERT/ })
            .first()
            .click({ timeout: 3000 })
            .catch(() => {});
          await page.waitForTimeout(400);
        }
        return await uit.isVisible().catch(() => false);
      },
      { timeout: 40_000, message: "de instellingen met de AI-keuze gingen niet open" },
    )
    .toBe(true);
  await uit.click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

/**
 * Typt de tekst en wacht tot de analyse echt klaar is. Vóór hydratatie gaan
 * toetsaanslagen verloren; zonder deze poll zou een dood scherm de test halen.
 */
async function analyseerGevoeligeTekst(page: Page): Promise<void> {
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
}

test("houdt alle verkeer binnen en zet alleen gemaskeerde tekst op het klembord", async ({
  page,
  context,
  baseURL,
}) => {
  const base = baseURL ?? "http://localhost:8080";
  const overtredingen: string[] = [];

  // Op contextniveau: ook verzoeken uit workers en iframes lopen hierlangs.
  await context.route("**/*", async (route) => {
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
  await page.evaluate((v) => navigator.clipboard.writeText(v), BEGINWAARDE);

  await zetLokaleAiUit(page);
  await kiesBestemmingKopieren(page);
  await analyseerGevoeligeTekst(page);

  // PiM heeft de gegevens gevonden en gearceerd. Zonder dit bewijs is de
  // rest van de test betekenisloos.
  await expect(page.getByText("naam", { exact: true }).first()).toBeVisible();

  // De kopieerknop MOET er zijn: een ontbrekende knop is een regressie,
  // geen geslaagde test.
  const kopieer = page.getByRole("button", { name: /kopieer veilige tekst/i }).first();
  await expect(kopieer, "geen kopieerknop: de flow is stil blijven staan").toBeVisible({
    timeout: 20_000,
  });
  await kopieer.click();
  await page.waitForTimeout(500);

  const klembord = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));

  expect(overtredingen, `verzoeken naar derden: ${overtredingen.join(", ")}`).toEqual([]);
  expect(klembord, "klembord is niet beschreven: de kopieeractie deed niets").not.toBe(BEGINWAARDE);
  expect(klembord.length, "leeg klembord telt niet als bewijs").toBeGreaterThan(10);
  // Er moet minstens één maskeertoken in staan ([persoon], [EMAIL_001], ...).
  expect(klembord, `geen maskeertoken in het klembord: ${klembord}`).toMatch(
    /\[[A-Za-z_]+[\w_]*\]/,
  );
  for (const geheim of GEHEIMEN) {
    expect(klembord, `klembord bevat nog ${geheim}`).not.toContain(geheim);
  }
});

test("blokkeert kopiëren zodra persoonsgegevens terugkomen in de veilige versie", async ({
  page,
  context,
  baseURL,
}) => {
  const base = baseURL ?? "http://localhost:8080";

  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`${base}/app`, { waitUntil: "domcontentloaded" });
  await page.evaluate((v) => navigator.clipboard.writeText(v), BEGINWAARDE);

  await zetLokaleAiUit(page);
  await kiesBestemmingKopieren(page);
  await analyseerGevoeligeTekst(page);

  // Naar de veilige versie en daar de ruwe gegevens weer intypen. Dit is het
  // fail-closed pad: de guard beoordeelt de bewerkte tekst opnieuw.
  await page
    .getByRole("button", { name: /veilige versie/i })
    .first()
    .click();
  const veilig = page.locator("textarea").first();
  await veilig.click();
  await veilig.press("Control+a");
  await page.keyboard.type(GEVOELIGE_TEKST);
  await page.waitForTimeout(1200);

  await expect(
    page.getByRole("button", { name: /kopie\/download geblokt/i }).first(),
    "geen zichtbare blokkade terwijl de veilige versie weer persoonsgegevens bevat",
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: /kopieer veilige tekst/i })).toHaveCount(0);

  const klembord = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
  expect(klembord, "klembord is aangeraakt terwijl de actie geblokkeerd hoorde te zijn").toBe(
    BEGINWAARDE,
  );
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
