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
import {
  TrainingCalendarWidget,
  VisibleTrainingList,
} from "./TrainingCalendarWidget";
import {
  TrainingPreviewModalWidget,
  TrainingSidebarDrawer,
  TrainingSidebarWidget,
} from "./TrainingSidebarWidget";

const mobileTrainingTabs = [
  ["trainings", "Treningi"],
  ["metrics", "Metryki"],
  ["weight", "Waga"],
] as const;

const mobileTrainingTabNavStyle = {
  display: "flex",
  gap: 4,
  borderBottom: "1px solid var(--border-strong)",
  order: -2,
  width: "100%",
  marginTop: "1rem",
};

const mobileTrainingTabStyle = {
  border: 0,
  background: "transparent",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: "0.9rem",
};

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
  editingTrainingId: string | null;
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
  const [mobileTab, setMobileTab] = useState<
    "metrics" | "trainings" | "weight"
  >("trainings");
  const showMediumInlineDrawer =
    isMediumTrainingDrawerLayout && selectedDate !== null;
  const usesOverlaySidebar = !showTrainingSidebarColumn && !showMediumInlineDrawer;
  const openTrainingPreview = (training: TrainingRecord) => {
    setRequestedPreviewTraining(training);

    if (usesOverlaySidebar) {
      onResetSelection();
    }
  };
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
      onPreviewTraining={openTrainingPreview}
      onEditTraining={onEditTraining}
      onDeleteTraining={onDeleteTraining}
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
        {isMobileTrainingLayout ? (
          <div
            role="tablist"
            aria-label="Widok treningów"
            style={mobileTrainingTabNavStyle}
          >
            {mobileTrainingTabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mobileTab === key}
                style={{
                  ...mobileTrainingTabStyle,
                  color:
                    mobileTab === key ? "var(--text)" : "var(--muted)",
                  fontWeight: mobileTab === key ? 700 : 500,
                  borderBottom:
                    mobileTab === key
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                }}
                onClick={() =>
                  setMobileTab(key)
                }
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
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
        ) : !isMobileTrainingLayout || mobileTab === "metrics" ? (
          <TrainingAnalyticsWidget
            isMobileLayout={isMobileTrainingLayout}
            section={isMobileTrainingLayout ? "metrics" : "all"}
            mobileOrder={1}
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
        ) : null}

        {!isMobileTrainingLayout || mobileTab === "trainings" ? (
          <TrainingCalendarWidget
            isMobileLayout={isMobileTrainingLayout}
            showVisibleTrainingList={
              !showTrainingSidebarColumn && !isMobileTrainingLayout
            }
            onPreviousMonth={onPreviousMonth}
            onNextMonth={onNextMonth}
            trainingRangeStart={trainingRangeStart}
            trainingsByDate={trainingsByDate}
            visibleRangeTrainings={visibleRangeTrainings}
            selectedDate={selectedDate}
            today={today}
            onSelectDate={onSelectDate}
            onEditTraining={onEditTraining}
            onPreviewTraining={openTrainingPreview}
          />
        ) : null}

        {isMobileTrainingLayout && mobileTab === "trainings" ? (
          <div style={{ order: 2 }}>
            <VisibleTrainingList
              trainings={visibleRangeTrainings}
              standalone
              onAddTraining={() => onSelectDate(today)}
              onEditTraining={onEditTraining}
              onPreviewTraining={openTrainingPreview}
            />
          </div>
        ) : null}

        {isMobileTrainingLayout && mobileTab === "weight" ? (
          <TrainingAnalyticsWidget
            isMobileLayout
            section="weight"
            mobileOrder={3}
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
        ) : null}

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

      {requestedPreviewTraining && (
        <TrainingPreviewModalWidget
          training={requestedPreviewTraining}
          surfaceOptions={surfaceOptions}
          onClose={() => setRequestedPreviewTraining(null)}
          onEditTraining={(training) => {
            setRequestedPreviewTraining(null);
            onEditTraining(training);
          }}
        />
      )}
    </>
  );
}
