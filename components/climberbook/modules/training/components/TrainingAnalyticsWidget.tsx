"use client";

import type { FormEvent } from "react";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import { TrainingAnalyticsPanel } from "@/components/climberbook/common/charts";
import type { WeightEntryDraft } from "@/components/climberbook/common/training";
import { analyticsPanelStyle } from "@/components/climberbook/common/styles";
import type { TrainingRecord, WeightEntryRecord } from "@/lib/climbs-db";

type TrainingAnalyticsWidgetProps = {
  isMobileLayout: boolean;
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
};

export function TrainingAnalyticsWidget({
  isMobileLayout,
  ...panelProps
}: TrainingAnalyticsWidgetProps) {
  return (
    <section
      style={
        isMobileLayout
          ? analyticsPanelStyle
          : { ...analyticsPanelStyle, gridColumn: 2, gridRow: 1 }
      }
    >
      <ScrollPane
        style={{ height: "100%", minHeight: 0 }}
        viewportStyle={{ height: "100%", minHeight: 0, overflowY: "auto" }}
      >
        <TrainingAnalyticsPanel {...panelProps} />
      </ScrollPane>
    </section>
  );
}
