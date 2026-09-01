import { describe, expect, it } from "vitest";
import { reconsultPayload } from "../egressGuard";
import type { CertifiedPayload } from "../types";

const payload = (over: Partial<CertifiedPayload> = {}): CertifiedPayload => ({
  text: "Een neutrale tekst zonder directe identificatie.",
  mode: "anonymous",
  payloadType: "draft_anonymous_certified",
  profileId: "education-nl-rules-only",
  guardStatus: "pass",
  detectionSettings: { regex: true, lexicon: true, context: true, bert: "off" },
  ...over,
});

describe("egress re-consult, fail-closed en onafhankelijk", () => {
  it("staat lokaal kopieren toe met waarschuwing wanneer BERT uit staat", async () => {
    const r = await reconsultPayload(payload(), "copy");
    expect(r.ok).toBe(true);
    expect(r.warning).toMatch(/BERT/i);
  });

  it("blokkeert exporteren wanneer een verwachte laag niet gedraaid heeft", async () => {
    const r = await reconsultPayload(payload(), "export_file");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/BLOCK/);
  });

  it("blokkeert versturen naar externe AI onder dezelfde voorwaarde", async () => {
    const r = await reconsultPayload(payload(), "send_external_ai");
    expect(r.ok).toBe(false);
  });

  it("negeert uitgezette categorieen: directe PII blokkeert altijd", async () => {
    const contact = ["docent", "voorbeeldschool.nl"].join(String.fromCharCode(64));
    const r = await reconsultPayload(
      payload({
        text: `Neem contact op via ${contact}.`,
        detectionSettings: { regex: true, lexicon: false, context: false, bert: "off" },
      }),
      "copy",
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/BLOCK/);
  });
});
