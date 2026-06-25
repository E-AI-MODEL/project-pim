// Gedeelde PiM-instellingen — profile-free layers.

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_DETECTION_SETTINGS, onModelIntegrity,
  type DetectionLayerSettings, type Action, type PiiCategory, type ModelIntegrityRecord,
} from "@/lib/pim";
import type { AdvancedPanelProps } from "@/components/pim/start-go/AdvancedPanel";

export interface PimSettings {
  detectionSettings: DetectionLayerSettings;
  setDetectionSettings: (settings: DetectionLayerSettings) => void;
  thresholdOverrides: Partial<Record<Action, number>>;
  disabledCategories: ReadonlySet<PiiCategory>;
  setCategoryEnabled: (cat: PiiCategory, enabled: boolean) => void;
  integrity: ModelIntegrityRecord[];
  advancedPanelProps: AdvancedPanelProps;
}

export function usePimSettings(): PimSettings {
  const [detectionSettings, setDetectionSettings] = useState<DetectionLayerSettings>(DEFAULT_DETECTION_SETTINGS);
  const [thresholdOverrides, setThresholdOverrides] = useState<Partial<Record<Action, number>>>({});
  const [disabledCategories, setDisabledCategories] = useState<ReadonlySet<PiiCategory>>(new Set());
  const [integrity, setIntegrity] = useState<ModelIntegrityRecord[]>([]);

  useEffect(() => onModelIntegrity(setIntegrity), []);

  const setCategoryEnabled = (cat: PiiCategory, enabled: boolean) =>
    setDisabledCategories((prev) => {
      const next = new Set(prev);
      if (enabled) next.delete(cat); else next.add(cat);
      return next;
    });

  const advancedPanelProps = useMemo<AdvancedPanelProps>(() => ({
    detectionSettings,
    onDetectionSettingsChange: setDetectionSettings,
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
  }), [detectionSettings, thresholdOverrides, disabledCategories, integrity]);

  return { detectionSettings, setDetectionSettings, thresholdOverrides, disabledCategories, setCategoryEnabled, integrity, advancedPanelProps };
}
