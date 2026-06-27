import { type TrainingRecord } from "@/lib/climbs-db";

export type CalendarDayCell = {
  date: string;
  isOffset?: boolean;
};

export type CalendarMonthData = {
  monthIndex: number;
  year: number;
  weeks: CalendarDayCell[][];
};

export type TrainingGroupByDate = {
  date: string;
  trainings: TrainingRecord[];
};

const WEEKDAY_LABELS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So", "Nd"];
const MONTH_LABELS = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

export function getWeekdayLabels() {
  return WEEKDAY_LABELS;
}

export function getMonthLabel(monthIndex: number) {
  return MONTH_LABELS[monthIndex] ?? "";
}

export function toDate(value: string | Date) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
}

export function formatDateIso(value: string | Date) {
  const date = toDate(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDateLabel(value: string) {
  const date = toDate(value);
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function getMonthStart(value: string | Date) {
  const date = toDate(value);
  return formatDateIso(new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0));
}

export function addMonths(value: string, amount: number) {
  const date = toDate(value);
  return formatDateIso(new Date(date.getFullYear(), date.getMonth() + amount, 1, 12, 0, 0, 0));
}

export function addDays(value: string | Date, amount: number) {
  const date = toDate(value);
  date.setDate(date.getDate() + amount);
  return formatDateIso(date);
}

function startOfWeekMonday(value: string | Date) {
  const date = toDate(value);
  const jsDay = date.getDay();
  const mondayIndex = jsDay === 0 ? 6 : jsDay - 1;
  date.setDate(date.getDate() - mondayIndex);
  return date;
}

function endOfWeekMonday(value: string | Date) {
  const date = startOfWeekMonday(value);
  date.setDate(date.getDate() + 6);
  return date;
}

function endOfMonth(value: string | Date) {
  const date = toDate(value);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12, 0, 0, 0);
}

export function getVisibleRange(anchorMonthStart: string, monthCount = 12) {
  const start = formatDateIso(startOfWeekMonday(anchorMonthStart));
  const anchorDate = toDate(anchorMonthStart);
  const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + monthCount, 0, 12, 0, 0, 0);
  const end = formatDateIso(endOfWeekMonday(monthEnd));

  return {
    start,
    end,
  };
}

export function getDaysBetweenDates(start: string | Date, end: string | Date) {
  const days: CalendarDayCell[] = [];
  const cursor = toDate(start);
  const endDate = toDate(end);

  while (cursor <= endDate) {
    days.push({ date: formatDateIso(cursor) });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function splitEvenly<T>(items: T[], size: number) {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

export function segregateDatesMonthly(days: CalendarDayCell[], rowSize: number) {
  const monthsRaw = days.reduce<Record<string, { month: number; year: number; days: CalendarDayCell[] }>>((acc, day) => {
    const currentDate = toDate(day.date);
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: currentDate.getMonth(),
        year: currentDate.getFullYear(),
        days: [],
      };
    }

    acc[monthKey].days.push(day);
    return acc;
  }, {});

  return Object.values(monthsRaw)
    .map((monthItem) => {
      if (monthItem.days.length <= 7) {
        return null;
      }

      const firstDay = monthItem.days[0].date;
      const lastDay = monthItem.days[monthItem.days.length - 1].date;
      const prefixStart = formatDateIso(startOfWeekMonday(firstDay));
      const prefixDays = getDaysBetweenDates(prefixStart, addDays(firstDay, -1)).map((day) => ({
        ...day,
        isOffset: true,
      }));
      const suffixEnd = formatDateIso(endOfWeekMonday(lastDay));
      const suffixDays = getDaysBetweenDates(addDays(lastDay, 1), suffixEnd).map((day) => ({
        ...day,
        isOffset: true,
      }));

      return {
        monthIndex: monthItem.month,
        year: monthItem.year,
        weeks: splitEvenly([...prefixDays, ...monthItem.days, ...suffixDays], rowSize),
      } satisfies CalendarMonthData;
    })
    .filter((item): item is CalendarMonthData => item !== null);
}

export function buildCalendarMonths(anchorMonthStart: string, monthCount = 12) {
  const anchor = getMonthStart(anchorMonthStart);
  const rangeEnd = formatDateIso(endOfMonth(addMonths(anchor, monthCount - 1)));
  const allDays = getDaysBetweenDates(anchor, rangeEnd);
  return segregateDatesMonthly(allDays, 7);
}

export function groupTrainingsByDate(trainings: TrainingRecord[]) {
  return trainings.reduce<TrainingGroupByDate[]>((acc, training) => {
    const existingGroup = acc.find((group) => group.date === training.date);

    if (existingGroup) {
      existingGroup.trainings.push(training);
    } else {
      acc.push({
        date: training.date,
        trainings: [training],
      });
    }

    return acc;
  }, []);
}

export function sortTrainingsDescending(trainings: TrainingRecord[]) {
  return trainings.slice().sort((left, right) => {
    const leftValue = `${left.date}T${left.time}`;
    const rightValue = `${right.date}T${right.time}`;

    if (leftValue === rightValue) {
      return right.createdAt.localeCompare(left.createdAt);
    }

    return rightValue.localeCompare(leftValue);
  });
}

export function getTrainingsInRange(trainings: TrainingRecord[], start: string, end: string) {
  return sortTrainingsDescending(trainings.filter((training) => training.date >= start && training.date <= end));
}

export function getTrainingsForDate(trainings: TrainingRecord[], date: string) {
  return sortTrainingsDescending(trainings.filter((training) => training.date === date));
}

export function summarizeTrainingType(training: TrainingRecord) {
  return training.surfaces.length ? training.surfaces.join(", ") : "Sesja";
}

export function getTimelinePlacement(time: string, durationMinutes: number) {
  const [hoursText, minutesText] = time.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const startMinutes = hours * 60 + minutes;

  return {
    left: `${(startMinutes / 1440) * 100}%`,
    width: `${Math.max((durationMinutes / 1440) * 100, 2)}%`,
  };
}