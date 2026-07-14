# 03, Egress En Policy Hardening

## Doel

Alle uitgaande acties gebruiken dezelfde beveiliging:

- payload-type check;
- modelgate;
- async re-consult;
- geen ruwe of pseudonieme tekst naar buiten.

## Bestanden

- `src/lib/pim/egressGuard.ts`
- `src/lib/pim/policy.ts`
- `src/lib/pim/engine/engine.ts`
- `src/lib/pim/__tests__/egressPipeline.e2e.test.ts`
- `src/lib/pim/__tests__/policy.strict.test.ts`
- `src/lib/pim/engine/__tests__/engine.test.ts`

## Egress-acties

Deze acties zijn uitgaand:

```ts
const egressActions = [
  "copy",
  "export_file",
  "print",
  "share",
  "send_external_ai",
] as const;
```

## Regels

Egress accepteert alleen:

```ts
payload.payloadType === "draft_anonymous_certified"
```

Elke egress-actie draait:

```ts
const reconsult = await reconsultPayload(payload);
if (!reconsult.ok) {
  emitReconsult(reconsult.reason);
  return { executed: false, reason: reconsult.reason };
}
```

`modelGateFor()` wordt per actie berekend in de engine, niet hardcoded.

Niet-strikt:

- BERT uit + `send_external_ai`/`export_file` = `ALLOW_WITH_WARNING`
- copy/print/share mogen alleen door als payload certified is en re-consult pass is

Strikt:

- BERT uit + `send_external_ai`/`export_file` = `BLOCK`

## Testvoorbeelden

Blokkeer niet-certified payloads:

```ts
it("blocks every egress action for non-certified payloads", async () => {
  for (const action of ["copy", "export_file", "print", "share", "send_external_ai"] as const) {
    const result = await executeAction(allowDecision(action), {
      text: "Jan Jansen",
      mode: "anonymous",
      payloadType: "unknown",
      guardStatus: "fail",
    });
    expect(result.executed).toBe(false);
  }
});
```

Async re-consult moet residuele PII blokkeren:

```ts
it("blocks certified-looking payloads when re-consult finds direct PII", async () => {
  const result = await executeAction(allowDecision("send_external_ai"), {
    text: "Jan Jansen woont in Utrecht.",
    mode: "anonymous",
    payloadType: "draft_anonymous_certified",
    guardStatus: "pass",
  });
  expect(result.executed).toBe(false);
});
```

## Acceptatiecriteria

- Geen egress zonder `draft_anonymous_certified`.
- Geen egress zonder re-consult pass.
- `send_external_ai` is nooit een echte netwerkcall zonder expliciete endpointconfig en veilige payload.
- Pseudonymous payloads blijven local-only.

