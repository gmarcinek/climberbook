"use client";

import { useEffect, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

type FacilityLocationMapProps = {
  center: { latitude: number; longitude: number };
  selectedCoordinates: { latitude: number; longitude: number } | null;
  onSelect: (coordinates: { latitude: number; longitude: number }) => void;
  height?: string;
};

function MapViewport({ center }: Pick<FacilityLocationMapProps, "center">) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.latitude, center.longitude], map.getZoom());
  }, [center.latitude, center.longitude, map]);

  return null;
}

function MapPointSelector({
  onSelect,
}: Pick<FacilityLocationMapProps, "onSelect">) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

function UserLocation({
  selectedCoordinates,
}: Pick<FacilityLocationMapProps, "selectedCoordinates">) {
  const map = useMap();
  const hasRequestedLocation = useRef(false);

  useEffect(() => {
    if (selectedCoordinates || hasRequestedLocation.current) return;
    hasRequestedLocation.current = true;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        map.setView([coords.latitude, coords.longitude], 15);
      },
      () => undefined,
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 6000,
      },
    );
  }, [map, selectedCoordinates]);

  return null;
}

export function FacilityLocationMap({
  center,
  selectedCoordinates,
  onSelect,
  height = "400px",
}: FacilityLocationMapProps) {
  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={13}
      scrollWheelZoom
      style={{
        height,
        width: "100%",
        filter: "saturate(0.8) contrast(0.9) grayscale(0.6)",
      }}
    >
      <TileLayer
        attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
        maxZoom={17}
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
      />
      <MapViewport center={center} />
      <MapPointSelector onSelect={onSelect} />
      <UserLocation selectedCoordinates={selectedCoordinates} />
      {selectedCoordinates && (
        <CircleMarker
          center={[selectedCoordinates.latitude, selectedCoordinates.longitude]}
          radius={9}
          pathOptions={{
            color: "#7f3242",
            fillColor: "#d16d3f",
            fillOpacity: 0.9,
          }}
        />
      )}
    </MapContainer>
  );
}
