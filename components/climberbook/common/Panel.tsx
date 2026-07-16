import type { CSSProperties, ReactNode } from "react";
import { panelStyle } from "@/components/climberbook/common/styles";
import styles from "./Panel.module.css";

type PanelProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function Panel({ children, className, style }: PanelProps) {
  return (
    <section
      style={{ ...panelStyle, padding: undefined, ...style }}
      className={[styles.panel, className].filter(Boolean).join(" ")}
    >
      {children}
    </section>
  );
}
