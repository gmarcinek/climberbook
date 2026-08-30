"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type WheelEvent,
} from "react";
import { Panel } from "@/components/climberbook/common/Panel";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import { TrainingAnalyticsPanel } from "@/components/climberbook/common/charts";
import {
  getRollingChartRange,
  type WeightEntryDraft,
} from "@/components/climberbook/common/training";
import { analyticsPanelStyle } from "@/components/climberbook/common/styles";
import type { TrainingRecord, WeightEntryRecord } from "@/lib/climbs-db";

const desktopChartTargetDayWidthPx = 25;
const desktopChartReservedWidthPx = 72;
const desktopChartDaysForward = 3;
const desktopMinChartDaysBack = 14;
const desktopChartEdgeMarginDays = 1;
const maximumVisibleChartDays = 61;
const mobileChartTargetDayWidthPx = 25;
const mobileChartDaysForward = 0;
const mobileMinChartDaysBack = 7;
const mobileChartEdgeMarginDays = 0.5;

function getAdaptiveChartRange(
  containerWidth: number,
  options: {
    daysForward: number;
    minDaysBack: number;
    fallbackDaysBack: number;
    targetDayWidthPx: number;
    edgeMarginDays: number;
  },
) {
  const {
    daysForward,
    minDaysBack,
    fallbackDaysBack,
    targetDayWidthPx,
    edgeMarginDays,
  } = options;

  if (containerWidth <= 0) {
    return {
      daysBack: fallbackDaysBack,
      range: getRollingChartRange(fallbackDaysBack, daysForward),
    };
  }

  const minimumTotalVisibleDays = minDaysBack + daysForward + edgeMarginDays;
  const usableWidth = Math.max(
    containerWidth - desktopChartReservedWidthPx,
    minimumTotalVisibleDays * targetDayWidthPx,
  );
  const totalVisibleDays = Math.max(
    minimumTotalVisibleDays,
    usableWidth / targetDayWidthPx,
  );
  const daysBack = Math.max(
    minDaysBack,
    Math.min(
      maximumVisibleChartDays - daysForward - 1,
      Math.round(totalVisibleDays - daysForward - edgeMarginDays),
    ),
  );

  return {
    daysBack,
    range: getRollingChartRange(daysBack, daysForward),
  };
}

type TrainingAnalyticsWidgetProps = {
  isMobileLayout: boolean;
  section?: "all" | "charts" | "metrics" | "weight";
  mobileOrder?: number;
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
  currentAge: number | null;
};

export function TrainingAnalyticsWidget({
  isMobileLayout,
  section,
  mobileOrder,
  chartRange,
  chartRangeLabel,
  ...panelProps
}: TrainingAnalyticsWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const adaptiveChart = useMemo(
    () =>
      getAdaptiveChartRange(containerWidth, {
        daysForward: isMobileLayout
          ? mobileChartDaysForward
          : desktopChartDaysForward,
        minDaysBack: isMobileLayout
          ? mobileMinChartDaysBack
          : desktopMinChartDaysBack,
        fallbackDaysBack: isMobileLayout ? 13 : 28,
        targetDayWidthPx: isMobileLayout
          ? mobileChartTargetDayWidthPx
          : desktopChartTargetDayWidthPx,
        edgeMarginDays: isMobileLayout
          ? mobileChartEdgeMarginDays
          : desktopChartEdgeMarginDays,
      }),
    [containerWidth, isMobileLayout],
  );
  const effectiveChartRange = adaptiveChart.range;
  const effectiveChartRangeLabel = `${adaptiveChart.daysBack} dni wstecz + ${isMobileLayout ? mobileChartDaysForward : desktopChartDaysForward} dni`;

  useLayoutEffect(() => {
    const node = containerRef.current;

    if (!node) {
      return;
    }

    const updateWidth = (width: number) => {
      setContainerWidth((current) => {
        const nextWidth = Math.floor(width);

        return Math.abs(current - nextWidth) < 1 ? current : nextWidth;
      });
    };

    updateWidth(node.getBoundingClientRect().width);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      updateWidth(entry.contentRect.width);
    });

    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isMobileLayout]);

  const handleDesktopWheelCapture = (event: WheelEvent<HTMLDivElement>) => {
    if (isMobileLayout) {
      return;
    }

    const viewport = event.currentTarget.querySelector('[class*="viewport"]');

    if (!(viewport instanceof HTMLElement)) {
      return;
    }

    if (viewport.scrollHeight <= viewport.clientHeight) {
      return;
    }

    viewport.scrollTop += event.deltaY;
    event.preventDefault();
  };

  return (
    <Panel
      as="section"
      padding="none"
      gap="none"
      style={
        isMobileLayout
          ? { ...analyticsPanelStyle, order: mobileOrder }
          : {
              ...analyticsPanelStyle,
              gridColumn: 2,
              gridRow: 1,
              gridTemplateRows: "minmax(0, 1fr)",
              height: "100%",
              overflow: "hidden",
            }
      }
    >
      <div
        ref={containerRef}
        style={{ minHeight: 0, height: isMobileLayout ? undefined : "100%" }}
        onWheelCapture={handleDesktopWheelCapture}
      >
        <ScrollPane
          style={{ height: "100%", minHeight: 0 }}
          viewportStyle={{ height: "100%", minHeight: 0, overflowY: "auto" }}
        >
          <TrainingAnalyticsPanel
            isMobileLayout={isMobileLayout}
            section={section}
            chartRange={effectiveChartRange}
            chartRangeLabel={effectiveChartRangeLabel}
            {...panelProps}
          />
        </ScrollPane>
      </div>
    </Panel>
  );
}
