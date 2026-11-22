'use client';

import { useAppContext } from '@app/AppContext';
import { dateFormat } from '@components/Calendar/Calendar.helpers';
import { CalendarDate, parseDate } from '@internationalized/date';
import { DatePicker } from '@nextui-org/react';
import { I18nProvider } from '@react-aria/i18n';
import dayjs from 'dayjs';
import { useState } from 'react';
import { DashboardEventForm } from '../DashboardEventForm/DashboardEventForm';
import styles from './MobileEventForm.module.scss';

interface MobileEventFormProps {
  onSuccess: () => void;
}

export const MOBILE_SELECTION_STORAGE_KEY = 'alternating-care:mobile-selection';

const readStoredSelection = (): string[] => {
  try {
    const raw = window.sessionStorage.getItem(MOBILE_SELECTION_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').sort()
      : [];
  } catch {
    return [];
  }
};

export const MobileEventForm = ({ onSuccess }: MobileEventFormProps) => {
  const { language } = useAppContext();
  const today = dayjs().format(dateFormat);
  const [initialSelection] = useState(readStoredSelection);
  const [from, setFrom] = useState(initialSelection[0] ?? today);
  const [to, setTo] = useState(initialSelection.at(-1) ?? today);
  const [selection, setSelection] = useState<Set<string>>(
    () => new Set(initialSelection.length ? initialSelection : [today])
  );

  const updateRange = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
    const start = dayjs(nextFrom);
    const end = dayjs(nextTo);
    const count = end.isBefore(start) ? 0 : end.diff(start, 'day') + 1;
    setSelection(
      new Set(
        Array.from({ length: count }, (_, index) =>
          start.add(index, 'day').format(dateFormat)
        )
      )
    );
  };

  const dateRange = (
    <div className={styles.dateRange}>
      <I18nProvider locale={language === 'en' ? 'en-GB' : 'pl-PL'}>
        <DatePicker
          label={language === 'en' ? 'From' : 'Od'}
          variant='bordered'
          size='lg'
          value={parseDate(from)}
          onChange={(value: CalendarDate | null) => {
            if (!value) return;
            updateRange(value.toString(), to);
          }}
          onKeyDown={(event) => event.preventDefault()}
        />
        <DatePicker
          label={language === 'en' ? 'To' : 'Do'}
          variant='bordered'
          size='lg'
          value={parseDate(to)}
          minValue={parseDate(from)}
          onChange={(value: CalendarDate | null) => {
            if (!value) return;
            updateRange(from, value.toString());
          }}
          onKeyDown={(event) => event.preventDefault()}
        />
      </I18nProvider>
    </div>
  );

  return (
    <div className={styles.mobileEventForm}>
      <DashboardEventForm
        selection={Array.from(selection)}
        setSelection={setSelection}
        setIsMultiSelectionMode={() => undefined}
        afterActions={dateRange}
        onSuccess={() => {
          window.sessionStorage.removeItem(MOBILE_SELECTION_STORAGE_KEY);
          onSuccess();
          updateRange(today, today);
        }}
      />
    </div>
  );
};
