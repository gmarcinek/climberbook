'use client';

import {
  CareWard,
  EMPTY_LESSON_PLAN,
  LESSON_COLORS,
  Lesson,
  LessonPlan,
  formatAge,
  lessonColor,
  SCHOOL_SUBJECT_NAMES,
  schoolSubjectColor,
  wardAge,
} from '@utils/careWards';
import { cssZoom } from '@utils/cssZoom';
import classNames from 'classnames';
import dayjs from 'dayjs';
import {
  Baby,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Download,
  GraduationCap,
  Lock,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import styles from './LessonPlans.module.scss';

interface LessonPlansProps {
  wards: CareWard[];
  isLoading: boolean;
  loadError: string | null;
  isEnglish: boolean;
  selectedWardId?: string;
  selectedWardAvatar?: string | null;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onSave: (ward: CareWard) => Promise<unknown>;
}

type Mode = 'preview' | 'edit';
type LessonDraft = {
  id: string;
  weekday: number;
  start: string;
  end: string;
  subject: string;
  room: string;
  color?: string;
};

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const DEFAULT_LESSON_START = 8 * 60;
const DEFAULT_LESSON_LENGTH = 45;
const DEFAULT_BREAK = 10;
const GRID_START = 8 * 60;
const GRID_MIN_END = 15 * 60;
const PX_PER_MINUTE = 2;
const COMPACT_CARD_HEIGHT = 80;

// Places overlapping lessons side by side.
function layoutLessons(lessons: Lesson[]) {
  const layouts = new Map<string, { lane: number; columns: number }>();
  let group: Array<{ lesson: Lesson; lane: number }> = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;
  const flush = () => {
    group.forEach(({ lesson, lane }) =>
      layouts.set(lesson.id, { lane, columns: laneEnds.length }),
    );
    group = [];
    laneEnds = [];
    groupEnd = -1;
  };
  for (const lesson of [...lessons].sort((a, b) => a.start - b.start)) {
    if (group.length && lesson.start >= groupEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= lesson.start);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = lesson.end;
    group.push({ lesson, lane });
    groupEnd = Math.max(groupEnd, lesson.end);
  }
  flush();
  return layouts;
}

const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
    minutes % 60,
  ).padStart(2, '0')}`;

const fromTime = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes)
    ? hours * 60 + minutes
    : null;
};

// 2024-01-01 was a Monday, so the ISO weekday maps directly to the day of month.
const weekdayName = (
  weekday: number,
  isEnglish: boolean,
  format: 'long' | 'short' = 'long',
) =>
  new Intl.DateTimeFormat(isEnglish ? 'en-GB' : 'pl-PL', {
    weekday: format,
  }).format(new Date(2024, 0, weekday));

const isoWeekday = (date: dayjs.Dayjs) => ((date.day() + 6) % 7) + 1;

const lessonsLabel = (count: number, isEnglish: boolean) => {
  if (isEnglish) return count === 1 ? 'lesson' : 'lessons';
  if (count === 1) return 'lekcja';
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)
    ? 'lekcje'
    : 'lekcji';
};

const sameSubject = (left: string, right: string) =>
  left.trim().toLocaleLowerCase('pl') === right.trim().toLocaleLowerCase('pl');

const sortLessons = (lessons: Lesson[]) =>
  [...lessons].sort(
    (left, right) => left.weekday - right.weekday || left.start - right.start,
  );

const isPlanActive = (plan: LessonPlan, date: string) =>
  (!plan.validFrom || date >= plan.validFrom) &&
  (!plan.validTo || date <= plan.validTo);

const colorStyle = (color: string) =>
  ({ '--lesson-color': color }) as CSSProperties;

const isLessonPlan = (value: unknown): value is LessonPlan => {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Record<string, unknown>;
  if (!Array.isArray(plan.lessons)) return false;
  const validOptionalDate = (date: unknown) =>
    date === undefined ||
    date === null ||
    (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date));
  if (!validOptionalDate(plan.validFrom) || !validOptionalDate(plan.validTo)) {
    return false;
  }
  return plan.lessons.every((value) => {
    if (!value || typeof value !== 'object') return false;
    const lesson = value as Record<string, unknown>;
    return (
      typeof lesson.id === 'string' &&
      Number.isInteger(lesson.weekday) &&
      Number(lesson.weekday) >= 1 &&
      Number(lesson.weekday) <= 7 &&
      Number.isInteger(lesson.start) &&
      Number.isInteger(lesson.end) &&
      Number(lesson.start) >= 0 &&
      Number(lesson.end) <= 1440 &&
      Number(lesson.start) < Number(lesson.end) &&
      typeof lesson.subject === 'string' &&
      lesson.subject.trim().length > 0 &&
      (lesson.room === undefined || typeof lesson.room === 'string') &&
      (lesson.color === undefined || typeof lesson.color === 'string')
    );
  });
};

export function LessonPlans({
  wards,
  isLoading,
  loadError,
  isEnglish,
  selectedWardId,
  selectedWardAvatar,
  mode,
  onModeChange,
  onSave,
}: LessonPlansProps) {
  const children = useMemo(
    () => wards.filter((ward) => ward.kind === 'child' && ward.id),
    [wards],
  );
  const selectedWard =
    children.find((ward) => ward.id === selectedWardId) ?? children[0];
  const plan = selectedWard?.lessonPlan ?? EMPTY_LESSON_PLAN;
  const [showWeekend, setShowWeekend] = useState(false);
  const [draft, setDraft] = useState<LessonDraft | null>(null);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [now, setNow] = useState(() => dayjs());
  const importInputRef = useRef<HTMLInputElement>(null);
  const [hoverBlock, setHoverBlock] = useState<{
    weekday: number;
    start: number;
  } | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(dayjs()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    onModeChange(plan.lessons.length ? 'preview' : 'edit');
    setShowWeekend(plan.lessons.some((lesson) => lesson.weekday > 5));
    setDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWard?.id]);

  useEffect(() => {
    if (!draft) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDraft(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [draft]);

  const today = now.format('YYYY-MM-DD');
  const todayWeekday = isoWeekday(now);
  const nowMinute = now.hour() * 60 + now.minute();
  const lessonsByDay = useMemo(() => {
    const map = new Map<number, Lesson[]>();
    for (const lesson of sortLessons(plan.lessons)) {
      map.set(lesson.weekday, [...(map.get(lesson.weekday) ?? []), lesson]);
    }
    return map;
  }, [plan.lessons]);
  const subjects = useMemo(
    () =>
      [
        ...new Set([
          ...plan.lessons.map((lesson) => lesson.subject),
          ...SCHOOL_SUBJECT_NAMES,
        ]),
      ].sort((a, b) => a.localeCompare(b, 'pl')),
    [plan.lessons],
  );
  const matchingSubjects = useMemo(() => {
    const query = draft?.subject.trim().toLocaleLowerCase('pl') ?? '';
    return subjects
      .filter(
        (subject) =>
          !query || subject.toLocaleLowerCase('pl').includes(query),
      )
      .slice(0, 10);
  }, [draft?.subject, subjects]);

  if (isLoading) {
    return (
      <p className={styles.message}>
        {isEnglish ? 'Loading…' : 'Wczytywanie…'}
      </p>
    );
  }
  if (loadError) {
    return (
      <p className={classNames(styles.message, styles.error)} role="alert">
        {loadError}
      </p>
    );
  }
  if (!selectedWard) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>
          <Baby size={30} aria-hidden />
        </span>
        <p>
          {isEnglish
            ? 'Lesson plans are available for wards of type “child”.'
            : 'Plany lekcji można dodać podopiecznym typu „dziecko”.'}
        </p>
        <Link href="/alternating-care/people">
          {isEnglish ? 'Add a child' : 'Dodaj dziecko'}
        </Link>
      </div>
    );
  }

  const isEditing = mode === 'edit';
  const isActiveToday = isPlanActive(plan, today);
  const todayLessons = isActiveToday
    ? (lessonsByDay.get(todayWeekday) ?? [])
    : [];
  const dayStart = todayLessons[0]?.start;
  const dayEnd = todayLessons.at(-1)?.end;
  const dayProgress =
    dayStart !== undefined && dayEnd !== undefined && dayEnd > dayStart
      ? Math.max(0, Math.min(1, (nowMinute - dayStart) / (dayEnd - dayStart)))
      : 0;
  const currentLesson = todayLessons.find(
    (lesson) => lesson.start <= nowMinute && lesson.end > nowMinute,
  );
  const nextLesson = (() => {
    const laterToday = todayLessons.find((lesson) => lesson.start > nowMinute);
    if (laterToday) return { lesson: laterToday, date: now };
    for (let offset = 1; offset <= 14; offset += 1) {
      const date = now.add(offset, 'day');
      if (!isPlanActive(plan, date.format('YYYY-MM-DD'))) continue;
      const lesson = lessonsByDay.get(isoWeekday(date))?.[0];
      if (lesson) return { lesson, date };
    }
    return null;
  })();
  const spotlight = currentLesson
    ? { lesson: currentLesson, date: now, isNow: true }
    : nextLesson
      ? { ...nextLesson, isNow: false }
      : null;
  const visibleWeekdays = WEEKDAYS.filter(
    (day) =>
      day <= 5 || showWeekend || (lessonsByDay.get(day)?.length ?? 0) > 0,
  );
  // The grid starts at 08:00 unless an earlier lesson needs more room.
  const earliestStart = Math.min(
    GRID_START,
    ...plan.lessons.map((lesson) => lesson.start),
  );
  const latestEnd = Math.max(
    GRID_MIN_END,
    ...plan.lessons.map((lesson) => lesson.end),
  );
  const gridStart = Math.max(0, Math.floor(earliestStart / 60) * 60 - 10);
  const gridEnd = Math.min(1440, Math.ceil(latestEnd / 60) * 60);
  const gridHeight = (gridEnd - gridStart) * PX_PER_MINUTE;
  const firstGridHour = Math.ceil(gridStart / 60);
  const lastGridHour = Math.floor(gridEnd / 60);
  const gridHours = Array.from(
    { length: lastGridHour - firstGridHour + 1 },
    (_, index) => firstGridHour + index,
  );
  const age = wardAge(selectedWard.birthDate);
  const persist = async (nextPlan: LessonPlan, message?: string) => {
    setIsSaving(true);
    try {
      await onSave({
        ...selectedWard,
        lessonPlan: { ...nextPlan, lessons: sortLessons(nextPlan.lessons) },
      });
      if (message) toast.success(message, { autoClose: 2000 });
      return true;
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : isEnglish
            ? 'Could not save the lesson plan.'
            : 'Nie udało się zapisać planu lekcji.',
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const openNewLesson = (weekday: number, startAt?: number) => {
    const dayLessons = lessonsByDay.get(weekday) ?? [];
    const lastEnd = dayLessons.at(-1)?.end;
    const start = Math.min(
      startAt ??
        (lastEnd === undefined ? DEFAULT_LESSON_START : lastEnd + DEFAULT_BREAK),
      1440 - DEFAULT_LESSON_LENGTH,
    );
    setDraft({
      id: '',
      weekday,
      start: toTime(start),
      end: toTime(start + DEFAULT_LESSON_LENGTH),
      subject: '',
      room: '',
    });
    setIsSubjectOpen(false);
    setActiveSubjectIndex(0);
  };

  const openLesson = (lesson: Lesson) => {
    setDraft({
      id: lesson.id,
      weekday: lesson.weekday,
      start: toTime(lesson.start),
      end: toTime(lesson.end),
      subject: lesson.subject,
      room: lesson.room ?? '',
      color: lesson.color,
    });
    setIsSubjectOpen(false);
    setActiveSubjectIndex(0);
  };

  const updateDraftSubject = (subject: string) => {
    if (!draft) return;
    const existing = plan.lessons.find(
      (lesson) =>
        lesson.id !== draft.id && sameSubject(lesson.subject, subject),
    );
    setDraft({
      ...draft,
      subject,
      color: existing ? existing.color : draft.color,
    });
  };

  const draftStart = draft ? fromTime(draft.start) : null;
  const draftEnd = draft ? fromTime(draft.end) : null;
  const draftColor = draft
    ? lessonColor({ subject: draft.subject, color: draft.color })
    : undefined;
  const draftFixedColor = draft ? schoolSubjectColor(draft.subject) : null;
  const draftError = !draft
    ? null
    : !draft.subject.trim()
      ? isEnglish
        ? 'Enter the subject.'
        : 'Wpisz przedmiot.'
      : draftStart === null || draftEnd === null || draftStart >= draftEnd
        ? isEnglish
          ? 'The lesson must end after it starts.'
          : 'Lekcja musi kończyć się po rozpoczęciu.'
        : null;
  const overlapping =
    draft && draftStart !== null && draftEnd !== null
      ? plan.lessons.find(
          (lesson) =>
            lesson.id !== draft.id &&
            lesson.weekday === draft.weekday &&
            lesson.start < draftEnd &&
            lesson.end > draftStart,
        )
      : undefined;

  const saveDraft = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || draftError || draftStart === null || draftEnd === null) {
      return;
    }
    const subject = draft.subject.trim();
    // Core school subjects have a fixed colour, so no custom colour is stored.
    const color = schoolSubjectColor(subject) ? undefined : draft.color;
    const saved: Lesson = {
      id: draft.id || crypto.randomUUID().slice(0, 8),
      weekday: draft.weekday,
      start: draftStart,
      end: draftEnd,
      subject,
      ...(draft.room.trim() ? { room: draft.room.trim() } : {}),
      ...(color ? { color } : {}),
    };
    // A subject keeps one colour across the whole plan.
    const lessons = [
      ...plan.lessons
        .filter((lesson) => lesson.id !== saved.id)
        .map((lesson) => {
          if (!sameSubject(lesson.subject, subject)) return lesson;
          const rest: Lesson = { ...lesson };
          delete rest.color;
          return color ? { ...rest, color } : rest;
        }),
      saved,
    ];
    if (
      await persist(
        { ...plan, lessons },
        isEnglish ? 'Lesson saved.' : 'Lekcja zapisana.',
      )
    ) {
      setDraft(null);
    }
  };

  const deleteDraft = async () => {
    if (!draft?.id) return;
    if (
      await persist(
        {
          ...plan,
          lessons: plan.lessons.filter((lesson) => lesson.id !== draft.id),
        },
        isEnglish ? 'Lesson removed.' : 'Lekcja usunięta.',
      )
    ) {
      setDraft(null);
    }
  };

  const copyDay = (fromWeekday: number, toWeekday: number) => {
    const hasTarget = (lessonsByDay.get(toWeekday)?.length ?? 0) > 0;
    if (
      hasTarget &&
      !window.confirm(
        isEnglish
          ? 'Replace lessons on this day?'
          : 'Zastąpić lekcje w tym dniu?',
      )
    ) {
      return;
    }
    void persist(
      {
        ...plan,
        lessons: [
          ...plan.lessons.filter((lesson) => lesson.weekday !== toWeekday),
          ...plan.lessons
            .filter((lesson) => lesson.weekday === fromWeekday)
            .map((lesson) => ({
              ...lesson,
              id: crypto.randomUUID().slice(0, 8),
              weekday: toWeekday,
            })),
        ],
      },
      isEnglish ? 'Lessons copied.' : 'Lekcje skopiowane.',
    );
  };

  const exportPlan = () => {
    const fileName = `${selectedWard.name
      .trim()
      .toLocaleLowerCase('pl')
      .replace(/[^a-ząćęłńóśźż0-9]+/gi, '-')}-plan-lekcji.json`;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            format: 'climberbook-lesson-plan',
            version: 1,
            childName: selectedWard.name,
            plan,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importPlan = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const imported =
        parsed &&
        typeof parsed === 'object' &&
        'plan' in parsed &&
        (parsed as { plan: unknown }).plan
          ? (parsed as { plan: unknown }).plan
          : parsed;
      if (!isLessonPlan(imported)) {
        toast.error(
          isEnglish
            ? 'This file is not a valid lesson plan.'
            : 'Ten plik nie zawiera poprawnego planu lekcji.',
        );
        return;
      }
      if (
        !window.confirm(
          isEnglish
            ? 'Replace the current lesson plan with the imported one?'
            : 'Zastąpić obecny plan lekcji planem z pliku?',
        )
      ) {
        return;
      }
      await persist(
        imported,
        isEnglish ? 'Lesson plan imported.' : 'Plan lekcji zaimportowany.',
      );
    } catch {
      toast.error(
        isEnglish
          ? 'Could not read the lesson plan file.'
          : 'Nie udało się odczytać pliku planu lekcji.',
      );
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const renderLessonCard = (
    lesson: Lesson,
    index: number,
    weekday: number,
    height: number,
  ) => {
    const isNow =
      weekday === todayWeekday && isActiveToday && currentLesson?.id === lesson.id;
    const cardClass = classNames(styles.lessonCard, {
      [styles.editableCard]: isEditing,
      [styles.nowCard]: isNow,
      [styles.compactCard]: height < COMPACT_CARD_HEIGHT,
    });
    const content = (
      <>
        <span className={styles.lessonMeta}>
          <span>
            {index + 1}. {isEnglish ? 'lesson' : 'lekcja'}
          </span>
          <span className={styles.lessonMetaTime}>
            {isNow && (
              <span className={styles.nowBadge}>
                {isEnglish ? 'Now' : 'Teraz'}
              </span>
            )}
            {toTime(lesson.start)}–{toTime(lesson.end)}
          </span>
        </span>
        <strong className={styles.lessonSubject}>{lesson.subject}</strong>
        <span className={styles.lessonFooter}>
          {lesson.room && (
            <span className={styles.roomChip}>
              <MapPin size={12} aria-hidden />
              {lesson.room}
            </span>
          )}
          <span className={styles.lessonDuration}>
            {lesson.end - lesson.start} min
          </span>
        </span>
        {isEditing && (
          <span className={styles.editHint} aria-hidden>
            <Pencil size={14} />
          </span>
        )}
      </>
    );
    return isEditing ? (
      <button
        type="button"
        className={cardClass}
        style={colorStyle(lessonColor(lesson))}
        onClick={() => openLesson(lesson)}
        aria-label={`${isEnglish ? 'Edit' : 'Edytuj'}: ${lesson.subject}`}
      >
        {content}
      </button>
    ) : (
      <div className={cardClass} style={colorStyle(lessonColor(lesson))}>
        {content}
      </div>
    );
  };

  return (
    <div className={styles.lessonPlans}>
      <div className={styles.body}>
        <section className={styles.widget}>
          <div className={classNames(styles.summarySection, styles.childSummary)}>
            <span className={styles.summaryAvatar} aria-hidden>
              {selectedWardAvatar ? (
                <img src={selectedWardAvatar} alt="" />
              ) : (
                selectedWard.name.trim().charAt(0).toUpperCase()
              )}
            </span>
            <div>
              <strong>{selectedWard.name}</strong>
              {age !== null && (
                <span>{formatAge(age, isEnglish)}</span>
              )}
            </div>
          </div>
          <div className={styles.summarySection}>
            <span className={styles.widgetLabel}>
              {isEnglish ? 'Today' : 'Dzisiaj'} ·{' '}
              {weekdayName(todayWeekday, isEnglish)}
            </span>
            <div className={styles.widgetRow}>
              <div className={styles.widgetValue}>
                <strong>{todayLessons.length}</strong>
                <span>
                  {todayLessons.length
                    ? lessonsLabel(todayLessons.length, isEnglish)
                    : isEnglish
                      ? 'no lessons today'
                      : 'dziś bez lekcji'}
                </span>
              </div>
              {dayStart !== undefined && dayEnd !== undefined && (
                <>
                  <span className={styles.widgetDivider} aria-hidden />
                  <span className={styles.widgetCounter}>
                    <strong>
                      {toTime(dayStart)}–{toTime(dayEnd)}
                    </strong>
                    <small>{isEnglish ? 'at school' : 'w szkole'}</small>
                  </span>
                </>
              )}
            </div>
            {todayLessons.length > 0 && (
              <div
                className={styles.widgetProgress}
                role="progressbar"
                aria-label={
                  isEnglish ? 'School day progress' : 'Postęp dnia w szkole'
                }
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(dayProgress * 100)}
              >
                <span style={{ width: `${dayProgress * 100}%` }} />
              </div>
            )}
          </div>

          <div
            className={classNames(styles.summarySection, styles.nextWidget)}
            style={
              spotlight ? colorStyle(lessonColor(spotlight.lesson)) : undefined
            }
          >
            <span className={styles.widgetLabel}>
              {spotlight?.isNow
                ? isEnglish
                  ? 'Lesson now'
                  : 'Trwa lekcja'
                : isEnglish
                  ? 'Next lesson'
                  : 'Następna lekcja'}
            </span>
            {spotlight ? (
              <>
                <strong className={styles.nextSubject}>
                  {spotlight.lesson.subject}
                </strong>
                <span className={styles.nextMeta}>
                  <Clock3 size={14} aria-hidden />
                  {spotlight.date.isSame(now, 'day')
                    ? isEnglish
                      ? 'today'
                      : 'dziś'
                    : weekdayName(isoWeekday(spotlight.date), isEnglish)}{' '}
                  {toTime(spotlight.lesson.start)}–
                  {toTime(spotlight.lesson.end)}
                  {spotlight.lesson.room && (
                    <>
                      <MapPin size={14} aria-hidden />
                      {spotlight.lesson.room}
                    </>
                  )}
                </span>
              </>
            ) : (
              <strong className={styles.nextSubject}>
                {isEnglish ? 'No upcoming lessons' : 'Brak nadchodzących lekcji'}
              </strong>
            )}
          </div>
          <div className={styles.summarySettings}>
            <button
              type="button"
              aria-pressed={showWeekend}
              aria-label={isEnglish ? 'Show weekend' : 'Pokaż weekend'}
              title={isEnglish ? 'Show weekend' : 'Pokaż weekend'}
              onClick={() => setShowWeekend((current) => !current)}
            >
              <CalendarDays size={19} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={isEnglish ? 'Export plan' : 'Eksportuj plan'}
              title={isEnglish ? 'Export plan' : 'Eksportuj plan'}
              onClick={exportPlan}
            >
              <Download size={19} aria-hidden />
            </button>
            <button
              type="button"
              disabled={isSaving}
              aria-label={isEnglish ? 'Import plan' : 'Importuj plan'}
              title={isEnglish ? 'Import plan' : 'Importuj plan'}
              onClick={() => importInputRef.current?.click()}
            >
              <Upload size={19} aria-hidden />
            </button>
            <input
              ref={importInputRef}
              className={styles.planFileInput}
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importPlan(file);
              }}
            />
          </div>
        </section>

        {!isEditing && plan.lessons.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <GraduationCap size={30} aria-hidden />
            </span>
            <p>
              {isEnglish
                ? `${selectedWard.name} has no lessons yet.`
                : `${selectedWard.name} nie ma jeszcze lekcji.`}
            </p>
            <button type="button" onClick={() => onModeChange('edit')}>
              {isEnglish ? 'Create lesson plan' : 'Utwórz plan lekcji'}
            </button>
          </div>
        ) : (
          <div
            className={styles.timetable}
            style={
              {
                '--lesson-columns': visibleWeekdays
                  .map((weekday) =>
                    !isEditing && weekday === todayWeekday
                      ? 'minmax(180px, 1.5fr)'
                      : 'minmax(180px, 1fr)',
                  )
                  .join(' '),
                '--lesson-columns-compact': visibleWeekdays
                  .map((weekday) =>
                    !isEditing && weekday === todayWeekday
                      ? 'minmax(150px, 1.5fr)'
                      : 'minmax(150px, 1fr)',
                  )
                  .join(' '),
              } as CSSProperties
            }
          >
            <span className={styles.axisCorner} aria-hidden />
            {visibleWeekdays.map((weekday) => {
              const dayLessons = lessonsByDay.get(weekday) ?? [];
              const isToday = weekday === todayWeekday;
              const previousDay = weekday === 1 ? null : weekday - 1;
              return (
                <header
                  key={`header-${weekday}`}
                  className={classNames(styles.dayHeader, {
                    [styles.todayHeader]: isToday,
                    [styles.previewTodayHeader]: isToday && !isEditing,
                  })}
                >
                  <div>
                    <h3>{weekdayName(weekday, isEnglish)}</h3>
                    <small>
                      {dayLessons.length
                        ? `${dayLessons.length} ${lessonsLabel(
                            dayLessons.length,
                            isEnglish,
                          )} · ${toTime(dayLessons[0].start)}–${toTime(
                            dayLessons[dayLessons.length - 1].end,
                          )}`
                        : isEnglish
                          ? 'Free'
                          : 'Wolne'}
                    </small>
                  </div>
                  {isToday && (
                    <span className={styles.todayBadge}>
                      {isEnglish ? 'Today' : 'Dziś'}
                    </span>
                  )}
                  {isEditing &&
                    previousDay &&
                    (lessonsByDay.get(previousDay)?.length ?? 0) > 0 && (
                      <button
                        type="button"
                        className={styles.iconButton}
                        disabled={isSaving}
                        title={
                          isEnglish
                            ? 'Copy lessons from the previous day'
                            : 'Skopiuj lekcje z poprzedniego dnia'
                        }
                        aria-label={
                          isEnglish
                            ? 'Copy lessons from the previous day'
                            : 'Skopiuj lekcje z poprzedniego dnia'
                        }
                        onClick={() => copyDay(previousDay, weekday)}
                      >
                        <Copy size={14} aria-hidden />
                      </button>
                    )}
                </header>
              );
            })}

            <div
              className={styles.timeAxis}
              style={{ height: gridHeight }}
              aria-hidden
            >
              {gridHours.map((hour) => (
                <span
                  key={hour}
                  style={{ top: (hour * 60 - gridStart) * PX_PER_MINUTE }}
                >
                  {String(hour).padStart(2, '0')}:00
                </span>
              ))}
            </div>
            {visibleWeekdays.map((weekday) => {
              const dayLessons = lessonsByDay.get(weekday) ?? [];
              const lanes = layoutLessons(dayLessons);
              const isPaddedTrack =
                weekday === todayWeekday && !isEditing;
              return (
                <ol
                  key={`track-${weekday}`}
                  className={classNames(styles.dayTrack, {
                    [styles.editableTrack]: isEditing,
                    [styles.todayTrack]: weekday === todayWeekday,
                    [styles.previewTodayTrack]:
                      weekday === todayWeekday && !isEditing,
                  })}
                  style={
                    {
                      height: gridHeight,
                      '--hour-height': `${60 * PX_PER_MINUTE}px`,
                    } as CSSProperties
                  }
                  aria-label={weekdayName(weekday, isEnglish)}
                  onClick={
                    isEditing
                      ? (event) => {
                          if (event.target !== event.currentTarget) return;
                          const offset =
                            (event.clientY -
                              event.currentTarget.getBoundingClientRect().top) /
                            cssZoom(event.currentTarget);
                          const minute = Math.min(
                            gridEnd - DEFAULT_LESSON_LENGTH,
                            Math.max(
                              gridStart,
                              gridStart +
                                Math.floor(offset / PX_PER_MINUTE / 5) * 5,
                            ),
                          );
                          openNewLesson(weekday, minute);
                        }
                      : undefined
                  }
                  onMouseMove={
                    isEditing
                      ? (event) => {
                          if (event.target !== event.currentTarget) {
                            setHoverBlock(null);
                            return;
                          }
                          const offset =
                            (event.clientY -
                              event.currentTarget.getBoundingClientRect().top) /
                            cssZoom(event.currentTarget);
                          const start = Math.min(
                            gridEnd - DEFAULT_LESSON_LENGTH,
                            Math.max(
                              gridStart,
                              gridStart +
                                Math.floor(offset / PX_PER_MINUTE / 5) * 5,
                            ),
                          );
                          setHoverBlock((current) =>
                            current?.weekday === weekday &&
                            current.start === start
                              ? current
                              : { weekday, start },
                          );
                        }
                      : undefined
                  }
                  onMouseLeave={
                    isEditing ? () => setHoverBlock(null) : undefined
                  }
                >
                  {nowMinute >= gridStart && nowMinute <= gridEnd && (
                    <li
                      className={classNames(styles.currentTimeLine, {
                        [styles.todayTimeLine]: weekday === todayWeekday,
                      })}
                      style={{
                        top: (nowMinute - gridStart) * PX_PER_MINUTE,
                      }}
                      aria-hidden
                    />
                  )}
                  {hoverBlock?.weekday === weekday && (
                    <li
                      className={styles.hoverLessonBlock}
                      style={{
                        top: (hoverBlock.start - gridStart) * PX_PER_MINUTE,
                        height: DEFAULT_LESSON_LENGTH * PX_PER_MINUTE - 3,
                      }}
                      aria-hidden
                    >
                      <span>
                        {toTime(hoverBlock.start)}–
                        {toTime(hoverBlock.start + DEFAULT_LESSON_LENGTH)}
                      </span>
                    </li>
                  )}
                  {dayLessons.map((lesson, index) => {
                    const lane = lanes.get(lesson.id) ?? {
                      lane: 0,
                      columns: 1,
                    };
                    const height = Math.max(
                      28,
                      (lesson.end - lesson.start) * PX_PER_MINUTE - 3,
                    );
                    return (
                      <li
                        key={lesson.id}
                        className={styles.lessonSlot}
                        style={{
                          top: (lesson.start - gridStart) * PX_PER_MINUTE,
                          height,
                          left: `calc(${(lane.lane / lane.columns) * 100}% + ${
                            isPaddedTrack ? 16 : 2
                          }px)`,
                          width: `calc(${100 / lane.columns}% - ${
                            isPaddedTrack ? 32 : 4
                          }px)`,
                        }}
                      >
                        {renderLessonCard(lesson, index, weekday, height)}
                      </li>
                    );
                  })}
                </ol>
              );
            })}

            {isEditing && (
              <>
                <span aria-hidden />
                {visibleWeekdays.map((weekday) => (
                  <button
                    key={`add-${weekday}`}
                    type="button"
                    className={styles.addLesson}
                    onClick={() => openNewLesson(weekday)}
                  >
                    <Plus size={16} aria-hidden />
                    {isEnglish ? 'Add lesson' : 'Dodaj lekcję'}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {draft &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onMouseDown={() => setDraft(null)}
          >
            <form
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="lesson-modal-title"
              onMouseDown={(event) => event.stopPropagation()}
              onSubmit={(event) => void saveDraft(event)}
              style={colorStyle(draftColor!)}
            >
              <header className={styles.modalHero}>
                <div>
                  <span className={styles.widgetLabel} id="lesson-modal-title">
                    {draft.id
                      ? isEnglish
                        ? 'Edit lesson'
                        : 'Edycja lekcji'
                      : isEnglish
                        ? 'New lesson'
                        : 'Nowa lekcja'}{' '}
                    · {selectedWard.name}
                  </span>
                  <strong>
                    {draft.subject.trim() ||
                      (isEnglish ? 'Subject' : 'Przedmiot')}
                  </strong>
                  <span className={styles.nextMeta}>
                    <Clock3 size={14} aria-hidden />
                    {weekdayName(draft.weekday, isEnglish)} {draft.start}–
                    {draft.end}
                    {draft.room.trim() && (
                      <>
                        <MapPin size={14} aria-hidden />
                        {draft.room.trim()}
                      </>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={() => setDraft(null)}
                  aria-label={isEnglish ? 'Close' : 'Zamknij'}
                >
                  <X size={18} aria-hidden />
                </button>
              </header>

              <div className={styles.modalBody}>
                <div
                  className={styles.field}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setIsSubjectOpen(false);
                    }
                  }}
                >
                  <label htmlFor="lesson-subject">
                    {isEnglish ? 'Subject' : 'Przedmiot'}
                  </label>
                  <div className={styles.subjectCombobox}>
                    <Search size={18} aria-hidden />
                    <input
                      id="lesson-subject"
                      className={styles.subjectInput}
                      value={draft.subject}
                      maxLength={80}
                      autoFocus
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={isSubjectOpen}
                      aria-controls="lesson-subject-options"
                      aria-autocomplete="list"
                      aria-activedescendant={
                        isSubjectOpen && matchingSubjects[activeSubjectIndex]
                          ? `lesson-subject-option-${activeSubjectIndex}`
                          : undefined
                      }
                      placeholder={
                        isEnglish ? 'e.g. Mathematics' : 'np. Matematyka'
                      }
                      onFocus={() => {
                        setIsSubjectOpen(true);
                        setActiveSubjectIndex(0);
                      }}
                      onChange={(event) => {
                        updateDraftSubject(event.target.value);
                        setIsSubjectOpen(true);
                        setActiveSubjectIndex(0);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          setIsSubjectOpen(true);
                          setActiveSubjectIndex((current) =>
                            Math.min(
                              matchingSubjects.length - 1,
                              current + 1,
                            ),
                          );
                        } else if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          setActiveSubjectIndex((current) =>
                            Math.max(0, current - 1),
                          );
                        } else if (event.key === 'Enter' && isSubjectOpen) {
                          const selected = matchingSubjects[activeSubjectIndex];
                          if (selected) {
                            event.preventDefault();
                            updateDraftSubject(selected);
                            setIsSubjectOpen(false);
                          }
                        } else if (event.key === 'Escape' && isSubjectOpen) {
                          event.stopPropagation();
                          setIsSubjectOpen(false);
                        }
                      }}
                    />
                    {isSubjectOpen && (
                      <div
                        id="lesson-subject-options"
                        className={styles.subjectDropdown}
                        role="listbox"
                      >
                        {matchingSubjects.length ? (
                          matchingSubjects.map((subject, index) => (
                            <button
                              id={`lesson-subject-option-${index}`}
                              key={subject}
                              type="button"
                              role="option"
                              aria-selected={index === activeSubjectIndex}
                              onMouseDown={(event) => event.preventDefault()}
                              onMouseEnter={() => setActiveSubjectIndex(index)}
                              onClick={() => {
                                updateDraftSubject(subject);
                                setIsSubjectOpen(false);
                              }}
                            >
                              <span
                                className={styles.subjectDot}
                                style={colorStyle(lessonColor({ subject }))}
                              />
                              <span>{subject}</span>
                            </button>
                          ))
                        ) : (
                          <span className={styles.subjectEmpty}>
                            {isEnglish
                              ? 'No suggestions — use your own subject'
                              : 'Brak podpowiedzi — możesz wpisać własny przedmiot'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <fieldset className={styles.field}>
                  <legend>{isEnglish ? 'Day' : 'Dzień'}</legend>
                  <div className={styles.dayChips}>
                    {WEEKDAYS.map((weekday) => (
                      <button
                        key={weekday}
                        type="button"
                        aria-pressed={draft.weekday === weekday}
                        onClick={() => setDraft({ ...draft, weekday })}
                      >
                        {weekdayName(weekday, isEnglish, 'short')}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className={styles.fieldRow}>
                  <label className={styles.field}>
                    <span>{isEnglish ? 'Start' : 'Początek'}</span>
                    <input
                      type="time"
                      step={300}
                      value={draft.start}
                      onChange={(event) => {
                        const start = fromTime(event.target.value);
                        const previousStart = fromTime(draft.start);
                        const previousEnd = fromTime(draft.end);
                        // Keep the lesson length when moving its start.
                        const end =
                          start !== null &&
                          previousStart !== null &&
                          previousEnd !== null
                            ? Math.min(1439, start + previousEnd - previousStart)
                            : null;
                        setDraft({
                          ...draft,
                          start: event.target.value,
                          end: end !== null ? toTime(end) : draft.end,
                        });
                      }}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>{isEnglish ? 'End' : 'Koniec'}</span>
                    <input
                      type="time"
                      step={300}
                      value={draft.end}
                      onChange={(event) =>
                        setDraft({ ...draft, end: event.target.value })
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>{isEnglish ? 'Room' : 'Sala'}</span>
                    <input
                      value={draft.room}
                      maxLength={40}
                      placeholder={isEnglish ? 'optional' : 'opcjonalnie'}
                      onChange={(event) =>
                        setDraft({ ...draft, room: event.target.value })
                      }
                    />
                  </label>
                </div>

                <fieldset className={styles.field}>
                  <legend>
                    {isEnglish ? 'Colour' : 'Kolor'}
                    {draft.subject.trim() && !draftFixedColor && (
                      <small>
                        {isEnglish
                          ? ` — used for every “${draft.subject.trim()}” lesson`
                          : ` — dla wszystkich lekcji „${draft.subject.trim()}”`}
                      </small>
                    )}
                  </legend>
                  {draftFixedColor ? (
                    <div className={styles.fixedColor}>
                      <span
                        className={styles.swatch}
                        style={colorStyle(draftFixedColor)}
                        aria-hidden
                      >
                        <Lock size={14} />
                      </span>
                      {isEnglish
                        ? 'Fixed colour of this school subject.'
                        : 'Stały kolor tego przedmiotu szkolnego.'}
                    </div>
                  ) : (
                  <div className={styles.swatches}>
                    <button
                      type="button"
                      className={classNames(styles.swatch, styles.autoSwatch)}
                      aria-pressed={!draft.color}
                      title={
                        isEnglish ? 'Automatic by subject' : 'Automatyczny wg przedmiotu'
                      }
                      onClick={() => setDraft({ ...draft, color: undefined })}
                    >
                      A
                    </button>
                    {LESSON_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={styles.swatch}
                        style={colorStyle(color.value)}
                        aria-pressed={draft.color === color.value}
                        aria-label={isEnglish ? color.en : color.pl}
                        title={isEnglish ? color.en : color.pl}
                        onClick={() =>
                          setDraft({ ...draft, color: color.value })
                        }
                      >
                        {draft.color === color.value && (
                          <Check size={15} aria-hidden />
                        )}
                      </button>
                    ))}
                  </div>
                  )}
                </fieldset>

                {(draftError || overlapping) && (
                  <p
                    className={classNames(styles.hint, {
                      [styles.error]: Boolean(draftError),
                    })}
                    role={draftError ? 'alert' : undefined}
                  >
                    {draftError ??
                      (isEnglish
                        ? `Overlaps with ${overlapping!.subject} (${toTime(
                            overlapping!.start,
                          )}–${toTime(overlapping!.end)}).`
                        : `Nakłada się na: ${overlapping!.subject} (${toTime(
                            overlapping!.start,
                          )}–${toTime(overlapping!.end)}).`)}
                  </p>
                )}
              </div>

              <footer className={styles.modalFooter}>
                {draft.id && (
                  <button
                    type="button"
                    className={styles.dangerButton}
                    disabled={isSaving}
                    onClick={() => void deleteDraft()}
                  >
                    <Trash2 size={15} aria-hidden />
                    {isEnglish ? 'Delete' : 'Usuń'}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setDraft(null)}
                >
                  {isEnglish ? 'Cancel' : 'Anuluj'}
                </button>
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={Boolean(draftError) || isSaving}
                >
                  <Check size={15} aria-hidden />
                  {isSaving
                    ? isEnglish
                      ? 'Saving…'
                      : 'Zapisywanie…'
                    : isEnglish
                      ? 'Save lesson'
                      : 'Zapisz lekcję'}
                </button>
              </footer>
            </form>
          </div>,
          document.querySelector('.alternatingCareRoot') ?? document.body,
        )}
    </div>
  );
}
