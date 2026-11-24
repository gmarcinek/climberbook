import type { CalendarEvent } from '@api/db/types';
import { normalizeCalendarRange } from '@components/Calendar/Calendar.helpers';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useAppSearchParams } from '@utils/useAppSearchParams';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listCareEvents } from './careEventsApi';

export type CareEventsQuery = {
  data?: CalendarEvent[];
  isError: boolean;
  isPending: boolean;
  refetch: () => Promise<unknown>;
};

type LoadedRange = { key: string; start: string; end: string };

const getMonthRange = (date: string): LoadedRange => {
  const month = dayjs(date);

  return {
    key: month.format('YYYY-MM'),
    start: month.startOf('month').format('YYYY-MM-DD'),
    end: month.endOf('month').format('YYYY-MM-DD'),
  };
};

const rangeQuery = (range: LoadedRange) => ({
  queryKey: ['careEvents', 'month', range.key],
  queryFn: () => listCareEvents({ start: range.start, end: range.end }),
  retry: 3,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 8000),
});

// Every loaded range stays an active query, so invalidation refetches it and the
// merged list is rebuilt from the latest responses instead of accumulating stale
// events (e.g. a caregiver that was replaced on a day).
export const useGetAllEventsQuery = (options?: { lazy?: boolean }) => {
  const lazy = options?.lazy ?? false;
  const { startDate, endDate } = useAppSearchParams();
  const queryClient = useQueryClient();

  const initialRange = useMemo<LoadedRange>(() => {
    const normalized = normalizeCalendarRange(startDate, endDate);
    return {
      key: `${normalized.start}:${normalized.end}`,
      start: normalized.start,
      end: normalized.end,
    };
  }, [endDate, startDate]);

  const [ranges, setRanges] = useState<LoadedRange[]>([initialRange]);

  useEffect(() => {
    setRanges([initialRange]);
  }, [initialRange]);

  const results = useQueries({ queries: ranges.map(rangeQuery) });

  const events = useMemo(() => {
    const merged = new Map<string, CalendarEvent>();
    results.forEach((result) => {
      result.data?.forEach((event) => {
        merged.set(`${event.groupId}:${event.date}:${event.type}`, event);
      });
    });
    return [...merged.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.map((result) => result.dataUpdatedAt).join(',')]);

  const loadMonth = useCallback(
    async (date: string, ignoreBounds = false) => {
      if (!lazy) return;
      const range = getMonthRange(date);

      const normalized = normalizeCalendarRange(startDate, endDate);
      if (
        !ignoreBounds &&
        (dayjs(range.start).isBefore(dayjs(normalized.start)) ||
          dayjs(range.end).isAfter(dayjs(normalized.end).endOf('day')))
      ) {
        return;
      }

      const isCovered = (loaded: LoadedRange) =>
        loaded.key === range.key ||
        (!dayjs(range.start).isBefore(dayjs(loaded.start)) &&
          !dayjs(range.end).isAfter(dayjs(loaded.end)));
      const covering = ranges.find(isCovered);
      if (covering) return queryClient.ensureQueryData(rangeQuery(covering));

      setRanges((current) =>
        current.some(isCovered) ? current : [...current, range]
      );
      return queryClient.ensureQueryData(rangeQuery(range));
    },
    [endDate, lazy, queryClient, ranges, startDate]
  );

  const refetch = useCallback(
    () => Promise.all(results.map((result) => result.refetch())),
    [results]
  );

  return {
    query: {
      data: events,
      isError: results.some((result) => result.isError),
      isPending: results[0]?.isPending ?? true,
      refetch,
    } satisfies CareEventsQuery,
    refetch,
    loadMonth,
  };
};