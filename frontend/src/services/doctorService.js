import api from "./api";

/**
 * Service for doctor dashboard and clinical operations.
 * Communicates with the FastAPI backend.
 */
export const doctorService = {
  // ------------------------------------------------------------
  // PATIENTS
  // ------------------------------------------------------------
  async getPatients() {
    try {
      const response = await api.get("/patients/");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn("Failed to fetch patients list from /patients/:", error?.message);
      return [];
    }
  },

  async getPatient(patientId) {
    if (!patientId) return null;
    try {
      const response = await api.get(`/patients/${patientId}`);
      return response.data;
    } catch (error) {
      console.warn(`Failed to fetch patient ${patientId}:`, error?.message);
      return null;
    }
  },

  // ------------------------------------------------------------
  // DOCTORS & HOSPITALS
  // ------------------------------------------------------------
  async getDoctors() {
    try {
      const response = await api.get("/doctors/");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn("Failed to fetch doctors:", error?.message);
      return [];
    }
  },

  async getDoctor(doctorId) {
    if (!doctorId) return null;
    try {
      const response = await api.get(`/doctors/${doctorId}`);
      return response.data;
    } catch (error) {
      console.warn(`Failed to fetch doctor ${doctorId}:`, error?.message);
      return null;
    }
  },

  async getHospitals() {
    try {
      const response = await api.get("/hospitals/");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn("Failed to fetch hospitals:", error?.message);
      return [];
    }
  },

  // ------------------------------------------------------------
  // APPOINTMENTS
  // ------------------------------------------------------------
  async getAppointments() {
    try {
      const response = await api.get("/appointments/");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn("Failed to fetch appointments from /appointments/:", error?.message);
      return [];
    }
  },

  async getAppointment(appointmentId) {
    if (!appointmentId) return null;
    try {
      const response = await api.get(`/appointments/${appointmentId}`);
      return response.data;
    } catch (error) {
      console.warn(`Failed to fetch appointment ${appointmentId}:`, error?.message);
      return null;
    }
  },

  async updateAppointment(appointmentId, data) {
    if (!appointmentId) throw new Error("Appointment ID required");
    const response = await api.put(`/appointments/${appointmentId}`, data);
    return response.data;
  },

  // ------------------------------------------------------------
  // APPROVALS
  // ------------------------------------------------------------
  async getApprovals() {
    try {
      const response = await api.get("/approvals/");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn("Failed to fetch approvals from /approvals/:", error?.message);
      return [];
    }
  },

  async updateApproval(approvalId, status) {
    if (!approvalId) throw new Error("Approval ID required");
    const normalizedStatus = status.toUpperCase();
    const response = await api.put(`/approvals/${approvalId}?status=${normalizedStatus}`);
    return response.data;
  },

  // ------------------------------------------------------------
  // VITALS
  // ------------------------------------------------------------
  async getPatientVitals(patientId) {
    if (!patientId) return [];
    try {
      const response = await api.get(`/vitals/patient/${patientId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      // 404 means no vitals recorded yet
      return [];
    }
  },

  async getLatestVitals(patientId) {
    if (!patientId) return null;
    try {
      const response = await api.get(`/vitals/${patientId}/latest`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async recordVitals(vitalsData) {
    const response = await api.post("/vitals/", vitalsData);
    return response.data;
  },

  // ------------------------------------------------------------
  // HEALTH RECORDS
  // ------------------------------------------------------------
  async getHealthRecords(patientId) {
    if (!patientId) return [];
    try {
      const response = await api.get(`/health-records/${patientId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return [];
    }
  },

  async createHealthRecord(recordData) {
    const response = await api.post("/health-records/", recordData);
    return response.data;
  },

  async updateHealthRecord(recordId, recordData) {
    if (!recordId) throw new Error("Record ID required");
    const response = await api.put(`/health-records/${recordId}`, recordData);
    return response.data;
  },

  async deleteHealthRecord(recordId) {
    if (!recordId) throw new Error("Record ID required");
    const response = await api.delete(`/health-records/${recordId}`);
    return response.data;
  },

  // ------------------------------------------------------------
  // HEALTH ALERTS
  // ------------------------------------------------------------
  async getHealthAlerts(patientId) {
    if (!patientId) return [];
    try {
      const response = await api.get(`/health-alerts/${patientId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return [];
    }
  },

  async getHealthAlertSummary(patientId) {
    if (!patientId) return { total_alerts: 0, high_alerts: 0, status: "NORMAL" };
    try {
      const response = await api.get(`/health-alerts/${patientId}/summary`);
      return response.data;
    } catch (error) {
      return { total_alerts: 0, high_alerts: 0, status: "NORMAL" };
    }
  },

  // ------------------------------------------------------------
  // AI ASSISTANT
  // ------------------------------------------------------------
  async sendAIChat(patientId, message) {
    const response = await api.post("/ai-assistant/chat", {
      patient_id: patientId,
      message: message,
    });
    return response.data;
  },

  async getAIHistory(patientId) {
    if (!patientId) return [];
    try {
      const response = await api.get(`/ai-assistant/history/${patientId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return [];
    }
  },

  // ------------------------------------------------------------
  // NOTIFICATIONS
  // ------------------------------------------------------------
  async getNotifications(patientId) {
    if (!patientId) return [];
    try {
      const response = await api.get(`/notifications/${patientId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return [];
    }
  },

  async getUnreadCount(patientId) {
    if (!patientId) return 0;
    try {
      const response = await api.get(`/notifications/${patientId}/unread-count`);
      return response.data?.unread_count || 0;
    } catch (error) {
      return 0;
    }
  },

  async markNotificationRead(notificationId) {
    if (!notificationId) return;
    try {
      const response = await api.put(`/notifications/${notificationId}`, {
        is_read: true,
      });
      return response.data;
    } catch (error) {
      console.warn("Failed to mark notification read:", error?.message);
    }
  },
};

export default doctorService;
