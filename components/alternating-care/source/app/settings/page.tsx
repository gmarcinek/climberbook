'use client';

import ExportButton from '@api/db/export/ExportButton';
import ImportButton from '@api/db/import/ImportButton';
import PageContainer from '@components/PageContainer/PageContainer';
import { useAppContext } from '@app/AppContext';
import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { Calendar } from '@components/Calendar/Calendar';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { useQueryClient } from '@tanstack/react-query';
import {
  CARE_COLORS_QUERY_KEY,
  CaregiverColors,
  caregiverBackground,
} from '@utils/caregiverColors';
import { colorBlueGreen700 } from '@utils/color';
import { useCareHandoffMode } from '@utils/useCareHandoffMode';
import { CareAvatarRole, useCareAvatars } from '@utils/useCareAvatars';
import { CAREGIVER_ROLES } from '@utils/caregiverRoles';
import { otherParentSubjectId, useOtherParent } from '@utils/useOtherParent';
import dayjs from 'dayjs';
import {
  Camera,
  Clock3,
  Download,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dashboardStyles from '@modules/DashboardPage/components/Dashboard/Dashboard.module.scss';
import styles from './settings.module.scss';

const handoffModes = ['simplified', 'half-day', 'hourly'] as const;
const PREVIEW_MONTH_MIN_WIDTH = 360;
const PREVIEW_MONTH_GAP = 16;
const PREVIEW_MONTH_MAX_COLUMNS = 5;
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
  color?: string | null;
};

const defaultCareColor = (subjectId: string) =>
  subjectId.startsWith('self:')
    ? colorBlueGreen700
    : caregiverBackground(subjectId);

export default function UserForm() {
  const { language, user } = useAppContext();
  const { mode, setMode } = useCareHandoffMode();
  const { profile, setProfile } = useOtherParent();
  const isEnglish = language === 'en';
  const otherParentSubject = otherParentSubjectId(profile);
  const hasOtherParent = Boolean(profile.subjectId || profile.name);
  // Platform account picked in the "add caregiver" form.
  const [selectedUserId, setSelectedUserId] = useState('');
  const { avatars, setAvatar, getAvatar } = useCareAvatars(profile.userId);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [usersError, setUsersError] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUserListVisible, setIsUserListVisible] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [isAddingCaregiver, setIsAddingCaregiver] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [resetInput, setResetInput] = useState('');
  const [newCaregiverName, setNewCaregiverName] = useState('');
  const [newCaregiverRole, setNewCaregiverRole] = useState('rodzina');
  const [caregiverError, setCaregiverError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [colorDrafts, setColorDrafts] = useState<Record<string, string | null>>(
    {}
  );
  const colorSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const queryClient = useQueryClient();
  const previewMonth = dayjs().startOf('month');
  const [previewGrid, setPreviewGrid] = useState<HTMLDivElement | null>(null);
  const [previewColumns, setPreviewColumns] = useState(1);

  // Same month sizing as the dashboard grid: 360–500px per month, up to 5.
  useEffect(() => {
    if (!previewGrid) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setPreviewColumns(
        Math.min(
          PREVIEW_MONTH_MAX_COLUMNS,
          Math.max(
            1,
            Math.floor(
              (width + PREVIEW_MONTH_GAP) /
                (PREVIEW_MONTH_MIN_WIDTH + PREVIEW_MONTH_GAP)
            )
          )
        )
      );
    });
    observer.observe(previewGrid);
    return () => observer.disconnect();
  }, [previewGrid]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsHydrated(true);
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
    if (caregiver.subjectId === profile.subjectId) setProfile({ name: '' });
    await setAvatar('other', null, caregiver.subjectId.replace(/^caregiver:/, ''));
  };

  const displayedCaregivers = useMemo<Caregiver[]>(() => {
    const defaults: Caregiver[] = [
      {
        subjectId: `self:${user.id}`,
        name: user.name.trim() || (isEnglish ? 'Me' : 'Ja'),
        role:
          caregivers.find((item) => item.subjectId === `self:${user.id}`)
            ?.role || 'rodzic',
        linkedUserId: user.id,
      },
    ];
    // Legacy other parent (not one of the saved caregivers).
    if (!profile.subjectId && profile.name.trim()) {
      defaults.push({
        subjectId: otherParentSubject,
        name: profile.name,
        role:
          caregivers.find((item) => item.subjectId === otherParentSubject)
            ?.role || 'rodzic',
        linkedUserId: profile.userId || null,
      });
    }
    return [
      ...defaults.map((item) => {
        const saved = caregivers.find(
          (entry) => entry.subjectId === item.subjectId
        );
        if (!saved) return item;
        return item.subjectId === `self:${user.id}`
          ? { ...saved, name: item.name }
          : saved;
      }),
      ...caregivers.filter(
        (item) => !defaults.some((entry) => entry.subjectId === item.subjectId)
      ),
    ];
  }, [
    caregivers,
    isEnglish,
    otherParentSubject,
    profile.name,
    profile.subjectId,
    profile.userId,
    user.id,
    user.name,
  ]);

  const markOtherParent = (caregiver: Caregiver) =>
    setProfile({
      name: caregiver.name,
      userId: caregiver.linkedUserId || undefined,
      subjectId: caregiver.subjectId.startsWith('other:')
        ? undefined
        : caregiver.subjectId,
    });

  const careColorOf = (caregiver: Caregiver) =>
    caregiver.subjectId in colorDrafts
      ? colorDrafts[caregiver.subjectId]
      : caregiver.color ?? null;

  const previewColors = useMemo<CaregiverColors>(
    () =>
      Object.fromEntries(
        displayedCaregivers.flatMap((caregiver) => {
          const color =
            caregiver.subjectId in colorDrafts
              ? colorDrafts[caregiver.subjectId]
              : caregiver.color;
          return color ? [[caregiver.subjectId, color]] : [];
        })
      ),
    [colorDrafts, displayedCaregivers]
  );

  // Sample months: in every month consecutive blocks of days, one per caregiver.
  const previewMonths = useMemo(
    () =>
      Array.from({ length: previewColumns }, (_, index) =>
        previewMonth.add(index, 'month')
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [previewColumns, previewMonth.format(dateFormat)]
  );
  const previewEvents = useMemo<CalendarEvent[]>(() => {
    if (!displayedCaregivers.length) return [];
    return previewMonths.flatMap((month) => {
      const daysInMonth = month.daysInMonth();
      const blockSize = Math.ceil(daysInMonth / displayedCaregivers.length);
      return Array.from({ length: daysInMonth }, (_, index) => {
        const caregiver =
          displayedCaregivers[Math.floor(index / blockSize)] ??
          displayedCaregivers[displayedCaregivers.length - 1];
        const date = month.add(index, 'day').format(dateFormat);
        return {
          id: `sample-${date}`,
          groupId: `CARE:${caregiver.subjectId}`,
          date,
          type: CalendarEventType.Alternating,
          issuer: caregiver.subjectId,
          creationTime: 0,
          name: caregiver.subjectId,
          description: '',
        };
      });
    });
  }, [displayedCaregivers, previewMonths]);

  // `null` resets the caregiver to the default colour.
  const changeCareColor = (caregiver: Caregiver, color: string | null) => {
    setColorDrafts((current) => ({ ...current, [caregiver.subjectId]: color }));
    clearTimeout(colorSaveTimers.current[caregiver.subjectId]);
    colorSaveTimers.current[caregiver.subjectId] = setTimeout(() => {
      void saveCaregiver({ ...caregiver, color })
        .then(() => {
          setColorDrafts((current) => {
            const next = { ...current };
            delete next[caregiver.subjectId];
            return next;
          });
          return queryClient.invalidateQueries({
            queryKey: CARE_COLORS_QUERY_KEY,
          });
        })
        .catch((error) =>
          setCaregiverError(
            error instanceof Error ? error.message : 'Nie udało się zapisać koloru.'
          )
        );
    }, 400);
  };

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
              : 'Dostosuj liczenie okresów opieki i zachowaj przenośną kopię swoich danych.'}
          </p>
        </header>

        <section className={`${styles.card} ${styles.fullRow}`}>
          <div className={styles.cardHeader}>
            <span className={styles.icon}>
              <Camera size={20} aria-hidden />
            </span>
            <div>
              <h2>{isEnglish ? 'Caregivers' : 'Opiekunowie'}</h2>
              <p>
                {isEnglish
                  ? 'Manage the people who provide care, their roles and avatars. Mark one of them as the other parent — the main additional user (platform account or virtual user).'
                  : 'Zarządzaj osobami sprawującymi opiekę, ich rolami i avatarami. Jedną z nich oznacz jako drugiego rodzica — głównego dodatkowego użytkownika (konto z platformy lub użytkownik wirtualny).'}
              </p>
            </div>
          </div>

          <div className={styles.caregiversLayout}>
          <div className={styles.caregiversColumn}>
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
                          : 'Konto z platformy'
                        : isEnglish
                          ? 'Virtual user'
                          : 'Użytkownik wirtualny'}
                  </small>
                  {caregiver.subjectId !== `self:${user.id}` && (
                    <button
                      type='button'
                      className={styles.otherParentToggle}
                      data-active={
                        hasOtherParent &&
                        caregiver.subjectId === otherParentSubject
                      }
                      onClick={() => markOtherParent(caregiver)}
                    >
                      {hasOtherParent &&
                      caregiver.subjectId === otherParentSubject
                        ? isEnglish
                          ? '★ Other parent'
                          : '★ Drugi rodzic'
                        : isEnglish
                          ? 'Set as other parent'
                          : 'Ustaw jako drugiego rodzica'}
                    </button>
                  )}
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
                <div className={styles.careColorRow}>
                  <span>
                    {isEnglish
                      ? 'Care day colour in the calendar'
                      : 'Kolor dni opieki w kalendarzu'}
                  </span>
                  <input
                    type='color'
                    aria-label={
                      isEnglish
                        ? `Day colour for ${caregiver.name}`
                        : `Kolor dni: ${caregiver.name}`
                    }
                    value={
                      careColorOf(caregiver) ?? defaultCareColor(caregiver.subjectId)
                    }
                    onChange={(event) =>
                      changeCareColor(caregiver, event.target.value)
                    }
                  />
                  <button
                    type='button'
                    disabled={!careColorOf(caregiver)}
                    onClick={() => changeCareColor(caregiver, null)}
                    title={isEnglish ? 'Reset to default' : 'Przywróć domyślny'}
                  >
                    <RotateCcw size={13} aria-hidden />
                    {isEnglish ? 'Default' : 'Domyślny'}
                  </button>
                </div>
              </div>
            );})}
          </div>
          {isAddingCaregiver ? (
            <div className={styles.addCaregiverForm}>
              <label className={styles.field}>
                <span>{isEnglish ? 'Name' : 'Imię i nazwisko'}</span>
                <input
                  value={newCaregiverName}
                  onChange={(event) => {
                    setNewCaregiverName(event.target.value);
                    setSelectedUserId('');
                  }}
                  placeholder={isEnglish ? 'e.g. Anna Kowalska' : 'np. Anna Kowalska'}
                />
              </label>
              <div className={styles.searchField} ref={searchContainerRef}>
                <label className={styles.field}>
                  <span>
                    {isEnglish
                      ? 'Platform account (optional)'
                      : 'Konto z platformy (opcjonalnie)'}
                  </span>
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
                          ? 'Platform search is unavailable. You can still add a virtual user by name.'
                          : 'Wyszukiwanie jest niedostępne. Możesz dodać użytkownika wirtualnego po imieniu.'}
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
                            setNewCaregiverName(platformUser.displayName);
                            setUserSearch(platformUser.displayName);
                            setIsUserListVisible(false);
                          }}
                        >
                          <strong>{platformUser.displayName}</strong>
                          {platformUser.email && <small>{platformUser.email}</small>}
                        </button>
                      ))}
                  </div>
                )}
              </div>
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
                    linkedUserId: selectedUserId || null,
                  })
                    .then(() => {
                      setNewCaregiverName('');
                      setNewCaregiverRole('rodzina');
                      setSelectedUserId('');
                      setUserSearch('');
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
          </div>
          <div className={styles.careColorPreview}>
            <span>
              {isEnglish ? 'Preview' : 'Podgląd'} ·{' '}
              {previewMonths[0].locale(isEnglish ? 'en' : 'pl').format('MMMM YYYY')}
              {previewMonths.length > 1 &&
                ` – ${previewMonths[previewMonths.length - 1]
                  .locale(isEnglish ? 'en' : 'pl')
                  .format('MMMM YYYY')}`}
            </span>
            <div
              ref={setPreviewGrid}
              className={styles.careColorPreviewGrid}
              style={{ '--preview-columns': previewColumns } as CSSProperties}
            >
              {isHydrated &&
                previewMonths.map((month) => (
                  <Calendar
                    key={month.format(dateFormat)}
                    startDate={month.format(dateFormat)}
                    endDate={month.endOf('month').add(1, 'day').format(dateFormat)}
                    rowSize={7}
                    isTodayVisible
                    isWeekendsVisible
                    isPlanVisible={false}
                    isAlternatingVisible
                    isOtherCareVisible
                    isEventsVisible
                    displayStrategy='separateMonths'
                    events={previewEvents}
                    caregiverColors={previewColors}
                  />
                ))}
            </div>
          </div>
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
