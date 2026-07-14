# 04, Runtime En Browser Hardening

## Doel

De browser mag alleen laden wat nodig is voor lokale inference. CSP moet Hugging Face modelbestanden, ONNX WASM en workers toestaan, maar geen brede externe scripts.

## Bestanden

- `vite.config.ts`
- `public/_headers`
- `wrangler.jsonc`
- `src/lib/pim/nerSlm.ts`

## CSP baseline

Gebruik:

```ts
"default-src 'self'",
"base-uri 'self'",
"object-src 'none'",
"frame-ancestors 'none'",
"img-src 'self' data: blob:",
"font-src 'self' data:",
"style-src 'self' 'unsafe-inline'",
"script-src 'self' 'wasm-unsafe-eval' blob:",
"worker-src 'self' blob:",
"connect-src 'self' https://huggingface.co https://*.huggingface.co https://cdn-lfs.huggingface.co https://cdn.jsdelivr.net https://unpkg.com",
"form-action 'self'",
```

## WASM/ONNX

Controleer in build-output:

```text
ort-wasm-simd-threaded.asyncify*.wasm
```

Productie-opties:

1. ONNX WASM lokaal hosten via bundler-output.
2. Of CDN exact pinnen op de packageversie.

Gebruik geen brede `connect-src *`.

## WebGPU/WASM fallback

`nerSlm.ts` moet:

- WebGPU proberen als adapter bestaat;
- terugvallen naar WASM;
- duidelijke status zetten bij fout;
- geen user text naar Hugging Face sturen;
- alleen publieke modelbestanden/config downloaden.

## Handmatige previewtest

1. Open `/app?mode=quick`.
2. Open Expert.
3. Klik `Laden en testen`.
4. Verwacht status `BERT werkt`.
5. Plak tekst met onbekende naam + plaats.
6. Verwacht extra `slm.ner.*` hits.
7. Wissel naar Write.
8. Writer-tekst moet NER-bron worden.
9. Wissel terug naar Quick.
10. Quick-tekst moet weer NER-bron zijn.

## Acceptatiecriteria

- Build bevat ONNX WASM of CSP laat exacte CDN toe.
- Geen CSP-fouten voor modelconfig/modelweights/WASM/worker.
- WebGPU-fout breekt app niet; WASM fallback start.
- Modeldownload is expliciet via gebruikerstart of duidelijke status.

