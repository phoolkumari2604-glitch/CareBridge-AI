import api from "./api";

const patientService = {
  // ==========================================
  // PATIENT PROFILE & MANAGEMENT
  // ==========================================
  async getPatientProfile(patientId) {
    const res = await api.get(`/patients/${patientId}`);
    return res.data;
  },

  async createPatientProfile(data) {
    const res = await api.post("/patients/", data);
    return res.data;
  },

  async updatePatientProfile(patientId, data) {
    const res = await api.put(`/patients/${patientId}`, data);
    return res.data;
  },

  // ==========================================
  // DOCTORS & AVAILABILITY
  // ==========================================
  async getDoctors() {
    const res = await api.get("/doctors/");
    return res.data;
  },

  async getDoctor(doctorId) {
    const res = await api.get(`/doctors/${doctorId}`);
    return res.data;
  },

  async getDoctorAvailability(doctorId) {
    const res = await api.get(`/doctors/${doctorId}/availability`);
    return res.data;
  },

  // ==========================================
  // APPOINTMENTS
  // ==========================================
  async bookAppointment(data) {
    // data: { patient_id, hospital_id, doctor_id, appointment_date, appointment_time, reason }
    const res = await api.post("/appointments/", data);
    return res.data;
  },

  async getAppointment(appointmentId) {
    const res = await api.get(`/appointments/${appointmentId}`);
    return res.data;
  },

  async updateAppointment(appointmentId, data) {
    const res = await api.put(`/appointments/${appointmentId}`, data);
    return res.data;
  },

  async deleteAppointment(appointmentId) {
    const res = await api.delete(`/appointments/${appointmentId}`);
    return res.data;
  },

  // Local sync helper for tracking patient's appointments
  getStoredAppointmentIds(patientId) {
    if (!patientId) return [];
    try {
      const stored = localStorage.getItem(`carebridge_patient_apts_${patientId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  addStoredAppointmentId(patientId, appointmentId) {
    if (!patientId || !appointmentId) return;
    try {
      const existing = this.getStoredAppointmentIds(patientId);
      if (!existing.includes(appointmentId)) {
        existing.unshift(appointmentId);
        localStorage.setItem(`carebridge_patient_apts_${patientId}`, JSON.stringify(existing));
      }
    } catch {
      // storage quota or parse error
    }
  },

  removeStoredAppointmentId(patientId, appointmentId) {
    if (!patientId || !appointmentId) return;
    try {
      const existing = this.getStoredAppointmentIds(patientId).filter((id) => id !== appointmentId);
      localStorage.setItem(`carebridge_patient_apts_${patientId}`, JSON.stringify(existing));
    } catch {
      // storage error
    }
  },

  // Fetch full details of all stored appointments for patient
  async getPatientAppointments(patientId) {
    const ids = this.getStoredAppointmentIds(patientId);
    if (!ids || ids.length === 0) return [];

    const results = await Promise.allSettled(
      ids.map((id) => this.getAppointment(id))
    );

    const appointments = [];
    const validIds = [];

    results.forEach((res, idx) => {
      if (res.status === "fulfilled" && res.value) {
        appointments.push(res.value);
        validIds.push(ids[idx]);
      }
    });

    // Clean up stale IDs if any failed due to 404
    if (validIds.length !== ids.length) {
      localStorage.setItem(`carebridge_patient_apts_${patientId}`, JSON.stringify(validIds));
    }

    return appointments;
  },

  // ==========================================
  // DIGITAL OPD PASS
  // ==========================================
  async getOPDPass(opdPassId) {
    const res = await api.get(`/opd-pass/${opdPassId}`);
    return res.data;
  },

  getStoredOPDPassIds(patientId) {
    if (!patientId) return [];
    try {
      const stored = localStorage.getItem(`carebridge_patient_opd_${patientId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  addStoredOPDPassId(patientId, opdPassId) {
    if (!patientId || !opdPassId) return;
    try {
      const existing = this.getStoredOPDPassIds(patientId);
      if (!existing.includes(opdPassId)) {
        existing.unshift(opdPassId);
        localStorage.setItem(`carebridge_patient_opd_${patientId}`, JSON.stringify(existing));
      }
    } catch {
      // error
    }
  },

  async getPatientOPDPasses(patientId) {
    const ids = this.getStoredOPDPassIds(patientId);
    if (!ids || ids.length === 0) return [];

    const results = await Promise.allSettled(
      ids.map((id) => this.getOPDPass(id))
    );

    const passes = [];
    results.forEach((res) => {
      if (res.status === "fulfilled" && res.value) {
        passes.push(res.value);
      }
    });

    return passes;
  },

  // ==========================================
  // LIVE QUEUE
  // ==========================================
  async getQueue() {
    const res = await api.get("/queue/");
    return res.data;
  },

  async getQueueEntry(queueId) {
    const res = await api.get(`/queue/${queueId}`);
    return res.data;
  },

  // ==========================================
  // APPROVALS
  // ==========================================
  async getApproval(approvalId) {
    const res = await api.get(`/approvals/${approvalId}`);
    return res.data;
  },

  getStoredApprovalIds(patientId) {
    if (!patientId) return [];
    try {
      const stored = localStorage.getItem(`carebridge_patient_approvals_${patientId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  addStoredApprovalId(patientId, approvalId) {
    if (!patientId || !approvalId) return;
    try {
      const existing = this.getStoredApprovalIds(patientId);
      if (!existing.includes(approvalId)) {
        existing.unshift(approvalId);
        localStorage.setItem(`carebridge_patient_approvals_${patientId}`, JSON.stringify(existing));
      }
    } catch {
      // error
    }
  },

  async getPatientApprovals(patientId) {
    const ids = this.getStoredApprovalIds(patientId);
    if (!ids || ids.length === 0) return [];

    const results = await Promise.allSettled(
      ids.map((id) => this.getApproval(id))
    );

    const approvals = [];
    results.forEach((res) => {
      if (res.status === "fulfilled" && res.value) {
        approvals.push(res.value);
      }
    });

    return approvals;
  },

  // ==========================================
  // HOSPITALS
  // ==========================================
  async getHospitals() {
    const res = await api.get("/hospitals/");
    return res.data;
  },

  async getHospital(hospitalId) {
    const res = await api.get(`/hospitals/${hospitalId}`);
    return res.data;
  },

  async searchHospitalsByCity(city) {
    const res = await api.get(`/hospitals/search/by-city?city=${encodeURIComponent(city)}`);
    return res.data;
  },

  async getNearbyFacilities(lat, lng, radiusKm = 10) {
    const res = await api.get(`/hospitals/nearby/realtime?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`);
    return res.data;
  },

  // ==========================================
  // HEALTH RECORDS & VITALS
  // ==========================================
  async getHealthRecords(patientId) {
    const res = await api.get(`/health-records/${patientId}`);
    return res.data;
  },

  async createHealthRecord(data) {
    const res = await api.post("/health-records/", data);
    return res.data;
  },

  async getVitals(patientId) {
    const res = await api.get(`/vitals/${patientId}`);
    return res.data;
  },

  async getLatestVital(patientId) {
    const res = await api.get(`/vitals/${patientId}/latest`);
    return res.data;
  },

  async getHealthProfile(patientId) {
    const res = await api.get(`/health-profiles/${patientId}`);
    return res.data;
  },

  async createHealthProfile(data) {
    const res = await api.post("/health-profiles/", data);
    return res.data;
  },

  async updateHealthProfile(patientId, data) {
    const res = await api.put(`/health-profiles/${patientId}`, data);
    return res.data;
  },

  async getHealthAlerts(patientId) {
    const res = await api.get(`/health-alerts/${patientId}`);
    return res.data;
  },

  async getAlertSummary(patientId) {
    const res = await api.get(`/health-alerts/${patientId}/summary`);
    return res.data;
  },

  // ==========================================
  // AI ASSISTANT
  // ==========================================
  async chatWithAI(patientId, message) {
    const res = await api.post("/ai-assistant/chat", {
      patient_id: patientId,
      message,
    });
    return res.data;
  },

  async getAIHistory(patientId) {
    const res = await api.get(`/ai-assistant/history/${patientId}`);
    return res.data;
  },

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  async getNotifications(patientId) {
    const res = await api.get(`/notifications/${patientId}`);
    return res.data;
  },

  async getUnreadCount(patientId) {
    const res = await api.get(`/notifications/${patientId}/unread-count`);
    return res.data;
  },

  async markNotificationRead(notificationId) {
    const res = await api.put(`/notifications/${notificationId}`, { is_read: true });
    return res.data;
  },
};

export { patientService };
export default patientService;
