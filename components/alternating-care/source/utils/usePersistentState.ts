'use client';

import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';

// useState backed by localStorage; the stored value is applied after mount to keep SSR markup stable.
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(defaultValue);
  const isLoaded = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {
      // Ignore corrupted or unavailable storage.
    }
    isLoaded.current = true;
  }, [key]);

  useEffect(() => {
    if (!isLoaded.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota or privacy-mode errors.
    }
  }, [key, value]);

  return [value, setValue];
}
