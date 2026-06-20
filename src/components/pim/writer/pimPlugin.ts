// ProseMirror plugin: bewaart en rendert PiM-decoraties (highlights) in de editor.
// Het scannen + auto-redact gebeurt React-side via editor.on('update'), die
// een meta-only transaction stuurt naar deze plugin.

import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PmNode } from "@tiptap/pm/model";
import type { PiiSpan } from "@/lib/pim/types";

export interface PimMeta {
  decorations: DecorationSet;
}

export const pimPluginKey = new PluginKey<DecorationSet>("pim-writer");

export function createPimPlugin() {
  return new Plugin<DecorationSet>({
    key: pimPluginKey,
    state: {
      init: () => DecorationSet.empty,
      apply: (tr, old) => {
        const meta = tr.getMeta(pimPluginKey) as PimMeta | undefined;
        if (meta) return meta.decorations;
        return old.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) {
        return pimPluginKey.getState(state);
      },
    },
  });
}

/**
 * Loop het doc door, bouw één string + per-char mapping naar PM-posities.
 * Tussen verschillende block-parents voegen we '\n' toe — met synthetische -1
 * in de map, zodat detectors als 'rule.name' niet over block-grenzen matchen.
 */
export function extractPlain(doc: PmNode): { plain: string; map: number[] } {
  let plain = "";
  const map: number[] = [];
  let prevParent: PmNode | null = null;
  doc.descendants((node, pos, parent) => {
    if (!node.isText || !parent) return true;
    if (prevParent && parent !== prevParent) {
      plain += "\n";
      map.push(-1);
    }
    prevParent = parent;
    const t = node.text ?? "";
    for (let i = 0; i < t.length; i++) map.push(pos + i);
    plain += t;
    return false;
  });
  return { plain, map };
}

/** Veilig: span naar PM-range. Geeft null als de span een blokgrens kruist. */
export function spanToRange(
  span: PiiSpan,
  map: number[],
): { from: number; to: number } | null {
  if (span.start < 0 || span.end > map.length || span.end <= span.start) return null;
  const fromIdx = map[span.start];
  const lastIdx = map[span.end - 1];
  if (fromIdx < 0 || lastIdx < 0) return null;
  // Detecteer block-grens binnen de span.
  for (let i = span.start; i < span.end; i++) {
    if (map[i] < 0) return null;
  }
  return { from: fromIdx, to: lastIdx + 1 };
}

export function buildDecorations(
  spans: PiiSpan[],
  map: number[],
  doc: PmNode,
): DecorationSet {
  const decos: Decoration[] = [];
  for (const s of spans) {
    const r = spanToRange(s, map);
    if (!r) continue;
    decos.push(
      Decoration.inline(r.from, r.to, {
        class: `pim-pii pim-pii-${s.contextual ? "ctx" : "hard"} pim-cat-${s.category}`,
        "data-from": String(r.from),
        "data-to": String(r.to),
        "data-cat": s.category,
        "data-text": s.text,
        "data-conf": s.confidence.toFixed(2),
      }),
    );
  }
  return DecorationSet.create(doc, decos);
}