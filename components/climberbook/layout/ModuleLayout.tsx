"use client";

import type { ReactNode } from "react";
import type { ModuleKey } from "@/components/climberbook/common/modules";
import {
  moduleContainerStyle,
  moduleShellStyles,
  pageStyle,
  shellStyle,
} from "@/components/climberbook/common/styles";
import { MainHeader } from "./MainHeader";

const moduleContentStyle = {
  padding: "24px 8px 24px",
};

export function ModuleLayout({
  activeModule,
  children,
}: {
  activeModule: Exclude<ModuleKey, "treningowy">;
  children: ReactNode;
}) {
  const moduleContainer =
    activeModule === "raportowy"
      ? { width: "100%", maxWidth: "none", margin: 0 }
      : moduleContainerStyle;

  return (
    <main style={pageStyle}>
      <section style={{ ...shellStyle, ...moduleShellStyles[activeModule] }}>
        <MainHeader activeModule={activeModule} />
        <div style={moduleContentStyle}>
          <div style={moduleContainer}>{children}</div>
        </div>
      </section>
    </main>
  );
}
