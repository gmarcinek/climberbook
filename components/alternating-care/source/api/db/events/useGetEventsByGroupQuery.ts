import { useQuery } from '@tanstack/react-query';
import { useAppSearchParams } from '@utils/useAppSearchParams';
import { listCareEvents } from './careEventsApi';

export const useGetEventsByGroupQuery = (groupId: string) => {
  const { startDate, endDate } = useAppSearchParams();
  const query = useQuery({
    queryFn: () => listCareEvents({ groupId, start: startDate, end: endDate }),
    queryKey: ['careEvents', 'group', groupId, startDate, endDate],
    enabled: Boolean(groupId),
  });

  return {
    query,
    data: query.data || [],
    isPending: query.isPending,
    isSuccess: query.isSuccess,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
};
