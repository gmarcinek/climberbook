"use client";

import { useEffect, useState } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Pane,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { divIcon, geoJSON, type PathOptions } from "leaflet";
import { ArrowDownToLine, Helicopter } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  capabilityMarkerCoordinates,
  climbingAreas,
  type ClimbingArea,
} from "./climbing-areas";
import type { MapRecord } from "@/lib/map-records";
import {
  provisionalCountryRatings,
  regionalRescueRatings,
  rescueProfiles,
  type RescueProfile,
} from "./rescue-data";

export type MapMetric = "readiness" | "time" | "helicopter";
type NutsProperties = {
  NUTS_ID?: string;
  NUTS_NAME?: string;
  CNTR_CODE?: string;
  NAME_LATN?: string;
};
export type RescueRegion = {
  id: string;
  name: string;
  countryCode: string;
  feature: Feature<Geometry, NutsProperties>;
};

const geoJsonUrl =
  "https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2024_4326_LEVL_1.geojson";
const colors = {
  elite: "#073b2b",
  leading: "#176b4d",
  strong: "#4f9158",
  adequate: "#91bd68",
  guarded: "#dfc447",
  limited: "#e4872d",
  critical: "#c83f32",
  unknown: "#717a75",
};

function getRegion(feature: Feature<Geometry, NutsProperties>): RescueRegion {
  const properties = feature.properties ?? {};
  return {
    id: properties.NUTS_ID ?? String(feature.id ?? properties.NUTS_NAME),
    name: properties.NUTS_NAME ?? properties.NAME_LATN ?? "Nieznany region",
    countryCode:
      properties.CNTR_CODE === "GR" ? "EL" : (properties.CNTR_CODE ?? ""),
    feature,
  };
}

function getFillColor(
  regionId: string,
  countryCode: string,
  profile: RescueProfile | undefined,
  metric: MapMetric,
) {
  const rating =
    regionalRescueRatings[regionId] ??
    profile?.rating ??
    provisionalCountryRatings[countryCode];
  if (!rating) return colors.unknown;
  if (metric === "readiness" || !profile) return colors[rating];
  if (metric === "helicopter")
    return profile.helicopterCapability === "dedicated"
      ? colors.leading
      : profile.helicopterCapability === "mixed"
        ? colors.limited
        : colors.critical;
  return colors[rating];
}

function MapFocus({ region }: { region: RescueRegion | null }) {
  const map = useMap();
  useEffect(() => {
    if (!region) return;
    const bounds = geoJSON(region.feature).getBounds();
    if (bounds.isValid())
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 7 });
  }, [map, region]);
  return null;
}

function MapResize({ layoutWidth }: { layoutWidth: number }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize({ pan: false });
  }, [layoutWidth, map]);
  return null;
}

function getHelicopterIcon(hasHoist: boolean) {
  return divIcon({
    className: `rescue-helicopter-marker${hasHoist ? " rescue-helicopter-marker--hoist" : ""}`,
    html: renderToStaticMarkup(
      <span aria-hidden="true">
        <Helicopter size={24} strokeWidth={2.2} />
        {hasHoist ? <ArrowDownToLine size={12} strokeWidth={2.8} /> : null}
      </span>,
    ),
    iconAnchor: [18, 18],
    iconSize: [36, 36],
  });
}

export function RescueMap({
  metric,
  selectedRegion,
  onRegionChange,
  onRegionsLoaded,
  showClimbingAreas,
  layoutWidth,
}: {
  metric: MapMetric;
  selectedRegion: RescueRegion | null;
  onRegionChange: (region: RescueRegion) => void;
  onRegionsLoaded: (regions: RescueRegion[]) => void;
  showClimbingAreas: boolean;
  layoutWidth: number;
}) {
  const [collection, setCollection] = useState<FeatureCollection<
    Geometry,
    NutsProperties
  > | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [storedClimbingAreas, setStoredClimbingAreas] = useState<
    ClimbingArea[]
  >([]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadRegions() {
      try {
        const response = await fetch(geoJsonUrl, { signal: controller.signal });
        if (!response.ok) throw new Error("region fetch failed");
        const data = (await response.json()) as FeatureCollection<
          Geometry,
          NutsProperties
        >;
        setCollection(data);
        onRegionsLoaded(data.features.map(getRegion));
        setLoadState("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setLoadState("error");
      }
    }
    void loadRegions();
    return () => controller.abort();
  }, [onRegionsLoaded]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadStoredClimbingAreas() {
      try {
        const response = await fetch("/api/maps/records?kind=climbing_area", {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { records?: MapRecord[] };
        setStoredClimbingAreas(
          (payload.records ?? []).flatMap((record) =>
            record.latitude === null || record.longitude === null
              ? []
              : [
                  {
                    id: record.slug,
                    name: record.name,
                    country: record.countryCode,
                    latitude: record.latitude,
                    longitude: record.longitude,
                    disciplines:
                      typeof record.details.disciplines === "string"
                        ? record.details.disciplines
                        : "do uzupełnienia",
                    summary: record.summary,
                    sources: record.sources,
                  },
                ],
          ),
        );
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStoredClimbingAreas([]);
      }
    }
    void loadStoredClimbingAreas();
    return () => controller.abort();
  }, []);

  const visibleClimbingAreas = [
    ...climbingAreas.filter(
      (area) => !storedClimbingAreas.some((stored) => stored.id === area.id),
    ),
    ...storedClimbingAreas,
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer
        center={[45.57, 13.86]}
        zoom={5}
        minZoom={5}
        maxZoom={9}
        scrollWheelZoom
        style={{ width: "100%", height: "100%", background: "#dce4e1" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | Regions: <a href="https://ec.europa.eu/eurostat/web/gisco">Eurostat GISCO</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {collection ? (
          <GeoJSON
            key={`${metric}-${selectedRegion?.id ?? "none"}`}
            data={collection}
            style={(feature): PathOptions => {
              const region = feature
                ? getRegion(feature as Feature<Geometry, NutsProperties>)
                : null;
              const profile = region
                ? rescueProfiles[region.countryCode]
                : undefined;
              const rating = region
                ? (regionalRescueRatings[region.id] ??
                  profile?.rating ??
                  provisionalCountryRatings[region.countryCode])
                : undefined;
              const selected = region?.id === selectedRegion?.id;
              return {
                color: selected ? "#17271e" : "#ffffff",
                fillColor: getFillColor(
                  region?.id ?? "",
                  region?.countryCode ?? "",
                  profile,
                  metric,
                ),
                fillOpacity: rating ? 0.78 : 0.48,
                opacity: 0.9,
                weight: selected ? 3 : 1,
              };
            }}
            onEachFeature={(feature, layer) => {
              const region = getRegion(
                feature as Feature<Geometry, NutsProperties>,
              );
              const profile = rescueProfiles[region.countryCode];
              layer.on({ click: () => onRegionChange(region) });
            }}
          />
        ) : null}
        {collection
          ? Object.entries(capabilityMarkerCoordinates).map(
              ([countryCode, coordinates]) => {
                const profile = rescueProfiles[countryCode];
                if (!profile) return null;
                const hasHoist = (profile.fleet.hoistEquipped ?? 0) > 0;
                if ((profile.fleet.helicopters ?? 0) <= 0 && !hasHoist)
                  return null;
                const countryRegion = collection.features
                  .map(getRegion)
                  .find((region) => region.countryCode === countryCode);
                return (
                  <Marker
                    key={countryCode}
                    position={coordinates}
                    icon={getHelicopterIcon(hasHoist)}
                    eventHandlers={{
                      click: () => {
                        if (countryRegion) onRegionChange(countryRegion);
                      },
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -18]}>
                      {profile.country}: śmigłowce{" "}
                      {profile.fleet.helicoptersLabel}, wyciągarki{" "}
                      {profile.fleet.hoistEquippedLabel}
                    </Tooltip>
                  </Marker>
                );
              },
            )
          : null}
        {showClimbingAreas ? (
          <Pane name="climbing-areas" style={{ zIndex: 700 }}>
            {visibleClimbingAreas.map((area) => (
              <CircleMarker
                key={area.id}
                center={[area.latitude, area.longitude]}
                radius={5}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: "#17271e",
                  fillOpacity: 1,
                  weight: 2,
                }}
              >
                <Tooltip direction="top" offset={[0, -5]}>
                  {area.name}
                </Tooltip>
                <Popup>
                  <strong>{area.name}</strong>
                  <br />
                  {area.country} · {area.disciplines}
                  {area.summary ? (
                    <>
                      <br />
                      {area.summary}
                    </>
                  ) : null}
                  {area.sources?.map((source) => (
                    <span key={source.url}>
                      <br />
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.title}
                      </a>
                    </span>
                  ))}
                </Popup>
              </CircleMarker>
            ))}
          </Pane>
        ) : null}
        <MapFocus region={selectedRegion} />
        <MapResize layoutWidth={layoutWidth} />
      </MapContainer>
      {loadState !== "ready" ? (
        <div
          role={loadState === "error" ? "alert" : "status"}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 500,
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "rgba(237,241,234,.9)",
            color: "#17271e",
            textAlign: "center",
          }}
        >
          {loadState === "loading"
            ? "Ładowanie granic administracyjnych…"
            : "Nie udało się pobrać granic Eurostat. Sprawdź połączenie i odśwież stronę."}
        </div>
      ) : null}
    </div>
  );
}
