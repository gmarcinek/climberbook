'use client';

import { CalendarEventType } from '@api/db/types';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { CalendarDayType } from '@components/Calendar/Calendar.types';
import { useDayContainetRwd } from '@components/Calendar/hooks/useDayContainetRwd';
import { Stack } from '@components/Stack/Stack';
import { getTextColor } from '@utils/color';
import { capitalizeFirstLetter } from '@utils/string';
import { caregiverBackground } from '@utils/caregiverColors';
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
    isOtherCareVisible,
    isWeekendsVisible,
    isTodayVisible,
    isPlanVisible,
    isEventsVisible,
    events,
    rowSize,
    containerWidth,
    displayStrategy,
    selection,
    caregiverColors,
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
  const careEvent = events.find(
    (item) =>
      item.type === CalendarEventType.Alternating && item.date === day.date
  );
  const isAlternating =
    isAlternatingVisible &&
    Boolean(
      careEvent &&
        (careEvent.groupId === CalendarEventType.Alternating ||
          careEvent.groupId.startsWith('CARE:self:'))
    );
  const caregiverCare =
    isOtherCareVisible &&
    careEvent &&
    careEvent.groupId.startsWith('CARE:') &&
    !careEvent.groupId.startsWith('CARE:self:')
      ? careEvent
      : null;

  const event = events.find((item) => {
    return (
      item.type !== CalendarEventType.Alternating && item.date === day.date
    );
  });

  // Care always wins over events; events only colour days without care.
  const eventColor =
    isEventsVisible && !isAlternating && !caregiverCare
      ? event?.style?.background
      : undefined;

  const itemClasses = classNames(styles.calendarItemBodyWeek, {
    [styles.hasEventColor]: Boolean(eventColor),
    [styles.smallPolygon]: is380,
    [styles.isWeekend]: isWeekend,
    [styles.isToday]: isTodayVisible && isToday,
    [styles.isFirstOfTheMonth]:
      displayStrategy === 'continous' && isFirstOfTheMonth,
    [styles.isAlternating]: isAlternating,
    [styles.isOtherCare]: Boolean(caregiverCare),
    [styles.isSelected]: isSelected,
  });
  const { dayName, dayNumber } = useMemo(() => {
    return {
      dayName: capitalizeFirstLetter(currentDate.format('dd')),
      dayNumber: currentDate.format('D'),
    };
  }, [currentDate]);

  const itemStyle = useMemo(() => {
    const caregiverColor = caregiverCare
      ? caregiverBackground(caregiverCare.groupId, caregiverColors)
      : undefined;
    // Timepage: user-picked caregiver colours win; events fill only free days.
    const customCareColor = caregiverCare
      ? caregiverColors?.[caregiverCare.groupId.replace(/^CARE:/, '')]
      : undefined;
    const eventVars = {
      ...(eventColor && {
        '--tp-event-color': eventColor,
        '--tp-event-text': getTextColor(eventColor),
      }),
      ...(customCareColor && {
        '--tp-care-color': customCareColor,
        '--tp-care-text': getTextColor(customCareColor),
      }),
    } as React.CSSProperties;
    if (isEventsVisible) {
      return {
        ...style.style,
        ...eventVars,
        backgroundColor: caregiverColor ?? eventColor,
        color: getTextColor(caregiverColor ?? eventColor),
      };
    }

    return caregiverColor
      ? {
          ...style.style,
          ...eventVars,
          backgroundColor: caregiverColor,
          color: getTextColor(caregiverColor),
        }
      : style.style;
  }, [
    caregiverCare,
    caregiverColors,
    eventColor,
    style.style,
    isEventsVisible,
  ]);

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
            <span className={styles.dayName}>{dayName}</span>

            <span className='mt-1'>
              <big>
                <strong>{dayNumber}</strong>
              </big>
              {!is320 && (
                <small className={styles.monthNumber}>
                  {currentDate.format('.MM')}
                </small>
              )}
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
