'use client';

import useElementSize from '@custom-react-hooks/use-element-size';

import { CalendarEvent } from '@api/db/types';
import type { CaregiverColors } from '@utils/caregiverColors';
import { splitEvenly } from '@utils/array';
import { NUMBER_SEVEN } from '@utils/number';
import { useCaregiverColors } from '@utils/useCaregiverColors';
import { CSSProperties, useMemo } from 'react';
import {
  CalenderContext,
  CalenderContextData,
  OnDayClickHandler,
  OnDayPointerHandler,
  OnDayTouchHandler,
} from './Calendar.context';
import { getDaysBetweenDates, segregateDatesMonthly } from './Calendar.helpers';
import { DisplayStrategy } from './Calendar.types';
import { CalendarUngruped } from './components/CalendarUngruped/CalendarUngruped';

import { CalendarMonths } from './components/CalendarMonths/CalendarMonths';
import { useCalendarDates } from './hooks/useCalendarDates';
import { useCalendarGap } from './hooks/useCalendarGap';

interface CalendarProps {
  startDate: string;
  rowSize?: number;
  displayStrategy?: DisplayStrategy;
  endDate?: string;
  isTodayVisible?: boolean;
  isPlanVisible?: boolean;
  isWeekendsVisible?: boolean;
  isAlternatingVisible?: boolean;
  isOtherCareVisible?: boolean;
  isEventsVisible?: boolean;
  events?: CalendarEvent[];
  className?: string;
  selection?: string[];
  onDayClick?: OnDayClickHandler;
  onPointerUp?: OnDayPointerHandler;
  onPointerDown?: OnDayPointerHandler;
  onTouchStart?: OnDayTouchHandler;
  onTouchEnd?: OnDayTouchHandler;
  isMultiSelectionMode?: boolean;
  hideSelectionCheckbox?: boolean;
  isDayDimmed?: (date: string) => boolean;
  /** Days drawn with a red cross (e.g. scheduled for removal). */
  isDayMarked?: (date: string) => boolean;
  /** Overrides saved caregiver colours (e.g. for a live settings preview). */
  caregiverColors?: CaregiverColors;
}

export function Calendar(props: CalendarProps) {
  const {
    startDate,
    rowSize = NUMBER_SEVEN,
    isTodayVisible = true,
    isPlanVisible = false,
    isAlternatingVisible = true,
    isOtherCareVisible = true,
    isWeekendsVisible = true,
    isMultiSelectionMode = false,
    isEventsVisible = true,
    hideSelectionCheckbox = false,
    events = [],
    displayStrategy = 'separateMonths',
    endDate,
    className,
    onDayClick,
    onPointerUp,
    onPointerDown,
    selection,
    isDayDimmed,
    isDayMarked,
    caregiverColors: caregiverColorsOverride,
  } = props;

  const savedCaregiverColors = useCaregiverColors();
  const caregiverColors = caregiverColorsOverride ?? savedCaregiverColors;
  const selfColor = Object.entries(caregiverColors).find(([subjectId]) =>
    subjectId.startsWith('self:')
  )?.[1];

  const isSeparateMonthsMode =
    displayStrategy === 'separateMonths' && rowSize === 7;
  const [setRef, size] = useElementSize();
  const gap = useCalendarGap(rowSize, size.width);

  const calendarDates =
    endDate !== undefined
      ? getDaysBetweenDates(startDate, endDate)
      : useCalendarDates({
          startDate,
          rowSize,
        });

  const { weeks, months } = useMemo(() => {
    const weeks = splitEvenly(calendarDates, rowSize);
    const months = segregateDatesMonthly(calendarDates, rowSize);

    return {
      weeks,
      months,
    };
  }, [rowSize, calendarDates]);

  const contextData = useMemo<CalenderContextData>(() => {
    return {
      isTodayVisible,
      isPlanVisible,
      isAlternatingVisible,
      isOtherCareVisible,
      isWeekendsVisible,
      isEventsVisible,
      rowSize,
      events,
      displayStrategy,
      containerWidth: size.width,
      onDayClick,
      onPointerUp,
      onPointerDown,
      selection,
      isMultiSelectionMode,
      hideSelectionCheckbox,
      isDayDimmed,
      isDayMarked,
      caregiverColors,
    };
  }, [
    isTodayVisible,
    isPlanVisible,
    isAlternatingVisible,
    isOtherCareVisible,
    isWeekendsVisible,
    isEventsVisible,
    rowSize,
    events,
    displayStrategy,
    size.width,
    onDayClick,
    onPointerUp,
    onPointerDown,
    selection,
    isMultiSelectionMode,
    hideSelectionCheckbox,
    isDayDimmed,
    isDayMarked,
    caregiverColors,
  ]);

  return (
    <CalenderContext.Provider value={contextData}>
      <div
        ref={setRef}
        className={className}
        style={
          {
            visibility: size.width > 0 ? 'visible' : 'hidden',
            ...(selfColor ? { '--care-self-color': selfColor } : {}),
          } as CSSProperties
        }
        aria-busy={size.width <= 0}
      >
        {isSeparateMonthsMode ? (
          <CalendarMonths gap={gap} months={months} />
        ) : (
          <CalendarUngruped gap={gap} weeks={weeks} />
        )}
      </div>
    </CalenderContext.Provider>
  );
}
