import { useMutation } from '@tanstack/react-query';
import { listCareEvents } from './careEventsApi';

export const useGetAllEventsMutation = (
  props: {
    onSuccess?: (data?: Awaited<ReturnType<typeof listCareEvents>>) => void;
    onError?: (error: unknown) => void;
  } = {}
) => {
  const { onSuccess = () => {}, onError = () => {} } = props;
  const mutation = useMutation({
    mutationFn: listCareEvents,
    onSuccess,
    onError,
  });

  return {
    mutation,
    data: mutation.data || [],
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    refetch: mutation.mutate,
  };
};
