// Gedeelde PiM-instellingen — spoor C.
// StartGoShell en WriterShell hadden allebei dezelfde ~15 regels state-bedrading
// voor het AdvancedPanel (profiel, drempels, uitgezette categorieën, integriteit)
// los gekopieerd. Eén hook → één bron van waarheid, identiek gedrag op beide
// pagina's, en een kant-en-klaar props-object om in AdvancedPanel te spreaden.

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PROFILE, onModelIntegrity,
  type PipelineProfileId, type Action, type PiiCategory, type ModelIntegrityRecord,
} from "@/lib/pim";
import type { AdvancedPanelProps } from "@/components/pim/start-go/AdvancedPanel";

export interface PimSettings {
  profileId: PipelineProfileId;
  setProfileId: (id: PipelineProfileId) => void;
  thresholdOverrides: Partial<Record<Action, number>>;
  disabledCategories: ReadonlySet<PiiCategory>;
  integrity: ModelIntegrityRecord[];
  /** Klaar om te spreaden: <AdvancedPanel {...settings.advancedPanelProps} /> */
  advancedPanelProps: AdvancedPanelProps;
}

export function usePimSettings(): PimSettings {
  const [profileId, setProfileId] = useState<PipelineProfileId>(DEFAULT_PROFILE);
  const [thresholdOverrides, setThresholdOverrides] = useState<Partial<Record<Action, number>>>({});
  const [disabledCategories, setDisabledCategories] = useState<ReadonlySet<PiiCategory>>(new Set());
  const [integrity, setIntegrity] = useState<ModelIntegrityRecord[]>([]);

  useEffect(() => onModelIntegrity(setIntegrity), []);

  const advancedPanelProps = useMemo<AdvancedPanelProps>(() => ({
    profileId,
    onProfileChange: setProfileId,
    thresholds: thresholdOverrides,
    onThresholdChange: (a, v) => setThresholdOverrides((prev) => ({ ...prev, [a]: v })),
    onResetThresholds: () => setThresholdOverrides({}),
    integrity,
    disabledCategories,
    onToggleCategory: (cat) => setDisabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    }),
    onResetCategories: () => setDisabledCategories(new Set()),
  }), [profileId, thresholdOverrides, disabledCategories, integrity]);

  return { profileId, setProfileId, thresholdOverrides, disabledCategories, integrity, advancedPanelProps };
}
