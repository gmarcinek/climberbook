'use client';

import { CalendarDayType } from '@components/Calendar/Calendar.types';
import { Stack, StackGap } from '@components/Stack/Stack';
import { forwardRef } from 'react';
import { CalendarWeek } from '../CalendarWeek/CalendarWeek';

interface CalendarUngrupedProps {
  weeks: CalendarDayType[][];
  gap: StackGap;
}

export const CalendarUngruped = forwardRef<
  HTMLDivElement,
  CalendarUngrupedProps
>((props: CalendarUngrupedProps, ref) => {
  const { weeks, gap } = props;

  return (
    <Stack gap={gap} ref={ref}>
      {weeks.map((week, weekIndex) => {
        return (
          <CalendarWeek
            key={`week-of-${week[0].date}-${weekIndex}`}
            week={week}
            gap={gap}
          />
        );
      })}
    </Stack>
  );
});
