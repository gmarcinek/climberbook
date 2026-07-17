"use client";

import { surfaceOptions } from "@/components/climberbook/common/constants";
import { useTrainingModule } from "@/components/climberbook/providers/ClimberbookProvider";
import { useClimberbookStats } from "@/components/climberbook/hooks/useClimberbookStats";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { TrainingModuleContent } from "./components/TrainingModuleContent";

export function TrainingModule() {
  const app = useTrainingModule();
  const viewport = useViewport();
  const stats = useClimberbookStats({
    ascents: app.ascents,
    isMobileChartLayout: viewport.isMobileChartLayout,
    profileDraft: app.profileDraft,
    selectedDate: app.selectedDate,
    today: app.today,
    trainingRangeStart: app.trainingRangeStart,
    trainings: app.trainings,
    weightEntries: app.weightEntries,
  });

  return (
    <TrainingModuleContent
      isMobileTrainingLayout={viewport.isMobileTrainingLayout}
      isMediumTrainingDrawerLayout={
        viewport.width >= 931 && viewport.width < 1640
      }
      showTrainingSidebarColumn={viewport.showTrainingSidebarColumn}
      latestWeightKg={
        stats.latestRecordedWeight?.weightKg ?? stats.defaultTrainingWeightKg
      }
      latestWeightDate={stats.latestRecordedWeight?.date ?? null}
      latestWeightChange={stats.latestWeightChange}
      averageWeight={stats.averageWeight}
      totalTrainingTime={stats.totalTrainingTime}
      totalCalories={stats.totalCalories}
      weightChartEntries={stats.weightChartEntries}
      trainings={app.trainings}
      chartRange={stats.chartRange}
      chartRangeLabel={stats.chartRangeLabel}
      weightEntryDraft={app.weightEntryDraft}
      onWeightEntryDraftChange={app.setWeightEntryDraft}
      onWeightEntrySubmit={app.submitWeightEntry}
      recentWeightEntries={stats.recentWeightEntries}
      currentCalendarMonthLabel={stats.currentCalendarMonthLabel}
      onPreviousMonth={app.previousTrainingMonth}
      onNextMonth={app.nextTrainingMonth}
      trainingRangeStart={app.trainingRangeStart}
      trainingsByDate={stats.trainingsByDate}
      selectedDate={app.selectedDate}
      today={app.today}
      onSelectDate={app.selectTrainingDate}
      selectedDayTrainings={stats.selectedDayTrainings}
      visibleRangeTrainings={stats.visibleRangeTrainings}
      trainingDraft={app.trainingDraft}
      validationMessage={app.status}
      editingTrainingId={app.editingTrainingId}
      surfaceOptions={surfaceOptions}
      onTrainingDraftChange={app.setTrainingDraft}
      onToggleSurface={app.toggleSurface}
      onTrainingSubmit={app.submitTraining}
      onEditTraining={app.editTraining}
      onDeleteTraining={app.deleteTraining}
      onResetSelection={app.resetTrainingSelection}
      onCancelEdit={app.resetTrainingSelection}
    />
  );
}
