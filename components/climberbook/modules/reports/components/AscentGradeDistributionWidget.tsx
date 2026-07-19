"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/climberbook/common/charts";
import { Panel } from "@/components/climberbook/common/Panel";
import { getGradeRank } from "@/components/climberbook/common/training";
import {
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
} from "@/components/climberbook/common/styles";
import type { AscentRecord } from "@/lib/climbs-db";

type AscentGradeDistributionWidgetProps = {
  ascents: AscentRecord[];
};

export function AscentGradeDistributionWidget({
  ascents,
}: AscentGradeDistributionWidgetProps) {
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [isRockVisible, setIsRockVisible] = useState(true);
  const [areProjectsVisible, setAreProjectsVisible] = useState(false);
  const gradeFrequency = useMemo(() => {
    const ascentsByGrade = new Map<string, number>();

    ascents.forEach((ascent) => {
      const style = (ascent.style ?? "").trim().toUpperCase();
      const isProject = style === "GO";
      const isVisibleSource =
        (ascent.source === "panel" && isPanelVisible) ||
        (ascent.source === "skala" && isRockVisible);

      const grade = ascent.suggestedGrade.trim();

      if (!grade) {
        return;
      }

      if (isProject ? !areProjectsVisible : !isVisibleSource) {
        return;
      }

      ascentsByGrade.set(grade, (ascentsByGrade.get(grade) ?? 0) + 1);
    });

    const grades = new Set(ascentsByGrade.keys());

    const distribution = Array.from(grades, (grade) => ({
      grade,
      ascentCount: ascentsByGrade.get(grade) ?? 0,
    })).sort(
      (left, right) => getGradeRank(right.grade) - getGradeRank(left.grade),
    );
    const maxCount = distribution.reduce(
      (highest, item) => Math.max(highest, item.ascentCount),
      0,
    );

    return distribution.map((item) => ({
      ...item,
      totalCount: item.ascentCount,
      normalizedAscentCount: maxCount > 0 ? item.ascentCount / maxCount : 0,
    }));
  }, [areProjectsVisible, ascents, isPanelVisible, isRockVisible]);

  return (
    <Panel>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Wyceny</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h2 style={sectionTitleStyle}>
              Rozkład od najwyższej do najniższej
            </h2>
            <div
              role="group"
              aria-label="Filtr źródła wycen"
              style={{ display: "flex", gap: 10, alignItems: "center" }}
            >
              {[
                {
                  label: "Panel",
                  checked: isPanelVisible,
                  onChange: setIsPanelVisible,
                  color: "#168f91",
                },
                {
                  label: "Skała",
                  checked: isRockVisible,
                  onChange: setIsRockVisible,
                  color: "#e19a24",
                },
                {
                  label: "Projekty",
                  checked: areProjectsVisible,
                  onChange: setAreProjectsVisible,
                  color: "#8d5ca8",
                },
              ].map((filter) => (
                <label
                  key={filter.label}
                  style={{
                    display: "inline-flex",
                    gap: 5,
                    alignItems: "center",
                    color: "var(--muted)",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={filter.checked}
                    onChange={(event) => filter.onChange(event.target.checked)}
                    style={{ accentColor: filter.color }}
                  />
                  {filter.label}
                </label>
              ))}
            </div>
          </div>
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
                    width: `${Math.max(item.normalizedAscentCount * 100, 3)}%`,
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
