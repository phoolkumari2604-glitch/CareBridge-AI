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
  async getApprovals(params = {}) {
    try {
      const response = await api.get("/approvals/", { params: { limit: 100, ...params } });
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.approvals)) return data.approvals;
      return [];
    } catch (error) {
      console.warn("Failed to fetch approvals from /approvals/:", error?.message);
      return [];
    }
  },

  async updateApproval(approvalId, status, rejectionReason = "") {
    if (!approvalId) throw new Error("Approval ID required");
    const normalizedStatus = status.toUpperCase();
    const payload = { status: normalizedStatus };
    if (rejectionReason) {
      payload.rejection_reason = rejectionReason;
    }
    const response = await api.put(`/approvals/${approvalId}`, payload, {
      params: { status: normalizedStatus }
    });
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

  async updateVitals(vitalId, data) {
    if (!vitalId) throw new Error("Vital ID required");
    const response = await api.put(`/vitals/${vitalId}`, data);
    return response.data;
  },

  async deleteVitals(vitalId) {
    if (!vitalId) throw new Error("Vital ID required");
    const response = await api.delete(`/vitals/${vitalId}`);
    return response.data;
  },

  // ------------------------------------------------------------
  // HEALTH RECORDS
  // ------------------------------------------------------------
  async getHealthRecords(params = {}) {
    try {
      const queryParams = typeof params === "string" ? { patient: params } : { ...params };
      if (queryParams.patientId && !queryParams.patient) {
        queryParams.patient = queryParams.patientId;
      }
      const response = await api.get("/health-records/", { params: queryParams });
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.items)) return response.data.items;
      if (response.data && Array.isArray(response.data.records)) return response.data.records;
      return [];
    } catch (error) {
      console.warn("Error fetching health records:", error?.message);
      return [];
    }
  },

  async getHealthRecordsSummary(params = {}) {
    try {
      const queryParams = typeof params === "string" ? { patient: params } : { ...params };
      if (queryParams.patientId && !queryParams.patient) {
        queryParams.patient = queryParams.patientId;
      }
      const response = await api.get("/health-records/", { params: queryParams });
      return response.data || { items: [], records: [], total: 0, stats: { records: 0, consultations: 0, prescriptions: 0, diagnoses: 0, checkups: 0 } };
    } catch (error) {
      console.warn("Error fetching health records summary:", error?.message);
      return { items: [], records: [], total: 0, stats: { records: 0, consultations: 0, prescriptions: 0, diagnoses: 0, checkups: 0 } };
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

  async restoreHealthRecord(recordId) {
    if (!recordId) throw new Error("Record ID required");
    const response = await api.post(`/health-records/${recordId}/restore`);
    return response.data;
  },

  async uploadRecordAttachment(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/health-records/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },

  async uploadPatientDocument(patientId, file, title = "Clinical Document", recordType = "DIAGNOSTIC_REPORT") {
    if (!patientId) throw new Error("Patient ID required");
    const uploadRes = await this.uploadRecordAttachment(file);
    const fileUrl = uploadRes.file_url || uploadRes.url || "";
    const recordPayload = {
      patient_id: patientId,
      record_type: recordType,
      title: title || file.name,
      notes: `Document uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      attachments: [{
        name: file.name,
        url: fileUrl,
        size: file.size,
        type: file.type,
      }],
      file_url: fileUrl,
      file_name: file.name,
      file_size: file.size,
    };
    return await this.createHealthRecord(recordPayload);
  },

  async getPatientDocuments(patientId) {
    if (!patientId) return [];
    const records = await this.getHealthRecords({ patientId, limit: 100 });
    return records;
  },

  async deletePatientDocument(recordId) {
    return await this.deleteHealthRecord(recordId);
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

  async acknowledgeAlert(alertId, note = "", patientId = null) {
    try {
      const response = await api.post(`/health-alerts/${alertId}/acknowledge`, {
        note,
        patient_id: patientId,
      });
      return response.data;
    } catch (error) {
      // Fallback to PUT /health-alerts/:id
      const fallbackRes = await api.put(`/health-alerts/${alertId}`, {
        acknowledged: true,
        note,
        patient_id: patientId,
      });
      return fallbackRes.data;
    }
  },

  async acknowledgeAllAlerts(patientIds = []) {
    try {
      const response = await api.post("/health-alerts/acknowledge-all", {
        patient_ids: patientIds,
      });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async escalateAlert(alertId, reason = "") {
    try {
      const response = await api.post(`/health-alerts/${alertId}/escalate`, { reason });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async resolveAlert(alertId, note = "") {
    try {
      const response = await api.post(`/health-alerts/${alertId}/resolve`, { note });
      return response.data;
    } catch (error) {
      return { success: false, error: error.message };
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

  async refundInvoice(id, data = {}) {
    const response = await api.post(`/billing/invoices/${id}/refund`, data);
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

  async getReviewQueue(category = "") {
    try {
      const response = await api.get("/ai-assistant/review-queue", { params: { category } });
      return response.data;
    } catch (error) {
      return { total_drafts: 0, queue: [] };
    }
  },

  async approveKbEntry(entryId) {
    const response = await api.post("/ai-assistant/entry/approve", { entry_id: entryId });
    return response.data;
  },

  async editKbEntry(entryId, updates) {
    const response = await api.post("/ai-assistant/entry/edit", { entry_id: entryId, updates });
    return response.data;
  },

  async submitAIFeedback(feedbackData) {
    const response = await api.post("/ai-assistant/feedback", feedbackData);
    return response.data;
  },

  async clearAISession(sessionId) {
    const response = await api.post("/ai-assistant/session/clear", { session_id: sessionId });
    return response.data;
  },
};

export default doctorService;

