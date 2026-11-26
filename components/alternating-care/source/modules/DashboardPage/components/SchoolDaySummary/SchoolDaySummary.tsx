'use client';

import { useAppContext } from '@app/AppContext';
import { useCareAvatars } from '@utils/useCareAvatars';
import {
  CareWard,
  Lesson,
  lessonColor,
  wardAvatarSubject,
} from '@utils/careWards';
import classNames from 'classnames';
import dayjs from 'dayjs';
import { BookOpen, Clock3, GraduationCap, MapPin } from 'lucide-react';
import Link from 'next/link';
import { CSSProperties, useEffect, useMemo, useState } from 'react';
import styles from './SchoolDaySummary.module.scss';

interface SchoolDaySummaryProps {
  wards: CareWard[];
  micro?: boolean;
  onExpand?: () => void;
}

const isoWeekday = (date: dayjs.Dayjs) => ((date.day() + 6) % 7) + 1;
const toTime = (minutes: number) =>
  `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60)
    .toString()
    .padStart(2, '0')}`;

const lessonWord = (count: number, isEnglish: boolean) => {
  if (isEnglish) return count === 1 ? 'lesson' : 'lessons';
  if (count === 1) return 'lekcja';
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)
    ? 'lekcje'
    : 'lekcji';
};

function lessonStyle(lesson?: Lesson) {
  return lesson
    ? ({ '--lesson-color': lessonColor(lesson) } as CSSProperties)
    : undefined;
}

export function SchoolDaySummary({
  wards,
  micro = false,
  onExpand,
}: SchoolDaySummaryProps) {
  const { language } = useAppContext();
  const isEnglish = language === 'en';
  const { getAvatar } = useCareAvatars();
  const [now, setNow] = useState(() => dayjs());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(dayjs()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const children = useMemo(
    () =>
      wards.filter(
        (ward) =>
          ward.kind === 'child' &&
          ward.id &&
          (ward.lessonPlan?.lessons.length ?? 0) > 0,
      ),
    [wards],
  );

  if (children.length === 0) return null;

  const today = now.format('YYYY-MM-DD');
  const nowMinute = now.hour() * 60 + now.minute();

  const cards = children.map((child) => {
    const plan = child.lessonPlan!;
    const isActive =
      (!plan.validFrom || today >= plan.validFrom) &&
      (!plan.validTo || today <= plan.validTo);
    const lessons = isActive
      ? [...plan.lessons]
          .filter((lesson) => lesson.weekday === isoWeekday(now))
          .sort((left, right) => left.start - right.start)
      : [];
    const current = lessons.find(
      (lesson) => lesson.start <= nowMinute && lesson.end > nowMinute,
    );
    const next = lessons.find((lesson) => lesson.start > nowMinute);
    const remaining = lessons.filter((lesson) => lesson.end > nowMinute).length;
    const spotlight = current ?? next;
    const lessonPosition = spotlight
      ? lessons.findIndex((lesson) => lesson.id === spotlight.id) + 1
      : lessons.length > 0
        ? lessons.length
        : 0;
    const isFinished = lessons.length > 0 && remaining === 0;
    const avatar = child.id
      ? getAvatar('other', wardAvatarSubject(child.id))
      : undefined;
    const href = `/alternating-care/day-plan?tab=lessons&ward=${encodeURIComponent(
      child.id!,
    )}`;

    if (micro) {
      return (
        <button
          type="button"
          className={styles.microCard}
          style={lessonStyle(spotlight)}
          onClick={onExpand}
          key={child.id}
          title={`${child.name}: ${lessons.length} ${lessonWord(
            lessons.length,
            isEnglish,
          )}`}
          aria-label={`${isEnglish ? 'Expand school summary' : 'Rozwiń podsumowanie szkoły'}: ${
            child.name
          }`}
        >
          <span className={styles.microAvatar} aria-hidden>
            {avatar ? (
              <img src={avatar} alt="" />
            ) : (
              child.name.trim().charAt(0).toUpperCase()
            )}
          </span>
          <strong>{lessonPosition}/{lessons.length}</strong>
          <small>{isEnglish ? 'lesson' : 'lekcja'}</small>
        </button>
      );
    }

    let status = isEnglish ? 'No lessons today' : 'Dziś bez lekcji';
    if (current) status = current.subject;
    else if (next) status = next.subject;
    else if (isFinished)
      status = isEnglish ? 'School day finished' : 'Dzień w szkole zakończony';
    else if (!isActive)
      status = isEnglish ? 'Lesson plan inactive' : 'Plan lekcji nieaktywny';

    return (
      <Link
        href={href}
        aria-label={
          isEnglish
            ? `Open ${child.name}'s lesson plan`
            : `Otwórz plan lekcji: ${child.name}`
        }
        title={
          isEnglish
            ? `Open ${child.name}'s lesson plan`
            : `Otwórz plan lekcji: ${child.name}`
        }
        className={classNames(styles.card, {
          [styles.finished]: isFinished,
        })}
        style={lessonStyle(spotlight)}
        key={child.id}
      >
        <header>
          <span className={styles.avatar} aria-hidden>
            {avatar ? (
              <img src={avatar} alt="" />
            ) : (
              child.name.trim().charAt(0).toUpperCase()
            )}
          </span>
          <div>
            <strong>{child.name}</strong>
            <span>
              <GraduationCap size={13} aria-hidden />
              {isEnglish ? 'School today' : 'Dzisiaj w szkole'}
            </span>
          </div>
          <BookOpen size={18} aria-hidden />
        </header>

        <div className={styles.counts}>
          <span>
            <strong>{lessons.length}</strong>
            <small>{lessonWord(lessons.length, isEnglish)}</small>
          </span>
          <span>
            <strong>{remaining}</strong>
            <small>{isEnglish ? 'remaining' : 'pozostało'}</small>
          </span>
        </div>

        <div className={styles.current}>
          <small>
            {current
              ? isEnglish
                ? 'Lesson now'
                : 'Teraz lekcja'
              : next
                ? isEnglish
                  ? 'Next lesson'
                  : 'Następna lekcja'
                : isEnglish
                  ? 'Status'
                  : 'Stan'}
          </small>
          <strong>{status}</strong>
          {spotlight && (
            <span className={styles.meta}>
              <Clock3 size={13} aria-hidden />
              {toTime(spotlight.start)}–{toTime(spotlight.end)}
              {spotlight.room && (
                <>
                  <MapPin size={13} aria-hidden />
                  {spotlight.room}
                </>
              )}
            </span>
          )}
        </div>
      </Link>
    );
  });

  return micro ? (
    <>{cards}</>
  ) : (
    <section className={styles.widgets} aria-label={isEnglish ? 'School day' : 'Dzień w szkole'}>
      <span className={styles.sectionTitle}>
        <GraduationCap size={17} aria-hidden />
        {isEnglish ? 'School day' : 'Dzień w szkole'}
      </span>
      {cards}
    </section>
  );
}
