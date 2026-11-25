'use client';

import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { deleteCareEvent } from '@api/db/events/careEventsApi';
import { useAppContext } from '@app/AppContext';
import { useAppSearchParams } from '@utils/useAppSearchParams';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import dayjs from 'dayjs';
import CalendarEventAvatar from '@components/Calendar/components/CalendarEventAvatar/CalendarEventAvatar';
import {
  CalendarDays,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Expand,
  Plus,
  Shrink,
  Trash2,
} from 'lucide-react';
import classNames from 'classnames';
import { toast } from 'react-toastify';
import { createPortal } from 'react-dom';
import { Select } from '@/components/climberbook/common/FormControls';
import { useRouter } from 'next/navigation';
import { DashboardEventForm } from '../DashboardEventForm/DashboardEventForm';
import { isScatteredSelection } from '../DashboardEventForm/useDashboardEventForm';
import styles from './DayPlanPanel.module.scss';

type PlanRange = 'day' | 'week' | 'month';

interface DayPlanPanelProps {
  events: CalendarEvent[];
  selectedDates: Set<string>;
  planWidth: number;
  onDatesChange: (dates: string[]) => void;
  onEventsUpdated: () => void;
  onChangeWidth: (width: number) => void;
  noteRequest?: number;
  noteEditRequest?: { event: CalendarEvent; key: number };
  saveRedirectPath?: string;
  showWidthControls?: boolean;
  modalEventEditor?: boolean;
  weekListView?: boolean;
  monthWeekColumns?: boolean;
  allowPastNavigation?: boolean;
  onVisibleRangeChange?: (start: string, end: string) => void;
  initialRange?: PlanRange;
}

const COMPACT_WIDTH = 470;
const WIDE_WIDTH = 650;
const TIMELINE_EMPTY_SLOT_HEIGHT = 14;
const TIMELINE_ACTIVE_SLOT_HEIGHT = 32;
const TIMELINE_ACTIVE_START_SLOT = 14;
const TIMELINE_ACTIVE_END_SLOT = 42;
const TIMELINE_EVENT_MIN_HEIGHT = 96;
const TIMELINE_SLOTS = 48;
const ALL_DAY_ROW_HEIGHT = 44;
const ALL_DAY_ROW_GAP = 4;
// Bottom padding of sticky all-day blocks; keeps them opaque down to the grid.
const ALL_DAY_BLOCK_GAP = 10;
// Beyond this, the sticky all-day block scrolls internally instead of growing.
const MAX_VISIBLE_ALL_DAY_ROWS = 3;
// Hour labels sit this far above their slot line (see .timeSlot > span).
const TIME_LABEL_OVERHANG = 8;

function allDayBlockHeight(rows: number) {
  return rows > 0 ? rows * ALL_DAY_ROW_HEIGHT + (rows - 1) * ALL_DAY_ROW_GAP : 0;
}

export function monthsInRange(start: string, end: string) {
  const months: string[] = [];
  for (
    let month = dayjs(start).startOf('month');
    !month.isAfter(dayjs(end), 'month');
    month = month.add(1, 'month')
  ) {
    months.push(month.format('YYYY-MM-DD'));
  }
  return months;
}
const TIME_OPTIONS = Array.from({ length: 24 * 12 }, (_, index) => {
  const hour = Math.floor(index / 12);
  const minute = (index % 12) * 5;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
});

const typeLabels: Record<string, { pl: string; en: string }> = {
  [CalendarEventType.Event]: { pl: 'Wydarzenie', en: 'Event' },
  [CalendarEventType.Trip]: { pl: 'Wyjazd', en: 'Trip' },
  [CalendarEventType.Birthday]: { pl: 'Urodziny', en: 'Birthday' },
  [CalendarEventType.Medical]: { pl: 'Zdrowie', en: 'Health' },
  [CalendarEventType.School]: { pl: 'Szkoła', en: 'School' },
  [CalendarEventType.Camp]: { pl: 'Wyjazd', en: 'Camp' },
  [CalendarEventType.Todo]: { pl: 'Notatka', en: 'Note' },
};

function formatDate(date: string, language: 'pl' | 'en', withWeekday = true) {
  return new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-GB', {
    weekday: withWeekday ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dayjs(date).toDate());
}

function formatDateParts(date: string, language: 'pl' | 'en') {
  return new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(dayjs(date).toDate());
}

function eventColor(event: CalendarEvent) {
  return event.style?.background ?? '#2d8dbf';
}

function eventTime(event: CalendarEvent) {
  if (event.startTime === undefined) return null;
  const value = Number(event.startTime);
  const date = value > 1440 ? new Date(value) : new Date(0, 0, 1, 0, value);
  const start = `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;

  if (event.endTime === undefined) return start;
  const endValue = Number(event.endTime);
  const endDate =
    endValue > 1440 ? new Date(endValue) : new Date(0, 0, 1, 0, endValue);
  const end = `${String(endDate.getHours()).padStart(2, '0')}:${String(
    endDate.getMinutes(),
  ).padStart(2, '0')}`;
  return `${start} – ${end}`;
}

function layoutRanges(ranges: Array<{ id: string; start: number; end: number }>) {
  const layouts = new Map<string, { lane: number; columns: number }>();
  const sorted = [...ranges].sort(
    (left, right) =>
      left.start - right.start ||
      left.end - right.end,
  );
  let group: Array<{ id: string; start: number; end: number }> = [];
  let groupEnd = -1;

  const placeGroup = () => {
    const laneEnds: number[] = [];
    const placed = group.map((range) => {
      const { start, end } = range;
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = end;
      return { range, lane };
    });
    const columns = Math.max(1, laneEnds.length);
    placed.forEach(({ range, lane }) =>
      layouts.set(range.id, { lane, columns }),
    );
    group = [];
    groupEnd = -1;
  };

  sorted.forEach((range) => {
    const { start, end } = range;
    if (group.length > 0 && start >= groupEnd) placeGroup();
    group.push(range);
    groupEnd = Math.max(groupEnd, end);
  });
  if (group.length > 0) placeGroup();

  return layouts;
}

type DaySegment = { start: number; end: number };

// Multi-day timed events start on the first day and end on the last day.
function buildDaySegments(events: CalendarEvent[]) {
  const datesByGroup = new Map<string, Set<string>>();
  for (const event of events) {
    if (event.startTime === undefined) continue;
    const dates = datesByGroup.get(event.groupId) ?? new Set<string>();
    dates.add(event.date);
    datesByGroup.set(event.groupId, dates);
  }
  const segments = new Map<string, DaySegment>();
  for (const event of events) {
    if (event.startTime === undefined) continue;
    const dates = datesByGroup.get(event.groupId);
    const hasPrevious = Boolean(
      dates?.has(dayjs(event.date).subtract(1, 'day').format('YYYY-MM-DD')),
    );
    const hasNext = Boolean(
      dates?.has(dayjs(event.date).add(1, 'day').format('YYYY-MM-DD')),
    );
    const start = hasPrevious ? 0 : event.startTime;
    let end = hasNext ? 1440 : (event.endTime ?? event.startTime + 30);
    if (end <= start) end = Math.min(1440, start + 15);
    segments.set(event.id, { start, end });
  }
  return segments;
}

function daySegment(
  event: CalendarEvent,
  segments: Map<string, DaySegment>,
): DaySegment {
  const start = event.startTime ?? 0;
  return (
    segments.get(event.id) ?? { start, end: event.endTime ?? start + 30 }
  );
}

function layoutTimedEvents(
  events: CalendarEvent[],
  segments: Map<string, DaySegment>,
) {
  return layoutRanges(
    events.map((event) => {
      const segment = daySegment(event, segments);
      return {
        id: event.id,
        start: Math.floor(segment.start / 30),
        end: Math.ceil(segment.end / 30),
      };
    }),
  );
}

export function DayPlanPanel({
  events,
  selectedDates,
  planWidth,
  onDatesChange,
  onEventsUpdated,
  onChangeWidth,
  noteRequest = 0,
  noteEditRequest,
  saveRedirectPath,
  showWidthControls = true,
  modalEventEditor = false,
  weekListView = false,
  monthWeekColumns = false,
  initialRange = 'day',
  allowPastNavigation = false,
  onVisibleRangeChange,
}: DayPlanPanelProps) {
  const { language } = useAppContext();
  const router = useRouter();
  const { searchParams } = useAppSearchParams();
  const today = dayjs().format('YYYY-MM-DD');
  const clampToToday = (date: string) =>
    !allowPastNavigation && date < today ? today : date;
  const selectedDate = [...selectedDates].sort()[0];
  const [focusedDate, setFocusedDate] = useState(
    selectedDate ? clampToToday(selectedDate) : today,
  );
  const [range, setRange] = useState<PlanRange>(initialRange);
  const [isEventFormVisible, setIsEventFormVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent>();
  const [detailEvent, setDetailEvent] = useState<CalendarEvent>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [newEventType, setNewEventType] = useState<CalendarEventType>();
  const [draftStartTime, setDraftStartTime] = useState<number>();
  const [draftEndTime, setDraftEndTime] = useState<number>();
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const planBodyRef = useRef<HTMLDivElement>(null);
  const [formStartDate, setFormStartDate] = useState(
    selectedDate ?? dayjs().format('YYYY-MM-DD'),
  );
  const [formEndDate, setFormEndDate] = useState(
    selectedDate ?? dayjs().format('YYYY-MM-DD'),
  );
  const [isEndDateChosen, setIsEndDateChosen] = useState(false);
  const selectedDatesKey = [...selectedDates].sort().join('|');
  const currentDate = focusedDate;
  const isWide = planWidth >= 500;
  const isPolish = language === 'pl';
  const saveRedirect = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('groupId');
    const query = params.toString();
    return `/alternating-care${query ? `?${query}` : ''}`;
  }, [searchParams]);

  useEffect(() => {
    if (selectedDate) setFocusedDate(clampToToday(selectedDate));
  }, [selectedDate, today, allowPastNavigation]);

  useEffect(() => {
    const dates = selectedDatesKey ? selectedDatesKey.split('|') : [];
    if (dates.length === 0) return;
    setFormStartDate(dates[0]);
    setFormEndDate(dates[dates.length - 1]);
  }, [selectedDatesKey]);

  useEffect(() => {
    const updateCurrentMinute = () => {
      const now = new Date();
      setCurrentMinute(now.getHours() * 60 + now.getMinutes());
    };
    const interval = window.setInterval(updateCurrentMinute, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const rangeBounds = useMemo(() => {
    if (range === 'month') {
      const naturalStart = dayjs(currentDate)
        .startOf('month')
        .format('YYYY-MM-DD');
      return {
        start: clampToToday(naturalStart),
        end: dayjs(currentDate).endOf('month').format('YYYY-MM-DD'),
      };
    }
    if (range === 'week') {
      const day = dayjs(currentDate).day();
      const start = dayjs(currentDate).subtract((day + 6) % 7, 'day');
      const naturalStart = start.format('YYYY-MM-DD');
      return {
        start: clampToToday(naturalStart),
        end: start.add(6, 'day').format('YYYY-MM-DD'),
      };
    }
    return { start: currentDate, end: currentDate };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, range, today, allowPastNavigation]);

  useEffect(() => {
    if (!onVisibleRangeChange) return;
    if (range === 'month' && monthWeekColumns) {
      const monthStart = dayjs(currentDate).startOf('month');
      onVisibleRangeChange(
        monthStart
          .subtract((monthStart.day() + 6) % 7, 'day')
          .format('YYYY-MM-DD'),
        dayjs(currentDate).endOf('month').format('YYYY-MM-DD'),
      );
      return;
    }
    onVisibleRangeChange(rangeBounds.start, rangeBounds.end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeBounds.start, rangeBounds.end, range, monthWeekColumns]);

  const visibleEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            event.type !== CalendarEventType.Alternating &&
            event.type !== CalendarEventType.Todo &&
            (allowPastNavigation || event.date >= today) &&
            event.date >= rangeBounds.start &&
            event.date <= rangeBounds.end,
        )
        .sort(
          (left, right) =>
            left.date.localeCompare(right.date) ||
            (left.startTime ?? 0) - (right.startTime ?? 0) ||
            left.creationTime - right.creationTime,
        ),
    [events, range, rangeBounds.end, rangeBounds.start, today],
  );
  const daySegments = useMemo(() => buildDaySegments(events), [events]);
  const groupedEvents = useMemo(() => {
    return visibleEvents.reduce<
      Array<{ date: string; events: CalendarEvent[] }>
    >((groups, event) => {
      const last = groups.at(-1);
      if (last?.date === event.date) last.events.push(event);
      else groups.push({ date: event.date, events: [event] });
      return groups;
    }, []);
  }, [visibleEvents]);

  useEffect(() => {
    if (!isWide || isEventFormVisible) return;
    let frame = 0;
    const scrollToStart = () => {
      const body = planBodyRef.current;
      const scale = body?.querySelector<HTMLElement>('[data-time-scale="true"]');
      if (!body || !scale) return;
      const defaultStart = scale.querySelector<HTMLElement>(
        '[data-timeline-default-start="true"]',
      );
      if (!defaultStart) return;
      const stickyDayLabel = body.querySelector<HTMLElement>(
        '[data-sticky-day-label="true"]',
      );
      const allDayRow = body.querySelector<HTMLElement>(
        '[data-all-day-row="true"]',
      );
      const stickyOffset =
        (stickyDayLabel?.offsetHeight ?? 0) +
        (allDayRow?.offsetHeight ?? 0) +
        TIME_LABEL_OVERHANG;
      const target = Math.max(
        0,
        body.scrollTop +
          scale.getBoundingClientRect().top -
          body.getBoundingClientRect().top +
          defaultStart.offsetTop -
          stickyOffset,
      );
      body.style.removeProperty('padding-bottom');
      const baseBottomPadding =
        Number.parseFloat(window.getComputedStyle(body).paddingBottom) || 0;
      const missingTail = Math.max(
        0,
        target + body.clientHeight - body.scrollHeight,
      );
      if (missingTail > 0) {
        body.style.paddingBottom = `${baseBottomPadding + missingTail + 1}px`;
      }
      body.scrollTop = target;
    };
    frame = window.requestAnimationFrame(scrollToStart);
    const body = planBodyRef.current;
    const observer = body ? new ResizeObserver(scrollToStart) : undefined;
    if (body) observer?.observe(body);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      body?.style.removeProperty('padding-bottom');
    };
  }, [currentDate, groupedEvents, isEventFormVisible, isWide, range]);

  const navigate = (direction: -1 | 1) => {
    const amount =
      direction * (range === 'month' ? 1 : range === 'week' ? 7 : 1);
    const unit = range === 'month' ? 'month' : 'day';
    const nextDate = dayjs(currentDate).add(amount, unit).format('YYYY-MM-DD');
    setFocusedDate(clampToToday(nextDate));
  };

  const setFormRange = (start: string, end: string) => {
    const normalizedEnd = end < start ? start : end;
    setFormStartDate(start);
    setFormEndDate(normalizedEnd);
    const dates: string[] = [];
    for (
      let date = start;
      date <= normalizedEnd;
      date = dayjs(date).add(1, 'day').format('YYYY-MM-DD')
    ) {
      dates.push(date);
    }
    onDatesChange(dates);
  };

  const openMobileEventRoute = (
    start: string,
    end: string,
    event?: CalendarEvent,
    initialType?: CalendarEventType,
    startTime?: number,
    endTime?: number,
  ) => {
    if (!window.matchMedia('(max-width: 767px)').matches) return false;
    const returnParams = new URLSearchParams(searchParams.toString());
    returnParams.delete('groupId');
    returnParams.delete('returnUrl');
    const returnQuery = returnParams.toString();
    const returnUrl = `/alternating-care/day-plan${
      returnQuery ? `?${returnQuery}` : ''
    }`;
    const routeParams = new URLSearchParams({
      startDate: start,
      endDate: end,
      returnUrl,
    });

    if (event) {
      routeParams.set('groupId', event.groupId);
      router.push(`/alternating-care/edit?${routeParams.toString()}`);
      return true;
    }

    routeParams.set('type', initialType ?? CalendarEventType.Event);
    if (startTime !== undefined) {
      const formatTime = (value: number) =>
        `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(
          value % 60,
        ).padStart(2, '0')}`;
      routeParams.set('startTime', formatTime(startTime));
      routeParams.set('endTime', formatTime(endTime ?? startTime + 30));
    }
    router.push(`/alternating-care/add?${routeParams.toString()}`);
    return true;
  };

  const openEventForm = (
    event?: CalendarEvent,
    initialType?: CalendarEventType,
  ) => {
    const eventDates = event
      ? events
          .filter((item) => item.groupId === event.groupId)
          .map((item) => item.date)
          .sort()
      : selectedDates.size > 0
        ? [...selectedDates].sort()
        : [currentDate];
    const start = eventDates[0] ?? currentDate;
    const end = eventDates[eventDates.length - 1] ?? currentDate;
    if (openMobileEventRoute(start, end, event, initialType)) return;
    setEditingEvent(event);
    setNewEventType(initialType);
    setDraftStartTime(undefined);
    setDraftEndTime(undefined);
    setIsEndDateChosen(false);
    setFormStartDate(start);
    setFormEndDate(end);
    onDatesChange(eventDates);
    setIsEventFormVisible(true);
  };

  const closeEventForm = () => {
    setIsEventFormVisible(false);
    setEditingEvent(undefined);
    setNewEventType(undefined);
    setDraftStartTime(undefined);
    setDraftEndTime(undefined);
    onDatesChange([]);
  };

  const openTimedEventForm = (date: string, startTime: number) => {
    if (
      openMobileEventRoute(
        date,
        date,
        undefined,
        CalendarEventType.Event,
        startTime,
        Math.min(startTime + 30, 1439),
      )
    ) {
      return;
    }
    setEditingEvent(undefined);
    setNewEventType(CalendarEventType.Event);
    setIsEndDateChosen(false);
    setFormStartDate(date);
    setFormEndDate(date);
    setDraftStartTime(startTime);
    setDraftEndTime(Math.min(startTime + 30, 1439));
    onDatesChange([date]);
    setIsEventFormVisible(true);
  };

  useEffect(() => {
    if (noteRequest <= 0) return;
    const date = currentDate;
    setEditingEvent(undefined);
    setNewEventType(CalendarEventType.Todo);
    setIsEndDateChosen(false);
    setFormStartDate(date);
    setFormEndDate(date);
    onDatesChange([date]);
    setIsEventFormVisible(true);
  }, [noteRequest]);

  useEffect(() => {
    if (!noteEditRequest) return;
    openEventForm(noteEditRequest.event);
  }, [noteEditRequest?.key]);

  const deleteEditedEvent = async () => {
    if (!editingEvent) return;
    if (
      !window.confirm(
        isPolish
          ? 'Usunąć to wydarzenie ze wszystkich wybranych dni?'
          : 'Delete this event from all selected days?',
      )
    ) {
      return;
    }
    const eventToDelete = editingEvent;
    const relatedEvents = events.filter(
      (event) => event.groupId === eventToDelete.groupId,
    );
    const deletionToast = toast.loading(
      isPolish ? 'Usuwanie wydarzenia…' : 'Deleting event…',
    );
    setIsDeleting(true);
    closeEventForm();
    try {
      await Promise.all(relatedEvents.map(deleteCareEvent));
      onEventsUpdated();
      toast.update(deletionToast, {
        render: isPolish
          ? 'Wydarzenie zostało usunięte.'
          : 'Event deleted.',
        type: 'success',
        isLoading: false,
        autoClose: 2500,
      });
    } catch (cause) {
      toast.update(deletionToast, {
        render:
          cause instanceof Error
            ? cause.message
            : isPolish
              ? 'Nie udało się usunąć wydarzenia.'
              : 'The event could not be deleted.',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedDaysLabel = (count: number) =>
    isPolish
      ? `${count} ${count === 1 ? 'dzień' : 'dni'}`
      : `${count} ${count === 1 ? 'day' : 'days'}`;
  const selectionInfo =
    selectedDates.size > 0 && !isEventFormVisible ? (
      <span className={styles.selectionInfo} role="status">
        <CalendarDays size={14} aria-hidden />
        {isPolish ? 'Zaznaczono' : 'Selected'}{' '}
        <strong>{selectedDaysLabel(selectedDates.size)}</strong>
        <button
          type="button"
          onClick={() => onDatesChange([])}
          aria-label={isPolish ? 'Wyczyść zaznaczenie' : 'Clear selection'}
          title={isPolish ? 'Wyczyść zaznaczenie' : 'Clear selection'}
        >
          ×
        </button>
      </span>
    ) : null;
  const addEventButton = (
    <button
      type="button"
      className={styles.topbarAddButton}
      onClick={() => openEventForm()}
    >
      <Plus size={17} aria-hidden />
      {isPolish ? 'Dodaj wydarzenie' : 'Add event'}
    </button>
  );
  const rangeLabel =
    range === 'day'
      ? formatDate(currentDate, language)
      : `${formatDate(rangeBounds.start, language, false)} – ${formatDate(
          rangeBounds.end,
          language,
          false,
        )}`;
  const renderEventPreview = (event: CalendarEvent, hideDate = false) => (
    <button
      key={`preview-${event.id}`}
      type="button"
      className={styles.eventPreview}
      style={{ '--event-color': eventColor(event) } as CSSProperties}
      aria-label={isPolish ? 'Podgląd wydarzenia' : 'Event preview'}
      onClick={() => setDetailEvent(event)}
    >
      <span className={styles.eventPreviewIcon}>
        <CalendarEventAvatar event={event} size={64} variant='square' />
      </span>
      <div className={styles.eventPreviewContent}>
        <small>
          <strong className={styles.eventMetaTime}>
            {eventTime(event) ?? (isPolish ? 'Cały dzień' : 'All day')}
          </strong>
          {!hideDate && (range !== 'week' || weekListView) && (
            <>
              {' · '}
              <span>{formatDate(event.date, language)}</span>
            </>
          )}
        </small>
        <h3>
          {event.name || typeLabels[event.type]?.[isPolish ? 'pl' : 'en']}
        </h3>
        {event.description && <p>{event.description}</p>}
      </div>
    </button>
  );
  const renderTimelineEventPreview = (
    event: CalendarEvent,
    compact: boolean,
  ) => {
    const title =
      event.name || typeLabels[event.type]?.[isPolish ? 'pl' : 'en'];
    const time = eventTime(event) ?? (isPolish ? 'Cały dzień' : 'All day');
    const icon = (
      <span className={styles.timelineEventIcon}>
        <CalendarEventAvatar event={event} size={32} variant="square" />
      </span>
    );

    if (compact) {
      return (
        <button
          type="button"
          className={classNames(
            styles.eventPreview,
            styles.timelineEventPreview,
            styles.compactTimelineEventPreview,
          )}
          style={{ '--event-color': eventColor(event) } as CSSProperties}
          aria-label={isPolish ? 'Podgląd wydarzenia' : 'Event preview'}
          onClick={() => setDetailEvent(event)}
        >
          <div className={styles.compactTimelineEventRow}>
            {icon}
            <strong className={styles.eventMetaTime}>{time},</strong>
            <h3>{title}</h3>
            {event.description && <p>{event.description}</p>}
          </div>
        </button>
      );
    }

    return (
      <button
        type="button"
        className={classNames(styles.eventPreview, styles.timelineEventPreview)}
        style={{ '--event-color': eventColor(event) } as CSSProperties}
        aria-label={isPolish ? 'Podgląd wydarzenia' : 'Event preview'}
        onClick={() => setDetailEvent(event)}
      >
        <div className={styles.timelineEventHeader}>
          {icon}
          <strong className={styles.eventMetaTime}>{time}</strong>
        </div>
        <div className={styles.timelineEventBody}>
          <h3>{title}</h3>
          {event.description && <p>{event.description}</p>}
        </div>
      </button>
    );
  };
  const renderWideTimeline = (
    dayEvents: CalendarEvent[],
    layoutEvents = dayEvents,
    showLabels = true,
    date?: string,
    allDayRows?: number,
  ) => {
    const allDayEvents = dayEvents.filter(
      (event) => event.startTime === undefined,
    );
    const allDayRowCount = allDayRows ?? allDayEvents.length;
    const visibleAllDayRows = Math.min(
      allDayRowCount,
      MAX_VISIBLE_ALL_DAY_ROWS,
    );
    const allDayHeight =
      allDayBlockHeight(visibleAllDayRows) + ALL_DAY_BLOCK_GAP;
    const allDayLabel = isPolish ? 'Cały dzień' : 'All day';
    const allDayChips = allDayEvents.map((event) => (
      <div key={`all-day-${event.id}`} className={styles.allDayChip}>
        {renderTimelineEventPreview(event, true)}
      </div>
    ));
    const allDayBlock =
      allDayRowCount === 0 ? null : !date ? (
        <div
          className={styles.allDayAxis}
          style={{ height: allDayHeight }}
          data-all-day-row="true"
        >
          {allDayLabel}
        </div>
      ) : showLabels ? (
        <div className={styles.allDayTimeline} data-all-day-row="true">
          <span>{allDayLabel}</span>
          <div
            className={styles.allDayList}
            style={{ maxHeight: allDayBlockHeight(MAX_VISIBLE_ALL_DAY_ROWS) }}
          >
            {allDayChips}
          </div>
        </div>
      ) : (
        <div
          className={classNames(styles.allDayList, styles.allDayColumn)}
          style={{ height: allDayHeight }}
          data-all-day-row="true"
        >
          {allDayChips}
        </div>
      );
    const timedEvents = dayEvents.filter(
      (event) => event.startTime !== undefined,
    );
    const layoutTimedEventItems = layoutEvents.filter(
      (event) => event.startTime !== undefined,
    );
    const slotHeights = Array.from(
      { length: TIMELINE_SLOTS },
      (_, slot) =>
        slot >= TIMELINE_ACTIVE_START_SLOT &&
        slot < TIMELINE_ACTIVE_END_SLOT
          ? TIMELINE_ACTIVE_SLOT_HEIGHT
          : TIMELINE_EMPTY_SLOT_HEIGHT,
    );
    for (const event of layoutTimedEventItems) {
      const segment = daySegment(event, daySegments);
      const startSlot = Math.max(0, Math.floor(segment.start / 30));
      const endSlot = Math.min(TIMELINE_SLOTS, Math.ceil(segment.end / 30));
      const currentHeight = slotHeights
        .slice(startSlot, endSlot)
        .reduce((sum, height) => sum + height, 0);
      const extra = Math.max(0, TIMELINE_EVENT_MIN_HEIGHT - currentHeight);
      const slotsCount = Math.max(1, endSlot - startSlot);
      for (let slot = startSlot; slot < endSlot; slot += 1) {
        slotHeights[slot] += extra / slotsCount;
      }
    }
    const slotOffsets = slotHeights.reduce<number[]>(
      (offsets, height, index) => {
        offsets.push((offsets[index - 1] ?? 0) + height);
        return offsets;
      },
      [],
    );
    const slotStart = (slot: number) =>
      slot === 0 ? 0 : slotOffsets[slot - 1];
    const timelineHeight =
      slotOffsets[slotOffsets.length - 1] ?? 0;
    const timelinePosition = (minute: number) => {
      const normalized = Math.max(0, Math.min(1440, minute));
      if (normalized === 1440) return timelineHeight;
      const slot = Math.floor(normalized / 30);
      const progress = (normalized - slot * 30) / 30;
      return slotStart(slot) + (slotHeights[slot] ?? 0) * progress;
    };
    const timedEventLayouts = layoutRanges(
      timedEvents.map((event) => {
        const { start, end } = daySegment(event, daySegments);
        const top = timelinePosition(start) + 2;
        return {
          id: event.id,
          start: top,
          end:
            top +
            Math.max(64, timelinePosition(end) - timelinePosition(start) - 4),
        };
      }),
    );

    return (
      <>
        {allDayBlock}
        <div
          className={styles.timeScale}
          data-time-scale="true"
          style={{ height: timelineHeight }}
        >
          {Array.from({ length: TIMELINE_SLOTS }, (_, slot) => (
            <div
              key={slot}
              className={classNames(styles.timeSlot, {
                [styles.hourSlot]: slot % 2 === 0,
                [styles.clickableTimeSlot]: Boolean(date),
              })}
              data-timeline-default-start={slot === 16 ? 'true' : undefined}
              style={{
                top: slotStart(slot),
                height: date ? slotHeights[slot] : undefined,
              }}
              role={date ? 'button' : undefined}
              tabIndex={date ? 0 : undefined}
              onClick={date ? () => openTimedEventForm(date, slot * 30) : undefined}
              onKeyDown={
                date
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openTimedEventForm(date, slot * 30);
                      }
                    }
                  : undefined
              }
            >
              {showLabels && slot % 2 === 0 && (
                <span>
                  {String(slot / 2).padStart(2, '0')}:00
                </span>
              )}
            </div>
          ))}
          {date === today && (
            <div
              className={styles.currentTimeLine}
              style={{ top: timelinePosition(currentMinute) }}
              aria-hidden="true"
            />
          )}
          {timedEvents.map((event) => {
            const { start, end } = daySegment(event, daySegments);
            const eventTop = timelinePosition(start);
            const eventBottom = timelinePosition(end);
            const layout = timedEventLayouts.get(event.id) ?? {
              lane: 0,
              columns: 1,
            };
            const axisWidth = showLabels ? '64px' : '0px';
            const eventHeight = Math.max(64, eventBottom - eventTop - 4);
            const eventDuration = end - start;
            const compact = eventDuration < 30 || eventHeight < 92;
            return (
              <div
                key={event.id}
                className={classNames(styles.timeScaleEvent, {
                  [styles.mediumTimeScaleEvent]:
                    !compact && eventHeight < 140,
                })}
                style={{
                  top: eventTop + 2,
                  height: eventHeight,
                  left: `calc(${axisWidth} + (100% - ${axisWidth}) * ${
                    layout.lane / layout.columns
                  })`,
                  width: `calc((100% - ${axisWidth}) / ${layout.columns})`,
                }}
              >
                {renderTimelineEventPreview(
                  event,
                  compact,
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };
  const renderWeekGrid = () => {
    const days: string[] = [];
    for (
      let date = rangeBounds.start;
      date <= rangeBounds.end;
      date = dayjs(date).add(1, 'day').format('YYYY-MM-DD')
    ) {
      days.push(date);
    }
    const eventsByDate = new Map(
      groupedEvents.map((group) => [group.date, group.events]),
    );
    const weekEvents = days.flatMap((date) => eventsByDate.get(date) ?? []);
    const weekAllDayRows = Math.max(
      0,
      ...days.map(
        (date) =>
          (eventsByDate.get(date) ?? []).filter(
            (event) => event.startTime === undefined,
          ).length,
      ),
    );

    return (
      <div
        className={styles.weekGrid}
        style={{ '--week-days': days.length } as CSSProperties}
      >
        <div className={styles.weekTimeAxis}>
          <div className={styles.weekAxisSpacer} />
          {renderWideTimeline([], weekEvents, true, undefined, weekAllDayRows)}
        </div>
        {days.map((date) => {
          const dayEvents = eventsByDate.get(date) ?? [];
          const hasOverlaps = [...layoutTimedEvents(dayEvents, daySegments).values()].some(
            (layout) => layout.columns > 1,
          );
          return (
            <section
              key={date}
              className={classNames(styles.weekDay, {
                [styles.hasEvents]: Boolean(dayEvents.length),
                [styles.hasOverlaps]: hasOverlaps,
                [styles.isToday]: date === today,
              })}
            >
              <h3 data-sticky-day-label="true">
                <span>{dayjs(date).locale(language).format('dd')}</span>
                <strong>{dayjs(date).format('D')}</strong>
              </h3>
              {renderWideTimeline(
                dayEvents,
                weekEvents,
                false,
                date,
                weekAllDayRows,
              )}
            </section>
          );
        })}
      </div>
    );
  };
  const renderTimelineContent = () => {
    if (groupedEvents.length === 0 && range === 'day') {
      return renderWideTimeline([], [], true, currentDate);
    }
    if (
      groupedEvents.length === 0 &&
      !(isWide && range === 'week' && !weekListView)
    ) {
      return (
        <div className={styles.emptyState}>
          <Columns2 size={30} aria-hidden />
          <h3>
            {isPolish ? 'Brak zaplanowanych wydarzeń' : 'No events planned'}
          </h3>
          <p>
            {isPolish
              ? 'Wybierz dzień w kalendarzu albo dodaj nowe wydarzenie.'
              : 'Choose a calendar day or add a new event.'}
          </p>
        </div>
      );
    }
    if (isWide && range === 'week' && !weekListView) return renderWeekGrid();
    if (range === 'month' && monthWeekColumns) {
      const monthStart = dayjs(currentDate).startOf('month');
      const monthEnd = dayjs(currentDate).endOf('month');
      const firstWeekStart = monthStart.subtract(
        (monthStart.day() + 6) % 7,
        'day',
      );
      const weeks: Array<{
        start: string;
        end: string;
        groups: typeof groupedEvents;
      }> = [];

      for (
        let weekStart = firstWeekStart;
        weekStart.format('YYYY-MM-DD') <= monthEnd.format('YYYY-MM-DD');
        weekStart = weekStart.add(7, 'day')
      ) {
        const weekEnd = weekStart.add(6, 'day');
        weeks.push({
          start: weekStart.format('YYYY-MM-DD'),
          end: weekEnd.format('YYYY-MM-DD'),
          groups: groupedEvents.filter(
            (group) =>
              group.date >= weekStart.format('YYYY-MM-DD') &&
              group.date <= weekEnd.format('YYYY-MM-DD'),
          ),
        });
      }

      return (
        <div
          className={styles.monthColumns}
          style={
            {
              '--month-columns': weeks
                .map((week) =>
                  week.groups.length > 0 ? 'minmax(0, 2fr)' : 'minmax(0, 1fr)',
                )
                .join(' '),
            } as CSSProperties
          }
        >
          {weeks.map((week) => (
            <section className={styles.monthWeek} key={week.start}>
              <header>
                <small>{isPolish ? 'Tydzień' : 'Week'}</small>
                <strong>
                  {dayjs(week.start).format('D MMM')} –{' '}
                  {dayjs(week.end).format('D MMM')}
                </strong>
              </header>
              <div>
                {week.groups.length > 0 ? (
                  week.groups.map((group) => (
                    <section key={group.date} className={styles.monthDay}>
                      <h3
                        className={
                          group.date === today ? styles.monthDayToday : undefined
                        }
                      >
                        <span>
                          {new Intl.DateTimeFormat(
                            isPolish ? 'pl-PL' : 'en-GB',
                            { weekday: 'long' },
                          ).format(dayjs(group.date).toDate())}
                          ,
                        </span>
                        <strong>
                          {new Intl.DateTimeFormat(
                            isPolish ? 'pl-PL' : 'en-GB',
                            { day: 'numeric', month: 'long' },
                          ).format(dayjs(group.date).toDate())}
                        </strong>
                      </h3>
                      <div className={styles.timeline}>
                        {group.events.map((event) =>
                          renderEventPreview(event),
                        )}
                      </div>
                    </section>
                  ))
                ) : (
                  <span className={styles.monthWeekEmpty}>
                    {isPolish ? 'Brak wydarzeń' : 'No events'}
                  </span>
                )}
              </div>
            </section>
          ))}
        </div>
      );
    }
    return groupedEvents.map((group) => (
      <section key={group.date} className={styles.dayGroup}>
        {range !== 'day' && (
          <h3>
            <CalendarDays size={14} aria-hidden />
            <span>
              {formatDateParts(group.date, language).map((part, index) =>
                part.type === 'day' ? (
                  <span
                    className={styles.dayNumber}
                    key={`${part.type}-${index}`}
                  >
                    {part.value}
                  </span>
                ) : (
                  part.value
                ),
              )}
            </span>
          </h3>
        )}
        {isWide && range === 'day' ? (
          renderWideTimeline(group.events, group.events, true, group.date)
        ) : (
          <div className={styles.timeline}>
            {group.events.map((event) => renderEventPreview(event))}
          </div>
        )}
      </section>
    ));
  };

  return (
    <section
      className={classNames(styles.panel, {
        [styles.compact]: !isWide,
        [styles.wide]: isWide,
      })}
      aria-label={isPolish ? 'Plan dnia' : 'Day plan'}
    >
      {!isEventFormVisible && (
        <>
          <div className={styles.topbar}>
            <header className={styles.header}>
              <div className={styles.headerMeta}>
                <span className={styles.eyebrow}>
                  {isPolish ? 'Kalendarz rodzinny' : 'Family calendar'}
                </span>
                {showWidthControls && (
                  <div
                    className={styles.widthToggle}
                    aria-label="Szerokość panelu"
                  >
                    <button
                      type="button"
                      className={!isWide ? styles.active : undefined}
                      onClick={() => onChangeWidth(COMPACT_WIDTH)}
                      aria-pressed={!isWide}
                      title={isPolish ? 'Wąski panel' : 'Narrow panel'}
                    >
                      <Shrink size={17} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={isWide ? styles.active : undefined}
                      onClick={() => onChangeWidth(WIDE_WIDTH)}
                      aria-pressed={isWide}
                      title={isPolish ? 'Szeroki panel' : 'Wide panel'}
                    >
                      <Expand size={17} aria-hidden />
                    </button>
                  </div>
                )}
              </div>
              <div className={styles.headerMain}>
                <div className={styles.headerTitleRow}>
                  <h2>
                    {isPolish
                      ? range === 'week'
                        ? 'Plan tygodnia'
                        : range === 'month'
                          ? 'Plan miesiąca'
                          : 'Plan dnia'
                      : range === 'week'
                        ? 'Week plan'
                        : range === 'month'
                          ? 'Month plan'
                          : 'Day plan'}
                  </h2>
                  {!isWide && addEventButton}
                </div>
                <div className={styles.toolbar}>
                  <button
                    type="button"
                    className={styles.dateButton}
                    onClick={() => setFocusedDate(today)}
                  >
                    <CalendarDays size={17} aria-hidden />
                    <span>{isPolish ? 'Dzisiaj' : 'Today'}</span>
                  </button>
                  <div
                    className={styles.rangeTabs}
                    role="tablist"
                    aria-label="Zakres planu"
                  >
                    {(['day', 'week', 'month'] as PlanRange[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        role="tab"
                        aria-selected={range === item}
                        className={range === item ? styles.active : undefined}
                        onClick={() => setRange(item)}
                      >
                        {isPolish
                          ? item === 'day'
                            ? 'Dzień'
                            : item === 'week'
                              ? 'Tydzień'
                              : 'Miesiąc'
                          : item[0].toUpperCase() + item.slice(1)}
                      </button>
                    ))}
                  </div>
                  {isWide && addEventButton}
                </div>
              </div>
            </header>
            {selectionInfo}
          </div>
        </>
      )}

      {!isEventFormVisible && (
        <div className={styles.dateNavigator}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={(() => {
              if (allowPastNavigation) return false;
              const amount = range === 'month' ? 1 : range === 'week' ? 7 : 1;
              const unit = range === 'month' ? 'month' : 'day';
              return dayjs(currentDate)
                .subtract(amount, unit)
                .isBefore(today, 'day');
            })()}
            aria-label={isPolish ? 'Poprzedni okres' : 'Previous period'}
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <strong>{rangeLabel}</strong>
          <button
            type="button"
            onClick={() => navigate(1)}
            aria-label={isPolish ? 'Następny okres' : 'Next period'}
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
      )}

      <div ref={planBodyRef} className={styles.planBody}>
        {isEventFormVisible && modalEventEditor && renderTimelineContent()}
        {isEventFormVisible && modalEventEditor && (
          <div
            className={styles.eventEditorBackdrop}
            role='presentation'
            onClick={closeEventForm}
          />
        )}
        {isEventFormVisible ? (
          <div
            className={classNames(styles.eventEditor, {
              [styles.modalEventEditor]: modalEventEditor,
            })}
          >
            <div className={styles.editorHeader}>
              <strong>
                {editingEvent
                  ? isPolish
                    ? 'Edytuj wydarzenie'
                    : 'Edit event'
                  : newEventType === CalendarEventType.Todo
                    ? isPolish
                      ? 'Nowe zadanie'
                      : 'New task'
                    : isPolish
                      ? 'Nowe wydarzenie'
                      : 'New event'}
              </strong>
            </div>
            <DashboardEventForm
              selection={[...selectedDates]}
              setSelection={(next) => {
                const value =
                  typeof next === 'function'
                    ? next(new Set(selectedDates))
                    : next;
                onDatesChange([...value]);
              }}
              setIsMultiSelectionMode={() => undefined}
              initialEvent={editingEvent}
              initialType={newEventType}
              initialStartTime={draftStartTime}
              initialEndTime={draftEndTime}
              redirectAfterSave={saveRedirectPath ?? saveRedirect}
              rangeStartDate={formStartDate}
              rangeEndDate={formEndDate}
              preserveGroupId={Boolean(editingEvent)}
              submitLabel={
                editingEvent
                  ? 'Zapisz wydarzenie'
                  : newEventType === CalendarEventType.Todo
                    ? 'Dodaj zadanie'
                    : 'Dodaj wydarzenie'
              }
              staticLayout
              hideCancel
              hideSelectionSummary={modalEventEditor}
              footerActions={
                <div className={styles.editorHeaderActions}>
                  {editingEvent && (
                    <button
                      type="button"
                      className={styles.deleteEvent}
                      onClick={() => void deleteEditedEvent()}
                      disabled={isDeleting}
                    >
                      <Trash2 size={15} aria-hidden />
                      {isDeleting
                        ? isPolish
                          ? 'Usuwanie…'
                          : 'Deleting…'
                        : isPolish
                          ? 'Usuń'
                          : 'Delete'}
                    </button>
                  )}
                  <button type="button" onClick={closeEventForm}>
                    {isPolish ? 'Anuluj' : 'Cancel'}
                  </button>
                </div>
              }
              renderRangeFields={({
                isAllDay,
                startTime,
                endTime,
                setStartTime,
                setEndTime,
              }) => {
                const hasEndDate =
                  !isAllDay ||
                  isEndDateChosen ||
                  formEndDate !== formStartDate;
                const renderRangeCard = (variant: 'start' | 'end') => {
                  const isStart = variant === 'start';
                  const date = isStart ? formStartDate : formEndDate;
                  const isEmpty = !isStart && !hasEndDate;
                  const parts = formatDateParts(date, language);
                  const part = (type: string) =>
                    parts.find((item) => item.type === type)?.value ?? '';
                  const timeValue = isStart ? startTime : endTime;
                  const setTime = isStart ? setStartTime : setEndTime;
                  const timeLabel = isStart
                    ? isPolish
                      ? 'Godzina rozpoczęcia'
                      : 'Start time'
                    : isPolish
                      ? 'Godzina zakończenia'
                      : 'End time';
                  return (
                    <div
                      className={classNames(styles.rangeCard, {
                        [styles.rangeCardStart]: isStart,
                        [styles.rangeCardEnd]: !isStart && !isEmpty,
                        [styles.rangeCardEmpty]: isEmpty,
                      })}
                    >
                      <span className={styles.rangeCardLabel}>
                        {isStart
                          ? isPolish
                            ? 'Data startu'
                            : 'Start date'
                          : isPolish
                            ? 'Data zakończenia'
                            : 'End date'}
                      </span>
                      <div className={styles.rangeCardRow}>
                        <label className={styles.rangeCardDate}>
                          {isEmpty ? (
                            <>
                              <strong>—</strong>
                              <span>
                                {isPolish ? 'Wybierz datę' : 'Pick a date'}
                              </span>
                            </>
                          ) : (
                            <>
                              <strong>{part('day')}</strong>
                              <span>
                                {part('month')} {part('year')}
                                <small>{part('weekday')}</small>
                              </span>
                            </>
                          )}
                          <CalendarDays aria-hidden="true" />
                          <input
                            type="date"
                            aria-label={
                              isStart
                                ? isPolish
                                  ? 'Data startu'
                                  : 'Start date'
                                : isPolish
                                  ? 'Data zakończenia'
                                  : 'End date'
                            }
                            min={isStart ? undefined : formStartDate}
                            value={date}
                            onClick={(event) =>
                              event.currentTarget.showPicker?.()
                            }
                            onChange={(event) => {
                              if (!event.target.value) return;
                              if (isStart) {
                                setFormRange(event.target.value, formEndDate);
                              } else {
                                setIsEndDateChosen(true);
                                setFormRange(formStartDate, event.target.value);
                              }
                            }}
                          />
                        </label>
                        {!isAllDay && (
                          <>
                            <span
                              className={styles.rangeCardDivider}
                              aria-hidden="true"
                            />
                            <div className={styles.rangeCardTime}>
                              <Clock3 aria-hidden="true" />
                              <input
                                className={styles.nativeTimeInput}
                                type="time"
                                aria-label={timeLabel}
                                value={timeValue}
                                step={300}
                                onChange={(event) => setTime(event.target.value)}
                              />
                              <Select
                                aria-label={timeLabel}
                                className={styles.timeSelect}
                                value={timeValue}
                                onChange={(event) => setTime(event.target.value)}
                              >
                                {TIME_OPTIONS.map((time) => (
                                  <option key={time} value={time}>
                                    {time}
                                  </option>
                                ))}
                              </Select>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                };
                const selectedDays = [...selectedDates].sort();
                if (isScatteredSelection(selectedDays)) {
                  const renderTimeSelect = (variant: 'start' | 'end') => {
                    const isStart = variant === 'start';
                    const label = isStart
                      ? isPolish
                        ? 'Godzina rozpoczęcia'
                        : 'Start time'
                      : isPolish
                        ? 'Godzina zakończenia'
                        : 'End time';
                    return (
                      <div className={styles.rangeCardTime}>
                        <Clock3 aria-hidden="true" />
                        <Select
                          aria-label={label}
                          className={styles.timeSelect}
                          value={isStart ? startTime : endTime}
                          onChange={(event) =>
                            (isStart ? setStartTime : setEndTime)(
                              event.target.value,
                            )
                          }
                        >
                          {TIME_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </Select>
                      </div>
                    );
                  };
                  return (
                    <div
                      className={classNames(
                        styles.rangeCard,
                        styles.rangeCardStart,
                        styles.selectedDaysCard,
                      )}
                    >
                      <span className={styles.rangeCardLabel}>
                        {isPolish ? 'Wybrane dni' : 'Selected days'} ·{' '}
                        {selectedDaysLabel(selectedDays.length)}
                      </span>
                      <div className={styles.selectedDayChips}>
                        {selectedDays.map((date) => (
                          <button
                            key={date}
                            type="button"
                            title={isPolish ? 'Usuń dzień' : 'Remove day'}
                            onClick={() =>
                              onDatesChange(
                                selectedDays.filter((item) => item !== date),
                              )
                            }
                          >
                            {new Intl.DateTimeFormat(
                              isPolish ? 'pl-PL' : 'en-GB',
                              { weekday: 'short', day: 'numeric', month: 'short' },
                            ).format(dayjs(date).toDate())}
                            <span aria-hidden="true">×</span>
                          </button>
                        ))}
                      </div>
                      {!isAllDay && (
                        <div className={styles.selectedDaysTimes}>
                          {renderTimeSelect('start')}
                          <span aria-hidden="true">–</span>
                          {renderTimeSelect('end')}
                          <small>
                            {isPolish
                              ? 'te same godziny każdego dnia'
                              : 'same hours on each day'}
                          </small>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div className={styles.eventDateTimeRange}>
                    {renderRangeCard('start')}
                    {renderRangeCard('end')}
                  </div>
                );
              }}
              onCancel={closeEventForm}
              onSuccess={() => {
                closeEventForm();
                onEventsUpdated();
              }}
            />
          </div>
        ) : (
          renderTimelineContent()
        )}
      </div>

      {detailEvent &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={styles.eventModalBackdrop}
            role="presentation"
            onMouseDown={() => setDetailEvent(undefined)}
          >
            <section
              className={styles.eventModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="event-modal-title"
              onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
            >
              <header>
                <div>
                  <small>{isPolish ? 'Szczegóły wydarzenia' : 'Event details'}</small>
                  <h3 id="event-modal-title">{detailEvent.name || detailEvent.type}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailEvent(undefined)}
                  aria-label={isPolish ? 'Zamknij' : 'Close'}
                >
                  ×
                </button>
              </header>
              <dl>
                <div>
                  <dt>{isPolish ? 'Termin' : 'When'}</dt>
                  <dd>
                    {formatDate(detailEvent.date, language)}
                    {' · '}
                    {eventTime(detailEvent) ?? (isPolish ? 'Cały dzień' : 'All day')}
                  </dd>
                </div>
                <div>
                  <dt>{isPolish ? 'Typ' : 'Type'}</dt>
                  <dd>
                    {typeLabels[detailEvent.type]?.[isPolish ? 'pl' : 'en'] ??
                      detailEvent.type}
                  </dd>
                </div>
              </dl>
              {detailEvent.description && <p>{detailEvent.description}</p>}
              <button
                type="button"
                className={styles.eventModalEdit}
                onClick={() => {
                  setDetailEvent(undefined);
                  openEventForm(detailEvent);
                }}
              >
                {isPolish ? 'Edytuj' : 'Edit'}
              </button>
            </section>
          </div>,
          document.body,
        )}
    </section>
  );
}
