# Try-it Live Pipeline Dashboard — herontwerp

Doel: de `/try` pagina omvormen van een verticale stapel van 8 panelen naar één samenhangend live-dashboard. Hybride stijl (PiM-engineering blijft, hero-elementen krijgen subtiele glass-accenten). Qwen rewrite gaat token-per-token streamen. Elke pipeline-stap krijgt een pulsing live-indicator zodat zichtbaar wordt dát alles meeloopt terwijl je typt.

## Layout (nieuw)

```text
┌─────────────────── HERO (glass) ──────────────────────────┐
│  Risk gauge (donut)    Verdict pill    Latency · spans/s   │
│        47%              ALLOW           12ms · 4 detectors  │
└────────────────────────────────────────────────────────────┘

┌────────────── PIPELINE TIMELINE (horizontaal) ─────────────┐
│ ●input  ●regex  ●lex  ○slm  ●ctx  ●repair  ●guard  ●decide │
│  pulse  pulse   pulse idle  pulse pulse    pulse   pulse    │
│  1ms    0ms     0ms   —     1ms   3ms      2ms     0ms      │
└────────────────────────────────────────────────────────────┘

┌─────── 01 RAW INPUT ─────────┬─── 02 SPANS + COUNTS ──────┐
│ textarea                      │ regex 6 · lex 2 · slm 3 ·  │
│                               │ ctx 1                       │
│                               │ chips met source-tag        │
└───────────────────────────────┴────────────────────────────┘

┌─────── 03 DRAFT (live) ──────┬─── 04 MODE + ACTION ───────┐
│ <pre> generalised text        │ anonymous / pseudonymous    │
│  Qwen tokens streamen erin    │ 8 action icons              │
│  woord-voor-woord wanneer     │ [Voer actie uit]            │
│  rewrite actief               │                             │
├──────────────────────────────┴────────────────────────────┤
│ guard issues · auto-repair badge · LLM-rewrite badge       │
└────────────────────────────────────────────────────────────┘

┌─────── 05 SLM PANEL ─────────┬─── 06 AUDIT FEED ──────────┐
│ toggle, status, integrity     │ live tijdlijn van events    │
└───────────────────────────────┴────────────────────────────┘

┌──────────────── 07 REVIEW QUEUE ───────────────────────────┐
│ (blijft, lichte restyle)                                   │
└────────────────────────────────────────────────────────────┘
```

## Visueel idioom

- **Glass-accenten** alleen op: hero-card, pipeline timeline strip, verdict-pill. Implementatie: `bg-card/30 backdrop-blur-md border-border/40` + zachte schaduw. De rest blijft `panel` (solide).
- **Pulsing indicators**: kleine cirkels per stap, `animate-ping` (Tailwind built-in) wanneer die stap binnen de laatste 400ms herrekend heeft; daarna `animate-pulse` zacht; idle = grijs.
- **Risk gauge**: SVG donut (geen recharts overhead), kleur volgt bestaande logica (green/orange/red).
- Geen pastel. Bestaande tokens (`--cyan`, `--orange`, `--purple`, `--green`, `--red`) blijven leidend.

## Live streaming

### Pipeline step indicators
Nieuwe hook `usePipelineHeartbeat` registreert per stap een timestamp telkens als zijn `useMemo`/`useEffect` herrekent. Per stap (`input`, `regex`, `lex`, `slm`, `ctx`, `repair`, `guard`, `decide`) toont de timeline-strip:
- `< 400ms geleden` → `animate-ping` ring + felle kleur
- `< 2s` → zachte `animate-pulse`
- ouder → grijs idle

### Qwen token-streaming
`rewriteAnonymousDraft` krijgt een nieuwe variant `rewriteAnonymousDraftStream(draft, onToken)`. Roept `engine.chat.completions.create({ stream: true, ... })` aan en yieldt deltas. Op de UI wordt elke delta direct in `llmDraft.text` gezet zodat de `<pre>` letterlijk woord-voor-woord vult. De bestaande non-stream functie blijft bestaan voor compat.

## Bestanden

**Nieuw**
- `src/components/pim/RiskGauge.tsx` — SVG donut, props `{ score, level }`.
- `src/components/pim/PipelineTimeline.tsx` — horizontale strip met step-pulses, props `{ steps: { id, label, lastTickMs, durationMs }[] }`.
- `src/hooks/usePipelineHeartbeat.ts` — `tick(stepId)` + `getSteps()` + state-update via `useState`.

**Edited**
- `src/lib/pim/rewriteLlm.ts` — `rewriteAnonymousDraftStream` met async iterator over `stream: true` deltas; behoud `rewriteAnonymousDraft` als wrapper.
- `src/routes/try.tsx` — volledige layout-restructure conform schema hierboven; integreer hero, timeline, herorganiseer 01–07; vervang on-demand rewrite-call door streaming variant; haal `tick()` aan in elke memo/effect die een pipeline-stap representeert.

**Niet aangeraakt**
- `risk.ts`, `detectorRegistry.ts`, `nerSlm.ts`, `policy.ts`, `secureMapping.ts`, `egressGuard.ts`, `abuseDetection.ts` — geen functionele wijziging, alleen UI.
- Andere routes (`/compliance`, `/pipeline`, `/architecture`, `/modes`, `/flags`, `/index`) — niet aangeraakt.

## Technisch

- Glass-laag is puur CSS (Tailwind). Geen extra deps.
- `usePipelineHeartbeat` houdt timestamps in een `Map` + 1 timer (200ms `setInterval`) die een re-render forceert zodat ping/pulse-states accuraat blijven; cleanup op unmount.
- Streaming gebruikt `for await (const chunk of stream)` met `chunk.choices[0]?.delta?.content`. Zelfde failure-pad: bij fout terug naar originele draft.
- `lastEnqueuedKey` blijft werken: enqueue gebeurt pas op finale guard-status, niet per token.
- Backwards compat: `rewriteAnonymousDraft` blijft exported, andere files breken niet.

## UI-check (na build)

Browser-tools: navigeer naar `/try` op desktop (1366) en mobile (390), screenshot beide, verifieer:
1. Hero gauge + verdict zichtbaar zonder scroll.
2. Pipeline timeline pulses bij typen.
3. Qwen rewrite tokens verschijnen progressief in `<pre>`.
4. Geen layout-overflow op 390px.

## Out of scope

- Recharts of d3 — overkill voor één donut.
- Streaming van SLM (NER) — `@huggingface/transformers` pipeline geeft geen token-stream voor NER.
- Wijzigingen aan andere routes of `mem://` opslag.
