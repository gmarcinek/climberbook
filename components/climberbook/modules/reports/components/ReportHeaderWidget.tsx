"use client";

import {
  eyebrowStyle,
  headerBadgeRowStyle,
  headerBadgeStyle,
  moduleIntroStyle,
  mutedParagraphStyle,
  pageTitleStyle,
} from "@/components/climberbook/common/styles";
type ReportHeaderWidgetProps = {
  meta: { eyebrow: string; title: string; description: string };
  ascentsCount: number;
  panelAscents: number;
  rockAscents: number;
};
export function ReportHeaderWidget({
  meta,
  ascentsCount,
  panelAscents,
  rockAscents,
}: ReportHeaderWidgetProps) {
  return (
    <div style={moduleIntroStyle}>
      <div>
        <p style={eyebrowStyle}>{meta.eyebrow}</p>
        <h1 style={pageTitleStyle}>{meta.title}</h1>
        <p style={mutedParagraphStyle}>{meta.description}</p>
      </div>
      <div style={headerBadgeRowStyle}>
        <span style={headerBadgeStyle}>Przejścia: {ascentsCount}</span>
        <span style={headerBadgeStyle}>Panel: {panelAscents}</span>
        <span style={headerBadgeStyle}>Skała: {rockAscents}</span>
      </div>
    </div>
  );
}
