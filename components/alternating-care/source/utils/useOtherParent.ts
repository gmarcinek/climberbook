'use client';

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'alternating-care:other-parent';
const CHANGE_EVENT = 'alternating-care:other-parent-change';

export type OtherParentProfile = {
  name: string;
  userId?: string;
};

const defaultProfile: OtherParentProfile = { name: '' };

const readProfile = (): OtherParentProfile => {
  if (typeof window === 'undefined') return defaultProfile;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultProfile;

  try {
    const parsed = JSON.parse(stored) as Partial<OtherParentProfile>;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
    };
  } catch {
    return defaultProfile;
  }
};

export const useOtherParent = () => {
  const [profile, setProfileState] = useState(readProfile);

  const setProfile = useCallback((nextProfile: OtherParentProfile) => {
    const normalized = {
      name: nextProfile.name.trim(),
      userId: nextProfile.userId || undefined,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    setProfileState(normalized);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: normalized }));
  }, []);

  return { profile, setProfile };
};
