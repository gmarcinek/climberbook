import type { ModuleKey } from "@/components/climberbook/common/modules";

export const pageStyle = {
  width: "100%",
  minHeight: "100vh",
  padding: 0,
};

export const shellStyle = {
  position: "relative" as const,
  minHeight: "100vh",
  boxShadow: "var(--glass-shadow)",
  backdropFilter: "blur(var(--glass-blur)) saturate(160%)",
};

export const pageHeaderStyle = {
  position: "sticky" as const,
  top: 0,
  left: 0,
  right: 0,
  zIndex: 20,
  height: 80,
  borderBottom: "1px solid var(--border-strong)",
  background: "rgba(255,255,255,0.58)",
  backdropFilter: "blur(18px) saturate(150%)",
  overflow: "hidden",
};

export const pageHeaderTopStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap" as const,
};

export const pageHeaderBottomStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap" as const,
};

export const pageTitleStyle = {
  fontSize: "clamp(1.4rem, 2.2vw, 2.1rem)",
  margin: "4px 0 4px",
  lineHeight: 0.98,
};

export const moduleNavStyle = {
  display: "flex",
  gap: 6,
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "nowrap" as const,
  whiteSpace: "nowrap" as const,
};

export const moduleButtonStyle = {
  border: 0,
  padding: 0,
  background: "transparent",
  cursor: "pointer",
  fontSize: "0.86rem",
  lineHeight: 1,
};

export const navSeparatorStyle = {
  color: "var(--muted)",
  opacity: 0.7,
};

export const headerMetricsStyle = {
  display: "flex",
  flexWrap: "nowrap" as const,
  gap: 10,
  alignItems: "center",
  justifyContent: "center",
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
};

export const headerMetricStyle = {
  color: "var(--muted)",
  fontSize: "0.78rem",
  whiteSpace: "nowrap" as const,
};

export const contentBodyStyle = {
  position: "relative" as const,
  minHeight: "calc(100vh - 100px)",
  padding: "12px 8px 8px",
};

export const trainingModuleStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gridTemplateRows: "minmax(0, 1fr)",
  gap: 9,
  alignItems: "stretch",
  height: "100%",
  minHeight: 0,
};

export const analyticsPanelStyle = {
  display: "grid",
  gap: 9,
  minHeight: 0,
  padding: 0,
  overflowX: "hidden" as const,
  overflowY: "auto" as const,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.38))",
  border: "1px solid var(--border-strong)",
};

export const analyticsPanelInnerStyle = {
  display: "grid",
  gap: 10,
  height: "100%",
  minHeight: 0,
  padding: 11,
  alignContent: "start" as const,
};

export const analyticsStatsGridStyle = {
  display: "grid",
  gap: 8,
  gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
};

export const chartCardStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid var(--border-strong)",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.74), rgba(255,255,255,0.44))",
};

export const weightChartCardStyle = {
  display: "grid",
  gap: 8,
};

export const weightChartCanvasStyle = {
  width: "100%",
  height: 180,
  minWidth: 0,
};

export const weightChartSummaryStyle = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: 8,
  color: "var(--muted)",
  fontSize: "0.85rem",
};

export const weightChartTooltipStyle = {
  border: "1px solid rgba(209, 109, 63, 0.3)",
  borderRadius: 4,
  background: "rgba(255, 250, 243, 0.96)",
  boxShadow: "0 12px 30px rgba(72, 49, 33, 0.14)",
  color: "var(--text)",
};

export const weightEntryModalOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 60,
  display: "grid",
  placeItems: "center",
  padding: 16,
  background: "rgba(30, 25, 22, 0.34)",
};

export const weightEntryModalStyle = {
  display: "grid",
  gap: 14,
  width: "min(100%, 420px)",
  padding: 16,
  background: "rgba(255, 250, 243, 0.98)",
  border: "1px solid var(--border-strong)",
  boxShadow: "0 24px 70px rgba(72, 49, 33, 0.24)",
};

export const calendarPanelStyle = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: 7,
  height: "100%",
  minHeight: 0,
  padding: 11,
  overflow: "hidden",
  border: "1px solid var(--border-strong)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.52), rgba(255,255,255,0.3))",
};

export const calendarNavStyle = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gap: 8,
  alignItems: "center",
  marginTop: 2,
  marginBottom: 2,
};

export const calendarNavLabelStyle = {
  textAlign: "center" as const,
  textTransform: "capitalize" as const,
  fontSize: "1rem",
};

export const moduleContentStyle = {
  display: "grid",
  gap: 9,
};

export const moduleContainerStyle = {
  width: "100%",
  maxWidth: 1280,
  margin: "0 auto",
};

export const settingsContentLayoutStyle = {
  display: "grid",
  gap: 9,
  alignItems: "start",
};

export const settingsMainColumnStyle = {
  display: "grid",
  gap: 9,
  minWidth: 0,
};

export const backupDropzoneStyle = {
  display: "grid",
  minHeight: 300,
  placeItems: "center",
  padding: 12,
  border: "1px dashed var(--border-strong)",
  background: "rgba(255,255,255,0.38)",
  color: "var(--muted)",
  cursor: "pointer",
  textAlign: "center" as const,
};

export const moduleIntroStyle = {
  display: "grid",
  gap: 8,
  padding: "0 2px",
};

export const rangeNavigationStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap" as const,
};

export const navButtonStyle = {
  border: "1px solid var(--border-strong)",
  padding: "5px 7px",
  background: "rgba(255,255,255,0.78)",
  cursor: "pointer",
};

export const ghostButtonStyle = {
  border: "1px solid var(--border-strong)",
  padding: "5px 7px",
  background: "rgba(255,255,255,0.46)",
  cursor: "pointer",
};

export const rangeLabelStyle = {
  color: "var(--muted)",
  fontSize: "0.95rem",
};

export const headerBadgeRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
  alignItems: "center",
};

export const headerBadgeStyle = {
  padding: "5px 7px",
  borderRadius: 999,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.44))",
  border: "1px solid var(--border-strong)",
  color: "var(--muted)",
  fontSize: "0.88rem",
};

export const statsGridStyle = {
  display: "grid",
  gap: 9,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

export const metricCardStyle = {
  display: "grid",
  gap: 6,
  padding: 8,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.74), rgba(255,255,255,0.34))",
  border: "1px solid var(--border-strong)",
};

export const metricValueStyle = {
  margin: 0,
  fontSize: "1.4rem",
  lineHeight: 1,
};

export const panelStyle = {
  display: "grid",
  gap: 9,
  minHeight: 0,
  padding: "1.5rem",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.38))",
  border: "1px solid var(--border-strong)",
};

export const panelHeadingStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  flexWrap: "wrap" as const,
};

export const sectionTitleStyle = {
  margin: "2px 0 0",
  fontSize: "1rem",
};

export const formStyle = {
  display: "grid",
  gap: 9,
};

export const formActionsStyle = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap" as const,
  alignItems: "center",
  justifySelf: "start" as const,
  marginTop: "1rem",
};

export const formGridStyle = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
};

export const fieldStyle = {
  display: "grid",
  gap: 4,
  color: "var(--muted)",
  fontSize: "0.95rem",
};

export const inputStyle = {
  border: "1px solid rgb(227 215 215 / 68%)",
  padding: "0.75rem 1rem",
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))",
  color: "var(--text)",
  width: "100%",
};

export const textAreaStyle = {
  ...inputStyle,
  resize: "vertical" as const,
};

export const buttonStyle = {
  border: 0,
  padding: "7px 9px",
  background: "linear-gradient(135deg, var(--accent-strong), var(--accent))",
  color: "white",
  cursor: "pointer",
  boxShadow: "0 18px 30px rgba(195, 102, 58, 0.28)",
};

export const secondaryButtonStyle = {
  ...buttonStyle,
  background:
    "linear-gradient(135deg, rgba(49, 44, 40, 0.85), rgba(34, 30, 26, 0.92))",
  boxShadow: "0 18px 30px rgba(35, 29, 25, 0.16)",
};

export const deleteButtonStyle = {
  border: "1px solid #b83d35",
  padding: "7px 9px",
  background: "rgba(184, 61, 53, 0.08)",
  color: "#9e2e28",
  cursor: "pointer",
};

export const actionRowStyle = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap" as const,
};

export const weightControlStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

export const weightStepButtonStyle = {
  ...ghostButtonStyle,
  minWidth: 34,
  textAlign: "center" as const,
};

export const mobileDrawerOverlayStyle = {
  position: "fixed" as const,
  inset: 0,
  zIndex: 40,
  display: "grid",
  pointerEvents: "auto" as const,
};

export const mobileDrawerBackdropStyle = {
  position: "absolute" as const,
  inset: 0,
  border: 0,
  padding: 0,
  margin: 0,
  width: "100%",
  height: "100%",
  background: "rgba(22, 18, 16, 0.24)",
  cursor: "pointer",
};

export const mobileDrawerSheetStyle = {
  position: "relative" as const,
  display: "grid",
  gridTemplateRows: "minmax(0, 1fr)",
  height: "100%",
  minHeight: 0,
  overflow: "hidden",
  padding: 8,
  borderTop: "1px solid var(--border-strong)",
  background: "rgba(245, 244, 241, 0.98)",
  boxShadow: "0 -20px 40px rgba(35, 29, 25, 0.16)",
};

export const listCardStyle = {
  padding: 8,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.84), rgba(255,255,255,0.56))",
  border: "1px solid var(--border-strong)",
};

export const listCardHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
};

export const infoGridStyle = {
  display: "grid",
  gap: 6,
  marginTop: 5,
  color: "var(--muted)",
  fontSize: "0.95rem",
};

export const scrollListStyle = {
  minHeight: 0,
  maxHeight: "100%",
  overflow: "auto",
  display: "grid",
  gap: 6,
};

export const twoColumnLayoutStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(0, 1fr))",
  gap: 9,
  alignItems: "start",
};

export const eyebrowStyle = {
  margin: 0,
  color: "var(--accent)",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  fontSize: "0.72rem",
  fontWeight: 700,
};

export const moduleEyebrowStyle = {
  display: "inline-block",
  color: "var(--accent)",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

export const mutedParagraphStyle = {
  margin: 0,
  color: "var(--muted)",
  fontSize: "1rem",
  lineHeight: 1.5,
  maxWidth: 780,
};

export const softTagStyle = {
  padding: "4px 6px",
  borderRadius: 999,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.74), rgba(255,255,255,0.44))",
  border: "1px solid rgba(255,255,255,0.38)",
  color: "var(--accent)",
  fontSize: "0.85rem",
  justifySelf: "start" as const,
};

export const softPillStyle = {
  padding: "4px 6px",
  borderRadius: 999,
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.74), rgba(255,255,255,0.52))",
  border: "1px solid rgba(255,255,255,0.34)",
  color: "var(--muted)",
  fontSize: "0.85rem",
};

export const moduleShellStyles: Record<
  ModuleKey,
  { background: string; border?: string }
> = {
  treningowy: {
    background: "#ffffff9e",
    border: "1px solid var(--border-strong)",
  },
  raportowy: {
    background: "#ffffff9e",
  },
  analityka: {
    background: "#ffffff9e",
  },
  team: {
    background: "#ffffff9e",
  },
  ustawienia: {
    background: "#ffffff9e",
  },
};

export const topBarStyle = {
  height: 80,
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 12,
  padding: "0 12px",
  overflow: "hidden",
};

export const brandStyle = {
  fontSize: "1rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  whiteSpace: "nowrap" as const,
};

export const headerLeftGroupStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  minWidth: 0,
};

export const athleteSelectorStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
};

export const athleteSelectorLabelStyle = {
  color: "var(--muted)",
  fontSize: "0.75rem",
  whiteSpace: "nowrap" as const,
};

export const athleteSelectStyle = {
  width: "100%",
  maxWidth: 400,
  border: "1px solid var(--border-strong)",
  padding: "5px 7px",
  background: "rgba(255, 250, 243, 0.92)",
  color: "var(--text)",
};
