"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  moduleConfig,
  type ModuleKey,
} from "@/components/climberbook/common/modules";
import {
  athleteSelectStyle,
  athleteSelectorLabelStyle,
  athleteSelectorStyle,
  brandStyle,
  headerLeftGroupStyle,
  moduleButtonStyle,
  moduleNavStyle,
  navSeparatorStyle,
  pageHeaderStyle,
  topBarStyle,
} from "@/components/climberbook/common/styles";
import { Button, EmotButton } from "@/components/climberbook/common/Button";
import { Modal } from "@/components/climberbook/common/Modal";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { useClimberbook } from "@/components/climberbook/providers/ClimberbookProvider";

type MainHeaderProps = {
  activeModule: ModuleKey;
};

export function MainHeader({ activeModule }: MainHeaderProps) {
  const {
    athletes,
    activeAthleteId,
    setActiveAthleteId,
  } = useClimberbook();
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
        style={
          isMobileHeader
            ? {
                display: "block",
                width: "100%",
                padding: "14px 16px",
                border: "1px solid var(--border-strong)",
                background:
                  activeModule === module.key
                    ? "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(255,255,255,0.72))"
                    : "linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.54))",
                color:
                  activeModule === module.key ? "var(--text)" : "var(--muted)",
                fontSize: "1.05rem",
                fontWeight: activeModule === module.key ? 700 : 600,
                lineHeight: 1.2,
                textDecoration: "none",
              }
            : {
                ...moduleButtonStyle,
                color:
                  activeModule === module.key ? "var(--text)" : "var(--muted)",
                fontWeight: activeModule === module.key ? 700 : 500,
              }
        }
      >
        {module.navLabel}
      </Link>
    );

    if (isMobileHeader) {
      return <Fragment key={module.key}>{link}</Fragment>;
    }

    return (
      <Fragment key={module.key}>
        {index > 0 && <span style={navSeparatorStyle}>|</span>}
        {link}
      </Fragment>
    );
  });

  return (
    <>
      <header
        style={{
          ...pageHeaderStyle,
          position: isMobileHeader ? "relative" : pageHeaderStyle.position,
          top: isMobileHeader ? undefined : pageHeaderStyle.top,
          left: isMobileHeader ? undefined : pageHeaderStyle.left,
          right: isMobileHeader ? undefined : pageHeaderStyle.right,
          height: isMobileHeader || isTwoRowHeader ? "auto" : 80,
          overflow:
            isMobileHeader || isTwoRowHeader
              ? "visible"
              : pageHeaderStyle.overflow,
        }}
      >
        <div
          style={{
            ...topBarStyle,
            height: isMobileHeader || isTwoRowHeader ? "auto" : 80,
            gridTemplateColumns:
              isMobileHeader || isTwoRowHeader
                ? "minmax(0, 1fr)"
                : "auto minmax(0, 1fr) auto",
            gridTemplateRows:
              isMobileHeader || isTwoRowHeader ? "auto auto" : "none",
            gap: isMobileHeader || isTwoRowHeader ? 8 : 12,
            overflow:
              isMobileHeader || isTwoRowHeader
                ? "visible"
                : topBarStyle.overflow,
            padding: isMobileHeader || isTwoRowHeader ? "8px 12px" : "5px",
          }}
        >
          <div
            style={{
              ...headerLeftGroupStyle,
              gridRow: isMobileHeader ? 1 : "auto",
              flexWrap: isMobileHeader || isTwoRowHeader ? "wrap" : undefined,
              justifyContent:
                isMobileHeader || isTwoRowHeader ? "space-between" : undefined,
              alignItems: isMobileHeader
                ? "center"
                : headerLeftGroupStyle.alignItems,
              width: isMobileHeader || isTwoRowHeader ? "100%" : undefined,
            }}
          >
            <Link
              href="/"
              style={{
                ...brandStyle,
                marginLeft: "12px",
                color: "var(--text)",
                textDecoration: "none",
                fontSize: isMobileHeader ? "1.15rem" : brandStyle.fontSize,
              }}
            >
              Climberbook
            </Link>
            {isMobileHeader ? (
              <EmotButton
                variant="secondary"
                aria-label="Otwórz menu"
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(true)}
                style={{
                  border: "0px solid var(--border-strong)",
                  padding: "0px 0px",
                  background: "rgba(255, 255, 255, 0.72)",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontSize: "3rem",
                  lineHeight: 1,
                  height: "3rem",
                  width: "3rem",
                }}
              >
                ≡
              </EmotButton>
            ) : null}
            <label
              style={{
                ...athleteSelectorStyle,
                flexWrap: isMobileHeader ? "wrap" : undefined,
                width: isMobileHeader ? "100%" : undefined,
              }}
            >
              <span style={athleteSelectorLabelStyle}>Zawodnik</span>
              <select
                value={activeAthleteId ?? ""}
                onChange={(event) =>
                  setActiveAthleteId(event.target.value || null)
                }
                style={{
                  ...athleteSelectStyle,
                  maxWidth: isMobileHeader
                    ? "100%"
                    : athleteSelectStyle.maxWidth,
                  minWidth: isMobileHeader ? 0 : 180,
                  width: isMobileHeader ? "100%" : undefined,
                }}
              >
                <option value="">Wybierz zawodnika</option>
                {athletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!isMobileHeader ? (
            <nav
              style={{
                ...moduleNavStyle,
                gridRow: isTwoRowHeader ? 2 : "auto",
                justifyContent: isTwoRowHeader ? "flex-start" : "flex-end",
              }}
            >
              {navLinks}
              <Button
                style={{ marginLeft: "2rem" }}
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
          style={{ padding: 16 }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: "calc(100svh - 64px)",
              gap: 12,
            }}
          >
            <h2 id="mobile-navigation-title" style={brandStyle}>
              Menu
            </h2>
            <nav
              style={{
                display: "grid",
                gap: 10,
                alignContent: "start",
              }}
            >
              <Button variant="primary" onClick={openTrainingEditor}>
                + Trening
              </Button>
              {navLinks}
            </nav>
            <div style={{ flexGrow: 1 }} />
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
