'use client';

import { useAppContext } from '@app/AppContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CARE_PHOTOS_QUERY_KEY,
  CarePhoto,
  carePhotoUrl,
  confirmCarePhotos,
  deleteCarePhoto,
  listCarePhotos,
  updateCarePhoto,
} from '@utils/carePhotos';
import { Check, CheckCheck, Inbox, Maximize2, Sparkles, Trash2, X } from 'lucide-react';
import { listCareEvents } from '@api/db/events/careEventsApi';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { PhotoLightbox, PhotoMetaList } from './PhotoLightbox';
import { PhotoCategoryPicker } from './photoCategories';
import { sortByProximity, toEventOptions } from './PhotoUploadDialog';
import { eventsOnDate } from './eventOptions';
import { EventPicker } from './EventPicker';
import type { PhotoEventOption } from './PhotoUploadDialog';
import styles from './carePhotos.module.scss';

const NEARBY_DAYS = 90;

type PhotoDraft = Pick<CarePhoto, 'description' | 'takenDate' | 'groupId' | 'category'>;

const PhotoFields = ({
  draft,
  onChange,
  eventOptions,
}: {
  draft: PhotoDraft;
  onChange: (draft: PhotoDraft) => void;
  eventOptions: PhotoEventOption[];
}) => {
  const { language } = useAppContext();
  const isEnglish = language === 'en';
  // The timeline loads history in pages, so also fetch events around this photo's date.
  const nearbyQuery = useQuery({
    queryKey: ['careTimelineNearby', draft.takenDate],
    queryFn: () =>
      listCareEvents({
        start: dayjs(draft.takenDate).subtract(NEARBY_DAYS, 'day').format('YYYY-MM-DD'),
        end: dayjs(draft.takenDate).add(NEARBY_DAYS, 'day').format('YYYY-MM-DD'),
      }),
    staleTime: 60_000,
  });
  const options = useMemo(() => {
    const byGroup = new Map(eventOptions.map((option) => [option.groupId, option]));
    toEventOptions(nearbyQuery.data ?? []).forEach((option) => {
      const known = byGroup.get(option.groupId);
      byGroup.set(
        option.groupId,
        known
          ? {
              ...known,
              date: known.date < option.date ? known.date : option.date,
              end: [known.end ?? known.date, option.end ?? option.date].sort()[1],
              days: [...new Set([...(known.days ?? []), ...(option.days ?? [])])],
            }
          : option,
      );
    });
    return sortByProximity([...byGroup.values()], draft.takenDate);
  }, [draft.takenDate, eventOptions, nearbyQuery.data]);
  // Same-day events are offered as a quick question until one is chosen or dismissed.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const matches =
    !draft.groupId && dismissedFor !== draft.takenDate
      ? eventsOnDate(options, draft.takenDate).slice(0, 3)
      : [];
  return (
    <div className={styles.photoFields}>
      <div className={styles.fieldRow}>
        <label className={`${styles.field} ${styles.dateField}`}>
          <span>{isEnglish ? 'Date' : 'Data'}</span>
          <input
            type='date'
            value={draft.takenDate}
            onChange={(event) =>
              event.target.value && onChange({ ...draft, takenDate: event.target.value })
            }
          />
        </label>
        <div className={`${styles.field} ${styles.eventField}`}>
          <span>{isEnglish ? 'Event' : 'Wydarzenie'}</span>
          <EventPicker
            options={options}
            value={draft.groupId}
            language={language}
            onChange={(groupId) => onChange({ ...draft, groupId })}
          />
        </div>
      </div>
      {matches.length > 0 && (
        <div className={`${styles.eventSuggestion} ${styles.suggestionField}`} role='group'>
          <span>
            <Sparkles size={14} aria-hidden />
            {isEnglish
              ? matches.length === 1
                ? 'Is this from the event?'
                : 'Is this from one of these events?'
              : matches.length === 1
                ? 'Czy to zdjęcie z wydarzenia?'
                : 'Czy to zdjęcie z któregoś wydarzenia?'}
          </span>
          {matches.map((option) => (
            <button
              key={option.groupId}
              type='button'
              className={styles.eventSuggestionOption}
              onClick={() => onChange({ ...draft, groupId: option.groupId })}
            >
              {option.label}
              <small>
                {option.end && option.end !== option.date
                  ? `${option.date.replace(/-/g, '.')} – ${option.end.replace(/-/g, '.')}`
                  : option.date.replace(/-/g, '.')}
              </small>
            </button>
          ))}
          <button
            type='button'
            className={styles.eventSuggestionDismiss}
            onClick={() => setDismissedFor(draft.takenDate)}
          >
            {isEnglish ? 'No' : 'Nie'}
          </button>
        </div>
      )}
      <label className={`${styles.field} ${styles.descriptionField}`}>
        <span>{isEnglish ? 'What is it?' : 'Co to jest?'}</span>
        <textarea
          rows={2}
          value={draft.description}
          placeholder={
            isEnglish
              ? 'e.g. receipt for school books, trip to the zoo…'
              : 'np. paragon za podręczniki, wycieczka do zoo…'
          }
          onChange={(event) => onChange({ ...draft, description: event.target.value })}
        />
      </label>
      <PhotoCategoryPicker
        value={draft.category}
        language={language}
        onChange={(category) => onChange({ ...draft, category })}
      />
    </div>
  );
};

const draftOf = (photo: CarePhoto): PhotoDraft => ({
  description: photo.description,
  takenDate: photo.takenDate,
  groupId: photo.groupId,
  category: photo.category ?? '',
});

// Uploaded photos wait here until they are described and confirmed.
export const PhotoWaitingRoom = ({
  eventOptions = [],
  showEmpty = false,
}: {
  eventOptions?: PhotoEventOption[];
  /** Render an empty state instead of nothing (e.g. when shown as a tab). */
  showEmpty?: boolean;
}) => {
  const { language } = useAppContext();
  const isEnglish = language === 'en';
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, PhotoDraft>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const pendingQuery = useQuery({
    queryKey: [...CARE_PHOTOS_QUERY_KEY, 'pending'],
    queryFn: () => listCarePhotos({ status: 'pending' }),
  });
  const pending = pendingQuery.data ?? [];
  if (pending.length === 0) {
    return showEmpty ? (
      <section className={styles.waitingEmpty}>
        <Inbox size={30} aria-hidden />
        <strong>{isEnglish ? 'The waiting room is empty' : 'Poczekalnia jest pusta'}</strong>
        <span>
          {isEnglish
            ? 'Uploaded photos wait here until you describe and confirm them.'
            : 'Dodane zdjęcia czekają tutaj, aż je opiszesz i zatwierdzisz.'}
        </span>
      </section>
    ) : null;
  }

  const pendingKey = [...CARE_PHOTOS_QUERY_KEY, 'pending'];
  // Drop handled photos from the list right away, then refetch everything.
  const refresh = (handledIds: string[]) => {
    queryClient.setQueryData<CarePhoto[]>(pendingKey, (current) =>
      current?.filter((photo) => !handledIds.includes(photo.id)),
    );
    return queryClient.invalidateQueries({ queryKey: CARE_PHOTOS_QUERY_KEY });
  };
  const fail = (cause: unknown) =>
    toast(cause instanceof Error ? cause.message : String(cause), { type: 'error' });

  const confirm = async (photo: CarePhoto) => {
    setBusyId(photo.id);
    try {
      await updateCarePhoto(photo.id, {
        ...(drafts[photo.id] ?? draftOf(photo)),
        status: 'confirmed',
      });
      await refresh([photo.id]);
    } catch (cause) {
      fail(cause);
    } finally {
      setBusyId(null);
    }
  };

  const confirmAll = async () => {
    setBusyId('all');
    try {
      for (const photo of pending) {
        const draft = drafts[photo.id];
        if (draft) await updateCarePhoto(photo.id, draft);
      }
      await confirmCarePhotos(pending.map((photo) => photo.id));
      await refresh(pending.map((photo) => photo.id));
    } catch (cause) {
      fail(cause);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (photo: CarePhoto) => {
    if (!window.confirm(isEnglish ? 'Delete this photo?' : 'Usunąć to zdjęcie?')) return;
    setBusyId(photo.id);
    try {
      await deleteCarePhoto(photo.id);
      await refresh([photo.id]);
    } catch (cause) {
      fail(cause);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={styles.waitingRoom} aria-labelledby='photo-waiting-room'>
      <header>
        <span className={styles.dialogIcon}>
          <Inbox size={20} aria-hidden />
        </span>
        <div>
          <h2 id='photo-waiting-room'>
            {isEnglish ? 'Photo waiting room' : 'Poczekalnia zdjęć'}{' '}
            <span className={styles.count}>{pending.length}</span>
          </h2>
          <p>
            {isEnglish
              ? 'Describe what is in the photos, then confirm them to put them on the timeline.'
              : 'Opisz, co jest na zdjęciach, i zatwierdź je, aby trafiły na oś czasu.'}
          </p>
        </div>
        <button
          type='button'
          className={styles.primaryButton}
          disabled={busyId !== null}
          onClick={() => void confirmAll()}
        >
          <CheckCheck size={15} aria-hidden />
          {isEnglish ? 'Confirm all' : 'Zatwierdź wszystkie'}
        </button>
      </header>
      <ul className={styles.waitingList}>
        {pending.map((photo, index) => (
          <li key={photo.id} className={styles.waitingCard}>
            <button
              type='button'
              className={styles.waitingImage}
              onClick={() => setGalleryIndex(index)}
              aria-label={isEnglish ? 'Open photo' : 'Otwórz zdjęcie'}
            >
              <img src={carePhotoUrl(photo.id)} alt='' loading='lazy' />
              <span className={styles.waitingZoom} aria-hidden>
                <Maximize2 size={15} />
              </span>
            </button>
            <PhotoMetaList photo={photo} />
            <PhotoFields
              draft={drafts[photo.id] ?? draftOf(photo)}
              eventOptions={eventOptions}
              onChange={(draft) =>
                setDrafts((current) => ({ ...current, [photo.id]: draft }))
              }
            />
            <div className={styles.cardActions}>
              <button
                type='button'
                className={styles.iconButton}
                aria-label={isEnglish ? 'Delete' : 'Usuń'}
                title={isEnglish ? 'Delete' : 'Usuń'}
                disabled={busyId !== null}
                onClick={() => void remove(photo)}
              >
                <Trash2 size={15} aria-hidden />
              </button>
              <button
                type='button'
                className={styles.primaryButton}
                disabled={busyId !== null}
                onClick={() => void confirm(photo)}
              >
                <Check size={15} aria-hidden />
                {isEnglish ? 'Confirm' : 'Zatwierdź'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {galleryIndex !== null && (
        <PhotoLightbox
          photos={pending}
          startIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}
    </section>
  );
};

export const PhotoEditDialog = ({
  photo,
  eventOptions = [],
  onClose,
}: {
  photo: CarePhoto;
  eventOptions?: PhotoEventOption[];
  onClose: () => void;
}) => {
  const { language } = useAppContext();
  const isEnglish = language === 'en';
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PhotoDraft>(draftOf(photo));
  const [isBusy, setIsBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setIsBusy(true);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: CARE_PHOTOS_QUERY_KEY });
      onClose();
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : String(cause), { type: 'error' });
      setIsBusy(false);
    }
  };

  return createPortal(
    <div className={styles.backdrop} role='presentation' onMouseDown={onClose}>
      <section
        className={`${styles.dialog} ${styles.photoDialog}`}
        role='dialog'
        aria-modal='true'
        aria-label={isEnglish ? 'Photo' : 'Zdjęcie'}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type='button'
          className={styles.closeFloating}
          onClick={onClose}
          aria-label={isEnglish ? 'Close' : 'Zamknij'}
        >
          <X size={17} aria-hidden />
        </button>
        <img className={styles.photoLarge} src={carePhotoUrl(photo.id)} alt={photo.description} />
        <PhotoMetaList photo={photo} />
        <PhotoFields draft={draft} onChange={setDraft} eventOptions={eventOptions} />
        <footer className={styles.dialogFooter}>
          <button
            type='button'
            className={styles.dangerButton}
            disabled={isBusy}
            onClick={() => {
              if (window.confirm(isEnglish ? 'Delete this photo?' : 'Usunąć to zdjęcie?')) {
                void run(() => deleteCarePhoto(photo.id));
              }
            }}
          >
            <Trash2 size={15} aria-hidden />
            {isEnglish ? 'Delete' : 'Usuń'}
          </button>
          <button
            type='button'
            className={styles.primaryButton}
            disabled={isBusy}
            onClick={() => void run(() => updateCarePhoto(photo.id, draft))}
          >
            <Check size={15} aria-hidden />
            {isEnglish ? 'Save' : 'Zapisz'}
          </button>
        </footer>
      </section>
    </div>,
    document.querySelector('.alternatingCareRoot') ?? document.body,
  );
};
