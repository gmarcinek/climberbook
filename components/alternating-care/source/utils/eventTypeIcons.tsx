import { CalendarEventType } from '@api/db/types';
import type { IconType } from 'react-icons';
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
  MdPhone,
  MdRestaurant,
  MdSchool,
  MdShoppingCart,
  MdSportsSoccer,
  MdWork,
} from 'react-icons/md';

const EVENT_TYPE_ICONS: Partial<Record<CalendarEventType, IconType>> = {
  [CalendarEventType.Trip]: BiTrip,
  [CalendarEventType.Birthday]: MdCake,
  [CalendarEventType.Medical]: MdLocalHospital,
  [CalendarEventType.School]: MdSchool,
  [CalendarEventType.Camp]: FaCampground,
  [CalendarEventType.Culinary]: MdRestaurant,
  [CalendarEventType.Coffee]: MdLocalCafe,
  [CalendarEventType.Cinema]: MdLocalMovies,
  [CalendarEventType.Sport]: MdSportsSoccer,
  [CalendarEventType.Shopping]: MdShoppingCart,
  [CalendarEventType.Holiday]: MdCelebration,
  [CalendarEventType.Vacation]: MdBeachAccess,
  [CalendarEventType.Errands]: MdAssignment,
  [CalendarEventType.Tutoring]: MdMenuBook,
  [CalendarEventType.Work]: MdWork,
  [CalendarEventType.Phone]: MdPhone,
};

export const getEventTypeIcon = (type?: CalendarEventType): IconType =>
  (type && EVENT_TYPE_ICONS[type]) || IoMdCalendar;
