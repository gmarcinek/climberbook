import { OnDayPointerHandler } from '@components/Calendar/Calendar.context';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { CalendarDayType } from '@components/Calendar/Calendar.types';
import dayjs from 'dayjs';
import { PointerEvent, useCallback, useState } from 'react';

interface UseSelectionProps {
  isMultiSelectionAvailable?: boolean;
}

export const useEditSelection = (props: UseSelectionProps) => {
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
    if (!isMultiSelectionAvailable) {
      return;
    }

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
        setIsMultiSelectionMode?.(false);
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
    (day: CalendarDayType, event: PointerEvent<Element>) => {
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
          setIsMultiSelectionMode?.(props.isMultiSelectionAvailable ?? false);
        }

        // Check if all days are deselected
        if (newSet.size === 0) {
          setIsMultiSelectionMode?.(false);
          setLastClickedDay(null);
        } else {
          setLastClickedDay(dayDate);
        }

        return newSet;
      });
    },
    [isMultiSelectionMode, lastClickedDay]
  );

  const handleOnDayPointerUp = useCallback<OnDayPointerHandler>(
    (day, event) => {
      setLastClickedDay(day.date);
      const isShiftPressed = event?.shiftKey;

      if (isShiftPressed) {
        setIsMultiSelectionMode?.(props.isMultiSelectionAvailable ?? false);
      }

      defaultBehavior(day, event);
    },
    [defaultBehavior]
  );

  const handleOnDayPointerDown = useCallback<OnDayPointerHandler>(
    (day, event) => {},
    []
  );

  const handleCancelMultiSelect = useCallback(() => {
    setIsMultiSelectionMode?.(false);
    setSelection(new Set());
  }, []);

  const onPointerHandlers = {
    onPointerUp: handleOnDayPointerUp,
    onPointerDown: handleOnDayPointerDown,
  };

  return {
    selection,
    setSelection,
    handleCancelMultiSelect,
    isMultiSelectionMode,
    setIsMultiSelectionMode,
    lastClickedDay,
    handlers: {
      ...onPointerHandlers,
    },
  };
};
