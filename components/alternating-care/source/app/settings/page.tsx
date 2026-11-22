'use client';

import ExportButton from '@api/db/export/ExportButton';
import ImportButton from '@api/db/import/ImportButton';
import PageContainer from '@components/PageContainer/PageContainer';
import { useAppContext } from '@app/AppContext';
import { useCareHandoffMode } from '@utils/useCareHandoffMode';
import { useOtherParent } from '@utils/useOtherParent';
import { Clock3, Download, ShieldCheck, Upload, UserRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './settings.module.scss';
import { PlatformFriendsSettings } from './PlatformFriendsSettings';

const handoffModes = ['simplified', 'half-day', 'hourly'] as const;

type PlatformUser = {
  id: string;
  displayName: string;
  email?: string | null;
};

export default function UserForm() {
  const { language, user } = useAppContext();
  const { mode, setMode } = useCareHandoffMode();
  const { profile, setProfile } = useOtherParent();
  const isEnglish = language === 'en';
  const [parentName, setParentName] = useState(profile.name);
  const [selectedUserId, setSelectedUserId] = useState(profile.userId ?? '');
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [usersError, setUsersError] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUserListVisible, setIsUserListVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setIsUserListVisible(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const query = userSearch.trim();
    if (query.length < 2) {
      setPlatformUsers([]);
      setUsersError(false);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/alternating-care/entra-users?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = (await response.json()) as {
            users?: PlatformUser[];
            error?: string;
          };
          if (!response.ok) throw new Error(data.error);
          setPlatformUsers(data.users ?? []);
          setUsersError(false);
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          setUsersError(true);
          setPlatformUsers([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [userSearch]);

  const availableUsers = useMemo(
    () => platformUsers.filter((platformUser) => platformUser.id !== user.id),
    [platformUsers, user.id]
  );

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
    <PageContainer>
      <main className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>
            {isEnglish ? 'Care calendar' : 'Kalendarz opieki'}
          </span>
          <h1>{isEnglish ? 'Settings' : 'Ustawienia'}</h1>
          <p>
            {isEnglish
              ? 'Adjust how care periods are counted and keep a portable copy of your data.'
              : 'Dostosuj liczenie okresów opieki i zachowaj przenośną kopię swoich danych.'}
          </p>
        </header>

        <PlatformFriendsSettings />

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.icon}>
              <UserRound size={20} aria-hidden />
            </span>
            <div>
              <h2>
                {isEnglish ? 'Other parent' : 'Drugi rodzic'}
              </h2>
              <p>
                {isEnglish
                  ? 'Enter their details or connect a person from the platform.'
                  : 'Wpisz dane lub wybierz osobę z platformy.'}
              </p>
            </div>
          </div>

          <div className={styles.parentGrid}>
            <label className={styles.field}>
              <span>{isEnglish ? 'Name' : 'Imię lub nazwa'}</span>
              <input
                type='text'
                value={parentName}
                placeholder={isEnglish ? 'Other parent' : 'np. Anna Kowalska'}
                onChange={(event) => {
                  setParentName(event.target.value);
                  setSelectedUserId('');
                  setIsSaved(false);
                }}
              />
            </label>

            <div className={styles.searchField} ref={searchContainerRef}>
              <label className={styles.field}>
                <span>{isEnglish ? 'Microsoft Entra account' : 'Konto Microsoft Entra'}</span>
                <input
                  type='search'
                  value={userSearch}
                  autoComplete='off'
                  placeholder={isEnglish ? 'Search name or e-mail…' : 'Szukaj po imieniu lub e-mailu…'}
                  aria-controls='entra-user-results'
                  aria-expanded={isUserListVisible}
                  onFocus={() => setIsUserListVisible(true)}
                  onChange={(event) => {
                    setUserSearch(event.target.value);
                    setSelectedUserId('');
                    setIsSaved(false);
                    setIsUserListVisible(true);
                  }}
                />
              </label>

              {isUserListVisible && userSearch.trim().length >= 2 && (
                <div
                  id='entra-user-results'
                  className={styles.searchResults}
                  role='listbox'
                >
                  {isSearching && (
                    <span className={styles.searchMessage}>
                      {isEnglish ? 'Searching…' : 'Wyszukiwanie…'}
                    </span>
                  )}
                  {!isSearching && usersError && (
                    <span className={styles.searchMessage}>
                      {isEnglish
                        ? 'Entra search is unavailable. You can still enter a name manually.'
                        : 'Wyszukiwanie Entra jest niedostępne. Możesz wpisać imię ręcznie.'}
                    </span>
                  )}
                  {!isSearching &&
                    !usersError &&
                    availableUsers.length === 0 && (
                      <span className={styles.searchMessage}>
                        {isEnglish ? 'No matching accounts' : 'Brak pasujących kont'}
                      </span>
                    )}
                  {!isSearching &&
                    availableUsers.map((platformUser) => (
                      <button
                        key={platformUser.id}
                        type='button'
                        role='option'
                        aria-selected={platformUser.id === selectedUserId}
                        className={styles.searchResult}
                        onClick={() => {
                          setSelectedUserId(platformUser.id);
                          setParentName(platformUser.displayName);
                          setUserSearch(platformUser.displayName);
                          setIsUserListVisible(false);
                          setIsSaved(false);
                        }}
                      >
                        <strong>{platformUser.displayName}</strong>
                        {platformUser.email && <small>{platformUser.email}</small>}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.parentActions}>
            <span aria-live='polite'>
              {isSaved
                ? isEnglish
                  ? 'Saved'
                  : 'Zapisano'
                : selectedUserId
                  ? isEnglish
                    ? 'This person will be available for calendar sharing later.'
                    : 'Ta osoba będzie mogła zostać wykorzystana przy udostępnieniu kalendarza.'
                  : isEnglish
                    ? 'Saved only for this calendar.'
                    : 'Dane będą używane w tym kalendarzu.'}
            </span>
            <button
              type='button'
              className={styles.actionButton}
              disabled={!parentName.trim()}
              onClick={() => {
                setProfile({
                  name: parentName,
                  userId: selectedUserId || undefined,
                });
                setIsSaved(true);
              }}
            >
              {isEnglish ? 'Save parent' : 'Zapisz dane'}
            </button>
          </div>
        </section>

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
      </main>
    </PageContainer>
  );
}
