"use client";

import type { FormEvent } from "react";
import {
  buttonStyle,
  fieldStyle,
  formActionsStyle,
  formGridStyle,
  formStyle,
  inputStyle,
  moduleEyebrowStyle,
  panelHeadingStyle,
  panelStyle,
  sectionTitleStyle,
  softTagStyle,
  textAreaStyle,
} from "@/components/climberbook/common/styles";

type AscentDraftValues = {
  date: string;
  source: "panel" | "skala";
  routeName: string;
  suggestedGrade: string;
  subjectiveGrade: string;
  notes: string;
};
type AscentFormWidgetProps = {
  ascentDraft: AscentDraftValues;
  onAscentDraftChange: (draft: AscentDraftValues) => void;
  onAscentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  frenchGradeOptions: string[];
};

export function AscentFormWidget({
  ascentDraft,
  onAscentDraftChange,
  onAscentSubmit,
  frenchGradeOptions,
}: AscentFormWidgetProps) {
  return (
    <section style={panelStyle}>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>Historia przejść</span>
          <h2 style={sectionTitleStyle}>Panel i skała</h2>
        </div>
        <span style={softTagStyle}>Dodawanie ręczne</span>
      </div>
      <form onSubmit={onAscentSubmit} style={formStyle}>
        <div style={formGridStyle}>
          <label style={fieldStyle}>
            Data
            <input
              value={ascentDraft.date}
              onChange={(event) =>
                onAscentDraftChange({
                  ...ascentDraft,
                  date: event.target.value,
                })
              }
              type="date"
              required
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            Źródło
            <select
              value={ascentDraft.source}
              onChange={(event) =>
                onAscentDraftChange({
                  ...ascentDraft,
                  source: event.target.value as "panel" | "skala",
                })
              }
              style={inputStyle}
            >
              <option value="panel">Panel</option>
              <option value="skala">Skała</option>
            </select>
          </label>
          <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            Nazwa drogi / problemu
            <input
              value={ascentDraft.routeName}
              onChange={(event) =>
                onAscentDraftChange({
                  ...ascentDraft,
                  routeName: event.target.value,
                })
              }
              required
              style={inputStyle}
            />
          </label>
          <label style={fieldStyle}>
            Wycena sugerowana
            <select
              value={ascentDraft.suggestedGrade}
              onChange={(event) =>
                onAscentDraftChange({
                  ...ascentDraft,
                  suggestedGrade: event.target.value,
                })
              }
              required
              style={inputStyle}
            >
              {frenchGradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            Wycena subiektywna
            <select
              value={ascentDraft.subjectiveGrade}
              onChange={(event) =>
                onAscentDraftChange({
                  ...ascentDraft,
                  subjectiveGrade: event.target.value,
                })
              }
              required
              style={inputStyle}
            >
              {frenchGradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>
          <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            Notatki
            <textarea
              value={ascentDraft.notes}
              onChange={(event) =>
                onAscentDraftChange({
                  ...ascentDraft,
                  notes: event.target.value,
                })
              }
              rows={3}
              style={textAreaStyle}
            />
          </label>
        </div>
        <div style={formActionsStyle}>
          <button type="submit" style={buttonStyle}>
            Dodaj przejście
          </button>
        </div>
      </form>
    </section>
  );
}
