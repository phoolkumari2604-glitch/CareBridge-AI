import { Routes, Route } from "react-router-dom";

// ==================================================
// PUBLIC PAGES
// ==================================================
import Landing from "./pages/public/Landing";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";

// ==================================================
// SHARED PAGES
// ==================================================
import Unauthorized from "./pages/shared/Unauthorized";
import NotFound from "./pages/shared/NotFound";
import Profile from "./pages/shared/Profile";
import Settings from "./pages/shared/Settings";

// ==================================================
// AUTH / LAYOUT
// ==================================================
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layouts/DashboardLayout";

// ==================================================
// PATIENT PAGES
// ==================================================
import PatientDashboard from "./pages/patient/PatientDashboard";
import Hospitals from "./pages/patient/Hospitals";
import Doctors from "./pages/patient/Doctors";
import Appointments from "./pages/patient/Appointments";
import Approval from "./pages/patient/Approval";
import DigitalOPDPass from "./pages/patient/DigitalOPDPass";
import LiveQueue from "./pages/patient/LiveQueue";
import Health from "./pages/patient/Health";
import AIAssistant from "./pages/patient/AIAssistant";
import Notifications from "./pages/patient/Notifications";

// ==================================================
// DOCTOR PAGES
// ==================================================
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import PatientMonitoring from "./pages/doctor/PatientMonitoring";
import DoctorAppointments from "./pages/doctor/Appointments";
import DoctorApprovals from "./pages/doctor/Approvals";
import DoctorHealthRecords from "./pages/doctor/HealthRecords";
import HealthMonitoring from "./pages/doctor/HealthMonitoring";
import DoctorVitals from "./pages/doctor/Vitals";
import DoctorAIAssistant from "./pages/doctor/AIAssistant";
import DoctorNotifications from "./pages/doctor/Notifications";

// ==================================================
// STAFF / ADMIN PAGES
// ==================================================
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffPatients from "./pages/staff/Patients";
import StaffAppointments from "./pages/staff/Appointments";
import StaffQueue from "./pages/staff/Queue";
import StaffApprovals from "./pages/staff/Approvals";
import StaffDoctors from "./pages/staff/Doctors";
import StaffHospitals from "./pages/staff/Hospitals";
import StaffNotifications from "./pages/staff/Notifications";
import AuditSecurity from "./pages/staff/AuditSecurity";

function App() {
  return (
    <Routes>

      {/* ==================================================
          PUBLIC ROUTES
      ================================================== */}

      <Route
        path="/"
        element={<Landing />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />


      {/* ==================================================
          SHARED ROUTES
      ================================================== */}

      <Route
        path="/unauthorized"
        element={<Unauthorized />}
      />


      {/* ==================================================
          PROTECTED APPLICATION
      ================================================== */}

      <Route element={<ProtectedRoute />}>

        <Route element={<AppLayout />}>

          {/* ==================================================
              SHARED PAGES
          ================================================== */}

          {/* Profile */}
          <Route
            path="/profile"
            element={<Profile />}
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={<Settings />}
          />


          {/* ==================================================
              PATIENT MODULE
          ================================================== */}

          {/* Patient Dashboard */}
          <Route
            path="/patient/dashboard"
            element={<PatientDashboard />}
          />

          {/* Hospitals */}
          <Route
            path="/patient/hospitals"
            element={<Hospitals />}
          />

          {/* Doctors */}
          <Route
            path="/patient/doctors"
            element={<Doctors />}
          />

          {/* Appointments */}
          <Route
            path="/patient/appointments"
            element={<Appointments />}
          />

          {/* Approval */}
          <Route
            path="/patient/approval"
            element={<Approval />}
          />

          {/* Digital OPD Pass */}
          <Route
            path="/patient/opd-pass"
            element={<DigitalOPDPass />}
          />

          {/* Live Queue */}
          <Route
            path="/patient/queue"
            element={<LiveQueue />}
          />

          {/* Health */}
          <Route
            path="/patient/health"
            element={<Health />}
          />

          {/* AI Assistant */}
          <Route
            path="/patient/ai-assistant"
            element={<AIAssistant />}
          />

          {/* Notifications */}
          <Route
            path="/patient/notifications"
            element={<Notifications />}
          />


          {/* ==================================================
              DOCTOR MODULE (12 REQUIRED FEATURES)
          ================================================== */}

          {/* 1. Dashboard */}
          <Route
            path="/doctor/dashboard"
            element={<DoctorDashboard />}
          />

          {/* 2. Patient Monitoring */}
          <Route
            path="/doctor/patient-monitoring"
            element={<PatientMonitoring />}
          />
          <Route
            path="/doctor/patients"
            element={<PatientMonitoring />}
          />

          {/* 3. Appointments */}
          <Route
            path="/doctor/appointments"
            element={<DoctorAppointments />}
          />

          {/* 4. Approvals */}
          <Route
            path="/doctor/approvals"
            element={<DoctorApprovals />}
          />

          {/* 5. Health Records */}
          <Route
            path="/doctor/records"
            element={<DoctorHealthRecords />}
          />
          <Route
            path="/doctor/health-records"
            element={<DoctorHealthRecords />}
          />

          {/* 6. Health Monitoring */}
          <Route
            path="/doctor/health-monitoring"
            element={<HealthMonitoring />}
          />

          {/* 7. Vitals */}
          <Route
            path="/doctor/vitals"
            element={<DoctorVitals />}
          />

          {/* 8. AI Assistant */}
          <Route
            path="/doctor/ai-assistant"
            element={<DoctorAIAssistant />}
          />

          {/* 9. Notifications */}
          <Route
            path="/doctor/notifications"
            element={<DoctorNotifications />}
          />


          {/* ==================================================
              STAFF / ADMIN MODULE
          ================================================== */}

          {/* Staff Dashboard */}
          <Route
            path="/staff/dashboard"
            element={<StaffDashboard />}
          />

          {/* Staff Patients */}
          <Route
            path="/staff/patients"
            element={<StaffPatients />}
          />

          {/* Staff Appointments */}
          <Route
            path="/staff/appointments"
            element={<StaffAppointments />}
          />

          {/* Staff Queue */}
          <Route
            path="/staff/queue"
            element={<StaffQueue />}
          />

          {/* Staff Approvals */}
          <Route
            path="/staff/approvals"
            element={<StaffApprovals />}
          />

          {/* Staff Doctors */}
          <Route
            path="/staff/doctors"
            element={<StaffDoctors />}
          />

          {/* Staff Hospitals */}
          <Route
            path="/staff/hospitals"
            element={<StaffHospitals />}
          />

          {/* Staff Notifications */}
          <Route
            path="/staff/notifications"
            element={<StaffNotifications />}
          />

          {/* Audit / Security */}
          <Route
            path="/staff/audit"
            element={<AuditSecurity />}
          />

        </Route>
      </Route>


      {/* ==================================================
          404 FALLBACK
      ================================================== */}

      <Route
        path="*"
        element={<NotFound />}
      />

    </Routes>
  );
}

export default App;
