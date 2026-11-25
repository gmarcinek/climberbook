'use client';

import { useAppContext } from '@app/AppContext';
import { RangeNavigation } from '@components/RangeNavigation/RangeNavigation';
import { Stack } from '@components/Stack/Stack';
import { useBreakpoints } from '@utils/useBreakpoints';
import { MdEvent, MdGroups, MdPerson } from 'react-icons/md';
import { calendarSettingsSectionI18n } from './calendarSettingsSection.i18n';
import styles from './CalendarSettingsSection.module.scss';

interface CalendarSettingsSectionProps {
  isAlternatingVisible: boolean;
  setIsAlternatingVisible: (value: boolean) => void;
  isOtherCareVisible: boolean;
  setIsOtherCareVisible: (value: boolean) => void;

  isEventsVisible: boolean;
  setIsEventsVisible: (value: boolean) => void;
}

export const CalendarSettingsSection = (
  props: CalendarSettingsSectionProps
) => {
  const {
    isAlternatingVisible,
    setIsAlternatingVisible,
    isOtherCareVisible,
    setIsOtherCareVisible,
    isEventsVisible,
    setIsEventsVisible,
  } = props;
  const { language } = useAppContext();
  const i18n = calendarSettingsSectionI18n[language];
  const { isMax1280 } = useBreakpoints();

  return (
    <div className={styles.settingsContainer}>
      <Stack
        direction='horizontal'
        className={styles.settings}
        itemsAlignment='between'
      >
        <div
          className={styles.viewToggles}
          role='group'
          aria-label={i18n.displayMode}
        >
        <button
          type='button'
          className={isAlternatingVisible ? styles.active : undefined}
          aria-pressed={isAlternatingVisible}
          aria-label={i18n.myCare}
          title={i18n.myCare}
          onClick={() => setIsAlternatingVisible(!isAlternatingVisible)}
        >
          <MdPerson size={19} aria-hidden />
        </button>
        <button
          type='button'
          className={isOtherCareVisible ? styles.active : undefined}
          aria-pressed={isOtherCareVisible}
          aria-label={i18n.otherCaregivers}
          title={i18n.otherCaregivers}
          onClick={() => setIsOtherCareVisible(!isOtherCareVisible)}
        >
          <MdGroups size={19} aria-hidden />
        </button>
        <button
          type='button'
          className={isEventsVisible ? styles.active : undefined}
          aria-pressed={isEventsVisible}
          aria-label={i18n.events}
          title={i18n.events}
          onClick={() => setIsEventsVisible(!isEventsVisible)}
        >
          <MdEvent size={19} aria-hidden />
        </button>
        </div>

        <RangeNavigation
          className={styles.rangeNavigation}
          alignItems={'center'}
          contentAlignment={isMax1280 ? 'between' : 'end'}
          fastGranulation='year'
          slowGranulation='month'
          count={1}
        />
      </Stack>
    </div>
  );
};
