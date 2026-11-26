'use client';

import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { useAppContext } from '@app/AppContext';
import { CareEventsLoadingOverlay } from '@components/CareEventsLoadingOverlay/CareEventsLoadingOverlay';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import type { CareEventsQuery } from '@api/db/events/useGetAllEventsQuery';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sortBy } from '@utils/array';
import { cssZoom } from '@utils/cssZoom';
import { useAppSearchParams } from '@utils/useAppSearchParams';
import classNames from 'classnames';
import dayjs from 'dayjs';

import {
  Expand,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  PencilLine,
  Plus,
  Shrink,
} from 'lucide-react';
import Link from 'next/link';
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useCaregiverColors, useCaregivers } from '@utils/useCaregiverColors';
import { caregiverBackground } from '@utils/caregiverColors';
import { colorBlueGreen700 } from '@utils/color';
import { createPortal } from 'react-dom';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useLongPress } from 'use-long-press';
import { useDashboardPageContext } from '@modules/DashboardPage/DashboardPage.context';
import { CalendarGrid } from '../CalendarGrid/CalendarGrid';
import { CalendarSettingsSection } from '../CalendarSettingsSection/CalendarSettingsSection';
import { CareSummary } from '../CareSummary/CareSummary';
import { AllDayEventsPanel } from '../AllDayEventsPanel/AllDayEventsPanel';
import { TodoPanel } from '../TodoPanel/TodoPanel';
import { DayPlanPanel, monthsInRange } from '../DayPlanPanel/DayPlanPanel';
import {
  MOBILE_SELECTION_STORAGE_KEY,
  MobileEventForm,
} from '../MobileEventForm/MobileEventForm';
import { useCareEditMode } from './useCareEditMode';
import { useSelection } from './useSelection';
import { SchoolDaySummary } from '../SchoolDaySummary/SchoolDaySummary';

import { ScrollPane } from '@/components/climberbook/common/ScrollPane';
import { useBreakpoints } from '@utils/useBreakpoints';
import { useCareWards } from '@utils/useCareWards';
import { usePersistentState } from '@utils/usePersistentState';
import { otherParentSubjectId, useOtherParent } from '@utils/useOtherParent';
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

const MIN_CALENDAR_WIDTH = 420;
const MIN_PLAN_WIDTH = 470;
const ADJUSTER_WIDTH = 11;
const COMPACT_FORM_WIDTH = 320;
const WIDE_FORM_WIDTH = 520;
const MICRO_FORM_WIDTH = 50;

// Keeps the minimized day plan mounted (its modal editor can still open) but out of layout.
const HIDDEN_PLAN_STYLE: CSSProperties = {
  position: 'absolute',
  width: 0,
  height: 0,
  overflow: 'hidden',
  visibility: 'hidden',
};

// Dashboard width in CSS pixels (rect sizes include the desktop zoom).
const getDashboardWidth = () => {
  const dashboard = document.getElementById('dashboard');
  return dashboard
    ? dashboard.getBoundingClientRect().width / cssZoom(dashboard)
    : window.innerWidth / cssZoom(document.documentElement);
};

export const Dashboard = (props: DashboardProps) => {
  const { fetchEventsQuery, loadMonth, mobileView } = props;
  const { user, language } = useAppContext();
  const { profile: otherParent } = useOtherParent();
  const { wards } = useCareWards();
  const userFirstName = user.name.trim().split(/\s+/)[0] || 'Moja';
  const { is1280 } = useBreakpoints();
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  const { groupId, startDate, endDate, searchParams } = useAppSearchParams();
  const {
    selection,
    handlers,
    isMultiSelectionMode,
    setIsMultiSelectionMode,
    setSelection,
  } = useSelection({
    isMultiSelectionAvailable: true,
  });
  const [isAlternatingVisible, setIsAlternatingVisible] = usePersistentState(
    'alternating-care:dashboard:alternating-visible',
    true,
  );
  const [isOtherCareVisible, setIsOtherCareVisible] = usePersistentState(
    'alternating-care:dashboard:other-care-visible',
    false,
  );
  const [isEventsVisible, setIsEventsVisible] = usePersistentState(
    'alternating-care:dashboard:events-visible',
    true,
  );
  const [formWidth, setFormWidth] = usePersistentState(
    'alternating-care:dashboard:widgets-width',
    520,
  );
  const [isWidgetsMinimized, setIsWidgetsMinimized] = usePersistentState(
    'alternating-care:dashboard:widgets-minimized',
    false,
  );
  const layoutFormWidth = isWidgetsMinimized ? MICRO_FORM_WIDTH : formWidth;
  const [planWidth, setPlanWidth] = usePersistentState(
    'alternating-care:dashboard:plan-width',
    650,
  );
  const [isPlanMinimized, setIsPlanMinimized] = usePersistentState(
    'alternating-care:dashboard:plan-minimized',
    false,
  );
  const layoutPlanWidth = isPlanMinimized ? MICRO_FORM_WIDTH : planWidth;
  const [noteRequest, setNoteRequest] = useState(0);
  const [noteEditRequest, setNoteEditRequest] = useState<{
    event: CalendarEvent;
    key: number;
  }>();
  const planResizeRef = useRef<{ startX: number; width: number } | null>(null);
  const [eventRequest, setEventRequest] = useState(0);

  // Note requests bring the minimized plan back.
  useEffect(() => {
    if (noteRequest > 0 || noteEditRequest) {
      setIsPlanMinimized(false);
    }
  }, [noteRequest, noteEditRequest]);
  const queryClient = useQueryClient();
  const { updateAllEvents } = useDashboardPageContext();
  const careEdit = useCareEditMode({
    events: fetchEventsQuery.data ?? [],
    onSaved: () => updateAllEvents?.(),
  });
  const isCareEditActive =
    careEdit.isActive &&
    ((!isMobileLayout) || mobileView === 'calendar');
  const isDayPlanVisible = is1280 && !isMobileLayout;
  const emptySelection = useMemo(() => new Set<string>(), []);
  const loadDayPlanRange = useCallback(
    (start: string, end: string) => {
      monthsInRange(start, end).forEach((month) => {
        void loadMonth(month, true);
      });
    },
    [loadMonth]
  );

  useEffect(() => {
    if (!isDayPlanVisible) return;

    const fitColumns = () => {
      const dashboardWidth = getDashboardWidth();
      setPlanWidth((currentPlanWidth) =>
        Math.min(
          currentPlanWidth,
          Math.max(
            MIN_PLAN_WIDTH,
            dashboardWidth -
              layoutFormWidth -
              MIN_CALENDAR_WIDTH -
              ADJUSTER_WIDTH * 2
          )
        )
      );
    };

    fitColumns();
    window.addEventListener('resize', fitColumns);
    return () => window.removeEventListener('resize', fitColumns);
  }, [layoutFormWidth, isDayPlanVisible]);

  useEffect(() => {
    if (!isMobileLayout || mobileView !== 'calendar') return;
    if (selection.size > 0) {
      window.sessionStorage.setItem(
        MOBILE_SELECTION_STORAGE_KEY,
        JSON.stringify(Array.from(selection))
      );
    } else {
      window.sessionStorage.removeItem(MOBILE_SELECTION_STORAGE_KEY);
    }
  }, [isMobileLayout, mobileView, selection]);

  const mobileHref = useCallback(
    (view: DashboardMobileView) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('returnUrl');
      params.delete('plan');
      if (view === 'add') {
        const returnParams = new URLSearchParams(params);
        params.set(
          'returnUrl',
          `${mobileViewPaths[mobileView]}${
            returnParams.toString() ? `?${returnParams.toString()}` : ''
          }`
        );
      }
      const query = params.toString();
      return `${mobileViewPaths[view]}${query ? `?${query}` : ''}`;
    },
    [mobileView, searchParams]
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
    [styles.withDayPlan]: isDayPlanVisible,
  });

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

  const clampFormWidth = useCallback(
    (width: number, dashboardWidth: number) => {
      const minWidth = 320;
      const maxWidth = Math.max(
        minWidth,
        dashboardWidth -
          layoutPlanWidth -
          MIN_CALENDAR_WIDTH -
          ADJUSTER_WIDTH * 2
      );
      return Math.min(Math.max(width, minWidth), maxWidth);
    },
    [layoutPlanWidth]
  );

  const changeFormWidth = useCallback(
    (width: number) => {
      setIsWidgetsMinimized(false);
      setFormWidth(clampFormWidth(width, getDashboardWidth()));
    },
    [clampFormWidth]
  );
  const isFormWide = formWidth > (COMPACT_FORM_WIDTH + WIDE_FORM_WIDTH) / 2;

  const resizeColumns = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
      const dashboard = event.currentTarget.parentElement;
      if (!dashboard) return;
      const bounds = dashboard.getBoundingClientRect();
      const zoom = cssZoom(dashboard);
      setIsWidgetsMinimized(false);
      setFormWidth(
        clampFormWidth(
          (bounds.right - event.clientX) / zoom,
          bounds.width / zoom
        )
      );
    },
    [clampFormWidth]
  );

  const clampPlanWidth = useCallback(
    (width: number) => {
      const dashboardWidth = getDashboardWidth();
      const maxWidth = Math.max(
        MIN_PLAN_WIDTH,
        dashboardWidth -
          layoutFormWidth -
          MIN_CALENDAR_WIDTH -
          ADJUSTER_WIDTH * 2
      );
      return Math.min(Math.max(width, MIN_PLAN_WIDTH), maxWidth);
    },
    [layoutFormWidth]
  );

  const changePlanWidth = useCallback(
    (width: number) => {
      setIsPlanMinimized(false);
      setPlanWidth(clampPlanWidth(width));
    },
    [clampPlanWidth]
  );

  const resizePlanColumn = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const resize = planResizeRef.current;
      if (!event.currentTarget.hasPointerCapture(event.pointerId) || !resize) {
        return;
      }
      setIsPlanMinimized(false);
      setPlanWidth(
        clampPlanWidth(
          resize.width +
            (resize.startX - event.clientX) / cssZoom(event.currentTarget)
        )
      );
    },
    [clampPlanWidth]
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

  const savedCaregivers = useCaregivers();
  const caregiverColors = useCaregiverColors();
  const selectedDatesOrdered = [...selection].sort();
  const selectedDateRange =
    selectedDatesOrdered.length > 0
      ? `${dayjs(selectedDatesOrdered[0])
          .locale(language)
          .format('D MMM')}${
          selectedDatesOrdered.length > 1
            ? ` – ${dayjs(selectedDatesOrdered.at(-1))
                .locale(language)
                .format('D MMM')}`
            : ''
        }`
      : '';
  const [dayDetails, setDayDetails] = useState<{
    date: string;
    top: number;
    left: number;
    careSubjects: string[];
    events: CalendarEvent[];
  } | null>(null);
  const dayHoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const hoveredDay = useRef<string | null>(null);
  const clearDayDetails = useCallback(() => {
    clearTimeout(dayHoverTimer.current);
    hoveredDay.current = null;
    setDayDetails(null);
  }, []);
  const handleCalendarHover = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const dayElement = (event.target as HTMLElement).closest<HTMLElement>(
        '[id^="day-"]',
      );
      const date = dayElement?.id.slice('day-'.length) ?? null;
      if (date === hoveredDay.current) return;

      clearDayDetails();
      if (!dayElement || !date) return;
      hoveredDay.current = date;
      dayHoverTimer.current = setTimeout(() => {
        const rect = dayElement.getBoundingClientRect();
        const zoom = cssZoom(dayElement);
        const sourceEvents = isCareEditActive
          ? careEdit.previewEvents
          : sortedEvents;
        const eventsForDay = sourceEvents.filter(
          (item) =>
            item.date === date &&
            (item.type !== CalendarEventType.Alternating ||
              isAlternatingVisible ||
              isOtherCareVisible),
        );
        const careSubjects = [
          ...new Set(
            eventsForDay
              .filter((item) => {
                if (item.type !== CalendarEventType.Alternating) return false;
                const isOwn =
                  item.groupId === CalendarEventType.Alternating ||
                  item.groupId.startsWith('CARE:self:');
                return isOwn ? isAlternatingVisible : isOtherCareVisible;
              })
              .map((item) =>
                item.groupId.startsWith('CARE:')
                  ? item.groupId.slice('CARE:'.length)
                  : `self:${user.id}`,
              ),
          ),
        ];
        setDayDetails({
          date,
          top: rect.top / zoom - 8,
          left: Math.max(
            8,
            Math.min(rect.left / zoom, window.innerWidth / zoom - 288),
          ),
          careSubjects,
          events: isEventsVisible
            ? eventsForDay.filter(
                (item) => item.type !== CalendarEventType.Alternating,
              )
            : [],
        });
      }, 800);
    },
    [
      careEdit.previewEvents,
      clearDayDetails,
      isAlternatingVisible,
      isCareEditActive,
      isEventsVisible,
      isOtherCareVisible,
      sortedEvents,
      user.id,
    ],
  );
  useEffect(
    () => () => {
      clearTimeout(dayHoverTimer.current);
    },
    [],
  );
  // Mirrors the calendar: the first care entry of a day decides who has it,
  // and days without care belong to the other parent.
  const careStats = useMemo(() => {
    if (!startDate || !endDate) return { days: 0, rows: [] };
    const rangeStart = dayjs(startDate).startOf('month').format(dateFormat);
    const rangeEnd = dayjs(endDate).endOf('month').format(dateFormat);
    const days = dayjs(rangeEnd).diff(rangeStart, 'day') + 1;
    const otherSubject = otherParentSubjectId(otherParent);
    const ownerByDate = new Map<string, string>();
    const groupBySubject = new Map<string, string>();
    for (const event of fetchEventsQuery.data ?? []) {
      if (
        event.type !== CalendarEventType.Alternating ||
        event.date < rangeStart ||
        event.date > rangeEnd ||
        ownerByDate.has(event.date)
      ) {
        continue;
      }
      const subjectId =
        event.groupId === 'ALTERNATING' || event.groupId?.startsWith('CARE:self:')
          ? 'self'
          : event.groupId?.startsWith('CARE:other:') ||
              event.groupId === `CARE:${otherSubject}`
            ? 'other'
            : event.groupId?.replace(/^CARE:/, '') ?? 'other';
      ownerByDate.set(event.date, subjectId);
      if (!groupBySubject.has(subjectId)) groupBySubject.set(subjectId, event.groupId);
    }
    const counts = new Map<string, number>([['self', 0]]);
    ownerByDate.forEach((subjectId) =>
      counts.set(subjectId, (counts.get(subjectId) ?? 0) + 1)
    );
    // Days without any care entry are shown separately, not as the other parent's.
    const unassigned = days - ownerByDate.size;
    if (unassigned > 0) counts.set('unassigned', unassigned);
    const nameOf = (subjectId: string) =>
      subjectId === 'self'
        ? `Opieka ${userFirstName}`
        : subjectId === 'other'
          ? otherParent.name || 'Drugi rodzic'
          : subjectId === 'unassigned'
            ? 'Bez opieki'
            : savedCaregivers.find((item) => item.subjectId === subjectId)
                ?.name || 'Opiekun';
    const selfColor =
      Object.entries(caregiverColors).find(([key]) => key.startsWith('self:'))?.[1] ??
      colorBlueGreen700;
    const colorOf = (subjectId: string) => {
      if (subjectId === 'self') return selfColor;
      if (subjectId === 'unassigned') return '#c3cbd0';
      const groupId = groupBySubject.get(subjectId);
      return groupId ? caregiverBackground(groupId, caregiverColors) : '#9b8d9b';
    };
    return {
      days,
      rows: [...counts.entries()]
        .filter(([subjectId, count]) => count > 0 || subjectId === 'self')
        .map(([subjectId, count]) => ({
          subjectId,
          name: nameOf(subjectId),
          color: colorOf(subjectId),
          count,
        })),
    };
  }, [
    caregiverColors,
    endDate,
    fetchEventsQuery.data,
    otherParent,
    savedCaregivers,
    startDate,
    userFirstName,
  ]);

  const dayPlanPanel = (
    <DayPlanPanel
      events={filteredEvents}
      selectedDates={selection}
      planWidth={planWidth}
      onChangeWidth={changePlanWidth}
      onMinimize={() => setIsPlanMinimized(true)}
      onDatesChange={(dates) => setSelection(new Set(dates))}
      onEventsUpdated={() => {
        void fetchEventsQuery.refetch();
        void queryClient.invalidateQueries({
          queryKey: ['careTodos'],
        });
        setIsMultiSelectionMode(false);
      }}
      noteRequest={noteRequest}
      noteEditRequest={noteEditRequest}
      eventRequest={eventRequest}
      allowPastNavigation
      onVisibleRangeChange={loadDayPlanRange}
      weekListView
      modalEventEditor
    />
  );

  return (
    <div
      className={dashboardClasses}
      id='dashboard'
      style={
        {
          '--form-width': `${layoutFormWidth}px`,
          '--plan-width': `${layoutPlanWidth}px`,
        } as CSSProperties
      }
    >
      <div className={styles.calendarPane}>
        <CareEventsLoadingOverlay />
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
              Event
            </Link>
            <Link href='/alternating-care/plan'>
              {language === 'en' ? 'Care' : 'Opieka'}
            </Link>
            <Link href='/alternating-care/settings'>
              {language === 'en' ? 'Settings' : 'Ustawienia'}
            </Link>
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
                isAlternatingVisible={isAlternatingVisible}
                setIsAlternatingVisible={setIsAlternatingVisible}
                isOtherCareVisible={isOtherCareVisible}
                setIsOtherCareVisible={setIsOtherCareVisible}
                isEventsVisible={isEventsVisible && !isCareEditActive}
                setIsEventsVisible={setIsEventsVisible}
              />
            </div>
            {selection.size > 0 && !isCareEditActive && (
              <div className={styles.calendarActionBar}>
                <span className={styles.calendarSelectionInfo} role="status">
                  <CalendarDays size={14} aria-hidden />
                  {language === 'en' ? 'Selected' : 'Zaznaczono'}{' '}
                  <strong>
                    {selection.size}{' '}
                    {language === 'en'
                      ? selection.size === 1
                        ? 'day'
                        : 'days'
                      : selection.size === 1
                        ? 'dzień'
                        : 'dni'}
                  </strong>
                  <span className={styles.calendarSelectionRange}>
                    {selectedDateRange}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelection(new Set())}
                    aria-label={
                      language === 'en'
                        ? 'Clear selection'
                        : 'Wyczyść zaznaczenie'
                    }
                    title={
                      language === 'en'
                        ? 'Clear selection'
                        : 'Wyczyść zaznaczenie'
                    }
                  >
                    ×
                  </button>
                </span>
                <button
                  type="button"
                  className={styles.calendarAddButton}
                  onClick={() => setEventRequest((value) => value + 1)}
                >
                  <Plus size={17} aria-hidden />
                  {language === 'en' ? 'Add' : 'Dodaj'}
                </button>
              </div>
            )}

            <div
              {...(isCareEditActive ? {} : bind())}
              onMouseOver={handleCalendarHover}
              onMouseLeave={clearDayDetails}
            >
              <CalendarGrid
                data={isCareEditActive ? careEdit.previewEvents : sortedEvents}
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
            </div>
          </div>
        )}

        {isMobileLayout && mobileView === 'care' && (
          <div className={styles.mobileCareView}>
            <CareSummary upcomingCount={11} endDate={endDate} />
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
                void queryClient.invalidateQueries({
                  queryKey: ['careTodos'],
                });
              }}
            />
          </div>
        )}
        {dayDetails &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className={styles.dayDetails}
              style={{
                top: dayDetails.top,
                left: dayDetails.left,
              }}
              role='tooltip'
            >
              <strong>
                {dayjs(dayDetails.date)
                  .locale(language)
                  .format('dddd, D MMM YYYY')}
              </strong>
              <span className={styles.dayDetailsLabel}>
                {language === 'en' ? 'Care' : 'Opieka'}
              </span>
              {dayDetails.careSubjects.length > 0 ? (
                dayDetails.careSubjects.map((subjectId, index) => (
                  <span className={styles.dayDetailsCare} key={subjectId}>
                    <span
                      className={styles.dayDetailsSwatch}
                      style={{
                        background: subjectId.startsWith('self:')
                          ? caregiverColors[subjectId] ?? colorBlueGreen700
                          : caregiverBackground(
                              `CARE:${subjectId}`,
                              caregiverColors,
                            ),
                      }}
                    />
                    {subjectId.startsWith('self:')
                      ? user.name
                      : savedCaregivers.find(
                          (caregiver) => caregiver.subjectId === subjectId,
                        )?.name ||
                        (language === 'en' ? 'Caregiver' : 'Opiekun')}
                    {index > 0 && (
                      <small>
                        {language === 'en' ? '(underneath)' : '(pod spodem)'}
                      </small>
                    )}
                  </span>
                ))
              ) : (
                <span className={styles.dayDetailsCare}>
                  {language === 'en' ? 'No care assigned' : 'Bez przypisanej opieki'}
                </span>
              )}
              {dayDetails.events.length > 0 && (
                <>
                  <span className={styles.dayDetailsLabel}>
                    {language === 'en' ? 'Events' : 'Wydarzenia'}
                  </span>
                  <ul>
                    {dayDetails.events.map((event) => (
                      <li key={`${event.id}-${event.date}`}>
                        <span
                          className={styles.dayDetailsSwatch}
                          style={{
                            background: event.style?.background ?? '#9aa5ab',
                          }}
                        />
                        <span>
                          <b>{event.name || event.type}</b>
                          {event.description && <small>{event.description}</small>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>,
            document.body,
          )}
        </ScrollPane>

        {is1280 && !isMobileLayout && (
          <div className={styles.careStatsBar}>
            {careStats.rows.map((row, index) => (
              <Fragment key={row.subjectId}>
                {index > 0 && (
                  <span className={styles.careStatsDivider} aria-hidden>
                    ·
                  </span>
                )}
                <span className={styles.careStatsItem}>
                  <span
                    className={styles.careStatsSwatch}
                    style={{ background: row.color }}
                  />
                  {row.name}:{' '}
                  <strong
                    style={{
                      color: `color-mix(in srgb, ${row.color} 70%, #1e1916)`,
                    }}
                  >{row.count}</strong>/
                  {careStats.days} dni
                </span>
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {!isDayPlanVisible && !isMobileLayout && (
        <div style={HIDDEN_PLAN_STYLE}>{dayPlanPanel}</div>
      )}

      {isDayPlanVisible && (
        <>
          <div
            className={`${styles.columnAdjuster} ${styles.planAdjuster}`}
            role='separator'
            aria-label='Zmień szerokość planu dnia'
            aria-orientation='vertical'
            aria-valuenow={Math.round(planWidth)}
            aria-valuemin={MIN_PLAN_WIDTH}
            tabIndex={0}
            onDoubleClick={() =>
              changePlanWidth(planWidth < 500 ? 650 : MIN_PLAN_WIDTH)
            }
            onPointerDown={(event) => {
              planResizeRef.current = {
                startX: event.clientX,
                width: planWidth,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={resizePlanColumn}
            onPointerUp={(event) => {
              planResizeRef.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => {
              planResizeRef.current = null;
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                changePlanWidth(planWidth + 20);
              }
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                changePlanWidth(planWidth - 20);
              }
            }}
          />
          {isPlanMinimized && (
            <div className={`${styles.dayPlanContainer} ${styles.microBar}`}>
              <button
                type="button"
                className={styles.microBarButton}
                onClick={() => setIsPlanMinimized(false)}
                title={language === 'en' ? 'Expand day plan' : 'Rozwiń plan dnia'}
                aria-label={
                  language === 'en' ? 'Expand day plan' : 'Rozwiń plan dnia'
                }
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <button
                type="button"
                className={`${styles.microBarButton} ${styles.microBarAdd}`}
                onClick={() => setEventRequest((value) => value + 1)}
                title={language === 'en' ? 'Add event' : 'Dodaj wydarzenie'}
                aria-label={language === 'en' ? 'Add event' : 'Dodaj wydarzenie'}
              >
                <Plus size={20} aria-hidden />
              </button>
            </div>
          )}
          <div
            className={styles.dayPlanContainer}
            style={isPlanMinimized ? HIDDEN_PLAN_STYLE : undefined}
          >
            {dayPlanPanel}
          </div>
          <div
            className={`${styles.columnAdjuster} ${styles.formAdjuster}`}
            role='separator'
            aria-label='Zmień szerokość panelu widżetów'
            aria-orientation='vertical'
            aria-valuenow={Math.round(formWidth)}
            tabIndex={0}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={resizeColumns}
            onPointerUp={(event) => {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onKeyDown={(event) => {
              const parent = event.currentTarget.parentElement;
              const dashboardWidth = parent
                ? parent.getBoundingClientRect().width / cssZoom(parent)
                : 0;
              if (event.key === 'ArrowLeft') {
                setFormWidth((width) =>
                  clampFormWidth(width + 20, dashboardWidth)
                );
              }
              if (event.key === 'ArrowRight') {
                setFormWidth((width) =>
                  clampFormWidth(width - 20, dashboardWidth)
                );
              }
            }}
          />
          {isWidgetsMinimized ? (
            <div className={`${styles.formContainer} ${styles.widgetsMicro}`}>
              <CareSummary
                windowDays={365}
                endDate={endDate}
                section="micro"
                onExpand={() => setIsWidgetsMinimized(false)}
                microContent={
                  <SchoolDaySummary
                    wards={wards}
                    micro
                    onExpand={() => setIsWidgetsMinimized(false)}
                  />
                }
              />
            </div>
          ) : (
          <div className={`${styles.formContainer} ${styles.widgetsColumn}`}>
            <div className={styles.widgetsHeader}>
              <span className={styles.widgetsEyebrow}>
                {language === 'en' ? 'Widgets' : 'Widżety'}
              </span>
              <div
                className={styles.widthToggle}
                aria-label={
                  language === 'en' ? 'Widgets width' : 'Szerokość widżetów'
                }
              >
                <button
                  type="button"
                  className={!isFormWide ? styles.active : undefined}
                  onClick={() => changeFormWidth(COMPACT_FORM_WIDTH)}
                  aria-pressed={!isFormWide}
                  title={language === 'en' ? 'Narrow panel' : 'Wąski panel'}
                >
                  <Shrink size={17} aria-hidden />
                </button>
                <button
                  type="button"
                  className={isFormWide ? styles.active : undefined}
                  onClick={() => changeFormWidth(WIDE_FORM_WIDTH)}
                  aria-pressed={isFormWide}
                  title={language === 'en' ? 'Wide panel' : 'Szeroki panel'}
                >
                  <Expand size={17} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setIsWidgetsMinimized(true)}
                  title={
                    language === 'en' ? 'Minimize widgets' : 'Zminimalizuj widżety'
                  }
                >
                  <ChevronRight size={18} aria-hidden />
                </button>
              </div>
            </div>
          <ScrollPane
            className={styles.widgetsScroll}
            contentClassName={styles.formContent}
            style={{ flex: 1, minHeight: 0 }}
            viewportStyle={{ height: '100%', overflowY: 'auto' }}
          >
            <CareSummary
              windowDays={365}
              upcomingCount="all"
              endDate={endDate}
              section="overview"
            />
            <SchoolDaySummary wards={wards} />
            <AllDayEventsPanel
              events={fetchEventsQuery.data ?? []}
              onEdit={(event) =>
                setNoteEditRequest({ event, key: Date.now() })
              }
            />
            <TodoPanel
              events={fetchEventsQuery.data ?? []}
              onUpdated={() => {
                void fetchEventsQuery.refetch();
                void queryClient.invalidateQueries({
                  queryKey: ['careTodos'],
                });
              }}
              onAdd={() => setNoteRequest((value) => value + 1)}
              onEdit={(event) =>
                setNoteEditRequest({ event, key: Date.now() })
              }
            />
          </ScrollPane>
          </div>
          )}
        </>
      )}
    </div>
  );
};
