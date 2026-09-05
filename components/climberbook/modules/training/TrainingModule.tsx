"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { surfaceOptions } from "@/components/climberbook/common/constants";
import { useTrainingModule } from "@/components/climberbook/providers/ClimberbookProvider";
import { useClimberbookStats } from "@/components/climberbook/hooks/useClimberbookStats";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import {
  addDays,
  addMonths,
  getTrainingsInRange,
  getMonthStart,
  getVisibleRange,
} from "@/components/training-calendar/training-calendar.helpers";
import { TrainingModuleContent } from "./components/TrainingModuleContent";

export function TrainingModule() {
  const app = useTrainingModule();
  const viewport = useViewport();
  const router = useRouter();
  const visibleTrainingMonthCount = viewport.width >= 1725 ? 2 : 1;
  const usesDedicatedTrainingEditor =
    viewport.width > 0 && viewport.width < 1024;
  const visibleTrainingRangeStart =
    visibleTrainingMonthCount > 1
      ? addMonths(app.trainingRangeStart, -(visibleTrainingMonthCount - 1))
      : app.trainingRangeStart;
  const visibleTrainingRange = getVisibleRange(
    visibleTrainingRangeStart,
    visibleTrainingMonthCount,
  );
  const isCurrentCalendar = app.trainingRangeStart === getMonthStart(app.today);
  const requestedTrainingDataRange = isCurrentCalendar
    ? {
        start: getMonthStart(
          addDays(app.today, -(visibleTrainingMonthCount * 28 - 1)),
        ),
        end: app.today,
      }
    : {
        start: getMonthStart(addMonths(visibleTrainingRangeStart, -1)),
        end: visibleTrainingRange.end,
      };

  useEffect(() => {
    if (viewport.width === 0) return;

    app.setTrainingDataRange((current) =>
      current.start === requestedTrainingDataRange.start &&
      current.end === requestedTrainingDataRange.end
        ? current
        : requestedTrainingDataRange,
    );
  }, [
    app.setTrainingDataRange,
    requestedTrainingDataRange.end,
    requestedTrainingDataRange.start,
    viewport.width,
  ]);

  const visibleTrainings = getTrainingsInRange(
    app.trainings,
    visibleTrainingRange.start,
    visibleTrainingRange.end,
  );
  const stats = useClimberbookStats({
    ascents: app.ascents,
    isMobileChartLayout: viewport.isMobileChartLayout,
    profileDraft: app.profileDraft,
    selectedDate: app.selectedDate,
    today: app.today,
    trainingRangeStart: app.trainingRangeStart,
    visibleTrainingMonthCount,
    chartRangeOverride: visibleTrainingRange,
    trainings: app.trainings,
    weightEntries: app.weightEntries,
  });
  const currentAge = stats.currentAge ? Number(stats.currentAge) : null;

  return (
    <TrainingModuleContent
      isMobileTrainingLayout={viewport.isMobileTrainingLayout}
      isMediumTrainingDrawerLayout={viewport.width >= 931}
      isWideTrainingCalendarLayout={viewport.width >= 1725}
      showTrainingSidebarColumn={false}
      latestWeightKg={
        stats.latestRecordedWeight?.weightKg ?? stats.defaultTrainingWeightKg
      }
      latestWeightDate={stats.latestRecordedWeight?.date ?? null}
      latestWeightChange={stats.latestWeightChange}
      averageWeight={stats.averageWeight}
      totalTrainingTime={stats.totalTrainingTime}
      totalCalories={stats.totalCalories}
      athleteId={app.activeAthleteId}
      goals={app.goals}
      ascents={app.ascents}
      onCreateGoal={app.createGoal}
      onUpdateGoal={app.updateGoal}
      onDeleteGoal={app.deleteGoal}
      weightChartEntries={stats.weightChartEntries}
      trainings={visibleTrainings}
      chartRange={stats.chartRange}
      chartRangeLabel={stats.chartRangeLabel}
      weightEntryDraft={app.weightEntryDraft}
      onWeightEntryDraftChange={app.setWeightEntryDraft}
      onWeightEntrySubmit={app.submitWeightEntry}
      onDeleteWeightEntry={app.deleteWeightEntry}
      recentWeightEntries={stats.recentWeightEntries}
      currentAge={currentAge}
      onPreviousMonth={app.previousTrainingMonth}
      onNextMonth={app.nextTrainingMonth}
      trainingRangeStart={app.trainingRangeStart}
      trainingsByDate={stats.trainingsByDate}
      selectedDate={app.selectedDate}
      today={app.today}
      onSelectDate={(date) => {
        if (usesDedicatedTrainingEditor) {
          router.push(`/trening/dodaj?data=${encodeURIComponent(date)}`);
          return;
        }

        app.selectTrainingDate(date);
      }}
      selectedDayTrainings={stats.selectedDayTrainings}
      visibleRangeTrainings={stats.visibleRangeTrainings}
      trainingDraft={app.trainingDraft}
      validationMessage={app.status}
      editingTrainingId={app.editingTrainingId}
      surfaceOptions={surfaceOptions}
      onTrainingDraftChange={app.setTrainingDraft}
      onToggleSurface={app.toggleSurface}
      onTrainingSubmit={app.submitTraining}
      onEditTraining={(training) => {
        if (usesDedicatedTrainingEditor && training.id !== undefined) {
          router.push(`/trening/edytuj/${training.id}`);
          return;
        }

        app.editTraining(training);
      }}
      onDeleteTraining={app.deleteTraining}
      onResetSelection={app.resetTrainingSelection}
      onCancelEdit={app.resetTrainingSelection}
    />
  );
}
