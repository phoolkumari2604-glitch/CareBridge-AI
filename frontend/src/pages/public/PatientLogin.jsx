import React from "react";
import LoginView from "../../components/auth/LoginView";

export default function PatientLogin() {
  return (
    <LoginView
      portalRole="Patient Portal"
      portalTitle="Patient Portal Sign In"
      portalSubtitle="Access your digital OPD pass, live queue telemetry, and personal health records."
      portalType="patient"
    />
  );
}
