"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/climberbook/common/Button";
import { Panel } from "@/components/climberbook/common/Panel";
import {
  calendarNavLabelStyle,
  calendarNavStyle,
  navButtonStyle,
} from "@/components/climberbook/common/styles";
import { useSelectedDates } from "@/contexts/SelectedDatesContext";
import { TrainingCalendar } from "@/components/training-calendar/TrainingCalendar";
import {
  addDays,
  addMonths,
  getMonthLabel,
  getMonthStart,
  toDate,
} from "@/components/training-calendar/training-calendar.helpers";
import type { TrainingRecord } from "@/lib/climbs-db";

const TWO_MONTHS_MIN_WIDTH = 640;

export function AnalyticsCalendarWidget({
  period,
  today,
  trainings,
  onVisibleRangeChange,
}: {
  period: { start: string; end: string };
  today: string;
  trainings: TrainingRecord[];
  onVisibleRangeChange: (range: { start: string; end: string }) => void;
}) {
  const { selectedDate, setSelectedDate } = useSelectedDates();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousPeriodStartRef = useRef(period.start);
  const suppressRangeSyncRef = useRef(false);
  const [anchorMonthStart, setAnchorMonthStart] = useState(() =>
    getMonthStart(period.start),
  );
  const [monthCount, setMonthCount] = useState(1);
  const trainingsByDate = useMemo(() => {
    const trainingMap = new Map<string, TrainingRecord[]>();

    trainings.forEach((training) => {
      const entries = trainingMap.get(training.date) ?? [];
      entries.push(training);
      trainingMap.set(training.date, entries);
    });

    return trainingMap;
  }, [trainings]);

  useEffect(() => {
    if (period.start === previousPeriodStartRef.current) {
      return;
    }

    previousPeriodStartRef.current = period.start;
    const nextAnchorMonthStart = getMonthStart(period.start);

    if (nextAnchorMonthStart !== anchorMonthStart) {
      suppressRangeSyncRef.current = true;
      setAnchorMonthStart(nextAnchorMonthStart);
    }
  }, [anchorMonthStart, period.start]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const updateMonthCount = (width: number) => {
      setMonthCount(width >= TWO_MONTHS_MIN_WIDTH ? 2 : 1);
    };

    updateMonthCount(container.getBoundingClientRect().width);
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (entry) updateMonthCount(entry.contentRect.width);
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (suppressRangeSyncRef.current) {
      suppressRangeSyncRef.current = false;
      return;
    }

    onVisibleRangeChange({
      start: anchorMonthStart,
      end: addDays(addMonths(anchorMonthStart, monthCount), -1),
    });
  }, [anchorMonthStart, monthCount, onVisibleRangeChange]);

  const anchorDate = toDate(anchorMonthStart);
  const finalMonthDate = toDate(addMonths(anchorMonthStart, monthCount - 1));
  const monthLabel =
    monthCount === 1
      ? getMonthLabel(anchorDate.getMonth())
      : `${getMonthLabel(anchorDate.getMonth())} - ${getMonthLabel(finalMonthDate.getMonth())}`;
  const yearLabel =
    anchorDate.getFullYear() === finalMonthDate.getFullYear()
      ? String(anchorDate.getFullYear())
      : `${anchorDate.getFullYear()} - ${finalMonthDate.getFullYear()}`;

  return (
    <Panel>
      <div style={calendarHeaderStyle}>
        <div style={calendarNavStyle}>
          <Button
            size="small"
            variant="secondary"
            aria-label="Poprzedni miesiąc analizy"
            title="Poprzedni miesiąc"
            onClick={() =>
              setAnchorMonthStart((current) => addMonths(current, -1))
            }
            style={calendarNavButtonStyle}
          >
            <span aria-hidden style={{ fontSize: "2rem", lineHeight: 0.35 }}>
              ‹
            </span>
          </Button>
          <div style={calendarNavLabelStyle}>
            <strong>{monthLabel}</strong>
            <span
              style={{
                color: "var(--component-calendar-highlight)",
                fontWeight: 600,
              }}
            >
              {` ${yearLabel}`}
            </span>
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Button
              size="small"
              variant="secondary"
              aria-label="Następny miesiąc analizy"
              title="Następny miesiąc"
              onClick={() =>
                setAnchorMonthStart((current) => addMonths(current, 1))
              }
              style={calendarNavButtonStyle}
            >
              <span aria-hidden style={{ fontSize: "2rem", lineHeight: 0.35 }}>
                ›
              </span>
            </Button>
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        style={{ margin: "0 auto", maxWidth: 840, minWidth: 0, width: "100%" }}
      >
        <TrainingCalendar
          anchorMonthStart={anchorMonthStart}
          monthCount={monthCount}
          visibleColumns={monthCount}
          useScrollPane={false}
          fillHeight={false}
          showMonthHeader={false}
          trainingsByDate={trainingsByDate}
          selectedDate={selectedDate}
          today={today}
          onSelectDate={setSelectedDate}
        />
      </div>
    </Panel>
  );
}

const calendarHeaderStyle = {
  borderBottom: "1px solid rgba(146, 146, 146, 0.45)",
  borderTop: "1px solid rgba(146, 146, 146, 0.45)",
  marginBottom: 8,
  padding: "8px 0",
  textTransform: "capitalize" as const,
};

const calendarNavButtonStyle = {
  ...navButtonStyle,
  alignSelf: "center",
  height: 36,
  minHeight: 36,
  minWidth: 36,
  padding: 0,
  placeItems: "center",
  width: 36,
};
