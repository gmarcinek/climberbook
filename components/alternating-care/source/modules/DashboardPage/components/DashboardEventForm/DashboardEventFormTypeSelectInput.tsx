'use client';
import { useAppContext } from '@app/AppContext';

import { CalendarEventType } from '@api/db/types';
import classNames from 'classnames';
import { BiTrip } from 'react-icons/bi';
import { FaCampground } from 'react-icons/fa';
import { IoMdCalendar } from 'react-icons/io';
import {
  MdAssignment,
  MdBeachAccess,
  MdCake,
  MdCelebration,
  MdLocalCafe,
  MdLocalHospital,
  MdLocalMovies,
  MdMenuBook,
  MdPhone,
  MdRestaurant,
  MdSchool,
  MdShoppingCart,
  MdSportsSoccer,
  MdWork,
} from 'react-icons/md';
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
    const iconProps = { size: 24, 'aria-hidden': true as const };
    if (type === CalendarEventType.Trip) return <BiTrip {...iconProps} />;
    if (type === CalendarEventType.Birthday) return <MdCake {...iconProps} />;
    if (type === CalendarEventType.Medical)
      return <MdLocalHospital {...iconProps} />;
    if (type === CalendarEventType.School) return <MdSchool {...iconProps} />;
    if (type === CalendarEventType.Camp)
      return <FaCampground {...iconProps} />;
    if (type === CalendarEventType.Culinary)
      return <MdRestaurant {...iconProps} />;
    if (type === CalendarEventType.Coffee)
      return <MdLocalCafe {...iconProps} />;
    if (type === CalendarEventType.Cinema)
      return <MdLocalMovies {...iconProps} />;
    if (type === CalendarEventType.Sport)
      return <MdSportsSoccer {...iconProps} />;
    if (type === CalendarEventType.Shopping)
      return <MdShoppingCart {...iconProps} />;
    if (type === CalendarEventType.Holiday)
      return <MdCelebration {...iconProps} />;
    if (type === CalendarEventType.Vacation)
      return <MdBeachAccess {...iconProps} />;
    if (type === CalendarEventType.Errands)
      return <MdAssignment {...iconProps} />;
    if (type === CalendarEventType.Tutoring)
      return <MdMenuBook {...iconProps} />;
    if (type === CalendarEventType.Work) return <MdWork {...iconProps} />;
    if (type === CalendarEventType.Phone) return <MdPhone {...iconProps} />;
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