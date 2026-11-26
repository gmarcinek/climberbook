'use client';

import { useAppContext } from '@app/AppContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  CARE_PHOTOS_QUERY_KEY,
  getPhotoConsent,
  isHeicFile,
  isImageFile,
  uploadCarePhotos,
} from '@utils/carePhotos';
import { ImagePlus, Upload, X } from 'lucide-react';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { PhotoTermsDialog } from './PhotoTermsDialog';
import { EventPicker } from './EventPicker';
import { sortByProximity } from './eventOptions';
import type { PhotoEventOption } from './eventOptions';
import styles from './carePhotos.module.scss';

export type { PhotoEventOption } from './eventOptions';
export { formatEventOption, sortByProximity, toEventOptions } from './eventOptions';

interface PhotoUploadDialogProps {
  onClose: () => void;
  onUploaded?: (count: number) => void;
  /** Pre-selected event the photos belong to. */
  groupId?: string;
  eventOptions?: PhotoEventOption[];
}

export const PhotoUploadDialog = ({
  onClose,
  onUploaded,
  groupId: initialGroupId,
  eventOptions = [],
}: PhotoUploadDialogProps) => {
  const { language } = useAppContext();
  const isEnglish = language === 'en';
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState<{ accepted: boolean; termsVersion: string } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [groupId, setGroupId] = useState(initialGroupId ?? '');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    getPhotoConsent()
      .then(setConsent)
      .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );
  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews],
  );

  const addFiles = (list: FileList | null) => {
    const images = Array.from(list ?? []).filter(isImageFile);
    setFiles((current) => [...current, ...images]);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const upload = async () => {
    setError(null);
    setProgress({ done: 0, total: files.length });
    try {
      const photos = await uploadCarePhotos(
        files,
        { groupId: groupId || null },
        (done, total) => setProgress({ done, total }),
      );
      await queryClient.invalidateQueries({ queryKey: CARE_PHOTOS_QUERY_KEY });
      onUploaded?.(photos.length);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setProgress(null);
    }
  };

  if (consent && !consent.accepted) {
    return (
      <PhotoTermsDialog
        termsVersion={consent.termsVersion}
        onAccepted={() => setConsent({ ...consent, accepted: true })}
        onClose={onClose}
      />
    );
  }

  return createPortal(
    <div className={styles.backdrop} role='presentation' onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role='dialog'
        aria-modal='true'
        aria-labelledby='photo-upload-title'
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.dialogHeader}>
          <span className={styles.dialogIcon}>
            <ImagePlus size={22} aria-hidden />
          </span>
          <div>
            <small>{isEnglish ? 'Photos' : 'Zdjęcia'}</small>
            <h3 id='photo-upload-title'>
              {isEnglish ? 'Add photos' : 'Dodaj zdjęcia'}
            </h3>
          </div>
          <button type='button' onClick={onClose} aria-label={isEnglish ? 'Close' : 'Zamknij'}>
            <X size={17} aria-hidden />
          </button>
        </header>

        <div
          className={styles.dropZone}
          data-dragging={isDragging || undefined}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role='button'
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
          }}
        >
          <Upload size={26} aria-hidden />
          <strong>
            {isEnglish
              ? 'Drop photos here or click to choose'
              : 'Upuść zdjęcia tutaj lub kliknij, aby wybrać'}
          </strong>
          <small>
            {isEnglish
              ? 'Many at once. They go to the waiting room, where you describe and confirm them.'
              : 'Możesz dodać wiele naraz. Trafią do poczekalni, gdzie je opiszesz i zatwierdzisz.'}
          </small>
          <input
            ref={inputRef}
            type='file'
            accept='image/*,.heic,.heif'
            multiple
            hidden
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </div>

        {previews.length > 0 && (
          <ul className={styles.previewGrid}>
            {previews.map((preview, index) => (
              <li key={preview.url}>
                {isHeicFile(preview.file) ? (
                  <span className={styles.heicPreview} title={preview.file.name}>
                    HEIC
                    <small>{preview.file.name}</small>
                  </span>
                ) : (
                  <img src={preview.url} alt='' />
                )}
                <button
                  type='button'
                  aria-label={isEnglish ? 'Remove' : 'Usuń'}
                  onClick={() =>
                    setFiles((current) => current.filter((_, item) => item !== index))
                  }
                >
                  <X size={13} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        {eventOptions.length > 0 && (
          <div className={styles.field}>
            <span>{isEnglish ? 'Attach to event (optional)' : 'Dołącz do wydarzenia (opcjonalnie)'}</span>
            <EventPicker
              options={sortByProximity(eventOptions, dayjs().format('YYYY-MM-DD'))}
              value={groupId || null}
              language={language}
              onChange={(next) => setGroupId(next ?? '')}
            />
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <footer className={styles.dialogFooter}>
          {progress && (
            <span className={styles.progress}>
              {isEnglish ? 'Uploading' : 'Wysyłanie'} {progress.done}/{progress.total}
            </span>
          )}
          <button type='button' className={styles.secondaryButton} onClick={onClose}>
            {isEnglish ? 'Cancel' : 'Anuluj'}
          </button>
          <button
            type='button'
            className={styles.primaryButton}
            disabled={files.length === 0 || Boolean(progress) || !consent}
            onClick={() => void upload()}
          >
            <Upload size={15} aria-hidden />
            {isEnglish
              ? `Upload ${files.length || ''}`
              : `Wyślij ${files.length || ''} do poczekalni`}
          </button>
        </footer>
      </section>
    </div>,
    document.querySelector('.alternatingCareRoot') ?? document.body,
  );
};
