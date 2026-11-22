"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PlatformAccountMenu } from "./PlatformAccountMenu";
import styles from "./PlatformAppShell.module.css";

export function PlatformAppShell({
  app,
  title,
  children,
}: {
  app: "climberbook" | "models" | "maps" | "settings";
  title: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.left}>
          <Link href="/" className={styles.brand}>
            Personal Platform
          </Link>
          <span className={styles.separator} />
          <strong>{title}</strong>
        </div>
        <PlatformAccountMenu currentApp={app} />
      </header>
      <div className={styles.content} data-app={app}>
        {children}
      </div>
    </main>
  );
}
