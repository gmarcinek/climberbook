import { CalendarEvent, CalendarEventType } from '@api/db/types';
import dayjs from 'dayjs';

export type PhotoEventOption = {
  groupId: string;
  label: string;
  date: string;
  end?: string;
  /** Exact days of the group (recurring events have gaps between date and end). */
  days?: string[];
};

const HIDDEN_OPTION_TYPES: string[] = [
  CalendarEventType.Alternating,
  CalendarEventType.Offset,
  CalendarEventType.Todo,
];

/** One option per event group, spanning all its days. */
export const toEventOptions = (events: CalendarEvent[]): PhotoEventOption[] => {
  const byGroup = new Map<string, PhotoEventOption>();
  events
    .filter((event) => !HIDDEN_OPTION_TYPES.includes(event.type))
    .forEach((event) => {
      const option = byGroup.get(event.groupId);
      if (!option) {
        byGroup.set(event.groupId, {
          groupId: event.groupId,
          label: event.name || event.type,
          date: event.date,
          end: event.date,
          days: [event.date],
        });
        return;
      }
      option.days = [...(option.days ?? []), event.date];
      if (event.date < option.date) option.date = event.date;
      if (event.date > (option.end ?? option.date)) option.end = event.date;
    });
  return [...byGroup.values()];
};

const dayDistance = (option: PhotoEventOption, date: string) => {
  const target = dayjs(date);
  if (option.days?.length) {
    return Math.min(...option.days.map((day) => Math.abs(target.diff(dayjs(day), 'day'))));
  }
  const end = option.end ?? option.date;
  if (date >= option.date && date <= end) return 0;
  return Math.min(
    Math.abs(target.diff(dayjs(option.date), 'day')),
    Math.abs(target.diff(dayjs(end), 'day')),
  );
};

/** Events closest in time to the given date first; ties newest first. */
export const sortByProximity = (options: PhotoEventOption[], date: string) =>
  [...options].sort(
    (left, right) =>
      dayDistance(left, date) - dayDistance(right, date) ||
      right.date.localeCompare(left.date),
  );

/** Events whose days include the given date. */
export const eventsOnDate = (options: PhotoEventOption[], date: string) =>
  options.filter((option) =>
    option.days
      ? option.days.includes(date)
      : date >= option.date && date <= (option.end ?? option.date),
  );

export const formatEventOption = (option: PhotoEventOption) =>
  option.end && option.end !== option.date
    ? `${option.label} · ${option.date} – ${option.end}`
    : `${option.label} · ${option.date}`;
