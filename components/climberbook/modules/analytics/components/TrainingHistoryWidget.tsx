"use client";

import { EmptyState } from "@/components/climberbook/common/charts";
import { surfaceOptions } from "@/components/climberbook/common/constants";
import { GradeChip } from "@/components/climberbook/common/GradeChip";
import { Panel } from "@/components/climberbook/common/Panel";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import { formatDurationMinutes } from "@/components/climberbook/common/training";
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

  return {
    minimum,
    maximum,
    label: minimum === maximum ? `V${minimum}` : `V${minimum}-V${maximum}`,
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
        padding: "8px 0 16px",
        background: "transparent",
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
            const surfaceGrades = training.difficultyBySurface?.[surface] ?? "";

            if (!surfaceGrades.trim()) {
              return [];
            }

            const range = getBoardGradeRange(surface, surfaceGrades);

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
                  {formatDurationMinutes(training.durationMinutes)}
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
                      <GradeChip
                        key={`${training.id ?? training.createdAt}-${grade}-${index}`}
                        grade={grade}
                      />
                    ))}
                  </div>
                ) : null}
                {boardGradeRanges.map(({ surface, range }) => (
                  <div key={surface}>
                    {surfaceLabelByValue.get(surface)}:{" "}
                    <GradeChip
                      surface={surface}
                      grade={`V${range.minimum}`}
                      endGrade={`V${range.maximum}`}
                    />
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
