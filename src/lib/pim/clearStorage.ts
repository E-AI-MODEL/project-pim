// Lokale opslag wissen — schone lei tussen teksten.
//
// PiM draait volledig lokaal. Tijdens een sessie stapelt er state op die
// gevoelig of vervuilend kan zijn als je meerdere teksten achter elkaar
// verwerkt:
//   - in-memory mapping-containers (token → origineel, versleuteld)
//   - de review-queue (geredacteerde drafts)
//   - localStorage / sessionStorage (bv. onboarding-vlag)
//   - gedownloade modelgewichten in de Cache API en IndexedDB
//     (transformers.js NER ~100 MB, web-llm Qwen ~400 MB)
//
// Deze helper geeft één knop om dat allemaal op te ruimen. Het wissen van de
// modelcaches betekent dat NER/Qwen bij volgend gebruik opnieuw gedownload
// worden — daarom maakt de UI dat expliciet (aparte optie + bevestiging).

import { clearReviewQueue } from "./reviewQueue";
import { retryNerSlm } from "./nerSlm";
import { emitDebug } from "./debugBus";

export interface ClearResult {
  localStorage: number;
  sessionStorage: number;
  caches: number;
  indexedDb: number;
  modelsCleared: boolean;
  errors: string[];
}

export interface ClearOptions {
  /** Ook de gedownloade modelgewichten (Cache API + IndexedDB) wissen. */
  includeModels?: boolean;
}

/**
 * Wist lokale PiM-data. Faalt nooit hard: per onderdeel wordt een fout
 * opgevangen en in `errors` gerapporteerd, zodat de rest toch wordt gewist.
 */
export async function clearAllLocalData(options: ClearOptions = {}): Promise<ClearResult> {
  const includeModels = options.includeModels ?? true;
  const result: ClearResult = {
    localStorage: 0,
    sessionStorage: 0,
    caches: 0,
    indexedDb: 0,
    modelsCleared: includeModels,
    errors: [],
  };

  // 1) In-memory registers: review-queue leeg + NER-pipeline-handle resetten.
  // (De mapping-containers leven module-privé en worden door een full reload
  // sowieso opgeruimd; hier resetten we wat we programmatisch kunnen.)
  try {
    clearReviewQueue();
    retryNerSlm();
  } catch (e) {
    result.errors.push(`in-memory: ${(e as Error).message}`);
  }

  if (typeof window === "undefined") return result;

  // 2) localStorage / sessionStorage.
  try {
    result.localStorage = window.localStorage.length;
    window.localStorage.clear();
  } catch (e) {
    result.errors.push(`localStorage: ${(e as Error).message}`);
  }
  try {
    result.sessionStorage = window.sessionStorage.length;
    window.sessionStorage.clear();
  } catch (e) {
    result.errors.push(`sessionStorage: ${(e as Error).message}`);
  }

  // 3) Modelcaches (Cache API + IndexedDB) — alleen op verzoek.
  if (includeModels) {
    try {
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        for (const k of keys) {
          if (await caches.delete(k)) result.caches += 1;
        }
      }
    } catch (e) {
      result.errors.push(`caches: ${(e as Error).message}`);
    }

    try {
      const idb = window.indexedDB as IDBFactory & {
        databases?: () => Promise<{ name?: string }[]>;
      };
      // databases() bestaat niet in elke browser (o.a. Firefox). Dan kunnen we
      // niet enumereren; de bekende web-llm-db's proberen we expliciet.
      const names: string[] = [];
      if (typeof idb.databases === "function") {
        const dbs = await idb.databases();
        for (const d of dbs) if (d.name) names.push(d.name);
      }
      // web-llm/transformers fallback-namen voor het geval enumeratie ontbreekt.
      for (const fallback of [
        "webllm/model",
        "webllm/wasm",
        "webllm/config",
        "transformers-cache",
      ]) {
        if (!names.includes(fallback)) names.push(fallback);
      }
      await Promise.all(
        names.map(
          (name) =>
            new Promise<void>((resolve) => {
              try {
                const req = window.indexedDB.deleteDatabase(name);
                req.onsuccess = () => {
                  result.indexedDb += 1;
                  resolve();
                };
                req.onerror = () => {
                  result.errors.push(`indexedDB "${name}": verwijderen mislukt`);
                  resolve();
                };
                // onblocked: een open verbinding (bv. een nog-geladen model)
                // houdt de DB vast. De delete blijft pending; we tellen 'm NIET
                // als gewist en melden het, zodat de UI geen valse "klaar" geeft.
                req.onblocked = () => {
                  result.errors.push(
                    `indexedDB "${name}": geblokkeerd door open verbinding — sluit tabbladen/herlaad`,
                  );
                  resolve();
                };
              } catch {
                resolve();
              }
            }),
        ),
      );
    } catch (e) {
      result.errors.push(`indexedDB: ${(e as Error).message}`);
    }
  }

  emitDebug("storage.clear", "Lokale opslag gewist", {
    localStorage: result.localStorage,
    sessionStorage: result.sessionStorage,
    caches: result.caches,
    indexedDb: result.indexedDb,
    modelsCleared: result.modelsCleared,
    errors: result.errors.length,
  });

  return result;
}
