'use client';

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type AppTheme = 'light' | 'timepage';

export const APP_THEMES: Array<{
  id: AppTheme;
  label: { pl: string; en: string };
  swatches: string[];
}> = [
  {
    id: 'light',
    label: { pl: 'Jasny', en: 'Light' },
    swatches: ['#f3f4f6', '#2d5465', '#ff4f4f'],
  },
  {
    id: 'timepage',
    label: { pl: 'Timepage', en: 'Timepage' },
    swatches: ['#090d0e', '#e4024b', '#009ca8', '#f5f5f5'],
  },
];

const STORAGE_KEY = 'alternating-care-theme';

const isAppTheme = (value: unknown): value is AppTheme =>
  APP_THEMES.some((theme) => theme.id === value);

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
});

export function ThemeRoot({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<AppTheme>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isAppTheme(stored)) setThemeState(stored);
  }, []);

  // Portaled UI (modals, popovers) lives outside the wrapper, so expose the theme on <html> too.
  useEffect(() => {
    document.documentElement.dataset.careTheme = theme;
    return () => {
      delete document.documentElement.dataset.careTheme;
    };
  }, [theme]);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <div className={`alternatingCareTheme ${theme}`}>{children}</div>
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
