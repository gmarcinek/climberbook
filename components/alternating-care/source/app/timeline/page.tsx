'use client';

import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { listCareEvents } from '@api/db/events/careEventsApi';
import { useAppContext } from '@app/AppContext';
import PageContainer from '@components/PageContainer/PageContainer';
import { PhotoUploadDialog } from '@components/CarePhotos/PhotoUploadDialog';
import { toEventOptions } from '@components/CarePhotos/PhotoUploadDialog';
import type { PhotoEventOption } from '@components/CarePhotos/PhotoUploadDialog';
import { PhotoEditDialog, PhotoWaitingRoom } from '@components/CarePhotos/PhotoWaitingRoom';
import { PhotoLightbox } from '@components/CarePhotos/PhotoLightbox';
import { photoCategoryLabel } from '@components/CarePhotos/photoCategories';
import { getEventTypeColor } from '@modules/DashboardPage/components/DashboardEventForm/eventTypeColors';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { caregiverBackground } from '@utils/caregiverColors';
import {
  CARE_PHOTOS_QUERY_KEY,
  CarePhoto,
  carePhotoUrl,
  listCarePhotos,
} from '@utils/carePhotos';
import { colorBlueGreen700, getTextColor } from '@utils/color';
import { getEventTypeIcon } from '@utils/eventTypeIcons';
import { useCaregiverColors, useCaregivers } from '@utils/useCaregiverColors';
import { useCareAvatars } from '@utils/useCareAvatars';
import { useOtherParent } from '@utils/useOtherParent';
import dayjs from 'dayjs';
import {
  CalendarPlus,
  Camera,
  CheckCircle2,
  History,
  ImagePlus,
  Images,
  Inbox,
  Plus,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { TimelineEventDialog } from './TimelineEventDialog';
import styles from './timeline.module.scss';

const DATE_FORMAT = 'YYYY-MM-DD';
// History is fetched backwards in windows of this many months and shown PAGE_SIZE blocks at a time.
const WINDOW_MONTHS = 6;
const PAGE_SIZE = 50;
const windowStart = (end: string) =>
  dayjs(end).subtract(WINDOW_MONTHS, 'month').add(1, 'day').format(DATE_FORMAT);
const TASK_COLOR = '#5f7f8c';
const PHOTO_COLOR = '#d98a1c';
const HIDDEN_TYPES = [
  CalendarEventType.Alternating,
  CalendarEventType.Offset,
  CalendarEventType.Todo,
];

type BlockKind = 'care' | 'event' | 'task' | 'photo';

type TimelineBlock = {
  key: string;
  kind: BlockKind;
  /** Caregiver of a care block. */
  subjectId?: string;
  start: string;
  end: string;
  label: string;
  color: string;
  description?: string;
  event?: CalendarEvent;
  photos: CarePhoto[];
  searchText: string;
};

// Merges dates into runs of consecutive days.
const toRuns = (dates: string[]) => {
  const runs: { start: string; end: string }[] = [];
  [...new Set(dates)].sort().forEach((date) => {
    const last = runs.at(-1);
    if (last && dayjs(last.end).add(1, 'day').format(DATE_FORMAT) === date) {
      last.end = date;
    } else {
      runs.push({ start: date, end: date });
    }
  });
  return runs;
};

// Lowercase without Polish diacritics, so "zolw" finds "żółw".
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l');

const formatAmount = (amount: number, language: string) =>
  new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'pl-PL', {
    style: 'currency',
    currency: 'PLN',
  }).format(amount);

// Extra words each event type can be found by, besides its label.
const TYPE_SEARCH_WORDS: Partial<Record<CalendarEventType, string>> = {
  [CalendarEventType.Event]: 'wydarzenie event',
  [CalendarEventType.Trip]: 'wyjazd wycieczka podróż urlop trip travel',
  [CalendarEventType.Birthday]: 'urodziny imieniny birthday',
  [CalendarEventType.Medical]: 'lekarz wizyta zdrowie szpital medical doctor',
  [CalendarEventType.School]: 'szkoła lekcje zebranie school',
  [CalendarEventType.Camp]: 'obóz kolonie zimowisko półkolonie camp',
  [CalendarEventType.Culinary]: 'jedzenie restauracja obiad kolacja food',
  [CalendarEventType.Coffee]: 'kawa kawiarnia coffee',
  [CalendarEventType.Cinema]: 'kino film teatr cinema movie',
  [CalendarEventType.Sport]: 'sport trening zajęcia mecz',
  [CalendarEventType.Shopping]: 'zakupy sklep shopping',
  [CalendarEventType.Holiday]: 'święto święta holiday',
  [CalendarEventType.Vacation]: 'wakacje urlop ferie vacation',
  [CalendarEventType.Errands]: 'sprawy urząd załatwić errands',
  [CalendarEventType.Tutoring]: 'korepetycje nauka tutoring',
  [CalendarEventType.Work]: 'praca delegacja work',
  [CalendarEventType.Phone]: 'telefon rozmowa phone call',
  [CalendarEventType.Expense]: 'wydatek koszt płatność zapłata expense payment',
};

export default function TimelinePage() {
  const { language, user } = useAppContext();
  const isEnglish = language === 'en';
  const queryClient = useQueryClient();
  const { profile: otherParent } = useOtherParent();
  const savedCaregivers = useCaregivers();
  const caregiverColors = useCaregiverColors();
  const { getAvatar } = useCareAvatars(otherParent.userId);
  const [search, setSearch] = useState('');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [eventDialog, setEventDialog] = useState<{
    groupEvents: CalendarEvent[];
    initialType?: CalendarEventType;
  } | null>(null);
  const [photoUpload, setPhotoUpload] = useState<{ groupId?: string } | null>(null);
  const [editedPhoto, setEditedPhoto] = useState<CarePhoto | null>(null);
  const [gallery, setGallery] = useState<{ photos: CarePhoto[]; index: number } | null>(null);
  const [tab, setTab] = useState<'timeline' | 'waiting'>('timeline');
  const addMenuRef = useRef<HTMLDivElement>(null);
  const today = dayjs().format(DATE_FORMAT);

  useEffect(() => {
    const url = new URL(window.location.href);
    const add = url.searchParams.get('add');
    if (!add) return;
    if (add === 'event') setEventDialog({ groupEvents: [], initialType: CalendarEventType.Event });
    if (add === 'expense') setEventDialog({ groupEvents: [], initialType: CalendarEventType.Expense });
    if (add === 'photos') setPhotoUpload({});
    url.searchParams.delete('add');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, []);

  useEffect(() => {
    if (!isAddMenuOpen) return;
    const close = (event: PointerEvent) => {
      if (!addMenuRef.current?.contains(event.target as Node)) setIsAddMenuOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [isAddMenuOpen]);

  // Oldest date with any data, so paging knows when the history ends.
  const startQuery = useQuery({
    queryKey: [...CARE_PHOTOS_QUERY_KEY, 'timelineStart'],
    queryFn: async () => {
      const response = await fetch('/api/care/timeline-start', { cache: 'no-store' });
      const payload = (await response.json()) as { earliest?: string | null; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Timeline start failed');
      return payload.earliest ?? null;
    },
  });
  const earliest = startQuery.data ?? null;
  const nextWindowEnd = (windowEnd: string) => {
    const start = windowStart(windowEnd);
    return earliest && start > earliest
      ? dayjs(start).subtract(1, 'day').format(DATE_FORMAT)
      : undefined;
  };
  const eventsQuery = useInfiniteQuery({
    queryKey: ['careTimeline', today, earliest],
    initialPageParam: today,
    queryFn: ({ pageParam }) =>
      listCareEvents({ start: windowStart(pageParam), end: pageParam }) as Promise<
        CalendarEvent[]
      >,
    getNextPageParam: (_last, _pages, windowEnd) => nextWindowEnd(windowEnd),
    enabled: startQuery.isSuccess,
  });
  const todosQuery = useQuery({
    queryKey: ['careTodos'],
    queryFn: () => listCareEvents({ type: CalendarEventType.Todo }),
  });
  const photosQuery = useInfiniteQuery({
    queryKey: [...CARE_PHOTOS_QUERY_KEY, 'confirmed', today, earliest],
    initialPageParam: today,
    queryFn: ({ pageParam }) =>
      listCarePhotos({ status: 'confirmed', start: windowStart(pageParam), end: pageParam }),
    getNextPageParam: (_last, _pages, windowEnd) => nextWindowEnd(windowEnd),
    enabled: startQuery.isSuccess,
  });

  // Both sources advance window by window; only fully loaded windows are used.
  const loadedWindows = Math.min(
    eventsQuery.data?.pages.length ?? 0,
    photosQuery.data?.pages.length ?? 0,
  );
  const loadedFrom =
    loadedWindows > 0
      ? windowStart(eventsQuery.data!.pageParams[loadedWindows - 1] as string)
      : today;
  const hasOlder = loadedWindows === 0 ? startQuery.isLoading : Boolean(eventsQuery.hasNextPage);
  const isLoadingOlder = eventsQuery.isFetchingNextPage || photosQuery.isFetchingNextPage;
  const loadedEvents = useMemo(() => {
    const seen = new Set<string>();
    return (eventsQuery.data?.pages.slice(0, loadedWindows).flat() ?? []).filter((event) => {
      // Ranges crossing a window edge come back in both windows.
      const key = `${event.id}|${event.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [eventsQuery.data, loadedWindows]);
  const loadedPhotos = useMemo(
    () => photosQuery.data?.pages.slice(0, loadedWindows).flat() ?? [],
    [photosQuery.data, loadedWindows],
  );
  const loadOlder = () => {
    if (!hasOlder || isLoadingOlder) return;
    void eventsQuery.fetchNextPage();
    void photosQuery.fetchNextPage();
  };

  const pendingQuery = useQuery({
    queryKey: [...CARE_PHOTOS_QUERY_KEY, 'pending'],
    queryFn: () => listCarePhotos({ status: 'pending' }),
  });
  const pendingCount = pendingQuery.data?.length ?? 0;

  const refreshEvents = () => {
    void queryClient.invalidateQueries({ queryKey: ['careTimeline'] });
    void queryClient.invalidateQueries({ queryKey: ['careTodos'] });
    void queryClient.invalidateQueries({ queryKey: [...CARE_PHOTOS_QUERY_KEY, 'timelineStart'] });
  };

  // Events (with their whole group) that photos can be attached to.
  const eventOptions = useMemo<PhotoEventOption[]>(
    () => toEventOptions(loadedEvents),
    [loadedEvents],
  );

  const blocks = useMemo(() => {
    const events = loadedEvents.filter((event) => event.date <= today);
    const photos = loadedPhotos;
    const selfSubject = `self:${user.id}`;
    const subjectOf = (event: CalendarEvent) =>
      event.groupId === CalendarEventType.Alternating ||
      event.groupId.startsWith('CARE:self:')
        ? selfSubject
        : event.groupId.replace(/^CARE:/, '');
    const nameOf = (subjectId: string) =>
      subjectId === selfSubject
        ? user.name || (isEnglish ? 'Me' : 'Ja')
        : savedCaregivers.find((item) => item.subjectId === subjectId)?.name ||
          (subjectId.startsWith('other:') && otherParent.name) ||
          (isEnglish ? 'Caregiver' : 'Opiekun');
    const colorOf = (subjectId: string) =>
      subjectId === selfSubject
        ? caregiverColors[selfSubject] ?? colorBlueGreen700
        : caregiverBackground(subjectId, caregiverColors);

    // The first care entry of a day decides who has the care (as in the calendar).
    const ownerByDate = new Map<string, string>();
    [...events]
      .filter((event) => event.type === CalendarEventType.Alternating)
      .sort((left, right) => left.creationTime - right.creationTime)
      .forEach((event) => {
        if (!ownerByDate.has(event.date)) ownerByDate.set(event.date, subjectOf(event));
      });
    const careBlocks: TimelineBlock[] = [];
    [...ownerByDate.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([date, subjectId]) => {
        const last = careBlocks.at(-1);
        if (
          last &&
          last.key.startsWith(`${subjectId}|`) &&
          dayjs(last.end).add(1, 'day').format(DATE_FORMAT) === date
        ) {
          last.end = date;
          return;
        }
        const label = nameOf(subjectId);
        careBlocks.push({
          key: `${subjectId}|${date}`,
          kind: 'care',
          subjectId,
          start: date,
          end: date,
          label,
          color: colorOf(subjectId),
          photos: [],
          searchText: normalize(
            [
              label,
              savedCaregivers.find((item) => item.subjectId === subjectId)?.role,
              isEnglish ? 'care caregiver' : 'opieka opiekun',
            ].join(' '),
          ),
        });
      });

    const photosByGroup = new Map<string, CarePhoto[]>();
    photos.forEach((photo) => {
      if (!photo.groupId) return;
      photosByGroup.set(photo.groupId, [...(photosByGroup.get(photo.groupId) ?? []), photo]);
    });

    const eventsByGroup = new Map<string, CalendarEvent[]>();
    events
      .filter((event) => !HIDDEN_TYPES.includes(event.type))
      .forEach((event) => {
        eventsByGroup.set(event.groupId, [...(eventsByGroup.get(event.groupId) ?? []), event]);
      });
    const attachedGroups = new Set<string>();
    const eventBlocks: TimelineBlock[] = [];
    eventsByGroup.forEach((groupEvents, groupId) => {
      toRuns(groupEvents.map((event) => event.date)).forEach((run, runIndex) => {
        const event = groupEvents.find((item) => item.date === run.start) ?? groupEvents[0];
        // Photos of the event are shown once, on its first run.
        const groupPhotos = runIndex === 0 ? photosByGroup.get(groupId) ?? [] : [];
        if (groupPhotos.length) attachedGroups.add(groupId);
        eventBlocks.push({
          key: `${groupId}|${run.start}`,
          kind: 'event',
          start: run.start,
          end: run.end,
          label: event.name || event.type,
          color: event.style?.background ?? getEventTypeColor(event.type),
          description: event.description,
          event,
          photos: groupPhotos,
          searchText: normalize(
            [
              event.name,
              event.description,
              photoCategoryLabel(event.type, language),
              TYPE_SEARCH_WORDS[event.type],
              event.style?.amount,
              ...groupPhotos.map(
                (photo) =>
                  `${photo.description} ${photoCategoryLabel(photo.category, language)} ${photo.place} ${photo.country}`,
              ),
            ].join(' '),
          ),
        });
      });
    });

    // Closed tasks sit on the day they were closed.
    const taskByGroup = new Map<string, CalendarEvent>();
    [...(todosQuery.data ?? [])]
      .sort((left, right) => right.creationTime - left.creationTime)
      .forEach((todo) => {
        if (!taskByGroup.has(todo.groupId)) taskByGroup.set(todo.groupId, todo);
      });
    const taskBlocks: TimelineBlock[] = [...taskByGroup.values()]
      .filter((todo) => todo.completed)
      .map((todo) => {
        const closedOn = dayjs(todo.lastEditTime ?? todo.creationTime).format(DATE_FORMAT);
        return {
          key: `task|${todo.groupId}`,
          kind: 'task' as const,
          start: closedOn,
          end: closedOn,
          label: todo.name || (isEnglish ? 'Task' : 'Zadanie'),
          color: TASK_COLOR,
          description: todo.description,
          event: todo,
          photos: [],
          searchText: normalize(`${todo.name} ${todo.description} ${isEnglish ? 'task' : 'zadanie'}`),
        };
      })
      .filter((block) => block.end <= today);

    // Photos without an event (or whose event is outside the range) are grouped per day.
    const loosePhotosByDate = new Map<string, CarePhoto[]>();
    photos
      .filter((photo) => !photo.groupId || !attachedGroups.has(photo.groupId))
      .forEach((photo) => {
        loosePhotosByDate.set(photo.takenDate, [
          ...(loosePhotosByDate.get(photo.takenDate) ?? []),
          photo,
        ]);
      });
    const photoBlocks: TimelineBlock[] = [...loosePhotosByDate.entries()].map(
      ([date, dayPhotos]) => {
        const descriptions = dayPhotos.map((photo) => photo.description).filter(Boolean);
        return {
          key: `photos|${date}`,
          kind: 'photo' as const,
          start: date,
          end: date,
          label:
            descriptions[0] ??
            (isEnglish
              ? `${dayPhotos.length} ${dayPhotos.length === 1 ? 'photo' : 'photos'}`
              : `${dayPhotos.length} ${dayPhotos.length === 1 ? 'zdjęcie' : 'zdjęcia'}`),
          color: PHOTO_COLOR,
          description: descriptions.slice(1).join(' · '),
          photos: dayPhotos,
          searchText: normalize(
            `${descriptions.join(' ')} ${dayPhotos
              .map((photo) => `${photoCategoryLabel(photo.category, language)} ${photo.place} ${photo.country}`)
              .join(' ')} ${isEnglish ? 'photo' : 'zdjęcie'}`,
          ),
        };
      },
    );

    // Newest first, all blocks in one stream; care before events on the same day.
    const order: Record<BlockKind, number> = { care: 0, event: 1, task: 2, photo: 3 };
    return [...careBlocks, ...eventBlocks, ...taskBlocks, ...photoBlocks].sort(
      (left, right) =>
        right.end.localeCompare(left.end) ||
        right.start.localeCompare(left.start) ||
        order[left.kind] - order[right.kind],
    );
  }, [
    caregiverColors,
    loadedEvents,
    isEnglish,
    language,
    otherParent.name,
    loadedPhotos,
    savedCaregivers,
    todosQuery.data,
    today,
    user.id,
    user.name,
  ]);

  const query = normalize(search.trim());
  // A block touching the oldest loaded day may continue further back; wait for that window.
  const completeBlocks = hasOlder ? blocks.filter((block) => block.start > loadedFrom) : blocks;
  const matchingBlocks = query
    ? completeBlocks.filter((block) => block.searchText.includes(query))
    : completeBlocks;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleBlocks = matchingBlocks.slice(0, visibleCount);
  const canShowMore = matchingBlocks.length > visibleCount || hasOlder;
  const moreSentinelRef = useRef<HTMLLIElement>(null);

  useEffect(() => setVisibleCount(PAGE_SIZE), [query]);

  // Fetch older windows until the current page is full (searching needs the whole history).
  useEffect(() => {
    if (loadedWindows === 0) return;
    if (query || matchingBlocks.length < visibleCount) loadOlder();
  });

  useEffect(() => {
    const sentinel = moreSentinelRef.current;
    if (!sentinel || !canShowMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) =>
            matchingBlocks.length >= count ? count + PAGE_SIZE : count,
          );
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canShowMore, matchingBlocks.length, tab]);

  const galleryPhotos = visibleBlocks.flatMap((block) => block.photos);

  const blockStyle = (block: TimelineBlock) =>
    ({
      '--block-color': block.color,
      '--block-text': getTextColor(block.color),
    }) as CSSProperties;
  const daysOf = (block: TimelineBlock) =>
    dayjs(block.end).diff(dayjs(block.start), 'day') + 1;
  const daysLabel = (days: number) =>
    isEnglish ? (days === 1 ? 'day' : 'days') : days === 1 ? 'dzień' : 'dni';
  const renderDays = (block: TimelineBlock) => (
    <span className={styles.blockDays}>
      <strong>{daysOf(block)}</strong>
      <small>{daysLabel(daysOf(block))}</small>
    </span>
  );
  const formatDates = (block: TimelineBlock) => {
    const start = dayjs(block.start).locale(language).format('D MMM YYYY');
    const end = dayjs(block.end).locale(language).format('D MMM YYYY');
    return block.start === block.end ? start : `${start} – ${end}`;
  };
  const formatRange = (block: TimelineBlock) =>
    daysOf(block) === 1
      ? formatDates(block)
      : `${formatDates(block)} · ${daysOf(block)} ${daysLabel(daysOf(block))}`;

  const openEvent = async (event: CalendarEvent) => {
    if (event.type === CalendarEventType.Todo) {
      setEventDialog({
        groupEvents: (todosQuery.data ?? []).filter((item) => item.groupId === event.groupId),
      });
      return;
    }
    // Loaded windows may hold only part of a long event, so fetch the whole group.
    try {
      setEventDialog({ groupEvents: await listCareEvents({ groupId: event.groupId }) });
    } catch {
      setEventDialog({
        groupEvents: loadedEvents.filter((item) => item.groupId === event.groupId),
      });
    }
  };

  const renderThumbnails = (block: TimelineBlock) =>
    block.photos.length > 0 && (
      <span className={styles.thumbnails}>
        {block.photos.slice(0, 6).map((photo) => (
          <button
            key={photo.id}
            type='button'
            className={styles.thumbnail}
            title={photo.description}
            onClick={(event) => {
              event.stopPropagation();
              setGallery({
                photos: galleryPhotos,
                index: Math.max(0, galleryPhotos.findIndex((item) => item.id === photo.id)),
              });
            }}
          >
            <img src={carePhotoUrl(photo.id)} alt={photo.description} loading='lazy' />
          </button>
        ))}
        {block.photos.length > 6 && (
          <span className={styles.moreThumbnails}>+{block.photos.length - 6}</span>
        )}
      </span>
    );

  const avatarOf = (subjectId?: string) => {
    if (!subjectId) return null;
    if (subjectId === `self:${user.id}`) return getAvatar('mine');
    return getAvatar('other', subjectId.split(':').slice(1).join(':'));
  };
  const initialsOf = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

  const renderBlock = (block: TimelineBlock) => {
    if (block.kind === 'care') {
      return (
        <div className={styles.careBlock} title={`${block.label} · ${formatRange(block)}`}>
          <span className={styles.blockText}>
            <strong>{block.label}</strong>
            <small>{formatDates(block)}</small>
          </span>
          <span className={styles.careAvatar} aria-hidden>
            {avatarOf(block.subjectId) ? (
              <img src={avatarOf(block.subjectId)!} alt='' />
            ) : (
              initialsOf(block.label)
            )}
          </span>
          {renderDays(block)}
        </div>
      );
    }

    if (block.kind === 'photo') {
      return (
        <div className={styles.eventBlock} title={block.label}>
          <span className={styles.eventIcon} aria-hidden>
            <Images size={14} />
          </span>
          <span className={styles.blockText}>
            <strong>{block.label}</strong>
            <small>{block.description || formatDates(block)}</small>
            {renderThumbnails(block)}
          </span>
        </div>
      );
    }

    const event = block.event!;
    const Icon = block.kind === 'task' ? CheckCircle2 : getEventTypeIcon(event.type);
    const amount = event.type === CalendarEventType.Expense ? event.style?.amount : undefined;
    return (
      <div
        className={styles.eventBlock}
        data-kind={block.kind}
        title={`${block.label} · ${formatRange(block)}`}
        role='button'
        tabIndex={0}
        onClick={() => openEvent(event)}
        onKeyDown={(keyEvent) => {
          if (keyEvent.key === 'Enter') openEvent(event);
        }}
      >
        <span className={styles.eventIcon} aria-hidden>
          <Icon size={14} />
        </span>
        <span className={styles.blockText}>
          <strong>{block.label}</strong>
          <small>
            {block.kind === 'task'
              ? `${isEnglish ? 'Closed' : 'Zamknięte'} ${formatDates(block)}`
              : formatDates(block)}
          </small>
          {renderThumbnails(block)}
        </span>
        {block.kind === 'event' && (
          <button
            type='button'
            className={styles.addPhotoButton}
            title={isEnglish ? 'Add photos to this event' : 'Dodaj zdjęcia do wydarzenia'}
            aria-label={isEnglish ? 'Add photos to this event' : 'Dodaj zdjęcia do wydarzenia'}
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              setPhotoUpload({ groupId: event.groupId });
            }}
          >
            <Camera size={15} aria-hidden />
          </button>
        )}
        {amount !== undefined ? (
          <span className={styles.blockDays}>
            <strong>{formatAmount(amount, language)}</strong>
          </span>
        ) : (
          block.kind === 'event' && daysOf(block) > 1 && renderDays(block)
        )}
      </div>
    );
  };

  return (
    <PageContainer scrollable isFullWidth>
      <main className={styles.page}>
        <header className={styles.header}>
          <span className={styles.headerIcon}>
            <History size={22} aria-hidden />
          </span>
          <div>
            <h1>{isEnglish ? 'Timeline' : 'Oś czasu'}</h1>
            <p>
              {isEnglish
                ? 'Care, events, expenses, closed tasks and photos from today back in time.'
                : 'Opieka, wydarzenia, wydatki, zamknięte zadania i zdjęcia od dziś wstecz.'}
            </p>
          </div>
          <div className={styles.addMenu} ref={addMenuRef}>
            <button
              type='button'
              className={styles.addButton}
              aria-expanded={isAddMenuOpen}
              aria-haspopup='menu'
              onClick={() => setIsAddMenuOpen((value) => !value)}
            >
              <Plus size={17} aria-hidden />
              {isEnglish ? 'Add' : 'Dodaj'}
            </button>
            {isAddMenuOpen && (
              <div className={styles.addMenuPanel} role='menu'>
                <button
                  type='button'
                  role='menuitem'
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setEventDialog({ groupEvents: [], initialType: CalendarEventType.Event });
                  }}
                >
                  <CalendarPlus size={16} aria-hidden />
                  {isEnglish ? 'Event' : 'Wydarzenie'}
                </button>
                <button
                  type='button'
                  role='menuitem'
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setEventDialog({ groupEvents: [], initialType: CalendarEventType.Expense });
                  }}
                >
                  <Wallet size={16} aria-hidden />
                  {isEnglish ? 'Expense' : 'Wydatek'}
                </button>
                <button
                  type='button'
                  role='menuitem'
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setPhotoUpload({});
                  }}
                >
                  <ImagePlus size={16} aria-hidden />
                  {isEnglish ? 'Photos' : 'Zdjęcia'}
                </button>
              </div>
            )}
          </div>
        </header>

        <div className={styles.tabs} role='tablist'>
          <button
            type='button'
            role='tab'
            aria-selected={tab === 'timeline'}
            onClick={() => setTab('timeline')}
          >
            <History size={16} aria-hidden />
            {isEnglish ? 'Timeline' : 'Oś czasu'}
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={tab === 'waiting'}
            onClick={() => setTab('waiting')}
          >
            <Inbox size={16} aria-hidden />
            {isEnglish ? 'Waiting room' : 'Poczekalnia'}
            {pendingCount > 0 && <span className={styles.tabBadge}>{pendingCount}</span>}
          </button>
        </div>

        {tab === 'waiting' && <PhotoWaitingRoom eventOptions={eventOptions} showEmpty />}

        {tab === 'timeline' && (
        <>
        <div className={styles.stickyBar}>
          <label className={styles.searchBox}>
            <Search size={16} aria-hidden />
            <input
              type='search'
              value={search}
              placeholder={
                isEnglish
                  ? 'Search care, events, expenses, tasks, photos…'
                  : 'Szukaj w opiece, wydarzeniach, wydatkach, zadaniach, zdjęciach…'
              }
              aria-label={isEnglish ? 'Search the timeline' : 'Szukaj na osi czasu'}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type='button'
                aria-label={isEnglish ? 'Clear search' : 'Wyczyść wyszukiwanie'}
                onClick={() => setSearch('')}
              >
                <X size={15} aria-hidden />
              </button>
            )}
          </label>
          <div className={styles.legend} aria-hidden>
            <span>{isEnglish ? 'Care' : 'Opieka'}</span>
            <span>{isEnglish ? 'Events' : 'Wydarzenia'}</span>
          </div>
        </div>

        <ol className={styles.axis} aria-busy={eventsQuery.isFetching || photosQuery.isFetching}>
          <li className={styles.todayRow}>
            <span className={styles.todayMarker}>{isEnglish ? 'Today' : 'Dziś'}</span>
          </li>
          {loadedWindows === 0 && (
            <li className={styles.emptyRow}>
              <span>{isEnglish ? 'Loading…' : 'Ładowanie…'}</span>
            </li>
          )}
          {query && !hasOlder && visibleBlocks.length === 0 && (
            <li className={styles.emptyRow}>
              <span>
                {isEnglish ? 'Nothing matches the search.' : 'Nic nie pasuje do wyszukiwania.'}
              </span>
            </li>
          )}
          {visibleBlocks.map((block, index) => {
            const previous = visibleBlocks[index - 1];
            const isNewMonth = previous?.end.slice(0, 7) !== block.end.slice(0, 7);
            const isNewYear =
              previous !== undefined && previous.end.slice(0, 4) !== block.end.slice(0, 4);
            return (
              <Fragment key={block.key}>
                {isNewYear && (
                  <li className={styles.yearRow}>
                    <span>{block.end.slice(0, 4)}</span>
                  </li>
                )}
                {isNewMonth && (
                  <li className={styles.monthRow}>
                    <span>{dayjs(block.end).locale(language).format('MMMM YYYY')}</span>
                  </li>
                )}
                <li
                  className={block.kind === 'care' ? styles.careRow : styles.eventRow}
                  style={blockStyle(block)}
                >
                  {renderBlock(block)}
                </li>
              </Fragment>
            );
          })}
          {loadedWindows > 0 && canShowMore && (
            <li ref={moreSentinelRef} className={styles.emptyRow}>
              <span>
                {query && hasOlder
                  ? isEnglish
                    ? 'Searching older history…'
                    : 'Szukam w starszej historii…'
                  : isEnglish
                    ? 'Loading older entries…'
                    : 'Ładowanie starszych wpisów…'}
              </span>
            </li>
          )}
        </ol>
        </>
        )}
      </main>

      {eventDialog && (
        <TimelineEventDialog
          groupEvents={eventDialog.groupEvents}
          initialType={eventDialog.initialType}
          onClose={() => setEventDialog(null)}
          onSaved={refreshEvents}
        />
      )}
      {photoUpload && (
        <PhotoUploadDialog
          groupId={photoUpload.groupId}
          eventOptions={eventOptions}
          onClose={() => setPhotoUpload(null)}
          onUploaded={() => setTab('waiting')}
        />
      )}
      {gallery && (
        <PhotoLightbox
          photos={gallery.photos}
          startIndex={gallery.index}
          onClose={() => setGallery(null)}
          onEdit={(photo) => {
            setGallery(null);
            setEditedPhoto(photo);
          }}
        />
      )}
      {editedPhoto && (
        <PhotoEditDialog
          photo={editedPhoto}
          eventOptions={eventOptions}
          onClose={() => setEditedPhoto(null)}
        />
      )}
    </PageContainer>
  );
}
