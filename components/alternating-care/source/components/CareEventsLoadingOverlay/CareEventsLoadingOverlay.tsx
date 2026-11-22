'use client';

import { useIsFetching } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './CareEventsLoadingOverlay.module.scss';

export function CareEventsLoadingOverlay() {
  const activeQueries = useIsFetching({ queryKey: ['careEvents'] });
  const [isMounted, setIsMounted] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setPortalTarget(
      document.querySelector<HTMLElement>('.alternatingCareRoot')
    );
  }, []);

  if (!isMounted || !portalTarget || activeQueries === 0) return null;

  return createPortal(
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
    </div>,
    portalTarget
  );
}
