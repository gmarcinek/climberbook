'use client';
import { useAppContext } from '@app/AppContext';

import { CalendarEventType } from '@api/db/types';
import classNames from 'classnames';
import { getEventTypeIcon } from '@utils/eventTypeIcons';
import { dashboardEventFormI18n } from './dashboardEventForm.i18n';
import styles from './DashboardEventFormTypeSelectInput.module.scss';
import { getEventTypeColor } from './eventTypeColors';
import type { CSSProperties } from 'react';

interface DashboardEventFormTypeSelectInputProps {
  onValueChange: (value: string) => void;
  value?: string;
}

const HIDDEN_TYPES = [
  CalendarEventType.Offset,
  CalendarEventType.Alternating,
  CalendarEventType.Todo,
];

export const DashboardEventFormTypeSelectInput = (
  props: DashboardEventFormTypeSelectInputProps
) => {
  const { onValueChange, value } = props;
  const { language } = useAppContext();
  const i18n = dashboardEventFormI18n[language];

  const types = Object.values(CalendarEventType).filter(
    (type) => !HIDDEN_TYPES.includes(type)
  );

  const getIcon = (type: CalendarEventType) => {
    const Icon = getEventTypeIcon(type);
    return <Icon size={24} aria-hidden />;
  };

  return (
    <div className={styles.typeGrid} role='radiogroup'>
      {types.map((type) => {
        const isSelected = value === type;
        return (
          <button
            key={type}
            type='button'
            role='radio'
            aria-checked={isSelected}
            className={classNames(styles.typeTile, {
              [styles.selected]: isSelected,
            })}
            style={{ '--type-color': getEventTypeColor(type) } as CSSProperties}
            onClick={() => onValueChange(type)}
          >
            {getIcon(type)}
            <span>{i18n[type]}</span>
          </button>
        );
      })}
    </div>
  );
};