"use client";

import {
  calendarNavLabelStyle,
  calendarNavStyle,
  calendarPanelStyle,
  navButtonStyle,
} from "@/components/climberbook/common/styles";
import { TrainingCalendar } from "@/components/training-calendar/TrainingCalendar";
import type { TrainingRecord } from "@/lib/climbs-db";

type TrainingCalendarWidgetProps = {
  isMobileLayout: boolean;
  currentCalendarMonthLabel: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  trainingRangeStart: string;
  trainingsByDate: Map<string, TrainingRecord[]>;
  selectedDate: string | null;
  today: string;
  onSelectDate: (date: string) => void;
};

export function TrainingCalendarWidget({
  isMobileLayout,
  currentCalendarMonthLabel,
  onPreviousMonth,
  onNextMonth,
  trainingRangeStart,
  trainingsByDate,
  selectedDate,
  today,
  onSelectDate,
}: TrainingCalendarWidgetProps) {
  return (
    <section
      style={{
        ...calendarPanelStyle,
        gridColumn: isMobileLayout ? "auto" : 1,
        gridRow: isMobileLayout ? "auto" : 1,
        order: isMobileLayout ? -1 : 0,
      }}
    >
      <div style={calendarNavStyle}>
        <button type="button" onClick={onPreviousMonth} style={navButtonStyle}>
          Wstecz
        </button>
        <strong style={calendarNavLabelStyle}>
          {currentCalendarMonthLabel}
        </strong>
        <button type="button" onClick={onNextMonth} style={navButtonStyle}>
          Dalej
        </button>
      </div>

      <TrainingCalendar
        anchorMonthStart={trainingRangeStart}
        monthCount={1}
        visibleColumns={1}
        trainingsByDate={trainingsByDate}
        selectedDate={selectedDate}
        today={today}
        onSelectDate={onSelectDate}
      />
    </section>
  );
}
