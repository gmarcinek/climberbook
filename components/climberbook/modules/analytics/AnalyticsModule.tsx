"use client";

import { useEffect, useMemo, useState } from "react";
import { moduleConfig } from "@/components/climberbook/common/modules";
import { useClimberbookStats } from "@/components/climberbook/hooks/useClimberbookStats";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { useAnalyticsModule } from "@/components/climberbook/providers/ClimberbookProvider";
import {
  addDays,
  toDate,
} from "@/components/training-calendar/training-calendar.helpers";
import { AnalyticsModuleContent } from "./components/AnalyticsModuleContent";
import type { AnalyticsPeriodPreset } from "./components/AnalyticsPeriodControls";

type AnalyticsPeriod = {
  start: string;
  end: string;
};

export function AnalyticsModule() {
  const app = useAnalyticsModule();
  const { isMobileChartLayout, width } = useViewport();
  const isMobileAnalyticsLayout = width === 0 || isMobileChartLayout;
  const moduleMeta = moduleConfig.find((module) => module.key === "analityka")!;
  const [period, setPeriod] = useState<AnalyticsPeriod | null>(null);
  const [activePeriodPreset, setActivePeriodPreset] = useState<
    AnalyticsPeriodPreset | "custom"
  >("month");

  useEffect(() => {
    if (width === 0 || period) {
      return;
    }

    setPeriod({ start: addDays(app.today, -29), end: app.today });
  }, [app.today, isMobileChartLayout, period, width]);

  const activePeriod = period ?? {
    start: addDays(app.today, -29),
    end: app.today,
  };
  const periodTrainings = useMemo(
    () =>
      app.trainings.filter(
        (training) =>
          training.date >= activePeriod.start && training.date <= activePeriod.end,
      ),
    [activePeriod.end, activePeriod.start, app.trainings],
  );
  const periodWeightEntries = useMemo(
    () =>
      app.weightEntries.filter(
        (entry) =>
          entry.date >= activePeriod.start && entry.date <= activePeriod.end,
      ),
    [activePeriod.end, activePeriod.start, app.weightEntries],
  );

  function setStart(start: string) {
    setActivePeriodPreset("custom");
    setPeriod((current) => {
      const end = current?.end ?? app.today;
      return { start, end: start > end ? start : end };
    });
  }

  function setEnd(end: string) {
    setActivePeriodPreset("custom");
    setPeriod((current) => {
      const start = current?.start ?? app.today;
      return { start: end < start ? end : start, end };
    });
  }

  function shiftPeriod(direction: -1 | 1) {
    setActivePeriodPreset((preset) =>
      preset === "all" ? "custom" : preset,
    );
    setPeriod((current) => {
      const value = current ?? activePeriod;
      const days = Math.max(
        1,
        Math.round(
          (toDate(value.end).getTime() - toDate(value.start).getTime()) /
            86_400_000,
        ) + 1,
      );
      return {
        start: addDays(value.start, direction * days),
        end: addDays(value.end, direction * days),
      };
    });
  }

  function setPreset(preset: AnalyticsPeriodPreset) {
    setActivePeriodPreset(preset);
    const earliestRecordedDate = [...app.trainings, ...app.weightEntries].reduce<
      string | null
    >(
      (earliest, record) =>
        !earliest || record.date < earliest ? record.date : earliest,
      null,
    );
    const daysByPreset = { week: 7, month: 30, year: 365 } as const;

    setPeriod({
      start:
        preset === "all"
          ? earliestRecordedDate ?? app.today
          : addDays(app.today, -(daysByPreset[preset] - 1)),
      end: app.today,
    });
  }

  const stats = useClimberbookStats({
    ascents: app.ascents,
    isMobileChartLayout: isMobileAnalyticsLayout,
    profileDraft: app.profileDraft,
    selectedDate: app.selectedDate,
    today: app.today,
    trainingRangeStart: app.trainingRangeStart,
    chartRangeOverride: activePeriod,
    trainings: periodTrainings,
    weightEntries: periodWeightEntries,
  });
  return (
    <AnalyticsModuleContent
      moduleMeta={moduleMeta}
      isMobileChartLayout={isMobileAnalyticsLayout}
      period={activePeriod}
      activePeriodPreset={activePeriodPreset}
      onPreviousPeriod={() => shiftPeriod(-1)}
      onNextPeriod={() => shiftPeriod(1)}
      onPeriodStartChange={setStart}
      onPeriodEndChange={setEnd}
      onPeriodPreset={setPreset}
      allTrainings={app.trainings}
      trainings={periodTrainings}
      trainingsCount={periodTrainings.length}
      averageWeight={stats.averageWeight}
      totalCalories={stats.totalCalories}
      totalTrainingTime={stats.totalTrainingTime}
      chartRangeLabel={stats.chartRangeLabel}
      weeklyTrainingStats={stats.weeklyTrainingStats}
      gradeDistribution={stats.gradeDistribution}
    />
  );
}
