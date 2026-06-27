import { type TrainingRecord } from "@/lib/climbs-db";
import { type CalendarDayCell, summarizeTrainingType, toDate } from "./training-calendar.helpers";
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

  const eventLevelClassName =
    trainings.length >= 9
      ? styles.isMultiEventDay9
      : trainings.length >= 7
        ? styles.isMultiEventDay7
        : trainings.length >= 5
          ? styles.isMultiEventDay5
          : trainings.length >= 3
            ? styles.isMultiEventDay3
            : trainings.length >= 2
              ? styles.isMultiEventDay2
              : trainings.length >= 1
                ? styles.isMultiEventDay1
                : undefined;

  const dayClasses = joinClasses(styles.calendarDay, eventLevelClassName);
  const itemClasses = joinClasses(
    styles.calendarItemBodyWeek,
    [0, 6].includes(toDate(day.date).getDay()) && styles.isWeekend,
    isToday && styles.isToday,
    isSelected && styles.isSelected,
    trainings.length > 0 && styles.hasEvents,
  );

  return (
    <button type="button" onClick={() => onSelect(day.date)} className={dayClasses}>
      {trainings.length > 0 && <div className={styles.eventCounter}>{trainings.length}</div>}

      <div className={itemClasses}>
        <div className={styles.dayMeta}>
          <span>{Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(toDate(day.date)).slice(0, 2)}</span>

          <span className={styles.dayNumber}>
            <strong>{toDate(day.date).getDate()}</strong>
            <small>.{String(toDate(day.date).getMonth() + 1).padStart(2, "0")}</small>
          </span>

          <span className={styles.monthLabel}>
            <small>{Intl.DateTimeFormat("pl-PL", { month: "short" }).format(toDate(day.date))}</small>
          </span>
        </div>

        <div className={styles.eventsPreview}>
          {trainings.slice(0, 2).map((training) => (
            <span key={`${training.id ?? training.createdAt}-${training.time}`} className={styles.eventLabel}>
              {training.time} {summarizeTrainingType(training)}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
