import type { CalendarEvent } from '@api/db/types';
import { normalizeCalendarRange } from '@components/Calendar/Calendar.helpers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSearchParams } from '@utils/useAppSearchParams';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listCareEvents } from './careEventsApi';

export type CareEventsQuery = {
  data?: CalendarEvent[];
  isError: boolean;
  isPending: boolean;
  refetch: () => Promise<unknown>;
};

const getMonthRange = (date: string) => {
  const month = dayjs(date);

  return {
    key: month.format('YYYY-MM'),
    start: month.startOf('month').format('YYYY-MM-DD'),
    end: month.endOf('month').format('YYYY-MM-DD'),
  };
};

const mergeEvents = (
  current: CalendarEvent[],
  incoming: CalendarEvent[]
) => {
  const events = new Map<string, CalendarEvent>();

  current.forEach((event) => {
    events.set(`${event.groupId}:${event.date}:${event.type}`, event);
  });
  incoming.forEach((event) => {
    events.set(`${event.groupId}:${event.date}:${event.type}`, event);
  });

  return [...events.values()];
};

export const useGetAllEventsQuery = (options?: { lazy?: boolean }) => {
  const lazy = options?.lazy ?? false;
  const { startDate, endDate } = useAppSearchParams();
  const queryClient = useQueryClient();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [edgeError, setEdgeError] = useState(false);
  const [rangeVersion, setRangeVersion] = useState(0);
  const loadedRangesRef = useRef(new Map<string, { start: string; end: string }>());
  const pendingRangesRef = useRef(new Map<string, Promise<CalendarEvent[]>>());

  const initialRange = useMemo(() => {
    const normalized = normalizeCalendarRange(startDate, endDate);
    return {
      key: `${normalized.start}:${normalized.end}`,
      start: normalized.start,
      end: normalized.end,
    };
  }, [endDate, lazy, startDate]);

  useEffect(() => {
    setEvents([]);
    setEdgeError(false);
    loadedRangesRef.current = new Map([
      [initialRange.key, { start: initialRange.start, end: initialRange.end }],
    ]);
    pendingRangesRef.current.clear();
    setRangeVersion((version) => version + 1);
  }, [initialRange.end, initialRange.start]);

  const initialQuery = useQuery({
    queryKey: ['careEvents', 'month', initialRange.key],
    queryFn: () =>
      listCareEvents({
        start: initialRange.start,
        end: initialRange.end,
      }),
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });

  useEffect(() => {
    if (initialQuery.data) {
      setEvents((current) => mergeEvents(current, initialQuery.data ?? []));
    }
  }, [initialQuery.data, rangeVersion]);

  const loadMonth = useCallback(
    async (date: string, ignoreBounds = false) => {
      if (!lazy) return;
      const range = getMonthRange(date);
      const isAlreadyLoaded = [...loadedRangesRef.current.values()].some(
        (loadedRange) =>
          !dayjs(range.start).isBefore(dayjs(loadedRange.start)) &&
          !dayjs(range.end).isAfter(dayjs(loadedRange.end))
      );

      const normalized = normalizeCalendarRange(startDate, endDate);
      if (
        !ignoreBounds &&
        (dayjs(range.start).isBefore(dayjs(normalized.start)) ||
          dayjs(range.end).isAfter(dayjs(normalized.end).endOf('day')))
      ) {
        return;
      }

      if (
        isAlreadyLoaded ||
        pendingRangesRef.current.has(range.key)
      ) {
        return pendingRangesRef.current.get(range.key);
      }

      const request = queryClient
        .fetchQuery({
          queryKey: ['careEvents', 'month', range.key],
          queryFn: () => listCareEvents({ start: range.start, end: range.end }),
        })
        .then((monthEvents) => {
          loadedRangesRef.current.set(range.key, {
            start: range.start,
            end: range.end,
          });
          setEvents((current) => mergeEvents(current, monthEvents));
          setEdgeError(false);
          return monthEvents;
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return [];
          }
          setEdgeError(true);
          throw error;
        })
        .finally(() => {
          pendingRangesRef.current.delete(range.key);
        });

      pendingRangesRef.current.set(range.key, request);
      return request;
    },
    [endDate, lazy, queryClient, startDate]
  );

  const refetch = useCallback(async () => {
    const ranges = [...loadedRangesRef.current.values()];
    const responses = await Promise.all(
      ranges.map((range) =>
        queryClient.fetchQuery({
          queryKey: ['careEvents', 'month', dayjs(range.start).format('YYYY-MM')],
          queryFn: () => listCareEvents(range),
          staleTime: 0,
        })
      )
    );

    setEvents(responses.flat());
    setEdgeError(false);
  }, [queryClient]);

  return {
    query: {
      data: events,
      isError: initialQuery.isError || edgeError,
      isPending: initialQuery.isPending,
      refetch,
    } satisfies CareEventsQuery,
    refetch,
    loadMonth,
  };
};
