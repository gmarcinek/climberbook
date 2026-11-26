'use client';

import { useAppContext } from '@app/AppContext';
import { acceptPhotoConsent } from '@utils/carePhotos';
import { ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './carePhotos.module.scss';

interface PhotoTermsDialogProps {
  termsVersion: string;
  onAccepted: () => void;
  onClose: () => void;
}

const TERMS_PL = [
  'Zdjęcia, które dodajesz (w tym zdjęcia prywatne, zdjęcia osób, dzieci, dokumentów i paragonów), są przesyłane i przechowywane na serwerze aplikacji, aby można je było pokazać w Twoim kalendarzu i na osi czasu.',
  'Każde zdjęcie jest automatycznie przetwarzane: zmniejszane do najwyżej 1024 × 1024 px i zapisywane jako JPEG z kompresją 65%.',
  'Z metadanych zdjęcia (EXIF) odczytujemy i zapisujemy datę i godzinę wykonania, lokalizację GPS (szerokość, długość, wysokość), model aparatu i parametry zdjęcia, aby pokazać je przy zdjęciu. Sam zapisany plik JPEG jest pozbawiony metadanych.',
  'Dodajesz wyłącznie zdjęcia, do których masz prawo. Jeśli na zdjęciu są inne osoby (w szczególności dzieci), masz ich zgodę albo zgodę ich opiekunów prawnych.',
  'Zdjęcia mogą zawierać dane osobowe i wrażliwe. Rozumiesz ryzyko z tym związane, w tym możliwość nieuprawnionego dostępu w razie incydentu bezpieczeństwa, i je akceptujesz.',
  'Ponosisz pełną odpowiedzialność za treści, które dodajesz. Zwalniasz właściciela i operatora aplikacji z wszelkiej odpowiedzialności za treść dodawanych zdjęć oraz za skutki ich przesłania i przechowywania — w najszerszym zakresie dopuszczalnym przez prawo.',
  'W każdej chwili możesz usunąć dowolne zdjęcie. Usunięcie jest trwałe.',
  'Nie wolno dodawać treści niezgodnych z prawem; takie treści mogą zostać usunięte.',
];

const TERMS_EN = [
  'Photos you add (including private photos, photos of people, children, documents and receipts) are uploaded and stored on the app server so they can be shown in your calendar and timeline.',
  'Every photo is processed automatically: downscaled to at most 1024 × 1024 px and saved as JPEG at 65% quality.',
  'From the photo metadata (EXIF) we read and save the date and time it was taken, its GPS location (latitude, longitude, altitude), the camera model and shooting parameters, to show them with the photo. The stored JPEG file itself contains no metadata.',
  'You only add photos you have the right to. If other people (especially children) appear in a photo, you have their consent or the consent of their legal guardians.',
  'Photos may contain personal and sensitive data. You understand the related risks, including unauthorised access in case of a security incident, and accept them.',
  'You are fully responsible for the content you add. You release the owner and operator of the app from any liability for the content of uploaded photos and the consequences of uploading and storing them, to the fullest extent permitted by law.',
  'You can delete any photo at any time. Deletion is permanent.',
  'Unlawful content is not allowed and may be removed.',
];

export const PhotoTermsDialog = ({
  termsVersion,
  onAccepted,
  onClose,
}: PhotoTermsDialogProps) => {
  const { language } = useAppContext();
  const isEnglish = language === 'en';
  const [isChecked, setIsChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await acceptPhotoConsent(termsVersion);
      onAccepted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className={styles.backdrop} role='presentation' onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role='dialog'
        aria-modal='true'
        aria-labelledby='photo-terms-title'
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.dialogHeader}>
          <span className={styles.dialogIcon}>
            <ShieldCheck size={22} aria-hidden />
          </span>
          <div>
            <small>{isEnglish ? 'Before the first upload' : 'Przed pierwszym dodaniem'}</small>
            <h3 id='photo-terms-title'>
              {isEnglish ? 'Photo terms' : 'Regulamin dodawania zdjęć'}
            </h3>
          </div>
          <button type='button' onClick={onClose} aria-label={isEnglish ? 'Close' : 'Zamknij'}>
            <X size={17} aria-hidden />
          </button>
        </header>
        <ol className={styles.terms}>
          {(isEnglish ? TERMS_EN : TERMS_PL).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <label className={styles.consent}>
          <input
            type='checkbox'
            checked={isChecked}
            onChange={(event) => setIsChecked(event.target.checked)}
          />
          <span>
            {isEnglish
              ? 'I have read the terms, I consent to the processing of the photos I add, I understand the consequences and I release the app owner from any liability for the content I upload.'
              : 'Zapoznałem/am się z regulaminem, wyrażam zgodę na przetwarzanie dodawanych zdjęć, rozumiem konsekwencje i zwalniam właściciela aplikacji z odpowiedzialności za treści, które dodaję.'}
          </span>
        </label>
        {error && <p className={styles.error}>{error}</p>}
        <footer className={styles.dialogFooter}>
          <button type='button' className={styles.secondaryButton} onClick={onClose}>
            {isEnglish ? 'Cancel' : 'Anuluj'}
          </button>
          <button
            type='button'
            className={styles.primaryButton}
            disabled={!isChecked || isSaving}
            onClick={() => void accept()}
          >
            {isEnglish ? 'Accept and continue' : 'Akceptuję i przechodzę dalej'}
          </button>
        </footer>
      </section>
    </div>,
    document.querySelector('.alternatingCareRoot') ?? document.body,
  );
};
