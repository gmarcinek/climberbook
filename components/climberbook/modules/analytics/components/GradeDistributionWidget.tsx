"use client";

import { useState } from "react";
import { EmptyState } from "@/components/climberbook/common/charts";
import { Panel } from "@/components/climberbook/common/Panel";
import { getRopeGradeColor } from "@/components/climberbook/common/training";
import type { TrainingSurface } from "@/lib/climbs-db";
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";

type GradeDistributionWidgetProps = {
  gradeDistribution: Array<{
    grade: string;
    surface: TrainingSurface | "lina";
    count: number;
  }>;
};

type GradeDistributionTab = "lina" | "moon" | "kilter" | "baldy";

const gradeDistributionTabs: Array<{
  key: GradeDistributionTab;
  label: string;
}> = [
  { key: "lina", label: "Lina" },
  { key: "moon", label: "Moon" },
  { key: "kilter", label: "Kilter" },
  { key: "baldy", label: "Baldy" },
];

export function GradeDistributionWidget({
  gradeDistribution,
}: GradeDistributionWidgetProps) {
  const [activeTab, setActiveTab] = useState<GradeDistributionTab>("lina");
  const visibleGrades = gradeDistribution.filter(
    (grade) => grade.surface === activeTab,
  );
  const displayedGrades = getDisplayedGrades(activeTab, visibleGrades);
  const maxCount = visibleGrades.reduce(
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
      </div>
      <div
        style={gradeDistributionTabsStyle}
        role="tablist"
        aria-label="Rozkład wycen"
      >
        {gradeDistributionTabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              style={{
                ...gradeDistributionTabStyle,
                ...(isActive ? gradeDistributionTabActiveStyle : undefined),
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {displayedGrades.length === 0 ? (
        <EmptyState message="Nie ma jeszcze wycen dla tej powierzchni." />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {displayedGrades.map((grade) => {
            const normalizedCount = maxCount > 0 ? grade.count / maxCount : 0;

            return (
              <article
                key={`${grade.surface}-${grade.grade}`}
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
                  {grade.count > 0 && (
                    <div
                      style={{
                        width: `${Math.max(normalizedCount * 100, 3)}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: getDistributionGradeColor(grade),
                      }}
                    />
                  )}
                </div>
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: "0.85rem",
                    textAlign: "right",
                  }}
                >
                  {grade.count || ""}
                </span>
              </article>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function getDisplayedGrades(
  activeTab: GradeDistributionTab,
  visibleGrades: GradeDistributionWidgetProps["gradeDistribution"],
) {
  if (activeTab === "lina") {
    return visibleGrades;
  }

  const gradeScale =
    activeTab === "baldy"
      ? Array.from({ length: 9 }, (_value, index) => String(9 - index))
      : Array.from({ length: 12 }, (_value, index) => `V${12 - index}`);
  const gradeCounts = new Map(
    visibleGrades.map((grade) => [grade.grade, grade.count]),
  );

  return gradeScale.map((grade) => ({
    grade,
    surface: activeTab,
    count: gradeCounts.get(grade) ?? 0,
  }));
}

const gradeDistributionTabsStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 4,
};

const gradeDistributionTabStyle = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border-strong)",
  padding: "0.3rem 0.55rem",
  background: "rgba(255, 255, 255, 0.5)",
  color: "var(--muted)",
  cursor: "pointer",
  fontSize: "0.8rem",
};

const gradeDistributionTabActiveStyle = {
  borderColor: "#0d6b7c",
  background: "#0d6b7c",
  color: "white",
};

function getDistributionGradeColor({
  grade,
  surface,
}: GradeDistributionWidgetProps["gradeDistribution"][number]) {
  if (surface === "lina") {
    return getRopeGradeColor(grade);
  }

  if (surface === "baldy") {
    return boulderGradeColors[Number(grade) - 1] ?? "#e19a24";
  }

  const boardGrade = Number(/^V(\d+)$/.exec(grade)?.[1]);
  const colors = surface === "moon" ? moonGradeColors : kilterGradeColors;
  return colors[boardGrade] ?? "#e19a24";
}

const moonGradeColors = [
  "#b9c2cc",
  "#b4b5c5",
  "#bea3c8",
  "#c98fca",
  "#d27bcb",
  "#d967ca",
  "#e053c7",
  "#e63fc3",
  "#eb2abd",
  "#ee19b6",
  "#d75ca2",
  "#b76589",
  "#935d76",
  "#735264",
  "#5c4757",
  "#4b404a",
  "#403b42",
  "#343a40",
];

const kilterGradeColors = [
  "#b9c2cc",
  "#c3c8bd",
  "#ccd0ad",
  "#d5d89d",
  "#dde08d",
  "#e5e77d",
  "#ebed6d",
  "#f0ef5d",
  "#f3ec4f",
  "#f5e643",
  "#f6df37",
  "#f7d72c",
  "#f8ce22",
  "#f9c518",
  "#fac00f",
  "#fbc00b",
  "#fbc609",
  "#fccc08",
];

const boulderGradeColors = [
  "#b9c2cc",
  "#7ccb9b",
  "#48b8a0",
  "#3b9edb",
  "#f2c14e",
  "#f39a3d",
  "#e76f51",
  "#c54560",
  "#343a40",
];
