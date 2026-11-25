import dayjs from 'dayjs';
import styles from './CareDate.module.scss';

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

interface CareDateProps {
  date: dayjs.Dayjs;
  isEnglish?: boolean;
  /** Optional time shown next to the weekday, e.g. "14:30". */
  time?: string;
}

// Big day number with month/year and weekday; switches to DD.MM.YYYY in narrow containers.
export const CareDate = ({ date, isEnglish = false, time }: CareDateProps) => {
  const weekdayName = new Intl.DateTimeFormat(isEnglish ? 'en' : 'pl', {
    weekday: 'long',
  }).format(date.toDate());
  const weekday = (
    <small>
      {weekdayName}
      {time && <span className={styles.time}> · {time}</span>}
    </small>
  );
  const monthYear = isEnglish
    ? date.locale('en').format('MMMM YYYY')
    : `${POLISH_MONTHS_GENITIVE[date.month()]} ${date.format('YYYY')}`;

  return (
    <div className={styles.date}>
      <div className={styles.full}>
        <strong className={styles.day}>{date.format('D')}</strong>
        <span className={styles.meta}>
          <span>{monthYear}</span>
          {weekday}
        </span>
      </div>
      <div className={styles.short}>
        <span className={styles.numeric}>
          <strong>{date.format('DD')}</strong>
          {date.format('.MM.')}
          <strong>{date.format('YYYY')}</strong>
        </span>
        {weekday}
      </div>
    </div>
  );
};
