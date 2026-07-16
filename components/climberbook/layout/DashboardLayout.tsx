"use client";

import type { ReactNode } from "react";
import {
  contentBodyStyle,
  moduleShellStyles,
  pageStyle,
  shellStyle,
} from "@/components/climberbook/common/styles";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { MainHeader } from "./MainHeader";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { isMobileTrainingLayout } = useViewport();

  return (
    <main
      style={{
        ...pageStyle,
        height: isMobileTrainingLayout ? "auto" : "100vh",
        overflow: isMobileTrainingLayout ? "visible" : "hidden",
      }}
    >
      <section
        style={{
          ...shellStyle,
          ...moduleShellStyles.treningowy,
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
