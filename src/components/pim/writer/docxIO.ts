// .docx import (via mammoth) en export (via docx) — 100% in de browser.

import type { Editor } from "@tiptap/react";
import type { Node as PmNode } from "@tiptap/pm/model";

export interface DocxImportResult {
  warnings: string[];
}

export async function importDocxToEditor(file: File, editor: Editor): Promise<DocxImportResult> {
  const mammoth = await import("mammoth/mammoth.browser");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = (result.value ?? "").trim();
  if (!html) throw new Error("Geen tekst gevonden in het document.");
  editor.commands.setContent(html);
  const warnings: string[] = [];
  const messages = (result.messages ?? []) as Array<{ type?: string; message?: string }>;
  const imgCount = messages.filter((m) => /image/i.test(m?.message ?? "")).length;
  if (imgCount > 0) {
    warnings.push(`Afbeeldingen niet meegenomen (${imgCount}). PiM importeert alleen tekst.`);
  }
  const others = messages.filter((m) => !/image/i.test(m?.message ?? "") && m?.message);
  for (const m of others.slice(0, 3)) {
    warnings.push(m.message as string);
  }
  return { warnings };
}

export async function exportEditorToDocx(editor: Editor, filename: string): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, LevelFormat, AlignmentType } =
    await import("docx");

  const HEAD_MAP: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
  };

  const paragraphs: InstanceType<typeof Paragraph>[] = [];

  const runsFor = (node: PmNode): InstanceType<typeof TextRun>[] => {
    const runs: InstanceType<typeof TextRun>[] = [];
    node.descendants((child) => {
      if (child.isText) {
        const marks: string[] = (child.marks ?? []).map((m) => m.type.name);
        runs.push(
          new TextRun({
            text: child.text ?? "",
            bold: marks.includes("bold"),
            italics: marks.includes("italic"),
            underline: marks.includes("underline") ? {} : undefined,
            strike: marks.includes("strike") || marks.includes("strikethrough"),
          }),
        );
      }
      return true;
    });
    return runs;
  };

  editor.state.doc.forEach((node) => {
    const name = node.type.name;
    if (name === "heading") {
      const level = (node.attrs.level as number) ?? 1;
      paragraphs.push(
        new Paragraph({
          heading: HEAD_MAP[level] ?? HeadingLevel.HEADING_2,
          children: runsFor(node),
        }),
      );
    } else if (name === "bulletList" || name === "orderedList") {
      // FIXME: nested lists worden platgeslagen naar level 0.
      const ref = name === "bulletList" ? "writer-bullets" : "writer-numbers";
      node.forEach((li) => {
        paragraphs.push(
          new Paragraph({
            numbering: { reference: ref, level: 0 },
            children: runsFor(li),
          }),
        );
      });
    } else if (name === "blockquote") {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: runsFor(node),
          indent: { left: 720 },
        }),
      );
    } else {
      paragraphs.push(new Paragraph({ children: runsFor(node) }));
    }
  });

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "writer-bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "writer-numbers",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            // A4 in DXA: 11906 × 16838, marges 1417 ≈ 2,5 cm.
            size: { width: 11906, height: 16838 },
            margin: { top: 1417, right: 1417, bottom: 1417, left: 1417 },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
