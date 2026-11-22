import { CalendarDayType } from '@components/Calendar/Calendar.types';
import { useMutation } from '@tanstack/react-query';
import { toggleCareEventDates } from './careEventsApi';

export const useUpsertEventsMutation = (
  groupId: string,
  props: {
    onSuccess?: () => void;
    onError?: (error: unknown) => void;
  } = {}
) => {
  const { onSuccess = () => {}, onError = () => {} } = props;

  return useMutation({
    mutationFn: (dates: CalendarDayType[]) =>
      toggleCareEventDates(
        groupId,
        dates.map(({ date }) => date)
      ),
    onSuccess,
    onError,
  });
};
