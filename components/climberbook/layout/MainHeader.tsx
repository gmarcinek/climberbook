"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  moduleConfig,
  type ModuleKey,
} from "@/components/climberbook/common/modules";
import { Button, EmotButton } from "@/components/climberbook/common/Button";
import { Select } from "@/components/climberbook/common/FormControls";
import { Modal } from "@/components/climberbook/common/Modal";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { useClimberbook } from "@/components/climberbook/providers/ClimberbookProvider";
import { ThemeSelector } from "@/components/climberbook/providers/ThemeSelector";
import styles from "./MainHeader.module.scss";

type MainHeaderProps = {
  activeModule: ModuleKey;
};

export function MainHeader({ activeModule }: MainHeaderProps) {
  const { athletes, activeAthleteId, setActiveAthleteId } = useClimberbook();
  const { isMobileHeader, width } = useViewport();
  const router = useRouter();
  const isTwoRowHeader = !isMobileHeader && width > 0 && width < 900;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function openTrainingEditor() {
    setIsMobileMenuOpen(false);
    router.push("/trening/dodaj");
  }

  const navLinks = moduleConfig.map((module, index) => {
    const link = (
      <Link
        href={module.route}
        onClick={() => setIsMobileMenuOpen(false)}
        className={[
          isMobileHeader ? styles.navigationLinkMobile : styles.navigationLink,
          activeModule === module.key &&
            (isMobileHeader
              ? styles.navigationLinkMobileActive
              : styles.navigationLinkActive),
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {module.navLabel}
      </Link>
    );

    if (isMobileHeader) {
      return <Fragment key={module.key}>{link}</Fragment>;
    }

    return (
      <Fragment key={module.key}>
        {index > 0 && <span className={styles.navigationSeparator}>|</span>}
        {link}
      </Fragment>
    );
  });

  return (
    <>
      <header
        className={[
          styles.header,
          (isMobileHeader || isTwoRowHeader) && styles.headerResponsive,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div
          className={[
            styles.topBar,
            (isMobileHeader || isTwoRowHeader) && styles.topBarResponsive,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div
            className={[
              styles.headerLeft,
              (isMobileHeader || isTwoRowHeader) && styles.headerLeftResponsive,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <Link
              href="/"
              className={[styles.brand, isMobileHeader && styles.brandMobile]
                .filter(Boolean)
                .join(" ")}
            >
              Climberbook
            </Link>
            {isMobileHeader ? (
              <EmotButton
                variant="secondary"
                aria-label="Otwórz menu"
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(true)}
                className={styles.menuButton}
              >
                ≡
              </EmotButton>
            ) : null}
            <label
              className={[
                styles.athleteSelector,
                isMobileHeader && styles.athleteSelectorMobile,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className={styles.athleteLabel}>Zawodnik</span>
              <Select
                size="small"
                value={activeAthleteId ?? ""}
                onChange={(event) =>
                  setActiveAthleteId(event.target.value || null)
                }
                className={[
                  styles.athleteSelect,
                  isMobileHeader && styles.athleteSelectMobile,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <option value="">Wybierz zawodnika</option>
                {athletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </option>
                ))}
              </Select>
            </label>
            {!isMobileHeader ? <ThemeSelector compact /> : null}
          </div>

          {!isMobileHeader ? (
            <nav
              className={[
                styles.navigation,
                isTwoRowHeader && styles.navigationTwoRows,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {navLinks}
              <Button
                className={styles.logoutButton}
                onClick={() => void signOut({ callbackUrl: "/login" })}
                variant="quadrary"
              >
                Logout
              </Button>
            </nav>
          ) : null}
        </div>
      </header>

      {isMobileHeader && isMobileMenuOpen ? (
        <Modal
          labelledBy="mobile-navigation-title"
          onClose={() => setIsMobileMenuOpen(false)}
          className={styles.mobileNavigationDialog}
        >
          <div className={styles.mobileNavigationContent}>
            <h2
              id="mobile-navigation-title"
              className={styles.mobileNavigationTitle}
            >
              Menu
            </h2>
            <nav className={styles.mobileNavigationLinks}>
              <Button variant="primary" onClick={openTrainingEditor}>
                + Trening
              </Button>
              {navLinks}
            </nav>
            <div className={styles.mobileNavigationSpacer} />
            <Button
              onClick={() => void signOut({ callbackUrl: "/login" })}
              variant="quadrary"
            >
              Wyloguj
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
