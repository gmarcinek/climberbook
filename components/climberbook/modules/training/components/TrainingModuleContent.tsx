"use client";

import type { FormEvent } from "react";
import type { WeightEntryDraft } from "@/components/climberbook/common/training";
import { trainingModuleStyle } from "@/components/climberbook/common/styles";
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
  onWeightEntrySubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  recentWeightEntries: WeightEntryRecord[];
  currentCalendarMonthLabel: string;
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
  recentWeightEntries,
  currentCalendarMonthLabel,
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
      onResetSelection={onResetSelection}
      onCancelEdit={onCancelEdit}
    />
  );

  return (
    <>
      <div
        style={{
          ...trainingModuleStyle,
          gridTemplateColumns: isMobileTrainingLayout
            ? "minmax(0, 1fr)"
            : showTrainingSidebarColumn
              ? "515px minmax(0, 3fr) minmax(0, 3fr)"
              : "515px minmax(0, 3fr)",
          gridTemplateRows: isMobileTrainingLayout ? "none" : "minmax(0, 1fr)",
          height: isMobileTrainingLayout ? "auto" : "100%",
          alignItems: isMobileTrainingLayout ? "start" : "stretch",
        }}
      >
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
          recentWeightEntries={recentWeightEntries}
        />

        <TrainingCalendarWidget
          isMobileLayout={isMobileTrainingLayout}
          currentCalendarMonthLabel={currentCalendarMonthLabel}
          onPreviousMonth={onPreviousMonth}
          onNextMonth={onNextMonth}
          trainingRangeStart={trainingRangeStart}
          trainingsByDate={trainingsByDate}
          selectedDate={selectedDate}
          today={today}
          onSelectDate={onSelectDate}
        />

        {showTrainingSidebarColumn && (
          <div style={{ gridColumn: 3, gridRow: 1, minHeight: 0 }}>
            {sidebar}
          </div>
        )}
      </div>

      {!showTrainingSidebarColumn && selectedDate && (
        <TrainingSidebarDrawer onClose={onResetSelection}>
          {sidebar}
        </TrainingSidebarDrawer>
      )}
    </>
  );
}
