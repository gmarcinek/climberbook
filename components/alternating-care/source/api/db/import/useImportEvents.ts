import { CalendarEvent, CalendarEventType } from '@api/db/types';
import { useMutation } from '@tanstack/react-query';
import { createCareEvents } from '../events/careEventsApi';

type CareDateRange = {
  id?: string;
  startDate: string;
  endDate: string;
};

type CareEventFileRecord = {
  groupId: string;
  type: CalendarEventType;
  issuer?: string;
  name?: string;
  description?: string;
  style?: CalendarEvent['style'];
  ranges: CareDateRange[];
};

type FlatCareRange = CareDateRange & Omit<CareEventFileRecord, 'ranges'>;
type CareExportFile = {
  version: number;
  events?: CareEventFileRecord[];
  ranges?: FlatCareRange[];
};

function addDay(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isEvent(value: unknown): value is CalendarEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  return (
    isDate(event.date) &&
    typeof event.groupId === 'string' &&
    typeof event.type === 'string'
  );
}

function isDateRange(value: unknown): value is CareDateRange {
  if (!value || typeof value !== 'object') return false;
  const range = value as Record<string, unknown>;
  return (
    isDate(range.startDate) &&
    isDate(range.endDate) &&
    range.endDate > range.startDate
  );
}

function isEventFileRecord(value: unknown): value is CareEventFileRecord {
  if (!value || typeof value !== 'object') return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event.groupId === 'string' &&
    typeof event.type === 'string' &&
    Array.isArray(event.ranges) &&
    event.ranges.length > 0 &&
    event.ranges.every(isDateRange)
  );
}

function isFlatRange(value: unknown): value is FlatCareRange {
  if (!isDateRange(value) || !value || typeof value !== 'object') return false;
  const range = value as Record<string, unknown>;
  return typeof range.groupId === 'string' && typeof range.type === 'string';
}

function expandRange(
  metadata: Omit<CareEventFileRecord, 'ranges'>,
  range: CareDateRange
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (let date = range.startDate; date < range.endDate; date = addDay(date)) {
    events.push({
      id: `${range.id ?? metadata.groupId}:${date}`,
      groupId: metadata.groupId,
      date,
      type: metadata.type,
      issuer: metadata.issuer ?? 'Admin',
      creationTime: Date.now(),
      name: metadata.name,
      description: metadata.description,
      style: metadata.style,
    });
  }
  return events;
}

export function parseCareImport(data: unknown): CalendarEvent[] {
  if (Array.isArray(data)) {
    if (!data.every(isEvent)) {
      throw new Error('Plik zawiera nieprawidłowe wydarzenia dzienne.');
    }
    return data;
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Niepoprawny format pliku');
  }
  const file = data as CareExportFile;

  if (Array.isArray(file.events)) {
    if (!file.events.every(isEventFileRecord)) {
      throw new Error('Plik zawiera nieprawidłowy event lub jego ranges.');
    }
    return file.events.flatMap((event) =>
      event.ranges.flatMap((range) => expandRange(event, range))
    );
  }

  if (Array.isArray(file.ranges) && file.ranges.every(isFlatRange)) {
    return file.ranges.flatMap(({ id, startDate, endDate, ...metadata }) =>
      expandRange(metadata, { id, startDate, endDate })
    );
  }

  throw new Error('Plik nie zawiera prawidłowego formatu event ranges.');
}

export const useImportEvents = () => {
  const importMutation = useMutation({
    mutationFn: (events: CalendarEvent[]) => createCareEvents(events),
  });

  const importEventsFromFile = async (file: Blob): Promise<void> => {
    try {
      const events = await fileToJSON(file);
      await importMutation.mutateAsync(events);
      alert('Import zakończony');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Błąd podczas importu');
      console.error(error);
    }
  };

  function fileToJSON(file: Blob): Promise<CalendarEvent[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(parseCareImport(JSON.parse(reader.result as string)));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  return { importEventsFromFile };
};
