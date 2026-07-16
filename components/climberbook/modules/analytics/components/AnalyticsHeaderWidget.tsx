"use client";

import {
  eyebrowStyle,
  headerBadgeStyle,
  mutedParagraphStyle,
  pageTitleStyle,
} from "@/components/climberbook/common/styles";
import { Stack } from "@/components/climberbook/common/Stack";

type AnalyticsHeaderWidgetProps = {
  meta: { eyebrow: string; title: string; description: string };
  trainingsCount: number;
  averageWeight: string;
  totalCalories: number;
};

export function AnalyticsHeaderWidget({
  meta,
  trainingsCount,
  averageWeight,
  totalCalories,
}: AnalyticsHeaderWidgetProps) {
  return (
    <Stack direction="row" gap="md" justify="between" align="start" wrap>
      <Stack>
        <p style={eyebrowStyle}>{meta.eyebrow}</p>
        <h1 style={pageTitleStyle}>{meta.title}</h1>
        <p style={mutedParagraphStyle}>{meta.description}</p>
      </Stack>
      <Stack direction="row" gap="sm" wrap align="center">
        <span style={headerBadgeStyle}>Treningi: {trainingsCount}</span>
        <span style={headerBadgeStyle}>Średnia: {averageWeight} kg</span>
        <span style={headerBadgeStyle}>Kalorie: {totalCalories}</span>
      </Stack>
    </Stack>
  );
}
