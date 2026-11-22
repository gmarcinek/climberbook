"use client";

import Link from "next/link";
import {
  BrainCircuit,
  CalendarDays,
  Grid3X3,
  LogOut,
  Map,
  Mountain,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./PlatformAccountMenu.module.css";

type PlatformUser = {
  id: string;
  email: string;
  name: string;
  role: "member" | "admin";
  apps: Array<{ id: string; label: string; href: string }>;
};

const appIcons: Record<string, LucideIcon> = {
  climberbook: Mountain,
  "alternating-care": CalendarDays,
  models: BrainCircuit,
  maps: Map,
};

export function PlatformAccountMenu({
  currentApp,
}: {
  currentApp:
    | "lobby"
    | "climberbook"
    | "alternating-care"
    | "models"
    | "maps"
    | "settings";
}) {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [openPanel, setOpenPanel] = useState<"apps" | "account" | null>(null);
  const [anchor, setAnchor] = useState({ top: 0, right: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetch("/api/platform/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { user?: PlatformUser };
        setUser(payload.user ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!openPanel || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    setAnchor({
      top: rect.bottom + 12,
      right: Math.max(12, window.innerWidth - rect.right),
    });
  }, [openPanel]);

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node) &&
        !panelRef.current?.contains(event.target as Node)
      ) {
        setOpenPanel(null);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenPanel(null);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const initials =
    user?.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || <UserRound size={18} aria-hidden />;

  const portal =
    typeof document !== "undefined" && openPanel
      ? createPortal(
          openPanel === "apps" ? (
            <div
              ref={panelRef}
              className={`${styles.portalRoot} ${styles.panel} ${styles.appsPanel}`}
              style={{ top: anchor.top, right: anchor.right }}
            >
              <strong className={styles.panelTitle}>Aplikacje</strong>
              <Link
                href="/"
                className={styles.lobbyLink}
                onClick={() => setOpenPanel(null)}
              >
                <span className={`${styles.appTile} ${styles.lobbyTile}`}>
                  LP
                </span>
                <span>Lobby</span>
              </Link>
              <div className={styles.appGrid}>
                {(user?.apps ?? []).map((app) => {
                  const Icon = appIcons[app.id] ?? Grid3X3;
                  return (
                    <Link
                      key={app.id}
                      href={app.href}
                      className={app.id === currentApp ? styles.currentApp : ""}
                      onClick={() => setOpenPanel(null)}
                    >
                      <span
                        className={`${styles.appTile} ${
                          styles[`appTile--${app.id}`] ?? ""
                        }`}
                      >
                        <Icon size={22} aria-hidden />
                      </span>
                      <span>{app.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div
              ref={panelRef}
              className={`${styles.portalRoot} ${styles.panel} ${styles.accountPanel}`}
              style={{ top: anchor.top, right: anchor.right }}
            >
              <div className={styles.identity}>
                <span className={styles.avatarLarge}>{initials}</span>
                <span>
                  <strong>{user?.name ?? "Użytkownik"}</strong>
                  <small>{user?.email ?? "Ładowanie profilu..."}</small>
                </span>
              </div>
              <div className={styles.role}>
                <span>Rola platformy</span>
                <strong>
                  {user?.role === "admin" ? "Administrator" : "Użytkownik"}
                </strong>
              </div>
              <div className={styles.accountApps}>
                <span>Aplikacje</span>
                {user?.apps.map((app) => (
                  <Link
                    key={app.id}
                    href={app.href}
                    onClick={() => setOpenPanel(null)}
                  >
                    {app.label}
                    {app.id === currentApp ? <small>Otwarte</small> : null}
                  </Link>
                ))}
              </div>
              <div className={styles.actions}>
                <Link href="/settings">
                  <Settings size={16} aria-hidden />
                  Ustawienia platformy
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/login" })}
                >
                  <LogOut size={16} aria-hidden />
                  Wyloguj
                </button>
              </div>
            </div>
          ),
          document.body,
        )
      : null;

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.iconButton}
        aria-label="Aplikacje platformy"
        aria-expanded={openPanel === "apps"}
        onClick={() =>
          setOpenPanel((current) => (current === "apps" ? null : "apps"))
        }
      >
        <Grid3X3 size={20} aria-hidden />
      </button>
      <button
        type="button"
        className={styles.avatar}
        aria-label="Menu konta"
        aria-expanded={openPanel === "account"}
        onClick={() =>
          setOpenPanel((current) =>
            current === "account" ? null : "account",
          )
        }
      >
        {initials}
      </button>

      {portal}
    </div>
  );
}
