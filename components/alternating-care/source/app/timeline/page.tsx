'use client';

import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { listCareEvents } from '@api/db/events/careEventsApi';
import { useAppContext } from '@app/AppContext';
import PageContainer from '@components/PageContainer/PageContainer';
import { getEventTypeColor } from '@modules/DashboardPage/components/DashboardEventForm/eventTypeColors';
import { useQuery } from '@tanstack/react-query';
import { caregiverBackground } from '@utils/caregiverColors';
import { colorBlueGreen700, getTextColor } from '@utils/color';
import { getEventTypeIcon } from '@utils/eventTypeIcons';
import { useCaregiverColors, useCaregivers } from '@utils/useCaregiverColors';
import { useOtherParent } from '@utils/useOtherParent';
import dayjs from 'dayjs';
import { History } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import styles from './timeline.module.scss';

const MONTHS_PER_PAGE = 12;
const DATE_FORMAT = 'YYYY-MM-DD';
const HIDDEN_TYPES = [
  CalendarEventType.Alternating,
  CalendarEventType.Offset,
  CalendarEventType.Todo,
];

type TimelineBlock = {
  key: string;
  start: string;
  end: string;
  label: string;
  color: string;
  event?: CalendarEvent;
};

// Merges dates into runs of consecutive days.
const toRuns = (dates: string[]) => {
  const runs: { start: string; end: string }[] = [];
  [...new Set(dates)].sort().forEach((date) => {
    const last = runs.at(-1);
    if (last && dayjs(last.end).add(1, 'day').format(DATE_FORMAT) === date) {
      last.end = date;
    } else {
      runs.push({ start: date, end: date });
    }
  });
  return runs;
};

export default function TimelinePage() {
  const { language, user } = useAppContext();
  const isEnglish = language === 'en';
  const { profile: otherParent } = useOtherParent();
  const savedCaregivers = useCaregivers();
  const caregiverColors = useCaregiverColors();
  const [monthsBack, setMonthsBack] = useState(MONTHS_PER_PAGE);
  const today = dayjs().format(DATE_FORMAT);
  const rangeStart = dayjs()
    .subtract(monthsBack, 'month')
    .startOf('month')
    .format(DATE_FORMAT);

  const eventsQuery = useQuery({
    queryKey: ['careTimeline', rangeStart, today],
    queryFn: () =>
      listCareEvents({ start: rangeStart, end: today }) as Promise<
        CalendarEvent[]
      >,
    placeholderData: (previous) => previous,
  });

  const blocks = useMemo(() => {
    const events = (eventsQuery.data ?? []).filter(
      (event) => event.date >= rangeStart && event.date <= today,
    );
    const selfSubject = `self:${user.id}`;
    const subjectOf = (event: CalendarEvent) =>
      event.groupId === CalendarEventType.Alternating ||
      event.groupId.startsWith('CARE:self:')
        ? selfSubject
        : event.groupId.replace(/^CARE:/, '');
    const nameOf = (subjectId: string) =>
      subjectId === selfSubject
        ? user.name || (isEnglish ? 'Me' : 'Ja')
        : savedCaregivers.find((item) => item.subjectId === subjectId)?.name ||
          (subjectId.startsWith('other:') && otherParent.name) ||
          (isEnglish ? 'Caregiver' : 'Opiekun');
    const colorOf = (subjectId: string) =>
      subjectId === selfSubject
        ? caregiverColors[selfSubject] ?? colorBlueGreen700
        : caregiverBackground(subjectId, caregiverColors);

    // The first care entry of a day decides who has the care (as in the calendar).
    const ownerByDate = new Map<string, string>();
    [...events]
      .filter((event) => event.type === CalendarEventType.Alternating)
      .sort((left, right) => left.creationTime - right.creationTime)
      .forEach((event) => {
        if (!ownerByDate.has(event.date)) {
          ownerByDate.set(event.date, subjectOf(event));
        }
      });
    const careBlocks: TimelineBlock[] = [];
    [...ownerByDate.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([date, subjectId]) => {
        const last = careBlocks.at(-1);
        if (
          last &&
          last.key.startsWith(`${subjectId}|`) &&
          dayjs(last.end).add(1, 'day').format(DATE_FORMAT) === date
        ) {
          last.end = date;
          return;
        }
        careBlocks.push({
          key: `${subjectId}|${date}`,
          start: date,
          end: date,
          label: nameOf(subjectId),
          color: colorOf(subjectId),
        });
      });

    const eventsByGroup = new Map<string, CalendarEvent[]>();
    events
      .filter((event) => !HIDDEN_TYPES.includes(event.type))
      .forEach((event) => {
        const group = eventsByGroup.get(event.groupId) ?? [];
        group.push(event);
        eventsByGroup.set(event.groupId, group);
      });
    const eventBlocks: TimelineBlock[] = [];
    eventsByGroup.forEach((groupEvents, groupId) => {
      toRuns(groupEvents.map((event) => event.date)).forEach((run) => {
        const event =
          groupEvents.find((item) => item.date === run.start) ?? groupEvents[0];
        eventBlocks.push({
          key: `${groupId}|${run.start}`,
          start: run.start,
          end: run.end,
          label: event.name || event.type,
          color: event.style?.background ?? getEventTypeColor(event.type),
          event,
        });
      });
    });
    // Newest first, all blocks in one stream.
    return [...careBlocks, ...eventBlocks].sort(
      (left, right) =>
        right.end.localeCompare(left.end) ||
        right.start.localeCompare(left.start) ||
        Number(Boolean(left.event)) - Number(Boolean(right.event)),
    );
  }, [
    caregiverColors,
    eventsQuery.data,
    isEnglish,
    otherParent.name,
    rangeStart,
    savedCaregivers,
    today,
    user.id,
    user.name,
  ]);

  const blockStyle = (block: TimelineBlock) =>
    ({
      '--block-color': block.color,
      '--block-text': getTextColor(block.color),
    }) as CSSProperties;
  const daysOf = (block: TimelineBlock) =>
    dayjs(block.end).diff(dayjs(block.start), 'day') + 1;

  const renderDays = (block: TimelineBlock) => {
    const days = daysOf(block);
    return (
      <span className={styles.blockDays}>
        <strong>{days}</strong>
        <small>
          {isEnglish ? (days === 1 ? 'day' : 'days') : days === 1 ? 'dzień' : 'dni'}
        </small>
      </span>
    );
  };
  const formatDates = (block: TimelineBlock) => {
    const start = dayjs(block.start).locale(language).format('D MMM YYYY');
    const end = dayjs(block.end).locale(language).format('D MMM YYYY');
    return block.start === block.end ? start : `${start} – ${end}`;
  };
  const formatRange = (block: TimelineBlock) => {
    const days = dayjs(block.end).diff(dayjs(block.start), 'day') + 1;
    const start = dayjs(block.start).locale(language).format('D MMM YYYY');
    const end = dayjs(block.end).locale(language).format('D MMM YYYY');
    const daysLabel = isEnglish
      ? `${days} ${days === 1 ? 'day' : 'days'}`
      : `${days} ${days === 1 ? 'dzień' : 'dni'}`;
    return days === 1 ? start : `${start} – ${end} · ${daysLabel}`;
  };

  return (
    <PageContainer scrollable isFullWidth>
      <main className={styles.page}>
        <header className={styles.header}>
          <span className={styles.headerIcon}>
            <History size={22} aria-hidden />
          </span>
          <div>
            <h1>{isEnglish ? 'Timeline' : 'Oś czasu'}</h1>
            <p>
              {isEnglish
                ? 'Care and events from today back in time.'
                : 'Opieka i wydarzenia od dziś wstecz.'}
            </p>
          </div>
        </header>

        <div className={styles.legend} aria-hidden>
          <span>{isEnglish ? 'Care' : 'Opieka'}</span>
          <span>{isEnglish ? 'Events' : 'Wydarzenia'}</span>
        </div>

        <ol className={styles.axis} aria-busy={eventsQuery.isFetching}>
          <li className={styles.todayRow}>
            <span className={styles.todayMarker}>
              {isEnglish ? 'Today' : 'Dziś'}
            </span>
          </li>
          {blocks.map((block, index) => {
            const month = block.end.slice(0, 7);
            const isNewMonth = blocks[index - 1]?.end.slice(0, 7) !== month;
            const previousYear = blocks[index - 1]?.end.slice(0, 4);
            const isNewYear =
              previousYear !== undefined && previousYear !== block.end.slice(0, 4);
            const Icon = getEventTypeIcon(block.event?.type);
            return (
              <Fragment key={block.key}>
                {isNewYear && (
                  <li className={styles.yearRow}>
                    <span>{block.end.slice(0, 4)}</span>
                  </li>
                )}
                {isNewMonth && (
                  <li className={styles.monthRow}>
                    <span>
                      {dayjs(block.end).locale(language).format('MMMM YYYY')}
                    </span>
                  </li>
                )}
                <li
                  className={block.event ? styles.eventRow : styles.careRow}
                  style={blockStyle(block)}
                >
                  {block.event ? (
                    <div
                      className={styles.eventBlock}
                      title={`${block.label} · ${formatRange(block)}`}
                    >
                      <span className={styles.eventIcon} aria-hidden>
                        <Icon size={14} />
                      </span>
                      <span className={styles.blockText}>
                        <strong>{block.label}</strong>
                        <small>{formatDates(block)}</small>
                      </span>
                      {daysOf(block) > 1 && renderDays(block)}
                    </div>
                  ) : (
                    <div
                      className={styles.careBlock}
                      title={`${block.label} · ${formatRange(block)}`}
                    >
                      <span className={styles.blockText}>
                        <strong>{block.label}</strong>
                        <small>{formatDates(block)}</small>
                      </span>
                      {renderDays(block)}
                    </div>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
        <button
          type='button'
          className={styles.loadMore}
          onClick={() => setMonthsBack((value) => value + MONTHS_PER_PAGE)}
          disabled={eventsQuery.isFetching}
        >
          {eventsQuery.isFetching
            ? isEnglish
              ? 'Loading…'
              : 'Ładowanie…'
            : isEnglish
              ? 'Show the previous 12 months'
              : 'Pokaż wcześniejsze 12 miesięcy'}
        </button>
      </main>
    </PageContainer>
  );
}
