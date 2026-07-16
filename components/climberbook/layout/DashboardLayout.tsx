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
  useViewport();

  return (
    <main style={{ ...pageStyle, height: "100vh", overflow: "hidden" }}>
      <section
        style={{
          ...shellStyle,
          ...moduleShellStyles.treningowy,
          minHeight: "100vh",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <MainHeader activeModule="treningowy" />
        <div
          style={{
            ...contentBodyStyle,
            position: "relative",
            minHeight: "calc(-83px + 100vh)",
            padding: 0,
            height: "calc(-83px + 100vh)",
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      </section>
    </main>
  );
}
