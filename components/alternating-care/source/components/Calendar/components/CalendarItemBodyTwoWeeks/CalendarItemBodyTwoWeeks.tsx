import { CalendarEventType } from '@api/db/types';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { CalendarDayType } from '@components/Calendar/Calendar.types';
import { useDayContainetRwd } from '@components/Calendar/hooks/useDayContainetRwd';
import { Stack } from '@components/Stack/Stack';
import { useBreakpoints } from '@utils/useBreakpoints';
import classNames from 'classnames';
import dayjs, { Dayjs } from 'dayjs';
import { useMemo } from 'react';
import { useCalenderContext } from '../../Calendar.context';
import { CalendarItemStatusContainer } from '../CalendarItemStatusContainer/CalendarItemStatusContainer';
import styles from './CalendarItemBodyTwoWeeks.module.scss';

interface CalendarItemBodyTwooWeeksProps {
  day: CalendarDayType;
}

export function CalendarItemBodyTwoWeeks(
  props: CalendarItemBodyTwooWeeksProps
) {
  const { day } = props;
  const currentDate = dayjs(day.date);
  const {
    isAlternatingVisible,
    isWeekendsVisible,
    isTodayVisible,
    events,
    displayStrategy,
    containerWidth,
    selection,
  } = useCalenderContext();
  const { isTablet, isMobile } = useBreakpoints();
  const { is608, is1024 } = useDayContainetRwd(containerWidth);

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
  const isAlternating =
    isAlternatingVisible &&
    events
      .map((item) => {
        return item.type === CalendarEventType.Alternating && item.date;
      })
      .includes(day.date);

  const isSelected = useMemo(() => {
    return (selection ?? []).toString().split(',').includes(day.date);
  }, [selection, day.date]);

  const itemClasses = classNames(styles.calendarItemBodyTwoWeeksItem, {
    [styles.isWeekend]: isWeekend,
    [styles.isToday]: isTodayVisible && isToday,
    [styles.isAlternating]: isAlternating,

    [styles.smallPolygon]: is608,
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
      <div className={itemClasses}>
        <Stack className={label} gap={2}>
          <div className={textClasses}>{label}</div>
          <Stack
            gap={isTablet || isMobile ? 0 : 2}
            direction={isMobile ? 'vertical' : 'horizontal'}
            className={styles.content}
          >
            <big>
              <strong>{currentDate.format('D')}</strong>
              <small>{currentDate.format('.MM')}</small>
            </big>
          </Stack>
          {!is1024 && <small>{currentDate.format('MMM')}</small>}
        </Stack>
      </div>
    </CalendarItemStatusContainer>
  );
}

function toFormatedLabel(date: string | Dayjs) {
  const formated = dayjs(date).format('dd');
  return formated.charAt(0).toUpperCase() + formated.slice(1, formated.length);
}
