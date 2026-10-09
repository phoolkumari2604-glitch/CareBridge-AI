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
import HospitalDashboard from "./pages/shared/HospitalDashboard";

// ==================================================
// AUTH / LAYOUT
// ==================================================
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layouts/DashboardLayout";

// ==================================================
// PATIENT PAGES
// ==================================================
import PatientDashboard from "./pages/patient/PatientDashboard";
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
import DoctorEarnings from "./pages/doctor/DoctorEarnings";

// ==================================================
// STAFF / ADMIN PAGES
// ==================================================
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffPatients from "./pages/staff/Patients";
import StaffAppointments from "./pages/staff/Appointments";
import StaffQueue from "./pages/staff/Queue";
import StaffApprovals from "./pages/staff/Approvals";
import StaffDoctors from "./pages/staff/Doctors";
import StaffNotifications from "./pages/staff/Notifications";
import AuditSecurity from "./pages/staff/AuditSecurity";

function App() {
  return (
    <Routes>
      {/* ==================================================
          PUBLIC ROUTES
      ================================================== */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ==================================================
          SHARED ROUTES
      ================================================== */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ==================================================
          PROTECTED APPLICATION
      ================================================== */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* ==================================================
              SHARED PAGES
          ================================================== */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/hospitals" element={<HospitalDashboard />} />
          <Route path="/hospital-dashboard" element={<HospitalDashboard />} />

          {/* ==================================================
              PATIENT MODULE
          ================================================== */}
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/patient/hospitals" element={<HospitalDashboard />} />
          <Route path="/patient/doctors" element={<Doctors />} />
          <Route path="/patient/appointments" element={<Appointments />} />
          <Route path="/patient/approval" element={<Approval />} />
          <Route path="/patient/opd-pass" element={<DigitalOPDPass />} />
          <Route path="/patient/queue" element={<LiveQueue />} />
          <Route path="/patient/health" element={<Health />} />
          <Route path="/patient/ai-assistant" element={<AIAssistant />} />
          <Route path="/patient/notifications" element={<Notifications />} />

          {/* ==================================================
              DOCTOR MODULE
          ================================================== */}
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/hospitals" element={<HospitalDashboard />} />
          <Route path="/doctor/patient-monitoring" element={<PatientMonitoring />} />
          <Route path="/doctor/patients" element={<PatientMonitoring />} />
          <Route path="/doctor/appointments" element={<DoctorAppointments />} />
          <Route path="/doctor/approvals" element={<DoctorApprovals />} />
          <Route path="/doctor/records" element={<DoctorHealthRecords />} />
          <Route path="/doctor/health-records" element={<DoctorHealthRecords />} />
          <Route path="/doctor/health-monitoring" element={<HealthMonitoring />} />
          <Route path="/doctor/vitals" element={<DoctorVitals />} />
          <Route path="/doctor/ai-assistant" element={<DoctorAIAssistant />} />
          <Route path="/doctor/notifications" element={<DoctorNotifications />} />
          <Route path="/doctor/earnings" element={<DoctorEarnings />} />
          <Route path="/doctor/financial-reports" element={<DoctorEarnings />} />

          {/* ==================================================
              STAFF / ADMIN MODULE
          ================================================== */}
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/patients" element={<StaffPatients />} />
          <Route path="/staff/appointments" element={<StaffAppointments />} />
          <Route path="/staff/queue" element={<StaffQueue />} />
          <Route path="/staff/approvals" element={<StaffApprovals />} />
          <Route path="/staff/doctors" element={<StaffDoctors />} />
          <Route path="/staff/hospitals" element={<HospitalDashboard />} />
          <Route path="/staff/notifications" element={<StaffNotifications />} />
          <Route path="/staff/audit" element={<AuditSecurity />} />
        </Route>
      </Route>

      {/* ==================================================
          404 FALLBACK
      ================================================== */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
