'use client';
import { useAppContext } from '@app/AppContext';

import { CalendarEventType } from '@api/db/types';
import classNames from 'classnames';
import { BiTrip } from 'react-icons/bi';
import { FaCampground } from 'react-icons/fa';
import { IoMdCalendar } from 'react-icons/io';
import {
  MdCake,
  MdLocalHospital,
  MdOutlineTaskAlt,
  MdSchool,
} from 'react-icons/md';
import { dashboardEventFormI18n } from './dashboardEventForm.i18n';
import styles from './DashboardEventFormTypeSelectInput.module.scss';

interface DashboardEventFormTypeSelectInputProps {
  onValueChange: (value: string) => void;
  value?: string;
}

const HIDDEN_TYPES = [CalendarEventType.Offset, CalendarEventType.Alternating];

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
    const iconProps = { size: 24, 'aria-hidden': true as const };
    if (type === CalendarEventType.Trip) return <BiTrip {...iconProps} />;
    if (type === CalendarEventType.Birthday) return <MdCake {...iconProps} />;
    if (type === CalendarEventType.Medical)
      return <MdLocalHospital {...iconProps} />;
    if (type === CalendarEventType.School) return <MdSchool {...iconProps} />;
    if (type === CalendarEventType.Camp)
      return <FaCampground {...iconProps} />;
    if (type === CalendarEventType.Todo)
      return <MdOutlineTaskAlt {...iconProps} />;
    return <IoMdCalendar {...iconProps} />;
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