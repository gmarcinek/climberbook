'use client';

import {
  assignCareDates,
  clearCareRange,
  listCareEvents,
} from '@api/db/events/careEventsApi';
import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { useAppContext } from '@app/AppContext';
import { Calendar } from '@components/Calendar/Calendar';
import type { OnDayClickHandler } from '@components/Calendar/Calendar.context';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parseDate } from '@internationalized/date';
import { DateRangePicker } from '@nextui-org/react';
import { caregiverBackground } from '@utils/caregiverColors';
import { useCaregiverColors } from '@utils/useCaregiverColors';
import { colorBlueGreen700, white } from '@utils/color';
import { cssZoom } from '@utils/cssZoom';
import { otherParentSubjectId, useOtherParent } from '@utils/useOtherParent';
import dayjs from 'dayjs';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CareSummary } from '../CareSummary/CareSummary';
import {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styles from './CarePlanner.module.scss';

const CARE_HOME = '/alternating-care';
const PREVIEW_MONTHS = 12;
const DEFAULT_REPEATS = 6;
const MAX_PLAN_DAYS = 3660;

type Caregiver = {
  id?: string;
  subjectId: string;
  name: string;
  role: string;
};

type Phase = {
  caregiverId: string;
  days: number;
};

type PlannerTab = 'manual' | 'cycles' | 'remove';
type PlannerView = 'planning' | 'upcoming';
type WizardStep = 1 | 2 | 3;

const confirmationCode = () =>
  crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();

const careEvent = (
  date: string,
  subjectId: string,
  style: CalendarEvent['style']
): CalendarEvent => ({
  id: `simulated-${date}`,
  groupId: `CARE:${subjectId}`,
  date,
  type: CalendarEventType.Alternating,
  issuer: subjectId,
  creationTime: 0,
  name: subjectId,
  description: '',
  style,
});

const replaceCare = (
  existing: CalendarEvent[],
  replacements: CalendarEvent[],
  isReplaced: (date: string) => boolean
) => [
  ...existing.filter(
    (event) =>
      event.type !== CalendarEventType.Alternating || !isReplaced(event.date)
  ),
  ...replacements,
];

export function CarePlanner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, language } = useAppContext();
  const { profile: otherParent } = useOtherParent();
  const isEnglish = language === 'en';
  const locale = isEnglish ? 'en' : 'pl';

  const [tab, setTab] = useState<PlannerTab>('manual');
  const [view, setView] = useState<PlannerView>('planning');
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [viewStart, setViewStart] = useState(
    dayjs().subtract(1, 'month').startOf('month')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [manualCaregiver, setManualCaregiver] = useState<string | null>(null);
  const [manualAssignments, setManualAssignments] = useState<
    Record<string, string>
  >({});
  const manualAnchorRef = useRef<{ date: string; isAssign: boolean } | null>(null);

  const [step, setStep] = useState<WizardStep>(1);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [repeatCount, setRepeatCount] = useState(DEFAULT_REPEATS);
  const [phases, setPhases] = useState<Phase[]>([]);

  const today = dayjs().format(dateFormat);
  const [removeStart, setRemoveStart] = useState<string | null>(null);
  const [removeEnd, setRemoveEnd] = useState<string | null>(null);
  const [removeCode, setRemoveCode] = useState('');
  const [removeInput, setRemoveInput] = useState('');

  useEffect(() => {
    setRemoveInput('');
    setRemoveCode(removeStart && removeEnd ? confirmationCode() : '');
  }, [removeEnd, removeStart]);

  useEffect(() => {
    void Promise.all([
      fetch('/api/alternating-care/caregivers').then(async (response) => {
        const text = await response.text();
        if (!response.ok) throw new Error('Nie udało się pobrać opiekunów.');
        try {
          return JSON.parse(text) as { caregivers?: Caregiver[] };
        } catch {
          throw new Error(`Błąd opiekunów (${response.status}).`);
        }
      }),
      fetch('/api/alternating-care/plan').then(async (response) => {
        const text = await response.text();
        if (!response.ok) throw new Error('Nie udało się pobrać planu.');
        try {
          return JSON.parse(text) as {
            plan?: { startDate: string; endDate: string; phases: Phase[] } | null;
          };
        } catch {
          throw new Error(`Błąd planu (${response.status}).`);
        }
      }),
    ])
      .then(([caregiverData, planData]) => {
        const saved = caregiverData.caregivers ?? [];
        const selfId = `self:${user.id}`;
        const otherId = otherParentSubjectId(otherParent);
        const savedOther = saved.find((item) => item.subjectId === otherId);
        const available: Caregiver[] = [
          {
            subjectId: selfId,
            name: user.name,
            role: saved.find((item) => item.subjectId === selfId)?.role || 'tata',
          },
          {
            subjectId: otherId,
            name:
              savedOther?.name ||
              otherParent.name ||
              (isEnglish ? 'Other parent' : 'Drugi rodzic'),
            role: savedOther?.role || 'mama',
          },
          ...saved.filter(
            (item) => item.subjectId !== selfId && item.subjectId !== otherId
          ),
        ];
        setCaregivers(available);
        setManualCaregiver((current) => current ?? selfId);
        if (planData.plan) {
          const { phases: savedPhases } = planData.plan;
          const savedCycle = savedPhases.reduce((sum, phase) => sum + phase.days, 0);
          const savedDays =
            dayjs(planData.plan.endDate).diff(dayjs(planData.plan.startDate), 'day') + 1;
          setPhases(savedPhases);
          if (savedCycle > 0) {
            setRepeatCount(Math.max(1, Math.round(savedDays / savedCycle)));
          }
        } else {
          setPhases(
            available.slice(0, 2).map((caregiver) => ({
              caregiverId: caregiver.subjectId,
              days: 14,
            }))
          );
        }
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : 'Błąd ładowania planu.')
      );
  }, [isEnglish, otherParent, user.id, user.name]);

  const cycleDays = useMemo(
    () => phases.reduce((sum, phase) => sum + phase.days, 0),
    [phases]
  );
  const maxRepeats = Math.max(1, Math.floor(MAX_PLAN_DAYS / Math.max(cycleDays, 1)));
  const effectiveRepeats = Math.min(Math.max(1, repeatCount), maxRepeats);
  // Step 2 previews a single cycle; step 3 shows every repetition.
  const endDate = useMemo(() => {
    if (!startDate || step === 1 || cycleDays <= 0) return startDate;
    const cycles = step === 2 ? 1 : effectiveRepeats;
    return dayjs(startDate)
      .add(cycles * cycleDays - 1, 'day')
      .format(dateFormat);
  }, [cycleDays, effectiveRepeats, startDate, step]);
  const isRangeValid = Boolean(startDate && endDate && endDate > startDate);

  // Mirrors the CSS grid (auto-fill, min 340px, 16px gap) to know the column count.
  const [previewGrid, setPreviewGrid] = useState<HTMLDivElement | null>(null);
  const [previewColumns, setPreviewColumns] = useState(1);
  const [previewMinMonths, setPreviewMinMonths] = useState(PREVIEW_MONTHS);
  useEffect(() => {
    if (!previewGrid) return;
    const observer = new ResizeObserver(([entry]) => {
      setPreviewColumns(
        Math.max(1, Math.floor((entry.contentRect.width + 16) / (340 + 16)))
      );
    });
    observer.observe(previewGrid);
    return () => observer.disconnect();
  }, [previewGrid]);

  // In the cycle wizard the preview grows until the last simulated day is visible;
  // the count is rounded up so the last grid row is always full.
  const monthCount = useMemo(() => {
    const lastDate = tab === 'cycles' ? endDate : tab === 'remove' ? removeEnd : null;
    const neededMonths = lastDate
      ? dayjs(lastDate).startOf('month').diff(viewStart, 'month') + 1
      : 0;
    const months = Math.max(previewMinMonths, neededMonths);
    return Math.ceil(months / previewColumns) * previewColumns;
  }, [endDate, previewColumns, previewMinMonths, removeEnd, tab, viewStart]);

  const previewMonths = useMemo(
    () =>
      Array.from({ length: monthCount }, (_, index) =>
        viewStart.add(index, 'month').format(dateFormat)
      ),
    [monthCount, viewStart]
  );
  const viewEnd = viewStart.add(monthCount, 'month');

  const eventsQuery = useQuery({
    queryKey: [
      'carePlannerEvents',
      viewStart.format(dateFormat),
      viewEnd.format(dateFormat),
    ],
    queryFn: () =>
      listCareEvents({
        start: viewStart.format(dateFormat),
        end: viewEnd.format(dateFormat),
      }),
    placeholderData: (previous) => previous,
  });

  // Same colour the calendar derives for this caregiver everywhere.
  const caregiverColors = useCaregiverColors();
  const caregiverStyle = useCallback(
    (subjectId: string): CalendarEvent['style'] =>
      subjectId.startsWith('self:')
        ? undefined
        : {
            background: caregiverBackground(`CARE:${subjectId}`, caregiverColors),
            color: white,
          },
    [caregiverColors]
  );

  const cycleEvents = useMemo<CalendarEvent[]>(() => {
    const existing = eventsQuery.data ?? [];
    if (
      step === 1 ||
      !startDate ||
      !endDate ||
      !isRangeValid ||
      !phases.length ||
      cycleDays <= 0
    ) {
      return existing;
    }
    const rangeStart = dayjs(startDate);
    const rangeEnd = dayjs(endDate);
    const from = rangeStart.isBefore(viewStart, 'day') ? viewStart : rangeStart;
    const lastVisible = viewEnd.subtract(1, 'day');
    const to = rangeEnd.isAfter(lastVisible, 'day') ? lastVisible : rangeEnd;
    const simulated: CalendarEvent[] = [];
    for (let date = from; !date.isAfter(to, 'day'); date = date.add(1, 'day')) {
      let cycleOffset = date.diff(rangeStart, 'day') % cycleDays;
      const phase =
        phases.find((item) => {
          if (cycleOffset < item.days) return true;
          cycleOffset -= item.days;
          return false;
        }) ?? phases[0];
      simulated.push(
        careEvent(
          date.format(dateFormat),
          phase.caregiverId,
          caregiverStyle(phase.caregiverId)
        )
      );
    }
    return replaceCare(
      existing,
      simulated,
      (date) => date >= startDate && date <= endDate
    );
  }, [
    caregiverStyle,
    cycleDays,
    endDate,
    eventsQuery.data,
    isRangeValid,
    phases,
    startDate,
    step,
    viewEnd,
    viewStart,
  ]);

  const manualEvents = useMemo<CalendarEvent[]>(() => {
    const existing = eventsQuery.data ?? [];
    const entries = Object.entries(manualAssignments);
    if (!entries.length) return existing;
    return replaceCare(
      existing,
      entries.map(([date, subjectId]) =>
        careEvent(date, subjectId, caregiverStyle(subjectId))
      ),
      (date) => date in manualAssignments
    );
  }, [caregiverStyle, eventsQuery.data, manualAssignments]);

  const manualCount = Object.keys(manualAssignments).length;

  // Care days in the removal range stay visible and get a red cross.
  const removedDates = useMemo(
    () =>
      removeStart && removeEnd
        ? new Set(
            (eventsQuery.data ?? [])
              .filter(
                (event) =>
                  event.type === CalendarEventType.Alternating &&
                  event.date >= removeStart &&
                  event.date <= removeEnd
              )
              .map((event) => event.date)
          )
        : new Set<string>(),
    [eventsQuery.data, removeEnd, removeStart]
  );
  const removedDays = removedDates.size;
  const isDayMarked = useCallback(
    (date: string) => tab === 'remove' && removedDates.has(date),
    [removedDates, tab]
  );

  const isDayDimmed = useCallback(
    (date: string) => {
      if (view === 'upcoming') return false;
      if (tab === 'manual') {
        return manualCount > 0 && !(date in manualAssignments);
      }
      if (tab === 'remove') {
        if (date <= today) return true;
        if (!removeStart) return false;
        return date < removeStart || date > (removeEnd ?? removeStart);
      }
      if (!startDate || !endDate) return true;
      return date < startDate || date > endDate;
    },
    [
      endDate,
      manualAssignments,
      manualCount,
      removeEnd,
      removeStart,
      startDate,
      tab,
      today,
      view,
    ]
  );

  const handleDayClick = useCallback<OnDayClickHandler>(
    (day, event) => {
      if (day.isOffset) return;
      if (view === 'upcoming') return;
      const isShift = Boolean(event?.shiftKey);
      if (isShift) window.getSelection()?.removeAllRanges();
      if (tab === 'remove') {
        if (day.date <= today) return;
        if (isShift && removeStart) {
          if (day.date < removeStart) {
            setRemoveEnd(removeEnd ?? removeStart);
            setRemoveStart(day.date);
          } else {
            setRemoveEnd(day.date);
          }
          return;
        }
        if (!removeStart || removeEnd || day.date < removeStart) {
          setRemoveStart(day.date);
          setRemoveEnd(null);
        } else {
          setRemoveEnd(day.date);
        }
        return;
      }
      if (tab === 'manual') {
        if (!manualCaregiver) return;
        const anchor = manualAnchorRef.current;
        if (isShift && anchor) {
          const [from, to] =
            anchor.date <= day.date ? [anchor.date, day.date] : [day.date, anchor.date];
          setManualAssignments((current) => {
            const next = { ...current };
            for (
              let cursor = dayjs(from);
              !cursor.isAfter(dayjs(to), 'day');
              cursor = cursor.add(1, 'day')
            ) {
              const date = cursor.format(dateFormat);
              if (anchor.isAssign) next[date] = manualCaregiver;
              else if (next[date] === manualCaregiver) delete next[date];
            }
            return next;
          });
          manualAnchorRef.current = { date: day.date, isAssign: anchor.isAssign };
          return;
        }
        const isAssign = manualAssignments[day.date] !== manualCaregiver;
        manualAnchorRef.current = { date: day.date, isAssign };
        setManualAssignments((current) => {
          const next = { ...current };
          if (isAssign) next[day.date] = manualCaregiver;
          else delete next[day.date];
          return next;
        });
        return;
      }
      if (step === 1) setStartDate(day.date);
    },
    [
      manualAssignments,
      manualCaregiver,
      removeEnd,
      removeStart,
      step,
      tab,
      today,
      view,
    ]
  );

  const isRemoveConfirmed =
    Boolean(removeCode) && removeInput.trim().toUpperCase() === removeCode;

  const removeCare = async () => {
    if (!removeStart || !removeEnd || !isRemoveConfirmed) return;
    setIsSaving(true);
    setError(null);
    try {
      await clearCareRange(removeStart, removeEnd);
      setRemoveStart(null);
      setRemoveEnd(null);
      await queryClient.invalidateQueries();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Błąd usuwania opieki.');
    } finally {
      setIsSaving(false);
    }
  };

  const movePhase = (index: number, direction: -1 | 1) => {
    setPhases((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const saveCycles = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/alternating-care/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          phases,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        let data: { error?: string } | null = null;
        try {
          data = text ? (JSON.parse(text) as { error?: string }) : null;
        } catch {
          throw new Error(
            `Błąd zapisu planu (${response.status}): ${text.slice(0, 160)}`
          );
        }
        throw new Error(data?.error || `Błąd zapisu planu (${response.status}).`);
      }
      await queryClient.invalidateQueries();
      router.push(CARE_HOME);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Błąd zapisu planu.');
      setIsSaving(false);
    }
  };

  const saveManual = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await assignCareDates(
        Object.entries(manualAssignments).map(([date, subjectId]) => ({
          date,
          groupId: `CARE:${subjectId}`,
        }))
      );
      setManualAssignments({});
      await queryClient.invalidateQueries();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Błąd zapisu opieki.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: string) =>
    dayjs(date).locale(locale).format('dddd, D MMM YYYY');
  const isParentSubject = (subjectId: string) =>
    subjectId.startsWith('self:') ||
    subjectId === otherParentSubjectId(otherParent);
  const caregiverSwatch = (subjectId: string) =>
    subjectId.startsWith('self:')
      ? caregiverColors[subjectId] ?? colorBlueGreen700
      : caregiverStyle(subjectId)?.background;
  const caregiverName = (subjectId: string) =>
    caregivers.find((caregiver) => caregiver.subjectId === subjectId)?.name ??
    (subjectId.startsWith('self:')
      ? user.name
      : isEnglish
        ? 'Caregiver'
        : 'Opiekun');

  const [hiddenSubjects, setHiddenSubjects] = useState<Set<string>>(new Set());
  const toggleSubjectVisibility = (subjectId: string) =>
    setHiddenSubjects((current) => {
      const next = new Set(current);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });

  const tabEvents =
    tab === 'manual'
      ? manualEvents
      : tab === 'remove'
        ? eventsQuery.data ?? []
        : view === 'upcoming'
          ? eventsQuery.data ?? []
          : cycleEvents;
  const previewEvents = useMemo(
    () =>
      hiddenSubjects.size
        ? tabEvents.filter(
            (event) =>
              event.type !== CalendarEventType.Alternating ||
              !hiddenSubjects.has(
                event.groupId.startsWith('CARE:')
                  ? event.groupId.slice('CARE:'.length)
                  : `self:${user.id}`
              )
          )
        : tabEvents,
    [hiddenSubjects, tabEvents, user.id]
  );

  // Day details appear after hovering a day for one second.
  const [dayDetails, setDayDetails] = useState<{
    date: string;
    top: number;
    left: number;
    careSubjects: string[];
    events: CalendarEvent[];
  } | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const hoveredDate = useRef<string | null>(null);
  const clearDayDetails = () => {
    clearTimeout(hoverTimer.current);
    hoveredDate.current = null;
    setDayDetails(null);
  };
  const handlePreviewHover = (event: ReactMouseEvent<HTMLDivElement>) => {
    const dayElement = (event.target as HTMLElement).closest<HTMLElement>(
      '[id^="day-"]'
    );
    const date = dayElement?.id.slice('day-'.length) ?? null;
    if (date === hoveredDate.current) return;
    clearDayDetails();
    if (!dayElement || !date) return;
    hoveredDate.current = date;
    hoverTimer.current = setTimeout(() => {
      const rect = dayElement.getBoundingClientRect();
      const zoom = cssZoom(dayElement);
      const dayEvents = previewEvents.filter((item) => item.date === date);
      const careSubjects = [
        ...new Set(
          dayEvents
            .filter((item) => item.type === CalendarEventType.Alternating)
            .map((item) =>
              item.groupId.startsWith('CARE:')
                ? item.groupId.slice('CARE:'.length)
                : `self:${user.id}`
            )
        ),
      ];
      setDayDetails({
        date,
        top: rect.bottom / zoom + 6,
        left: Math.max(
          8,
          Math.min(rect.left / zoom, window.innerWidth / zoom - 288)
        ),
        careSubjects,
        events: dayEvents.filter(
          (item) => item.type !== CalendarEventType.Alternating
        ),
      });
    }, 1000);
  };
  useEffect(() => () => clearTimeout(hoverTimer.current), []);
  const steps: Array<{ id: WizardStep; label: string }> = [
    { id: 1, label: isEnglish ? 'Start date' : 'Data startu' },
    { id: 2, label: isEnglish ? 'Cycle' : 'Przebieg cyklu' },
    { id: 3, label: isEnglish ? 'Repeats' : 'Powtórzenia' },
  ];

  return (
    <section className={styles.page} aria-labelledby='care-planner-title'>
      <div className={styles.body}>
        <aside className={styles.summaryPanel}>
          <div className={styles.titleBar}>
            <Link href={CARE_HOME} className={styles.back}>
              <ArrowLeft size={16} />
              {isEnglish ? 'Back to care' : 'Wróć do opieki'}
            </Link>
            <h1 id='care-planner-title'>{isEnglish ? 'Care plan' : 'Plan opieki'}</h1>
          </div>
          <div className={styles.primaryTabs} role='tablist'>
            <button
              type='button'
              role='tab'
              aria-selected={view === 'planning'}
              data-active={view === 'planning'}
              onClick={() => setView('planning')}
            >
              {isEnglish ? 'Care planning' : 'Planowanie opieki'}
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={view === 'upcoming'}
              data-active={view === 'upcoming'}
              onClick={() => setView('upcoming')}
            >
              {isEnglish ? 'Planned care' : 'Zaplanowana opieka'}
            </button>
          </div>

          {view === 'planning' && <div className={styles.tabs} role='tablist'>
            <button
              type='button'
              role='tab'
              aria-selected={tab === 'manual'}
              data-active={tab === 'manual'}
              onClick={() => setTab('manual')}
            >
              Manual
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={tab === 'cycles'}
              data-active={tab === 'cycles'}
              onClick={() => setTab('cycles')}
            >
              {isEnglish ? 'Cycles' : 'Cykle'}
            </button>
            <button
              type='button'
              role='tab'
              aria-selected={tab === 'remove'}
              data-active={tab === 'remove'}
              onClick={() => setTab('remove')}
            >
              {isEnglish ? 'Remove' : 'Usuwanie'}
            </button>
          </div>}

          {view === 'upcoming' && (
            <div className={styles.upcomingPanel}>
              <CareSummary
                windowDays={365}
                upcomingCount='all'
                endDate={viewEnd.subtract(1, 'day').format(dateFormat)}
                section='upcoming'
              />
            </div>
          )}

          {view === 'planning' && <>
          {tab === 'remove' && (
            <div className={styles.stepBody}>
              <p className={styles.hint}>
                {isEnglish
                  ? 'Click the first and last day to remove. Only future care can be removed.'
                  : 'Kliknij pierwszy i ostatni dzień do usunięcia. Usunąć można tylko przyszłą opiekę.'}
              </p>
              <div className={styles.startDate} data-empty={!removeStart}>
                <small>{isEnglish ? 'From' : 'Od'}</small>
                <strong>
                  {removeStart
                    ? formatDate(removeStart)
                    : isEnglish
                      ? 'Pick a day in the calendar'
                      : 'Wybierz dzień w kalendarzu'}
                </strong>
              </div>
              <div className={styles.startDate} data-empty={!removeEnd}>
                <small>{isEnglish ? 'To' : 'Do'}</small>
                <strong>
                  {removeEnd
                    ? formatDate(removeEnd)
                    : isEnglish
                      ? 'Pick a day in the calendar'
                      : 'Wybierz dzień w kalendarzu'}
                </strong>
              </div>
              {removeCode && (
                <div className={styles.confirmRemove}>
                  <p>
                    {isEnglish
                      ? `Care will be removed from ${removedDays} days. Type the code to confirm:`
                      : `Opieka zostanie usunięta z ${removedDays} dni. Wpisz kod, aby potwierdzić:`}
                  </p>
                  <code>{removeCode}</code>
                  <input
                    value={removeInput}
                    maxLength={6}
                    autoComplete='off'
                    spellCheck={false}
                    placeholder={isEnglish ? 'Code' : 'Kod'}
                    onChange={(event) => setRemoveInput(event.target.value)}
                  />
                  <button
                    type='button'
                    className={styles.danger}
                    onClick={() => void removeCare()}
                    disabled={isSaving || !isRemoveConfirmed}
                  >
                    <Trash2 size={15} />
                    {isSaving
                      ? isEnglish
                        ? 'Removing…'
                        : 'Usuwanie…'
                      : isEnglish
                        ? 'Remove scheduled care'
                        : 'Usuń zaplanowaną opiekę'}
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'manual' && (
            <div className={styles.stepBody}>
              <p className={styles.hint}>
                {isEnglish
                  ? 'Pick a caregiver, then click days in the calendar.'
                  : 'Wybierz opiekuna i klikaj dni w kalendarzu.'}
              </p>
              {[
                {
                  title: isEnglish ? 'Parents' : 'Rodzice',
                  items: caregivers.filter((caregiver) =>
                    isParentSubject(caregiver.subjectId)
                  ),
                },
                {
                  title: isEnglish ? 'Other caregivers' : 'Pozostali opiekunowie',
                  items: caregivers.filter(
                    (caregiver) => !isParentSubject(caregiver.subjectId)
                  ),
                },
              ]
                .filter((group) => group.items.length > 0)
                .map((group) => (
                  <div className={styles.caregiverGroup} key={group.title}>
                    <span className={styles.caregiverGroupTitle}>{group.title}</span>
                    <div className={styles.caregiverList}>
                      {group.items.map((caregiver) => (
                        <div className={styles.caregiverItem} key={caregiver.subjectId}>
                          <label
                            className={styles.visibilityToggle}
                            title={isEnglish ? 'Show in calendar' : 'Pokazuj w kalendarzu'}
                          >
                            <input
                              type='checkbox'
                              aria-label={
                                isEnglish
                                  ? `Show ${caregiver.name} in calendar`
                                  : `Pokazuj ${caregiver.name} w kalendarzu`
                              }
                              checked={!hiddenSubjects.has(caregiver.subjectId)}
                              onChange={() => toggleSubjectVisibility(caregiver.subjectId)}
                            />
                          </label>
                          <button
                            type='button'
                            data-active={manualCaregiver === caregiver.subjectId}
                            data-hidden={hiddenSubjects.has(caregiver.subjectId)}
                            onClick={() => setManualCaregiver(caregiver.subjectId)}
                          >
                            <span
                              className={styles.swatch}
                              style={{ background: caregiverSwatch(caregiver.subjectId) }}
                            />
                            <strong>{caregiver.name}</strong>
                            <small>{caregiver.role}</small>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {tab === 'cycles' && (
            <>
              <ol className={styles.stepper}>
                {steps.map((item) => (
                  <li
                    key={item.id}
                    data-state={
                      item.id === step ? 'active' : item.id < step ? 'done' : 'todo'
                    }
                  >
                    <button
                      type='button'
                      disabled={item.id > step}
                      onClick={() => setStep(item.id)}
                    >
                      <span>{item.id}</span>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ol>

              {step === 1 && (
                <div className={styles.stepBody}>
                  <p className={styles.hint}>
                    {isEnglish
                      ? 'Click the day in the calendar when the cycle starts.'
                      : 'Wybierz datę startu – kliknij dzień w kalendarzu.'}
                  </p>
                  <div className={styles.startDate} data-empty={!startDate}>
                    <small>{isEnglish ? 'Cycle start' : 'Początek cyklu'}</small>
                    <strong>
                      {startDate
                        ? formatDate(startDate)
                        : isEnglish
                          ? 'Not selected'
                          : 'Nie wybrano'}
                    </strong>
                  </div>
                  <div className={styles.stepActions}>
                    <button
                      type='button'
                      className={styles.primary}
                      disabled={!startDate}
                      onClick={() => setStep(2)}
                    >
                      {isEnglish ? 'Next' : 'Dalej'}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className={styles.stepBody}>
                  <div className={styles.sectionHeading}>
                    <h3>
                      {isEnglish ? 'Who cares after whom?' : 'Kto po kim sprawuje opiekę?'}
                    </h3>
                    <button
                      type='button'
                      onClick={() =>
                        setPhases((current) => [
                          ...current,
                          { caregiverId: caregivers[0]?.subjectId ?? '', days: 7 },
                        ])
                      }
                    >
                      <Plus size={16} /> {isEnglish ? 'Add stage' : 'Dodaj etap'}
                    </button>
                  </div>
                  <div className={styles.phaseList}>
                    {phases.map((phase, index) => (
                      <div className={styles.phase} key={`${index}-${phase.caregiverId}`}>
                        <GripVertical size={18} className={styles.dragHandle} />
                        <label className={styles.phaseCaregiver}>
                          <span>{isEnglish ? 'Caregiver' : 'Opiekun'}</span>
                          <select
                            value={phase.caregiverId}
                            onChange={(e) =>
                              setPhases((current) =>
                                current.map((item, i) =>
                                  i === index ? { ...item, caregiverId: e.target.value } : item
                                )
                              )
                            }
                          >
                            {caregivers.map((caregiver) => (
                              <option key={caregiver.subjectId} value={caregiver.subjectId}>
                                {caregiver.name} · {caregiver.role}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className={styles.phaseDays}>
                          <span>{isEnglish ? 'Days' : 'Dni'}</span>
                          <input
                            type='number'
                            min={1}
                            max={31}
                            value={phase.days}
                            onChange={(e) =>
                              setPhases((current) =>
                                current.map((item, i) =>
                                  i === index
                                    ? { ...item, days: Math.max(1, Number(e.target.value) || 1) }
                                    : item
                                )
                              )
                            }
                          />
                        </label>
                        <div className={styles.phaseMove}>
                          <button
                            type='button'
                            disabled={index === 0}
                            onClick={() => movePhase(index, -1)}
                            aria-label={isEnglish ? 'Move stage earlier' : 'Przesuń etap wcześniej'}
                          >
                            <ArrowLeft size={15} />
                          </button>
                          <button
                            type='button'
                            disabled={index === phases.length - 1}
                            onClick={() => movePhase(index, 1)}
                            aria-label={isEnglish ? 'Move stage later' : 'Przesuń etap później'}
                          >
                            <ArrowRight size={15} />
                          </button>
                        </div>
                        <button
                          type='button'
                          className={styles.removePhase}
                          disabled={phases.length === 1}
                          onClick={() =>
                            setPhases((current) => current.filter((_, i) => i !== index))
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className={styles.stepActions}>
                    <button type='button' onClick={() => setStep(1)}>
                      <ArrowLeft size={15} />
                      {isEnglish ? 'Back' : 'Wstecz'}
                    </button>
                    <button
                      type='button'
                      className={styles.primary}
                      disabled={!phases.length || cycleDays <= 0}
                      onClick={() => setStep(3)}
                    >
                      {isEnglish ? 'Next' : 'Dalej'}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className={styles.stepBody}>
                  <p className={styles.hint}>
                    {isEnglish
                      ? 'How many times should the cycle repeat?'
                      : 'Ile razy powtórzyć cykl?'}
                  </p>
                  <div className={styles.repeatPicker}>
                    <button
                      type='button'
                      onClick={() => setRepeatCount(Math.max(1, effectiveRepeats - 1))}
                      disabled={effectiveRepeats <= 1}
                      aria-label={isEnglish ? 'Fewer cycles' : 'Mniej cykli'}
                    >
                      −
                    </button>
                    <input
                      type='number'
                      min={1}
                      max={maxRepeats}
                      value={effectiveRepeats}
                      onChange={(e) =>
                        setRepeatCount(Math.max(1, Number(e.target.value) || 1))
                      }
                    />
                    <button
                      type='button'
                      onClick={() => setRepeatCount(Math.min(maxRepeats, effectiveRepeats + 1))}
                      disabled={effectiveRepeats >= maxRepeats}
                      aria-label={isEnglish ? 'More cycles' : 'Więcej cykli'}
                    >
                      +
                    </button>
                  </div>
                  {startDate && endDate && (
                    <p className={styles.hint}>
                      {effectiveRepeats} × {cycleDays}{' '}
                      {isEnglish ? 'days' : 'dni'} ={' '}
                      <strong>
                        {effectiveRepeats * cycleDays} {isEnglish ? 'days' : 'dni'}
                      </strong>
                      <br />
                      {formatDate(startDate)} – {formatDate(endDate)}
                    </p>
                  )}
                  <div className={styles.stepActions}>
                    <button type='button' onClick={() => setStep(2)}>
                      <ArrowLeft size={15} />
                      {isEnglish ? 'Back' : 'Wstecz'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}
          </>}
        </aside>

        <main className={styles.previewPanel} onScroll={clearDayDetails}>
          <div className={styles.calendarHeader}>
            <div>
              <span>
                {isEnglish ? 'Preview on your calendar' : 'Podgląd na Twoim kalendarzu'}
                {eventsQuery.isFetching && ` · ${isEnglish ? 'loading…' : 'ładowanie…'}`}
              </span>
              <h4>
                {viewStart.locale(locale).format('MMMM YYYY')}
                {' – '}
                {viewEnd.subtract(1, 'month').locale(locale).format('MMMM YYYY')}
              </h4>
            </div>
            <div className={styles.rangeNav}>
              {tab === 'cycles' && startDate && (
                <button
                  type='button'
                  onClick={() =>
                    setViewStart(dayjs(startDate).subtract(1, 'month').startOf('month'))
                  }
                >
                  {isEnglish ? 'Go to cycle start' : 'Do początku cyklu'}
                </button>
              )}
              <button
                type='button'
                className={styles.iconButton}
                onClick={() => setViewStart((month) => month.subtract(1, 'year'))}
                aria-label={isEnglish ? 'Previous year' : 'Poprzedni rok'}
              >
                <ChevronsLeft size={17} />
              </button>
              <button
                type='button'
                className={styles.iconButton}
                onClick={() => setViewStart((month) => month.subtract(1, 'month'))}
                aria-label={isEnglish ? 'Previous month' : 'Poprzedni miesiąc'}
              >
                <ChevronLeft size={17} />
              </button>
              <DateRangePicker
                aria-label={isEnglish ? 'Preview range' : 'Zakres podglądu'}
                variant='bordered'
                size='sm'
                className={styles.rangePicker}
                value={{
                  start: parseDate(viewStart.format(dateFormat)),
                  end: parseDate(viewEnd.subtract(1, 'day').format(dateFormat)),
                }}
                onChange={(value) => {
                  if (!value) return;
                  const start = dayjs(value.start.toString()).startOf('month');
                  const end = dayjs(value.end.toString()).startOf('month');
                  setViewStart(start);
                  setPreviewMinMonths(Math.max(1, end.diff(start, 'month') + 1));
                }}
                onKeyDown={(event) => event.preventDefault()}
              />
              <button
                type='button'
                className={styles.iconButton}
                onClick={() => setViewStart((month) => month.add(1, 'month'))}
                aria-label={isEnglish ? 'Next month' : 'Następny miesiąc'}
              >
                <ChevronRight size={17} />
              </button>
              <button
                type='button'
                className={styles.iconButton}
                onClick={() => setViewStart((month) => month.add(1, 'year'))}
                aria-label={isEnglish ? 'Next year' : 'Następny rok'}
              >
                <ChevronsRight size={17} />
              </button>
              <button
                type='button'
                onClick={() => {
                  setViewStart(dayjs().startOf('year'));
                  setPreviewMinMonths(PREVIEW_MONTHS);
                }}
              >
                {dayjs().year()}
              </button>
              <button
                type='button'
                onClick={() => {
                  setViewStart(dayjs().subtract(1, 'month').startOf('month'));
                  setPreviewMinMonths(PREVIEW_MONTHS);
                }}
              >
                Reset
              </button>
            </div>
          </div>
          <div
            className={styles.previewGrid}
            ref={setPreviewGrid}
            onMouseOver={handlePreviewHover}
            onMouseLeave={clearDayDetails}
            style={
              tab === 'manual'
                ? ({
                    '--calendar-dimmed-opacity': 0.7,
                    '--calendar-dimmed-saturation': 0.85,
                  } as CSSProperties)
                : undefined
            }
          >
            {previewMonths.map((month) => (
              <div className={styles.previewMonth} key={month}>
                <Calendar
                  startDate={month}
                  endDate={dayjs(month).endOf('month').add(1, 'day').format(dateFormat)}
                  rowSize={7}
                  isTodayVisible
                  isWeekendsVisible
                  isPlanVisible={false}
                  isAlternatingVisible
                  isOtherCareVisible
                  isEventsVisible
                  displayStrategy='separateMonths'
                  events={previewEvents}
                  isDayDimmed={isDayDimmed}
                  isDayMarked={isDayMarked}
                  onDayClick={handleDayClick}
                />
              </div>
            ))}
          </div>
          {dayDetails && (
            <div
              className={styles.dayDetails}
              style={{ top: dayDetails.top, left: dayDetails.left }}
              role='tooltip'
            >
              <strong>{formatDate(dayDetails.date)}</strong>
              <span className={styles.dayDetailsLabel}>
                {isEnglish ? 'Care' : 'Opieka'}
              </span>
              {dayDetails.careSubjects.length > 0 ? (
                dayDetails.careSubjects.map((subjectId, index) => (
                  <span className={styles.dayDetailsCare} key={subjectId}>
                    <span
                      className={styles.swatch}
                      style={{ background: caregiverSwatch(subjectId) }}
                    />
                    {caregiverName(subjectId)}
                    {index > 0 && (
                      <small>{isEnglish ? '(hidden)' : '(pod spodem)'}</small>
                    )}
                  </span>
                ))
              ) : (
                <span className={styles.dayDetailsCare}>
                  {isEnglish ? 'No care assigned' : 'Bez przypisanej opieki'}
                </span>
              )}
              {dayDetails.events.length > 0 && (
                <>
                  <span className={styles.dayDetailsLabel}>
                    {isEnglish ? 'Events' : 'Wydarzenia'}
                  </span>
                  <ul>
                    {dayDetails.events.map((event) => (
                      <li key={`${event.id}-${event.date}`}>
                        <span
                          className={styles.swatch}
                          style={{ background: event.style?.background ?? '#9aa5ab' }}
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
              {isDayMarked(dayDetails.date) && (
                <em>{isEnglish ? 'Will be removed' : 'Zostanie usunięte'}</em>
              )}
            </div>
          )}
        </main>
      </div>

      {view !== 'upcoming' && <footer className={styles.footer}>
        <span>
          {tab === 'manual'
            ? isEnglish
              ? `Changed days: ${manualCount}`
              : `Zmienione dni: ${manualCount}`
            : tab === 'remove'
              ? isEnglish
                ? 'Only care after today can be removed.'
                : 'Usuwana jest tylko opieka po dzisiejszym dniu.'
              : isEnglish
                ? 'The plan is applied only to the selected date range.'
                : 'Plan zostanie zastosowany tylko w wybranym zakresie dat.'}
        </span>
        <div>
          <Link href={CARE_HOME} className={styles.cancel} aria-disabled={isSaving}>
            {isEnglish ? 'Cancel' : 'Anuluj'}
          </Link>
          {tab === 'manual' && (
            <>
              <button
                type='button'
                className={styles.cancel}
                onClick={() => setManualAssignments({})}
                disabled={isSaving || manualCount === 0}
              >
                {isEnglish ? 'Clear' : 'Wyczyść'}
              </button>
              <button
                type='button'
                className={styles.save}
                onClick={() => void saveManual()}
                disabled={isSaving || manualCount === 0}
              >
                {isSaving
                  ? isEnglish
                    ? 'Saving…'
                    : 'Zapisywanie…'
                  : isEnglish
                    ? 'Save changes'
                    : 'Zapisz zmiany'}
              </button>
            </>
          )}
          {tab === 'cycles' && step === 3 && (
            <button
              type='button'
              className={styles.save}
              onClick={() => void saveCycles()}
              disabled={isSaving || !phases.length || !isRangeValid}
            >
              {isSaving
                ? isEnglish
                  ? 'Saving…'
                  : 'Zapisywanie…'
                : isEnglish
                  ? 'Save and apply plan'
                  : 'Zapisz i zastosuj plan'}
            </button>
          )}
        </div>
      </footer>}
    </section>
  );
}
