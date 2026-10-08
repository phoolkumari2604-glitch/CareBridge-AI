import api from "./api";

/**
 * Service for Real-Time Hospital Dashboard and Data Source Integrations.
 * Communicates with the Flask REST backend endpoints.
 */
export const hospitalService = {
  /**
   * Fetches hospital listings with pagination, multi-field filters, and data freshness.
   */
  async getHospitals(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.search) queryParams.append("search", params.search);
    if (params.city) queryParams.append("city", params.city);
    if (params.state) queryParams.append("state", params.state);
    if (params.country) queryParams.append("country", params.country);
    if (params.type) queryParams.append("type", params.type);
    if (params.ownership) queryParams.append("ownership", params.ownership);
    if (params.source) queryParams.append("source", params.source);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.emergency !== undefined && params.emergency !== null && params.emergency !== "") {
      queryParams.append("emergency", params.emergency);
    }

    const response = await api.get(`/hospitals?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Fetches details for a specific hospital by ID.
   */
  async getHospitalById(id) {
    if (!id) return null;
    const response = await api.get(`/hospitals/${id}`);
    return response.data;
  },

  /**
   * Fast search across connected sources.
   */
  async searchHospitals(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.append("q", params.q);
    if (params.city) queryParams.append("city", params.city);
    if (params.state) queryParams.append("state", params.state);
    if (params.country) queryParams.append("country", params.country);
    if (params.source) queryParams.append("source", params.source);
    if (params.limit) queryParams.append("limit", params.limit || 20);

    const response = await api.get(`/hospitals/search?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Fetches validated healthcare statistics calculated from real records.
   */
  async getHospitalStatistics() {
    const response = await api.get("/hospitals/statistics");
    return response.data;
  },

  /**
   * Fetches bed availability data with transparency disclaimers.
   */
  async getBedAvailability() {
    const response = await api.get("/hospitals/availability");
    return response.data;
  },

  /**
   * Fetches integration status for all 4 hospital data sources.
   */
  async getDataSourcesStatus() {
    const response = await api.get("/hospitals/sources");
    return response.data;
  },

  /**
   * Returns the Leafmap interactive HTML map URL.
   */
  getLeafmapMapUrl(lat = 28.6139, lng = 77.2090, zoom = 12) {
    const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";
    return `${baseURL}/hospitals/map/html?lat=${lat}&lng=${lng}&zoom=${zoom}`;
  },

  /**
   * Fetches nearby realtime facilities (OpenStreetMap + DB partners).
   */
  async getNearbyFacilities(lat, lng, radius_km = 10) {
    const response = await api.get(`/hospitals/nearby/realtime?lat=${lat}&lng=${lng}&radius_km=${radius_km}`);
    return response.data;
  },
};

export default hospitalService;
