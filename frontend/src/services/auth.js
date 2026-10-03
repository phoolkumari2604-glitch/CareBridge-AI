import api from "./api";

// ==================================================
// AUTHENTICATION API
// ==================================================

export const authAPI = {
  // Register patient
  register: async (data) => {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  // Login
  login: async (data) => {
    const response = await api.post("/auth/login", data);
    return response.data;
  },

  // Get currently logged-in user
  me: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  // Create staff user
  createStaff: async (data) => {
    const response = await api.post("/auth/staff", data);
    return response.data;
  },
};

export default authAPI;