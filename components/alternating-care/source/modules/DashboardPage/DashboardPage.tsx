'use client';

import { useGetAllEventsQuery } from '@api/db/events/useGetAllEventsQuery';
import DashboardContainer from '@components/DashboardContainer/DashboardContainer';
import { ErrorMessage } from '@components/ErrorMessage/ErrorMessage';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { Dashboard, type DashboardMobileView } from './components/Dashboard/Dashboard';
import { DashboardPageContext } from './DashboardPage.context';

export const DashboardPage = ({
  mobileView = 'care',
}: {
  mobileView?: DashboardMobileView;
}) => {
  const { query, refetch, loadMonth } = useGetAllEventsQuery({ lazy: true });
  const queryClient = useQueryClient();
  const updateAllEvents = useCallback(async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ['careUpcoming'] }),
      queryClient.invalidateQueries({ queryKey: ['careSummary'] }),
    ]);
  }, [queryClient, refetch]);
  const contextData = useMemo(() => {
    return {
      updateAllEvents,
    };
  }, [updateAllEvents]);

  if (query.isError && !query.data?.length) {
    return <ErrorMessage message={'Unexpected error occurred'} />;
  }

  return (
    <DashboardPageContext.Provider value={contextData}>
      <DashboardContainer>
        <Dashboard
          fetchEventsQuery={query}
          loadMonth={loadMonth}
          mobileView={mobileView}
        />
      </DashboardContainer>
    </DashboardPageContext.Provider>
  );
};
