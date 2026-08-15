"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil } from "lucide-react";
import { EmotButton } from "@/components/climberbook/common/Button";
import { Panel } from "@/components/climberbook/common/Panel";
import { inputStyle, moduleEyebrowStyle, panelHeadingStyle, sectionTitleStyle, softTagStyle } from "@/components/climberbook/common/styles";
import { getRopeGradeColor, getRopeGradeIndex } from "@/components/climberbook/common/training";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { getMonthLabel, toDate } from "@/components/training-calendar/training-calendar.helpers";
import type { AscentRecord } from "@/lib/climbs-db";

type Props = { ascents: AscentRecord[]; editingAscentId: number | null; onEdit: (ascent: AscentRecord) => void };
const gradeScale = ["4", "5", "6", "7", "8", "9"].flatMap((base) => ["a", "a+", "b", "b+", "c", "c+"].map((suffix) => `${base}${suffix}`));

function gradeColor(grade: string) {
  const value = grade.trim();
  const normalized = getRopeGradeIndex(value) >= 0 ? value : value.match(/\d+[abc]\+?/i)?.[0] ?? "";
  return normalized && getRopeGradeIndex(normalized) >= 0 ? getRopeGradeColor(normalized) : "rgba(185, 176, 168, 0.22)";
}

function GradeChip({ grade }: { grade: string }) {
  return <strong style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 30, minWidth: 46, padding: "0 8px", borderRadius: 999, background: gradeColor(grade), color: "var(--text)", boxShadow: "inset 0 0 0 1px rgba(24, 33, 43, 0.08)" }}>{grade || "-"}</strong>;
}

function GradeProgress({ label, grade }: { label: string; grade: string }) {
  const normalized = grade.trim().toLocaleLowerCase("pl-PL").match(/\d[abc]\+?/i)?.[0];
  const index = normalized ? gradeScale.indexOf(normalized) : -1;
  const progress = index < 0 ? 0 : (index / (gradeScale.length - 1)) * 100;
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 46px", gap: 8, alignItems: "center" }}><div aria-label={`${label}: ${grade || "brak"}, skala od 4a do 9c+`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} role="progressbar" style={{ height: 8, overflow: "hidden", borderRadius: 999, background: "rgba(28, 61, 89, 0.12)" }}><div style={{ width: `${progress}%`, height: "100%", minWidth: progress ? 8 : 0, borderRadius: "inherit", background: gradeColor(grade) }} /></div><span style={{ color: "var(--muted)", fontSize: 11, textAlign: "right" }}>{grade || "-"}</span></div>;
}

export function ReportedAscentsListWidget({ ascents, editingAscentId, onEdit }: Props) {
  const { isMobileHeader, width } = useViewport();
  const [query, setQuery] = useState("");
  const [client, setClient] = useState(false);
  const [searchPinned, setSearchPinned] = useState(false);
  const [searchBounds, setSearchBounds] = useState<{ left: number; width: number } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const filtered = query.trim() ? ascents.filter((ascent) => [ascent.routeName, ascent.suggestedGrade, ascent.subjectiveGrade].some((value) => value.toLocaleLowerCase("pl-PL").includes(query.trim().toLocaleLowerCase("pl-PL")))) : ascents;
  const desktop = width >= 1024;
  const groups = filtered.reduce<Array<{ year: number; month: number; id: string }>>((result, ascent) => { const date = toDate(ascent.date); const previous = result.at(-1); if (!previous || previous.year !== date.getFullYear() || previous.month !== date.getMonth()) result.push({ year: date.getFullYear(), month: date.getMonth(), id: `reported-ascents-${date.getFullYear()}-${date.getMonth()}` }); return result; }, []);
  const newestYear = groups[0]?.year;
  const yearGroups = groups.reduce<Array<{ year: number; months: Array<{ month: number; id: string }> }>>((result, group) => { const previous = result.at(-1); if (!previous || previous.year !== group.year) result.push({ year: group.year, months: [] }); result.at(-1)!.months.push({ month: group.month, id: group.id }); return result; }, []);
  const defaultOpenYears = newestYear !== undefined ? [newestYear, newestYear - 1] : [];
  const [openYears, setOpenYears] = useState<number[] | null>(null);
  const effectiveOpenYears = openYears ?? defaultOpenYears;
  const toggleYear = (year: number) => setOpenYears((current) => { const base = current ?? defaultOpenYears; return base.length === 1 && base[0] === year ? [] : [year]; });

  useEffect(() => setClient(true), []);
  useEffect(() => {
    if (!isMobileHeader) { setSearchPinned(false); return; }
    const update = () => { const node = searchRef.current; if (!node) return; const rect = node.getBoundingClientRect(); setSearchPinned(rect.top <= 8); setSearchBounds({ left: rect.left, width: rect.width }); };
    update(); window.addEventListener("scroll", update, { passive: true }); window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [isMobileHeader]);

  const search = <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj po nazwie lub wycenie" aria-label="Szukaj przejść po nazwie lub wycenie" style={inputStyle} />;
  return <Panel style={{ width: "100%", minWidth: 0, padding: "1rem", background: isMobileHeader ? "transparent" : "var(--component-panel-background)" }}>
    <div style={panelHeadingStyle}><div><span style={moduleEyebrowStyle}>Raporty</span><h2 style={sectionTitleStyle}>Lista zaraportowanych przejść</h2></div><span style={softTagStyle}>{filtered.length} z {ascents.length} wpisów</span></div>
    <div ref={searchRef} style={{ minHeight: 47 }}>{searchPinned ? null : search}</div>
    {client && isMobileHeader && searchPinned && searchBounds ? createPortal(<div style={{ position: "fixed", top: 8, left: searchBounds.left, width: searchBounds.width, zIndex: 20, background: "rgb(255, 250, 243)", boxShadow: "0 6px 14px rgba(72, 49, 33, 0.14)" }}>{search}</div>, document.body) : null}
    <div style={{ display: "grid", gridTemplateColumns: desktop ? "minmax(150px, 180px) minmax(0, 1fr)" : "minmax(0, 1fr)", gap: desktop ? 20 : 0 }}>
      {desktop && groups.length ? <div><nav aria-label="Spis treści przejść" style={{ position: "sticky", top: 92, display: "grid", gap: 4 }}><span style={{ color: "var(--muted)", fontSize: 11 }}>Przejścia</span>{yearGroups.map((yearGroup) => { const isOpen = effectiveOpenYears.includes(yearGroup.year); return <div key={yearGroup.year}><button type="button" onClick={() => toggleYear(yearGroup.year)} aria-expanded={isOpen} style={{ display: "flex", alignItems: "center", gap: 4, width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--text)", fontSize: "1rem", fontWeight: 700, textAlign: "left" }}><span aria-hidden="true" style={{ display: "inline-block", fontSize: "0.7rem", color: "var(--muted)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s ease" }}>▸</span>{yearGroup.year}</button>{isOpen ? <div style={{ display: "grid", gap: 2, marginTop: 2 }}>{yearGroup.months.map((month) => <a key={month.id} href={`#${month.id}`} style={{ color: "var(--muted)", fontSize: "0.82rem", paddingLeft: 14, textDecoration: "none" }}>{getMonthLabel(month.month)}</a>)}</div> : null}</div>; })}</nav></div> : null}
      <div style={{ display: "grid", gap: 10 }}>{filtered.length === 0 ? <p style={{ margin: 0, color: "var(--muted)" }}>Brak przejść pasujących do wyszukiwania.</p> : null}{filtered.map((ascent, index) => { const date = toDate(ascent.date); const previous = filtered[index - 1]; const previousDate = previous ? toDate(previous.date) : null; const newMonth = !previousDate || previousDate.getFullYear() !== date.getFullYear() || previousDate.getMonth() !== date.getMonth(); const editing = ascent.id === editingAscentId; return <Fragment key={ascent.id ?? `${ascent.date}-${ascent.routeName}`}>{newMonth ? <div id={`reported-ascents-${date.getFullYear()}-${date.getMonth()}`} style={{ marginTop: index ? "1rem" : 0, scrollMarginTop: 92, textAlign: "center", textTransform: "capitalize", fontSize: "1rem" }}><span>{getMonthLabel(date.getMonth())}</span><span style={{ color: "var(--component-calendar-highlight)", fontWeight: 600 }}>{` ${date.getFullYear()}`}</span></div> : null}<article style={{ display: "grid", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(28, 61, 89, 0.05)", border: editing ? "1px solid rgba(195, 102, 58, 0.4)" : "1px solid rgba(28, 61, 89, 0.08)" }}><div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div style={{ display: "grid", gap: 6 }}><div style={{ color: "var(--muted)", fontSize: 12 }}>{ascent.date} · {ascent.source === "panel" ? "Panel" : "Skała"}</div><h3 style={{ margin: 0, fontSize: "1rem" }}>{ascent.style?.trim() ? `${ascent.style.trim().toUpperCase()} - ${ascent.routeName}` : ascent.routeName}</h3></div><EmotButton aria-label={editing ? "Edytujesz przejście" : "Edytuj przejście"} title={editing ? "Edytujesz przejście" : "Edytuj przejście"} variant="ghost" onClick={() => onEdit(ascent)}><Pencil size={18} aria-hidden="true" /></EmotButton></div><div style={{ display: "grid", gridTemplateColumns: isMobileHeader ? "minmax(0, 1fr)" : "auto minmax(220px, 1fr)", alignItems: "start", gap: 16 }}><div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}><div style={{ display: "grid", gap: 8 }}><span style={{ color: "var(--muted)", fontSize: 11 }}>Wycena</span><GradeChip grade={ascent.suggestedGrade} /></div><div style={{ display: "grid", gap: 8 }}><span style={{ color: "var(--muted)", fontSize: 11 }}>Subiektywna</span><GradeChip grade={ascent.subjectiveGrade} /></div></div><div style={{ display: "grid", gap: 6 }}><span style={{ color: "var(--muted)", fontSize: 11 }}>Porównanie</span><GradeProgress label="Wycena" grade={ascent.suggestedGrade} /><GradeProgress label="Wycena subiektywna" grade={ascent.subjectiveGrade} /></div></div><div style={{ color: "var(--text)", overflowWrap: "anywhere" }}>{ascent.notes?.trim() || "Brak opisu dla tego wpisu."}</div></article></Fragment>; })}</div>
    </div>
  </Panel>;
}