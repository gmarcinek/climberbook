'use client';

import { CalendarEvent } from '@api/db/types';
import { Calendar } from '@components/Calendar/Calendar';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { RangeNavigation } from '@components/RangeNavigation/RangeNavigation';
import { DashboardEventForm } from '@modules/DashboardPage/components/DashboardEventForm/DashboardEventForm';
import { UseQueryResult } from '@tanstack/react-query';
import { generateAbsArray } from '@utils/array';
import { useAppSearchParams } from '@utils/useAppSearchParams';
import classNames from 'classnames';
import dayjs from 'dayjs';
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import styles from './EditFormCalendar.module.scss';
import { useEditSelection } from './useEditSelection';
import { useRouter } from 'next/navigation';

interface EventFormCalendarProps {
  fetchEventsMutation: UseQueryResult<CalendarEvent[], Error>;
}

export const EditFormCalendar = (props: EventFormCalendarProps) => {
  const { fetchEventsMutation } = props;
  const router = useRouter();
  const { startDate, endDate, groupId, searchParams } = useAppSearchParams();
  const requestedReturnUrl = searchParams.get('returnUrl');
  const returnUrl =
    requestedReturnUrl?.startsWith('/alternating-care') === true
      ? requestedReturnUrl
      : `/alternating-care/calendar?startDate=${startDate}&endDate=${endDate}`;

  const {
    selection,
    handlers,
    setSelection,
    setIsMultiSelectionMode,
  } = useEditSelection({
    isMultiSelectionAvailable: true,
  });

  const sortedEvents = useMemo(() => {
    return fetchEventsMutation.data || ([] as CalendarEvent[]);
  }, [fetchEventsMutation.data]);
  const initialEvent = sortedEvents[0];
  const [draftEvent, setDraftEvent] = useState<CalendarEvent>();
  const [formWidth, setFormWidth] = useState(520);
  const eventDates = useMemo(() => {
    const dates = sortedEvents.map((event) => event.date);
    return dates.sort();
  }, [sortedEvents]);
  const eventDatesKey = eventDates.join('|');
  useEffect(() => {
    if (eventDates.length > 0) {
      setSelection(new Set(eventDates));
      setIsMultiSelectionMode(true);
    }
    // The serialized key prevents re-applying the same range on every render.
  }, [eventDatesKey, setSelection]);

  const formClasses = classNames(styles.editFormCalendar, 'py-2');
  const gridLength = 12;
  const previewEvents = useMemo(() => {
    if (!initialEvent) return [];
    const template = draftEvent ?? initialEvent;
    return Array.from(selection).map((date) => ({
      ...template,
      id: `${template.groupId}:${date}`,
      date,
      groupId: initialEvent.groupId,
    }));
  }, [draftEvent, initialEvent, selection]);

  const resizeColumns = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const page = event.currentTarget.parentElement;
      if (!page) return;
      const bounds = page.getBoundingClientRect();
      setFormWidth(
        Math.min(
          Math.max(bounds.width * 0.15, bounds.right - event.clientX),
          bounds.width * 0.75
        )
      );
    },
    []
  );

  return (
    <div
      className={styles.editFormCalendarPage}
      style={{ '--form-width': `${formWidth}px` } as CSSProperties}
    >
      <div className={styles.editCalendarColumn}>
        <div className='mt-4'>
          <RangeNavigation contentAlignment='center' />
        </div>

        <div className={formClasses}>
          {generateAbsArray(gridLength).map((m, index) => {
            return (
              <Calendar
                key={`month-plan-view-${index}`}
                className={styles.calendar}
                startDate={dayjs(startDate)
                  .add(index, 'month')
                  .startOf('month')
                  .format(dateFormat)}
                endDate={dayjs(startDate)
                  .add(index, 'month')
                  .endOf('month')
                  .add(1, 'day')
                  .format(dateFormat)}
                isTodayVisible
                isWeekendsVisible
                isAlternatingVisible={false}
                displayStrategy='separateMonths'
                events={previewEvents}
                {...handlers}
                selection={undefined}
                isMultiSelectionMode={false}
                hideSelectionCheckbox
              />
            );
          })}
        </div>
      </div>

      <div
        className={styles.columnAdjuster}
        role='separator'
        aria-label='Zmień szerokość kolumn'
        aria-orientation='vertical'
        tabIndex={0}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={resizeColumns}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={(event) => {
          const page = event.currentTarget.parentElement;
          if (!page) return;
          const width = page.getBoundingClientRect().width;
          if (event.key === 'ArrowLeft') {
            setFormWidth((current) => Math.min(width * 0.75, current + 20));
          }
          if (event.key === 'ArrowRight') {
            setFormWidth((current) => Math.max(width * 0.15, current - 20));
          }
        }}
      />

      <div className={styles.editFormPanel}>
        {initialEvent && (
          <DashboardEventForm
            selection={Array.from(selection)}
            setSelection={setSelection}
            setIsMultiSelectionMode={() => undefined}
            initialEvent={initialEvent}
            preserveGroupId
            submitLabel='Zapisz wydarzenie'
            staticLayout
            initialDates={eventDates}
            rangeStartDate={eventDates[0]}
            rangeEndDate={eventDates.at(-1)}
            confirmBeforeSave
            redirectAfterSave={returnUrl}
            onCancel={() => router.push(returnUrl)}
            onDraftChange={setDraftEvent}
            onSuccess={() => {
              void fetchEventsMutation.refetch();
            }}
          />
        )}
      </div>
    </div>
  );
};
