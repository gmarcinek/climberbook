'use client';

import { useDeleteEventMutation } from '@api/db/events/useDeleteEventMutation';
import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { useAppContext } from '@app/AppContext';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import EventList, {
  CalendarEventListRenderProps,
} from '@components/EventList/EventList';
import { Stack } from '@components/Stack/Stack';
import { useDashboardPageContext } from '@modules/DashboardPage/DashboardPage.context';
import { sortBy } from '@utils/array';
import { groupByDate, groupByEventRuns } from '@utils/dates';
import { useScrollToId } from '@utils/useScrollTo';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BsCalendar3, BsFilterCircle, BsSearch } from 'react-icons/bs';
import { MdDeleteForever, MdMoreVert } from 'react-icons/md';
import { incomingEventListI18n } from './incomingEventList.i18n';
import styles from './IncomingEventList.module.scss';

interface IncomingEventListProps {
  data: CalendarEvent[];
  selection: Set<string>;
}

export const IncomingEventList = (props: IncomingEventListProps) => {
  const { data, selection } = props;
  const eventListRef = useRef<HTMLDivElement>(null);

  const { language } = useAppContext();
  const i18n = incomingEventListI18n[language];

  const todayDate = dayjs().format(dateFormat);

  const { updateAllEvents } = useDashboardPageContext();
  const router = useRouter();

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;

      const clickedDetails = target.closest(
        'details[data-event-actions]'
      ) as HTMLDetailsElement | null;

      eventListRef.current
        ?.querySelectorAll<HTMLDetailsElement>(
          'details[data-event-actions][open]'
        )
        .forEach((details) => {
          if (details !== clickedDetails) details.open = false;
        });
    };

    document.addEventListener('click', closeMenus);
    return () => document.removeEventListener('click', closeMenus);
  }, []);

  const deleteMutation = useDeleteEventMutation({
    onSuccess() {
      updateAllEvents?.();
    },
  });

  const sortedEvents = useMemo(() => {
    return sortBy(data, 'creationTime');
  }, [data]);

  const nonAlternatingEvents = useMemo(() => {
    return (sortedEvents ?? [])
      .filter((item) => {
        return item.type !== CalendarEventType.Alternating;
      })
      .sort((itemA, itemB) => {
        return dayjs(itemA.date).isAfter(itemB.date) ? 1 : -1;
      });
  }, [sortedEvents, todayDate]);

  const sinceThisMonthGroupedEvents = useMemo(() => {
    return groupByDate(nonAlternatingEvents);
  }, [nonAlternatingEvents]);

  const hasSelectedDayEvents = useMemo(
    () =>
      sinceThisMonthGroupedEvents.some((group) => selection.has(group.date)),
    [sinceThisMonthGroupedEvents, selection]
  );

  const sinceTodayEvents = useMemo(() => {
    const yesterday = dayjs(todayDate).subtract(1, 'day');
    return groupByEventRuns(
      nonAlternatingEvents.filter((item) => dayjs(item.date).isAfter(yesterday))
    );
  }, [nonAlternatingEvents, todayDate]);

  const sideContent = ({ event }: CalendarEventListRenderProps) => {
    const { scrollToElement } = useScrollToId();
    const handleOnEditClick = useCallback(() => {
      const startDate = dayjs(event.date)
        .subtract(1, 'month')
        .startOf('month')
        .format(dateFormat);

      const endDate = dayjs(startDate)
        .add(11, 'month')
        .endOf('month')
        .format(dateFormat);

      router.push(
        `/alternating-care/edit?groupId=${event.groupId}&startDate=${startDate}&endDate=${endDate}`
      );
    }, [event.date, event.groupId]);

    return (
      <details data-event-actions style={{ position: 'relative' }}>
        <summary
          aria-label='Akcje wydarzenia'
          style={{
            display: 'grid',
            width: 42,
            height: 42,
            color: 'white',
            cursor: 'pointer',
            listStyle: 'none',
            placeItems: 'center',
          }}
        >
          <MdMoreVert size={26} />
        </summary>
        <div className={styles.actionsMenu}>
          <button
            type='button'
            className={styles.actionItem}
            onClick={() => {
              const isMobile = window.matchMedia('(max-width: 767px)').matches;
              router.push(
                `${isMobile ? '/alternating-care/calendar' : '/alternating-care'}?groupId=${event.groupId}`
              );
            }}
          >
            <BsFilterCircle size={20} aria-hidden />
            <span>
              {i18n.showAllOccurrences}
              <small>{i18n.showAllOccurrencesDescription}</small>
            </span>
          </button>
          <button
            type='button'
            className={styles.actionItem}
            onClick={handleOnEditClick}
          >
            <BsCalendar3 size={20} aria-hidden />
            <span>
              {i18n.edit}
              <small>{i18n.editDescription}</small>
            </span>
          </button>
          <button
            type='button'
            className={styles.actionItem}
            onClick={() => {
              if (document.getElementById(`day-${event.date}`)) {
                scrollToElement(`day-${event.date}`, 0, true);
                return;
              }
              const monthStart = dayjs(event.date)
                .startOf('month')
                .format(dateFormat);
              const monthEnd = dayjs(monthStart)
                .add(11, 'month')
                .endOf('month')
                .format(dateFormat);
              router.push(
                `/alternating-care/calendar?startDate=${monthStart}&endDate=${monthEnd}`
              );
            }}
          >
            <BsSearch size={20} aria-hidden />
            <span>
              {i18n.findTheDay}
              <small>{i18n.findTheDayDescription}</small>
            </span>
          </button>
          <button
            type='button'
            className={`${styles.actionItem} ${styles.danger}`}
            onClick={() => deleteMutation.mutate(event)}
          >
            <MdDeleteForever size={20} aria-hidden />
            <span>
              {i18n.delete}
              <small>{i18n.deleteDescription}</small>
            </span>
          </button>
        </div>
      </details>
    );
  };

  return (
    <Stack className='mt-0' ref={eventListRef}>
      <Stack gap={8}>
        {selection.size === 0 && (
          <div>
            {sinceTodayEvents.length === 0 && <Stack>{i18n.emptyInfo}</Stack>}
            {sinceTodayEvents.length !== 0 && <h3>{i18n.approachingEvents}</h3>}

            {sinceTodayEvents.map((dayGroup, indexGroup) => {
              return (
                <EventList
                  key={`dayGroup-${dayGroup.date}-${dayGroup.endDate}-${indexGroup}`}
                  date={dayGroup.date}
                  endDate={dayGroup.endDate}
                  eventGroup={dayGroup}
                  sideEndContent={sideContent}
                />
              );
            })}
          </div>
        )}

        {selection.size !== 0 && (
          <div className='mt-8'>
            <h3>
              <strong>{i18n.selectedDayRangeEvents}</strong>
            </h3>
            {!hasSelectedDayEvents && <p>{i18n.selectedDaysEmpty}</p>}
            {Array.from(selection).map((selectedItem, index) => {
              return (
                <div key={`dayselect-${selectedItem}-${index}`}>
                  {sinceThisMonthGroupedEvents
                    .filter((group) => {
                      return selectedItem.includes(group.date);
                    })
                    .map((dayGroup, indexGroup) => {
                      return (
                        <EventList
                          key={`dayGroup-${dayGroup.date}-${indexGroup}`}
                          date={dayGroup.date}
                          eventGroup={dayGroup}
                          sideEndContent={sideContent}
                        />
                      );
                    })}
                </div>
              );
            })}
          </div>
        )}
      </Stack>
    </Stack>
  );
};
