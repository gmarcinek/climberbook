'use client';

import { listCareEvents } from '@api/db/events/careEventsApi';
import { CalendarEventType } from '@api/db/types';
import { useAppContext } from '@app/AppContext';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useCareHandoffMode } from '@utils/useCareHandoffMode';
import { useOtherParent } from '@utils/useOtherParent';
import { useMemo } from 'react';
import styles from './CareSummary.module.scss';

const DEFAULT_WINDOW_DAYS = 120;

interface CareSummaryProps {
  windowDays?: number;
  upcomingCount?: number | 'all';
  endDate?: string;
}

export const CareSummary = ({
  windowDays = DEFAULT_WINDOW_DAYS,
  upcomingCount = 4,
  endDate,
}: CareSummaryProps) => {
  const { user, language } = useAppContext();
  const isEnglish = language === 'en';
  const firstName = user.name.trim().split(/\s+/)[0];
  const today = dayjs().format(dateFormat);
  const { mode } = useCareHandoffMode();
  const { profile: otherParent } = useOtherParent();
  const requestedEndDate = endDate ? dayjs(endDate) : dayjs(today).add(windowDays, 'day');
  const futureWindowDays = Math.max(
    windowDays,
    requestedEndDate.diff(dayjs(today), 'day')
  );
  const upcomingLimit =
    upcomingCount === 'all' ? Number.POSITIVE_INFINITY : upcomingCount;

  const query = useQuery({
    queryKey: ['careSummary', today, windowDays, requestedEndDate.format(dateFormat)],
    queryFn: () =>
      listCareEvents({
        type: CalendarEventType.Alternating,
        start: dayjs(today).subtract(windowDays, 'day').format(dateFormat),
        end: dayjs(today).add(futureWindowDays, 'day').format(dateFormat),
      }),
  });

  const summary = useMemo(() => {
    if (!query.data) return null;
    const careDays = new Set(
      query.data
        .filter((event) => event.type === CalendarEventType.Alternating)
        .map((event) => event.date)
    );
    const isMine = careDays.has(today);
    const hasSameState = (offset: number) =>
      careDays.has(dayjs(today).add(offset, 'day').format(dateFormat)) ===
      isMine;

    let back = 0;
    while (back < windowDays && hasSameState(-(back + 1))) back += 1;

    let forward = 1;
    while (forward <= futureWindowDays && hasSameState(forward)) forward += 1;

    const ranges = [];
    let cursor = 0;
    let rangeIsMine = isMine;
    while (cursor <= futureWindowDays && ranges.length < upcomingLimit) {
      const from = dayjs(today).add(cursor, 'day');
      let length = 1;
      while (
        cursor + length <= futureWindowDays &&
        careDays.has(from.add(length, 'day').format(dateFormat)) === rangeIsMine
      ) {
        length += 1;
      }
      ranges.push({
        isMine: rangeIsMine,
        from,
        to: from.add(length - 1, 'day'),
        openEnded: cursor + length > futureWindowDays,
      });
      cursor += length;
      rangeIsMine = !rangeIsMine;
    }

    return {
      isMine,
      startDate: dayjs(today).subtract(back, 'day'),
      startOpen: back >= windowDays,
      currentTo: dayjs(today).add(forward - 1, 'day'),
      progress: (back + 1) / (back + forward),
      ranges,
      nextStart: dayjs(today).add(forward, 'day'),
    };
  }, [futureWindowDays, query.data, today, upcomingLimit, windowDays]);

  if (query.isLoading) {
    return (
      <section className={styles.card}>
        {isEnglish ? 'Loading…' : 'Ładowanie…'}
      </section>
    );
  }

  if (!summary) {
    return (
      <section className={styles.card}>
        {isEnglish
          ? 'Could not load care data.'
          : 'Nie udało się wczytać opieki.'}
      </section>
    );
  }

  const mineLabel = firstName
    ? `${firstName} · ${isEnglish ? 'Me' : 'Ja'}`
    : isEnglish
      ? 'You'
      : 'Ja';
  const holder = summary.isMine
    ? mineLabel
    : otherParent.name || (isEnglish ? 'Other parent' : 'Drugi rodzic');

  const rangeLabel = (isMine: boolean) =>
    isMine
      ? mineLabel
      : otherParent.name || (isEnglish ? 'Other parent' : 'Drugi rodzic');
  const daysUntilHandoff = summary.nextStart.diff(dayjs(today), 'day');
  const elapsedDays = dayjs(today).diff(summary.startDate, 'day');
  const currentDay =
    mode === 'hourly' ? elapsedDays + 1 : Math.max(1, elapsedDays + 1);
  const totalDays = summary.nextStart.diff(summary.startDate, 'day');
  const progress =
    mode === 'half-day'
      ? (elapsedDays + 0.5) / totalDays
      : (elapsedDays + 1) / totalDays;
  const handoffCountdown = isEnglish
    ? `in ${daysUntilHandoff} ${daysUntilHandoff === 1 ? 'day' : 'days'}`
    : `za ${daysUntilHandoff} ${daysUntilHandoff === 1 ? 'dzień' : 'dni'}`;
  const rangeDurationLabel = (days: number) =>
    isEnglish
      ? `${days} ${days === 1 ? 'day' : 'days'}`
      : `${days} ${days === 1 ? 'dzień' : 'dni'}`;
  const formatDateRange = (
    from: dayjs.Dayjs,
    to: dayjs.Dayjs,
    openEnded: boolean
  ) => {
    const locale = isEnglish ? 'en' : 'pl';
    const localizedFrom = from.locale(locale);
    const localizedTo = to.locale(locale);

    if (openEnded) return `${localizedFrom.format('DD MMMM YYYY')}–…`;
    if (from.isSame(to, 'month')) {
      return `${localizedFrom.format('DD')}-${localizedTo.format(
        'DD MMMM YYYY'
      )}`;
    }
    if (from.isSame(to, 'year')) {
      return `${localizedFrom.format('DD MMMM')}-${localizedTo.format(
        'DD MMMM YYYY'
      )}`;
    }
    return `${localizedFrom.format('DD MMMM YYYY')}-${localizedTo.format(
      'DD MMMM YYYY'
    )}`;
  };

  return (
    <section className={styles.card}>
      <span className={styles.dayBadge}>
        {currentDay}/{totalDays}
      </span>
      <span className={styles.label}>
        {isEnglish ? 'Care now' : 'Opiekę ma teraz'}
      </span>
      <strong className={styles.holder}>{holder}</strong>

      <div className={styles.range}>
        <span>{isEnglish ? 'From' : 'Od'} {summary.startDate.format(dateFormat)}</span>
        <span>{isEnglish ? 'to' : 'do'} {summary.currentTo.format(dateFormat)}</span>
      </div>
      <div
        className={styles.progressTrack}
        role='progressbar'
        aria-label={isEnglish ? 'Current care progress' : 'Postęp bieżącej opieki'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <span
          className={styles.progressValue}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className={styles.exchangeSection}>
        <div className={styles.exchange}>
          <span className={styles.upcomingTitle}>
            {isEnglish ? 'Next handoff' : 'Wymiana'}
          </span>
          <strong>
            {summary.nextStart.format(dateFormat)}
            {' '}· {handoffCountdown}
          </strong>
        </div>
      </div>

      <div className={styles.upcoming}>
        <span className={styles.upcomingTitle}>
          {isEnglish ? 'Next handoffs' : 'Kolejne wymiany'}
        </span>
        {summary.ranges.slice(1, upcomingLimit).map((range) => {
          const duration = range.to.diff(range.from, 'day') + 1;

          return (
            <div
              className={`${styles.upcomingRange} ${range.isMine ? styles.upcomingMine : ''}`}
              key={`${range.from.format(dateFormat)}-${range.isMine}`}
            >
              <span className={`${styles.upcomingAvatar} ${range.isMine ? styles.upcomingAvatarMine : ''}`} aria-hidden>
                {range.isMine ? (firstName.charAt(0) || 'J').toUpperCase() : 'D'}
              </span>
              <div className={styles.upcomingRangeText}>
                <strong>{rangeLabel(range.isMine)}</strong>
                <span className={styles.upcomingRangeMeta}>
                  <span>
                    {range.openEnded ? '≥ ' : ''}
                    {rangeDurationLabel(duration)}{' '}
                    {formatDateRange(range.from, range.to, range.openEnded)}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
