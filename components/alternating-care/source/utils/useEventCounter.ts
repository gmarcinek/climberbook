import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { getDaysBetweenDates } from '@components/Calendar/Calendar.helpers';
import dayjs from 'dayjs';
import { useCallback, useMemo } from 'react';

interface UseEventCounterProps {
  events?: CalendarEvent[];
}

interface CountEventsProps {
  eventType: CalendarEventType;
  startDate?: string;
  endDate?: string;
}

export const useEventCounter = (props: UseEventCounterProps) => {
  const { events } = props;

  const countEvents = useCallback(
    (props: CountEventsProps) => {
      const { eventType } = props;
      const startDate = dayjs(props.startDate).startOf('month');
      const endDate = dayjs(props.endDate)
        .endOf('month')
        .add(1, 'day')
        .startOf('day');
      const days = getDaysBetweenDates(startDate, endDate);

      console.log('startDate', startDate.format());
      console.log('endDate', endDate.format());

      if (
        !props.endDate ||
        !props.startDate ||
        startDate.isAfter(endDate) ||
        events?.length === 0
      ) {
        return {
          days: 0,
          eventCount: 0,
        };
      }

      const result = events?.filter(
        (event) =>
          startDate.subtract(1, 'day').isBefore(event.date) &&
          endDate.add(1, 'day').isAfter(event.date) &&
          event.type === eventType
      );

      return {
        days: days.length,
        eventCount: result?.length ?? 0,
      };
    },
    [events]
  );

  const api = useMemo(() => {
    return {
      countEvents,
    };
  }, [countEvents]);

  return { ...api };
};
