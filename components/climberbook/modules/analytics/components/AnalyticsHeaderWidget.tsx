"use client";

import {
  eyebrowStyle,
  headerBadgeRowStyle,
  headerBadgeStyle,
  moduleIntroStyle,
  mutedParagraphStyle,
  pageTitleStyle,
} from "@/components/climberbook/common/styles";

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
    <div style={moduleIntroStyle}>
      <div>
        <p style={eyebrowStyle}>{meta.eyebrow}</p>
        <h1 style={pageTitleStyle}>{meta.title}</h1>
        <p style={mutedParagraphStyle}>{meta.description}</p>
      </div>
      <div style={headerBadgeRowStyle}>
        <span style={headerBadgeStyle}>Treningi: {trainingsCount}</span>
        <span style={headerBadgeStyle}>Średnia: {averageWeight} kg</span>
        <span style={headerBadgeStyle}>Kalorie: {totalCalories}</span>
      </div>
    </div>
  );
}
