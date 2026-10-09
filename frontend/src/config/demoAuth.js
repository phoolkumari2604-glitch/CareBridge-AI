// CareBridge AI - Demo Authentication Configuration
// Securely exposes demo configuration only when VITE_DEMO_MODE is explicitly enabled in environment

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

export const getDemoCredentials = (role) => {
  if (!isDemoMode) {
    return null;
  }

  const normalizedRole = (role || "").toLowerCase();

  switch (normalizedRole) {
    case "patient":
      return {
        email: import.meta.env.VITE_DEMO_PATIENT_EMAIL || "patient@carebridge.ai",
        password: import.meta.env.VITE_DEMO_PATIENT_PASSWORD || "CareBridge#Pt2026!Secure",
      };
    case "doctor":
      return {
        email: import.meta.env.VITE_DEMO_DOCTOR_EMAIL || "doctor@carebridge.ai",
        password: import.meta.env.VITE_DEMO_DOCTOR_PASSWORD || "CareBridge#Doc2026!Secure",
      };
    case "staff":
      return {
        email: import.meta.env.VITE_DEMO_STAFF_EMAIL || "staff@carebridge.ai",
        password: import.meta.env.VITE_DEMO_STAFF_PASSWORD || "CareBridge#Staff2026!Admin",
      };
    default:
      return null;
  }
};
