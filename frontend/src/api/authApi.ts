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
  login: async (credentials: { email: string; password: string }) => {
    const res = await client.post<AuthResponse>("/auth/login", credentials);
    return res.data;
  },

  register: async (data: any) => {
    const res = await client.post<AuthResponse>("/auth/register", data);
    return res.data;
  },

  getMe: async () => {
    const res = await client.get<User>("/auth/me");
    return res.data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  },
};

export default authApi;
