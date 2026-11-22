'use client';

import { CalendarEvent } from '@api/db/types';
import { CalendarDayType } from '@components/Calendar/Calendar.types';
import { Stack, StackGap } from '@components/Stack/Stack';
import { useMemo } from 'react';
import { useCalenderContext } from '../../Calendar.context';
import CalendarDay from '../CalendarDay/CalendarDay';
import { CalendarPlanSection } from '../CalendarPlanSection/CalendarPlanSection';
import CalendarWeekInfoSection from '../CalendarWeekInfoSection/CalendarWeekInfoSection';
import style from './CalendarWeek.module.scss';

interface CallendarWeekProps {
  week: CalendarDayType[];
  gap: StackGap;
  monthIndex?: number;
}

export function CalendarWeek(props: CallendarWeekProps) {
  const { week, gap } = props;
  const { rowSize, isPlanVisible, events } = useCalenderContext();

  const { eventsOfTheWeek, evensByDate } = useMemo(() => {
    const weekDates = week.map((day) => day.date);
    const eventsOfTheWeek = events.filter((event) =>
      weekDates.includes(event.date)
    );
    const evensByDate: Record<string, CalendarEvent[]> = {};
    eventsOfTheWeek.forEach((event) => {
      if (!evensByDate[event.date]) {
        evensByDate[event.date] = [];
      }
      evensByDate[event.date].push(event);
    });

    return {
      eventsOfTheWeek,
      evensByDate,
    };
  }, [events, week]);

  return (
    <Stack gap={8} className={style.calendarWeek}>
      {rowSize !== 1 && isPlanVisible && (
        <CalendarWeekInfoSection week={week} />
      )}

      <Stack gap={gap} direction='horizontal' contentAlignment='between'>
        {week.map((day, weekDayIndex) => {
          return (
            <CalendarDay
              day={day}
              key={`day-${day.date}-${weekDayIndex}`}
              className={isPlanVisible ? style.itemPlan : style.item}
              dayEvents={evensByDate[day.date]}
            />
          );
        })}
      </Stack>
      {rowSize !== 1 && isPlanVisible && (
        <CalendarPlanSection eventsOfTheWeek={eventsOfTheWeek} week={week} />
      )}
    </Stack>
  );
}
