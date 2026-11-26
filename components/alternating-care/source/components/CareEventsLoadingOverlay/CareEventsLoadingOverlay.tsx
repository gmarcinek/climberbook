'use client';

import { useIsFetching } from '@tanstack/react-query';
import styles from './CareEventsLoadingOverlay.module.scss';

export function CareEventsLoadingOverlay() {
  const activeQueries = useIsFetching({ queryKey: ['careEvents'] });

  if (activeQueries === 0) return null;

  return (
    <div
      className={styles.overlay}
      role='status'
      aria-live='polite'
      aria-label='Ładowanie wydarzeń kalendarza'
    >
      <div className={styles.panel}>
        <span className={styles.spinner} aria-hidden='true' />
        <strong>Ładowanie kalendarza</strong>
        <span>Pobieramy wydarzenia i zakresy…</span>
      </div>
    </div>
  );
}
