"use client";

import { EmptyState } from "@/components/climberbook/common/charts";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import {
  listCardHeaderStyle,
  listCardStyle,
  moduleEyebrowStyle,
  panelHeadingStyle,
  panelStyle,
  scrollListStyle,
  sectionTitleStyle,
  softPillStyle,
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
  return (
    <section style={panelStyle}>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Wyceny</span>
          <h2 style={sectionTitleStyle}>Rozkład i maksimum</h2>
        </div>
        <span style={softTagStyle}>Najwyższa: {highestGrade}</span>
      </div>
      <ScrollPane viewportStyle={scrollListStyle}>
        {gradeDistribution.length === 0 && (
          <EmptyState message="Nie ma jeszcze wybranych wycen w treningach." />
        )}
        {gradeDistribution.map((grade) => (
          <article key={grade.grade} style={listCardStyle}>
            <div style={listCardHeaderStyle}>
              <strong>{grade.grade}</strong>
              <span style={softPillStyle}>{grade.count} wstawek</span>
            </div>
          </article>
        ))}
      </ScrollPane>
    </section>
  );
}
