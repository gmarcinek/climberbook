"use client";

import type { FormEvent } from "react";
import {
  Form,
  FormActions,
  FormGrid,
  formLayoutClassNames,
} from "@/components/climberbook/common/FormLayout";
import {
  fieldStyle,
  inputStyle,
  moduleEyebrowStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
  textAreaStyle,
} from "@/components/climberbook/common/styles";
import { Button } from "@/components/climberbook/common/Button";

type AscentDraftValues = {
  date: string;
  source: "panel" | "skala";
  routeName: string;
  suggestedGrade: string;
  subjectiveGrade: string;
  style: string;
  notes: string;
};
type AscentFormWidgetProps = {
  ascentDraft: AscentDraftValues;
  editingAscentId: number | null;
  onAscentDraftChange: (draft: AscentDraftValues) => void;
  onAscentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  frenchGradeOptions: string[];
};

export function AscentFormWidget({
  ascentDraft,
  editingAscentId,
  onAscentDraftChange,
  onAscentSubmit,
  onCancelEdit,
  frenchGradeOptions,
}: AscentFormWidgetProps) {
  const isEditing = editingAscentId !== null;
  const styleOptions = ["", "OS", "FL", "RP", "TR", "GO"];
  const availableStyleOptions = styleOptions.includes(ascentDraft.style)
    ? styleOptions
    : [...styleOptions, ascentDraft.style];

  return (
    <Form
      onSubmit={onAscentSubmit}
      header={
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Historia przejść</span>
            <h2 id="ascent-form-title" style={sectionTitleStyle}>
              Panel i skała
            </h2>
          </div>
          <span style={softTagStyle}>
            {isEditing ? "Edycja wpisu" : "Dodawanie ręczne"}
          </span>
        </div>
      }
    >
      <FormGrid>
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
        <label style={fieldStyle} className={formLayoutClassNames.fullSpan}>
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
        <label style={fieldStyle}>
          Styl (opcjonalnie)
          <select
            value={ascentDraft.style}
            onChange={(event) =>
              onAscentDraftChange({
                ...ascentDraft,
                style: event.target.value,
              })
            }
            style={inputStyle}
          >
            {availableStyleOptions.map((style) => (
              <option key={style || "none"} value={style}>
                {style || "Nie podano"}
              </option>
            ))}
          </select>
        </label>
        <label style={fieldStyle} className={formLayoutClassNames.fullSpan}>
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
      </FormGrid>
      <FormActions
        style={
          isEditing
            ? {
                flexDirection: "row",
                justifyContent: "space-between",
                justifySelf: "stretch",
                width: "100%",
              }
            : undefined
        }
      >
        <Button
          type="submit"
          variant="tertiary"
          style={isEditing ? { padding: "7px 1rem", width: "auto" } : undefined}
        >
          {isEditing ? "Zapisz" : "Dodaj przejście"}
        </Button>
        {isEditing ? (
          <Button
            variant="quadrary"
            style={{
              padding: "7px 1rem",
              width: "auto",
            }}
            onClick={onCancelEdit}
          >
            Anuluj
          </Button>
        ) : null}
      </FormActions>
    </Form>
  );
}
