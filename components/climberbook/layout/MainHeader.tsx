"use client";

import { Fragment } from "react";
import Link from "next/link";
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
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { useClimberbook } from "@/components/climberbook/providers/ClimberbookProvider";

type MainHeaderProps = {
  activeModule: ModuleKey;
};

export function MainHeader({ activeModule }: MainHeaderProps) {
  const { athletes, activeAthleteId, setActiveAthleteId } = useClimberbook();
  const { isMobileHeader } = useViewport();

  return (
    <header style={{ ...pageHeaderStyle, height: isMobileHeader ? 112 : 80 }}>
      <div
        style={{
          ...topBarStyle,
          height: isMobileHeader ? 112 : 80,
          gridTemplateColumns: isMobileHeader
            ? "minmax(0, 1fr)"
            : "auto minmax(0, 1fr) auto",
          gridTemplateRows: isMobileHeader ? "48px 40px" : "none",
          gap: isMobileHeader ? 0 : 12,
        }}
      >
        <div
          style={{
            ...headerLeftGroupStyle,
            gridRow: isMobileHeader ? 1 : "auto",
          }}
        >
          <strong style={brandStyle}>Climberbook</strong>
          <label style={athleteSelectorStyle}>
            <span style={athleteSelectorLabelStyle}>Zawodnik</span>
            <select
              value={activeAthleteId ?? ""}
              onChange={(event) =>
                setActiveAthleteId(event.target.value || null)
              }
              style={athleteSelectStyle}
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

        <nav
          style={{
            ...moduleNavStyle,
            gridRow: isMobileHeader ? 2 : "auto",
            justifyContent: isMobileHeader ? "flex-start" : "flex-end",
          }}
        >
          {moduleConfig.map((module, index) => (
            <Fragment key={module.key}>
              {index > 0 && <span style={navSeparatorStyle}>|</span>}
              <Link
                href={module.route}
                style={{
                  ...moduleButtonStyle,
                  color:
                    activeModule === module.key
                      ? "var(--text)"
                      : "var(--muted)",
                  fontWeight: activeModule === module.key ? 700 : 500,
                }}
              >
                {module.navLabel}
              </Link>
            </Fragment>
          ))}
        </nav>
      </div>
    </header>
  );
}
