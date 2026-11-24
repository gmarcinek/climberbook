'use client';

import { CalendarEvent } from '@api/db/types';
import type { CareEventsQuery } from '@api/db/events/useGetAllEventsQuery';
import { Stack } from '@components/Stack/Stack';
import { sortBy } from '@utils/array';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CareSummary } from '../CareSummary/CareSummary';
import { DashboardEventForm } from '../DashboardEventForm/DashboardEventForm';
import { IncomingEventList } from '../IncomingEventList/IncomingEventList';
import styles from './CalendarFormSection.module.scss';

const CARE_PLAN_URL = '/alternating-care/plan';

interface CalendarFormSectionProps {
  fetchEventsQuery: CareEventsQuery;
  selection: Set<string>;
  setIsMultiSelectionMode: Dispatch<SetStateAction<boolean>>;
  handleCancelMultiSelect: () => void;
  setSelection: Dispatch<SetStateAction<Set<string>>>;
  endDate?: string;
  careEdit: {
    isActive: boolean;
    isSaving: boolean;
    changedCount: number;
    start: () => void;
    cancel: () => void;
    save: () => void;
    toggledDates: Set<string>;
  };
}

export const CalendarFormSection = (props: CalendarFormSectionProps) => {
  const {
    fetchEventsQuery,
    handleCancelMultiSelect,
    selection,
    setIsMultiSelectionMode,
    setSelection,
    careEdit,
    endDate,
  } = props;
  const [activeTab, setActiveTab] = useState<'events' | 'care'>('care');
  const router = useRouter();

  useEffect(() => {
    if (selection.size > 0) setActiveTab('events');
  }, [selection]);

  const onAddEventSuccess = useCallback(() => {
    setIsMultiSelectionMode(false);
    handleCancelMultiSelect();
    fetchEventsQuery.refetch();
  }, [
    setIsMultiSelectionMode,
    handleCancelMultiSelect,
    fetchEventsQuery.refetch,
  ]);

  const sortedEvents = useMemo(() => {
    const data = fetchEventsQuery.data || ([] as CalendarEvent[]);
    return sortBy(data, 'creationTime');
  }, [fetchEventsQuery.data]);

  return (
    <Stack gap={0}>
      <div className={styles.tabs} role='tablist' aria-label='Panel kalendarza'>
        <button
          type='button'
          role='tab'
          aria-selected={activeTab === 'care'}
          className={activeTab === 'care' ? styles.activeTab : undefined}
          onClick={() => setActiveTab('care')}
        >
          Opieka
        </button>
        <button
          type='button'
          role='tab'
          aria-selected={activeTab === 'events'}
          className={activeTab === 'events' ? styles.activeTab : undefined}
          onClick={() => setActiveTab('events')}
        >
          Wydarzenia
        </button>
      </div>

      {activeTab === 'events' && (
        <>
          <Stack gap={8}>
            <DashboardEventForm
              selection={Array.from(selection)}
              setSelection={setSelection}
              onSuccess={onAddEventSuccess}
              setIsMultiSelectionMode={setIsMultiSelectionMode}
            />
          </Stack>
          <IncomingEventList data={sortedEvents} selection={selection} />
        </>
      )}

      {activeTab === 'care' && (
        <section className={styles.carePanel}>
          <div className={styles.carePanelActions}>
            <Link href={CARE_PLAN_URL} className={styles.editCareButton}>
              Edytuj opiekę
            </Link>
          </div>
          {careEdit.isActive && (
            <section className={styles.manualCorrections}>
              <header>
                <div>
                  <span>Korekty ręczne</span>
                  <h3>Kliknij dni w kalendarzu</h3>
                </div>
                <span>
                  {careEdit.isSaving
                    ? 'Zapisywanie…'
                    : `Zmienione dni: ${careEdit.changedCount}`}
                </span>
              </header>
              {careEdit.changedCount > 0 ? (
                <ul>
                  {Array.from(careEdit.toggledDates)
                    .sort()
                    .map((date) => (
                      <li key={date}>
                        <span>{date}</span>
                        <small>Moja opieka</small>
                      </li>
                    ))}
                </ul>
              ) : (
                <p>Lista zmian jest pusta. Wybierz dni po lewej.</p>
              )}
              <footer>
                <button
                  type='button'
                  onClick={() => {
                    careEdit.cancel();
                    router.push(CARE_PLAN_URL);
                  }}
                  disabled={careEdit.isSaving}
                >
                  Zaplanuj cykl
                </button>
                <button
                  type='button'
                  onClick={careEdit.cancel}
                  disabled={careEdit.isSaving}
                >
                  Anuluj
                </button>
                <button
                  type='button'
                  className={styles.confirmCareEdit}
                  onClick={careEdit.save}
                  disabled={careEdit.isSaving}
                >
                  Zatwierdź
                </button>
              </footer>
            </section>
          )}
          <CareSummary
            windowDays={365}
            upcomingCount='all'
            endDate={endDate}
          />
        </section>
      )}
    </Stack>
  );
};
