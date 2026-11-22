import { splitEvenly } from '@utils/array';
import dayjs, { Dayjs } from 'dayjs';
import {
  CalendarDayType,
  CalendarMonthRawType,
  CalendarMonthType,
} from './Calendar.types';

type MonthsRaw = Record<string, CalendarMonthRawType>;

export const dateFormat = 'YYYY-MM-DD';

export const DESKTOP_CALENDAR_MIN_MONTHS = 12;
export const DESKTOP_CALENDAR_MAX_MONTHS = 15;

export const normalizeCalendarRange = (startDate?: string, endDate?: string) => {
  const start = dayjs(startDate ?? dayjs()).startOf('month');
  const requestedMonths = endDate
    ? dayjs(endDate).endOf('month').diff(start, 'month') + 1
    : DESKTOP_CALENDAR_MIN_MONTHS;
  const monthCount = Math.min(
    DESKTOP_CALENDAR_MAX_MONTHS,
    Math.max(DESKTOP_CALENDAR_MIN_MONTHS, requestedMonths)
  );

  return {
    monthCount,
    start: start.format(dateFormat),
    end: start
      .add(monthCount - 1, 'month')
      .endOf('month')
      .format(dateFormat),
  };
};

/**
 * Generuje tablicę dat pomiędzy dwoma podanymi datami, które są dostosowane do określonego interwału.
 * Daty są generowane od początku tygodnia przed datą początkową, do daty końcowej. Jeśli różnica dni
 * między datami nie jest podzielna przez `x`, ostatnie daty zostaną usunięte, aby zapewnić, że
 * wynikowa tablica zawiera daty, które są wielokrotnościami `x` dni.
 *
 * @param start - Data początkowa, która może być w formie łańcucha znaków (w formacie akceptowanym przez `dayjs`)
 *                lub obiektu `Dayjs`.
 * @param end - Data końcowa, która może być w formie łańcucha znaków (w formacie akceptowanym przez `dayjs`)
 *              lub obiektu `Dayjs`.
 * @param x - Liczba dni, która określa interwał między kolejnymi datami w wynikowej tablicy.
 *            Musi być liczbą całkowitą większą od zera.
 * @returns Tablica obiektów `Dayjs`, które są datami od `start` do `end`, z usuniętymi datami na końcu,
 *          jeśli ich liczba nie jest wielokrotnością `x`.
 *
 * @template Dayjs - Typ używany do reprezentacji dat. Funkcja wykorzystuje bibliotekę `dayjs`.
 */
export function toRowXDates(
  start: string | Dayjs,
  end: string | Dayjs,
  x: number
) {
  const startDate = dayjs(start)
    .startOf('week')
    .subtract(1, 'week')
    .startOf('week');
  const endDate = dayjs(end);
  const diff = startDate.diff(endDate, 'day');
  const offset = Math.abs(diff % x);
  const result = getDaysBetweenDates(startDate, endDate);
  result.splice(result.length - offset, offset);

  return result;
}

export function toFullWeeksDates(start: string | Dayjs, end: string | Dayjs) {
  const startDate = dayjs(start).startOf('week');
  const endDate = dayjs(end)
    .endOf('week')
    .clone()
    .add(1, 'week')
    .startOf('week');

  return getDaysBetweenDates(startDate, endDate);
}

export function toFullMonthsDates(start: string | Dayjs, end: string | Dayjs) {
  const startDate = dayjs(start).startOf('month').clone().startOf('week');
  const endDate = dayjs(end)
    .endOf('month')
    .clone()
    .add(1, 'week')
    .startOf('week');

  return getDaysBetweenDates(startDate, endDate);
}

/**
 * Funkcja `getDaysBetweenDates` oblicza wszystkie dni pomiędzy dwoma datami, włącznie z datą początkową.
 * Zwraca tablicę obiektów, z których każdy reprezentuje jeden dzień w przedziale dat.
 * Obiekty zawierają daty sformatowane według zdefiniowanego formatu.
 *
 * @param start - Data początkowa przedziału. Może być przekazana jako ciąg znaków (string) w formacie akceptowanym przez `dayjs` lub obiekt typu `Dayjs`.
 * @param end - Data końcowa przedziału. Może być przekazana jako ciąg znaków (string) w formacie akceptowanym przez `dayjs` lub obiekt typu `Dayjs`.
 *
 * @returns Tablica obiektów `CalendarDayType`, gdzie każdy obiekt reprezentuje jeden dzień w przedziale dat.
 *          Jeśli daty są niepoprawne, lub data początkowa jest późniejsza niż data końcowa, funkcja zwraca pustą tablicę.
 *
 * @throws W przypadku niepoprawnych dat lub błędów wewnętrznych mogą wystąpić błędy w konsoli.
 *
 * @example
 * // Przykład użycia funkcji:
 *
 * // Definiowanie formatu daty
 * const dateFormat = 'YYYY-MM-DD';
 *
 * // Przykład 1: Przekazanie dat jako ciągi znaków
 * const days1 = getDaysBetweenDates('2024-08-01', '2024-08-05');
 * console.log(days1);
 * // Oczekiwany wynik: [{ date: '2024-08-01' }, { date: '2024-08-02' }, { date: '2024-08-03' }, { date: '2024-08-04' }, { date: '2024-08-05' }]
 *
 * // Przykład 2: Przekazanie dat jako obiekty Dayjs
 * const startDate = dayjs('2024-08-01');
 * const endDate = dayjs('2024-08-05');
 * const days2 = getDaysBetweenDates(startDate, endDate);
 * console.log(days2);
 * // Oczekiwany wynik: [{ date: '2024-08-01' }, { date: '2024-08-02' }, { date: '2024-08-03' }, { date: '2024-08-04' }, { date: '2024-08-05' }]
 *
 * // Przykład 3: Niepoprawna data początkowa
 * const invalidDays = getDaysBetweenDates('invalid-date', '2024-08-05');
 * console.log(invalidDays);
 * // Oczekiwany wynik: []
 */
export function getDaysBetweenDates(
  start: string | Dayjs,
  end: string | Dayjs
) {
  const days: CalendarDayType[] = [];
  const startDate = dayjs(start);
  const endDate = dayjs(end);

  if (!startDate.isValid() || !endDate.isValid()) {
    console.log('startDate IS INVALID');
    return days;
  }

  if (!endDate.isValid()) {
    console.log('endDate IS INVALID');
    return days;
  }

  if (startDate.isAfter(endDate)) {
    console.log('startDate IS AFTER endDate');
    return days;
  }

  const diffCounter = Math.abs(endDate.diff(startDate, 'days'));

  void new Array<string>(diffCounter)
    .fill('', 0, diffCounter)
    .reduce<Dayjs>((indexDay) => {
      if (startDate === indexDay) {
        days.push({
          date: startDate.format(dateFormat),
        });
      } else {
        days.push({
          date: indexDay.format(dateFormat),
        });
      }

      return indexDay.add(1, 'day');
    }, startDate);

  return days;
}

/**
 * Segreguje dane o dniach według miesięcy, dodając dni offsetowe na początku i końcu miesięcy,
 * a następnie dzieli te dane na tygodnie według zadanego rozmiaru wiersza.
 *
 * @param days - Tablica obiektów `CalendarDayType`, gdzie każdy obiekt reprezentuje pojedynczy dzień.
 *               Obiekt `CalendarDayType` powinien zawierać przynajmniej pole `date` w formacie ISO 8601.
 *
 * @param rowSize - Liczba dni, które mają być wyświetlane w jednym wierszu tygodnia.
 *
 * @returns Tablica obiektów `CalendarMonthType`, gdzie każdy obiekt reprezentuje miesiąc z podziałem na tygodnie.
 *          Obiekt `CalendarMonthType` zawiera:
 *          - `monthIndex`: Indeks miesiąca (0 = styczeń, 1 = luty, ..., 11 = grudzień).
 *          - `yearIndex`: Rok, do którego należy miesiąc.
 *          - `weeks`: Tablica tygodni, gdzie każdy tydzień to tablica dni (`CalendarDayType`), która została podzielona
 *            na podstawie `rowSize`. Dni offsetowe są oznaczone flagą `isOffset: true`.
 *
 * Proces działania funkcji:
 *
 * 1. **Grupowanie dni według miesiąca i roku**:
 *    - Funkcja przekształca tablicę dni `days` w obiekt `monthsRaw`, gdzie kluczem jest rok i miesiąc
 *      (w formacie "YYYY-MM"), a wartością jest obiekt zawierający miesiąc, rok oraz tablicę dni w tym miesiącu.
 *
 * 2. **Obliczanie prefiksów i sufiksów dla każdego miesiąca**:
 *    - Dla każdego miesiąca sprawdzane są dni offsetowe (dni przed pierwszym dniem miesiąca i po ostatnim dniu miesiąca).
 *    - Jeżeli liczba dni w miesiącu jest mniejsza lub równa 7, prefiks i sufiks są pomijane.
 *    - Dni offsetowe są generowane na podstawie dnia tygodnia, w którym znajduje się pierwszy i ostatni dzień miesiąca.
 *      Są dodawane dni przed pierwszym dniem i po ostatnim dniu miesiąca, aby uzupełnić widok kalendarza.
 *
 * 3. **Mapowanie na `CalendarMonthType`**:
 *    - Obiekty `monthsRaw` są mapowane na format `CalendarMonthType`, gdzie dni są dzielone na tygodnie według `rowSize`.
 *    - Dni offsetowe są oznaczane jako `isOffset: true` w celu odróżnienia ich od standardowych dni miesiąca.
 *
 * 4. **Filtrowanie nulli**:
 *    - Na końcu funkcja filtruje wyniki, usuwając ewentualne `null` z tablicy, co może mieć miejsce, gdy miesiąc
 *      ma mniej niż 8 dni.
 */
export function segregateDatesMonthly(
  days: CalendarDayType[],
  rowSize: number
): CalendarMonthType[] {
  // 1. Group days by month and year
  const monthsRaw: MonthsRaw = days.reduce((acc, day) => {
    const monthKey = day.date.slice(0, 7);
    const currentDay = dayjs(day.date);

    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: currentDay.month(),
        year: currentDay.year(),
        days: [],
      };
    }

    acc[monthKey].days.push(day);

    return acc;
  }, {} as MonthsRaw);

  // 2. calculate prefix and suffix of each month
  const prefixedAdnSuffixedMonths = Object.values(monthsRaw).map(
    (monthItem) => {
      if (monthItem.days.length <= 7) {
        return null;
      }
      const firstDay = monthItem.days[0].date;
      const lastDay = monthItem.days[monthItem.days.length - 1].date;

      const prefixStartOfWeek = dayjs(firstDay).startOf('week');
      const prefixStart =
        prefixStartOfWeek.format(dateFormat) ===
        dayjs(firstDay).format(dateFormat)
          ? dayjs(firstDay).clone().subtract(1, 'week')
          : dayjs(firstDay).startOf('week');
      const prefixEnd = dayjs(firstDay);

      const suffixStart = dayjs(lastDay).clone().add(1, 'day');
      const suffixEnd = dayjs(lastDay).endOf('week').clone().add(1, 'day');

      const prefix = getDaysBetweenDates(prefixStart, prefixEnd).map((day) => {
        return {
          ...day,
          isOffset: true,
        };
      });

      const suffix = getDaysBetweenDates(suffixStart, suffixEnd).map((day) => {
        return {
          ...day,
          isOffset: true,
        };
      });

      // 3. map to CalendarMonthType
      return {
        monthIndex: monthItem.month,
        yearIndex: monthItem.year,
        weeks: splitEvenly([...prefix, ...monthItem.days, ...suffix], rowSize),
      };
    }
  );

  return prefixedAdnSuffixedMonths.filter((item) => item !== null);
}
