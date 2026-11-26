'use client';

import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { Avatar } from '@mui/material';
import { getTextColor } from '@utils/color';
import { PropsWithChildren } from 'react';
import { BiTrip } from 'react-icons/bi';
import { FaCampground } from 'react-icons/fa';
import { IoMdCalendar } from 'react-icons/io';
import {
  MdAssignment,
  MdBeachAccess,
  MdCake,
  MdCelebration,
  MdLocalCafe,
  MdLocalHospital,
  MdLocalMovies,
  MdMenuBook,
  MdOutlineTaskAlt,
  MdPhone,
  MdRestaurant,
  MdSchool,
  MdShoppingCart,
  MdSportsSoccer,
  MdWork,
} from 'react-icons/md';
interface CalendarEventAvatarProps extends PropsWithChildren {
  event?: CalendarEvent;
  className?: string;
  variant?: React.ComponentProps<typeof Avatar>['variant'];
  size?: 6 | 8 | 12 | 14 | 16 | 18 | 20 | 22 | 24 | 32 | 48 | 64 | 80 | 128;
}

export default function CalendarEventAvatar(props: CalendarEventAvatarProps) {
  const { event, variant = 'circular', size = 48, className } = props;
  const iconSize = size >= 20 ? size / 2 : size - 4;

  if (!event) {
    return;
  }

  return (
    <Avatar
      variant={variant}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: `${event.style?.background}`,
      }}
    >
      {event.type === CalendarEventType.Trip && (
        <BiTrip color={getTextColor(event.style?.background)} size={iconSize} />
      )}
      {event.type === CalendarEventType.Medical && (
        <MdLocalHospital
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Event && (
        <IoMdCalendar
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Birthday && (
        <MdCake color={getTextColor(event.style?.background)} size={iconSize} />
      )}
      {event.type === CalendarEventType.School && (
        <MdSchool
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Camp && (
        <FaCampground
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Culinary && (
        <MdRestaurant
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Coffee && (
        <MdLocalCafe
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Cinema && (
        <MdLocalMovies
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Sport && (
        <MdSportsSoccer
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Shopping && (
        <MdShoppingCart
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Holiday && (
        <MdCelebration
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Vacation && (
        <MdBeachAccess
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Errands && (
        <MdAssignment
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Tutoring && (
        <MdMenuBook
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Work && (
        <MdWork
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Phone && (
        <MdPhone
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
      {event.type === CalendarEventType.Todo && (
        <MdOutlineTaskAlt
          color={getTextColor(event.style?.background)}
          size={iconSize}
        />
      )}
    </Avatar>
  );
}
