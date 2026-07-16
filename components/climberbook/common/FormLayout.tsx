import type { CSSProperties, ReactNode } from "react";
import styles from "./FormLayout.module.css";

type FormLayoutProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function FormGrid({ children, className, style }: FormLayoutProps) {
  return (
    <div
      className={[styles.formGrid, className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}

export function FormActions({ children, className, style }: FormLayoutProps) {
  return (
    <div
      className={[styles.formActions, className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}

export const formLayoutClassNames = {
  fullSpan: styles.fullSpan,
};
