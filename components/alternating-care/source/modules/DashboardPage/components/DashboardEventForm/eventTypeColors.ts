import { CalendarEventType } from '@api/db/types';

export const EVENT_TYPE_COLORS: Partial<Record<CalendarEventType, string>> = {
  [CalendarEventType.Event]: '#009688',
  [CalendarEventType.Trip]: '#42A5F5',
  [CalendarEventType.Birthday]: '#EC407A',
  [CalendarEventType.Medical]: '#E53935',
  [CalendarEventType.School]: '#3949AB',
  [CalendarEventType.Camp]: '#6D4C41',
  [CalendarEventType.Culinary]: '#FB8C00',
  [CalendarEventType.Coffee]: '#8D6E63',
  [CalendarEventType.Cinema]: '#8E24AA',
  [CalendarEventType.Sport]: '#43A047',
  [CalendarEventType.Shopping]: '#00ACC1',
  [CalendarEventType.Holiday]: '#C9A227',
  [CalendarEventType.Vacation]: '#FDD835',
  [CalendarEventType.Errands]: '#78909C',
  [CalendarEventType.Tutoring]: '#5E35B1',
  [CalendarEventType.Work]: '#455A64',
  [CalendarEventType.Phone]: '#0277BD',
  [CalendarEventType.Expense]: '#2E7D32',
};

export const DEFAULT_EVENT_COLOR = '#009688';

export const getEventTypeColor = (type?: CalendarEventType) =>
  (type && EVENT_TYPE_COLORS[type]) ?? DEFAULT_EVENT_COLOR;
