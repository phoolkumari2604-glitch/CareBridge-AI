import React from "react";
import LoginView from "../../components/auth/LoginView";

export default function StaffLogin() {
  return (
    <LoginView
      portalRole="Staff & Admin Portal"
      portalTitle="Clinical Staff Sign In"
      portalSubtitle="Access outpatient triage, reception check-ins, queue telemetry, and security audits."
      portalType="staff"
    />
  );
}
