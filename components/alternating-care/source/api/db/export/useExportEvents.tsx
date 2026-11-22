import { CalendarEvent } from '@api/db/types';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import dayjs from 'dayjs';
import { listCareEvents } from '../events/careEventsApi';

type CareEventExport = {
  id: string;
  groupId: string;
  type: CalendarEvent['type'];
  issuer: string;
  name?: string;
  description?: string;
  style?: CalendarEvent['style'];
  ranges: Array<{
    id: string;
    startDate: string;
    endDate: string;
  }>;
};

function addDay(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
}

function mergeEvents(events: CalendarEvent[]) {
  const sorted = [...events].sort(
    (left, right) =>
      left.groupId.localeCompare(right.groupId) ||
      left.date.localeCompare(right.date)
  );
  const ranges: Array<
    CareEventExport['ranges'][number] & {
      groupId: string;
      type: CalendarEvent['type'];
      issuer: string;
      name?: string;
      description?: string;
      style?: CalendarEvent['style'];
    }
  > = [];

  for (const event of sorted) {
    const previous = ranges.at(-1);
    if (
      previous &&
      previous.groupId === event.groupId &&
      previous.type === event.type &&
      previous.name === event.name &&
      previous.description === event.description &&
      previous.style?.background === event.style?.background &&
      previous.style?.color === event.style?.color &&
      previous.endDate === event.date
    ) {
      previous.endDate = addDay(event.date);
      continue;
    }

    ranges.push({
      id: event.id.split(':')[0],
      groupId: event.groupId,
      startDate: event.date,
      endDate: addDay(event.date),
      type: event.type,
      issuer: event.issuer,
      name: event.name,
      description: event.description,
      style: event.style,
    });
  }

  return ranges.reduce<CareEventExport[]>((groups, range) => {
    let event = groups.find(
      (candidate) => candidate.groupId === range.groupId
    );
    if (!event) {
      event = {
        id: range.groupId,
        groupId: range.groupId,
        type: range.type,
        issuer: range.issuer,
        name: range.name,
        description: range.description,
        style: range.style,
        ranges: [],
      };
      groups.push(event);
    }
    event.ranges.push({
      id: range.id,
      startDate: range.startDate,
      endDate: range.endDate,
    });
    return groups;
  }, []);
}

export const useExportEvents = () => {
  const exportEventsToFile = async () => {
    try {
      const events: CalendarEvent[] = await listCareEvents();

      if (events.length === 0) {
        alert('Brak wydarzeń do eksportu');
        return;
      }

      const jsonBlob = new Blob(
        [
          JSON.stringify({
            version: 2,
            format: 'care-event-ranges',
            events: mergeEvents(events),
          }),
        ],
        {
        type: 'application/json',
        }
      );

      const link = document.createElement('a');
      link.href = URL.createObjectURL(jsonBlob);
      link.download = generateFileName();
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      alert('Wystąpił nieoczekiwany błąd');
    }
  };

  return {
    exportEventsToFile,
  };
};

const generateFileName = (): string => {
  const date = new Date();
  const timestamp = date.getTime();
  const formated = dayjs(date).format(dateFormat);

  // Generowanie nazwy pliku z datą i sekundą
  const fileName = `alternatinCareApp-${formated}-${timestamp}.json`;
  return fileName;
};
