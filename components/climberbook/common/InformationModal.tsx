"use client";

import { Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import {
  getInformationModalConfirmLabel,
  getInformationEntry,
  getInformationModalInfoLabel,
  getInformationModalMaxWidth,
  getInformationModalTriggerLabel,
  type InformationKey,
} from "@/lib/i18n/information";
import { Button } from "./Button";
import { Modal } from "./Modal";
import styles from "./InformationModal.module.css";

type InformationModalProps = {
  topic: InformationKey;
  onClose: () => void;
};

export function InformationModal({ topic, onClose }: InformationModalProps) {
  const entry = getInformationEntry(topic);
  const confirmLabel = getInformationModalConfirmLabel();
  const modalMaxWidth = getInformationModalMaxWidth(topic);
  const titleId = `information-modal-${topic}-title`;

  return (
    <Modal
      labelledBy={titleId}
      onClose={onClose}
      style={{ width: `min(100% - 2rem, ${modalMaxWidth})` }}
      headerContent={
        <div className={styles.headerTitle}>
          <Info aria-hidden="true" size={24} strokeWidth={1.75} />
          <h2 id={titleId} className={styles.title}>
            {entry.title}
          </h2>
        </div>
      }
    >
      <section className={styles.content}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className={styles.description}>{children}</p>
            ),
            table: ({ children }) => (
              <div className={styles.tableWrap}>
                <table className={styles.table}>{children}</table>
              </div>
            ),
          }}
        >
          {entry.description}
        </ReactMarkdown>
        <div className={styles.actions}>
          <Button onClick={onClose}>{confirmLabel}</Button>
        </div>
      </section>
    </Modal>
  );
}

export function InformationModalTrigger({ topic }: { topic: InformationKey }) {
  const [isOpen, setIsOpen] = useState(false);
  const entry = getInformationEntry(topic);
  const infoLabel = getInformationModalInfoLabel();
  const triggerLabel = getInformationModalTriggerLabel(entry.title);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={() => setIsOpen(true)}
      >
        <Info aria-hidden="true" size={16} strokeWidth={2} />
        <span className={styles.triggerLabel}>{infoLabel}</span>
      </button>
      {isOpen ? (
        <InformationModal topic={topic} onClose={() => setIsOpen(false)} />
      ) : null}
    </>
  );
}
