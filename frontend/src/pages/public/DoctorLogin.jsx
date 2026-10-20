import React from "react";
import LoginView from "../../components/auth/LoginView";

export default function DoctorLogin() {
  return (
    <LoginView
      portalRole="Doctor Portal"
      portalTitle="Specialist Physician Sign In"
      portalSubtitle="Manage consultation schedules, clinical clearances, and active patient monitoring."
      portalType="doctor"
    />
  );
}
