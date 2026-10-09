import api from "./api";

// ============================================================
// FACILITIES & LIVE BED TELEMETRY API CLIENT
// ============================================================

export const facilitiesAPI = {
  // Fetch dynamic hierarchical filters (Country -> State -> City, Types, Specialties)
  getFilterOptions: async (signal) => {
    const response = await api.get("/facilities/filter-options", { signal });
    return response.data;
  },

  // Fetch facilities with global filters, search and geolocation
  getFacilities: async (params = {}, signal) => {
    const response = await api.get("/facilities", { params, signal });
    return response.data;
  },

  // Fetch single facility details
  getFacility: async (id, signal) => {
    const response = await api.get(`/facilities/${id}`, { signal });
    return response.data;
  },

  // Fetch live bed telemetry units for a facility
  getFacilityBeds: async (facilityId, signal) => {
    const response = await api.get(`/facilities/${facilityId}/beds`, { signal });
    return response.data;
  },

  // Update specific bed status (Simulate or manage live IoT bed state)
  updateBedStatus: async (facilityId, bedId, status, signal) => {
    const response = await api.post(
      `/facilities/${facilityId}/beds/update`,
      { bed_id: bedId, status },
      { signal }
    );
    return response.data;
  },

  // Get Base URL for SSE Live Telemetry Stream
  getStreamUrl: (facilityId = null) => {
    const base = api.defaults.baseURL || "http://127.0.0.1:5000/api";
    const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
    return facilityId 
      ? `${cleanBase}/facilities/${facilityId}/beds/stream`
      : `${cleanBase}/facilities/beds/stream`;
  }
};

export default facilitiesAPI;
