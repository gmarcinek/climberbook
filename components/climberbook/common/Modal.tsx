"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  weightEntryModalOverlayStyle,
  weightEntryModalStyle,
} from "@/components/climberbook/common/styles";
import { EmotButton } from "@/components/climberbook/common/Button";
import styles from "./Modal.module.css";

let activeModalCount = 0;
let lockedScrollY = 0;

type SavedStyles = {
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyOverflow: string;
  bodyOverscrollBehavior: string;
  bodyPaddingRight: string;
};

let savedStyles: SavedStyles | null = null;

function lockDocumentScroll() {
  const html = document.documentElement;
  const body = document.body;

  if (activeModalCount === 0) {
    lockedScrollY = window.scrollY;

    savedStyles = {
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyPaddingRight: body.style.paddingRight,
    };

    const scrollbarWidth = window.innerWidth - html.clientWidth;

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    body.style.position = "fixed";
    body.style.top = `-${lockedScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  activeModalCount += 1;
}

function unlockDocumentScroll() {
  activeModalCount = Math.max(0, activeModalCount - 1);

  if (activeModalCount !== 0 || !savedStyles) {
    return;
  }

  const html = document.documentElement;
  const body = document.body;

  html.style.overflow = savedStyles.htmlOverflow;
  html.style.overscrollBehavior = savedStyles.htmlOverscrollBehavior;

  body.style.position = savedStyles.bodyPosition;
  body.style.top = savedStyles.bodyTop;
  body.style.left = savedStyles.bodyLeft;
  body.style.right = savedStyles.bodyRight;
  body.style.width = savedStyles.bodyWidth;
  body.style.overflow = savedStyles.bodyOverflow;
  body.style.overscrollBehavior = savedStyles.bodyOverscrollBehavior;
  body.style.paddingRight = savedStyles.bodyPaddingRight;

  savedStyles = null;

  window.scrollTo({
    top: lockedScrollY,
    left: 0,
    behavior: "instant",
  });
}

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
    lockDocumentScroll();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      unlockDocumentScroll();
    };
  }, [onClose]);

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <div
      className={styles.overlay}
      style={{
        ...weightEntryModalOverlayStyle,
        ...overlayStyle,
      }}
      role="presentation"
      onPointerDown={(event) => {
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
        style={{
          ...weightEntryModalStyle,
          ...style,
        }}
      >
        <div className={styles.header}>
          <EmotButton
            size="small"
            variant="secondary"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Zamknij modal"
            title="Zamknij"
          >
            X
          </EmotButton>
        </div>

        <div className={styles.content}>{children}</div>
      </section>
    </div>,
    document.body,
  );
}