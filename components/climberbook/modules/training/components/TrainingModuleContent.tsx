"use client";

import { useState, type FormEvent } from "react";
import type { WeightEntryDraft } from "@/components/climberbook/common/training";
import {
  mobileDrawerSheetStyle,
  trainingModuleStyle,
} from "@/components/climberbook/common/styles";
import type { TrainingDraftValues } from "@/components/training-calendar/TrainingSidebar";
import type {
  TrainingRecord,
  TrainingSurface,
  WeightEntryRecord,
} from "@/lib/climbs-db";
import { TrainingAnalyticsWidget } from "./TrainingAnalyticsWidget";
import { TrainingCalendarWidget } from "./TrainingCalendarWidget";
import {
  TrainingSidebarDrawer,
  TrainingSidebarWidget,
} from "./TrainingSidebarWidget";

type TrainingModuleContentProps = {
  isMobileTrainingLayout: boolean;
  isMediumTrainingDrawerLayout: boolean;
  showTrainingSidebarColumn: boolean;
  latestWeightKg: number | null | undefined;
  latestWeightDate: string | null;
  latestWeightChange: number | null;
  averageWeight: string;
  totalTrainingTime: number;
  totalCalories: number;
  weightChartEntries: WeightEntryRecord[];
  trainings: TrainingRecord[];
  chartRange: { start: string; end: string };
  chartRangeLabel: string;
  weightEntryDraft: WeightEntryDraft;
  onWeightEntryDraftChange: (draft: WeightEntryDraft) => void;
  onWeightEntrySubmit: (
    event: FormEvent<HTMLFormElement>,
    entryToUpdate?: WeightEntryRecord | null,
  ) => Promise<boolean>;
  onDeleteWeightEntry: (entry: WeightEntryRecord) => Promise<void>;
  recentWeightEntries: WeightEntryRecord[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  trainingRangeStart: string;
  trainingsByDate: Map<string, TrainingRecord[]>;
  selectedDate: string | null;
  today: string;
  onSelectDate: (date: string) => void;
  selectedDayTrainings: TrainingRecord[];
  visibleRangeTrainings: TrainingRecord[];
  trainingDraft: TrainingDraftValues;
  validationMessage?: string;
  editingTrainingId: number | null;
  surfaceOptions: Array<{ value: TrainingSurface; label: string }>;
  onTrainingDraftChange: (draft: TrainingDraftValues) => void;
  onToggleSurface: (surface: TrainingSurface) => void;
  onTrainingSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditTraining: (training: TrainingRecord) => void;
  onDeleteTraining: (training: TrainingRecord) => void;
  onResetSelection: () => void;
  onCancelEdit: () => void;
};

export function TrainingModuleContent({
  isMobileTrainingLayout,
  isMediumTrainingDrawerLayout,
  showTrainingSidebarColumn,
  latestWeightKg,
  latestWeightDate,
  latestWeightChange,
  averageWeight,
  totalTrainingTime,
  totalCalories,
  weightChartEntries,
  trainings,
  chartRange,
  chartRangeLabel,
  weightEntryDraft,
  onWeightEntryDraftChange,
  onWeightEntrySubmit,
  onDeleteWeightEntry,
  recentWeightEntries,
  onPreviousMonth,
  onNextMonth,
  trainingRangeStart,
  trainingsByDate,
  selectedDate,
  today,
  onSelectDate,
  selectedDayTrainings,
  visibleRangeTrainings,
  trainingDraft,
  validationMessage,
  editingTrainingId,
  surfaceOptions,
  onTrainingDraftChange,
  onToggleSurface,
  onTrainingSubmit,
  onEditTraining,
  onDeleteTraining,
  onResetSelection,
  onCancelEdit,
}: TrainingModuleContentProps) {
  const [requestedPreviewTraining, setRequestedPreviewTraining] =
    useState<TrainingRecord | null>(null);
  const showMediumInlineDrawer =
    isMediumTrainingDrawerLayout && selectedDate !== null;
  const sidebar = (
    <TrainingSidebarWidget
      selectedDate={selectedDate}
      selectedDayTrainings={selectedDayTrainings}
      visibleRangeTrainings={visibleRangeTrainings}
      today={today}
      trainingDraft={trainingDraft}
      validationMessage={validationMessage}
      editingTrainingId={editingTrainingId}
      surfaceOptions={surfaceOptions}
      onTrainingDraftChange={onTrainingDraftChange}
      onToggleSurface={onToggleSurface}
      onSubmit={onTrainingSubmit}
      onSelectDate={onSelectDate}
      onEditTraining={onEditTraining}
      onDeleteTraining={onDeleteTraining}
      requestedPreviewTraining={requestedPreviewTraining}
      onRequestedPreviewClose={() => setRequestedPreviewTraining(null)}
      onResetSelection={onResetSelection}
      onCancelEdit={onCancelEdit}
    />
  );
  const drawerSheetStyle = {
    justifySelf: "end" as const,
    width: "min(66.666vw, 980px)",
    maxWidth: "100%",
    borderTop: 0,
    borderLeft: "1px solid var(--border-strong)",
    boxShadow: "-20px 0 40px rgba(35, 29, 25, 0.16)",
  };

  return (
    <>
      <div
        style={{
          ...trainingModuleStyle,
          gridTemplateColumns: isMobileTrainingLayout
            ? "minmax(0, 1fr)"
            : showTrainingSidebarColumn
              ? "515px minmax(0, 3fr) minmax(0, 3fr)"
              : "2fr 3fr",
          gridTemplateRows: isMobileTrainingLayout ? "none" : "minmax(0, 1fr)",
          height: isMobileTrainingLayout ? "auto" : "100%",
          alignItems: isMobileTrainingLayout ? "start" : "stretch",
        }}
      >
        {showMediumInlineDrawer ? (
          <div
            style={{
              ...mobileDrawerSheetStyle,
              height: "100%",
              borderTop: 0,
              borderLeft: 0,
              padding: 8,
              boxShadow: "0 20px 40px rgba(35, 29, 25, 0.12)",
            }}
          >
            {sidebar}
          </div>
        ) : (
          <TrainingAnalyticsWidget
            isMobileLayout={isMobileTrainingLayout}
            latestWeightKg={latestWeightKg}
            latestWeightDate={latestWeightDate}
            latestWeightChange={latestWeightChange}
            averageWeight={averageWeight}
            totalTrainingTime={totalTrainingTime}
            totalCalories={totalCalories}
            weightChartEntries={weightChartEntries}
            trainings={trainings}
            chartRange={chartRange}
            chartRangeLabel={chartRangeLabel}
            weightEntryDraft={weightEntryDraft}
            onWeightEntryDraftChange={onWeightEntryDraftChange}
            onWeightEntrySubmit={onWeightEntrySubmit}
            onDeleteWeightEntry={onDeleteWeightEntry}
            recentWeightEntries={recentWeightEntries}
          />
        )}

        <TrainingCalendarWidget
          isMobileLayout={isMobileTrainingLayout}
          showVisibleTrainingList={!showTrainingSidebarColumn}
          onPreviousMonth={onPreviousMonth}
          onNextMonth={onNextMonth}
          trainingRangeStart={trainingRangeStart}
          trainingsByDate={trainingsByDate}
          visibleRangeTrainings={visibleRangeTrainings}
          selectedDate={selectedDate}
          today={today}
          onSelectDate={onSelectDate}
          onEditTraining={onEditTraining}
          onPreviewTraining={(training) => {
            setRequestedPreviewTraining(training);
            onSelectDate(training.date);
          }}
        />

        {showTrainingSidebarColumn && (
          <div style={{ gridColumn: 3, gridRow: 1, minHeight: 0 }}>
            {sidebar}
          </div>
        )}
      </div>

      {!showTrainingSidebarColumn &&
        !showMediumInlineDrawer &&
        selectedDate && (
          <TrainingSidebarDrawer
            onClose={onResetSelection}
            sheetStyle={
              isMediumTrainingDrawerLayout ? drawerSheetStyle : undefined
            }
          >
            {sidebar}
          </TrainingSidebarDrawer>
        )}
    </>
  );
}
