'use client';

import { useEffect, useState } from 'react';

export type CareHandoffMode = 'simplified' | 'half-day' | 'hourly';

const STORAGE_KEY = 'alternating-care:handoff-mode';
const CHANGE_EVENT = 'alternating-care:handoff-mode-change';

const isCareHandoffMode = (value: string | null): value is CareHandoffMode =>
  value === 'simplified' || value === 'half-day' || value === 'hourly';

export function useCareHandoffMode() {
  const [mode, setModeState] = useState<CareHandoffMode>('half-day');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isCareHandoffMode(stored)) setModeState(stored);

    const sync = () => {
      const next = localStorage.getItem(STORAGE_KEY);
      if (isCareHandoffMode(next)) setModeState(next);
    };
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const setMode = (nextMode: CareHandoffMode) => {
    localStorage.setItem(STORAGE_KEY, nextMode);
    setModeState(nextMode);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { mode, setMode };
}
