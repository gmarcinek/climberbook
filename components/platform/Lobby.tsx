"use client";

import Link from "next/link";
import { BrainCircuit, CalendarDays, Map, Mountain } from "lucide-react";
import { PlatformAccountMenu } from "./PlatformAccountMenu";
import styles from "./Lobby.module.css";
import { PlatformWall } from "./PlatformWall";
import { PlatformNotifications } from "./PlatformNotifications";

const apps = [
  {
    href: "/trening",
    title: "Climberbook",
    description:
      "Dziennik treningowy, analiza obciążenia, cele i historia przejść.",
    icon: Mountain,
    tone: styles.climberbook,
    action: "Otwórz Climberbook",
  },
  {
    href: "/alternating-care",
    title: "Opieka naprzemienna",
    description:
      "Wspólny kalendarz okresów opieki, wydarzeń, wyjazdów i ważnych terminów.",
    icon: CalendarDays,
    tone: styles.care,
    action: "Otwórz kalendarz",
  },
  {
    href: "/modele",
    title: "Modele",
    description:
      "Laboratorium modeli wspierających decyzje i planowanie wspinaczki.",
    icon: BrainCircuit,
    tone: styles.models,
    action: "Otwórz modele",
  },
  {
    href: "/maps",
    title: "Maps",
    description:
      "Mapa regionów, rzeczywistych możliwości ratowniczych i infrastruktury.",
    icon: Map,
    tone: styles.maps,
    action: "Otwórz mapy",
  },
] as const;

export function Lobby() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>CB</span>
          <span>
            <strong>Personal Platform</strong>
            <small>Jedno konto. Twoje aplikacje.</small>
          </span>
        </Link>
        <PlatformAccountMenu currentApp="lobby" />
      </header>

      <section className={styles.content}>
        <div className={styles.intro}>
          <p>Lobby aplikacji</p>
          <h1>W czym chcesz dziś pracować?</h1>
          <span>
            Wszystkie aplikacje używają tego samego konta i sesji, a dane
            każdej z nich pozostają odrębne.
          </span>
        </div>

        <div className={styles.grid}>
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.href}
                href={app.href}
                className={`${styles.card} ${app.tone}`}
              >
                <span className={styles.icon}>
                  <Icon size={28} aria-hidden />
                </span>
                <span className={styles.cardText}>
                  <strong>{app.title}</strong>
                  <span>{app.description}</span>
                </span>
                <span className={styles.action}>
                  {app.action}
                  <span aria-hidden>→</span>
                </span>
              </Link>
            );
          })}
        </div>

        <PlatformNotifications />
        <PlatformWall />
      </section>
    </main>
  );
}
