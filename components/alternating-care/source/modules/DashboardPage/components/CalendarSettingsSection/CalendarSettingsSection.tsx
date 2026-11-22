'use client';

import { useAppContext } from '@app/AppContext';
import { RangeNavigation } from '@components/RangeNavigation/RangeNavigation';
import { Stack } from '@components/Stack/Stack';
import { useBreakpoints } from '@utils/useBreakpoints';
import { useEffect, useRef } from 'react';
import { useRowSize } from '../Dashboard/useRowSize';
import { calendarSettingsSectionI18n } from './calendarSettingsSection.i18n';
import styles from './CalendarSettingsSection.module.scss';

interface CalendarSettingsSectionProps {
  isPlanVisible: boolean;
  setIsPlanVisible: (value: boolean) => void;

  isAlternatingVisible: boolean;
  setIsAlternatingVisible: (value: boolean) => void;

  isEventsVisible: boolean;
  setIsEventsVisible: (value: boolean) => void;
}

export const CalendarSettingsSection = (
  props: CalendarSettingsSectionProps
) => {
  const {
    isPlanVisible,
    setIsPlanVisible,
    isAlternatingVisible,
    setIsAlternatingVisible,
    isEventsVisible,
    setIsEventsVisible,
  } = props;
  const { language } = useAppContext();
  const i18n = calendarSettingsSectionI18n[language];
  const { isMax1280 } = useBreakpoints();
  const { automaticRowSize } = useRowSize({
    isPlanVisible,
  });
  const displayModeRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeDisplayMode = (event: PointerEvent) => {
      if (!displayModeRef.current?.contains(event.target as Node)) {
        displayModeRef.current?.removeAttribute('open');
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        displayModeRef.current?.removeAttribute('open');
      }
    };

    document.addEventListener('pointerdown', closeDisplayMode);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeDisplayMode);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <Stack
      direction='horizontal'
      className='wrap flex-wrap py-4'
      itemsAlignment='between'
    >
      <details ref={displayModeRef} className={styles.displayMode}>
        <summary>{i18n.displayMode}</summary>
        <div className={styles.options}>
          <label>
            <input
              type='checkbox'
              checked={isPlanVisible}
              onChange={(event) => setIsPlanVisible(event.target.checked)}
            />
            {i18n.plan}
          </label>
          <label>
            <input
              type='checkbox'
              checked={isAlternatingVisible}
              onChange={(event) =>
                setIsAlternatingVisible(event.target.checked)
              }
            />
            {i18n.alternating}
          </label>
          <label aria-disabled={isPlanVisible}>
            <input
              type='checkbox'
              checked={isEventsVisible}
              disabled={isPlanVisible}
              onChange={(event) => setIsEventsVisible(event.target.checked)}
            />
            {i18n.events}
          </label>
        </div>
      </details>

      <RangeNavigation
        className={styles.rangeNavigation}
        alignItems={'center'}
        contentAlignment={isMax1280 ? 'between' : 'end'}
        fastGranulation={isPlanVisible ? 'day' : 'year'}
        slowGranulation={isPlanVisible ? 'day' : 'month'}
        count={isPlanVisible ? automaticRowSize : 1}
      />
    </Stack>
  );
};
