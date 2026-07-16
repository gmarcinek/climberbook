import type { CSSProperties, ReactNode } from "react";
import { panelStyle } from "@/components/climberbook/common/styles";
import styles from "./Panel.module.css";

type PanelPadding = "none" | "compact" | "panel" | "roomy";
type PanelGap = "none" | "xs" | "sm" | "md" | "lg";
type PanelElement = "section" | "div" | "article";

type PanelProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  padding?: PanelPadding;
  gap?: PanelGap;
  as?: PanelElement;
};

export function Panel({
  children,
  className,
  style,
  padding = "panel",
  gap = "sm",
  as = "section",
}: PanelProps) {
  const Component = as;

  return (
    <Component
      style={{ ...panelStyle, padding: undefined, ...style }}
      className={[
        styles.panel,
        styles[`padding--${padding}`],
        styles[`gap--${gap}`],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Component>
  );
}

export type { PanelGap, PanelPadding };
export type { PanelElement };
