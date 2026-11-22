'use client';

import { useCallback, useEffect, useState } from 'react';

export type CareAvatarRole = 'mine' | 'other';
export type CareAvatars = Record<CareAvatarRole, string | null>;

const EMPTY_AVATARS: CareAvatars = { mine: null, other: null };

export function useCareAvatars(otherSubjectId?: string) {
  const [avatars, setAvatarsState] = useState(EMPTY_AVATARS);
  const [bySubject, setBySubject] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    const response = await fetch('/api/alternating-care/avatars', {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error('Nie udało się pobrać avatarów.');
    }
    const data = (await response.json()) as {
      own?: string | null;
      avatars?: Record<string, string>;
    };
    setBySubject(data.avatars ?? {});
    setAvatarsState({
      mine: data.own ?? null,
      other: data.avatars?.[`other:${otherSubjectId || 'manual'}`] ?? null,
    });
  }, [otherSubjectId]);

  useEffect(() => {
    void refresh().catch((error) => {
      console.error('Could not load care avatars.', error);
    });
  }, [refresh]);

  useEffect(() => {
    setAvatarsState((current) => ({
      ...current,
      other: bySubject[`other:${otherSubjectId || 'manual'}`] ?? null,
    }));
  }, [bySubject, otherSubjectId]);

  const setAvatar = useCallback(
    async (
      role: CareAvatarRole,
      dataUrl: string | null,
      subjectId = role === 'other' ? otherSubjectId : undefined
    ) => {
      const response = await fetch('/api/alternating-care/avatars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          subjectId: role === 'other' ? subjectId : undefined,
          avatarData: dataUrl,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || 'Nie udało się zapisać avatara.');
      }
      const data = (await response.json()) as {
        subjectId: string;
        avatarData: string | null;
      };
      setAvatarsState((current) => ({
        ...current,
        ...(role === 'other' &&
        subjectId !== otherSubjectId
          ? {}
          : { [role]: data.avatarData }),
      }));
      setBySubject((current) => {
        const next = { ...current };
        if (data.avatarData) next[data.subjectId] = data.avatarData;
        else delete next[data.subjectId];
        return next;
      });
    },
    [otherSubjectId]
  );

  const getAvatar = useCallback(
    (role: CareAvatarRole, subjectId?: string) => {
      if (role === 'mine') return avatars.mine;
      const key = `other:${subjectId || otherSubjectId || 'manual'}`;
      return bySubject[key] ?? null;
    },
    [avatars.mine, bySubject, otherSubjectId]
  );

  return { avatars, setAvatar, getAvatar };
}
