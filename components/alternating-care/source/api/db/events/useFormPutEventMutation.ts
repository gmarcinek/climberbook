import { CalendarEvent } from '@api/db/types';
import { useMutation } from '@tanstack/react-query';
import { createCareEvents } from './careEventsApi';

export const useFormPutEventMutation = (
  props: {
    onSuccess?: (data?: CalendarEvent[]) => void;
    onError?: (error: unknown) => void;
  } = {}
) => {
  const { onSuccess = () => {}, onError = () => {} } = props;

  return useMutation({
    mutationFn: (events: CalendarEvent[]) => createCareEvents(events),
    onSuccess: (data) => onSuccess(data),
    onError: (error) => onError(error),
  });
};
