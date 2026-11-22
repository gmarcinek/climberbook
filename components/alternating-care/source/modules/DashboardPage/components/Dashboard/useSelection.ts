import {
  OnDayPointerHandler,
  OnDayTouchHandler,
} from '@components/Calendar/Calendar.context';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { CalendarDayType } from '@components/Calendar/Calendar.types';
import dayjs from 'dayjs';
import { useCallback, useState } from 'react';

interface UseSelectionProps {
  isMultiSelectionAvailable?: boolean;
}

export interface CalendarPointerHandlers {
  onPointerUp: OnDayPointerHandler;
  onPointerDown: OnDayPointerHandler;
  onTouchStart: OnDayTouchHandler;
  onTouchEnd: OnDayTouchHandler;
}

export const useSelection = (props: UseSelectionProps) => {
  const { isMultiSelectionAvailable = false } = props;
  const [isMultiSelectionMode, setIsMultiSelectionMode] =
    useState<boolean>(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [lastClickedDay, setLastClickedDay] = useState<string | null>(null);

  const addDateRange = (
    newSet: Set<string>,
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs
  ) => {
    let currentDate = startDate;
    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
      newSet.add(currentDate.format(dateFormat));
      currentDate = currentDate.add(1, 'day');
    }
  };

  const removeDateRange = (
    newSet: Set<string>,
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs
  ) => {
    let currentDate = startDate;
    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate)) {
      newSet.delete(currentDate.format(dateFormat));
      currentDate = currentDate.add(1, 'day');
    }
  };

  const handleRangeSelection = (
    newSet: Set<string>,
    dayDate: string,
    isAltPressed: boolean
  ) => {
    if (!isMultiSelectionAvailable) return;

    let startDate = dayjs(lastClickedDay);
    let endDate = dayjs(dayDate);

    if (startDate.isAfter(endDate)) {
      [startDate, endDate] = [endDate, startDate];
    }

    if (isAltPressed) {
      removeDateRange(newSet, startDate, endDate);
    } else {
      addDateRange(newSet, startDate, endDate);
    }
  };

  const handleMultiSelect = (newSet: Set<string>, dayDate: string) => {
    if (newSet.has(dayDate)) {
      newSet.delete(dayDate);
      if (newSet.size === 0) {
        setIsMultiSelectionMode(false);
        setLastClickedDay(null);
      }
    } else {
      newSet.add(dayDate);
    }
  };

  const handleSingleSelect = (newSet: Set<string>, dayDate: string) => {
    if (newSet.has(dayDate)) {
      setLastClickedDay(null);
      return new Set([]);
    }
    return new Set([dayDate]);
  };

  const defaultBehavior = useCallback(
    (day: CalendarDayType, event: any) => {
      const isShiftPressed = event?.shiftKey;
      const isAltPressed = event?.altKey;
      const isCtrlPressed = event?.ctrlKey;
      const dayDate = day.date;

      setSelection((prev) => {
        const newSet = new Set(prev);

        if (isMultiSelectionMode) {
          if (isShiftPressed && lastClickedDay) {
            handleRangeSelection(newSet, dayDate, isAltPressed);
          } else {
            handleMultiSelect(newSet, dayDate);
          }
        } else {
          if (isShiftPressed && lastClickedDay) {
            handleRangeSelection(newSet, dayDate, isAltPressed);
          } else if (isCtrlPressed) {
            handleMultiSelect(newSet, dayDate);
          } else {
            return handleSingleSelect(newSet, dayDate);
          }
          setIsMultiSelectionMode(props.isMultiSelectionAvailable ?? false);
        }

        if (newSet.size === 0) {
          setIsMultiSelectionMode(false);
          setLastClickedDay(null);
        } else {
          setLastClickedDay(dayDate);
        }

        const sorted = Array.from(newSet).sort();
        return new Set(sorted);
      });
    },
    [isMultiSelectionMode, lastClickedDay, props.isMultiSelectionAvailable]
  );

  const handlePointerUp = useCallback<OnDayPointerHandler>(
    (day, event) => {
      setLastClickedDay(day.date);
      defaultBehavior(day, event);
    },
    [defaultBehavior]
  );

  const handleTouchStart = useCallback<OnDayTouchHandler>((day, event) => {
    // Obsługa touchstart
  }, []);

  const handleTouchEnd = useCallback<OnDayTouchHandler>(
    (day, event) => {
      // Wykryj zmianę pozycji palca (ruch scrollujący vs kliknięcie)
      if (event.changedTouches.length === 1) {
        const touch = event.changedTouches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;

        const moveX = Math.abs(touch.clientX - startX);
        const moveY = Math.abs(touch.clientY - startY);

        if (moveX < 10 && moveY < 10) {
          // Wystarczająco mały ruch, by uznać to za kliknięcie
          defaultBehavior(day, event);
        }
      }
    },
    [defaultBehavior]
  );

  const handlePointerDown = useCallback<OnDayPointerHandler>(
    (day, event) => {},
    []
  );

  const onPointerHandlers: CalendarPointerHandlers = {
    onPointerUp: handlePointerUp,
    onPointerDown: handlePointerDown,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };

  return {
    selection,
    setSelection,
    handleCancelMultiSelect: () => setSelection(new Set()),
    isMultiSelectionMode,
    setIsMultiSelectionMode,
    lastClickedDay,
    handlers: {
      ...onPointerHandlers,
    },
  };
};
