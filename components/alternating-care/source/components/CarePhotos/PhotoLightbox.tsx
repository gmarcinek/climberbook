'use client';

import { useAppContext } from '@app/AppContext';
import { CarePhoto, carePhotoUrl } from '@utils/carePhotos';
import dayjs from 'dayjs';
import { Camera, ChevronLeft, ChevronRight, Clock3, MapPin, PencilLine, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './carePhotos.module.scss';
import { photoCategoryLabel } from './photoCategories';

export const formatTakenAt = (photo: CarePhoto, language: string) =>
  photo.takenAt
    ? dayjs(photo.takenAt).locale(language).format('D MMM YYYY, HH:mm')
    : dayjs(photo.takenDate).locale(language).format('D MMM YYYY');

export const mapUrl = (photo: CarePhoto) =>
  photo.latitude !== null && photo.longitude !== null
    ? `https://www.openstreetmap.org/?mlat=${photo.latitude}&mlon=${photo.longitude}#map=16/${photo.latitude}/${photo.longitude}`
    : null;

export const formatCoordinates = (photo: CarePhoto) =>
  photo.latitude !== null && photo.longitude !== null
    ? `${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}${
        photo.altitude !== null ? ` · ${Math.round(photo.altitude)} m n.p.m.` : ''
      }`
    : null;

// "Warszawa, Polska"
export const placeLabel = (photo: CarePhoto) =>
  [photo.place, photo.country].filter(Boolean).join(', ');

// "1/120 s · f/1.8 · ISO 100 · 26 mm"
export const formatShot = (exif: CarePhoto['exif']) => {
  const parts: string[] = [];
  const exposure = Number(exif.ExposureTime);
  if (exposure > 0) {
    parts.push(exposure < 1 ? `1/${Math.round(1 / exposure)} s` : `${exposure} s`);
  }
  if (Number(exif.FNumber) > 0) parts.push(`f/${Number(exif.FNumber).toFixed(1)}`);
  if (exif.ISO) parts.push(`ISO ${exif.ISO}`);
  const focal = Number(exif.FocalLengthIn35mmFormat || exif.FocalLength);
  if (focal > 0) parts.push(`${Math.round(focal)} mm`);
  return parts.join(' · ');
};

export const PhotoMetaList = ({ photo }: { photo: CarePhoto }) => {
  const { language } = useAppContext();
  const isEnglish = language === 'en';
  const coordinates = formatCoordinates(photo);
  const url = mapUrl(photo);
  const shot = formatShot(photo.exif);
  return (
    <ul className={styles.metaList}>
      <li>
        <Clock3 size={14} aria-hidden />
        {formatTakenAt(photo, language)}
        {!photo.takenAt && (
          <small>{isEnglish ? ' (no EXIF time)' : ' (brak godziny w EXIF)'}</small>
        )}
      </li>
      {coordinates && url && (
        <li>
          <MapPin size={14} aria-hidden />
          <a href={url} target='_blank' rel='noreferrer' title={coordinates}>
            {placeLabel(photo) ? (
              <>
                <strong>{placeLabel(photo)}</strong>{' '}
                <small className={styles.metaSecondary}>· {coordinates}</small>
              </>
            ) : (
              coordinates
            )}
          </a>
        </li>
      )}
      {(photo.camera || shot) && (
        <li className={styles.metaSecondary}>
          <Camera size={14} aria-hidden />
          {[photo.camera, shot].filter(Boolean).join(' · ')}
        </li>
      )}
    </ul>
  );
};

interface PhotoLightboxProps {
  photos: CarePhoto[];
  startIndex: number;
  onClose: () => void;
  onEdit?: (photo: CarePhoto) => void;
}

export const PhotoLightbox = ({ photos, startIndex, onClose, onEdit }: PhotoLightboxProps) => {
  const { language } = useAppContext();
  const isEnglish = language === 'en';
  const [index, setIndex] = useState(startIndex);
  const photo = photos[index];
  const hasMany = photos.length > 1;

  const go = useCallback(
    (step: number) => setIndex((current) => (current + step + photos.length) % photos.length),
    [photos.length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  if (!photo) return null;

  return createPortal(
    <div
      className={styles.lightbox}
      role='dialog'
      aria-modal='true'
      aria-label={isEnglish ? 'Photo gallery' : 'Galeria zdjęć'}
      onClick={onClose}
    >
      <button
        type='button'
        className={styles.lightboxClose}
        onClick={onClose}
        aria-label={isEnglish ? 'Close' : 'Zamknij'}
      >
        <X size={20} aria-hidden />
      </button>
      {hasMany && (
        <button
          type='button'
          className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
          aria-label={isEnglish ? 'Previous photo' : 'Poprzednie zdjęcie'}
          onClick={(event) => {
            event.stopPropagation();
            go(-1);
          }}
        >
          <ChevronLeft size={30} aria-hidden />
        </button>
      )}
      <figure className={styles.lightboxFigure}>
        <img
          key={photo.id}
          src={carePhotoUrl(photo.id)}
          alt={photo.description}
          onClick={(event) => event.stopPropagation()}
        />
        <figcaption onClick={(event) => event.stopPropagation()}>
          <div>
            {photo.category && (
              <span className={styles.lightboxCategory}>
                {photoCategoryLabel(photo.category, language)}
              </span>
            )}
            <strong>
              {photo.description || (isEnglish ? 'No description' : 'Bez opisu')}
            </strong>
            <PhotoMetaList photo={photo} />
          </div>
          <div className={styles.lightboxActions}>
            {hasMany && (
              <span>
                {index + 1} / {photos.length}
              </span>
            )}
            {onEdit && (
              <button type='button' onClick={() => onEdit(photo)}>
                <PencilLine size={15} aria-hidden />
                {isEnglish ? 'Edit' : 'Edytuj'}
              </button>
            )}
          </div>
        </figcaption>
      </figure>
      {hasMany && (
        <button
          type='button'
          className={`${styles.lightboxNav} ${styles.lightboxNext}`}
          aria-label={isEnglish ? 'Next photo' : 'Następne zdjęcie'}
          onClick={(event) => {
            event.stopPropagation();
            go(1);
          }}
        >
          <ChevronRight size={30} aria-hidden />
        </button>
      )}
    </div>,
    document.querySelector('.alternatingCareRoot') ?? document.body,
  );
};
