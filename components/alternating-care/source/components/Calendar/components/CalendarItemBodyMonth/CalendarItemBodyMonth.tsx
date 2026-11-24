'use client';

import { CalendarEventType } from '@api/db/types';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { CalendarDayType } from '@components/Calendar/Calendar.types';
import { useDayContainetRwd } from '@components/Calendar/hooks/useDayContainetRwd';
import { Stack } from '@components/Stack/Stack';
import { useBreakpoints } from '@utils/useBreakpoints';
import { caregiverBackground } from '@utils/caregiverColors';
import classNames from 'classnames';
import dayjs, { Dayjs } from 'dayjs';
import { useMemo } from 'react';
import { useCalenderContext } from '../../Calendar.context';
import { CalendarItemStatusContainer } from '../CalendarItemStatusContainer/CalendarItemStatusContainer';
import styles from './CalendarItemBodyMonth.module.scss';

interface CalendarItemBodyMonthProps {
  day: CalendarDayType;
}

export function CalendarItemBodyMonth(props: CalendarItemBodyMonthProps) {
  const { day } = props;
  const currentDate = dayjs(day.date);
  const {
    isAlternatingVisible,
    isOtherCareVisible,
    isWeekendsVisible,
    isTodayVisible,
    events,
    selection,
    containerWidth,
    displayStrategy,
    caregiverColors,
  } = useCalenderContext();
  const { isTablet, isMobile } = useBreakpoints();
  const { is1280, is1024, is1504 } = useDayContainetRwd(containerWidth);
  const { isToday, isFirstOfTheMonth } = useMemo(() => {
    return {
      isToday: currentDate.format(dateFormat) === dayjs().format(dateFormat),
      isFirstOfTheMonth:
        currentDate.format(dateFormat) ===
        currentDate.startOf('month').format(dateFormat),
    };
  }, [currentDate]);

  const { label } = useMemo(() => {
    return {
      label: toFormatedLabel(currentDate),
    };
  }, [currentDate]);

  const textClasses = classNames(styles.textItem, {
    [styles.hiden]: isMobile,
  });

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

  const isSelected = useMemo(() => {
    return (selection ?? []).toString().split(',').includes(day.date);
  }, [selection, day.date]);

  const itemClasses = classNames(styles.calendarItemBodyMonthItem, {
    [styles.isWeekend]: isWeekend,
    [styles.isToday]: isTodayVisible && isToday,
    [styles.isAlternating]: isAlternating,

    [styles.smallPolygon]: is1024,
    [styles.isFirstOfTheMonth]:
      displayStrategy === 'continous' && isFirstOfTheMonth,
    [styles.isSelected]: isSelected,
  });

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
        style={
          caregiverCare
            ? {
                backgroundColor: caregiverBackground(caregiverCare.groupId, caregiverColors),
                color: '#fff',
              }
            : undefined
        }
      >
        <Stack className={label} gap={2}>
          <div className={textClasses}>{label}</div>
          <Stack
            gap={isTablet || isMobile ? 0 : 2}
            direction={isMobile ? 'vertical' : 'horizontal'}
            className={styles.content}
          >
            <>
              <strong>{currentDate.format('D')}</strong>
              {!is1504 && <small>{currentDate.format('.MM')}</small>}
            </>
          </Stack>
          {!is1280 && <small>{currentDate.format('MMM')}</small>}
        </Stack>
      </div>
    </CalendarItemStatusContainer>
  );
}

function toFormatedLabel(date: string | Dayjs) {
  const formated = dayjs(date).format('dd');
  return formated.charAt(0).toUpperCase() + formated.slice(1, formated.length);
}
