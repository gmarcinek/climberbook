export type DisplayStrategy = 'continous' | 'separateMonths';

export interface CalendarMonthType {
  monthIndex: number;
  yearIndex: number;
  weeks: CalendarDayType[][];
}

export interface CalendarMonthRawType {
  month: number;
  year: number;
  days: CalendarDayType[];
}

export interface CalendarDayType {
  date: string;
  isOffset?: boolean;
}
