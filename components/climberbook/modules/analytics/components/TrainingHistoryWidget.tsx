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
const boardSurfaces = ["moon", "kilter", "baldy"] as const;

function getBoardGradeRange(
  surface: (typeof boardSurfaces)[number],
  grades: string,
) {
  const values = grades
    .split(",")
    .map((grade) => grade.trim())
    .map((grade) =>
      surface === "baldy"
        ? Number(grade)
        : Number(/^V(\d+)$/i.exec(grade)?.[1]),
    )
    .filter(
      (grade) =>
        Number.isInteger(grade) &&
        grade >= 1 &&
        grade <= (surface === "baldy" ? 9 : 17),
    );

  if (!values.length) {
    return null;
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);

  return minimum === maximum ? `V${minimum}` : `V${minimum}-V${maximum}`;
}

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
  isMobileLayout,
  trainings,
}: {
  isMobileLayout: boolean;
  trainings: TrainingRecord[];
}) {
  const chronologicalTrainings = trainings
    .slice()
    .sort((left, right) =>
      `${right.date}-${right.time}-${right.createdAt}`.localeCompare(
        `${left.date}-${left.time}-${left.createdAt}`,
      ),
    );
  const responsiveTrainingCardStyle = isMobileLayout
    ? {
        ...listCardStyle,
        padding: 0,
        paddingBottom: 12,
        marginBottom: 12,
        background: "transparent",
        border: 0,
        borderBottom: "1px solid rgb(215 212 212)",
      }
    : {
        ...listCardStyle,
        borderBottom: "1px solid rgb(215 212 212)",
      };

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
          const ropeGrades = (
            training.difficultyBySurface?.lina ??
            (training.surfaces.includes("lina") ? training.difficultyNotes : "")
          )
            .split(",")
            .map((grade) => grade.trim())
            .filter(Boolean);
          const boardGradeRanges = boardSurfaces.flatMap((surface) => {
            if (!training.surfaces.includes(surface)) {
              return [];
            }

            const range = getBoardGradeRange(
              surface,
              training.difficultyBySurface?.[surface] ??
                training.difficultyNotes,
            );

            return range ? [{ surface, range }] : [];
          });
          const surfaces = training.surfaces
            .map((surface) => surfaceLabelByValue.get(surface) ?? surface)
            .join(", ");

          return (
            <article
              key={
                training.id ??
                `${training.date}-${training.time}-${training.createdAt}`
              }
              style={responsiveTrainingCardStyle}
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
                {ropeGrades.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span>Wyceny:</span>
                    {ropeGrades.map((grade, index) => (
                      <span
                        key={`${training.id ?? training.createdAt}-${grade}-${index}`}
                        style={getGradeChipStyle(grade)}
                      >
                        {grade}
                      </span>
                    ))}
                  </div>
                ) : null}
                {boardGradeRanges.map(({ surface, range }) => (
                  <div key={surface}>
                    {surfaceLabelByValue.get(surface)}: {range}
                  </div>
                ))}
                {training.notes?.trim() ? (
                  <div
                    style={{ color: "var(--text)", overflowWrap: "anywhere" }}
                  >
                    {training.notes.trim()}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </ScrollPane>
    </Panel>
  );
}
