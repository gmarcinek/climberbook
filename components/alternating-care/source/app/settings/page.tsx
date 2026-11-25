'use client';

import ExportButton from '@api/db/export/ExportButton';
import ImportButton from '@api/db/import/ImportButton';
import PageContainer from '@components/PageContainer/PageContainer';
import { useAppContext } from '@app/AppContext';
import { useQueryClient } from '@tanstack/react-query';
import { useCareHandoffMode } from '@utils/useCareHandoffMode';
import {
  Clock3,
  Download,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import dashboardStyles from '@modules/DashboardPage/components/Dashboard/Dashboard.module.scss';
import styles from './settings.module.scss';

const handoffModes = ['simplified', 'half-day', 'hourly'] as const;

export default function UserForm() {
  const { language } = useAppContext();
  const { mode, setMode } = useCareHandoffMode();
  const isEnglish = language === 'en';
  const [isResetting, setIsResetting] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetInput, setResetInput] = useState('');
  const queryClient = useQueryClient();

  const copy = {
    simplified: {
      title: isEnglish ? 'Simplified' : 'Uproszczony',
      description: isEnglish
        ? 'The selected day is the handoff day.'
        : 'Dzień zaznaczenia jest pełnym dniem wymiany.',
    },
    'half-day': {
      title: isEnglish ? 'Half-day' : 'Połowiczny',
      description: isEnglish
        ? 'The first and last day of a period count as half-days.'
        : 'Pierwszy i ostatni dzień tury liczą się jako pół dnia.',
    },
    hourly: {
      title: isEnglish ? 'Hourly' : 'Godzinowy',
      description: isEnglish
        ? 'Handoff hours are included in summaries.'
        : 'Godzina wymiany jest uwzględniana w podsumowaniach.',
    },
  };

  return (
    <PageContainer scrollable isFullWidth>
      <nav
        className={dashboardStyles.mobileTabs}
        aria-label={isEnglish ? 'Mobile view' : 'Widok mobilny'}
      >
        <Link href='/alternating-care'>{isEnglish ? 'Care' : 'Opieka'}</Link>
        <Link href='/alternating-care/calendar'>
          {isEnglish ? 'Calendar' : 'Kalendarz'}
        </Link>
        <Link href='/alternating-care/add'>Event</Link>
        <Link
          href='/alternating-care/settings'
          className={dashboardStyles.activeTab}
          aria-current='page'
        >
          {isEnglish ? 'Settings' : 'Ustawienia'}
        </Link>
      </nav>
      <main className={styles.page}>
        <header className={`${styles.header} ${styles.fullRow}`}>
          <span className={styles.eyebrow}>
            {isEnglish ? 'Care calendar' : 'Kalendarz opieki'}
          </span>
          <h1>{isEnglish ? 'Settings' : 'Ustawienia'}</h1>
          <p>
            {isEnglish
              ? 'Adjust how care periods are counted and keep a portable copy of your data.'
              : 'Dostosuj liczenie okresów opieki i zachowaj przenośną kopię swoich danych.'}{' '}
            <Link href='/alternating-care/people'>
              {isEnglish
                ? 'Caregivers and wards have their own page.'
                : 'Opiekunowie i podopieczni mają osobną stronę.'}
            </Link>
          </p>
        </header>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.icon}>
              <Clock3 size={20} aria-hidden />
            </span>
            <div>
              <h2>
                {isEnglish
                  ? 'Care handoff calculation'
                  : 'Sposób liczenia wymiany'}
              </h2>
              <p>
                {isEnglish
                  ? 'Choose how the first and last days are represented.'
                  : 'Wybierz, jak mają być liczone pierwszy i ostatni dzień opieki.'}
              </p>
            </div>
          </div>

          <div className={styles.modeGrid} role='radiogroup' aria-label='Sposób liczenia wymiany'>
            {handoffModes.map((handoffMode) => {
              const selected = mode === handoffMode;
              return (
                <button
                  key={handoffMode}
                  type='button'
                  role='radio'
                  aria-checked={selected}
                  className={`${styles.modeOption} ${selected ? styles.modeOptionSelected : ''}`}
                  onClick={() => setMode(handoffMode)}
                >
                  <span className={styles.radioIndicator}>
                    <span />
                  </span>
                  <span>
                    <strong>{copy[handoffMode].title}</strong>
                    <small>{copy[handoffMode].description}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.icon}>
              <ShieldCheck size={20} aria-hidden />
            </span>
            <div>
              <h2>{isEnglish ? 'Your data' : 'Twoje dane'}</h2>
              <p>
                {isEnglish
                  ? 'Export a backup or restore events from a JSON file.'
                  : 'Pobierz kopię zapasową lub przywróć wydarzenia z pliku JSON.'}
              </p>
            </div>
          </div>

          <div className={styles.dataActions}>
            <div className={styles.actionCard}>
              <span className={styles.actionIcon}>
                <Upload size={22} aria-hidden />
              </span>
              <div>
                <h3>{isEnglish ? 'Calendar import' : 'Import kalendarza'}</h3>
                <p>
                  {isEnglish
                    ? 'Add calendar events from a compatible JSON backup.'
                    : 'Dodaj wydarzenia z kompatybilnej kopii zapasowej JSON.'}
                </p>
              </div>
              <ImportButton
                className={styles.actionButton}
                label={isEnglish ? 'Choose JSON file' : 'Wybierz plik JSON'}
              />
            </div>

            <div className={styles.actionCard}>
              <span className={styles.actionIcon}>
                <Download size={22} aria-hidden />
              </span>
              <div>
                <h3>{isEnglish ? 'Calendar export' : 'Eksport kalendarza'}</h3>
                <p>
                  {isEnglish
                    ? 'Download all events in a portable JSON format.'
                    : 'Pobierz wszystkie wydarzenia w przenośnym formacie JSON.'}
                </p>
              </div>
              <ExportButton
                className={styles.actionButton}
                label={isEnglish ? 'Download backup' : 'Pobierz kopię'}
              />
            </div>
          </div>
        </section>

        <section className={`${styles.card} ${styles.dangerZone}`}>
          <div className={styles.cardHeader}>
            <span className={`${styles.icon} ${styles.dangerIcon}`}>
              <ShieldAlert size={20} aria-hidden />
            </span>
            <div>
              <h2>{isEnglish ? 'Danger zone' : 'Strefa niebezpieczna'}</h2>
              <p>
                {isEnglish
                  ? 'Irreversible operations on your calendar data.'
                  : 'Nieodwracalne operacje na danych kalendarza.'}
              </p>
            </div>
          </div>

          <div className={styles.dangerActions}>
            <div className={`${styles.actionCard} ${styles.dangerActionCard}`}>
              <span className={styles.actionIcon}>
                <Trash2 size={22} aria-hidden />
              </span>
              <div>
                <h3>{isEnglish ? 'Reset calendar' : 'Reset kalendarza'}</h3>
                <p>
                  {isEnglish
                    ? 'Delete all care events and plans. Caregivers and settings stay intact.'
                    : 'Usuń wszystkie wydarzenia i plany opieki. Opiekunowie i ustawienia pozostaną.'}
                </p>
              </div>
              {resetCode ? (
                <div className={styles.resetConfirm}>
                  <p>
                    {isEnglish
                      ? 'This cannot be undone. Type the code to confirm:'
                      : 'Tej operacji nie mo?na cofn??. Wpisz kod, aby potwierdzi?:'}
                  </p>
                  <code>{resetCode}</code>
                  <input
                    value={resetInput}
                    maxLength={6}
                    autoComplete='off'
                    spellCheck={false}
                    placeholder={isEnglish ? 'Code' : 'Kod'}
                    aria-label={isEnglish ? 'Confirmation code' : 'Kod potwierdzenia'}
                    onChange={(event) => setResetInput(event.target.value)}
                  />
                  <div>
                    <button
                      type='button'
                      className={styles.secondaryActionButton}
                      disabled={isResetting}
                      onClick={() => {
                        setResetCode('');
                        setResetInput('');
                      }}
                    >
                      {isEnglish ? 'Cancel' : 'Anuluj'}
                    </button>
                    <button
                      type='button'
                      className={styles.dangerActionButton}
                      disabled={
                        isResetting ||
                        resetInput.trim().toUpperCase() !== resetCode
                      }
                      onClick={() => {
                        setIsResetting(true);
                        void fetch('/api/alternating-care/reset', { method: 'DELETE' })
                          .then(async (response) => {
                            if (!response.ok) {
                              const data = (await response.json().catch(() => null)) as
                                | { error?: string }
                                | null;
                              throw new Error(
                                data?.error ||
                                  (isEnglish
                                    ? 'Could not reset calendar.'
                                    : 'Nie uda?o si? zresetowa? kalendarza.')
                              );
                            }
                            setResetCode('');
                            setResetInput('');
                            await queryClient.invalidateQueries();
                            window.alert(
                              isEnglish
                                ? 'Calendar has been reset.'
                                : 'Kalendarz zosta? zresetowany.'
                            );
                          })
                          .catch((error) =>
                            window.alert(
                              error instanceof Error
                                ? error.message
                                : 'Nie uda?o si? zresetowa? kalendarza.'
                            )
                          )
                          .finally(() => setIsResetting(false));
                      }}
                    >
                      <Trash2 size={15} aria-hidden />
                      {isResetting
                        ? isEnglish
                          ? 'Resetting?'
                          : 'Resetowanie?'
                        : isEnglish
                          ? 'Reset all events'
                          : 'Resetuj wszystkie wydarzenia'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type='button'
                  className={styles.dangerActionButton}
                  onClick={() => {
                    setResetInput('');
                    setResetCode(
                      crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
                    );
                  }}
                >
                  <Trash2 size={15} aria-hidden />
                  {isEnglish ? 'Reset all events' : 'Resetuj wszystkie wydarzenia'}
                </button>
              )}
            </div>
          </div>
        </section>
      </main>
    </PageContainer>
  );
}
