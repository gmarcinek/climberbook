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

export const MobileEventForm = ({ onSuccess }: MobileEventFormProps) => {
  const { language } = useAppContext();
  const today = dayjs().format(dateFormat);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [selection, setSelection] = useState<Set<string>>(
    () => new Set([today])
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

  return (
    <div className={styles.mobileEventForm}>
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

      <DashboardEventForm
        selection={Array.from(selection)}
        setSelection={setSelection}
        setIsMultiSelectionMode={() => undefined}
        onSuccess={() => {
          onSuccess();
          updateRange(today, today);
        }}
      />
    </div>
  );
};
