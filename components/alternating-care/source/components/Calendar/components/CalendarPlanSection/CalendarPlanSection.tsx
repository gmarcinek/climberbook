'use client';

import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { CalendarDayType } from '@components/Calendar/Calendar.types';
import { Stack } from '@components/Stack/Stack';
import { toTransposeArray } from '@utils/array';
import { colorBlueGreen700, getTextColor } from '@utils/color';
import { useMemo } from 'react';
import CalendarEventAvatar from '../CalendarEventAvatar/CalendarEventAvatar';
import { CalendarItem } from '../CalendarItem/CalendarItem';
import styles from './CalendarPlanSection.module.scss';

interface CalendarPlanSectionProps {
  eventsOfTheWeek: CalendarEvent[];
  week: CalendarDayType[];
}
export function CalendarPlanSection(props: CalendarPlanSectionProps) {
  const { eventsOfTheWeek, week } = props;

  const grouppedDays = useMemo(() => {
    const weekDateRecord: Record<string, CalendarEvent[]> = {};
    const keys: Set<string> = new Set([]);

    // Prepare slots for potential events
    week.forEach((day) => {
      weekDateRecord[day.date] = [];
    });

    eventsOfTheWeek.forEach((event) => {
      keys.add(event.groupId);

      if (weekDateRecord[event.date]) {
        weekDateRecord[event.date].push(event);
      } else {
        weekDateRecord[event.date] = [];
        weekDateRecord[event.date].push(event);
      }
    });

    return Object.values(weekDateRecord).map((events) => {
      return sortAndFillEvents(events, Array.from(keys));
    });
  }, [eventsOfTheWeek]);

  if (eventsOfTheWeek.length === 0) {
    return;
  }

  const transposed = toTransposeArray(grouppedDays);

  return (
    <Stack className={styles.calendarPlanSection}>
      <Stack gap={8}>
        {transposed.map((events, groupIndex) => {
          const eventNonOffset = events.find((event) => event.name);
          const eventName = eventNonOffset?.name;
          const eventDate = eventNonOffset?.date;
          const eventStyle = eventNonOffset?.style;
          const eventDescription = eventNonOffset?.description;

          return (
            <div
              key={`week-pan-day-${groupIndex}`}
              className={styles.calendarPlanItem}
            >
              <Stack
                gap={0}
                className={styles.calendarPlanItem}
                direction='horizontal'
                style={{
                  background:
                    eventNonOffset?.type === CalendarEventType.Alternating
                      ? `${colorBlueGreen700}16`
                      : `${eventStyle?.background}16`,
                }}
              >
                {events.map((event, itemIndex) => {
                  const isOffset = event.type === CalendarEventType.Offset;

                  return (
                    <CalendarItem
                      isNoPadding
                      key={`week-day-${event.date}-${itemIndex}`}
                      title={`${eventDate} ${eventName} ${eventDescription}`}
                      day={{
                        date: event.date,
                        isOffset: event.type === CalendarEventType.Offset,
                      }}
                      mode='none'
                      className={styles.calendarPlanSectionItem}
                      style={{
                        background:
                          event.type === CalendarEventType.Alternating
                            ? colorBlueGreen700
                            : isOffset
                              ? 'transparent'
                              : `${event.style?.background}ff`,
                        color:
                          getTextColor(
                            event.type === CalendarEventType.Alternating
                              ? colorBlueGreen700
                              : event.style?.background
                          ) ?? event.style?.color,
                      }}
                    >
                      {itemIndex === 0 && (
                        <small style={{ paddingLeft: '4px' }}>
                          <Stack
                            direction='horizontal'
                            gap={2}
                            itemsAlignment='center'
                          >
                            <CalendarEventAvatar
                              event={eventNonOffset}
                              size={16}
                            />
                            <strong>{eventName}</strong>
                          </Stack>
                        </small>
                      )}
                    </CalendarItem>
                  );
                })}
              </Stack>
            </div>
          );
        })}
      </Stack>
    </Stack>
  );
}

function sortAndFillEvents(
  events: CalendarEvent[],
  keys: string[]
): CalendarEvent[] {
  // Mapowanie eventów według groupingId dla szybszego dostępu
  const eventsMap = events.reduce(
    (acc, event) => {
      acc[event.groupId] = event;
      return acc;
    },
    {} as Record<string, CalendarEvent>
  );

  // Wynikowa tablica posortowanych eventów z OFFSET w przypadku braku
  const sortedAndFilledEvents: CalendarEvent[] = keys.map((key) => {
    if (eventsMap[key]) {
      return eventsMap[key];
    } else {
      // Jeśli event dla danego groupId nie istnieje, wstawiamy OFFSET
      return {
        id: `offset-${key}`, // Generujemy unikalne ID dla OFFSET
        groupId: key, // Używamy brakującego klucza
        date: '', // Data może być pusta lub ustawiona na odpowiednią wartość
        creationTime: 0, // Data może być pusta lub ustawiona na odpowiednią wartość
        type: CalendarEventType.Offset, // Typ OFFSET
        issuer: '', // Puste pole issuer lub inna wartość
      };
    }
  });

  return sortedAndFilledEvents;
}
