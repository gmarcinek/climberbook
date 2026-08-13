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
  isMobileLayout,
  isWideDesktop,
  period,
  today,
  trainings,
  onVisibleRangeChange,
}: {
  isMobileLayout: boolean;
  isWideDesktop: boolean;
  period: { start: string; end: string };
  today: string;
  trainings: TrainingRecord[];
  onVisibleRangeChange: (range: { start: string; end: string }) => void;
}) {
  const { selectedDate, setSelectedDate } = useSelectedDates();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousPeriodEndRef = useRef(period.end);
  const suppressRangeSyncRef = useRef(false);
  const [anchorMonthStart, setAnchorMonthStart] = useState(() =>
    getMonthStart(today),
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
    if (isMobileLayout) {
      return;
    }

    if (period.end === previousPeriodEndRef.current) {
      return;
    }

    previousPeriodEndRef.current = period.end;
    const nextAnchorMonthStart = getMonthStart(period.end);

    if (nextAnchorMonthStart !== anchorMonthStart) {
      suppressRangeSyncRef.current = true;
      setAnchorMonthStart(nextAnchorMonthStart);
    }
  }, [anchorMonthStart, isMobileLayout, period.end]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const updateMonthCount = (width: number) => {
      setMonthCount(
        isMobileLayout
          ? 1
          : isWideDesktop
            ? 3
            : width >= TWO_MONTHS_MIN_WIDTH
              ? 2
              : 1,
      );
    };

    updateMonthCount(container.getBoundingClientRect().width);
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (entry) updateMonthCount(entry.contentRect.width);
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [isMobileLayout, isWideDesktop]);

  useEffect(() => {
    if (suppressRangeSyncRef.current) {
      suppressRangeSyncRef.current = false;
      return;
    }

    onVisibleRangeChange({
      start: addMonths(anchorMonthStart, 1 - monthCount),
      end: addDays(addMonths(anchorMonthStart, 1), -1),
    });
  }, [anchorMonthStart, monthCount, onVisibleRangeChange]);

  const firstMonthStart = addMonths(anchorMonthStart, 1 - monthCount);
  const firstMonthDate = toDate(firstMonthStart);
  const finalMonthDate = toDate(anchorMonthStart);
  const monthLabel =
    monthCount === 1
      ? getMonthLabel(finalMonthDate.getMonth())
      : `${getMonthLabel(firstMonthDate.getMonth())} - ${getMonthLabel(finalMonthDate.getMonth())}`;
  const yearLabel =
    firstMonthDate.getFullYear() === finalMonthDate.getFullYear()
      ? String(finalMonthDate.getFullYear())
      : `${firstMonthDate.getFullYear()} - ${finalMonthDate.getFullYear()}`;

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
        style={{
          margin: "0 auto",
          maxWidth: monthCount === 3 ? 1320 : 840,
          minWidth: 0,
          width: "100%",
        }}
      >
        <TrainingCalendar
          anchorMonthStart={firstMonthStart}
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
