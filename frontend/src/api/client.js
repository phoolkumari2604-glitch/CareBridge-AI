import axios from "axios";

// Standardize API Base URL from environment or fallback to local Flask server
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    // Ensure /api suffix if not present
    return envUrl.endsWith("/api") ? envUrl : `${envUrl.replace(/\/$/, "")}/api`;
  }
  return "http://localhost:5000/api";
};

const client = axios.create({
  baseURL: getBaseUrl(),
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ============================================================
// REQUEST INTERCEPTOR: Automatically attach JWT access token
// ============================================================
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// RESPONSE INTERCEPTOR: Handle 401s, error message extraction
// ============================================================
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    const status = error.response ? error.response.status : null;

    if (status === 401 && !originalRequest?._retry) {
      // Clear credentials if token expired/invalid
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/register" && currentPath !== "/") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

// Helper for multipart/form-data file uploads
client.upload = async (url, formData, onProgress) => {
  return client.post(url, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: onProgress,
  });
};

export default client;
export { client };
