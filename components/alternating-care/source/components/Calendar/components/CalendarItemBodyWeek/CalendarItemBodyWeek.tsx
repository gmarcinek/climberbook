'use client';

import { CalendarEventType } from '@api/db/types';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { CalendarDayType } from '@components/Calendar/Calendar.types';
import { useDayContainetRwd } from '@components/Calendar/hooks/useDayContainetRwd';
import { Stack } from '@components/Stack/Stack';
import { getTextColor } from '@utils/color';
import { capitalizeFirstLetter } from '@utils/string';
import classNames from 'classnames';
import dayjs, { Dayjs } from 'dayjs';
import { useMemo } from 'react';
import { useCalenderContext } from '../../Calendar.context';
import { useDayContainerBreakPointStyles } from '../../hooks/useDayContainerBreakPoint';
import { CalendarItemStatusContainer } from '../CalendarItemStatusContainer/CalendarItemStatusContainer';
import styles from './CalendarItemBodyWeek.module.scss';

interface CalendarItemBodyWeekProps {
  day: CalendarDayType;
}

export function CalendarItemBodyWeek(props: CalendarItemBodyWeekProps) {
  const { day } = props;
  const currentDate = dayjs(day.date);
  const {
    isAlternatingVisible,
    isWeekendsVisible,
    isTodayVisible,
    isPlanVisible,
    isEventsVisible,
    events,
    rowSize,
    containerWidth,
    displayStrategy,
    selection,
  } = useCalenderContext();

  const { style } = useDayContainerBreakPointStyles(rowSize, containerWidth);
  const { is320, is380 } = useDayContainetRwd(containerWidth);

  const isSelected = useMemo(() => {
    return (selection ?? []).toString().split(',').includes(day.date);
  }, [selection, day.date]);

  const { isToday, isFirstOfTheMonth } = useMemo(() => {
    return {
      isToday: currentDate.format(dateFormat) === dayjs().format(dateFormat),
      isFirstOfTheMonth:
        currentDate.format(dateFormat) ===
        currentDate.startOf('month').format(dateFormat),
    };
  }, [currentDate]);

  const isWeekend = isWeekendsVisible && [6, 0].includes(currentDate.day());
  const isAlternating =
    isAlternatingVisible &&
    events
      .map((item) => {
        return item.type === CalendarEventType.Alternating && item.date;
      })
      .includes(day.date);

  const event = events.find((item) => {
    return (
      item.type !== CalendarEventType.Alternating && item.date === day.date
    );
  });

  const itemClasses = classNames(styles.calendarItemBodyWeek, {
    [styles.smallPolygon]: is380,
    [styles.isWeekend]: isWeekend,
    [styles.isToday]: isTodayVisible && isToday,
    [styles.isFirstOfTheMonth]:
      displayStrategy === 'continous' && isFirstOfTheMonth,
    [styles.isAlternating]: isAlternating,
    [styles.isSelected]: isSelected,
  });
  const { dayName, dayNumber } = useMemo(() => {
    return {
      dayName: capitalizeFirstLetter(currentDate.format('dd')),
      dayNumber: currentDate.format('D'),
    };
  }, [currentDate]);

  const itemStyle = useMemo(() => {
    if (isEventsVisible) {
      return {
        ...style.style,
        backgroundColor: event?.style?.background,
        color: getTextColor(event?.style?.background),
      };
    }

    return style.style;
  }, [style.style, isPlanVisible, isEventsVisible, events]);

  return (
    <CalendarItemStatusContainer
      isAlternating={isAlternating}
      isWeekend={isWeekend}
      isToday={isToday}
      isTodayVisible={isTodayVisible}
      isFirstOfTheMonth={isFirstOfTheMonth}
      isSelected={isSelected}
    >
      <div
        className={itemClasses}
        style={{
          ...itemStyle,
        }}
      >
        <Stack gap={0} direction='horizontal'>
          <Stack gap={0}>
            <span>{dayName}</span>

            <span className='mt-1'>
              <big>
                <strong>{dayNumber}</strong>
              </big>
              {!is320 && <small>{currentDate.format('.MM')}</small>}
            </span>

            {!is320 && (
              <span className={styles.month}>
                <small>{currentDate.format('MMM')}</small>
              </span>
            )}
          </Stack>
        </Stack>
      </div>
    </CalendarItemStatusContainer>
  );
}

function toFormatedLabel(date: string | Dayjs) {
  return capitalizeFirstLetter(dayjs(date).format('dd'));
}
