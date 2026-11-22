'use client';

import { CalendarEvent } from '@api/db/types';
import { Stack } from '@components/Stack/Stack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { Divider } from '@nextui-org/react';
import { colorNeutralGray900 } from '@utils/color';
import { GroupByDateType } from '@utils/dates';
import { capitalizeFirstLetter } from '@utils/string';
import dayjs from 'dayjs';
import { PropsWithChildren } from 'react';
import EventListItem from './components/EventListItem/EventListItem';

export interface CalendarEventListRenderProps extends PropsWithChildren {
  event: CalendarEvent;
}

interface EventListProps extends PropsWithChildren {
  date: string;
  endDate?: string;
  eventGroup: GroupByDateType;
  sideEndContent?: (props: CalendarEventListRenderProps) => React.ReactElement;
}

export default function EventList(props: EventListProps) {
  const { date, endDate, eventGroup, sideEndContent } = props;
  const currentDate = dayjs(date);

  return (
    <div id={`event-list-${date}`}>
      <Stack gap={4}>
        <div>
          <Divider className='my-2 mt-4' />
          <Stack direction='horizontal' gap={8}>
            <CalendarMonthIcon
              style={{
                color: colorNeutralGray900,
              }}
            />
            <h4 className='mb-1'>
              <span style={{ color: '#000000' }}>
                {capitalizeFirstLetter(currentDate.format('dddd'))}
              </span>{' '}
              <span>
                {capitalizeFirstLetter(currentDate.format('D MMMM YYYY'))}
              </span>
              {endDate && (
                <>
                  {' – '}
                  <span style={{ color: '#000000' }}>
                    {capitalizeFirstLetter(dayjs(endDate).format('dddd'))}
                  </span>{' '}
                  <span>
                    {capitalizeFirstLetter(
                      dayjs(endDate).format('D MMMM YYYY')
                    )}
                  </span>
                </>
              )}
            </h4>
          </Stack>
          <Divider className='mb-1 mt-1' />
        </div>

        {eventGroup.events.length > 0 &&
          eventGroup.events.map((event, index) => {
            return (
              <EventListItem
                key={`event-list-${event.name}-${index}`}
                event={event}
                sideEndContent={({ event }) => {
                  return <>{sideEndContent?.({ event })}</>;
                }}
              />
            );
          })}
      </Stack>
    </div>
  );
}
