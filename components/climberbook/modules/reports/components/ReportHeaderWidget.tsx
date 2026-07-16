"use client";

import {
  eyebrowStyle,
  headerBadgeStyle,
  mutedParagraphStyle,
  pageTitleStyle,
} from "@/components/climberbook/common/styles";
import { Stack } from "@/components/climberbook/common/Stack";
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
    <Stack direction="row" gap="md" justify="between" align="start" wrap>
      <Stack>
        <p style={eyebrowStyle}>{meta.eyebrow}</p>
        <h1 style={pageTitleStyle}>{meta.title}</h1>
        <p style={mutedParagraphStyle}>{meta.description}</p>
      </Stack>
      <Stack direction="row" gap="sm" wrap align="center">
        <span style={headerBadgeStyle}>Przejścia: {ascentsCount}</span>
        <span style={headerBadgeStyle}>Panel: {panelAscents}</span>
        <span style={headerBadgeStyle}>Skała: {rockAscents}</span>
      </Stack>
    </Stack>
  );
}
