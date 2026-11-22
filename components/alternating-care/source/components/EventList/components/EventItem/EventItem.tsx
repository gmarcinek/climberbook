'use client';

import { CalendarEvent } from '@api/db/types';
import { Stack } from '@components/Stack/Stack';
import classNames from 'classnames';
import { CSSProperties, PropsWithChildren } from 'react';
import styles from './EventItem.module.scss';

interface EventItemRenderProps extends PropsWithChildren {
  event: CalendarEvent;
}

interface EventItemProps extends PropsWithChildren {
  event: CalendarEvent;
  className?: string;
  title?: string;
  style?: CSSProperties;
  isNoPadding?: boolean;
  sideEndContent?: (props: EventItemRenderProps) => React.ReactElement;
}

export function EventItem(props: EventItemProps) {
  const { event, className, sideEndContent, style, isNoPadding, children } =
    props;

  const itemClasses = classNames(
    styles.eventItem,
    {
      [styles.isNoPadding]: isNoPadding,
    },
    className
  );

  return (
    <Stack
      className={itemClasses}
      style={style}
      direction='horizontal'
      itemsAlignment='center'
      contentAlignment='between'
    >
      <div>{children}</div>
      <div>{sideEndContent?.({ event })}</div>
    </Stack>
  );
}
