import { type TrainingRecord } from "@/lib/climbs-db";
import { type CalendarDayCell, toDate } from "./training-calendar.helpers";
import styles from "./TrainingCalendarDay.module.css";

function joinClasses(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

type TrainingCalendarDayProps = {
  day: CalendarDayCell;
  trainings: TrainingRecord[];
  isSelected: boolean;
  isToday: boolean;
  onSelect: (date: string) => void;
};

export function TrainingCalendarDay(props: TrainingCalendarDayProps) {
  const { day, trainings, isSelected, isToday, onSelect } = props;

  if (day.isOffset) {
    return <div className={styles.emptyDay} />;
  }

  const totalDurationMinutes = trainings.reduce(
    (sum, training) => sum + training.durationMinutes,
    0,
  );
  const intensityClassName =
    totalDurationMinutes >= 240
      ? styles.intensityVeryHigh
      : totalDurationMinutes >= 150
        ? styles.intensityHigh
        : totalDurationMinutes >= 90
          ? styles.intensityMedium
          : trainings.length > 0
            ? styles.intensityLow
            : undefined;

  const dayClasses = styles.calendarDay;
  const itemClasses = joinClasses(
    styles.calendarItemBodyWeek,
    [0, 6].includes(toDate(day.date).getDay()) && styles.isWeekend,
    isToday && styles.isToday,
    isSelected && styles.isSelected,
    trainings.length > 0 && styles.hasEvents,
    intensityClassName,
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(day.date)}
      className={dayClasses}
    >
      {trainings.length > 0 && (
        <div className={styles.eventCounter}>{trainings.length}</div>
      )}

      <div className={itemClasses}>
        <div className={styles.dayMeta}>
          <span>
            {Intl.DateTimeFormat("pl-PL", { weekday: "short" })
              .format(toDate(day.date))
              .slice(0, 2)}
          </span>

          <span className={styles.dayNumber}>
            <strong>{toDate(day.date).getDate()}</strong>
            <small>
              .{String(toDate(day.date).getMonth() + 1).padStart(2, "0")}
            </small>
          </span>

          <span className={styles.monthLabel}>
            <small>
              {Intl.DateTimeFormat("pl-PL", { month: "short" }).format(
                toDate(day.date),
              )}
            </small>
          </span>
        </div>
      </div>
    </button>
  );
}
