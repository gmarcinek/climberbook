"use client";

import type { ReactNode } from "react";
import {
  eyebrowStyle,
  headerBadgeStyle,
  mutedParagraphStyle,
  pageTitleStyle,
} from "@/components/climberbook/common/styles";
import { Stack } from "@/components/climberbook/common/Stack";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
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
  const { isMobileHeader } = useViewport();

  return (
    <Stack
      direction="row"
      gap="md"
      justify="between"
      align="start"
      wrap
      fullWidth
    >
      <Stack
        style={{
          flex: "1 1 320px",
          minWidth: 0,
          order: isMobileHeader ? 2 : 1,
        }}
      >
        {mobileAction}
        <p style={eyebrowStyle}>{meta.eyebrow}</p>
        <h1 style={pageTitleStyle}>{meta.title}</h1>
        <p style={mutedParagraphStyle}>{meta.description}</p>
      </Stack>
      <Stack
        direction="row"
        gap="sm"
        wrap
        align="center"
        style={{ order: isMobileHeader ? 1 : 2 }}
      >
        <span style={headerBadgeStyle}>Przejścia: {ascentsCount}</span>
        <span style={headerBadgeStyle}>Panel: {panelAscents}</span>
        <span style={headerBadgeStyle}>Skała: {rockAscents}</span>
      </Stack>
    </Stack>
  );
}
