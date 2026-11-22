'use client';

import DashboardContainer from '@components/DashboardContainer/DashboardContainer';
import { ErrorMessage } from '@components/ErrorMessage/ErrorMessage';

import { useGetEventsByGroupQuery } from '@api/db/events/useGetEventsByGroupQuery';
import { TodayButton } from '@modules/TodayButton/TodayButton';
import { useAppSearchParams } from '@utils/useAppSearchParams';
import { EditFormCalendar } from './components/EditFormCalendar/EditFormCalendar';

export const EditPage = () => {
  const { groupId } = useAppSearchParams();
  const { query } = useGetEventsByGroupQuery(groupId);

  if (query.isError) {
    return <ErrorMessage message={'Unexpected error occurred'} />;
  }

  return (
    <DashboardContainer>
      <EditFormCalendar fetchEventsMutation={query} />
      <TodayButton />
    </DashboardContainer>
  );
};
