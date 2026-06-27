import { type TrainingRecord } from "@/lib/climbs-db";
import { type CalendarDayCell, formatDateIso } from "./training-calendar.helpers";
import { TrainingCalendarDay } from "./TrainingCalendarDay";
import styles from "./TrainingCalendarWeek.module.css";

type TrainingCalendarWeekProps = {
  week: CalendarDayCell[];
  trainingMap: Map<string, TrainingRecord[]>;
  selectedDate: string | null;
  today: string;
  onSelectDate: (date: string) => void;
};

export function TrainingCalendarWeek(props: TrainingCalendarWeekProps) {
  const { week, trainingMap, selectedDate, today, onSelectDate } = props;

  return (
    <div className={styles.calendarWeek}>
      {week.map((day, index) => (
        <TrainingCalendarDay
          key={`${day.date}-${index}`}
          day={day}
          trainings={trainingMap.get(formatDateIso(day.date)) ?? []}
          isSelected={selectedDate === day.date}
          isToday={today === day.date}
          onSelect={onSelectDate}
        />
      ))}
    </div>
  );
}