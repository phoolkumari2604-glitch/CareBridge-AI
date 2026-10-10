import api from "./api";

const patientService = {
  getCurrentPatientId() {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.patient_id || user.id || user._id;
      }
    } catch {
      // ignore
    }
    return null;
  },

  // ==========================================
  // PATIENT PROFILE & MANAGEMENT
  // ==========================================
  async getPatients(params = {}) {
    const res = await api.get("/patients/", { params });
    return res.data;
  },

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

  async deletePatientProfile(patientId) {
    const res = await api.delete(`/patients/${patientId}`);
    return res.data;
  },

  // ==========================================
  // DOCTORS & AVAILABILITY
  // ==========================================
  async getDoctors(filters = {}) {
    const params = new URLSearchParams();
    if (filters.specialty) params.append("specialty", filters.specialty);
    if (filters.hospital_id) params.append("hospital_id", filters.hospital_id);
    if (filters.search) params.append("search", filters.search);
    if (filters.all) params.append("all", "true");
    if (filters.limit !== undefined) params.append("limit", filters.limit);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await api.get(`/doctors/${queryString}`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.doctors)) return res.data.doctors;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
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
    const res = await api.post("/appointments/", data);
    return res.data;
  },

  async getAppointments(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const query = pId ? `?patient_id=${pId}` : "";
    const res = await api.get(`/appointments/${query}`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.appointments)) return res.data.appointments;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async getPatientAppointments(patientId) {
    return this.getAppointments(patientId);
  },

  async getAppointment(appointmentId) {
    const res = await api.get(`/appointments/${appointmentId}`);
    return res.data;
  },

  async updateAppointment(appointmentId, data) {
    const res = await api.put(`/appointments/${appointmentId}`, data);
    return res.data;
  },

  async cancelAppointment(appointmentId) {
    const res = await api.delete(`/appointments/${appointmentId}`);
    return res.data;
  },

  async deleteAppointment(appointmentId) {
    const res = await api.delete(`/appointments/${appointmentId}`);
    return res.data;
  },

  // ==========================================
  // DIGITAL OPD PASS
  // ==========================================
  async getOPDPasses(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const query = pId ? `?patient_id=${pId}` : "";
    const res = await api.get(`/opd-pass/${query}`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.passes)) return res.data.passes;
    if (res.data && Array.isArray(res.data.opd_passes)) return res.data.opd_passes;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async getPatientOPDPasses(patientId) {
    return this.getOPDPasses(patientId);
  },

  async getOPDPass(opdPassId) {
    const res = await api.get(`/opd-pass/${opdPassId}`);
    return res.data;
  },

  async createOPDPass(appointmentId) {
    const res = await api.post(`/opd-pass/${appointmentId}`);
    return res.data;
  },

  async validateOPDPass(passNumber) {
    const res = await api.post("/opd-pass/validate", { pass_number: passNumber });
    return res.data;
  },

  async requestOPDPassOTP(passNumber) {
    const res = await api.post("/opd-pass/request-otp", { pass_number: passNumber });
    return res.data;
  },

  async verifyOPDPassOTP(passNumber, otp) {
    const res = await api.post("/opd-pass/verify-otp", { pass_number: passNumber, otp });
    return res.data;
  },


  // ==========================================
  // LIVE QUEUE
  // ==========================================
  async getLiveQueue(departmentIdOrQuery) {
    const res = await api.get("/queue/");
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.queue)) return res.data.queue;
    if (res.data && Array.isArray(res.data.entries)) return res.data.entries;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async getQueue() {
    const res = await api.get("/queue/");
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.queue)) return res.data.queue;
    if (res.data && Array.isArray(res.data.entries)) return res.data.entries;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async getQueueEntry(queueId) {
    const res = await api.get(`/queue/${queueId}`);
    return res.data;
  },

  // ==========================================
  // APPROVALS & SMARTFLOW
  // ==========================================
  async getPatientApprovals(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const query = pId ? `?patient_id=${pId}` : "";
    const res = await api.get(`/approvals/${query}`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.approvals)) return res.data.approvals;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async getApproval(approvalId) {
    const res = await api.get(`/approvals/${approvalId}`);
    return res.data;
  },

  async runSmartFlow(appointmentId) {
    const res = await api.post(`/smartflow/${appointmentId}`);
    return res.data;
  },

  // ==========================================
  // HOSPITALS & LEAFMAP GEOLOCATION
  // ==========================================
  async getHospitals(city) {
    const query = city ? `?city=${encodeURIComponent(city)}` : "";
    const res = await api.get(`/hospitals/${query}`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.hospitals)) return res.data.hospitals;
    if (res.data && Array.isArray(res.data.facilities)) return res.data.facilities;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async getHospital(hospitalId) {
    const res = await api.get(`/hospitals/${hospitalId}`);
    return res.data;
  },

  async searchHospitalsByCity(city) {
    const res = await api.get(`/hospitals/search/by-city?city=${encodeURIComponent(city)}`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.hospitals)) return res.data.hospitals;
    if (res.data && Array.isArray(res.data.facilities)) return res.data.facilities;
    return [];
  },

  async getRealtimeNearbyHospitals(lat, lng, radiusKm = 10) {
    const res = await api.get(`/hospitals/nearby/realtime?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.hospitals)) return res.data.hospitals;
    if (res.data && Array.isArray(res.data.facilities)) return res.data.facilities;
    return [];
  },

  async getNearbyFacilities(lat, lng, radiusKm = 10) {
    return this.getRealtimeNearbyHospitals(lat, lng, radiusKm);
  },

  getHospitalMapHtmlUrl(lat, lng) {
    const base = api.defaults.baseURL || "http://127.0.0.1:5000/api";
    const cleanBase = base.replace(/\/api\/?$/, "");
    if (lat && lng) {
      return `${cleanBase}/api/hospitals/map/html?lat=${lat}&lng=${lng}`;
    }
    return `${cleanBase}/api/hospitals/map/html`;
  },

  // ==========================================
  // HEALTH RECORDS & FILE UPLOADS
  // ==========================================
  async getHealthRecords(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.get(`/health-records/${pId}`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.records)) return res.data.records;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async createHealthRecord(data) {
    const res = await api.post("/health-records/", data);
    return res.data;
  },

  async uploadHealthRecordFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/health-records/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  async deleteHealthRecord(recordId) {
    const res = await api.delete(`/health-records/${recordId}`);
    return res.data;
  },

  async deleteHealthRecordsBatch(recordIds) {
    const res = await api.post("/health-records/batch-delete", { record_ids: recordIds });
    return res.data;
  },

  // ==========================================
  // VITALS & ALERTS
  // ==========================================
  async getVitals(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.get(`/vitals/${pId}`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.vitals)) return res.data.vitals;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async getLatestVitals(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.get(`/vitals/${pId}/latest`);
    return res.data;
  },

  async getLatestVital(patientId) {
    return this.getLatestVitals(patientId);
  },

  async getHealthProfile(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.get(`/health-profiles/${pId}`);
    return res.data;
  },

  async updateHealthProfile(patientId, data) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.put(`/health-profiles/${pId}`, data);
    return res.data;
  },

  async getHealthAlerts(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.get(`/health-alerts/${pId}`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.alerts)) return res.data.alerts;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async acknowledgeAlert(alertId) {
    const res = await api.put(`/health-alerts/${alertId}`, { acknowledged: true });
    return res.data;
  },

  async getAlertSummary(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.get(`/health-alerts/${pId}/summary`);
    return res.data;
  },

  // ==========================================
  // AI ASSISTANT
  // ==========================================
  async chatWithAI(patientId, message, images = []) {
    const pId = patientId || this.getCurrentPatientId();
    
    if (images && images.length > 0) {
      const formData = new FormData();
      formData.append("patient_id", pId);
      formData.append("message", message || "");
      images.forEach((imgFile) => {
        formData.append("images", imgFile);
      });
      const res = await api.post("/ai-assistant/chat", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    }

    const res = await api.post("/ai-assistant/chat", {
      patient_id: pId,
      message,
    });
    return res.data;
  },

  async getAIHistory(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.get(`/ai-assistant/history/${pId}`);
    return res.data;
  },

  async clearAIHistory(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.delete(`/ai-assistant/history/all/${pId}`);
    return res.data;
  },

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  async getNotifications(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.get(`/notifications/${pId}`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.notifications)) return res.data.notifications;
    if (res.data && Array.isArray(res.data.data)) return res.data.data;
    return [];
  },

  async getUnreadCount(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.get(`/notifications/${pId}/unread-count`);
    return res.data;
  },

  async markNotificationRead(notificationId) {
    const res = await api.put(`/notifications/${notificationId}`, { is_read: true });
    return res.data;
  },

  async markAllNotificationsRead(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.put(`/notifications/${pId}/mark-all-read`);
    return res.data;
  },

  async clearAllNotifications(patientId) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.delete(`/notifications/${pId}/clear-all`);
    return res.data;
  },

  async simulateAlert(patientId, alertData) {
    const pId = patientId || this.getCurrentPatientId();
    const res = await api.post("/notifications/simulate-alert", {
      patient_id: pId,
      ...alertData,
    });
    return res.data;
  },
};

export { patientService };
export default patientService;

