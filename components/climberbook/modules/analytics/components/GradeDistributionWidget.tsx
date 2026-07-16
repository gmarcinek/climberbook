"use client";

import { EmptyState } from "@/components/climberbook/common/charts";
import { Panel } from "@/components/climberbook/common/Panel";
import { getRopeGradeColor } from "@/components/climberbook/common/training";
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";

type GradeDistributionWidgetProps = {
  highestGrade: string;
  gradeDistribution: Array<{ grade: string; count: number }>;
};

export function GradeDistributionWidget({
  highestGrade,
  gradeDistribution,
}: GradeDistributionWidgetProps) {
  const maxCount = gradeDistribution.reduce(
    (highest, grade) => Math.max(highest, grade.count),
    0,
  );

  return (
    <Panel>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Wyceny</span>
          <h2 style={sectionTitleStyle}>Rozkład i maksimum</h2>
        </div>
        <span style={softTagStyle}>
          {gradeDistribution.length > 0
            ? `Najwyższa: ${highestGrade} · max ${maxCount}`
            : `Najwyższa: ${highestGrade}`}
        </span>
      </div>
      {gradeDistribution.length === 0 ? (
        <EmptyState message="Nie ma jeszcze wybranych wycen w treningach." />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {gradeDistribution.map((grade) => {
            const normalizedCount = maxCount > 0 ? grade.count / maxCount : 0;

            return (
              <article
                key={grade.grade}
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px minmax(0, 1fr) 52px",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <strong>{grade.grade}</strong>
                <div
                  style={{
                    position: "relative",
                    height: 10,
                    overflow: "hidden",
                    borderRadius: 999,
                    background: "rgba(28, 61, 89, 0.08)",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(normalizedCount * 100, 3)}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: getRopeGradeColor(grade.grade),
                    }}
                  />
                </div>
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: "0.85rem",
                    textAlign: "right",
                  }}
                >
                  {grade.count}
                </span>
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
