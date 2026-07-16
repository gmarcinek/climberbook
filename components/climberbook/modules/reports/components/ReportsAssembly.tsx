"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Panel } from "@/components/climberbook/common/Panel";
import { WeeklyAscentChartWidget } from "@/components/climberbook/common/WeeklyAscentChartWidget";
import { AscentGradeDistributionWidget } from "./AscentGradeDistributionWidget";
import { AscentFormWidget } from "./AscentFormWidget";
import { ReportedAscentsListWidget } from "./ReportedAscentsListWidget";
import { ReportHeaderWidget } from "./ReportHeaderWidget";
import { ReportMetricsWidget } from "./ReportMetricsWidget";
import { Stack } from "@/components/climberbook/common/Stack";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import type { AscentRecord } from "@/lib/climbs-db";
import {
  buttonStyle,
  mobileDrawerBackdropStyle,
  mobileDrawerOverlayStyle,
  mobileDrawerSheetStyle,
  moduleContentStyle,
  twoColumnLayoutStyle,
} from "@/components/climberbook/common/styles";

type AscentDraftValues = {
  date: string;
  source: "panel" | "skala";
  routeName: string;
  suggestedGrade: string;
  subjectiveGrade: string;
  notes: string;
};
type ReportsAssemblyProps = {
  moduleMeta: { eyebrow: string; title: string; description: string };
  ascents: AscentRecord[];
  ascentsCount: number;
  panelAscents: number;
  rockAscents: number;
  ascentChartRangeLabel: string;
  ascentTimelineStats: Array<{
    id: number | string;
    date: string;
    routeName: string;
    source: "panel" | "skala";
    notes: string;
    suggestedGrade: string;
    subjectiveGrade: string;
    suggestedGradeIndex: number;
    subjectiveGradeIndex: number;
    suggestedColor: string;
    subjectiveColor: string;
    attemptCount: number;
  }>;
  ascentGradeFrequency: Array<{
    grade: string;
    suggestedCount: number;
    subjectiveCount: number;
    totalCount: number;
    normalizedCount: number;
  }>;
  ascentDraft: AscentDraftValues;
  editingAscentId: number | null;
  onAscentDraftChange: (draft: AscentDraftValues) => void;
  onAscentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAscentEdit: (ascent: AscentRecord) => void;
  onCancelAscentEdit: () => void;
  frenchGradeOptions: string[];
};

export function ReportsAssembly({
  moduleMeta,
  ascents,
  ascentsCount,
  panelAscents,
  rockAscents,
  ascentChartRangeLabel,
  ascentTimelineStats,
  ascentGradeFrequency,
  ascentDraft,
  editingAscentId,
  onAscentDraftChange,
  onAscentSubmit,
  onAscentEdit,
  onCancelAscentEdit,
  frenchGradeOptions,
}: ReportsAssemblyProps) {
  const { width } = useViewport();
  const isTabletOrMobile = width > 0 && width < 1024;
  const isMobile = width > 0 && width < 600;
  const [isAscentDrawerOpen, setIsAscentDrawerOpen] = useState(false);
  const chronologicalAscents = ascents.slice().sort((left, right) => {
    const byDate = right.date.localeCompare(left.date);

    if (byDate !== 0) {
      return byDate;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
  useEffect(() => {
    if (isMobile && editingAscentId !== null) {
      setIsAscentDrawerOpen(true);
    }
  }, [editingAscentId, isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setIsAscentDrawerOpen(false);
    }
  }, [isMobile]);

  async function handleAscentSubmit(event: FormEvent<HTMLFormElement>) {
    await onAscentSubmit(event);

    if (isMobile) {
      setIsAscentDrawerOpen(false);
    }
  }

  function handleCancelAscentEdit() {
    onCancelAscentEdit();

    if (isMobile) {
      setIsAscentDrawerOpen(false);
    }
  }

  const ascentFormWidget = (
    <AscentFormWidget
      key="form"
      ascentDraft={ascentDraft}
      editingAscentId={editingAscentId}
      onAscentDraftChange={onAscentDraftChange}
      onAscentSubmit={handleAscentSubmit}
      onCancelEdit={handleCancelAscentEdit}
      frenchGradeOptions={frenchGradeOptions}
    />
  );
  const lowerWidgets = [
    <AscentGradeDistributionWidget
      key="grades"
      gradeFrequency={ascentGradeFrequency}
    />,
    ascentFormWidget,
  ];
  const orderedLowerWidgets = isMobile ? [lowerWidgets[0]] : lowerWidgets;
  const mobileAddButton = isMobile ? (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginTop: 4,
      }}
    >
      <button
        type="button"
        onClick={() => setIsAscentDrawerOpen(true)}
        style={{
          ...buttonStyle,
          background: "linear-gradient(135deg, #2f8f4e, #45b36b)",
          boxShadow: "0 18px 30px rgba(49, 143, 78, 0.28)",
        }}
      >
        + Dodaj przejście
      </button>
    </div>
  ) : null;

  return (
    <Stack gap="md" style={moduleContentStyle}>
      <ReportHeaderWidget
        meta={moduleMeta}
        ascentsCount={ascentsCount}
        panelAscents={panelAscents}
        rockAscents={rockAscents}
        mobileAction={mobileAddButton}
      />
      {isMobile ? null : (
        <ReportMetricsWidget
          ascentsCount={ascentsCount}
          panelAscents={panelAscents}
          rockAscents={rockAscents}
        />
      )}
      <WeeklyAscentChartWidget
        chartRangeLabel={ascentChartRangeLabel}
        ascentTimelineStats={ascentTimelineStats}
      />
      <div
        style={{
          ...twoColumnLayoutStyle,
          gridTemplateColumns: isTabletOrMobile
            ? "minmax(0, 1fr)"
            : twoColumnLayoutStyle.gridTemplateColumns,
        }}
      >
        {orderedLowerWidgets}
      </div>
      <ReportedAscentsListWidget
        ascents={chronologicalAscents}
        editingAscentId={editingAscentId}
        onEdit={onAscentEdit}
      />
      {isMobile && isAscentDrawerOpen ? (
        <div style={mobileDrawerOverlayStyle}>
          <button
            type="button"
            aria-label="Zamknij formularz przejścia"
            onClick={() => setIsAscentDrawerOpen(false)}
            style={mobileDrawerBackdropStyle}
          />
          <div
            style={{
              ...mobileDrawerSheetStyle,
              padding: 12,
            }}
          >
            {ascentFormWidget}
          </div>
        </div>
      ) : null}
    </Stack>
  );
}
