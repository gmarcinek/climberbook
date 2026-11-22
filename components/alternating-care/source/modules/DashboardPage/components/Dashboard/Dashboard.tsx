'use client';

import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { useAppContext } from '@app/AppContext';
import { Calendar } from '@components/Calendar/Calendar';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import type { CareEventsQuery } from '@api/db/events/useGetAllEventsQuery';
import { listCareEvents } from '@api/db/events/careEventsApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sortBy } from '@utils/array';
import { useAppSearchParams } from '@utils/useAppSearchParams';
import classNames from 'classnames';
import dayjs from 'dayjs';

import { CalendarRange, PencilLine } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useLongPress } from 'use-long-press';
import { useDashboardPageContext } from '@modules/DashboardPage/DashboardPage.context';
import { CalendarFormSection } from '../CalendarFormSection/CalendarFormSection';
import { CalendarGrid } from '../CalendarGrid/CalendarGrid';
import { CalendarSettingsSection } from '../CalendarSettingsSection/CalendarSettingsSection';
import { CareSummary } from '../CareSummary/CareSummary';
import { IncomingEventList } from '../IncomingEventList/IncomingEventList';
import { MobileEventForm } from '../MobileEventForm/MobileEventForm';
import { useCareEditMode } from './useCareEditMode';
import { useRowSize } from './useRowSize';
import { useSelection } from './useSelection';

import { ScrollPane } from '@/components/climberbook/common/ScrollPane';
import { useBreakpoints } from '@utils/useBreakpoints';
import { useEventCounter } from '@utils/useEventCounter';
import { useOtherParent } from '@utils/useOtherParent';
import styles from './Dashboard.module.scss';

interface DashboardProps {
  fetchEventsQuery: CareEventsQuery;
  loadMonth: (
    date: string,
    ignoreBounds?: boolean
  ) => Promise<CalendarEvent[] | void>;
  mobileView: DashboardMobileView;
}

export type DashboardMobileView = 'care' | 'calendar' | 'add';

const mobileViewPaths: Record<DashboardMobileView, string> = {
  care: '/alternating-care',
  calendar: '/alternating-care/calendar',
  add: '/alternating-care/add',
};

export const Dashboard = (props: DashboardProps) => {
  const { fetchEventsQuery, loadMonth, mobileView } = props;
  const { user, language } = useAppContext();
  const { profile: otherParent } = useOtherParent();
  const userFirstName = user.name.trim().split(/\s+/)[0] || 'Moja';
  const { is1280 } = useBreakpoints();
  const [isMobileLayout, setIsMobileLayout] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches
  );
  const { countEvents } = useEventCounter({
    events: fetchEventsQuery.data,
  });

  const { groupId, startDate, endDate, searchParams } = useAppSearchParams();
  const isPlanInUrl = searchParams.get('plan') === '1';
  const {
    selection,
    handlers,
    isMultiSelectionMode,
    setIsMultiSelectionMode,
    handleCancelMultiSelect,
    setSelection,
  } = useSelection({
    isMultiSelectionAvailable: true,
  });
  const [isPlanVisible, setIsPlanVisible] = useState(isPlanInUrl);
  const [isAlternatingVisible, setIsAlternatingVisible] = useState(true);
  const [isOtherCareVisible, setIsOtherCareVisible] = useState(true);
  const [isEventsVisible, setIsEventsVisible] = useState(true);
  const [formWidth, setFormWidth] = useState(520);
  const upcomingQuery = useQuery({
    queryKey: ['careUpcoming', dayjs().format(dateFormat)],
    queryFn: () =>
      listCareEvents({
        start: dayjs().format(dateFormat),
        end: dayjs().add(180, 'day').format(dateFormat),
      }),
    enabled: isMobileLayout && mobileView === 'care',
  });
  const queryClient = useQueryClient();
  const { updateAllEvents } = useDashboardPageContext();
  const careEdit = useCareEditMode({
    events: fetchEventsQuery.data ?? [],
    onSaved: () => updateAllEvents?.(),
  });
  const isCareEditActive =
    careEdit.isActive &&
    ((!isMobileLayout) || mobileView === 'calendar');
  const emptySelection = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    setIsPlanVisible(isPlanInUrl);
  }, [isPlanInUrl]);

  const mobileHref = useCallback(
    (view: DashboardMobileView, plan = isPlanVisible) => {
      const params = new URLSearchParams(searchParams.toString());
      if (plan) params.set('plan', '1');
      else params.delete('plan');
      const query = params.toString();
      return `${mobileViewPaths[view]}${query ? `?${query}` : ''}`;
    },
    [isPlanVisible, searchParams]
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const updateLayout = () => {
      setIsMobileLayout(media.matches);
      document.documentElement.classList.toggle(
        'alternating-care-mobile-scroll',
        media.matches
      );
      document.body.classList.toggle(
        'alternating-care-mobile-scroll',
        media.matches
      );
    };
    updateLayout();
    media.addEventListener('change', updateLayout);
    return () => {
      media.removeEventListener('change', updateLayout);
      document.documentElement.classList.remove(
        'alternating-care-mobile-scroll'
      );
      document.body.classList.remove('alternating-care-mobile-scroll');
    };
  }, []);

  const dashboardClasses = classNames(styles.dashboard, {
    [styles.isPlanVisible]: isPlanVisible,
  });

  const formClasses = classNames(styles.formContainer);

  const handleLongPress = useCallback(() => {
    setIsMultiSelectionMode(true);
  }, []);

  const bind = useLongPress(handleLongPress, {
    filterEvents: (event) => true,
    threshold: 500,
    captureEvent: true,
    cancelOnMovement: 25,
    cancelOutsideElement: true,
  });

  // Resize limits stay identical for pointer and keyboard input.
  const resizeColumns = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const dashboard = event.currentTarget.parentElement;
      if (!dashboard) return;
      const bounds = dashboard.getBoundingClientRect();
      const minWidth = bounds.width * 0.15;
      const maxWidth = bounds.width * 0.75;
      const nextWidth = Math.min(
        Math.max(minWidth, bounds.right - event.clientX),
        maxWidth
      );
      setFormWidth(nextWidth);
    },
    []
  );

  const filteredEvents = useMemo(() => {
    const data = fetchEventsQuery.data || ([] as CalendarEvent[]);

    return !groupId
      ? fetchEventsQuery.data || ([] as CalendarEvent[])
      : data.filter(
          (item) =>
            item.groupId === groupId || item.groupId === groupId?.toUpperCase()
        );
  }, [fetchEventsQuery.data, groupId]);

  const sortedEvents = useMemo(() => {
    const data = filteredEvents;
    return sortBy(data, 'creationTime');
  }, [fetchEventsQuery.data, filteredEvents]);

  const { automaticRowSize } = useRowSize({
    isPlanVisible,
  });

  const startingDate = dayjs(startDate).format(dateFormat);
  const alternatingCount = countEvents({
    endDate,
    startDate,
    eventType: CalendarEventType.Alternating,
  });

  return (
    <div
      className={dashboardClasses}
      id='dashboard'
      style={{ '--form-width': `${formWidth}px` } as CSSProperties}
    >
      <div className={styles.calendarPane}>
        <ScrollPane
          className={styles.calendarContainer}
          contentClassName={styles.calendarContent}
          style={{ height: isMobileLayout ? 'calc(100dvh - 48px)' : '100%' }}
          viewportStyle={{
            height: isMobileLayout ? 'calc(100dvh - 48px)' : '100%',
            overflowY: 'auto',
          }}
        >
        {isMobileLayout && (
          <nav
            className={classNames(styles.mobileTabs, {
              [styles.withPlanToggle]: mobileView === 'calendar',
            })}
            aria-label='Widok mobilny'
          >
            <Link
              href={mobileHref('care')}
              className={mobileView === 'care' ? styles.activeTab : undefined}
              aria-current={mobileView === 'care' ? 'page' : undefined}
            >
              {language === 'en' ? 'Care' : 'Opieka'}
            </Link>
            <Link
              href={mobileHref('calendar')}
              className={
                mobileView === 'calendar' ? styles.activeTab : undefined
              }
              aria-current={mobileView === 'calendar' ? 'page' : undefined}
            >
              {language === 'en' ? 'Calendar' : 'Kalendarz'}
            </Link>
            <Link
              href={mobileHref('add')}
              className={mobileView === 'add' ? styles.activeTab : undefined}
              aria-current={mobileView === 'add' ? 'page' : undefined}
            >
              {language === 'en' ? 'Add' : 'Dodaj'}
            </Link>
            <Link href='/settings'>
              {language === 'en' ? 'Settings' : 'Ustawienia'}
            </Link>
            {false && mobileView === 'calendar' && (
              <Link
                href={mobileHref('calendar', !isPlanVisible)}
                className={classNames(styles.planToggle, {
                  [styles.planToggleActive]: isPlanVisible,
                })}
                aria-pressed={isPlanVisible}
                aria-label={language === 'en' ? 'Plan view' : 'Widok planu'}
                title={language === 'en' ? 'Plan view' : 'Widok planu'}
              >
                <CalendarRange size={20} aria-hidden />
              </Link>
            )}
            {mobileView === 'calendar' && (
              <button
                type='button'
                onClick={isCareEditActive ? careEdit.cancel : careEdit.start}
                className={classNames(styles.planToggle, {
                  [styles.planToggleActive]: isCareEditActive,
                })}
                aria-pressed={isCareEditActive}
                aria-label={language === 'en' ? 'Edit care' : 'Edytuj opiekę'}
                title={language === 'en' ? 'Edit care' : 'Edytuj opiekę'}
              >
                <PencilLine size={20} aria-hidden />
              </button>
            )}
          </nav>
        )}
        {isMobileLayout &&
          isCareEditActive &&
          createPortal(
            <div className={styles.careEditBar} role='status'>
              <span>
                {careEdit.isSaving
                  ? language === 'en'
                    ? 'Saving…'
                    : 'Zapisywanie…'
                  : careEdit.isError
                    ? language === 'en'
                      ? 'Saving failed – try again'
                      : 'Nie udało się zapisać – spróbuj ponownie'
                    : careEdit.changedCount > 0
                      ? language === 'en'
                        ? `Changed days: ${careEdit.changedCount}`
                        : `Zmienione dni: ${careEdit.changedCount}`
                      : language === 'en'
                        ? 'Click days to toggle care'
                        : 'Klikaj dni, aby zmienić opiekę'}
              </span>
              <div className={styles.careEditActions}>
                <button
                  type='button'
                  onClick={careEdit.cancel}
                  disabled={careEdit.isSaving}
                >
                  {language === 'en' ? 'Cancel' : 'Anuluj'}
                </button>
                <button
                  type='button'
                  className={styles.careEditSave}
                  onClick={careEdit.save}
                  disabled={careEdit.isSaving}
                >
                  {language === 'en' ? 'Confirm' : 'Zatwierdź'}
                </button>
              </div>
            </div>,
            document.body
          )}

        {(!isMobileLayout || mobileView === 'calendar') && (
          <div className={styles.mobileCalendarView}>
            <div className={styles.desktopOnly}>
              <CalendarSettingsSection
                isPlanVisible={isPlanVisible}
                setIsPlanVisible={setIsPlanVisible}
                isAlternatingVisible={isAlternatingVisible}
                setIsAlternatingVisible={setIsAlternatingVisible}
                isOtherCareVisible={isOtherCareVisible}
                setIsOtherCareVisible={setIsOtherCareVisible}
                isEventsVisible={isEventsVisible && !isCareEditActive}
                setIsEventsVisible={setIsEventsVisible}
              />
            </div>

            <div {...(isCareEditActive ? {} : bind())}>
              {!isPlanVisible && (
                <CalendarGrid
                  data={
                    isCareEditActive ? careEdit.previewEvents : sortedEvents
                  }
                  handlers={isCareEditActive ? careEdit.handlers : handlers}
                  isAlternatingVisible={isAlternatingVisible}
                  isOtherCareVisible={isOtherCareVisible}
                  isMultiSelectionMode={
                    isCareEditActive ? false : isMultiSelectionMode
                  }
                  isEventsVisible={isEventsVisible}
                  selection={isCareEditActive ? emptySelection : selection}
                  onMonthVisible={loadMonth}
                />
              )}

              {isPlanVisible && (
                <Calendar
                  startDate={startingDate}
                  rowSize={automaticRowSize}
                  isTodayVisible
                  isPlanVisible={isPlanVisible}
                  isAlternatingVisible={isAlternatingVisible}
                  isOtherCareVisible={isOtherCareVisible}
                  isEventsVisible={false}
                  displayStrategy={'continous'}
                  events={sortedEvents}
                  {...handlers}
                  selection={Array.from(selection)}
                  isMultiSelectionMode={isMultiSelectionMode}
                />
              )}
            </div>
          </div>
        )}

        {isMobileLayout && mobileView === 'care' && (
          <div className={styles.mobileCareView}>
            <CareSummary />
            <IncomingEventList
              data={upcomingQuery.data ?? []}
              selection={new Set()}
            />
          </div>
        )}
        {isMobileLayout && mobileView === 'add' && (
          <div className={styles.mobileAddView}>
            <MobileEventForm
              onSuccess={() => {
                void fetchEventsQuery.refetch();
                void queryClient.invalidateQueries({
                  queryKey: ['careUpcoming'],
                });
              }}
            />
          </div>
        )}
        </ScrollPane>

        {is1280 && !isMobileLayout && (
          <div className={styles.careStatsBar}>
            <span>
              Opieka {userFirstName}:{' '}
              <strong>{alternatingCount.eventCount}</strong>/
              {alternatingCount.days} dni
            </span>
            <span className={styles.careStatsDivider} aria-hidden>
              ·
            </span>
            <span>
              {otherParent.name || 'Drugi rodzic'}:{' '}
              <strong>
                {alternatingCount.days - alternatingCount.eventCount}
              </strong>
              /{alternatingCount.days} dni
            </span>
          </div>
        )}
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
          const dashboardWidth =
            event.currentTarget.parentElement?.getBoundingClientRect().width ??
            0;
          if (event.key === 'ArrowLeft') {
            setFormWidth((width) =>
              Math.min(dashboardWidth * 0.75, width + 20)
            );
          }
          if (event.key === 'ArrowRight') {
            setFormWidth((width) =>
              Math.max(dashboardWidth * 0.15, width - 20)
            );
          }
        }}
      />

      <ScrollPane
        className={formClasses}
        contentClassName={styles.formContent}
        style={{ height: '100%' }}
        viewportStyle={{ height: '100%', overflowY: 'auto' }}
      >
        <CalendarFormSection
          handleCancelMultiSelect={handleCancelMultiSelect}
          fetchEventsQuery={fetchEventsQuery}
          setIsMultiSelectionMode={setIsMultiSelectionMode}
          selection={selection}
          setSelection={setSelection}
          careEdit={careEdit}
          endDate={endDate}
        />
      </ScrollPane>
    </div>
  );
};
