import { CalendarEvent } from '@api/db/types';
import type { CaregiverColors } from '@utils/caregiverColors';
import { createContext, MouseEvent, PointerEvent, useContext } from 'react';
import { CalendarDayType } from './Calendar.types';

export type OnDayClickHandler = (
  date: CalendarDayType,
  event?: MouseEvent<Element>
) => void;

export type OnDayPointerHandler = (
  date: CalendarDayType,
  event: PointerEvent<Element>
) => void;

export type OnDayTouchHandler = (
  date: CalendarDayType,
  event: TouchEvent
) => void;

export interface CalenderContextData {
  rowSize: number;
  containerWidth: number;
  isTodayVisible: boolean;
  isPlanVisible: boolean;
  isAlternatingVisible: boolean;
  isOtherCareVisible: boolean;
  isWeekendsVisible: boolean;
  isEventsVisible: boolean;
  events: CalendarEvent[];
  displayStrategy: 'continous' | 'separateMonths';
  onDayClick?: OnDayClickHandler;
  onPointerUp?: OnDayPointerHandler;
  onPointerDown?: OnDayPointerHandler;
  selection?: string | string[];
  isMultiSelectionMode?: boolean;
  hideSelectionCheckbox?: boolean;
  isDayDimmed?: (date: string) => boolean;
  isDayMarked?: (date: string) => boolean;
  caregiverColors?: CaregiverColors;
}

export const CalenderContext = createContext<CalenderContextData>({
  containerWidth: 0,
  rowSize: 7,
  isTodayVisible: true,
  isPlanVisible: false,
  isAlternatingVisible: true,
  isOtherCareVisible: true,
  isWeekendsVisible: true,
  isEventsVisible: true,
  events: [],
  displayStrategy: 'continous',
  onDayClick: () => {},
  onPointerUp: () => {},
  onPointerDown: () => {},
  selection: [],
  isMultiSelectionMode: false,
  hideSelectionCheckbox: false,
});

export const useCalenderContext = () => {
  const calenderContextData = useContext(CalenderContext);
  return calenderContextData;
};
