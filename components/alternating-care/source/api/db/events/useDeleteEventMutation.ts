import { CalendarEvent } from '@api/db/types';
import { useMutation } from '@tanstack/react-query';
import { deleteCareEvent } from './careEventsApi';

export const useDeleteEventMutation = (
  props: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
  } = {}
) => {
  const { onSuccess = () => {}, onError = () => {} } = props;

  return useMutation({
    mutationFn: (event: CalendarEvent) => deleteCareEvent(event),
    onSuccess,
    onError,
  });
};
