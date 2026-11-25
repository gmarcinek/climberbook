import { useFormPutEventMutation } from '@api/db/events/useFormPutEventMutation';
import { CalendarEventType } from '@api/db/types';
import type { CalendarEvent } from '@api/db/types';
import { useAppContext } from '@app/AppContext';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { colorBlueGreen700, getTextColor, white } from '@utils/color';
import crypto from 'crypto';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { dashboardEventFormI18n } from './dashboardEventForm.i18n';

const defaultBgColor = '#E57373';
const defaultTextColor = '#ffffff';

function minutesToTime(minutes?: number) {
  if (minutes === undefined) return '';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
    minutes % 60
  ).padStart(2, '0')}`;
}

function timeToMinutes(value: string) {
  if (!value) return undefined;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

// Non-consecutive selections are separate days sharing the same hours.
export function isScatteredSelection(dates: string[]) {
  const ordered = [...new Set(dates)].sort();
  return ordered.some(
    (date, index) =>
      index > 0 &&
      dayjs(ordered[index - 1]).add(1, 'day').format('YYYY-MM-DD') !== date,
  );
}

function rangeDurationMinutes(
  dates: string[],
  startTime: string,
  endTime: string,
  rangeStartDate?: string,
  rangeEndDate?: string,
) {
  const orderedDates = [...dates].sort();
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === undefined || end === undefined || orderedDates.length === 0) {
    return undefined;
  }
  if (isScatteredSelection(orderedDates)) return end - start;
  const daySpan = dayjs(rangeEndDate ?? orderedDates.at(-1)).diff(
    dayjs(rangeStartDate ?? orderedDates[0]),
    'day',
  );
  return daySpan * 24 * 60 + end - start;
}

interface useDashboardEventFormProps {
  setIsRadioGroupVisible: Dispatch<SetStateAction<boolean>>;
  selection: string[];
  setSelection: Dispatch<SetStateAction<Set<string>>>;
  onSuccess: () => void;
  setIsMultiSelectionMode: (value: boolean) => void;
  initialEvent?: CalendarEvent;
  initialType?: CalendarEventType;
  initialStartTime?: number;
  initialEndTime?: number;
  preserveGroupId?: boolean;
  redirectAfterSave?: string;
  rangeStartDate?: string;
  rangeEndDate?: string;
}

export const useDashboardEventForm = (props: useDashboardEventFormProps) => {
  const {
    onSuccess,
    setIsRadioGroupVisible,
    selection,
    setIsMultiSelectionMode,
    setSelection,
    initialEvent,
    initialType,
    initialStartTime,
    initialEndTime,
    preserveGroupId = false,
    redirectAfterSave,
    rangeStartDate,
    rangeEndDate,
  } = props;

  const router = useRouter();
  const [date, setDate] = useState('');
  const [type, setType] = useState<CalendarEventType | undefined>(
    initialEvent?.type ?? initialType ?? CalendarEventType.Event
  );
  const [name, setName] = useState(initialEvent?.name ?? '');
  const [description, setDescription] = useState(
    initialEvent?.description ?? ''
  );
  const [backgroundColor, setBackgroundColor] = useState(
    initialEvent?.style?.background ?? '#009688'
  );
  const [textColor, setTextColor] = useState(
    initialEvent?.style?.color ?? defaultTextColor
  );
  const [isAllDay, setIsAllDay] = useState(
    initialEvent?.startTime === undefined && initialStartTime === undefined,
  );
  const [startTime, setStartTime] = useState(
    minutesToTime(initialEvent?.startTime ?? initialStartTime) || '09:00'
  );
  const [endTime, setEndTime] = useState(
    minutesToTime(initialEvent?.endTime ?? initialEndTime) || '10:00'
  );

  const { language } = useAppContext();
  const i18n = dashboardEventFormI18n[language];

  const exampleDate = {
    date: dayjs().format(dateFormat),
    isOffset: false,
  };

  const newEvent = useMemo(() => {
    return {
      date: exampleDate.date,
      type: type ?? CalendarEventType.Event,
      name: name || 'Nazwa nowego wydarzenia',
      description: description || 'Opis wydarzenia, godzina, miejsce',
      style: {
        background: backgroundColor,
        color: getTextColor(backgroundColor),
        completed: initialEvent?.completed ?? false,
      },
      creationTime: 0,
      groupId: '',
      id: '',
      issuer: '',
      startTime: isAllDay ? undefined : timeToMinutes(startTime),
      endTime: isAllDay ? undefined : timeToMinutes(endTime),
      duration:
        isAllDay || !startTime || !endTime
          ? undefined
          : rangeDurationMinutes(
              selection,
              startTime,
              endTime,
              rangeStartDate,
              rangeEndDate,
            ),
    };
  }, [
    backgroundColor,
    description,
    endTime,
    exampleDate.date,
    isAllDay,
    name,
    startTime,
    selection,
    rangeStartDate,
    rangeEndDate,
    type,
  ]);

  const formPutEventMutation = useFormPutEventMutation({
    onSuccess: (data) => {
      onSuccess();
      setIsRadioGroupVisible(false);

      setDate('');
      setType(undefined);
      setName('');
      setDescription('');
      setBackgroundColor('#E57373');
      setTextColor('#ffffff');
      setIsAllDay(true);
      setStartTime('09:00');
      setEndTime('10:00');
      toast(i18n.eventAddedSuccessfully, {
        type: 'success',
        className: 'bg-green-100',
      });

      const currentGroupId = data?.at(0)?.groupId;
      if (redirectAfterSave) {
        router.push(redirectAfterSave);
      } else if (currentGroupId) {
        router.push(`/alternating-care?groupId=${currentGroupId}`);
      }
    },
  });

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      if (!name) {
        toast(i18n.pleaseFillInAllRequiredFields, { type: 'info' });
        return;
      }
      const orderedDates = [...selection].sort();
      const effectiveStartDate = rangeStartDate ?? orderedDates[0];
      const effectiveEndDate = rangeEndDate ?? orderedDates.at(-1);
      const isSingleDayRange =
        !effectiveStartDate ||
        effectiveStartDate === effectiveEndDate ||
        isScatteredSelection(orderedDates);
      if (
        !isAllDay &&
        (!startTime ||
          !endTime ||
          (isSingleDayRange && endTime <= startTime))
      ) {
        toast('Godzina zakończenia musi być późniejsza niż rozpoczęcia.', {
          type: 'info',
        });
        return;
      }

      const typeToSave = type?.toUpperCase() as CalendarEventType;
      const groupId = preserveGroupId && initialEvent
        ? initialEvent.groupId
        : crypto.randomBytes(16).toString('hex');

      const newEvents = selection.map((date) => ({
        id: crypto.randomBytes(16).toString('hex'),

        groupId:
          typeToSave === CalendarEventType.Alternating ? typeToSave : groupId,
        creationTime: new Date().getTime(),
        date,
        type: typeToSave,
        issuer: 'Admin',
        name:
          typeToSave === CalendarEventType.Alternating ? 'ALTERNATING' : name,
        description:
          typeToSave === CalendarEventType.Alternating ? '' : description,
        style: {
          background:
            typeToSave === CalendarEventType.Alternating
              ? colorBlueGreen700
              : backgroundColor,
          color:
            typeToSave === CalendarEventType.Alternating ? white : textColor,
          completed: initialEvent?.completed ?? false,
        },
        startTime: isAllDay ? undefined : timeToMinutes(startTime),
        endTime: isAllDay ? undefined : timeToMinutes(endTime),
        duration:
          isAllDay
            ? undefined
            : rangeDurationMinutes(
                selection,
                startTime,
                endTime,
                rangeStartDate,
                rangeEndDate,
              ),
      }));

      try {
        await formPutEventMutation.mutateAsync(newEvents);
      } catch (error) {
        toast(i18n.errorAddingEvent, { type: 'error' });
      }
    },
    [
      date,
      type,
      name,
      description,
      backgroundColor,
      textColor,
      formPutEventMutation.mutateAsync,
      selection,
      language,
      initialEvent,
      preserveGroupId,
      redirectAfterSave,
      rangeStartDate,
      rangeEndDate,
      isAllDay,
      startTime,
      endTime,
    ]
  );

  const handleCancel = useCallback(() => {
    setSelection(new Set([]));
    setType(undefined);
    setBackgroundColor(defaultBgColor);
    setTextColor(defaultTextColor);
    setIsMultiSelectionMode(false);
    setDate('');
    setName('');
    setDescription('');
    setIsAllDay(true);
    setStartTime('09:00');
    setEndTime('10:00');
  }, [setSelection]);

  const handleReset = useCallback(() => {
    setType(undefined);
    setBackgroundColor(defaultBgColor);
    setTextColor(defaultTextColor);
    setDate('');
    setName('');
    setDescription('');
  }, [setSelection]);

  return {
    handleSubmit,
    handleCancel,
    formPutEventMutation,
    date,
    setDate,
    type,
    setType,
    name,
    setName,
    description,
    setDescription,
    backgroundColor,
    setBackgroundColor,
    textColor,
    setTextColor,
    isAllDay,
    setIsAllDay,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    newEvent,
    handleReset,
  };
};
