import axios, { AxiosInstance } from "axios";

// Standardize API Base URL: use relative "/api" in development (via Vite proxy) or configured env URL
const getBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string") {
    const cleanUrl = envUrl.trim().replace(/\/+$/, "");
    if (
      (import.meta as any).env?.DEV &&
      (cleanUrl === "http://localhost:5000/api" ||
        cleanUrl === "http://127.0.0.1:5000/api" ||
        cleanUrl === "http://localhost:5000" ||
        cleanUrl === "http://127.0.0.1:5000")
    ) {
      return "/api";
    }
    return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
  }
  return "/api";
};

export const client: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 20000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Attach JWT access token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response error handler
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    const status = error.response ? error.response.status : null;

    if (status === 401 && !originalRequest?._retry) {
      const currentPath = window.location.pathname.replace(/\/+$/, "");
      if (currentPath !== "/login" && currentPath !== "/register" && currentPath !== "") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default client;
