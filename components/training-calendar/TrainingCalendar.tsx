import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { type TrainingRecord } from "@/lib/climbs-db";
import { buildCalendarMonths } from "./training-calendar.helpers";
import { TrainingCalendarMonth } from "./TrainingCalendarMonth";
import styles from "./TrainingCalendar.module.css";

const DAYS_IN_WEEK = 7;
const MIN_DAY_WIDTH = 64;
function getCalendarMetrics(containerWidth: number) {
  if (!containerWidth) {
    return {
      monthGap: 4,
      weekGap: 4,
      monthMinWidth: DAYS_IN_WEEK * MIN_DAY_WIDTH + (DAYS_IN_WEEK - 1) * 4,
    };
  }

  const monthGap =
    containerWidth >= 1800 ? 12 : containerWidth >= 1480 ? 10 : containerWidth >= 1180 ? 8 : containerWidth >= 860 ? 6 : 4;
  const weekGap = containerWidth >= 1480 ? 6 : 4;
  const minMonthWidth = DAYS_IN_WEEK * MIN_DAY_WIDTH + (DAYS_IN_WEEK - 1) * weekGap;

  return {
    monthGap,
    weekGap,
    monthMinWidth: minMonthWidth,
  };
}

type TrainingCalendarProps = {
  anchorMonthStart: string;
  monthCount?: number;
  visibleColumns?: number;
  trainingsByDate: Map<string, TrainingRecord[]>;
  selectedDate: string | null;
  today: string;
  onSelectDate: (date: string) => void;
};

export function TrainingCalendar(props: TrainingCalendarProps) {
  const { anchorMonthStart, monthCount = 3, visibleColumns = monthCount, trainingsByDate, selectedDate, today, onSelectDate } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const months = useMemo(() => buildCalendarMonths(anchorMonthStart, monthCount), [anchorMonthStart, monthCount]);
  const metrics = useMemo(() => getCalendarMetrics(containerWidth), [containerWidth]);

  useEffect(() => {
    const node = containerRef.current;

    if (!node) {
      return;
    }

    const updateWidth = (width: number) => {
      setContainerWidth((current) => (Math.abs(current - width) < 1 ? current : width));
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
  }, []);

  const calendarStyle = {
    "--calendar-columns": String(visibleColumns),
    "--calendar-gap": `${metrics.monthGap}px`,
    "--calendar-week-gap": `${metrics.weekGap}px`,
    "--calendar-month-min-width": `${metrics.monthMinWidth}px`,
  } as CSSProperties;

  return (
    <div ref={containerRef} className={styles.calendarRoot}>
      <div className={styles.calendarGrid} style={calendarStyle}>
        {months.map((month) => (
          <TrainingCalendarMonth
            key={`${month.year}-${month.monthIndex}`}
            month={month}
            selectedDate={selectedDate}
            today={today}
            trainingMap={trainingsByDate}
            onSelectDate={onSelectDate}
          />
        ))}
      </div>
    </div>
  );
}
