import { useUpsertEventsMutation } from '@api/db/events/useUpsertEventsMutation';
import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { OnDayPointerHandler } from '@components/Calendar/Calendar.context';
import { colorBlueGreen700, white } from '@utils/color';
import { useCallback, useMemo, useRef, useState } from 'react';
import { CalendarPointerHandlers } from './useSelection';

const TAP_TOLERANCE = 10;

interface UseCareEditModeProps {
  events: CalendarEvent[];
  onSaved: () => Promise<unknown> | void;
}

// Mobile care editing: taps toggle single days locally (previewed on the
// calendar); nothing is saved until `save` is called.
export const useCareEditMode = ({ events, onSaved }: UseCareEditModeProps) => {
  const [isActive, setIsActive] = useState(false);
  const [toggledDates, setToggledDates] = useState<Set<string>>(new Set());
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const mutation = useUpsertEventsMutation(CalendarEventType.Alternating, {
    // Awaited so the mutation stays pending until the refreshed care is loaded.
    async onSuccess() {
      await onSaved();
      setToggledDates(new Set());
      setIsActive(false);
    },
  });

  const previewEvents = useMemo(() => {
    if (toggledDates.size === 0) return events;
    const careDates = new Set(
      events
        .filter((event) => event.type === CalendarEventType.Alternating)
        .map((event) => event.date)
    );
    const added: CalendarEvent[] = Array.from(toggledDates)
      .filter((date) => !careDates.has(date))
      .map((date) => ({
        id: `pending-${date}`,
        groupId: CalendarEventType.Alternating,
        creationTime: 0,
        date,
        type: CalendarEventType.Alternating,
        issuer: '',
        name: 'ALTERNATING',
        description: '',
        style: { background: colorBlueGreen700, color: white },
      }));
    return [
      ...events.filter(
        (event) =>
          event.type !== CalendarEventType.Alternating ||
          !toggledDates.has(event.date)
      ),
      ...added,
    ];
  }, [events, toggledDates]);

  const handlePointerDown = useCallback<OnDayPointerHandler>((_, event) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handlePointerUp = useCallback<OnDayPointerHandler>(
    (day, event) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (
        !start ||
        Math.abs(event.clientX - start.x) > TAP_TOLERANCE ||
        Math.abs(event.clientY - start.y) > TAP_TOLERANCE ||
        mutation.isPending
      ) {
        return;
      }
      setToggledDates((current) => {
        const next = new Set(current);
        if (next.has(day.date)) next.delete(day.date);
        else next.add(day.date);
        return next;
      });
    },
    [mutation.isPending]
  );

  const handlers: CalendarPointerHandlers = useMemo(
    () => ({
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onTouchStart: () => undefined,
      onTouchEnd: () => undefined,
    }),
    [handlePointerDown, handlePointerUp]
  );

  const start = useCallback(() => {
    setToggledDates(new Set());
    setIsActive(true);
  }, []);

  const cancel = useCallback(() => {
    setToggledDates(new Set());
    setIsActive(false);
  }, []);

  const save = useCallback(() => {
    if (toggledDates.size === 0) {
      setIsActive(false);
      return;
    }
    mutation.mutate(Array.from(toggledDates).map((date) => ({ date })));
  }, [mutation, toggledDates]);

  return {
    isActive,
    start,
    cancel,
    save,
    changedCount: toggledDates.size,
    isSaving: mutation.isPending,
    isError: mutation.isError,
    handlers,
    previewEvents,
  };
};
