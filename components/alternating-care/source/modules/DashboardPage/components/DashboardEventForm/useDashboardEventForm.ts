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

interface useDashboardEventFormProps {
  setIsRadioGroupVisible: Dispatch<SetStateAction<boolean>>;
  selection: string[];
  setSelection: Dispatch<SetStateAction<Set<string>>>;
  onSuccess: () => void;
  setIsMultiSelectionMode: (value: boolean) => void;
  initialEvent?: CalendarEvent;
  preserveGroupId?: boolean;
  redirectAfterSave?: string;
}

export const useDashboardEventForm = (props: useDashboardEventFormProps) => {
  const {
    onSuccess,
    setIsRadioGroupVisible,
    selection,
    setIsMultiSelectionMode,
    setSelection,
    initialEvent,
    preserveGroupId = false,
    redirectAfterSave,
  } = props;

  const router = useRouter();
  const [date, setDate] = useState('');
  const [type, setType] = useState<CalendarEventType | undefined>(
    initialEvent?.type
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
      },
      creationTime: 0,
      groupId: '',
      id: '',
      issuer: '',
    };
  }, [backgroundColor, description, name, type, exampleDate.date]);

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
        },
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
    newEvent,
    handleReset,
  };
};
