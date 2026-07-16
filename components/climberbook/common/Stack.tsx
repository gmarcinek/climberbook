import type { CSSProperties, ReactNode } from "react";
import styles from "./Stack.module.css";

type StackSpace = "none" | "xs" | "sm" | "md" | "lg";

type StackProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  direction?: "row" | "column";
  gap?: StackSpace;
  padding?: StackSpace;
  marginTop?: StackSpace;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "between" | "end";
  wrap?: boolean;
  fullWidth?: boolean;
};

export function Stack({
  children,
  className,
  style,
  direction = "column",
  gap = "sm",
  padding = "none",
  marginTop = "none",
  align,
  justify,
  wrap = false,
  fullWidth = false,
}: StackProps) {
  return (
    <div
      className={[
        styles.stack,
        styles[`direction--${direction}`],
        styles[`gap--${gap}`],
        styles[`padding--${padding}`],
        styles[`marginTop--${marginTop}`],
        align ? styles[`align--${align}`] : "",
        justify ? styles[`justify--${justify}`] : "",
        wrap ? styles.wrap : "",
        fullWidth ? styles.fullWidth : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}

export type { StackSpace };
