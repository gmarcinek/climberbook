"use client";

import type { ReactNode } from "react";
import {
  contentBodyStyle,
  pageStyle,
} from "@/components/climberbook/common/styles";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { MainHeader } from "./MainHeader";
import styles from "./LayoutShell.module.scss";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { isMobileTrainingLayout, isReady } = useViewport();

  if (!isReady) {
    return null;
  }

  return (
    <main
      className={styles.page}
      style={{
        ...pageStyle,
        height: isMobileTrainingLayout ? "auto" : "100vh",
        overflow: isMobileTrainingLayout ? "visible" : "hidden",
      }}
    >
      <section
        className={styles.shell}
        style={{
          minHeight: "100vh",
          height: isMobileTrainingLayout ? "auto" : "100vh",
          overflow: isMobileTrainingLayout ? "visible" : "hidden",
        }}
      >
        <MainHeader activeModule="treningowy" />
        <div
          style={{
            ...contentBodyStyle,
            position: "relative",
            minHeight: isMobileTrainingLayout ? "auto" : "calc(-83px + 100vh)",
            padding: 0,
            height: isMobileTrainingLayout ? "auto" : "calc(-83px + 100vh)",
            overflow: isMobileTrainingLayout ? "visible" : "hidden",
          }}
        >
          {children}
        </div>
      </section>
    </main>
  );
}
