import { CalendarEvent } from '@api/db/types';
import { useMutation } from '@tanstack/react-query';
import { createCareEvents } from './careEventsApi';

export const useImportEventsFromJsonMutation = (
  _groupId: string,
  props: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
  } = {}
) => {
  const { onSuccess = () => {}, onError = () => {} } = props;
  return useMutation({
    mutationFn: (events: CalendarEvent[]) => createCareEvents(events),
    onSuccess,
    onError,
  });
};
