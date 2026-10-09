import api from "./api";

// ==================================================
// AUTHENTICATION & BIOMETRICS API
// ==================================================

export const authAPI = {
  // Register patient (optionally with initial vitals & profile)
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

  // Update authenticated user profile
  updateProfile: async (data) => {
    const response = await api.put("/auth/profile", data);
    return response.data;
  },

  // Change password
  changePassword: async (data) => {
    const response = await api.post("/auth/change-password", data);
    return response.data;
  },

  // Create staff user
  createStaff: async (data) => {
    const response = await api.post("/auth/staff", data);
    return response.data;
  },

  // Biometrics: Face Enrollment
  enrollFace: async ({ descriptor, consent = true }) => {
    const response = await api.post("/auth/biometrics/face/enroll", { descriptor, consent });
    return response.data;
  },

  // Biometrics: Face Verification
  verifyFace: async ({ descriptor }) => {
    const response = await api.post("/auth/biometrics/face/verify", { descriptor });
    return response.data;
  },

  // Biometrics: WebAuthn Register Options
  getWebAuthnRegisterOptions: async () => {
    const response = await api.post("/auth/biometrics/webauthn/register-options");
    return response.data;
  },

  // Biometrics: WebAuthn Register Verify
  verifyWebAuthnRegistration: async (data) => {
    const response = await api.post("/auth/biometrics/webauthn/register-verify", data);
    return response.data;
  },

  // Biometrics: WebAuthn Verify
  verifyWebAuthn: async (data = {}) => {
    const response = await api.post("/auth/biometrics/webauthn/verify", data);
    return response.data;
  },

  // Biometrics: Delete all stored biometric credentials
  deleteBiometrics: async () => {
    const response = await api.delete("/auth/biometrics");
    return response.data;
  },
};

export default authAPI;