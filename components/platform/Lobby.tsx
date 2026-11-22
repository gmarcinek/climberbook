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
        <aside className={styles.sidebar}>
          <div className={styles.intro}>
            <p>Lobby aplikacji</p>
            <h1>W czym chcesz dziś pracować?</h1>
          </div>

          <nav className={styles.list} aria-label="Aplikacje">
            {apps.map((app) => {
              const Icon = app.icon;
              return (
                <Link
                  key={app.href}
                  href={app.href}
                  className={`${styles.card} ${app.tone}`}
                  aria-label={app.action}
                >
                  <span className={styles.icon}>
                    <Icon size={22} aria-hidden />
                  </span>
                  <span className={styles.cardText}>
                    <strong>{app.title}</strong>
                    <span>{app.description}</span>
                  </span>
                  <span className={styles.arrow} aria-hidden>
                    →
                  </span>
                </Link>
              );
            })}
          </nav>

          <PlatformNotifications />
        </aside>

        <div className={styles.main}>
          <PlatformWall />
        </div>
      </section>
    </main>
  );
}
