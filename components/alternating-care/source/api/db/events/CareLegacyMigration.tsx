'use client';

import type { CalendarEvent } from '@api/db/types';
import { useEffect, useRef } from 'react';
import { createCareEvents, listCareEvents } from './careEventsApi';

const LEGACY_DB_NAME = 'alternatingCareDatabase';
const MIGRATION_KEY = 'care:ranges-migrated:v1';

async function readLegacyEvents() {
  if (!('indexedDB' in window)) return [];
  if (typeof indexedDB.databases === 'function') {
    const databases = await indexedDB.databases();
    if (!databases.some(({ name }) => name === LEGACY_DB_NAME)) return [];
  }

  return new Promise<CalendarEvent[]>((resolve, reject) => {
    const request = indexedDB.open(LEGACY_DB_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('events')) {
        database.close();
        resolve([]);
        return;
      }

      const transaction = database.transaction('events', 'readonly');
      const getAll = transaction.objectStore('events').getAll();
      getAll.onerror = () => reject(getAll.error);
      getAll.onsuccess = () => resolve(getAll.result as CalendarEvent[]);
      transaction.oncomplete = () => database.close();
    };
  });
}

export function CareLegacyMigration() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current || localStorage.getItem(MIGRATION_KEY)) return;
    started.current = true;

    void (async () => {
      try {
        const [remoteEvents, legacyEvents] = await Promise.all([
          listCareEvents(),
          readLegacyEvents(),
        ]);
        let migrated = false;
        if (legacyEvents.length > 0 && remoteEvents.length === 0) {
          await createCareEvents(legacyEvents);
          migrated = true;
        }
        localStorage.setItem(MIGRATION_KEY, new Date().toISOString());
        window.dispatchEvent(new CustomEvent('care:migrated'));
        if (migrated) window.location.reload();
      } catch (error) {
        started.current = false;
        console.error('Nie udało się przenieść kalendarza do PostgreSQL.', error);
      }
    })();
  }, []);

  return null;
}
