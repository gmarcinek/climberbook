"use client";

import { Languages, Palette, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeSelector } from "@/components/climberbook/providers/ThemeSelector";
import styles from "./PlatformSettings.module.css";
import {
  type PlatformLanguage,
  usePlatformLanguage,
} from "./PlatformLanguageProvider";

type User = {
  name: string;
  email: string;
  role: "member" | "admin";
};

export function PlatformSettings({
  initialUser = null,
}: {
  initialUser?: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const { language, setLanguage } = usePlatformLanguage();

  useEffect(() => {
    if (initialUser) return;
    void fetch("/api/platform/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { user?: User };
        setUser(payload.user ?? null);
      })
      .catch(() => {});
  }, [initialUser]);

  const initials =
    user?.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "";

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Personal Platform</p>
        <h1>Ustawienia platformy</h1>
        <span>Wspólne ustawienia konta i wyglądu wszystkich aplikacji.</span>
      </header>

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardTitle}>
            <Languages size={20} aria-hidden />
            <h2>Język</h2>
          </div>
          <p className={styles.description}>
            Język wspólny dla aplikacji platformy, które obsługują lokalizację.
          </p>
          <label className={styles.field}>
            <span>Język aplikacji</span>
            <select
              value={language}
              onChange={(event) =>
                setLanguage(event.target.value as PlatformLanguage)
              }
              aria-label="Język aplikacji"
            >
              <option value="pl">Polski</option>
              <option value="en">English</option>
            </select>
          </label>
        </article>

        <article className={styles.card}>
          <div className={styles.cardTitle}>
            <UserRound size={20} aria-hidden />
            <h2>Konto</h2>
          </div>
          <div className={styles.identity}>
            <span className={styles.avatar}>{initials || "?"}</span>
            <div>
              <strong>{user?.name ?? "Ładowanie..."}</strong>
              <span>{user?.email ?? ""}</span>
            </div>
          </div>
          <div className={styles.detail}>
            <span>Rola platformy</span>
            <strong>
              {user?.role === "admin" ? "Administrator" : "Użytkownik"}
            </strong>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardTitle}>
            <Palette size={20} aria-hidden />
            <h2>Wygląd</h2>
          </div>
          <p className={styles.description}>
            Motyw stosowany przez Climberbooka, Modele i wspólne elementy
            platformy.
          </p>
          <ThemeSelector />
        </article>
      </section>
    </div>
  );
}
