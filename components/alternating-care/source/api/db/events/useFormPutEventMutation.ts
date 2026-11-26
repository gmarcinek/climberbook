import { CalendarEvent } from '@api/db/types';
import { useMutation } from '@tanstack/react-query';
import { createCareEvents } from './careEventsApi';

export const useFormPutEventMutation = (
  props: {
    onSuccess?: (data?: CalendarEvent[], submitted?: CalendarEvent[]) => void;
    onError?: (error: unknown) => void;
  } = {}
) => {
  const { onSuccess = () => {}, onError = () => {} } = props;

  return useMutation({
    mutationFn: (events: CalendarEvent[]) => createCareEvents(events),
    // The API answers with all of the user's events; `submitted` are the saved ones.
    onSuccess: (data, submitted) => onSuccess(data, submitted),
    onError: (error) => onError(error),
  });
};
