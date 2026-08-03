"use client";

import { useEffect, useState } from "react";
import { EmotButton, Button } from "@/components/climberbook/common/Button";
import {
  NumericRangeControl,
  Select,
} from "@/components/climberbook/common/FormControls";
import { Modal } from "@/components/climberbook/common/Modal";
import { useTheme } from "./ThemeProvider";
import styles from "./ThemeSelector.module.scss";

type ThemeSelectorProps = {
  compact?: boolean;
};

type VisualFilters = {
  saturation: number;
  contrast: number;
  invert: number;
  grayscale: number;
  hueRotate: number;
};

const FILTER_STORAGE_KEY = "climberbook:visual-filters";
const defaultVisualFilters: VisualFilters = {
  saturation: 1,
  contrast: 1,
  invert: 0,
  grayscale: 0,
  hueRotate: 0,
};

const filterControls: Array<{
  key: keyof VisualFilters;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}> = [
  { key: "saturation", label: "Saturation", min: 0, max: 2, step: 0.01 },
  { key: "contrast", label: "Contrast", min: 0.5, max: 2, step: 0.01 },
  { key: "invert", label: "Invert", min: 0, max: 1, step: 0.01 },
  { key: "grayscale", label: "Grayscale", min: 0, max: 1, step: 0.01 },
  {
    key: "hueRotate",
    label: "Hue rotate",
    min: 0,
    max: 360,
    step: 1,
    unit: "deg",
  },
];

function getStoredVisualFilters(): VisualFilters {
  if (typeof window === "undefined") return defaultVisualFilters;

  try {
    const stored = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (!stored) return defaultVisualFilters;
    const parsed = JSON.parse(stored) as Partial<VisualFilters>;

    return {
      saturation: Number.isFinite(parsed.saturation)
        ? parsed.saturation
        : defaultVisualFilters.saturation,
      contrast: Number.isFinite(parsed.contrast)
        ? parsed.contrast
        : defaultVisualFilters.contrast,
      invert: Number.isFinite(parsed.invert)
        ? parsed.invert
        : defaultVisualFilters.invert,
      grayscale: Number.isFinite(parsed.grayscale)
        ? parsed.grayscale
        : defaultVisualFilters.grayscale,
      hueRotate: Number.isFinite(parsed.hueRotate)
        ? parsed.hueRotate
        : defaultVisualFilters.hueRotate,
    };
  } catch {
    return defaultVisualFilters;
  }
}

function applyVisualFilters(filters: VisualFilters) {
  document.documentElement.style.filter = [
    `saturate(${filters.saturation})`,
    `contrast(${filters.contrast})`,
    `invert(${filters.invert})`,
    `grayscale(${filters.grayscale})`,
    `hue-rotate(${filters.hueRotate}deg)`,
  ].join(" ");
}

export function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { theme, themes, setTheme } = useTheme();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [visualFilters, setVisualFilters] =
    useState<VisualFilters>(defaultVisualFilters);

  useEffect(() => {
    setVisualFilters(getStoredVisualFilters());
  }, []);

  useEffect(() => {
    applyVisualFilters(visualFilters);
    window.localStorage.setItem(
      FILTER_STORAGE_KEY,
      JSON.stringify(visualFilters),
    );
  }, [visualFilters]);

  function updateFilter(key: keyof VisualFilters, value: string) {
    setVisualFilters((current) => ({ ...current, [key]: Number(value) }));
  }

  return (
    <>
      <div className={styles.selectorGroup}>
        <label
          className={[styles.selector, compact && styles.compact]
            .filter(Boolean)
            .join(" ")}
        >
          <span>{compact ? "Motyw" : "Motyw aplikacji"}</span>
          <Select
            size={compact ? "small" : "medium"}
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            aria-label="Motyw aplikacji"
            className={styles.select}
          >
            {themes.map((themeOption) => (
              <option key={themeOption.id} value={themeOption.id}>
                {themeOption.label}
              </option>
            ))}
          </Select>
        </label>
        {compact ? (
          <EmotButton
            size="small"
            variant="secondary"
            className={styles.filtersButton}
            onClick={() => setIsFiltersOpen(true)}
            aria-label="Ustawienia filtrów wizualnych"
            title="Ustawienia filtrów wizualnych"
          >
            ⚙
          </EmotButton>
        ) : null}
      </div>

      {isFiltersOpen ? (
        <Modal
          labelledBy="visual-filters-title"
          onClose={() => setIsFiltersOpen(false)}
          className={styles.filtersDialog}
          overlayClassName={styles.filtersOverlay}
        >
          <div className={styles.filtersContent}>
            <h2 id="visual-filters-title">Filtry wizualne</h2>
            <div className={styles.filtersList}>
              {filterControls.map((control) => (
                <label key={control.key} className={styles.filterRow}>
                  <span>{control.label}</span>
                  <NumericRangeControl
                    value={String(visualFilters[control.key])}
                    onChange={(event) =>
                      updateFilter(control.key, event.target.value)
                    }
                    min={String(control.min)}
                    max={String(control.max)}
                    step={String(control.step)}
                    ariaLabel={control.label}
                    valueLabel={`${visualFilters[control.key].toFixed(
                      control.step < 1 ? 2 : 0,
                    )}${control.unit ?? ""}`}
                  />
                </label>
              ))}
            </div>
            <div className={styles.filtersActions}>
              <Button
                variant="secondary"
                onClick={() => setVisualFilters(defaultVisualFilters)}
              >
                Reset
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
