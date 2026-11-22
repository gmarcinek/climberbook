import type { CalendarEvent } from '@api/db/types';

type CareEventsResponse = {
  events?: CalendarEvent[];
  error?: string;
};

async function careRequest(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<CalendarEvent[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  const response = await fetch(input, {
    ...init,
    signal: controller.signal,
    cache: 'no-store',
  }).finally(() => clearTimeout(timeout));
  const payload = (await response.json()) as CareEventsResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? 'Nie udało się przetworzyć kalendarza.');
  }

  return payload.events ?? [];
}

export async function listCareEvents(params?: {
  groupId?: string;
  type?: string;
  start?: string;
  end?: string;
}) {
  const search = new URLSearchParams();
  if (params?.groupId) search.set('groupId', params.groupId);
  if (params?.type) search.set('type', params.type);
  if (params?.start) search.set('start', params.start);
  if (params?.end) search.set('end', params.end);
  const suffix = search.size ? `?${search.toString()}` : '';
  return careRequest(`/api/care/ranges${suffix}`);
}

export async function createCareEvents(events: CalendarEvent[]) {
  return careRequest('/api/care/ranges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
  });
}

export async function toggleCareEventDates(
  groupId: string,
  dates: string[]
) {
  return careRequest('/api/care/ranges/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, dates }),
  });
}

export async function deleteCareEvent(event: CalendarEvent) {
  return careRequest(
    `/api/care/ranges?id=${encodeURIComponent(event.id)}&date=${encodeURIComponent(event.date)}`,
    { method: 'DELETE' }
  );
}
