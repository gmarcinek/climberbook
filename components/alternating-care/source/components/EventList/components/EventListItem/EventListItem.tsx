'use client';

import { CalendarEvent } from '@api/db/types';
import CalendarEventAvatar from '@components/Calendar/components/CalendarEventAvatar/CalendarEventAvatar';
import { Stack } from '@components/Stack/Stack';
import { getTextColor } from '@utils/color';
import { PropsWithChildren, useMemo } from 'react';
import { EventItem } from '../EventItem/EventItem';
import style from './EventListItem.module.scss';

export interface EventListItemRenderProps extends PropsWithChildren {
  event: CalendarEvent;
}

interface EventListItemProps extends PropsWithChildren {
  event: CalendarEvent;
  paragraphClassName?: string;
  titleClassName?: string;
  className?: string;
  sideEndContent?: (props: EventListItemRenderProps) => React.ReactElement;
}

export default function EventListItem(props: EventListItemProps) {
  const {
    sideEndContent,
    event,
    paragraphClassName,
    titleClassName,
    className,
  } = props;

  const textColor = useMemo(() => {
    return getTextColor(event.style?.background);
  }, [event.style?.background]);

  const bg = useMemo(() => {
    return event.style?.background;
  }, [event.style?.background]);

  return (
    <Stack
      direction='horizontal'
      itemsAlignment='center'
      gap={12}
      className={className}
    >
      <div className={style.avatar}>
        <CalendarEventAvatar event={event} />
      </div>

      <EventItem
        event={event}
        className={style.eventListItem}
        style={{
          background: bg,
        }}
        sideEndContent={() => {
          return <Stack>{sideEndContent?.({ event })}</Stack>;
        }}
      >
        <div>
          <h4 className={titleClassName} style={{ color: textColor }}>
            <strong>{event.name}</strong>
          </h4>
          <p className={paragraphClassName} style={{ color: textColor }}>
            {event.description}
          </p>
        </div>
      </EventItem>
    </Stack>
  );
}
