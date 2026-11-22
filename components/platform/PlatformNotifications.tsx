"use client";

import Link from "next/link";
import { Bell, CalendarClock, Check, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./PlatformNotifications.module.css";

type Notification = {
  id: string;
  relationshipId: string | null;
  actor: { id: string; displayName: string };
  kind:
    | "friend-request"
    | "request-accepted"
    | "request-rejected"
    | "access-changed";
  app: string | null;
  accessLevel: "none" | "notifications" | "read" | null;
  createdAt: string;
};

const appNames: Record<string, string> = {
  climberbook: "Climberbook",
  "alternating-care": "Opieka naprzemienna",
  maps: "Maps",
  models: "Modele",
};

export function PlatformNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/platform/friends/notifications", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          notifications?: Notification[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error);
        setNotifications(data.notifications ?? []);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Nie udało się wczytać powiadomień.",
        );
      });
  }, []);

  return (
    <section className={styles.panel} aria-labelledby="platform-activity-title">
      <header>
        <span className={styles.icon}>
          <Bell size={20} aria-hidden />
        </span>
        <div>
          <span>Aktywność platformy</span>
          <h2 id="platform-activity-title">Powiadomienia</h2>
        </div>
        <span className={styles.count}>{notifications.length}</span>
      </header>

      {error && <p className={styles.error}>{error}</p>}
      {!error && notifications.length === 0 && (
        <p className={styles.empty}>Na razie nie ma nowych aktywności.</p>
      )}

      <div className={styles.list}>
        {notifications.slice(0, 8).map((notification) => {
          const icon =
            notification.kind === "friend-request" ? (
              <UserPlus size={17} aria-hidden />
            ) : notification.kind === "access-changed" ? (
              <CalendarClock size={17} aria-hidden />
            ) : (
              <Check size={17} aria-hidden />
            );
          let message = "";
          if (notification.kind === "friend-request") {
            message = `${notification.actor.displayName} wysłał(a) zaproszenie`;
          } else if (notification.kind === "request-accepted") {
            message = `${notification.actor.displayName} zaakceptował(a) zaproszenie`;
          } else if (notification.kind === "request-rejected") {
            message = `${notification.actor.displayName} odrzucił(a) zaproszenie`;
          } else {
            const level =
              notification.accessLevel === "read"
                ? "pełny podgląd"
                : notification.accessLevel === "notifications"
                  ? "tylko aktywność"
                  : "brak dostępu";
            message = `${notification.actor.displayName} zmienił(a) Twój zakres w ${
              appNames[notification.app ?? ""] ?? notification.app
            }: ${level}`;
          }

          return (
            <Link
              href="/alternating-care/settings"
              className={styles.item}
              key={notification.id}
            >
              <span>{icon}</span>
              <div>
                <strong>{message}</strong>
                <small>
                  {new Intl.DateTimeFormat("pl-PL", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(notification.createdAt))}
                </small>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
