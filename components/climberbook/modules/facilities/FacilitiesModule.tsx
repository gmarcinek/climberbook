"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/climberbook/common/Button";
import { Input, Select } from "@/components/climberbook/common/FormControls";
import { FormActions } from "@/components/climberbook/common/FormLayout";
import { Panel } from "@/components/climberbook/common/Panel";
import { useViewport } from "@/components/climberbook/hooks/useViewport";
import { useClimberbook } from "@/components/climberbook/providers/ClimberbookProvider";
import {
  moduleEyebrowStyle,
  moduleContainerStyle,
  moduleContentStyle,
  mutedParagraphStyle,
  panelHeadingStyle,
  sectionTitleStyle,
} from "@/components/climberbook/common/styles";
import type {
  FacilityCapabilities,
  FacilityKind,
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

const facilityKindOptions: Array<{ value: FacilityKind; label: string }> = [
  { value: "indoor_wall", label: "Ścianka panelowa" },
  { value: "crag", label: "Rejon skalny" },
  { value: "crag_sector", label: "Sektor w skałach" },
];

const defaultMapCenter = { latitude: 50.0614, longitude: 19.9366 };

const FacilityLocationMap = dynamic(
  () =>
    import("./FacilityLocationMap").then(
      (module) => module.FacilityLocationMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        style={{ minHeight: "320px", border: "1px solid var(--border-strong)" }}
      />
    ),
  },
);

type GeocodingResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export function FacilitiesModule() {
  const app = useClimberbook();
  const viewport = useViewport();
  const [editingFacility, setEditingFacility] = useState<FacilityRecord | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [capabilities, setCapabilities] =
    useState<FacilityCapabilities>(emptyCapabilities);
  const [activeTab, setActiveTab] = useState<"mine" | "global">("mine");
  const [globalSearch, setGlobalSearch] = useState("");
  const [kind, setKind] = useState<FacilityKind>("indoor_wall");
  const [locationLabel, setLocationLabel] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationResults, setLocationResults] = useState<GeocodingResult[]>([]);
  const [activeLocationIndex, setActiveLocationIndex] = useState(-1);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const formPanelRef = useRef<HTMLElement>(null);
  const shouldSkipNextLocationSearch = useRef(false);
  const [formPanelWidth, setFormPanelWidth] = useState(0);

  useEffect(() => {
    const formPanel = formPanelRef.current;
    if (!formPanel) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setFormPanelWidth(entry.contentRect.width);
    });
    observer.observe(formPanel);

    return () => observer.disconnect();
  }, [isFormOpen]);

  useEffect(() => {
    const query = locationLabel.trim();
    setActiveLocationIndex(-1);
    setLocationResults([]);

    if (shouldSkipNextLocationSearch.current) {
      shouldSkipNextLocationSearch.current = false;
      return;
    }

    if (query.length < 3) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Location search failed");
        setLocationResults((await response.json()) as GeocodingResult[]);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setLocationResults([]);
      } finally {
        if (!controller.signal.aborted) setIsSearchingLocation(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [locationLabel]);

  function selectLocation(result: GeocodingResult) {
    shouldSkipNextLocationSearch.current = true;
    setLocationLabel(result.display_name);
    setLatitude(result.lat);
    setLongitude(result.lon);
    setActiveLocationIndex(-1);
    setLocationResults([]);
  }

  function openCreate() {
    setEditingFacility(null);
    setName("");
    setCapabilities(emptyCapabilities());
    setKind("indoor_wall");
    setLocationLabel("");
    setLatitude("");
    setLongitude("");
    setIsFormOpen(true);
  }

  function openEdit(facility: FacilityRecord) {
    setEditingFacility(facility);
    setName(facility.name);
    setCapabilities(facility.capabilities);
    setKind(facility.kind);
    setLocationLabel(facility.locationLabel);
    setLatitude(facility.latitude?.toString() ?? "");
    setLongitude(facility.longitude?.toString() ?? "");
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingFacility(null);
    setName("");
    setCapabilities(emptyCapabilities());
    setKind("indoor_wall");
    setLocationLabel("");
    setLatitude("");
    setLongitude("");
    setIsFormOpen(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    const parsedLatitude = latitude.trim() ? Number(latitude) : null;
    const parsedLongitude = longitude.trim() ? Number(longitude) : null;
    const hasCompleteCoordinates =
      parsedLatitude !== null && parsedLongitude !== null;
    if (
      (parsedLatitude !== null &&
        (!Number.isFinite(parsedLatitude) ||
          parsedLatitude < -90 ||
          parsedLatitude > 90)) ||
      (parsedLongitude !== null &&
        (!Number.isFinite(parsedLongitude) ||
          parsedLongitude < -180 ||
          parsedLongitude > 180)) ||
      (parsedLatitude === null) !== (parsedLongitude === null)
    )
      return;
    const details = {
      kind,
      locationLabel,
      latitude: hasCompleteCoordinates ? parsedLatitude : null,
      longitude: hasCompleteCoordinates ? parsedLongitude : null,
    };

    if (editingFacility) {
      await app.updateFacility(editingFacility, name, capabilities, details);
    } else {
      await app.addFacility(event, capabilities, name, details);
    }
    closeForm();
  }

  function toggleActivity(activity: TrainingSurface) {
    setCapabilities((current) => {
      const isEnabled = current.activities.includes(activity);
      const enablesFirstRopeSector =
        activity === "lina" && !isEnabled && current.ropeWalls.length === 0;

      return {
        ...current,
        activities: isEnabled
          ? current.activities.filter((item) => item !== activity)
          : [...current.activities, activity],
        ropeWalls: enablesFirstRopeSector
          ? [
              {
                name: "",
                lengthMeters: 16,
                inclination: "vertical",
              },
            ]
          : current.ropeWalls,
      };
    });
  }

  function addWall() {
    setCapabilities((current) => ({
      ...current,
      ropeWalls: [
        ...current.ropeWalls,
        {
          name: `Sektor ${current.ropeWalls.length + 1}`,
          lengthMeters: 16,
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

  const privateFacilities = app.facilities.filter(
    (facility) => facility.visibility === "private",
  );
  const globalFacilities = app.facilities
    .filter((facility) => facility.visibility === "global")
    .filter((facility) =>
      facility.name
        .toLocaleLowerCase("pl")
        .includes(globalSearch.trim().toLocaleLowerCase("pl")),
    );
  const visibleFacilities =
    activeTab === "mine" ? privateFacilities : globalFacilities;
  const mapLatitude = Number(latitude);
  const mapLongitude = Number(longitude);
  const hasMapCoordinates =
    latitude.trim() !== "" &&
    longitude.trim() !== "" &&
    Number.isFinite(mapLatitude) &&
    Number.isFinite(mapLongitude) &&
    mapLatitude >= -90 &&
    mapLatitude <= 90 &&
    mapLongitude >= -180 &&
    mapLongitude <= 180;
  const mapCenter = hasMapCoordinates
    ? { latitude: mapLatitude, longitude: mapLongitude }
    : defaultMapCenter;
  const isMobileEditorLayout = viewport.width === 0 || viewport.width < 931;
  const isWideEditorLayout = viewport.width >= 1725;
  const isMobileFormLayout =
    isMobileEditorLayout || (formPanelWidth > 0 && formPanelWidth < 600);
  const locationMap = (
    <FacilityLocationMap
      center={mapCenter}
      height={isMobileEditorLayout ? "320px" : "100%"}
      selectedCoordinates={
        hasMapCoordinates
          ? { latitude: mapLatitude, longitude: mapLongitude }
          : null
      }
      onSelect={(coordinates) => {
        setLatitude(coordinates.latitude.toFixed(6));
        setLongitude(coordinates.longitude.toFixed(6));
        setLocationResults([]);
      }}
    />
  );
  const locationToolbar = (
    <div
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: isMobileFormLayout
          ? "minmax(0, 1fr)"
          : "minmax(0, 1fr) 156px 156px",
        gap: "8px",
        padding: "12px",
        background: "var(--component-card-background)",
        zIndex: 1001,
      }}
    >
      <Input
        id="facility-location-search"
        type="search"
        value={locationLabel}
        onChange={(event) => setLocationLabel(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setActiveLocationIndex(-1);
            setLocationResults([]);
            return;
          }

          if (locationResults.length === 0) return;

          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const direction = event.key === "ArrowDown" ? 1 : -1;
            setActiveLocationIndex(
              (current) =>
                (current + direction + locationResults.length) %
                locationResults.length,
            );
            return;
          }

          if (event.key === "Enter" && activeLocationIndex >= 0) {
            event.preventDefault();
            selectLocation(locationResults[activeLocationIndex]);
          }
        }}
        placeholder="Szukaj miejsca lub adresu"
        aria-label="Szukaj miejsca lub adresu"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="facility-location-results"
        aria-expanded={locationResults.length > 0}
        aria-activedescendant={
          activeLocationIndex >= 0
            ? `facility-location-result-${activeLocationIndex}`
            : undefined
        }
      />
      {!isMobileFormLayout && (
        <>
          <Input
            type="number"
            inputMode="decimal"
            step="0.0000001"
            min="-90"
            max="90"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            placeholder="Szerokość"
            aria-label="Szerokość geograficzna"
          />
          <Input
            type="number"
            inputMode="decimal"
            step="0.0000001"
            min="-180"
            max="180"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            placeholder="Długość"
            aria-label="Długość geograficzna"
          />
        </>
      )}
      {isSearchingLocation && (
        <span
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "12px",
            color: "var(--muted)",
            zIndex: 1002,
          }}
        >
          Szukam lokalizacji...
        </span>
      )}
      {locationResults.length > 0 && (
        <div
          id="facility-location-results"
          role="listbox"
          aria-label="Wyniki wyszukiwania lokalizacji"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: "12px",
            right: isMobileFormLayout ? "12px" : "324px",
            display: "grid",
            border: "1px solid var(--border-strong)",
            background: "var(--component-card-background)",
            boxShadow: "var(--component-modal-shadow)",
            maxHeight: "240px",
            overflowY: "auto",
            zIndex: 1002,
          }}
        >
          {locationResults.map((result, index) => (
            <button
              key={`${result.lat}-${result.lon}`}
              id={`facility-location-result-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeLocationIndex}
              onClick={() => selectLocation(result)}
              style={{
                border: 0,
                borderBottom: "1px solid var(--border)",
                padding: "8px 10px",
                textAlign: "left",
                background:
                  index === activeLocationIndex
                    ? "var(--theme-primary)"
                    : "transparent",
                color:
                  index === activeLocationIndex
                    ? "var(--theme-text-inverse)"
                    : "inherit",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              {result.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const form = (
    <form onSubmit={submit} style={{ display: "grid", gap: "16px" }}>
      <div style={panelHeadingStyle}>
        <div>
          <span style={moduleEyebrowStyle}>
            {editingFacility ? "Edycja" : "Nowy obiekt"}
          </span>
          <h2 id="facility-form-title" style={sectionTitleStyle}>
            {editingFacility ? "Edytuj obiekt" : "Dodaj obiekt"}
          </h2>
        </div>
        <Button variant="secondary" type="button" onClick={closeForm}>
          Wróć do obiektów
        </Button>
      </div>
      <Input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nazwa obiektu"
      />
      <div style={{ display: "grid", gap: "8px", order: 2 }}>
        <label htmlFor="facility-kind">
          <strong>Typ obiektu</strong>
        </label>
        <Select
          id="facility-kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as FacilityKind)}
        >
          {facilityKindOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div style={{ display: "grid", gap: "8px", order: 3 }}>
        <strong>Aktywności</strong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "8px",
          }}
        >
          {activityOptions.map((activity) => (
            <label
              key={activity.value}
              style={{
                display: "flex",
                minWidth: 0,
                gap: "8px",
                alignItems: "center",
                padding: "10px",
                border: "1px solid var(--border-strong)",
                background: capabilities.activities.includes(activity.value)
                  ? "var(--component-card-background)"
                  : "transparent",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={capabilities.activities.includes(activity.value)}
                onChange={() => toggleActivity(activity.value)}
              />
              <span>{activity.label}</span>
            </label>
          ))}
        </div>
      </div>
      {capabilities.activities.includes("lina") && (
        <div style={{ display: "grid", gap: "8px", order: 4 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <strong>Sektory z liną</strong>
            <Button
              type="button"
              size="small"
              onClick={addWall}
              style={{
                minHeight: "32px",
                padding: "0.35rem 0.7rem",
                background: "#fff",
                color: "#151923",
              }}
            >
              + Sektor
            </Button>
          </div>
          {capabilities.ropeWalls.map((wall, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: isMobileFormLayout
                  ? "minmax(0, 1fr)"
                  : "minmax(0, 2fr) 82px minmax(0, 2fr) 48px",
                gap: "8px",
              }}
            >
              <Input
                value={wall.name}
                aria-label={`Nazwa sektora ${index + 1}`}
                placeholder="Nazwa sektora"
                onChange={(event) =>
                  updateWall(index, { name: event.target.value })
                }
              />
              <div style={{ position: "relative" }}>
                <Input
                  value={String(wall.lengthMeters)}
                  type="number"
                  min="1"
                  aria-label={`Długość sektora ${index + 1}`}
                  style={{ paddingRight: "1.6rem" }}
                  onChange={(event) =>
                    updateWall(index, {
                      lengthMeters: Number(event.target.value) || 1,
                    })
                  }
                />
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: "0.65rem",
                    color: "var(--muted)",
                    pointerEvents: "none",
                    transform: "translateY(-50%)",
                  }}
                >
                  m
                </span>
              </div>
              <Select
                value={wall.inclination}
                aria-label={`Profil sektora ${index + 1}`}
                onChange={(event) =>
                  updateWall(index, {
                    inclination: event.target.value as RopeWallInclination,
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
                variant="ghost"
                aria-label={`Usuń sektor ${index + 1}`}
                style={isMobileFormLayout ? { justifySelf: "end" } : undefined}
                onClick={() =>
                  setCapabilities((current) => ({
                    ...current,
                    ropeWalls: current.ropeWalls.filter(
                      (_wall, wallIndex) => wallIndex !== index,
                    ),
                  }))
                }
              >
                {isMobileFormLayout ? "Usuń" : "×"}
              </Button>
            </div>
          ))}
        </div>
      )}
      <FormActions
        layout="inline"
        style={{ order: 7, justifyContent: "space-between" }}
      >
        <Button type="submit">
          {editingFacility ? "Zapisz zmiany" : "Dodaj obiekt"}
        </Button>
        <Button variant="secondary" type="button" onClick={closeForm}>
          Anuluj
        </Button>
      </FormActions>
    </form>
  );

  if (isFormOpen) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobileEditorLayout
            ? "minmax(0, 1fr)"
            : isWideEditorLayout
              ? "minmax(0, 1fr) minmax(0, 840px)"
              : "minmax(0, 1fr) minmax(0, 410px)",
          height: isMobileEditorLayout ? "auto" : "calc(100dvh - 104px)",
          minHeight: isMobileEditorLayout ? 0 : "640px",
          width: "100vw",
          margin: "-12px calc(50% - 50vw) -8px",
          background: "var(--theme-app-background)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateRows: "auto minmax(0, 1fr)",
            minWidth: 0,
            overflow: "hidden",
            order: isMobileEditorLayout ? 2 : 1,
            borderTop: isMobileEditorLayout
              ? "1px solid var(--border-strong)"
              : undefined,
          }}
        >
          {locationToolbar}
          <div style={{ minHeight: 0 }}>{locationMap}</div>
        </div>
        <aside
          aria-label="Formularz obiektu"
          ref={formPanelRef}
          style={{
            minWidth: 0,
            overflowY: isMobileEditorLayout ? "visible" : "auto",
            padding: "20px",
            order: isMobileEditorLayout ? 1 : 2,
          }}
        >
          <Panel gap="md">{form}</Panel>
        </aside>
      </div>
    );
  }

  return (
    <div style={{ ...moduleContentStyle, ...moduleContainerStyle }}>
      <Panel gap="md">
        <div style={panelHeadingStyle}>
          <div>
            <span style={moduleEyebrowStyle}>Infrastruktura</span>
            <h2 style={sectionTitleStyle}>Obiekty</h2>
          </div>
          {activeTab === "mine" && (
            <Button onClick={openCreate}>+ Obiekt</Button>
          )}
        </div>
        <div
          role="tablist"
          aria-label="Katalog obiektów"
          style={{
            display: "flex",
            gap: "6px",
            borderBottom: "1px solid var(--border-strong)",
          }}
        >
          {(
            [
              ["mine", "Moje obiekty"],
              ["global", "Globalne obiekty"],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              style={{
                border: 0,
                borderBottom:
                  activeTab === tab
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                padding: "8px 12px",
                background: "transparent",
                color: activeTab === tab ? "var(--theme-text)" : "var(--muted)",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {activeTab === "global" && (
          <Input
            type="search"
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
            placeholder="Szukaj globalnego obiektu"
            aria-label="Szukaj globalnego obiektu"
          />
        )}
        {visibleFacilities.length === 0 ? (
          <p style={mutedParagraphStyle}>
            {activeTab === "mine"
              ? "Dodaj pierwszy prywatny obiekt."
              : "Brak globalnych obiektów pasujących do wyszukiwania."}
          </p>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {visibleFacilities.map((facility) => (
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
                    {facility.capabilities.ropeWalls.length} sektorów z liną
                  </div>
                </div>
                {activeTab === "mine" && (
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
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
