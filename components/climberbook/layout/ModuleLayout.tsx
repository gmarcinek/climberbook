"use client";

import type { ReactNode } from "react";
import type { ModuleKey } from "@/components/climberbook/common/modules";
import { moduleContainerStyle } from "@/components/climberbook/common/styles";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { MainHeader } from "./MainHeader";
import styles from "./LayoutShell.module.scss";

export function ModuleLayout({
  activeModule,
  children,
}: {
  activeModule: Exclude<ModuleKey, "treningowy">;
  children: ReactNode;
}) {
  const { isReady } = useViewport();
  const moduleContainer =
    activeModule === "raportowy" || activeModule === "analityka"
      ? { width: "100%", maxWidth: "none", margin: 0 }
      : moduleContainerStyle;

  if (!isReady) {
    return null;
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <MainHeader activeModule={activeModule} />
        <div className={styles.moduleContent}>
          <div style={moduleContainer}>{children}</div>
        </div>
      </section>
    </main>
  );
}
