'use client';

import { listCareEvents } from '@api/db/events/careEventsApi';
import { CalendarEventType } from '@api/db/types';
import { useAppContext } from '@app/AppContext';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useCareHandoffMode } from '@utils/useCareHandoffMode';
import { useCareAvatars } from '@utils/useCareAvatars';
import { otherParentSubjectId, useOtherParent } from '@utils/useOtherParent';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import styles from './CareSummary.module.scss';

const DEFAULT_WINDOW_DAYS = 120;
const POLISH_MONTHS_GENITIVE = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
] as const;

const formatPolishDate = (date: dayjs.Dayjs, withYear = true) =>
  `${date.format('DD')} ${POLISH_MONTHS_GENITIVE[date.month()]}${
    withYear ? ` ${date.format('YYYY')}` : ''
  }`;

interface CareSummaryProps {
  windowDays?: number;
  upcomingCount?: number | 'all';
  endDate?: string;
  action?: ReactNode;
}

export const CareSummary = ({
  windowDays = DEFAULT_WINDOW_DAYS,
  upcomingCount = 4,
  endDate,
  action,
}: CareSummaryProps) => {
  const { user, language } = useAppContext();
  const isEnglish = language === 'en';
  const firstName = user.name.trim().split(/\s+/)[0];
  const today = dayjs().format(dateFormat);
  const { mode } = useCareHandoffMode();
  const { profile: otherParent } = useOtherParent();
  const { avatars, getAvatar } = useCareAvatars(otherParent.userId);
  const [caregiversBySubject, setCaregiversBySubject] = useState<
    Record<string, { name: string; role: string }>
  >(
    {}
  );
  useEffect(() => {
    void fetch('/api/alternating-care/caregivers', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Nie udało się pobrać ról opiekunów.');
        return (await response.json()) as {
          caregivers?: Array<{
            subjectId: string;
            name: string;
            role: string;
          }>;
        };
      })
      .then((data) =>
        setCaregiversBySubject(
          Object.fromEntries(
            (data.caregivers ?? []).map((item) => [
              item.subjectId,
              { name: item.name, role: item.role },
            ])
          )
        )
      )
      .catch((error) => console.error('Could not load caregiver roles.', error));
  }, []);
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
    const ownSubject = `self:${user.id}`;
    const otherSubject = otherParentSubjectId(otherParent);
    const subjectsByDate = new Map(
      query.data
        .filter((event) => event.type === CalendarEventType.Alternating)
        .map((event) => [
          event.date,
          event.groupId.startsWith('CARE:')
            ? event.groupId.slice(5)
            : ownSubject,
        ])
    );
    if (subjectsByDate.size === 0) return null;
    const subjectAt = (date: dayjs.Dayjs) =>
      subjectsByDate.get(date.format(dateFormat)) ?? otherSubject;
    const currentSubject = subjectAt(dayjs(today));
    const isMine = currentSubject === ownSubject;
    const hasSameState = (offset: number) =>
      subjectAt(dayjs(today).add(offset, 'day')) === currentSubject;

    let back = 0;
    while (back < windowDays && hasSameState(-(back + 1))) back += 1;

    let forward = 1;
    while (forward <= futureWindowDays && hasSameState(forward)) forward += 1;

    const ranges = [];
    let cursor = 0;
    let rangeSubject = currentSubject;
    while (cursor <= futureWindowDays && ranges.length < upcomingLimit) {
      const from = dayjs(today).add(cursor, 'day');
      let length = 1;
      while (
        cursor + length <= futureWindowDays &&
        subjectAt(from.add(length, 'day')) === rangeSubject
      ) {
        length += 1;
      }
      ranges.push({
        isMine: rangeSubject === ownSubject,
        subjectId: rangeSubject,
        from,
        to: from.add(length - 1, 'day'),
        openEnded: cursor + length > futureWindowDays,
      });
      cursor += length;
      rangeSubject = subjectAt(dayjs(today).add(cursor, 'day'));
    }

    return {
      isMine,
      currentSubject,
      startDate: dayjs(today).subtract(back, 'day'),
      startOpen: back >= windowDays,
      currentTo: dayjs(today).add(forward - 1, 'day'),
      progress: (back + 1) / (back + forward),
      ranges,
      nextStart: dayjs(today).add(forward, 'day'),
    };
  }, [
    futureWindowDays,
    otherParent.userId,
    otherParent.subjectId,
    query.data,
    today,
    upcomingLimit,
    user.id,
    windowDays,
  ]);

  if (query.isLoading) {
    return (
      <section className={styles.card}>
        {isEnglish ? 'Loading…' : 'Ładowanie…'}
      </section>
    );
  }

  if (!summary) {
    return (
      <section className={`${styles.card} ${styles.emptyCare}`}>
        <div>
          <span className={styles.label}>
            {isEnglish ? 'Care plan' : 'Plan opieki'}
          </span>
          <strong>
            {isEnglish
              ? 'No care is scheduled yet'
              : 'Brak zaplanowanej opieki'}
          </strong>
          <p>
            {isEnglish
              ? 'Set a recurring plan or correct individual calendar days.'
              : 'Ustal plan cykliczny albo popraw pojedyncze dni kalendarza.'}
          </p>
        </div>
        {action}
      </section>
    );
  }

  const mineLabel = firstName
    ? `${firstName} · ${isEnglish ? 'Me' : 'Ja'}`
    : isEnglish
      ? 'You'
      : 'Ja';
  const holder =
    caregiversBySubject[summary.currentSubject]?.name ||
    (summary.isMine
      ? mineLabel
      : otherParent.name || (isEnglish ? 'Other parent' : 'Drugi rodzic'));
  const currentRole =
    caregiversBySubject[summary.currentSubject]?.role ||
    (isEnglish ? 'Parent' : 'Rodzic');
  const currentAvatar = summary.isMine
    ? avatars.mine
    : getAvatar('other', summary.currentSubject.split(':').slice(1).join(':'));

  const rangeLabel = (subjectId: string, isMine: boolean) =>
    caregiversBySubject[subjectId]?.name ||
    (isMine
      ? mineLabel
      : otherParent.name || (isEnglish ? 'Other parent' : 'Drugi rodzic'));
  const nextRange = summary.ranges[1];
  const nextAvatar = nextRange
    ? nextRange.isMine
      ? avatars.mine
      : getAvatar('other', nextRange.subjectId.split(':').slice(1).join(':'))
    : undefined;
  const daysUntilHandoff = summary.currentTo.diff(dayjs(today), 'day');
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
  const formatDateRange = (
    from: dayjs.Dayjs,
    to: dayjs.Dayjs,
    openEnded: boolean
  ) => {
    const locale = isEnglish ? 'en' : 'pl';
    const localizedFrom = from.locale(locale);
    const localizedTo = to.locale(locale);

    if (openEnded) {
      return isEnglish
        ? `${localizedFrom.format('DD MMMM YYYY')}–…`
        : `${formatPolishDate(from)}–…`;
    }
    if (from.isSame(to, 'month')) {
      return isEnglish
        ? `${localizedFrom.format('DD')}-${localizedTo.format('DD MMMM YYYY')}`
        : `${localizedFrom.format('DD')}-${formatPolishDate(to)}`;
    }
    if (from.isSame(to, 'year')) {
      return isEnglish
        ? `${localizedFrom.format('DD MMMM')}-${localizedTo.format('DD MMMM YYYY')}`
        : `${formatPolishDate(from, false)}-${formatPolishDate(to)}`;
    }
    return isEnglish
      ? `${localizedFrom.format('DD MMMM YYYY')}-${localizedTo.format('DD MMMM YYYY')}`
      : `${formatPolishDate(from)}-${formatPolishDate(to)}`;
  };

  return (
    <section className={styles.card}>
      {action && <div className={styles.cardActions}>{action}</div>}
      <div className={styles.currentCare}>
        <span className={styles.label}>
          {isEnglish ? 'Care provided by' : 'Opiekę sprawuje teraz'}
          {currentRole && ` - ${currentRole}`}
        </span>
        <div className={styles.currentCarePerson}>
          <span className={styles.currentCareAvatar} aria-hidden>
            {currentAvatar ? (
              <img src={currentAvatar} alt='' />
            ) : (
              holder.charAt(0).toUpperCase()
            )}
          </span>
          <div className={styles.currentCareCopy}>
            <strong className={styles.holder}>
              {holder.replace(/ · .+$/, '')}
            </strong>
          </div>
        </div>
        <div className={styles.range}>
          <span>
            {isEnglish ? 'From ' : 'Od '}
            {isEnglish
              ? summary.startDate.locale('en').format('MMM D, YYYY')
              : formatPolishDate(summary.startDate)}
          </span>
          <span>
            {isEnglish ? 'to ' : 'do '}
            {isEnglish
              ? summary.currentTo.locale('en').format('MMM D, YYYY')
              : formatPolishDate(summary.currentTo)}
          </span>
        </div>
      </div>

      <div className={styles.todayPanel}>
        <div className={styles.todayRow}>
          <div className={styles.todayCopy}>
            <span className={styles.todayLabel}>
              {isEnglish ? 'Today is' : 'Dzisiaj jest'}
            </span>
            <div className={styles.todayDate}>
              <strong>{dayjs(today).format('D')}</strong>
              <span>
                {isEnglish
                  ? dayjs(today).locale('en').format('MMMM YYYY')
                  : `${POLISH_MONTHS_GENITIVE[dayjs(today).month()]} ${dayjs(today).format('YYYY')}`}
              </span>
            </div>
          </div>
          <span className={styles.todayDivider} aria-hidden />
          <span className={styles.todayCounter}>
            <strong>
              {currentDay}/{totalDays}
            </strong>
            <small>{isEnglish ? 'care days' : 'dni opieki'}</small>
          </span>
        </div>
        <div
          className={styles.exchangeProgress}
          role='progressbar'
          aria-label={isEnglish ? 'Current care progress' : 'Postęp bieżącej opieki'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className={styles.exchangeSection}>
        <div className={styles.exchange}>
          <span className={styles.upcomingTitle}>
            {isEnglish ? 'Next handoff' : 'Wymiana'} {handoffCountdown}
          </span>
          <div className={styles.exchangeDateRow}>
            <div className={styles.exchangeDate}>
              <strong>{summary.currentTo.format('D')}</strong>
              <span>
                {isEnglish
                  ? summary.currentTo.locale('en').format('MMMM, YYYY')
                  : `${POLISH_MONTHS_GENITIVE[summary.currentTo.month()]} ${summary.currentTo.format('YYYY')}`}
              </span>
            </div>
            <div className={styles.exchangeParties} aria-hidden>
              <span className={styles.exchangeAvatar}>
                {currentAvatar ? (
                  <img src={currentAvatar} alt='' />
                ) : (
                  holder.charAt(0).toUpperCase()
                )}
              </span>
              <span className={styles.exchangeIcon}>
                <ArrowLeftRight size={19} />
              </span>
              {nextRange && (
                <span className={styles.exchangeAvatar}>
                  {nextAvatar ? (
                    <img src={nextAvatar} alt='' />
                  ) : (
                    rangeLabel(nextRange.subjectId, nextRange.isMine)
                      .charAt(0)
                      .toUpperCase()
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.upcoming}>
        <span className={styles.upcomingTitle}>
          {isEnglish
            ? 'Planned care handoffs'
            : 'Zaplanowane wymiany opieki'}
        </span>
        {summary.ranges.slice(1, upcomingLimit).map((range) => {
          const duration = range.to.diff(range.from, 'day') + 1;
          const rangeAvatar = range.isMine
            ? avatars.mine
            : getAvatar('other', range.subjectId.split(':').slice(1).join(':'));

          return (
            <div
              className={`${styles.upcomingRange} ${range.isMine ? styles.upcomingMine : ''}`}
              key={`${range.from.format(dateFormat)}-${range.isMine}`}
            >
              <span className={`${styles.upcomingAvatar} ${range.isMine ? styles.upcomingAvatarMine : ''}`} aria-hidden>
                {rangeAvatar ? (
                  <img src={rangeAvatar} alt='' />
                ) : range.isMine ? (
                  (firstName.charAt(0) || 'J').toUpperCase()
                ) : (
                  (otherParent.name.charAt(0) || 'D').toUpperCase()
                )}
              </span>
              <div className={styles.upcomingRangeText}>
                <div>
                  <strong>
                    {rangeLabel(range.subjectId, range.isMine).replace(
                      / · .+$/,
                      ''
                    )}
                    <small className={styles.upcomingCaregiverRole}>
                      {' '}·{' '}
                      {caregiversBySubject[range.subjectId]?.role ||
                        (range.isMine
                          ? (isEnglish ? 'Parent' : 'Rodzic')
                          : (isEnglish ? 'Parent' : 'Rodzic'))}
                    </small>
                  </strong>
                </div>
                <span className={styles.upcomingRangeMeta}>
                  <span>
                    {formatDateRange(range.from, range.to, range.openEnded)}
                  </span>
                </span>
              </div>
              <span className={styles.upcomingRangeDays}>
                {range.openEnded ? '≥' : ''}
                {duration}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};
