"use client";

import { Select } from "@/components/climberbook/common/FormControls";
import { useTheme } from "./ThemeProvider";
import styles from "./ThemeSelector.module.scss";

type ThemeSelectorProps = {
  compact?: boolean;
};

export function ThemeSelector({ compact = false }: ThemeSelectorProps) {
  const { theme, themes, setTheme } = useTheme();

  return (
    <label
      className={[styles.selector, compact && styles.compact]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{compact ? "Motyw" : "Motyw aplikacji"}</span>
      <Select
        size={compact ? "small" : "medium"}
        value={theme}
        onChange={(event) => setTheme(event.target.value)}
        aria-label="Motyw aplikacji"
        className={styles.select}
      >
        {themes.map((themeOption) => (
          <option key={themeOption.id} value={themeOption.id}>
            {themeOption.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
