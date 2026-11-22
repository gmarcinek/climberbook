export const mapRecordKinds = [
  "climbing_area",
  "rescue_region",
  "rescue_service",
  "rescue_incident",
] as const;

export type MapRecordKind = (typeof mapRecordKinds)[number];
export type MapRecordConfidence = "high" | "medium" | "low";

export type MapRecordSource = {
  title: string;
  url: string;
  publishedAt?: string;
};

export type MapRecord = {
  id: string;
  kind: MapRecordKind;
  slug: string;
  name: string;
  countryCode: string;
  regionId?: string;
  latitude: number | null;
  longitude: number | null;
  summary: string;
  details: Record<string, unknown>;
  sources: MapRecordSource[];
  confidence: MapRecordConfidence;
  createdAt: string;
  updatedAt: string;
};

export type MapRecordInput = Omit<MapRecord, "id" | "createdAt" | "updatedAt">;
