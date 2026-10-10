import api from "./api";

/**
 * Service for doctor dashboard and clinical operations.
 * Communicates with the Flask REST backend.
 */
export const doctorService = {
  // ------------------------------------------------------------
  // PATIENTS
  // ------------------------------------------------------------
  async getPatients(params = {}) {
    try {
      const response = await api.get("/patients/", { params });
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data && Array.isArray(response.data.patients)) {
        return response.data.patients;
      }
      return [];
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
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.doctors)) return response.data.doctors;
      if (response.data && Array.isArray(response.data.data)) return response.data.data;
      return [];
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

  async getDoctorProfile() {
    try {
      const response = await api.get("/doctors/me");
      return response.data;
    } catch (error) {
      console.warn("Failed to fetch doctor profile:", error?.message);
      return null;
    }
  },

  async updateDoctor(doctorId, data) {
    if (!doctorId) throw new Error("Doctor ID required");
    const response = await api.put(`/doctors/${doctorId}`, data);
    return response.data;
  },

  async getHospitals() {
    try {
      const response = await api.get("/hospitals/");
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.hospitals)) return response.data.hospitals;
      if (response.data && Array.isArray(response.data.facilities)) return response.data.facilities;
      if (response.data && Array.isArray(response.data.data)) return response.data.data;
      return [];
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
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.appointments)) return response.data.appointments;
      if (response.data && Array.isArray(response.data.data)) return response.data.data;
      return [];
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
  async getHealthRecords(patientIdOrParams) {
    try {
      if (typeof patientIdOrParams === "string" && patientIdOrParams) {
        const response = await api.get(`/health-records/${patientIdOrParams}`);
        return Array.isArray(response.data) ? response.data : [];
      }
      const params = typeof patientIdOrParams === "object" ? patientIdOrParams : {};
      const response = await api.get("/health-records/", { params });
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.records)) return response.data.records;
      return [];
    } catch (error) {
      return [];
    }
  },

  async getHealthRecordsSummary(params = {}) {
    try {
      const response = await api.get("/health-records/", { params });
      return response.data || { records: [], stats: { total: 0, consultations: 0, prescriptions: 0, diagnoses: 0 } };
    } catch (error) {
      return { records: [], stats: { total: 0, consultations: 0, prescriptions: 0, diagnoses: 0 } };
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

  // ------------------------------------------------------------
  // BILLING & FINANCIAL TRANSACTIONS
  // ------------------------------------------------------------
  async getBillingSummary(period = "30D") {
    try {
      const response = await api.get("/billing/summary", { params: { period } });
      return response.data;
    } catch (error) {
      console.warn("Failed to fetch billing summary:", error?.message);
      return null;
    }
  },

  async getInvoices(params = {}) {
    try {
      const response = await api.get("/billing/invoices", { params });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn("Failed to fetch invoices:", error?.message);
      return [];
    }
  },

  async getInvoice(id) {
    if (!id) return null;
    try {
      const response = await api.get(`/billing/invoices/${id}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  async createInvoice(data) {
    const response = await api.post("/billing/invoices", data);
    return response.data;
  },

  async getInvoiceQr(id) {
    const response = await api.post(`/billing/invoices/${id}/qr`);
    return response.data;
  },

  async markInvoicePaid(id, data = {}) {
    const response = await api.post(`/billing/invoices/${id}/pay`, data);
    return response.data;
  },

  async refundInvoice(id) {
    const response = await api.post(`/billing/invoices/${id}/refund`);
    return response.data;
  },

  async settleInvoice(id) {
    const response = await api.post(`/billing/invoices/${id}/settle`);
    return response.data;
  },

  // ------------------------------------------------------------
  // CLINICAL KNOWLEDGE BASE (KB)
  // ------------------------------------------------------------
  async getKbConditions(params = {}) {
    try {
      const response = await api.get("/ai-assistant/kb/conditions", { params });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return [];
    }
  },

  async addKbCondition(data) {
    const response = await api.post("/ai-assistant/kb/conditions", data);
    return response.data;
  },

  async updateKbCondition(id, data) {
    const response = await api.put(`/ai-assistant/kb/conditions/${id}`, data);
    return response.data;
  },

  async getKbDrugs() {
    try {
      const response = await api.get("/ai-assistant/kb/drugs");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return [];
    }
  },

  async getUnmatchedQueries() {
    try {
      const response = await api.get("/ai-assistant/kb/unmatched");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return [];
    }
  },

  async importKbEntries(entries) {
    const response = await api.post("/ai-assistant/kb/import", { entries });
    return response.data;
  },
};

export default doctorService;

