'use client';

import { Stack } from '@components/Stack/Stack';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CareSummary } from '../CareSummary/CareSummary';
import styles from './CalendarFormSection.module.scss';

const CARE_PLAN_URL = '/alternating-care/plan';

interface CalendarFormSectionProps {
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
  const { careEdit, endDate } = props;
  const router = useRouter();

  return (
    <Stack gap={0}>
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
    </Stack>
  );
};
