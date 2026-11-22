'use client';
import { useAppContext } from '@app/AppContext';

import { CalendarEventType } from '@api/db/types';
import { Radio, RadioGroup } from '@nextui-org/react';
import { dashboardEventFormI18n } from './dashboardEventForm.i18n'; // Import your i18n file

interface DashboardEventFormTypeSelectInputProps {
  onValueChange: (value: string) => void;
  value?: string;
}

export const DashboardEventFormTypeSelectInput = (
  props: DashboardEventFormTypeSelectInputProps
) => {
  const { onValueChange, value } = props;
  const { language } = useAppContext();
  const i18n = dashboardEventFormI18n[language];

  const getRadioValue = (key: string) => {
    return CalendarEventType[key as keyof typeof CalendarEventType];
  };

  const getRadioLabel = (key: string) => {
    return i18n[CalendarEventType[key as keyof typeof CalendarEventType]];
  };

  return (
    <RadioGroup value={value} onValueChange={onValueChange}>
      <div className='grid auto-rows-max grid-cols-3 gap-2'>
        {Object.keys(CalendarEventType).map((key) => {
          if (
            [CalendarEventType.Offset, CalendarEventType.Alternating].includes(
              key.toUpperCase() as CalendarEventType
            )
          ) {
            return;
          }

          return (
            <Radio key={key} value={getRadioValue(key)}>
              {getRadioLabel(key)}
            </Radio>
          );
        })}
      </div>
    </RadioGroup>
  );
};
