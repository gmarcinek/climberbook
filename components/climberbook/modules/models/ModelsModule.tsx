"use client";

import Link from "next/link";
import { Panel } from "@/components/climberbook/common/Panel";
import { LayoutMaxWidthContent } from "@/components/climberbook/layout/LayoutMaxWidthContent";
import {
  eyebrowStyle,
  mutedParagraphStyle,
  pageTitleStyle,
} from "@/components/climberbook/common/styles";
import styles from "./ModelsModule.module.css";

export function ModelsModule() {
  return (
    <LayoutMaxWidthContent className={styles.page}>
      <header className={styles.header}>
        <div>
          <p style={eyebrowStyle}>Laboratorium danych</p>
          <h1 style={pageTitleStyle}>Modele</h1>
          <p style={mutedParagraphStyle}>
            Modele predykcyjne wspierające planowanie wspinania.
          </p>
        </div>
        <p className={styles.modelCount}>1 dostępny model</p>
      </header>

      <section className={styles.gallery} aria-label="Galeria modeli">
        <Panel as="article" className={styles.modelCard} gap="md">
          <div className={styles.cardTopline}>
            <span className={styles.modelType}>PREDYKCJA</span>
            <span className={styles.status}>Aktywny</span>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.modelMark} aria-hidden="true">
              %
            </div>
            <div>
              <h2>Warunki wspinaczkowe</h2>
              <p>
                Estymuje jakość warunków na podstawie temperatury, wilgotności i
                wiatru, wykorzystując odpowiedzi z badania.
              </p>
            </div>
          </div>
          <div className={styles.inputs} aria-label="Dane wejściowe modelu">
            <span>Temperatura</span>
            <span>Wilgotność</span>
            <span>Wiatr</span>
          </div>
          <Link className={styles.openModel} href="/warunki-wspin">
            Otwórz model
          </Link>
        </Panel>
      </section>
    </LayoutMaxWidthContent>
  );
}
