import { type TrainingRecord } from "@/lib/climbs-db";
import { getMonthLabel, type CalendarMonthData, formatDateIso } from "./training-calendar.helpers";
import { TrainingCalendarWeek } from "./TrainingCalendarWeek";
import styles from "./TrainingCalendarMonth.module.css";

type TrainingCalendarMonthProps = {
  month: CalendarMonthData;
  selectedDate: string | null;
  today: string;
  trainingMap: Map<string, TrainingRecord[]>;
  onSelectDate: (date: string) => void;
};

export function TrainingCalendarMonth(props: TrainingCalendarMonthProps) {
  const { month, selectedDate, today, trainingMap, onSelectDate } = props;

  return (
    <section className={styles.calendarMonth}>
      <header className={styles.heading}>
        <div>
          <span>{getMonthLabel(month.monthIndex)}</span>
          <span className={styles.year}> {month.year}</span>
        </div>
      </header>

      <div className={styles.weeks}>
        {month.weeks.map((week, weekIndex) => (
          <TrainingCalendarWeek
            key={`${month.year}-${month.monthIndex}-${weekIndex}`}
            week={week}
            trainingMap={trainingMap}
            selectedDate={selectedDate}
            today={today}
            onSelectDate={onSelectDate}
          />
        ))}
      </div>
    </section>
  );
}
