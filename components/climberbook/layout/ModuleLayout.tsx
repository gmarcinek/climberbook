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
  const { isMobileTrainingLayout, isReady } = useViewport();
  const moduleContainer =
    activeModule === "raportowy" || activeModule === "analityka"
      ? {
          height:
            activeModule === "analityka" && !isMobileTrainingLayout
              ? "100%"
              : undefined,
          margin: 0,
          maxWidth: "none",
          minHeight: 0,
          width: "100%",
        }
      : moduleContainerStyle;

  if (!isReady) {
    return null;
  }

  const usesDashboardLayout = activeModule === "analityka";

  return (
    <main
      className={styles.page}
      style={
        usesDashboardLayout
          ? {
              height: isMobileTrainingLayout ? "auto" : "100vh",
              overflow: isMobileTrainingLayout ? "visible" : "hidden",
            }
          : undefined
      }
    >
      <section
        className={styles.shell}
        style={
          usesDashboardLayout
            ? {
                height: isMobileTrainingLayout ? "auto" : "100vh",
                minHeight: "100vh",
                overflow: isMobileTrainingLayout ? "visible" : "hidden",
              }
            : undefined
        }
      >
        <MainHeader activeModule={activeModule} />
        <div
          className={styles.moduleContent}
          style={
            usesDashboardLayout
              ? {
                  height: isMobileTrainingLayout
                    ? "auto"
                    : "calc(-83px + 100vh)",
                  minHeight: isMobileTrainingLayout
                    ? "auto"
                    : "calc(-83px + 100vh)",
                  overflow: isMobileTrainingLayout ? "visible" : "hidden",
                  padding: isMobileTrainingLayout ? "0.5rem" : 0,
                  position: "relative",
                }
              : undefined
          }
        >
          <div style={moduleContainer}>{children}</div>
        </div>
      </section>
    </main>
  );
}
