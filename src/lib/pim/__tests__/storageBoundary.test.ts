// Bewaakt de storage-boundary: functiestate mag niet in localStorage/sessionStorage
// belanden. Alleen de modelintegriteits-pin (by design persistent) is toegestaan.
//
// Waarom: PiM is browser-first en fail-closed. Als engine-state of tekst in
// localStorage zou lekken, kan een "refresh" oude/gemengde state terugzetten en
// functies scheef trekken. Deze test legt vast dat dat niet gebeurt.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeSignals, anonymize, draftCheck, decide, DEFAULT_PROFILE } from "@/lib/pim";

const PIN_PREFIX = "pim:model-integrity:config-sha256:";

describe("storage-boundary", () => {
  let setItemSpy: ReturnType<typeof vi.spyOn>;
  let writeKeys: { store: string; key: string }[];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    writeKeys = [];
    // Bewaar de native setItem en wrap met een recorder die wél doorstuurt,
    // zodat echte opslag (en de modelintegriteits-pin) gewoon werkt.
    const native = Storage.prototype.setItem;
    setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      writeKeys.push({
        store: this === localStorage ? "localStorage" : "sessionStorage",
        key,
      });
      native.call(this, key, value);
    });
  });

  afterEach(() => {
    setItemSpy.mockRestore();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("een volledige engine-run schrijft geen functiestate naar storage", () => {
    const text =
      "Leerling Sophie de Vries (BSN 123456782, mail s.devries@voorbeeldschool.nl) zit in groep 7B.";
    const signals = computeSignals(text, [], DEFAULT_PROFILE, new Set());
    const draft = anonymize(text, signals);
    const guard = draftCheck({ text: draft.text, mode: "anonymous", rawHadPii: true }, "anonymous");
    const decision = decide({
      mode: "anonymous",
      action: "copy",
      signals,
      draftCheck: guard,
      modelVerified: true,
      profileId: DEFAULT_PROFILE,
      payloadType: "draft_anonymous_certified",
    });

    expect(guard.status).toBe("pass");
    expect(decision.verdict).toBeTruthy();

    const offenders = writeKeys.filter(
      (w) => w.store === "localStorage" && !w.key.startsWith(PIN_PREFIX),
    );
    expect(offenders, `onverwachte localStorage-writes: ${JSON.stringify(offenders)}`).toEqual([]);
    expect(
      writeKeys.filter((w) => w.store === "sessionStorage"),
      "engine-run mag niets naar sessionStorage schrijven",
    ).toEqual([]);
  });

  it("geen enkele key die op tekst, mapping of analyse lijkt", () => {
    const text = "Piet Jansen, e-mail p.jansen@voorbeeld.nl, tel 0612345678.";
    const signals = computeSignals(text, [], DEFAULT_PROFILE, new Set());
    anonymize(text, signals);

    const suspicious = writeKeys.some((w) =>
      /text|mapping|draft|signal|queue|input|content|payload/i.test(w.key),
    );
    expect(suspicious, "geen keys met functiestate-namen").toBe(false);
  });

  it("enige toegestane localStorage-write is de modelintegriteits-pin-prefix", () => {
    // Simuleer de pin: schrijf een toegestane key en een verboden key.
    localStorage.setItem(`${PIN_PREFIX}abc123`, "abc123");
    localStorage.setItem("pim:text", "verboden");

    const allowed = writeKeys.filter((w) => w.key.startsWith(PIN_PREFIX));
    const forbidden = writeKeys.filter(
      (w) => w.store === "localStorage" && !w.key.startsWith(PIN_PREFIX),
    );
    expect(allowed.length).toBeGreaterThanOrEqual(1);
    expect(forbidden.map((f) => f.key)).toContain("pim:text");
  });
});
