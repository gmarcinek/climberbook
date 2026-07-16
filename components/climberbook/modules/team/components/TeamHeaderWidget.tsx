"use client";

import {
  eyebrowStyle,
  headerBadgeRowStyle,
  headerBadgeStyle,
  moduleIntroStyle,
  mutedParagraphStyle,
  pageTitleStyle,
} from "@/components/climberbook/common/styles";
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
    <div style={moduleIntroStyle}>
      <div>
        <p style={eyebrowStyle}>{moduleMeta.eyebrow}</p>
        <h1 style={pageTitleStyle}>{moduleMeta.title}</h1>
        <p style={mutedParagraphStyle}>
          Podgląd drużyny, porównanie bieżących wyników oraz backupy zawodników.
        </p>
      </div>
      <div style={headerBadgeRowStyle}>
        <span style={headerBadgeStyle}>Zawodnicy: {athletesCount}</span>
        <span style={headerBadgeStyle}>Sesje: {teamTrainingsCount}</span>
      </div>
    </div>
  );
}
