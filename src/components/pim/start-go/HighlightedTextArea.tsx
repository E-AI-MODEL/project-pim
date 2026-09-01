// Eén bewerkbaar tekstvlak met markeringen eronder, zoals in het schrijfscherm.
// De overlay rendert exact dezelfde tekst met dezelfde typografie; de textarea
// erboven is transparant, zodat je in de gemarkeerde tekst blijft typen.
// Klik je in een markering, dan verschijnt hetzelfde bubbeltje als in
// Schrijven: Vervang of Negeer.
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type TextareaHTMLAttributes,
} from "react";
import { X } from "lucide-react";
import type { PiiSpan } from "@/lib/pim/types";

export type SpanAction = "replace" | "ignore";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (v: string) => void;
  spans?: PiiSpan[];
  /** Gedeelde typografie/padding voor overlay én textarea. */
  boxClassName?: string;
  /** Vervang/Negeer op een aangeklikte markering. */
  onSpanAction?: (span: PiiSpan, action: SpanAction) => void;
};

function mergeSpans(spans: PiiSpan[]): PiiSpan[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.confidence - a.confidence);
  const merged: PiiSpan[] = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) {
      if (s.confidence > last.confidence) merged[merged.length - 1] = s;
      continue;
    }
    merged.push(s);
  }
  return merged;
}

export const HighlightedTextArea = forwardRef<HTMLTextAreaElement, Props>(
  function HighlightedTextArea(
    {
      value,
      onValueChange,
      spans = [],
      boxClassName = "",
      className = "",
      onSpanAction,
      ...rest
    },
    ref,
  ) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const markRefs = useRef<Record<number, HTMLElement | null>>({});
    const [picked, setPicked] = useState<{ span: PiiSpan; x: number; y: number } | null>(null);

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      },
      [ref],
    );

    const syncScroll = useCallback(() => {
      const ta = innerRef.current;
      const ov = overlayRef.current;
      if (ta && ov) {
        ov.scrollTop = ta.scrollTop;
        ov.scrollLeft = ta.scrollLeft;
      }
    }, []);

    useLayoutEffect(syncScroll, [value, syncScroll]);
    // Bubbel sluit zodra de tekst of de bevindingen wijzigen.
    useEffect(() => setPicked(null), [value, spans]);

    const merged = mergeSpans(spans);
    const parts: Array<{ kind: "text" | "span"; text: string; span?: PiiSpan }> = [];
    let cursor = 0;
    for (const s of merged) {
      if (s.start > cursor) parts.push({ kind: "text", text: value.slice(cursor, s.start) });
      parts.push({ kind: "span", text: value.slice(s.start, s.end), span: s });
      cursor = s.end;
    }
    if (cursor < value.length) parts.push({ kind: "text", text: value.slice(cursor) });

    const openBubble = useCallback(() => {
      if (!onSpanAction) return;
      const ta = innerRef.current;
      if (!ta) return;
      const caret = ta.selectionStart ?? 0;
      const hit = merged.find((s) => caret >= s.start && caret <= s.end);
      if (!hit) {
        setPicked(null);
        return;
      }
      const idx = parts.findIndex((p) => p.span === hit);
      const el = markRefs.current[idx];
      const wrap = wrapRef.current;
      let x = 8;
      let y = 8;
      if (el && wrap) {
        const r = el.getBoundingClientRect();
        const w = wrap.getBoundingClientRect();
        x = Math.max(4, Math.min(r.left - w.left, w.width - 220));
        y = r.bottom - w.top + 6;
      }
      setPicked({ span: hit, x, y });
    }, [merged, onSpanAction, parts]);

    return (
      <div className="relative" ref={wrapRef}>
        <div
          ref={overlayRef}
          aria-hidden
          className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-transparent ${boxClassName} ${className}`}
        >
          {parts.map((p, i) =>
            p.kind === "text" ? (
              <span key={i}>{p.text}</span>
            ) : (
              <mark
                key={i}
                ref={(el) => {
                  markRefs.current[i] = el;
                }}
                className={`rounded-[3px] bg-transparent text-transparent ${
                  p.span?.contextual
                    ? "shadow-[inset_0_-0.75em_0_rgba(251,191,36,0.28)]"
                    : "shadow-[inset_0_-0.75em_0_rgba(244,63,94,0.22)]"
                }`}
              >
                {p.text}
              </mark>
            ),
          )}
          {"\n"}
        </div>
        <textarea
          ref={setRefs}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onScroll={syncScroll}
          onClick={openBubble}
          onKeyUp={(e) => {
            if (e.key.startsWith("Arrow")) openBubble();
          }}
          spellCheck={false}
          className={`relative bg-transparent ${boxClassName} ${className}`}
          {...rest}
        />
        {picked && onSpanAction && (
          <div
            style={{ position: "absolute", left: picked.x, top: picked.y }}
            data-testid="span-bubble"
            className="z-50 flex gap-2 rounded-xl border border-[#e5e7ef] bg-white p-2 shadow-lg"
          >
            <button
              type="button"
              onClick={() => {
                onSpanAction(picked.span, "replace");
                setPicked(null);
              }}
              className="rounded-md bg-[#6d4aff] px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-[#5b3dea]"
            >
              Vervang
            </button>
            <button
              type="button"
              onClick={() => {
                onSpanAction(picked.span, "ignore");
                setPicked(null);
              }}
              className="rounded-md border border-[#e5e7ef] px-2.5 py-1 text-[12px] text-[#334155] hover:bg-[#f6f7fb]"
            >
              Negeer
            </button>
            <button
              type="button"
              aria-label="Sluiten"
              onClick={() => setPicked(null)}
              className="rounded-md px-2 py-1 text-[#64748b] hover:bg-[#f1f2f7]"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  },
);
