"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/climberbook/common/Button";
import { Input, Select } from "@/components/climberbook/common/FormControls";
import { FormActions } from "@/components/climberbook/common/FormLayout";
import { Modal } from "@/components/climberbook/common/Modal";
import { Panel } from "@/components/climberbook/common/Panel";
import { useClimberbook } from "@/components/climberbook/providers/ClimberbookProvider";
import {
  moduleEyebrowStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
  softTagStyle,
} from "@/components/climberbook/common/styles";
import type {
  FacilityCapabilities,
  FacilityRecord,
  RopeWallInclination,
  TrainingSurface,
} from "@/lib/climbs-db";

const activityOptions: Array<{ value: TrainingSurface; label: string }> = [
  { value: "lina", label: "Lina" },
  { value: "baldy", label: "Baldy" },
  { value: "moon", label: "Moonboard" },
  { value: "kilter", label: "Kilterboard" },
  { value: "spraywall", label: "Spray" },
  { value: "chwytotablica", label: "Chwytotablica" },
  { value: "campus", label: "Campus" },
  { value: "drazek", label: "Drążek" },
  { value: "silownia", label: "Siłownia" },
];

const inclinationOptions: Array<{ value: RopeWallInclination; label: string }> =
  [
    { value: "slab", label: "Płyta" },
    { value: "vertical", label: "Pion" },
    { value: "slight_overhang", label: "Lekki przewies" },
    { value: "overhang", label: "Przewies" },
    { value: "steep", label: "Mocny przewies" },
  ];

const emptyCapabilities = (): FacilityCapabilities => ({
  activities: [],
  ropeWalls: [],
});

export function FacilitiesModule() {
  const app = useClimberbook();
  const [editingFacility, setEditingFacility] = useState<FacilityRecord | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [capabilities, setCapabilities] =
    useState<FacilityCapabilities>(emptyCapabilities);

  function openCreate() {
    setEditingFacility(null);
    setName("");
    setCapabilities(emptyCapabilities());
    setIsFormOpen(true);
  }

  function openEdit(facility: FacilityRecord) {
    setEditingFacility(facility);
    setName(facility.name);
    setCapabilities(facility.capabilities);
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingFacility(null);
    setName("");
    setCapabilities(emptyCapabilities());
    setIsFormOpen(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    if (editingFacility) {
      await app.updateFacility(editingFacility, name, capabilities);
    } else {
      await app.addFacility(event, capabilities, name);
    }
    closeForm();
  }

  function toggleActivity(activity: TrainingSurface) {
    setCapabilities((current) => ({
      ...current,
      activities: current.activities.includes(activity)
        ? current.activities.filter((item) => item !== activity)
        : [...current.activities, activity],
    }));
  }

  function addWall() {
    setCapabilities((current) => ({
      ...current,
      ropeWalls: [
        ...current.ropeWalls,
        {
          name: `Ściana ${current.ropeWalls.length + 1}`,
          lengthMeters: 18,
          inclination: "vertical",
        },
      ],
    }));
  }

  function updateWall(
    index: number,
    changes: Partial<FacilityCapabilities["ropeWalls"][number]>,
  ) {
    setCapabilities((current) => ({
      ...current,
      ropeWalls: current.ropeWalls.map((wall, wallIndex) =>
        wallIndex === index ? { ...wall, ...changes } : wall,
      ),
    }));
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "16px",
        width: "100%",
        maxWidth: "980px",
        margin: "0 auto",
      }}
    >
      <Panel gap="md">
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Infrastruktura</span>
            <h2 style={sectionTitleStyle}>Obiekty</h2>
          </div>
          <Button onClick={openCreate}>+ Obiekt</Button>
        </div>
        {app.facilities.length === 0 ? (
          <p style={mutedParagraphStyle}>Dodaj pierwszy obiekt.</p>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {app.facilities.map((facility) => (
              <div
                key={facility.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                  padding: "12px",
                  border: "1px solid var(--border-strong)",
                }}
              >
                <div>
                  <strong>{facility.name}</strong>
                  <div style={{ color: "var(--muted)", fontSize: "0.86rem" }}>
                    {facility.capabilities.activities.length} aktywności ·{" "}
                    {facility.capabilities.ropeWalls.length} ścian z liną
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => openEdit(facility)}
                  >
                    Edytuj
                  </Button>
                  <Button
                    variant="quadrary"
                    size="small"
                    onClick={() => void app.deleteFacility(facility)}
                  >
                    Usuń
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {isFormOpen && (
        <Modal labelledBy="facility-form-title" onClose={closeForm}>
          <form onSubmit={submit} style={{ display: "grid", gap: "16px" }}>
            <div style={panelHeadingStyle}>
              <div>
                <span style={moduleEyebrowStyle}>
                  {editingFacility ? "Edycja" : "Nowy"}
                </span>
                <h2 id="facility-form-title" style={sectionTitleStyle}>
                  {editingFacility ? "Edytuj obiekt" : "Dodaj obiekt"}
                </h2>
              </div>
            </div>
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nazwa obiektu"
            />
            <div style={{ display: "grid", gap: "8px" }}>
              <strong>Aktywności</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {activityOptions.map((activity) => (
                  <label
                    key={activity.value}
                    style={{
                      display: "flex",
                      gap: "5px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={capabilities.activities.includes(activity.value)}
                      onChange={() => toggleActivity(activity.value)}
                    />
                    {activity.label}
                  </label>
                ))}
              </div>
            </div>
            {capabilities.activities.includes("lina") && (
              <div style={{ display: "grid", gap: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong>Ściany z liną</strong>
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    onClick={addWall}
                  >
                    + Ściana
                  </Button>
                </div>
                {capabilities.ropeWalls.map((wall, index) => (
                  <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(0, 2fr) 82px minmax(0, 2fr) 48px",
                      gap: "8px",
                    }}
                  >
                    <Input
                      value={wall.name}
                      aria-label={`Nazwa ściany ${index + 1}`}
                      onChange={(event) =>
                        updateWall(index, { name: event.target.value })
                      }
                    />
                    <Input
                      value={String(wall.lengthMeters)}
                      type="number"
                      min="1"
                      aria-label={`Długość ściany ${index + 1}`}
                      onChange={(event) =>
                        updateWall(index, {
                          lengthMeters: Number(event.target.value) || 1,
                        })
                      }
                    />
                    <Select
                      value={wall.inclination}
                      aria-label={`Profil ściany ${index + 1}`}
                      onChange={(event) =>
                        updateWall(index, {
                          inclination: event.target
                            .value as RopeWallInclination,
                        })
                      }
                    >
                      {inclinationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      size="small"
                      variant="secondary"
                      aria-label={`Usuń ścianę ${index + 1}`}
                      onClick={() =>
                        setCapabilities((current) => ({
                          ...current,
                          ropeWalls: current.ropeWalls.filter(
                            (_wall, wallIndex) => wallIndex !== index,
                          ),
                        }))
                      }
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <FormActions layout="inline">
              <Button type="submit">
                {editingFacility ? "Zapisz zmiany" : "Dodaj obiekt"}
              </Button>
              <Button variant="secondary" onClick={closeForm}>
                Anuluj
              </Button>
            </FormActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
