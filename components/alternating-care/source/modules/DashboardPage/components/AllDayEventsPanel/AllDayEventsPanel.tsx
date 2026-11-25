'use client';

import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { useAppContext } from '@app/AppContext';
import CalendarEventAvatar from '@components/Calendar/components/CalendarEventAvatar/CalendarEventAvatar';
import dayjs from 'dayjs';
import { CalendarDays, Pencil, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import styles from './AllDayEventsPanel.module.scss';

interface AllDayEventsPanelProps {
  events: CalendarEvent[];
  onEdit: (event: CalendarEvent) => void;
}

interface AllDayEventRun {
  event: CalendarEvent;
  endDate: string;
}

export function AllDayEventsPanel({
  events,
  onEdit,
}: AllDayEventsPanelProps) {
  const { language } = useAppContext();
  const today = dayjs().format('YYYY-MM-DD');
  const [selectedRun, setSelectedRun] = useState<AllDayEventRun>();
  const allDayEvents = useMemo(() => {
    const grouped = new Map<string, AllDayEventRun>();

    for (const event of events) {
      if (
        event.type === CalendarEventType.Alternating ||
        event.type === CalendarEventType.Todo ||
        event.startTime !== undefined
      ) {
        continue;
      }

      const existing = grouped.get(event.groupId);
      if (!existing) {
        grouped.set(event.groupId, { event, endDate: event.date });
        continue;
      }
      if (event.date < existing.event.date) {
        existing.event = event;
      }
      if (event.date > existing.endDate) {
        existing.endDate = event.date;
      }
    }

    return [...grouped.values()]
      .filter(
        ({ event, endDate }) => event.date <= today && endDate >= today,
      )
      .sort(
        (left, right) =>
          left.event.date.localeCompare(right.event.date) ||
          left.event.creationTime - right.event.creationTime,
      );
  }, [events, today]);

  if (allDayEvents.length === 0) return null;

  return (
    <section className={styles.panel} aria-labelledby="all-day-events-title">
      <header>
        <div>
          <CalendarDays size={18} aria-hidden />
          <h3 id="all-day-events-title">
            {language === 'pl' ? 'Trwające wydarzenia' : 'Ongoing events'}
          </h3>
        </div>
        <span>{allDayEvents.length}</span>
      </header>
      <ul>
        {allDayEvents.map(({ event, endDate }) => {
          const startLabel = dayjs(event.date).locale(language).format('D MMM');
          const endLabel =
            endDate === event.date
              ? startLabel
              : `${startLabel} – ${dayjs(endDate)
                  .locale(language)
                  .format('D MMM')}`;
          return (
            <li
              key={event.groupId}
              style={
                {
                  '--event-color':
                    event.style?.background ?? '#2d8dbf',
                } as CSSProperties
              }
            >
              <button
                type="button"
                onClick={() => setSelectedRun({ event, endDate })}
              >
                <span className={styles.icon}>
                  <CalendarEventAvatar
                    event={event}
                    size={64}
                    variant="square"
                  />
                </span>
                <span className={styles.copy}>
                  <small>{endLabel}</small>
                  <strong>
                    {event.name ||
                      (language === 'pl'
                        ? 'Wydarzenie całodniowe'
                        : 'All-day event')}
                  </strong>
                  {event.description && <p>{event.description}</p>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {selectedRun &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onMouseDown={() => setSelectedRun(undefined)}
          >
            <section
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="all-day-event-preview-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header>
                <div>
                  <small>
                    {language === 'pl'
                      ? 'Wydarzenie całodniowe'
                      : 'All-day event'}
                  </small>
                  <h3 id="all-day-event-preview-title">
                    {selectedRun.event.name ||
                      (language === 'pl'
                        ? 'Szczegóły wydarzenia'
                        : 'Event details')}
                  </h3>
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => {
                      onEdit(selectedRun.event);
                      setSelectedRun(undefined);
                    }}
                  >
                    <Pencil size={15} aria-hidden />
                    {language === 'pl' ? 'Edycja' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    aria-label={language === 'pl' ? 'Zamknij' : 'Close'}
                    onClick={() => setSelectedRun(undefined)}
                  >
                    <X size={18} aria-hidden />
                  </button>
                </div>
              </header>
              <div className={styles.previewDate}>
                <CalendarDays size={18} aria-hidden />
                <span>
                  {selectedRun.endDate === selectedRun.event.date
                    ? dayjs(selectedRun.event.date)
                        .locale(language)
                        .format('D MMMM YYYY')
                    : `${dayjs(selectedRun.event.date)
                        .locale(language)
                        .format('D MMMM')} – ${dayjs(selectedRun.endDate)
                        .locale(language)
                        .format('D MMMM YYYY')}`}
                </span>
              </div>
              {selectedRun.event.description && (
                <p className={styles.previewDescription}>
                  {selectedRun.event.description}
                </p>
              )}
            </section>
          </div>,
          document.body,
        )}
    </section>
  );
}
