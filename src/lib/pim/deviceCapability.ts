// Wat een apparaat realistisch aankan. Puur lokaal, geen netwerk, geen opslag.
//
// Op een telefoon draait regelherkenning altijd; die kost vrijwel niets. Het
// slimme model (~100 MB) is alleen zinvol op een moderne telefoon met genoeg
// geheugen, en het volledige model (~180 MB) bieden we op mobiel niet aan.

import type { NerVariantKey } from "./modelCatalog";

export interface DeviceCapability {
  /** Smalle viewport of mobiel platform. */
  isMobile: boolean;
  /** Geschat werkgeheugen in GB; undefined als de browser het niet vertelt. */
  memoryGb?: number;
  /** Aantal logische cores; undefined als onbekend. */
  cores?: number;
  /** Kan het slimme model hier redelijkerwijs draaien? */
  canRunSmartModel: boolean;
  /** Welke modelvarianten mogen worden aangeboden. */
  allowedVariants: NerVariantKey[];
  /** Uitleg in mensentaal, altijd tonen bij de modelkeuze. */
  advice: string;
}

const MOBILE_BREAKPOINT = 768;

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number;
}

export function readDeviceCapability(): DeviceCapability {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isMobile: false,
      canRunSmartModel: true,
      allowedVariants: ["small", "large"],
      advice: "",
    };
  }
  const nav = navigator as NavigatorWithHints;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT || coarse;
  const memoryGb = typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined;
  const cores = typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : undefined;

  if (!isMobile) {
    return {
      isMobile: false,
      memoryGb,
      cores,
      canRunSmartModel: true,
      allowedVariants: ["small", "large"],
      advice: "",
    };
  }

  // Onbekend geheugen behandelen we als "waarschijnlijk genoeg", maar we
  // waarschuwen altijd over de download.
  const enoughMemory = memoryGb === undefined ? true : memoryGb >= 4;
  const enoughCores = cores === undefined ? true : cores >= 4;
  const canRunSmartModel = enoughMemory && enoughCores;

  return {
    isMobile: true,
    memoryGb,
    cores,
    canRunSmartModel,
    allowedVariants: canRunSmartModel ? ["small"] : [],
    advice: canRunSmartModel
      ? "Op je telefoon werkt alleen het compacte model. Het is een download van ongeveer 100 MB, doe dit op wifi."
      : "Deze telefoon heeft te weinig geheugen voor het slimme model. PiM blijft werken met de gewone herkenning van namen, nummers en adressen.",
  };
}
