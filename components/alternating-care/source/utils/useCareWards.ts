'use client';

import { useCallback, useEffect, useState } from 'react';
import { CareWard } from './careWards';

export function useCareWards() {
  const [wards, setWards] = useState<CareWard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/alternating-care/wards', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Nie udało się pobrać podopiecznych.');
        const data = (await response.json()) as { wards: CareWard[] };
        if (!cancelled) setWards(data.wards);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Nie udało się pobrać podopiecznych.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveWard = useCallback(async (ward: CareWard) => {
    const response = await fetch('/api/alternating-care/wards', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ward),
    });
    const data = (await response.json().catch(() => null)) as
      | { ward?: CareWard; error?: string }
      | null;
    if (!response.ok || !data?.ward) {
      throw new Error(data?.error || 'Nie udało się zapisać podopiecznego.');
    }
    const saved = data.ward;
    setWards((current) =>
      current.map((item) => (item.id === saved.id ? saved : item))
    );
    return saved;
  }, []);

  return { wards, isLoading, error, saveWard };
}
