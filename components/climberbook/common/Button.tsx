import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "quadrary";
type ButtonSize = "medium" | "small";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  children,
  className,
  type = "button",
  variant = "primary",
  size = "medium",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={[
        styles.button,
        styles[`variant--${variant}`],
        styles[`size--${size}`],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

export function EmotButton({
  children,
  className,
  type = "button",
  variant = "secondary",
  size = "medium",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={[
        styles.button,
        styles.emotButton,
        styles[`variant--${variant}`],
        styles[`size--${size}`],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

export type { ButtonSize, ButtonVariant };
