'use client';

import {
  dateFormat,
  normalizeCalendarRange,
} from '@components/Calendar/Calendar.helpers';
import { Stack } from '@components/Stack/Stack';
import { CalendarDate, parseDate } from '@internationalized/date';
import { Button, DateRangePicker, RangeValue } from '@nextui-org/react';
import { useAppSearchParams } from '@utils/useAppSearchParams';
import { useBreakpoints } from '@utils/useBreakpoints';
import { useUpdateQueryParam } from '@utils/useUpdateQueryParam';
import dayjs from 'dayjs';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from 'react-icons/md';

interface RangeNavigationProps {
  slowGranulation?: 'day' | 'week' | 'month';
  fastGranulation?: 'day' | 'year';
  count?: number;
  alignItems?: React.ComponentProps<typeof Stack>['itemsAlignment'];
  contentAlignment?: React.ComponentProps<typeof Stack>['contentAlignment'];
  buttonSize?: number;
  className?: string;
}

export const RangeNavigation = (props: RangeNavigationProps) => {
  const { startDate, endDate } = useAppSearchParams();
  const { isMax1024, isMobile, isMax768 } = useBreakpoints();
  const {
    alignItems,
    contentAlignment,
    className,
    buttonSize = isMax768 ? 32 : 24,
    fastGranulation = 'year',
    slowGranulation = 'month',
    count = 1,
  } = props;

  const endOfTheNthMonth = useCallback((date?: string, range = 11) => {
    return dayjs(date).add(range, 'month').endOf('month').format(dateFormat);
  }, []);

  const updateQueryParam = useUpdateQueryParam();

  const defaultDates = useMemo(() => {
    const start = dayjs(startDate).startOf('month').format(dateFormat);
    const end = endOfTheNthMonth(startDate);

    return {
      start,
      end,
    };
  }, [startDate, endDate]);

  const [parsedDates, setParsedDates] = useState({
    start: parseDate(defaultDates.start),
    end: parseDate(defaultDates.end),
  });

  useLayoutEffect(() => {
    if (!startDate) {
      updateQueryParam('startDate', defaultDates.start);
    }
    if (!endDate) {
      updateQueryParam('endDate', defaultDates.end);
    }
  }, [defaultDates, startDate, endDate]);

  const handlePickerOnChangeDates = useCallback(
    (value: RangeValue<CalendarDate>) => {
      const range = normalizeCalendarRange(
        value.start.toString(),
        value.end.toString()
      );
      const { start: startDate, end: endDate } = range;

      updateQueryParam('startDate', startDate);
      updateQueryParam('endDate', endDate);

      setParsedDates({
        start: parseDate(startDate),
        end: parseDate(endDate),
      });
    },
    [updateQueryParam, setParsedDates]
  );

  const handleResetDates = useCallback(() => {
    const startDate = dayjs().startOf('month').format(dateFormat);
    const endDate = endOfTheNthMonth(startDate);

    updateQueryParam('startDate', startDate);
    updateQueryParam('endDate', endDate);

    setParsedDates({
      start: parseDate(startDate),
      end: parseDate(endDate),
    });
  }, [updateQueryParam, setParsedDates]);

  const handleCurrentYear = useCallback(() => {
    const startDate = dayjs().startOf('year').format(dateFormat);
    const endDate = dayjs().endOf('year').format(dateFormat);

    updateQueryParam('startDate', startDate);
    updateQueryParam('endDate', endDate);

    setParsedDates({
      start: parseDate(startDate),
      end: parseDate(endDate),
    });
  }, [updateQueryParam, setParsedDates]);

  const handleUpdateRange = (
    direction: 'back' | 'forward',
    granular: 'month' | 'year' | 'week' | 'day',
    count: number
  ) => {
    const newStartDate = dayjs(startDate)
      [direction === 'back' ? 'subtract' : 'add'](count, granular)
      .format(dateFormat);

    const newEndDate = dayjs(endDate)
      [direction === 'back' ? 'subtract' : 'add'](count, granular)
      .format(dateFormat);

    setParsedDates({
      start: parseDate(newStartDate),
      end: parseDate(newEndDate),
    });

    updateQueryParam('startDate', newStartDate);
    updateQueryParam('endDate', newEndDate);
  };

  return (
    <Stack
      direction='horizontal'
      itemsAlignment={alignItems ?? 'center'}
      contentAlignment={contentAlignment ?? 'center'}
      className={className}
      gap={isMobile ? 0 : 16}
    >
      {!isMobile && (
        <MdKeyboardDoubleArrowLeft
          onClick={() => handleUpdateRange('back', fastGranulation, count)}
          size={buttonSize}
        />
      )}

      <MdKeyboardArrowLeft
        onClick={() => handleUpdateRange('back', slowGranulation, count)}
        size={buttonSize}
      />

      <div>
        <DateRangePicker
          variant='bordered'
          size={isMax768 ? 'lg' : 'sm'}
          value={parsedDates}
          onChange={handlePickerOnChangeDates}
          onKeyDown={(event) => event.preventDefault()}
        />
      </div>

      <MdKeyboardArrowRight
        onClick={() => handleUpdateRange('forward', slowGranulation, count)}
        size={buttonSize}
      />

      {!isMobile && (
        <MdKeyboardDoubleArrowRight
          onClick={() => handleUpdateRange('forward', fastGranulation, count)}
          size={buttonSize}
        />
      )}

      {!isMax1024 && (
        <Button
          size='sm'
          variant='ghost'
          onClick={handleCurrentYear}
          className='min-w-unit-12 px-2'
        >
          {dayjs().year()}
        </Button>
      )}

      {!isMax1024 && (
        <Button
          size='sm'
          variant='ghost'
          onClick={handleResetDates}
          className='min-w-unit-12 px-2'
        >
          Reset
        </Button>
      )}
    </Stack>
  );
};
