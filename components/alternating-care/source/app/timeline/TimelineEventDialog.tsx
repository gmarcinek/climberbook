'use client';

import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { deleteCareEvent } from '@api/db/events/careEventsApi';
import { useAppContext } from '@app/AppContext';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { EventEditorForm } from '@modules/DashboardPage/components/DayPlanPanel/EventEditorForm';
import dayjs from 'dayjs';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';

const datesBetween = (from: string, to: string) => {
  const start = dayjs(from);
  const count = dayjs(to).isBefore(start) ? 0 : dayjs(to).diff(start, 'day') + 1;
  return Array.from({ length: count }, (_, index) =>
    start.add(index, 'day').format(dateFormat),
  );
};

interface TimelineEventDialogProps {
  /** Events of the edited group (all its days); empty when adding. */
  groupEvents: CalendarEvent[];
  initialType?: CalendarEventType;
  onClose: () => void;
  onSaved: () => void;
}

/** Opens the same event editor modal as the calendar. */
export const TimelineEventDialog = ({
  groupEvents,
  initialType,
  onClose,
  onSaved,
}: TimelineEventDialogProps) => {
  const { language } = useAppContext();
  const isEnglish = language === 'en';
  const editedEvent = groupEvents[0];
  const initialDates = groupEvents.map((event) => event.date).sort();
  const today = dayjs().format(dateFormat);
  const [from, setFrom] = useState(initialDates[0] ?? today);
  const [to, setTo] = useState(initialDates.at(-1) ?? today);
  const [selection, setSelection] = useState<Set<string>>(
    () => new Set(initialDates.length ? initialDates : [today]),
  );
  const [isEndDateChosen, setIsEndDateChosen] = useState(Boolean(editedEvent));
  const [isDeleting, setIsDeleting] = useState(false);

  const setFormRange = (start: string, end: string) => {
    const normalizedEnd = end < start ? start : end;
    setFrom(start);
    setTo(normalizedEnd);
    setSelection(new Set(datesBetween(start, normalizedEnd)));
  };

  const removeEvent = async () => {
    if (
      !window.confirm(
        isEnglish ? 'Delete this event from all its days?' : 'Usunąć to wydarzenie ze wszystkich dni?',
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      // Sequential, because every delete rewrites the ranges of the same group.
      for (const event of groupEvents) await deleteCareEvent(event);
      toast(isEnglish ? 'Event deleted.' : 'Wydarzenie zostało usunięte.', { type: 'success' });
      onSaved();
      onClose();
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : String(cause), { type: 'error' });
      setIsDeleting(false);
    }
  };

  return createPortal(
    <EventEditorForm
      selectedDates={selection}
      onDatesChange={(dates) => {
        const sorted = [...dates].sort();
        setSelection(new Set(sorted));
        if (sorted.length) {
          setFrom(sorted[0]);
          setTo(sorted[sorted.length - 1]);
        }
      }}
      formStartDate={from}
      formEndDate={to}
      setFormRange={setFormRange}
      isEndDateChosen={isEndDateChosen}
      setIsEndDateChosen={setIsEndDateChosen}
      editingEvent={editedEvent}
      newEventType={editedEvent ? undefined : initialType}
      redirectAfterSave='/alternating-care/timeline'
      modal
      isDeleting={isDeleting}
      onDelete={() => void removeEvent()}
      onClose={onClose}
      onSaved={onSaved}
    />,
    document.querySelector('.alternatingCareRoot') ?? document.body,
  );
};
