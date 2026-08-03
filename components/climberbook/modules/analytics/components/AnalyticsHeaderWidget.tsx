"use client";

import {
  eyebrowStyle,
  headerBadgeStyle,
  mutedParagraphStyle,
  pageTitleStyle,
} from "@/components/climberbook/common/styles";
import { Stack } from "@/components/climberbook/common/Stack";
import { formatDurationMinutes } from "@/components/climberbook/common/training";

type AnalyticsHeaderWidgetProps = {
  meta: { eyebrow: string; title: string; description: string };
  isMobileLayout: boolean;
  trainingsCount: number;
  totalTrainingTime: number;
  averageWeight: string;
  totalCalories: number;
};

export function AnalyticsMobileSummary({
  trainingsCount,
  totalTrainingTime,
  totalCalories,
}: Pick<
  AnalyticsHeaderWidgetProps,
  "trainingsCount" | "totalTrainingTime" | "totalCalories"
>) {
  return (
    <Stack direction="row" gap="sm" wrap align="center">
      <span style={headerBadgeStyle}>
        Łączny czas: {formatDurationMinutes(totalTrainingTime)}
      </span>
      <span style={headerBadgeStyle}>Kalorie: {totalCalories}</span>
      <span style={headerBadgeStyle}>Treningi: {trainingsCount}</span>
    </Stack>
  );
}

export function AnalyticsHeaderWidget({
  meta,
  isMobileLayout,
  trainingsCount,
  totalTrainingTime,
  averageWeight,
  totalCalories,
}: AnalyticsHeaderWidgetProps) {
  return (
    <Stack direction="row" gap="md" justify="between" align="start" wrap>
      <Stack>
        <p style={{ ...eyebrowStyle, marginTop: "1rem" }}>{meta.eyebrow}</p>
        <h1 style={pageTitleStyle}>{meta.title}</h1>
        <p style={mutedParagraphStyle}>{meta.description}</p>
      </Stack>
      {!isMobileLayout ? (
        <Stack direction="row" gap="sm" wrap align="center">
          <span style={headerBadgeStyle}>Treningi: {trainingsCount}</span>
          <span style={headerBadgeStyle}>Średnia: {averageWeight} kg</span>
          <span style={headerBadgeStyle}>Kalorie: {totalCalories}</span>
        </Stack>
      ) : null}
    </Stack>
  );
}
