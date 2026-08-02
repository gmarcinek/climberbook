"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ThemeVariables = Record<`--${string}`, string>;

export type ThemeDefinition = {
  id: string;
  label: string;
  colorScheme?: "light" | "dark";
  variables?: ThemeVariables;
};

export const builtInThemes: readonly ThemeDefinition[] = [
  { id: "default", label: "Default", colorScheme: "light" },
  { id: "old-money", label: "Old money", colorScheme: "dark" },
  { id: "monokai", label: "Monokai", colorScheme: "dark" },
  { id: "text", label: "Text", colorScheme: "dark" },
  { id: "dark", label: "Dark", colorScheme: "dark" },
  { id: "flower", label: "Flower", colorScheme: "light" },
];

type ThemeContextValue = {
  theme: string;
  themes: readonly ThemeDefinition[];
  setTheme: (themeId: string) => void;
  applyTheme: (theme: ThemeDefinition) => void;
};

const STORAGE_KEY = "climberbook:theme";
const DEFAULT_THEME = "default";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeId(value: string | null): value is string {
  return value !== null && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function getStoredTheme() {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  return isThemeId(storedTheme) ? storedTheme : DEFAULT_THEME;
}

export function ThemeProvider({
  children,
  themes = [],
}: {
  children: ReactNode;
  themes?: readonly ThemeDefinition[];
}) {
  const [selectedThemeId, setSelectedThemeId] = useState(DEFAULT_THEME);
  const [isStoredThemeLoaded, setIsStoredThemeLoaded] = useState(false);
  const [registeredThemes, setRegisteredThemes] = useState<
    readonly ThemeDefinition[]
  >([]);
  const appliedVariableNames = useRef<string[]>([]);
  const availableThemes = [...builtInThemes, ...themes, ...registeredThemes];
  const activeTheme =
    availableThemes.find((theme) => theme.id === selectedThemeId) ??
    builtInThemes[0];

  useEffect(() => {
    setSelectedThemeId(getStoredTheme());
    setIsStoredThemeLoaded(true);
  }, []);

  useEffect(() => {
    if (!isStoredThemeLoaded) return;
    const body = document.body;
    body.classList.remove(
      ...[...body.classList].filter((className) =>
        className.startsWith("theme-"),
      ),
    );
    body.classList.add(`theme-${activeTheme.id}`);
    body.dataset.theme = activeTheme.id;
    body.style.colorScheme = activeTheme.colorScheme ?? "";

    for (const variableName of appliedVariableNames.current) {
      body.style.removeProperty(variableName);
    }
    const variables = activeTheme.variables ?? {};
    for (const [variableName, value] of Object.entries(variables)) {
      body.style.setProperty(variableName, value);
    }
    appliedVariableNames.current = Object.keys(variables);
    window.localStorage.setItem(STORAGE_KEY, activeTheme.id);
  }, [activeTheme, isStoredThemeLoaded]);

  function setTheme(themeId: string) {
    if (availableThemes.some((theme) => theme.id === themeId)) {
      setSelectedThemeId(themeId);
    }
  }

  function applyTheme(theme: ThemeDefinition) {
    if (!isThemeId(theme.id)) {
      throw new Error(
        "Theme id must use lowercase letters, digits, and hyphens.",
      );
    }
    setRegisteredThemes((currentThemes) => [
      ...currentThemes.filter((currentTheme) => currentTheme.id !== theme.id),
      theme,
    ]);
    setSelectedThemeId(theme.id);
  }

  return (
    <ThemeContext.Provider
      value={{
        theme: activeTheme.id,
        themes: availableThemes,
        setTheme,
        applyTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
