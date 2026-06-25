import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_DETECTION_SETTINGS, DEFAULT_PROFILE, onModelIntegrity,
  type DetectionLayerSettings, type PipelineProfileId, type Action, type PiiCategory, type ModelIntegrityRecord,
} from "@/lib/pim";
import type { AdvancedPanelProps } from "@/components/pim/start-go/AdvancedPanel";

export interface PimSettings {
  profileId: PipelineProfileId;
  setProfileId: (id: PipelineProfileId) => void;
  detectionSettings: DetectionLayerSettings;
  setDetectionSettings: (settings: DetectionLayerSettings) => void;
  thresholdOverrides: Partial<Record<Action, number>>;
  disabledCategories: ReadonlySet<PiiCategory>;
  setCategoryEnabled: (cat: PiiCategory, enabled: boolean) => void;
  integrity: ModelIntegrityRecord[];
  advancedPanelProps: AdvancedPanelProps;
}

export function usePimSettings(): PimSettings {
  const [profileId, setProfileId] = useState<PipelineProfileId>(DEFAULT_PROFILE);
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

  return { profileId, setProfileId, detectionSettings, setDetectionSettings, thresholdOverrides, disabledCategories, setCategoryEnabled, integrity, advancedPanelProps };
}
