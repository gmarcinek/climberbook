'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  CARE_COLORS_QUERY_KEY,
  CaregiverColors,
  isCareColor,
} from './caregiverColors';

export type SavedCaregiver = {
  id?: string;
  subjectId: string;
  name: string;
  role: string;
  color?: string | null;
};

export function useCaregivers(): SavedCaregiver[] {
  const { data } = useQuery({
    queryKey: CARE_COLORS_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch('/api/alternating-care/caregivers', {
        cache: 'no-store',
      });
      if (!response.ok) return [];
      const payload = (await response.json()) as {
        caregivers?: SavedCaregiver[];
      };
      return payload.caregivers ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? [];
}

export function useCaregiverColors(): CaregiverColors {
  const caregivers = useCaregivers();
  return useMemo(
    () =>
      Object.fromEntries(
        caregivers
          .filter((item) => isCareColor(item.color))
          .map((item) => [item.subjectId, item.color as string])
      ),
    [caregivers]
  );
}
