"use client";

import type { FormEvent } from "react";
import { Panel } from "@/components/climberbook/common/Panel";
import { ScrollPane } from "@/components/climberbook/common/ScrollPane";
import { TrainingAnalyticsPanel } from "@/components/climberbook/common/charts";
import type { WeightEntryDraft } from "@/components/climberbook/common/training";
import { analyticsPanelStyle } from "@/components/climberbook/common/styles";
import type { TrainingRecord, WeightEntryRecord } from "@/lib/climbs-db";

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
  ...panelProps
}: TrainingAnalyticsWidgetProps) {
  return (
    <Panel
      as="section"
      padding="none"
      gap="none"
      style={
        isMobileLayout
          ? { ...analyticsPanelStyle, order: mobileOrder }
          : { ...analyticsPanelStyle, gridColumn: 2, gridRow: 1 }
      }
    >
      <ScrollPane
        style={{ height: "100%", minHeight: 0 }}
        viewportStyle={{ height: "100%", minHeight: 0, overflowY: "auto" }}
      >
        <TrainingAnalyticsPanel
          isMobileLayout={isMobileLayout}
          section={section}
          {...panelProps}
        />
      </ScrollPane>
    </Panel>
  );
}
