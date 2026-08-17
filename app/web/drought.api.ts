import type {
  DroughtMetricsResponse,
  WaterPointFeatureCollection,
} from "./drought.types";

/** Typed client for the deterministic FastAPI mock endpoints. */
export class DroughtApiClient {
  constructor(private readonly baseUrl = "") {}

  async getDroughtMetrics(region: string): Promise<DroughtMetricsResponse> {
    const normalized = region.trim();
    if (!normalized) throw new TypeError("region is required");
    return this.request<DroughtMetricsResponse>(
      `/api/v1/drought-metrics?region=${encodeURIComponent(normalized)}`,
    );
  }

  async getWaterPoints(): Promise<WaterPointFeatureCollection> {
    return this.request<WaterPointFeatureCollection>("/api/v1/water-points");
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Drought API ${response.status}: ${detail}`);
    }
    return (await response.json()) as T;
  }
}

export const droughtApi = new DroughtApiClient();
