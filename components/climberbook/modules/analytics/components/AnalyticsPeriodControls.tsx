"use client";

import { Button } from "@/components/climberbook/common/Button";
import { Stack } from "@/components/climberbook/common/Stack";
import { navButtonStyle } from "@/components/climberbook/common/styles";

export type AnalyticsPeriodPreset = "all" | "month" | "week" | "year";

type AnalyticsPeriodControlsProps = {
  activePreset: AnalyticsPeriodPreset | "custom";
  isMobileLayout: boolean;
  onCurrentPeriodSelect: () => void;
  onPreset: (preset: AnalyticsPeriodPreset) => void;
};

const presets: Array<{
  key: AnalyticsPeriodPreset;
  label: string;
  mobileLabel: string;
}> = [
  { key: "year", label: "Rok", mobileLabel: "Rok" },
  { key: "month", label: "Miesiąc", mobileLabel: "1M" },
  { key: "week", label: "Tydzień", mobileLabel: "1T" },
  { key: "all", label: "Wszystko", mobileLabel: "All" },
];

const periodTabStyle = {
  border: "1px solid var(--component-chart-tab-inactive-border)",
  background: "var(--component-chart-tab-inactive-background)",
  color: "var(--component-chart-tab-inactive-text)",
};

const periodTabActiveStyle = {
  border: "1px solid var(--component-chart-tab-active-border)",
  background: "var(--component-chart-tab-active-background)",
  color: "var(--component-chart-tab-active-text)",
};

export function AnalyticsPeriodControls({
  activePreset,
  isMobileLayout,
  onCurrentPeriodSelect,
  onPreset,
}: AnalyticsPeriodControlsProps) {
  return (
    <Stack direction="row" gap="sm" wrap>
      <Button
        size={isMobileLayout ? "small" : "medium"}
        variant="secondary"
        onClick={onCurrentPeriodSelect}
        style={
          activePreset === "custom" ? periodTabActiveStyle : periodTabStyle
        }
      >
        {isMobileLayout ? "Ostatnio" : "Okres bieżący"}
      </Button>
      {presets.map((preset) => (
        <Button
          key={preset.key}
          size={isMobileLayout ? "small" : "medium"}
          variant="secondary"
          onClick={() => onPreset(preset.key)}
          style={
            activePreset === preset.key ? periodTabActiveStyle : periodTabStyle
          }
        >
          {isMobileLayout ? preset.mobileLabel : preset.label}
        </Button>
      ))}
    </Stack>
  );
}

export function AnalyticsPeriodNavigation({
  label,
  onPrevious,
  onNext,
  canNavigate = true,
}: {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  canNavigate?: boolean;
}) {
  return (
    <Stack
      direction="row"
      justify={canNavigate ? "between" : "center"}
      align="center"
      style={{ width: "100%" }}
    >
      {canNavigate ? (
        <Button
          size="medium"
          variant="secondary"
          aria-label="Poprzedni okres analizy"
          title="Poprzedni okres"
          onClick={onPrevious}
          style={{ ...navButtonStyle, width: "44px" }}
        >
          <span aria-hidden style={{ fontSize: "2rem", lineHeight: 0.65 }}>
            ‹
          </span>
        </Button>
      ) : null}
      <span
        style={{
          color: "var(--accent)",
          fontSize: "14px",
          fontWeight: 400,
          textAlign: "center",
        }}
      >
        {label}
      </span>
      {canNavigate ? (
        <Button
          size="medium"
          variant="secondary"
          aria-label="Następny okres analizy"
          title="Następny okres"
          onClick={onNext}
          style={{ ...navButtonStyle, width: "44px" }}
        >
          <span aria-hidden style={{ fontSize: "2rem", lineHeight: 0.65 }}>
            ›
          </span>
        </Button>
      ) : null}
    </Stack>
  );
}
