"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type PlatformLanguage = "pl" | "en";

type PlatformLanguageContextValue = {
  language: PlatformLanguage;
  setLanguage: (language: PlatformLanguage) => void;
};

const STORAGE_KEY = "personal-platform:language";
const DEFAULT_LANGUAGE: PlatformLanguage = "pl";
const PlatformLanguageContext =
  createContext<PlatformLanguageContextValue | null>(null);

function isPlatformLanguage(value: string | null): value is PlatformLanguage {
  return value === "pl" || value === "en";
}

export function PlatformLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] =
    useState<PlatformLanguage>(DEFAULT_LANGUAGE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isPlatformLanguage(stored)) {
      setLanguageState(stored);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.lang = language;
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language, loaded]);

  const setLanguage = (nextLanguage: PlatformLanguage) => {
    setLanguageState(nextLanguage);
  };

  return (
    <PlatformLanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </PlatformLanguageContext.Provider>
  );
}

export function usePlatformLanguage() {
  const context = useContext(PlatformLanguageContext);
  if (!context) {
    throw new Error(
      "usePlatformLanguage must be used within PlatformLanguageProvider",
    );
  }
  return context;
}
