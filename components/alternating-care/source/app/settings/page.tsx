'use client';

import ExportButton from '@api/db/export/ExportButton';
import ImportButton from '@api/db/import/ImportButton';
import PageContainer from '@components/PageContainer/PageContainer';
import { useAppContext } from '@app/AppContext';
import { useCareHandoffMode } from '@utils/useCareHandoffMode';
import { CareAvatarRole, useCareAvatars } from '@utils/useCareAvatars';
import { CAREGIVER_ROLES } from '@utils/caregiverRoles';
import { useOtherParent } from '@utils/useOtherParent';
import {
  Camera,
  Clock3,
  Download,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './settings.module.scss';
import { PlatformFriendsSettings } from './PlatformFriendsSettings';

const handoffModes = ['simplified', 'half-day', 'hourly'] as const;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const resizeAvatar = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const size = 128;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas unavailable'));
        return;
      }
      canvas.width = size;
      canvas.height = size;
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = (image.naturalWidth - cropSize) / 2;
      const sourceY = (image.naturalHeight - cropSize) / 2;
      context.drawImage(
        image,
        sourceX,
        sourceY,
        cropSize,
        cropSize,
        0,
        0,
        size,
        size
      );
      resolve(canvas.toDataURL('image/webp', 0.84));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image'));
    };
    image.src = objectUrl;
  });

type PlatformUser = {
  id: string;
  displayName: string;
  email?: string | null;
};

type Caregiver = {
  id?: string;
  subjectId: string;
  name: string;
  role: string;
  linkedUserId?: string | null;
};

export default function UserForm() {
  const { language, user } = useAppContext();
  const { mode, setMode } = useCareHandoffMode();
  const { profile, setProfile } = useOtherParent();
  const isEnglish = language === 'en';
  const [parentName, setParentName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(profile.userId ?? '');
  const { avatars, setAvatar, getAvatar } = useCareAvatars(
    selectedUserId || profile.userId
  );
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [usersError, setUsersError] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUserListVisible, setIsUserListVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [isAddingCaregiver, setIsAddingCaregiver] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [newCaregiverName, setNewCaregiverName] = useState('');
  const [newCaregiverRole, setNewCaregiverRole] = useState('rodzina');
  const [caregiverError, setCaregiverError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsHydrated(true);
    setParentName(profile.name);
    setSelectedUserId(profile.userId ?? '');
    const loadCaregivers = async () => {
      const response = await fetch('/api/alternating-care/caregivers', {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Nie udało się pobrać opiekunów.');
      const data = (await response.json()) as { caregivers: Caregiver[] };
      setCaregivers(data.caregivers);
    };
    void loadCaregivers().catch((error) => {
      setCaregiverError(
        error instanceof Error ? error.message : 'Nie udało się pobrać opiekunów.'
      );
    });
  }, []);

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

  const handleAvatarUpload = async (
    role: CareAvatarRole,
    file: File | undefined,
    subjectId?: string
  ) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError(isEnglish ? 'Choose an image file.' : 'Wybierz plik obrazu.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError(
        isEnglish
          ? 'The image must be smaller than 5 MB.'
          : 'Obraz musi być mniejszy niż 5 MB.'
      );
      return;
    }

    let avatarData: string;
    try {
      avatarData = await resizeAvatar(file);
    } catch {
      setAvatarError(
        isEnglish
          ? 'Could not process this image.'
          : 'Nie udało się przetworzyć obrazu.'
      );
      return;
    }

    try {
      await setAvatar(role, avatarData, subjectId);
      setAvatarError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : null;
      setAvatarError(
        message ||
          (isEnglish
            ? 'Could not save this avatar.'
            : 'Nie udało się zapisać avatara.')
      );
    }
  };

  const saveCaregiver = async (caregiver: Caregiver) => {
    const response = await fetch('/api/alternating-care/caregivers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(caregiver),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(data?.error || 'Nie udało się zapisać opiekuna.');
    }
    const data = (await response.json()) as { caregiver: Caregiver };
    setCaregivers((current) => [
      ...current.filter(
        (item) =>
          item.id !== data.caregiver.id &&
          item.subjectId !== data.caregiver.subjectId
      ),
      data.caregiver,
    ]);
    return data.caregiver;
  };

  const removeCaregiver = async (caregiver: Caregiver) => {
    if (!caregiver.id) return;
    const response = await fetch(
      `/api/alternating-care/caregivers?id=${encodeURIComponent(caregiver.id)}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error('Nie udało się usunąć opiekuna.');
    setCaregivers((current) =>
      current.filter((item) => item.id !== caregiver.id)
    );
    await setAvatar('other', null, caregiver.subjectId.replace(/^caregiver:/, ''));
  };

  const displayedCaregivers = useMemo<Caregiver[]>(() => {
    const defaults: Caregiver[] = [
      {
        subjectId: `self:${user.id}`,
        name: user.name,
        role:
          caregivers.find((item) => item.subjectId === `self:${user.id}`)
            ?.role || 'rodzic',
        linkedUserId: user.id,
      },
    ];
    const otherName =
      profile.name || parentName || (isEnglish ? 'Other parent' : 'Drugi rodzic');
    if (otherName.trim()) {
      defaults.push({
        subjectId:
          (selectedUserId || profile.userId)
            ? `other:${selectedUserId || profile.userId}`
            : 'other:manual',
        name: otherName,
        role:
          caregivers.find(
            (item) =>
              item.subjectId ===
              `other:${selectedUserId || profile.userId || 'manual'}`
          )?.role || 'rodzic',
        linkedUserId: selectedUserId || profile.userId || null,
      });
    }
    return [
      ...defaults.map(
        (item) =>
          caregivers.find(
            (saved) => saved.subjectId === item.subjectId
          ) || item
      ),
      ...caregivers.filter(
        (item) => !defaults.some((entry) => entry.subjectId === item.subjectId)
      ),
    ];
  }, [
    caregivers,
    isEnglish,
    parentName,
    profile.name,
    profile.userId,
    selectedUserId,
    user.id,
    user.name,
  ]);

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
    <PageContainer scrollable>
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
              <Camera size={20} aria-hidden />
            </span>
            <div>
              <h2>{isEnglish ? 'Caregivers' : 'Opiekunowie'}</h2>
              <p>
                {isEnglish
                  ? 'Manage the people who provide care, their roles and avatars.'
                  : 'Zarządzaj osobami sprawującymi opiekę, ich rolami i avatarami.'}
              </p>
            </div>
          </div>

          <div className={styles.avatarGrid}>
            {(isHydrated ? displayedCaregivers : []).map((caregiver) => {
              const avatarRole: CareAvatarRole =
                caregiver.subjectId === `self:${user.id}` ? 'mine' : 'other';
              const avatarSubjectId =
                caregiver.subjectId.startsWith('other:')
                  ? caregiver.subjectId.slice('other:'.length)
                  : caregiver.subjectId.startsWith('caregiver:')
                    ? caregiver.subjectId.slice('caregiver:'.length)
                    : undefined;
              const avatar =
                avatarRole === 'mine'
                  ? avatars.mine
                  : getAvatar('other', avatarSubjectId);
              return (
              <div className={styles.avatarEditor} key={caregiver.subjectId}>
                <span className={styles.avatarPreview}>
                  {avatar ? (
                    <img src={avatar} alt='' />
                  ) : (
                    caregiver.name.trim().charAt(0).toUpperCase() || '?'
                  )}
                </span>
                <div>
                  <strong>{caregiver.name}</strong>
                  <small>
                    {caregiver.subjectId === `self:${user.id}`
                      ? isEnglish
                        ? 'Your account'
                        : 'Twoje konto'
                      : caregiver.linkedUserId
                        ? isEnglish
                          ? 'Platform account'
                          : 'Konto platformy'
                        : isEnglish
                          ? 'Manual caregiver'
                          : 'Opiekun dodany ręcznie'}
                  </small>
                </div>
                <select
                  className={styles.caregiverRoleSelect}
                  aria-label={isEnglish ? `Role for ${caregiver.name}` : `Rola: ${caregiver.name}`}
                  value={caregiver.role}
                  onChange={(event) => {
                    const next = { ...caregiver, role: event.target.value };
                    setCaregivers((current) =>
                      current.map((item) =>
                        item.subjectId === next.subjectId ? next : item
                      )
                    );
                    void saveCaregiver(next).catch((error) =>
                      setCaregiverError(
                        error instanceof Error
                          ? error.message
                          : 'Nie udało się zapisać roli.'
                      )
                    );
                  }}
                >
                  {CAREGIVER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                {(
                  <label className={styles.avatarUploadButton}>
                    <Camera size={15} aria-hidden />
                    {isEnglish ? 'Change photo' : 'Zmień zdjęcie'}
                    <input
                      type='file'
                      accept='image/*'
                      onChange={(event) => {
                        void handleAvatarUpload(
                          avatarRole,
                          event.target.files?.[0],
                          avatarSubjectId
                        );
                        event.target.value = '';
                      }}
                    />
                  </label>
                )}
                {(avatar || caregiver.subjectId.startsWith('caregiver:')) && (
                  <button
                    type='button'
                    className={styles.avatarRemoveButton}
                    aria-label={
                      caregiver.subjectId.startsWith('caregiver:')
                        ? isEnglish
                          ? 'Remove caregiver'
                          : 'Usuń opiekuna'
                        : isEnglish
                          ? 'Remove avatar'
                          : 'Usuń avatar'
                    }
                    title={
                      caregiver.subjectId.startsWith('caregiver:')
                        ? isEnglish
                          ? 'Remove caregiver'
                          : 'Usuń opiekuna'
                        : isEnglish
                          ? 'Remove avatar'
                          : 'Usuń avatar'
                    }
                    onClick={() => {
                      const operation = caregiver.subjectId.startsWith(
                        'caregiver:'
                      )
                        ? removeCaregiver(caregiver)
                        : setAvatar(avatarRole, null, avatarSubjectId);
                      void operation
                        .then(() => setAvatarError(null))
                        .catch(() =>
                          setAvatarError(
                            isEnglish
                              ? 'Could not remove this avatar.'
                              : 'Nie udało się usunąć avatara.'
                          )
                        );
                    }}
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                )}
              </div>
            );})}
          </div>
          {isAddingCaregiver ? (
            <div className={styles.addCaregiverForm}>
              <label className={styles.field}>
                <span>{isEnglish ? 'Name' : 'Imię i nazwisko'}</span>
                <input
                  value={newCaregiverName}
                  onChange={(event) => setNewCaregiverName(event.target.value)}
                  placeholder={isEnglish ? 'e.g. Anna Kowalska' : 'np. Anna Kowalska'}
                />
              </label>
              <label className={styles.field}>
                <span>{isEnglish ? 'Role' : 'Rola'}</span>
                <select
                  value={newCaregiverRole}
                  onChange={(event) => setNewCaregiverRole(event.target.value)}
                >
                  {CAREGIVER_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>
              <button
                type='button'
                className={styles.actionButton}
                disabled={!newCaregiverName.trim()}
                onClick={() => {
                  void saveCaregiver({
                    subjectId: `caregiver:${crypto.randomUUID()}`,
                    name: newCaregiverName,
                    role: newCaregiverRole,
                  })
                    .then(() => {
                      setNewCaregiverName('');
                      setNewCaregiverRole('rodzina');
                      setIsAddingCaregiver(false);
                      setCaregiverError(null);
                    })
                    .catch((error) =>
                      setCaregiverError(
                        error instanceof Error
                          ? error.message
                          : 'Nie udało się dodać opiekuna.'
                      )
                    );
                }}
              >
                {isEnglish ? 'Save caregiver' : 'Zapisz opiekuna'}
              </button>
              <button
                type='button'
                className={styles.secondaryActionButton}
                onClick={() => setIsAddingCaregiver(false)}
              >
                {isEnglish ? 'Cancel' : 'Anuluj'}
              </button>
            </div>
          ) : (
            <button
              type='button'
              className={styles.secondaryActionButton}
              onClick={() => setIsAddingCaregiver(true)}
            >
              {isEnglish ? 'Add caregiver' : 'Dodaj opiekuna'}
            </button>
          )}
          {caregiverError && (
            <p className={styles.avatarError} role='alert'>{caregiverError}</p>
          )}
          {avatarError && (
            <p className={styles.avatarError} role='alert'>
              {avatarError}
            </p>
          )}
        </section>

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
              <button
                type='button'
                className={styles.dangerActionButton}
                disabled={isResetting}
                onClick={() => {
                  const confirmed = window.confirm(
                    isEnglish
                      ? 'Delete all calendar events and care plans? This cannot be undone.'
                      : 'Usunąć wszystkie wydarzenia i plany opieki? Tej operacji nie można cofnąć.'
                  );
                  if (!confirmed) return;
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
                              : 'Nie udało się zresetować kalendarza.')
                        );
                      }
                      window.alert(
                        isEnglish
                          ? 'Calendar has been reset.'
                          : 'Kalendarz został zresetowany.'
                      );
                    })
                    .catch((error) =>
                      window.alert(
                        error instanceof Error
                          ? error.message
                          : 'Nie udało się zresetować kalendarza.'
                      )
                    )
                    .finally(() => setIsResetting(false));
                }}
              >
                {isResetting
                  ? isEnglish
                    ? 'Resetting…'
                    : 'Resetowanie…'
                  : isEnglish
                    ? 'Reset all events'
                    : 'Resetuj wszystkie wydarzenia'}
              </button>
            </div>
          </div>
        </section>
      </main>
    </PageContainer>
  );
}
