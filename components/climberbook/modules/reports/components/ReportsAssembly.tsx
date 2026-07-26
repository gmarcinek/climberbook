"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/climberbook/common/Panel";
import { Button } from "@/components/climberbook/common/Button";
import { Modal } from "@/components/climberbook/common/Modal";
import { WeeklyAscentChartWidget } from "@/components/climberbook/common/WeeklyAscentChartWidget";
import { AscentGradeDistributionWidget } from "./AscentGradeDistributionWidget";
import { AscentFormWidget } from "./AscentFormWidget";
import { ReportedAscentsListWidget } from "./ReportedAscentsListWidget";
import { ReportHeaderWidget } from "./ReportHeaderWidget";
import { ReportMetricsWidget } from "./ReportMetricsWidget";
import { Stack } from "@/components/climberbook/common/Stack";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import type { AscentRecord } from "@/lib/climbs-db";
import type { AscentCsvImportPreview } from "@/components/climberbook/providers/ClimberbookProvider";
import {
  moduleContentStyle,
  twoColumnLayoutStyle,
} from "@/components/climberbook/common/styles";

type AscentDraftValues = {
  date: string;
  source: "panel" | "skala";
  routeName: string;
  suggestedGrade: string;
  subjectiveGrade: string;
  style: string;
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
    ascentStyle?: string;
    notes: string;
    suggestedGrade: string;
    subjectiveGrade: string;
    hasSubjectiveGrade: boolean;
    suggestedGradeIndex: number;
    subjectiveGradeIndex: number;
    suggestedColor: string;
    subjectiveColor: string;
    attemptCount: number;
  }>;
  ascentDraft: AscentDraftValues;
  editingAscentId: number | null;
  ascentCsvImportPreview: AscentCsvImportPreview | null;
  isImportingAscentsCsv: boolean;
  imported8aNuAscentsCount: number;
  onAscentDraftChange: (draft: AscentDraftValues) => void;
  onAscentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAscentsCsvImport: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onConfirmAscentsCsvImport: (
    includeOtherStyles: boolean,
    overwriteDuplicates: boolean,
  ) => Promise<void>;
  onCloseAscentsCsvImportPreview: () => void;
  onDelete8aNuAscents: () => Promise<void>;
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
  ascentDraft,
  editingAscentId,
  ascentCsvImportPreview,
  isImportingAscentsCsv,
  imported8aNuAscentsCount,
  onAscentDraftChange,
  onAscentSubmit,
  onAscentsCsvImport,
  onConfirmAscentsCsvImport,
  onCloseAscentsCsvImportPreview,
  onDelete8aNuAscents,
  onAscentEdit,
  onCancelAscentEdit,
  frenchGradeOptions,
}: ReportsAssemblyProps) {
  const router = useRouter();
  const { width } = useViewport();
  const isTabletOrMobile = width > 0 && width < 1024;
  const isMobile = width > 0 && width < 600;
  const [isAscentDrawerOpen, setIsAscentDrawerOpen] = useState(false);
  const [isNewAscentModalOpen, setIsNewAscentModalOpen] = useState(false);
  const chronologicalAscents = ascents.slice().sort((left, right) => {
    const byDate = right.date.localeCompare(left.date);

    if (byDate !== 0) {
      return byDate;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
  async function handleAscentSubmit(event: FormEvent<HTMLFormElement>) {
    await onAscentSubmit(event);
    if (isMobile) setIsAscentDrawerOpen(false);
    else setIsNewAscentModalOpen(false);
  }

  function handleCancelAscentEdit() {
    onCancelAscentEdit();
    if (isMobile) setIsAscentDrawerOpen(false);
    else setIsNewAscentModalOpen(false);
  }

  function handleNewAscent() {
    onCancelAscentEdit();
    if (isMobile) setIsAscentDrawerOpen(true);
    else setIsNewAscentModalOpen(true);
  }

  function handleAscentEdit(ascent: AscentRecord) {
    if (isMobile) {
      router.push(`/raporty/edytuj/${ascent.id}`);
      return;
    }

    onAscentEdit(ascent);
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
    <AscentGradeDistributionWidget key="grades" ascents={ascents} />,
  ];
  const newAscentButton = (
    <Button onClick={handleNewAscent}>
      + Nowe przejście
    </Button>
  );

  return (
    <Stack gap="md" style={moduleContentStyle}>
      <ReportHeaderWidget
        meta={moduleMeta}
        ascentsCount={ascentsCount}
        panelAscents={panelAscents}
        rockAscents={rockAscents}
        desktopAction={newAscentButton}
      />
      {isMobile ? null : (
        <ReportMetricsWidget
          ascentsCount={ascentsCount}
          panelAscents={panelAscents}
          rockAscents={rockAscents}
          onCsvImport={onAscentsCsvImport}
          importPreview={ascentCsvImportPreview}
          isImporting={isImportingAscentsCsv}
          imported8aNuAscentsCount={imported8aNuAscentsCount}
          onConfirmImport={onConfirmAscentsCsvImport}
          onCloseImportPreview={onCloseAscentsCsvImportPreview}
          onDelete8aNuAscents={onDelete8aNuAscents}
        />
      )}
      {isMobile ? null : (
        <WeeklyAscentChartWidget
          chartRangeLabel={ascentChartRangeLabel}
          ascentTimelineStats={ascentTimelineStats}
        />
      )}
      <div
        style={{
          ...twoColumnLayoutStyle,
          gridTemplateColumns: isTabletOrMobile
            ? "minmax(0, 1fr)"
            : twoColumnLayoutStyle.gridTemplateColumns,
        }}
      >
        {lowerWidgets}
      </div>
      <ReportedAscentsListWidget
        ascents={chronologicalAscents}
        editingAscentId={editingAscentId}
        onEdit={handleAscentEdit}
      />
      {!isMobile && (editingAscentId !== null || isNewAscentModalOpen) ? (
        <Modal
          labelledBy="ascent-form-title"
          onClose={handleCancelAscentEdit}
          style={{ width: "min(100%, 620px)", maxHeight: "90vh", overflowY: "auto" }}
        >
          {ascentFormWidget}
        </Modal>
      ) : null}
      {isMobile && isAscentDrawerOpen ? (
        <Modal
          labelledBy="ascent-form-title"
          onClose={handleCancelAscentEdit}
          style={{ gap: 8, padding: 8 }}
        >
          {ascentFormWidget}
        </Modal>
      ) : null}
    </Stack>
  );
}
