'use client';

import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { CalendarDayType } from '@components/Calendar/Calendar.types';
import { Stack } from '@components/Stack/Stack';
import { Divider } from '@nextui-org/react';
import classNames from 'classnames';
import dayjs, { Dayjs } from 'dayjs';
import { useMemo } from 'react';
import { useCalenderContext } from '../../Calendar.context';
import { CalendarItemStatusContainer } from '../CalendarItemStatusContainer/CalendarItemStatusContainer';
import styles from './CalendarItemBodySingle.module.scss';

interface CalendarItemBodySingleProps {
  day: CalendarDayType;
}

export function CalendarItemBodySingle(props: CalendarItemBodySingleProps) {
  const { day } = props;

  const currentDate = dayjs(day.date);
  const { isTodayVisible } = useCalenderContext();
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

  const itemClasses = classNames(styles.calendarItemBodySingleItem, {
    [styles.isWeekend]: [6, 0].includes(currentDate.day()),
    [styles.isTaoday]: isToday,
  });

  return (
    <CalendarItemStatusContainer
      isToday={isToday}
      isTodayVisible={isTodayVisible}
    >
      <Stack>
        {isFirstOfTheMonth && (
          <>
            <Divider className='my-0' />
            <Stack direction='horizontal' contentAlignment='start'>
              <h3>{currentDate.format('MMMM YYYY')}</h3>
            </Stack>
            <Divider className='my-0' />
          </>
        )}
        <div className={itemClasses}>
          <Stack className={label}>
            <div>
              <span>{label}</span>
            </div>
          </Stack>
        </div>
      </Stack>
    </CalendarItemStatusContainer>
  );
}

function toFormatedLabel(date: string | Dayjs) {
  const formated = dayjs(date).format('dddd DD MMMM YYYY');
  return formated.charAt(0).toUpperCase() + formated.slice(1, formated.length);
}
