import dayjs from 'dayjs';
import { useMemo } from 'react';
import {
  toFullMonthsDates,
  toFullWeeksDates,
  toRowXDates,
} from '../Calendar.helpers';

interface UseCalendarDatesProps {
  startDate: string;
  rowSize: number;
}

export const useCalendarDates = (props: UseCalendarDatesProps) => {
  const { startDate, rowSize } = props;
  const baseDate = dayjs(startDate);

  const splits = useMemo(() => {
    return {
      row1: toFullWeeksDates(baseDate, baseDate.add(3, 'month')),
      row7: toFullMonthsDates(baseDate, baseDate.add(12, 'month')),
      row14: toRowXDates(baseDate, baseDate.add(13, 'month'), 14),
      row21: toRowXDates(baseDate, baseDate.add(13, 'month'), 21),
      row28: toRowXDates(baseDate, baseDate.add(13, 'month'), 28),
      row30: toFullMonthsDates(baseDate, baseDate.add(1, 'month')),
    };
  }, [startDate]);

  const calendarDates = useMemo(() => {
    switch (rowSize) {
      case 1:
        return splits.row1;

      case 7:
        return splits.row7;

      case 14:
        return splits.row14;

      case 21:
        return splits.row21;

      case 28:
        return splits.row28;

      case 30:
        return splits.row30;
      default:
        return splits.row7;
    }
  }, [startDate, rowSize, splits]);

  return calendarDates;
};
