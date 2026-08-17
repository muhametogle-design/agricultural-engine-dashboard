/** Shared browser contracts for the Dawaad climate/pastoral monitoring API. */

export type ISODateTime = string;
export type ISODate = string;

export interface ClimateStation {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  lastUpdated: ISODateTime;
}

export interface RainfallRecord {
  stationId: string;
  /** CHIRPS ten-day period, e.g. 2026-08-D1. */
  dekad: string;
  rainfallMm: number;
  historicalMeanMm: number;
  anomalyPct: number;
}

export type VegetationStatus = "Normal" | "Watch" | "Alert" | "Severe";

export interface VegetationIndex {
  regionId: string;
  vciScore: number;
  status: VegetationStatus;
}

export type WaterPointType = "Borehole" | "Shallow Well" | "Berkad";
export type WaterPointStatus = "Functional" | "Stressed" | "Dry";

export interface WaterPoint {
  id: string;
  name: string;
  type: WaterPointType;
  status: WaterPointStatus;
  depthMeters: number;
  lat: number;
  lng: number;
}

export interface DroughtPeriod {
  dekad: string;
  startDate: ISODate;
  endDate: ISODate;
  windowDays: 10;
}

export interface DroughtMetricsResponse {
  region: string;
  period: DroughtPeriod;
  stations: ClimateStation[];
  rainfallRecords: RainfallRecord[];
  vegetationIndices: VegetationIndex[];
  precipitationProduct: string;
  vegetationProduct: string;
  dataMode: "mock";
  disclaimer: string;
}

export interface GeoJSONPoint {
  type: "Point";
  coordinates: [lng: number, lat: number];
}

export interface WaterPointFeature {
  type: "Feature";
  id: string;
  geometry: GeoJSONPoint;
  properties: WaterPoint;
}

export interface WaterPointFeatureCollection {
  type: "FeatureCollection";
  features: WaterPointFeature[];
  dataMode: "mock";
  disclaimer: string;
}
