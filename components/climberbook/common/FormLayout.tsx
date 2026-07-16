import type { CSSProperties, FormEventHandler, ReactNode } from "react";
import {
  Panel,
  type PanelElement,
  type PanelGap,
  type PanelPadding,
} from "@/components/climberbook/common/Panel";
import styles from "./FormLayout.module.css";

type FormSpace = "xs" | "sm" | "md" | "lg";

type FormLayoutProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

type FormProps = FormLayoutProps & {
  header?: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  panelPadding?: PanelPadding;
  panelGap?: PanelGap;
  as?: PanelElement;
  gap?: FormSpace;
};

type FormGridProps = FormLayoutProps & {
  gap?: "sm" | "md" | "lg";
  desktopColumns?: 1 | 2;
};

type FormActionsProps = FormLayoutProps & {
  gap?: "sm" | "md" | "lg";
  marginTop?: "none" | "sm" | "md" | "lg";
};

export function Form({
  children,
  className,
  style,
  header,
  onSubmit,
  panelClassName,
  panelStyle,
  panelPadding = "panel",
  panelGap = "sm",
  as = "section",
  gap = "sm",
}: FormProps) {
  return (
    <Panel
      as={as}
      className={panelClassName}
      style={panelStyle}
      padding={panelPadding}
      gap={panelGap}
    >
      {header}
      <form
        onSubmit={onSubmit}
        className={[styles.form, styles[`formGap--${gap}`], className]
          .filter(Boolean)
          .join(" ")}
        style={style}
      >
        {children}
      </form>
    </Panel>
  );
}

export function FormGrid({
  children,
  className,
  style,
  gap = "md",
  desktopColumns = 2,
}: FormGridProps) {
  return (
    <div
      className={[
        styles.formGrid,
        styles[`formGridGap--${gap}`],
        styles[
          desktopColumns === 1
            ? "formGridDesktop--single"
            : "formGridDesktop--double"
        ],
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

export function FormActions({
  children,
  className,
  style,
  gap = "md",
  marginTop = "md",
}: FormActionsProps) {
  return (
    <div
      className={[
        styles.formActions,
        styles[`formActionsGap--${gap}`],
        styles[`formActionsMargin--${marginTop}`],
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

export const formLayoutClassNames = {
  fullSpan: styles.fullSpan,
};

export type { FormSpace };
