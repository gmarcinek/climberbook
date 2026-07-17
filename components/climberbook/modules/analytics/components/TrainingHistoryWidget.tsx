"use client";

import { EmptyState } from "@/components/climberbook/common/charts";
import { surfaceOptions } from "@/components/climberbook/common/constants";
import { Panel } from "@/components/climberbook/common/Panel";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import {
  getRopeGradeColor,
  getRopeGradeIndex,
} from "@/components/climberbook/common/training";
import {
  infoGridStyle,
  listCardHeaderStyle,
  listCardStyle,
  moduleEyebrowStyle,
  panelHeadingStyle,
  scrollListStyle,
  sectionTitleStyle,
  softPillStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import type { TrainingRecord } from "@/lib/climbs-db";

const surfaceLabelByValue = new Map(
  surfaceOptions.map((surface) => [surface.value, surface.label]),
);

function getGradeChipStyle(grade: string) {
  if (getRopeGradeIndex(grade) < 0) {
    return {
      ...softPillStyle,
      color: "var(--text)",
    };
  }

  const background = getRopeGradeColor(grade);
  const red = Number.parseInt(background.slice(1, 3), 16);
  const green = Number.parseInt(background.slice(3, 5), 16);
  const blue = Number.parseInt(background.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return {
    ...softPillStyle,
    background,
    border: "1px solid rgba(24, 33, 43, 0.08)",
    color: luminance < 148 ? "#ffffff" : "#18212b",
  };
}

export function TrainingHistoryWidget({
  trainings,
}: {
  trainings: TrainingRecord[];
}) {
  const chronologicalTrainings = trainings
    .slice()
    .sort((left, right) =>
      `${right.date}-${right.time}-${right.createdAt}`.localeCompare(
        `${left.date}-${left.time}-${left.createdAt}`,
      ),
    );

  return (
    <Panel>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Analiza</span>
          <h2 style={sectionTitleStyle}>Lista treningow</h2>
        </div>
        <span style={softTagStyle}>{chronologicalTrainings.length} sesji</span>
      </div>
      <ScrollPane viewportStyle={scrollListStyle}>
        {chronologicalTrainings.length === 0 ? (
          <EmptyState message="Dodaj treningi, aby zobaczyc historie sesji." />
        ) : null}
        {chronologicalTrainings.map((training) => {
          const grades = training.difficultyNotes
            .split(",")
            .map((grade) => grade.trim())
            .filter(Boolean);
          const surfaces = training.surfaces
            .map((surface) => surfaceLabelByValue.get(surface) ?? surface)
            .join(", ");

          return (
            <article
              key={
                training.id ??
                `${training.date}-${training.time}-${training.createdAt}`
              }
              style={listCardStyle}
            >
              <div style={listCardHeaderStyle}>
                <strong>
                  {training.date} · {training.time}
                </strong>
                <span style={softPillStyle}>
                  {training.durationMinutes} min
                </span>
              </div>
              <div style={infoGridStyle}>
                <div>Kalorie: {training.caloriesBurned}</div>
                <div>Powierzchnie: {surfaces || "Brak"}</div>
                {training.customSessionType ? (
                  <div>Typ: {training.customSessionType}</div>
                ) : null}
                {training.wellbeing ? (
                  <div>Samopoczucie: {training.wellbeing}</div>
                ) : null}
                {grades.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span>Wyceny:</span>
                    {grades.map((grade, index) => (
                      <span
                        key={`${training.id ?? training.createdAt}-${grade}-${index}`}
                        style={getGradeChipStyle(grade)}
                      >
                        {grade}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div style={{ color: "var(--text)", overflowWrap: "anywhere" }}>
                  {training.notes?.trim() || "Brak notatki dla tej sesji."}
                </div>
              </div>
            </article>
          );
        })}
      </ScrollPane>
    </Panel>
  );
}
