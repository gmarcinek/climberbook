"use client";

import type { FormEvent } from "react";
import { AscentFormWidget } from "./AscentFormWidget";
import { ReportHeaderWidget } from "./ReportHeaderWidget";
import { ReportMetricsWidget } from "./ReportMetricsWidget";
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
  notes: string;
};
type ReportsAssemblyProps = {
  moduleMeta: { eyebrow: string; title: string; description: string };
  ascentsCount: number;
  panelAscents: number;
  rockAscents: number;
  ascentDraft: AscentDraftValues;
  onAscentDraftChange: (draft: AscentDraftValues) => void;
  onAscentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  frenchGradeOptions: string[];
};

export function ReportsAssembly({
  moduleMeta,
  ascentsCount,
  panelAscents,
  rockAscents,
  ascentDraft,
  onAscentDraftChange,
  onAscentSubmit,
  frenchGradeOptions,
}: ReportsAssemblyProps) {
  return (
    <div style={moduleContentStyle}>
      <ReportHeaderWidget
        meta={moduleMeta}
        ascentsCount={ascentsCount}
        panelAscents={panelAscents}
        rockAscents={rockAscents}
      />
      <ReportMetricsWidget
        ascentsCount={ascentsCount}
        panelAscents={panelAscents}
        rockAscents={rockAscents}
      />
      <div style={twoColumnLayoutStyle}>
        <AscentFormWidget
          ascentDraft={ascentDraft}
          onAscentDraftChange={onAscentDraftChange}
          onAscentSubmit={onAscentSubmit}
          frenchGradeOptions={frenchGradeOptions}
        />
      </div>
    </div>
  );
}
