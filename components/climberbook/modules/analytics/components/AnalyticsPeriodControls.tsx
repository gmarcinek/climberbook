"use client";

import { useState } from "react";
import { Button } from "@/components/climberbook/common/Button";
import { Input } from "@/components/climberbook/common/FormControls";
import { Modal } from "@/components/climberbook/common/Modal";
import { Stack } from "@/components/climberbook/common/Stack";
import {
  navButtonStyle,
  sectionTitleStyle,
} from "@/components/climberbook/common/styles";

export type AnalyticsPeriodPreset = "all" | "month" | "week" | "year";

type AnalyticsPeriodControlsProps = {
  start: string;
  end: string;
  activePreset: AnalyticsPeriodPreset | "custom";
  isMobileLayout: boolean;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onPreset: (preset: AnalyticsPeriodPreset) => void;
};

const presets: Array<{ key: AnalyticsPeriodPreset; label: string }> = [
  { key: "year", label: "Rok" },
  { key: "month", label: "Miesiąc" },
  { key: "week", label: "Tydzień" },
  { key: "all", label: "Wszystko" },
];

export function AnalyticsPeriodControls({
  start,
  end,
  activePreset,
  isMobileLayout,
  onStartChange,
  onEndChange,
  onPreset,
}: AnalyticsPeriodControlsProps) {
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const dateFields = (
    <Stack direction="row" gap="sm" wrap>
      <label
        style={{
          display: "grid",
          gap: 4,
          flex: isMobileLayout ? "1 1 160px" : "0 1 22rem",
          maxWidth: isMobileLayout ? undefined : "22rem",
        }}
      >
        Od
        <Input
          type="date"
          value={start}
          onChange={(event) => onStartChange(event.target.value)}
        />
      </label>
      <label
        style={{
          display: "grid",
          gap: 4,
          flex: isMobileLayout ? "1 1 160px" : "0 1 22rem",
          maxWidth: isMobileLayout ? undefined : "22rem",
        }}
      >
        Do
        <Input
          type="date"
          value={end}
          onChange={(event) => onEndChange(event.target.value)}
        />
      </label>
    </Stack>
  );

  return (
    <section style={{ display: "grid", gap: "0.75rem" }}>
      <Stack direction="row" gap="sm" wrap>
        {presets.map((preset) => (
          <Button
            key={preset.key}
            size={isMobileLayout ? "small" : "medium"}
            variant={activePreset === preset.key ? "primary" : "secondary"}
            onClick={() => onPreset(preset.key)}
          >
            {preset.label}
          </Button>
        ))}
        <Button
          size={isMobileLayout ? "small" : "medium"}
          variant={activePreset === "custom" ? "primary" : "secondary"}
          onClick={() => setIsDateModalOpen(true)}
        >
          Zakres
        </Button>
      </Stack>
      {isDateModalOpen ? (
        <Modal
          labelledBy="analytics-date-range-modal-title"
          onClose={() => setIsDateModalOpen(false)}
        >
          <Stack gap="md">
            <h2 id="analytics-date-range-modal-title" style={sectionTitleStyle}>
              Zakres dat
            </h2>
            {dateFields}
            <Button
              variant="primary"
              onClick={() => setIsDateModalOpen(false)}
            >
              Gotowe
            </Button>
          </Stack>
        </Modal>
      ) : null}
    </section>
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