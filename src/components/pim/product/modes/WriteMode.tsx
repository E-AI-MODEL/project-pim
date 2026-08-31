import { WriterWorkspace } from "@/components/pim/writer/WriterWorkspace";
import { NewTextButton } from "../NewTextButton";

/**
 * Schrijfmodus binnen de ProductShell. De WriterWorkspace bevat de editor,
 * live PiM-controle en writer-specifieke acties. Header/footer/monitor komen
 * uit de gedeelde ProductShell, dit paneel voegt géén tweede chrome toe.
 */
export function WriteMode() {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <NewTextButton />
      </div>
      <WriterWorkspace />
    </div>
  );
}
