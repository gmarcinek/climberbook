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
  contentOnly?: boolean;
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
  contentOnly = false,
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
  const content = (
    <>
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
                    background: "var(--component-grade-distribution-track)",
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
    </>
  );

  if (contentOnly) return content;

  return (
    <Panel>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Wyceny</span>
          <h2 style={sectionTitleStyle}>Wyceny wstawek treningowych</h2>
        </div>
      </div>
      {content}
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
  borderColor: "var(--component-chart-tab-inactive-border)",
  padding: "0.3rem 0.55rem",
  background: "var(--component-chart-tab-inactive-background)",
  color: "var(--component-chart-tab-inactive-text)",
  cursor: "pointer",
  fontSize: "0.8rem",
};

const gradeDistributionTabActiveStyle = {
  borderColor: "var(--component-chart-tab-active-border)",
  background: "var(--component-chart-tab-active-background)",
  color: "var(--component-chart-tab-active-text)",
};

function getDistributionGradeColor({
  grade,
  surface,
}: GradeDistributionWidgetProps["gradeDistribution"][number]) {
  if (surface === "lina") {
    return getRopeGradeColor(grade);
  }

  if (surface === "baldy") {
    return (
      boulderGradeColors[Number(grade) - 1] ??
      "var(--component-grade-distribution-fallback)"
    );
  }

  const boardGrade = Number(/^V(\d+)$/.exec(grade)?.[1]);
  const colors = surface === "moon" ? moonGradeColors : kilterGradeColors;
  return colors[boardGrade] ?? "var(--component-grade-distribution-fallback)";
}

const moonGradeColors = [
  "var(--grade-moon-v0)",
  "var(--grade-moon-v1)",
  "var(--grade-moon-v2)",
  "var(--grade-moon-v3)",
  "var(--grade-moon-v4)",
  "var(--grade-moon-v5)",
  "var(--grade-moon-v6)",
  "var(--grade-moon-v7)",
  "var(--grade-moon-v8)",
  "var(--grade-moon-v9)",
  "var(--grade-moon-v10)",
  "var(--grade-moon-v11)",
  "var(--grade-moon-v12)",
  "var(--grade-moon-v13)",
  "var(--grade-moon-v14)",
  "var(--grade-moon-v15)",
  "var(--grade-moon-v16)",
  "var(--grade-moon-v17)",
];

const kilterGradeColors = [
  "var(--grade-kilter-v0)",
  "var(--grade-kilter-v1)",
  "var(--grade-kilter-v2)",
  "var(--grade-kilter-v3)",
  "var(--grade-kilter-v4)",
  "var(--grade-kilter-v5)",
  "var(--grade-kilter-v6)",
  "var(--grade-kilter-v7)",
  "var(--grade-kilter-v8)",
  "var(--grade-kilter-v9)",
  "var(--grade-kilter-v10)",
  "var(--grade-kilter-v11)",
  "var(--grade-kilter-v12)",
  "var(--grade-kilter-v13)",
  "var(--grade-kilter-v14)",
  "var(--grade-kilter-v15)",
  "var(--grade-kilter-v16)",
  "var(--grade-kilter-v17)",
];

const boulderGradeColors = [
  "var(--grade-boulder-v1)",
  "var(--grade-boulder-v2)",
  "var(--grade-boulder-v3)",
  "var(--grade-boulder-v4)",
  "var(--grade-boulder-v5)",
  "var(--grade-boulder-v6)",
  "var(--grade-boulder-v7)",
  "var(--grade-boulder-v8)",
  "var(--grade-boulder-v9)",
];
