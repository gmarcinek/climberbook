"use client";

import { EmptyState } from "@/components/climberbook/common/charts";
import { Panel } from "@/components/climberbook/common/Panel";
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
} from "@/components/climberbook/common/styles";

type AscentGradeDistributionWidgetProps = {
  gradeFrequency: Array<{
    grade: string;
    suggestedCount: number;
    subjectiveCount: number;
    totalCount: number;
    normalizedCount: number;
  }>;
};

export function AscentGradeDistributionWidget({
  gradeFrequency,
}: AscentGradeDistributionWidgetProps) {
  return (
    <Panel>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Wyceny</span>
          <h2 style={sectionTitleStyle}>Rozkład od najwyższej do najniższej</h2>
        </div>
      </div>
      {gradeFrequency.length === 0 ? (
        <EmptyState message="Dodaj wpisy raportowe, aby zobaczyć rozkład wycen." />
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {gradeFrequency.map((item) => (
            <article
              key={item.grade}
              style={{
                display: "grid",
                gridTemplateColumns: "64px 32px minmax(0, 1fr)",
                gap: 8,
                alignItems: "center",
              }}
            >
              <strong>{item.grade}</strong>
              <span
                style={{
                  color: "var(--muted)",
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                }}
              >
                {item.totalCount}
              </span>
              <div
                style={{
                  position: "relative",
                  height: 8,
                  overflow: "hidden",
                  borderRadius: 999,
                  background: "rgba(28, 61, 89, 0.08)",
                }}
              >
                <div
                  style={{
                    width: `${Math.max(item.normalizedCount * 100, 3)}%`,
                    height: "100%",
                    borderRadius: 999,
                    background:
                      "linear-gradient(90deg, #168f91 0%, #4abce7 52%, #e19a24 100%)",
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </Panel>
  );
}
