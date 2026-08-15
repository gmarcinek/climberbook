import type { CSSProperties, ReactNode } from "react";
import {
  moduleContainerStyle,
  moduleContentStyle,
} from "@/components/climberbook/common/styles";

type LayoutMaxWidthContentProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function LayoutMaxWidthContent({
  children,
  className,
  style,
}: LayoutMaxWidthContentProps) {
  return (
    <div
      className={className}
      style={{
        ...moduleContainerStyle,
        ...moduleContentStyle,
        margin: "1.5rem auto 0",
        padding: "0 12px 2rem",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
