'use client';

import { CalendarDayType } from '@components/Calendar/Calendar.types';
import { Stack } from '@components/Stack/Stack';
import { Divider } from '@nextui-org/react';
import { colorRed500 } from '@utils/color';
import { capitalizeFirstLetter } from '@utils/string';
import dayjs from 'dayjs';
import { useCalenderContext } from '../../Calendar.context';

interface CalendarWeekInfoSectionProps {
  week: CalendarDayType[];
}

export default function CalendarWeekInfoSection(
  props: CalendarWeekInfoSectionProps
) {
  const { week } = props;
  const { rowSize } = useCalenderContext();

  const dayAlpha = week[0];
  const dayOmega = week[week.length - 1];

  const dateAlpha = dayjs(dayAlpha.date);
  const dateOmega = dayjs(dayOmega.date);
  const monthName = capitalizeFirstLetter(dateAlpha.format('MMMM'));
  const endMmonthName = capitalizeFirstLetter(dateOmega.format('MMMM'));
  const yearName = dateOmega.format('YYYY');

  return (
    <div className='mt-3'>
      {rowSize === 7 && (
        <Stack direction='horizontal' contentAlignment='between'>
          <div>
            <span>
              {monthName === endMmonthName ? (
                <strong>{monthName}</strong>
              ) : (
                <span>
                  {monthName} /{' '}
                  <strong style={{ color: colorRed500 }}>
                    {endMmonthName}
                  </strong>
                </span>
              )}{' '}
              {yearName}
            </span>
          </div>{' '}
          <div>
            <small>
              {dateAlpha.format('DD.MM')}
              {'-'}
              {dateOmega.format('DD.MM')}
            </small>
          </div>
        </Stack>
      )}
      {rowSize === 14 && (
        <Stack direction='horizontal' contentAlignment='between'>
          <div>
            <span>
              {monthName === endMmonthName ? (
                <strong>{monthName}</strong>
              ) : (
                <span>
                  {monthName} /{' '}
                  <strong style={{ color: colorRed500 }}>
                    {endMmonthName}
                  </strong>
                </span>
              )}{' '}
              {yearName}
            </span>
          </div>{' '}
          <div>
            <small>
              {dateAlpha.format('DD.MM')}
              {'-'}
              {dateOmega.format('DD.MM')}
            </small>
          </div>
        </Stack>
      )}
      {rowSize === 21 && (
        <Stack direction='horizontal' contentAlignment='between'>
          <div>
            <span>
              {monthName === endMmonthName ? (
                <strong>{monthName}</strong>
              ) : (
                <span>
                  {monthName} /{' '}
                  <strong style={{ color: colorRed500 }}>
                    {endMmonthName}
                  </strong>
                </span>
              )}{' '}
              {yearName}
            </span>
          </div>{' '}
          <div>
            <small>
              {dateAlpha.format('DD.MM')}
              {'-'}
              {dateOmega.format('DD.MM')}
            </small>
          </div>
        </Stack>
      )}
      {rowSize === 28 && (
        <Stack direction='horizontal' contentAlignment='between'>
          <div>
            <span>
              {monthName === endMmonthName ? (
                <strong>{monthName}</strong>
              ) : (
                <span>
                  {monthName} /{' '}
                  <strong style={{ color: colorRed500 }}>
                    {endMmonthName}
                  </strong>
                </span>
              )}{' '}
              {yearName}
            </span>
          </div>{' '}
          <div>
            <small>
              {dateAlpha.format('DD.MM')}
              {'-'}
              {dateOmega.format('DD.MM')}
            </small>
          </div>
        </Stack>
      )}
      {rowSize === 30 && (
        <>
          <Divider className='mb-2' />
          <Stack direction='horizontal' contentAlignment='between'>
            <div>
              <h3>
                <strong style={{ color: colorRed500 }}>{monthName}</strong>{' '}
                {yearName}
              </h3>
            </div>
            <div>
              {dateAlpha.format('DD.MM')}
              {'-'}
              {dateOmega.format('DD.MM')}
            </div>
          </Stack>
          <Divider className='mb-4 mt-1' />
        </>
      )}
    </div>
  );
}
