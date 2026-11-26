'use client';

import { useAppContext } from '@app/AppContext';
import { APP_THEMES, useAppTheme } from '@app/ThemeRoot';
import { Check, Palette } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import styles from './ThemeMenu.module.scss';

export const ThemeMenu = () => {
  const { language } = useAppContext();
  const { theme, setTheme } = useAppTheme();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isEnglish = language === 'en';

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [isOpen]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type='button'
        className={styles.trigger}
        aria-label={isEnglish ? 'Themes' : 'Motywy'}
        title={isEnglish ? 'Themes' : 'Motywy'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <Palette size={19} aria-hidden />
      </button>
      {isOpen && (
        <div className={styles.menu} role='menu'>
          <span className={styles.title}>{isEnglish ? 'Themes' : 'Motywy'}</span>
          {APP_THEMES.map((item) => (
            <button
              key={item.id}
              type='button'
              role='menuitemradio'
              aria-checked={theme === item.id}
              className={styles.option}
              onClick={() => {
                setTheme(item.id);
                setIsOpen(false);
              }}
            >
              <span className={styles.swatches} aria-hidden>
                {item.swatches.map((color) => (
                  <span key={color} style={{ background: color }} />
                ))}
              </span>
              <span className={styles.label}>
                {isEnglish ? item.label.en : item.label.pl}
              </span>
              {theme === item.id && <Check size={16} aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
