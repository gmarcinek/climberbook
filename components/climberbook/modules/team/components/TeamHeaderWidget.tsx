"use client";

import {
  eyebrowStyle,
  headerBadgeStyle,
  mutedParagraphStyle,
  pageTitleStyle,
} from "@/components/climberbook/common/styles";
import { Stack } from "@/components/climberbook/common/Stack";
type TeamHeaderWidgetProps = {
  moduleMeta: { eyebrow: string; title: string };
  athletesCount: number;
  teamTrainingsCount: number;
};
export function TeamHeaderWidget({
  moduleMeta,
  athletesCount,
  teamTrainingsCount,
}: TeamHeaderWidgetProps) {
  return (
    <Stack direction="row" gap="md" justify="between" align="start" wrap>
      <Stack>
        <p style={eyebrowStyle}>{moduleMeta.eyebrow}</p>
        <h1 style={pageTitleStyle}>{moduleMeta.title}</h1>
        <p style={mutedParagraphStyle}>
          Podgląd drużyny, porównanie bieżących wyników oraz backupy zawodników.
        </p>
      </Stack>
      <Stack direction="row" gap="sm" wrap align="center">
        <span style={headerBadgeStyle}>Zawodnicy: {athletesCount}</span>
        <span style={headerBadgeStyle}>Sesje: {teamTrainingsCount}</span>
      </Stack>
    </Stack>
  );
}
