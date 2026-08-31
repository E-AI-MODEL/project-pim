// Eén bewerkbaar tekstvlak met markeringen eronder, zoals in het schrijfscherm.
// De overlay rendert exact dezelfde tekst met dezelfde typografie; de textarea
// erboven is transparant, zodat je in de gemarkeerde tekst blijft typen.
import { forwardRef, useCallback, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
import type { PiiSpan } from "@/lib/pim/types";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (v: string) => void;
  spans?: PiiSpan[];
  /** Gedeelde typografie/padding voor overlay én textarea. */
  boxClassName?: string;
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
    { value, onValueChange, spans = [], boxClassName = "", className = "", ...rest },
    ref,
  ) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

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

    const merged = mergeSpans(spans);
    const parts: Array<{ kind: "text" | "span"; text: string; span?: PiiSpan }> = [];
    let cursor = 0;
    for (const s of merged) {
      if (s.start > cursor) parts.push({ kind: "text", text: value.slice(cursor, s.start) });
      parts.push({ kind: "span", text: value.slice(s.start, s.end), span: s });
      cursor = s.end;
    }
    if (cursor < value.length) parts.push({ kind: "text", text: value.slice(cursor) });

    return (
      <div className="relative">
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
          spellCheck={false}
          className={`relative bg-transparent ${boxClassName} ${className}`}
          {...rest}
        />
      </div>
    );
  },
);
