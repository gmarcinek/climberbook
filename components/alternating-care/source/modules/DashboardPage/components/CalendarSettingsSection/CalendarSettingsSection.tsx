'use client';

import { useAppContext } from '@app/AppContext';
import { RangeNavigation } from '@components/RangeNavigation/RangeNavigation';
import { Stack } from '@components/Stack/Stack';
import { useBreakpoints } from '@utils/useBreakpoints';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MdEvent } from 'react-icons/md';
import { calendarSettingsSectionI18n } from './calendarSettingsSection.i18n';
import styles from './CalendarSettingsSection.module.scss';

export const EVENTS_CALENDAR_ID = 'events';

export interface CalendarOption {
  id: string;
  name: string;
  color?: string;
  isEvents?: boolean;
}

interface CalendarSettingsSectionProps {
  /** The first two entries are the user's own care and events ("mine"). */
  calendars: CalendarOption[];
  hiddenCalendars: string[];
  onHiddenCalendarsChange: (hidden: string[]) => void;
}

export const CalendarSettingsSection = (
  props: CalendarSettingsSectionProps
) => {
  const { calendars, hiddenCalendars, onHiddenCalendarsChange } = props;
  const { language } = useAppContext();
  const i18n = calendarSettingsSectionI18n[language];
  const { isMax1280 } = useBreakpoints();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [isOpen]);

  const mineIds = calendars.slice(0, 2).map((item) => item.id);
  const othersIds = calendars.slice(2).map((item) => item.id);
  const isVisible = (id: string) => !hiddenCalendars.includes(id);
  const visibleCount = calendars.filter((item) => isVisible(item.id)).length;
  const isMineMode =
    mineIds.every(isVisible) && othersIds.every((id) => !isVisible(id));
  const isAllMode = calendars.every((item) => isVisible(item.id));

  const toggle = (id: string) =>
    onHiddenCalendarsChange(
      isVisible(id)
        ? [...hiddenCalendars, id]
        : hiddenCalendars.filter((item) => item !== id)
    );

  return (
    <div className={styles.settingsContainer}>
      <Stack
        direction='horizontal'
        className={styles.settings}
        itemsAlignment='between'
      >
        <div className={styles.calendarsMenu} ref={rootRef}>
          <button
            type='button'
            className={styles.calendarsTrigger}
            aria-expanded={isOpen}
            aria-haspopup='menu'
            onClick={() => setIsOpen((value) => !value)}
          >
            <CalendarDays size={15} aria-hidden />
            <span>{i18n.calendars}</span>
            <span className={styles.calendarsCount}>
              {visibleCount}/{calendars.length}
            </span>
            <ChevronDown size={15} aria-hidden />
          </button>
          {isOpen && (
            <div className={styles.calendarsPanel} role='menu'>
              <div
                className={styles.calendarsPresets}
                role='radiogroup'
                aria-label={i18n.calendars}
              >
                <button
                  type='button'
                  role='radio'
                  aria-checked={isMineMode}
                  className={isMineMode ? styles.active : undefined}
                  onClick={() => onHiddenCalendarsChange(othersIds)}
                >
                  {i18n.mine}
                </button>
                <button
                  type='button'
                  role='radio'
                  aria-checked={isAllMode}
                  className={isAllMode ? styles.active : undefined}
                  onClick={() => onHiddenCalendarsChange([])}
                >
                  {i18n.all}
                </button>
              </div>
              {calendars.map((calendar, index) => (
                <button
                  key={calendar.id}
                  type='button'
                  role='menuitemcheckbox'
                  aria-checked={isVisible(calendar.id)}
                  className={styles.calendarOption}
                  data-separated={index === 2 || undefined}
                  onClick={() => toggle(calendar.id)}
                >
                  {calendar.isEvents ? (
                    <MdEvent
                      className={styles.calendarIcon}
                      size={16}
                      aria-hidden
                    />
                  ) : (
                    <span
                      className={styles.calendarSwatch}
                      style={{ background: calendar.color }}
                      aria-hidden
                    />
                  )}
                  <span className={styles.calendarName}>{calendar.name}</span>
                  <span
                    className={styles.switch}
                    data-on={isVisible(calendar.id) || undefined}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          )}
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
