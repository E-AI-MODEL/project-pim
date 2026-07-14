import { WriterWorkspace } from "@/components/pim/writer/WriterWorkspace";

/**
 * Schrijfmodus binnen de ProductShell. De WriterWorkspace bevat de editor,
 * live PiM-controle en writer-specifieke acties. Header/footer/monitor komen
 * uit de gedeelde ProductShell, dit paneel voegt géén tweede chrome toe.
 */
export function WriteMode() {
  return <WriterWorkspace />;
}
