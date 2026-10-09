import api from "./api";

// ==================================================
// AUTHENTICATION, RBAC & BIOMETRICS API
// ==================================================

export const authAPI = {
  // Register patient
  register: async (data, signal) => {
    const response = await api.post("/auth/register", data, { signal });
    return response.data;
  },

  // Login
  login: async (data, signal) => {
    const response = await api.post("/auth/login", data, { signal });
    return response.data;
  },

  // Admin 2FA OTP verification
  verify2FA: async ({ temp_token, otp }, signal) => {
    const response = await api.post("/auth/login/2fa-verify", { temp_token, otp }, { signal });
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email, signal) => {
    const response = await api.post("/auth/forgot-password", { email }, { signal });
    return response.data;
  },

  // Reset password
  resetPassword: async ({ token, password }, signal) => {
    const response = await api.post("/auth/reset-password", { token, password }, { signal });
    return response.data;
  },

  // Verify email address
  verifyEmail: async (token, signal) => {
    const response = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`, { signal });
    return response.data;
  },

  // Resend verification email
  resendVerification: async (email, signal) => {
    const response = await api.post("/auth/resend-verification", { email }, { signal });
    return response.data;
  },

  // Verify invitation / bootstrap token
  verifyInvite: async (token, signal) => {
    const response = await api.get(`/auth/invite/verify?token=${encodeURIComponent(token)}`, { signal });
    return response.data;
  },

  // Set initial password for invited user / bootstrap admin
  setPassword: async ({ token, password }, signal) => {
    const response = await api.post("/auth/set-password", { token, password }, { signal });
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

  // ==================================================
  // ADMIN USER MANAGEMENT & AUDIT API
  // ==================================================
  getAdminStats: async (signal) => {
    const response = await api.get("/admin/stats", { signal });
    return response.data;
  },

  getAdminUsers: async (params = {}, signal) => {
    const response = await api.get("/admin/users", { params, signal });
    return response.data;
  },

  inviteUser: async (data, signal) => {
    const response = await api.post("/admin/users/invite", data, { signal });
    return response.data;
  },

  updateUserStatus: async (userId, status, signal) => {
    const response = await api.put(`/admin/users/${userId}/status`, { status }, { signal });
    return response.data;
  },

  adminResetPassword: async (userId, signal) => {
    const response = await api.post(`/admin/users/${userId}/reset-password`, {}, { signal });
    return response.data;
  },

  deleteUser: async (userId, signal) => {
    const response = await api.delete(`/admin/users/${userId}`, { signal });
    return response.data;
  },

  bulkImportUsers: async (users, signal) => {
    const response = await api.post("/admin/users/bulk-import", { users }, { signal });
    return response.data;
  },

  getAuditLogs: async (params = {}, signal) => {
    const response = await api.get("/admin/audit-logs", { params, signal });
    return response.data;
  },

  // ==================================================
  // BIOMETRICS
  // ==================================================
  enrollFace: async ({ descriptor, consent = true }) => {
    const response = await api.post("/auth/biometrics/face/enroll", { descriptor, consent });
    return response.data;
  },

  verifyFace: async ({ descriptor }) => {
    const response = await api.post("/auth/biometrics/face/verify", { descriptor });
    return response.data;
  },

  getWebAuthnRegisterOptions: async () => {
    const response = await api.post("/auth/biometrics/webauthn/register-options");
    return response.data;
  },

  verifyWebAuthnRegistration: async (data) => {
    const response = await api.post("/auth/biometrics/webauthn/register-verify", data);
    return response.data;
  },

  verifyWebAuthn: async (data = {}) => {
    const response = await api.post("/auth/biometrics/webauthn/verify", data);
    return response.data;
  },

  deleteBiometrics: async () => {
    const response = await api.delete("/auth/biometrics");
    return response.data;
  },
};

export default authAPI;