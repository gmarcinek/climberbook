"use client";

import type { ReactNode } from "react";
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
  mobileAction?: ReactNode;
};
export function ReportHeaderWidget({
  meta,
  ascentsCount,
  panelAscents,
  rockAscents,
  mobileAction,
}: ReportHeaderWidgetProps) {
  return (
    <Stack
      direction="row"
      gap="md"
      justify="between"
      align="start"
      wrap
      fullWidth
    >
      <Stack style={{ flex: "1 1 320px", minWidth: 0 }}>
        <p style={eyebrowStyle}>{meta.eyebrow}</p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "nowrap",
            width: "100%",
          }}
        >
          <h1 style={{ ...pageTitleStyle, flex: "1 1 auto", minWidth: 0 }}>
            {meta.title}
          </h1>
          {mobileAction}
        </div>
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
