"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  weightEntryModalOverlayStyle,
  weightEntryModalStyle,
} from "@/components/climberbook/common/styles";
import styles from "./Modal.module.css";

let activeModalCount = 0;
let previousHtmlOverflow = "";

type ModalProps = {
  children: ReactNode;
  labelledBy: string;
  onClose: () => void;
  overlayStyle?: CSSProperties;
  style?: CSSProperties;
};

export function Modal({
  children,
  labelledBy,
  onClose,
  overlayStyle,
  style,
}: ModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const html = document.documentElement;

    if (activeModalCount === 0) {
      previousHtmlOverflow = html.style.overflow;
      html.style.overflow = "hidden";
    }

    activeModalCount += 1;

    return () => {
      activeModalCount -= 1;

      if (activeModalCount === 0) {
        html.style.overflow = previousHtmlOverflow;
      }
    };
  }, []);

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div
      className={styles.overlay}
      style={{ ...weightEntryModalOverlayStyle, ...overlayStyle }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ ...weightEntryModalStyle, ...style }}
      >
        <div className={styles.header}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Zamknij modal"
            title="Zamknij"
          >
            X
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </section>
    </div>,
    document.body,
  );
}
