import client from "./client";

export interface User {
  id: string;
  _id?: string;
  name: string;
  fullName?: string;
  email: string;
  role: "PATIENT" | "DOCTOR" | "STAFF" | "ADMIN";
  phone?: string;
  patient_id?: string;
  doctor_id?: string;
  staffId?: string;
  staff_id?: string;
  emailVerified?: boolean;
  faceVerified?: boolean;
  fingerprintVerified?: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
  message?: string;
  require_2fa?: boolean;
  temp_token?: string;
}

export const authApi = {
  login: async (credentials: { email: string; password: string }, signal?: AbortSignal) => {
    const res = await client.post<AuthResponse>("/auth/login", credentials, { signal });
    return res.data;
  },

  verify2FA: async (data: { temp_token: string; otp: string }, signal?: AbortSignal) => {
    const res = await client.post<AuthResponse>("/auth/login/2fa-verify", data, { signal });
    return res.data;
  },

  register: async (data: any, signal?: AbortSignal) => {
    const res = await client.post<AuthResponse>("/auth/register", data, { signal });
    return res.data;
  },

  getMe: async (signal?: AbortSignal) => {
    const res = await client.get<User>("/auth/me", { signal });
    return res.data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  },
};

export default authApi;
