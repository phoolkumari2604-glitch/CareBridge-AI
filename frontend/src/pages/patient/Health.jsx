import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  HeartPulse,
  Droplets,
  Thermometer,
  Wind,
  FileText,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  CalendarDays,
  ShieldCheck,
  Plus,
  Clock,
  Stethoscope,
  Info,
  Loader2,
  CheckCircle2,
  X,
  Upload,
  Pill,
  Building,
  Eye,
  Weight,
  Trash2,
  Camera,
  Image as ImageIcon,
  RotateCw,
  RotateCcw,
  Check,
  Download,
  Maximize2,
  CheckSquare,
  Square,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import AnatomicalHeart3D from "../../components/patient/AnatomicalHeart3D";
import InteractiveBodyMap from "../../components/patient/InteractiveBodyMap";
import "./Health.css";

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function Health() {
  const { user } = useAuth();
  const patientId = user?.patient_id || user?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [vitals, setVitals] = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
  const [healthRecords, setHealthRecords] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertSummary, setAlertSummary] = useState(null);

  // Record Viewer Modal
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Upload Form Modal
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Multi-file upload state in form
  const [recordFiles, setRecordFiles] = useState([]); // [{ file, id, name, size, previewUrl, type }]
  const filePickerRef = useRef(null);
  const mobileCameraRef = useRef(null);

  // Delete & Multi-select State
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [recordToDelete, setRecordToDelete] = useState(null); // single delete confirmation
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

  // Camera in Add Record Form
  const [isRecordCameraOpen, setIsRecordCameraOpen] = useState(false);
  const [recordFacingMode, setRecordFacingMode] = useState("environment");
  const [capturedRecordPhoto, setCapturedRecordPhoto] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Form Fields
  const [newRecord, setNewRecord] = useState({
    title: "",
    record_type: "CONSULTATION",
    diagnosis: "",
    description: "",
    medications: "",
    doctor_name: "",
    hospital_name: "CareBridge Medical Center",
    record_date: new Date().toISOString().split("T")[0],
  });

  const fetchHealthData = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [
        vitalsRes,
        profileRes,
        recordsRes,
        alertsRes,
        summaryRes,
      ] = await Promise.allSettled([
        patientService.getLatestVital(patientId),
        patientService.getHealthProfile(patientId),
        patientService.getHealthRecords(patientId),
        patientService.getHealthAlerts(patientId),
        patientService.getAlertSummary(patientId),
      ]);

      if (vitalsRes.status === "fulfilled") {
        setVitals(vitalsRes.value);
      }
      if (profileRes.status === "fulfilled") {
        setHealthProfile(profileRes.value);
      }
      if (recordsRes.status === "fulfilled") {
        setHealthRecords(Array.isArray(recordsRes.value) ? recordsRes.value : []);
      }
      if (alertsRes.status === "fulfilled") {
        setAlerts(Array.isArray(alertsRes.value) ? alertsRes.value : []);
      }
      if (summaryRes.status === "fulfilled") {
        setAlertSummary(summaryRes.value);
      }
    } catch (err) {
      console.error("Failed to load health telemetry:", err);
      setError("Unable to retrieve physiological telemetry records.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // ==========================================
  // MULTI-FILE UPLOAD HANDLERS
  // ==========================================
  const handleFilesSelected = (files) => {
    setUploadError(null);
    if (!files || files.length === 0) return;

    const incoming = Array.from(files);
    if (recordFiles.length + incoming.length > MAX_FILES) {
      setUploadError(`Maximum ${MAX_FILES} attachments allowed per health record.`);
      return;
    }

    const validatedList = [];
    for (const file of incoming) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setUploadError(`File '${file.name}' exceeds 10 MB limit.`);
        return;
      }
      const isImg = file.type.startsWith("image/");
      const previewUrl = isImg ? URL.createObjectURL(file) : null;

      validatedList.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
      });
    }

    setRecordFiles((prev) => [...prev, ...validatedList]);
  };

  const removeRecordFile = (idToRemove) => {
    setRecordFiles((prev) => {
      const target = prev.find((f) => f.id === idToRemove);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== idToRemove);
    });
  };

  // Drag and Drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  // ==========================================
  // CAMERA CAPTURE IN RECORD FORM
  // ==========================================
  const startCamera = async (facing = recordFacingMode) => {
    stopCamera();
    setCameraError(null);
    setCapturedRecordPhoto(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera start failed:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in browser settings."
          : "Unable to access camera. On mobile devices, file camera fallback is enabled."
      );
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const openCameraModal = () => {
    setIsRecordCameraOpen(true);
    startCamera(recordFacingMode);
  };

  const closeCameraModal = () => {
    stopCamera();
    setCapturedRecordPhoto(null);
    setCameraError(null);
    setIsRecordCameraOpen(false);
  };

  const flipCamera = () => {
    const next = recordFacingMode === "user" ? "environment" : "user";
    setRecordFacingMode(next);
    startCamera(next);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedRecordPhoto(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedRecordPhoto(null);
    startCamera(recordFacingMode);
  };

  const addPhotoToRecord = () => {
    if (!capturedRecordPhoto) return;

    fetch(capturedRecordPhoto)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `medical_scan_${Date.now()}.jpg`, { type: "image/jpeg" });
        handleFilesSelected([file]);
        closeCameraModal();
      })
      .catch((err) => {
        console.error("Error attaching captured photo:", err);
      });
  };

  // ==========================================
  // CREATE / SAVE RECORD
  // ==========================================
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    if (!newRecord.title.trim()) {
      setUploadError("Please enter a record title.");
      return;
    }

    try {
      setUploadLoading(true);
      setUploadProgress(20);
      setUploadError(null);

      const formData = new FormData();
      formData.append("patient_id", patientId);
      formData.append("title", newRecord.title.trim());
      formData.append("record_type", newRecord.record_type);
      formData.append("diagnosis", newRecord.diagnosis.trim());
      formData.append("description", newRecord.description.trim());
      formData.append("doctor_name", newRecord.doctor_name.trim() || "Consulting Specialist");
      formData.append("hospital_name", newRecord.hospital_name.trim());
      formData.append("record_date", newRecord.record_date);

      const meds = newRecord.medications
        ? newRecord.medications.split(",").map((m) => m.trim()).filter(Boolean)
        : [];
      meds.forEach((m) => formData.append("medications", m));

      // Append all attached files
      recordFiles.forEach((rf) => {
        formData.append("files", rf.file);
      });

      setUploadProgress(60);
      const res = await patientService.createHealthRecord(formData);
      setUploadProgress(100);

      const created = res.record || {
        _id: res.record_id,
        ...newRecord,
        medications: meds,
        attachments: recordFiles.map((rf) => ({
          file_name: rf.name,
          file_url: rf.previewUrl,
          size_bytes: rf.size,
        })),
        created_at: new Date().toISOString(),
      };

      setHealthRecords((prev) => [created, ...prev]);
      showToast("Health record and attached documents saved successfully.");

      // Reset
      setUploadModal(false);
      setRecordFiles([]);
      setNewRecord({
        title: "",
        record_type: "CONSULTATION",
        diagnosis: "",
        description: "",
        medications: "",
        doctor_name: "",
        hospital_name: "CareBridge Medical Center",
        record_date: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      console.error("Failed to upload record:", err);
      setUploadError(err.response?.data?.detail || "Failed to save health record. Please try again.");
    } finally {
      setUploadLoading(false);
      setUploadProgress(0);
    }
  };

  // ==========================================
  // DELETE & MULTI-SELECT HANDLERS
  // ==========================================
  const handleDeleteSingle = async () => {
    if (!recordToDelete) return;
    const rId = recordToDelete._id || recordToDelete.id;

    try {
      await patientService.deleteHealthRecord(rId);
      setHealthRecords((prev) => prev.filter((r) => (r._id || r.id) !== rId));
      setSelectedRecordIds((prev) => prev.filter((id) => id !== rId));
      showToast("Health record and attached files permanently deleted.");
      setRecordToDelete(null);
    } catch (err) {
      console.error("Delete failed:", err);
      alert(err.response?.data?.detail || "Failed to delete record.");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRecordIds.length === 0) return;

    try {
      await patientService.deleteHealthRecordsBatch(selectedRecordIds);
      setHealthRecords((prev) => prev.filter((r) => !selectedRecordIds.includes(r._id || r.id)));
      showToast(`Successfully deleted ${selectedRecordIds.length} health record(s).`);
      setSelectedRecordIds([]);
      setBatchDeleteConfirm(false);
    } catch (err) {
      console.error("Batch delete failed:", err);
      alert("Failed to delete selected records.");
    }
  };

  const toggleSelectRecord = (id) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRecordIds.length === healthRecords.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(healthRecords.map((r) => r._id || r.id));
    }
  };

  // Status computation
  const isAlert = alertSummary?.status === "ALERT" || alerts.some((a) => (a.severity || "").toUpperCase() === "CRITICAL");

  // Vitals array
  const vitalsList = [
    {
      label: "Heart Rate",
      value: vitals?.heart_rate ? `${vitals.heart_rate}` : "72",
      unit: "BPM",
      status: vitals?.heart_rate ? (vitals.heart_rate > 100 ? "High" : vitals.heart_rate < 55 ? "Low" : "Normal") : "Normal",
      icon: HeartPulse,
      className: "hr-card",
    },
    {
      label: "Blood Pressure",
      value: vitals?.systolic_bp && vitals?.diastolic_bp ? `${vitals.systolic_bp}/${vitals.diastolic_bp}` : "120/80",
      unit: "mmHg",
      status: vitals?.systolic_bp ? (vitals.systolic_bp >= 140 ? "High" : "Optimal") : "Normal",
      icon: Activity,
      className: "bp-card",
    },
    {
      label: "Blood Oxygen (SpO2)",
      value: vitals?.spo2 ? `${vitals.spo2}` : "98",
      unit: "%",
      status: vitals?.spo2 ? (vitals.spo2 < 95 ? "Low" : "Normal") : "Optimal",
      icon: Wind,
      className: "spo2-card",
    },
    {
      label: "Body Temperature",
      value: vitals?.temperature ? `${vitals.temperature}` : "36.8",
      unit: "°C",
      status: vitals?.temperature ? (vitals.temperature >= 38 ? "Fever" : "Normal") : "Normal",
      icon: Thermometer,
      className: "temp-card",
    },
    {
      label: "Blood Glucose",
      value: vitals?.blood_sugar ? `${vitals.blood_sugar}` : "95",
      unit: "mg/dL",
      status: vitals?.blood_sugar ? (vitals.blood_sugar > 140 ? "High" : "Normal") : "Normal",
      icon: Droplets,
      className: "sugar-card",
    },
  ];

  if (loading) {
    return (
      <div className="health-loading">
        <Loader2 size={36} className="spinner-icon" />
        <p>Retrieving real-time physiological telemetry and health records...</p>
      </div>
    );
  }

  return (
    <div className="health-page">
      {/* DELETE SINGLE RECORD MODAL */}
      {recordToDelete && (
        <div className="health-modal-backdrop" onClick={() => setRecordToDelete(null)}>
          <div className="health-modal-card confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon red">
              <Trash2 size={24} />
            </div>
            <h3>Delete Health Record?</h3>
            <p>
              Are you sure you want to delete <strong>"{recordToDelete.title}"</strong>? All associated files and clinical attachments will be permanently removed from secure storage.
            </p>
            <div className="confirm-actions">
              <button onClick={() => setRecordToDelete(null)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleDeleteSingle} className="btn-danger-confirm">
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH DELETE CONFIRMATION MODAL */}
      {batchDeleteConfirm && (
        <div className="health-modal-backdrop" onClick={() => setBatchDeleteConfirm(false)}>
          <div className="health-modal-card confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon red">
              <Trash2 size={24} />
            </div>
            <h3>Delete {selectedRecordIds.length} Selected Records?</h3>
            <p>
              This action cannot be undone. All selected records and attached files will be permanently purged.
            </p>
            <div className="confirm-actions">
              <button onClick={() => setBatchDeleteConfirm(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleBatchDelete} className="btn-danger-confirm">
                Delete {selectedRecordIds.length} Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD DETAIL & ATTACHMENT VIEWER MODAL */}
      {selectedRecord && (
        <div className="health-modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="health-modal-card record-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="health-modal-header">
              <div className="modal-title">
                <FileText size={18} />
                <span>{selectedRecord.title}</span>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="record-detail-body">
              <div className="record-meta-grid">
                <div>
                  <span>Record Type:</span>
                  <strong>{selectedRecord.record_type || "Consultation"}</strong>
                </div>
                <div>
                  <span>Date:</span>
                  <strong>{selectedRecord.record_date || new Date(selectedRecord.created_at).toLocaleDateString()}</strong>
                </div>
                <div>
                  <span>Doctor:</span>
                  <strong>{selectedRecord.doctor_name || "Consulting Specialist"}</strong>
                </div>
                <div>
                  <span>Facility:</span>
                  <strong>{selectedRecord.hospital_name || "CareBridge Medical"}</strong>
                </div>
              </div>

              {selectedRecord.diagnosis && (
                <div className="record-section-box">
                  <span>Clinical Diagnosis:</span>
                  <p>{selectedRecord.diagnosis}</p>
                </div>
              )}

              {selectedRecord.description && (
                <div className="record-section-box">
                  <span>Clinical Observations & Notes:</span>
                  <p>{selectedRecord.description}</p>
                </div>
              )}

              {/* ATTACHMENTS VIEWER */}
              {((selectedRecord.attachments && selectedRecord.attachments.length > 0) || selectedRecord.file_url) && (
                <div className="record-attachments-section">
                  <span>Attached Medical Scans & Documents:</span>
                  <div className="record-att-grid">
                    {selectedRecord.attachments?.map((att, idx) => {
                      const isImg = att.file_url?.match(/\.(jpg|jpeg|png|webp)/i);
                      return (
                        <div key={idx} className="att-viewer-card">
                          {isImg ? (
                            <img src={att.file_url} alt={att.file_name} className="att-preview-img" />
                          ) : (
                            <div className="att-pdf-placeholder">
                              <FileText size={28} />
                              <small>PDF / Document</small>
                            </div>
                          )}
                          <div className="att-info-strip">
                            <span className="att-name">{att.file_name}</span>
                            <a
                              href={att.file_url}
                              download={att.file_name}
                              target="_blank"
                              rel="noreferrer"
                              className="att-dl-btn"
                              title="Download file"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      );
                    })}

                    {/* Legacy single file */}
                    {!selectedRecord.attachments?.length && selectedRecord.file_url && (
                      <div className="att-viewer-card">
                        <div className="att-pdf-placeholder">
                          <FileText size={28} />
                          <small>Document</small>
                        </div>
                        <div className="att-info-strip">
                          <span className="att-name">{selectedRecord.file_name || "medical_record.pdf"}</span>
                          <a href={selectedRecord.file_url} download target="_blank" rel="noreferrer" className="att-dl-btn">
                            <Download size={14} />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CAMERA CAPTURE MODAL (RECORD FORM) */}
      {isRecordCameraOpen && (
        <div className="health-modal-backdrop">
          <div className="health-modal-card camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="health-modal-header">
              <div className="modal-title">
                <Camera size={18} />
                <span>Capture Medical Document or Symptom</span>
              </div>
              <button onClick={closeCameraModal} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="camera-viewport">
              {cameraError ? (
                <div className="camera-error-box">
                  <AlertTriangle size={32} />
                  <p>{cameraError}</p>
                  <button onClick={() => mobileCameraRef.current?.click()} className="btn-fallback-cam">
                    <Camera size={14} /> Use Device Camera
                  </button>
                </div>
              ) : capturedRecordPhoto ? (
                <img src={capturedRecordPhoto} alt="Captured photo" className="camera-preview-img" />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="camera-video-feed" />
              )}
            </div>

            <div className="camera-footer">
              {!capturedRecordPhoto && !cameraError && (
                <>
                  <button type="button" onClick={flipCamera} className="cam-tool-btn">
                    <RotateCw size={15} /> Flip
                  </button>
                  <button type="button" onClick={takeSnapshot} className="cam-capture-btn">
                    <div className="capture-inner" />
                  </button>
                  <button type="button" onClick={() => mobileCameraRef.current?.click()} className="cam-tool-btn">
                    <ImageIcon size={15} /> Files
                  </button>
                </>
              )}

              {capturedRecordPhoto && (
                <>
                  <button type="button" onClick={retakePhoto} className="btn-cancel">
                    <RotateCcw size={14} /> Retake
                  </button>
                  <button type="button" onClick={addPhotoToRecord} className="btn-save-record">
                    <Check size={14} /> Add to Record
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD HEALTH RECORD MODAL */}
      {uploadModal && (
        <div className="health-modal-backdrop" onClick={() => setUploadModal(false)}>
          <div className="health-modal-card add-record-modal" onClick={(e) => e.stopPropagation()}>
            <div className="health-modal-header">
              <div className="modal-title">
                <Plus size={18} />
                <span>Add Medical Health Record</span>
              </div>
              <button onClick={() => setUploadModal(false)} className="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="add-record-form" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
              {uploadError && (
                <div className="upload-error-banner">
                  <AlertCircle size={15} />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Record Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Comprehensive Lipid Panel & Blood Count"
                    value={newRecord.title}
                    onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Record Category</label>
                  <select
                    value={newRecord.record_type}
                    onChange={(e) => setNewRecord({ ...newRecord, record_type: e.target.value })}
                  >
                    <option value="CONSULTATION">Consultation Note</option>
                    <option value="LAB_REPORT">Diagnostic Lab Report</option>
                    <option value="PRESCRIPTION">Prescription / Medication Order</option>
                    <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                    <option value="IMAGING">Radiology / Imaging / ECG</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Consulting Doctor</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Priya Sharma"
                    value={newRecord.doctor_name}
                    onChange={(e) => setNewRecord({ ...newRecord, doctor_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Hospital / Clinic Facility</label>
                  <input
                    type="text"
                    placeholder="e.g. CareBridge Medical Center"
                    value={newRecord.hospital_name}
                    onChange={(e) => setNewRecord({ ...newRecord, hospital_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Diagnosis / Clinical Impression</label>
                  <input
                    type="text"
                    placeholder="e.g. Stage 1 Essential Hypertension"
                    value={newRecord.diagnosis}
                    onChange={(e) => setNewRecord({ ...newRecord, diagnosis: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Record Date</label>
                  <input
                    type="date"
                    value={newRecord.record_date}
                    onChange={(e) => setNewRecord({ ...newRecord, record_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Clinical Description & Findings</label>
                <textarea
                  rows="2"
                  placeholder="Physician notes, lab value interpretation, follow-up timeline..."
                  value={newRecord.description}
                  onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                />
              </div>

              {/* ATTACHMENT DROPZONE & CAMERA BUTTON */}
              <div className="form-attachments-zone">
                <label>Attached Documents & Scans (Max {MAX_FILES} files, up to 10 MB each)</label>

                <input
                  type="file"
                  ref={filePickerRef}
                  style={{ display: "none" }}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />

                <input
                  type="file"
                  ref={mobileCameraRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />

                <div className="dropzone-buttons-row">
                  <button
                    type="button"
                    onClick={() => filePickerRef.current?.click()}
                    className="dz-action-btn"
                  >
                    <Upload size={15} /> Select Files (PDF, PNG, JPG)
                  </button>

                  <button
                    type="button"
                    onClick={openCameraModal}
                    className="dz-action-btn camera"
                  >
                    <Camera size={15} /> Take Photo of Document
                  </button>
                </div>

                {/* ATTACHED FILES LIST */}
                {recordFiles.length > 0 && (
                  <div className="attached-files-list">
                    {recordFiles.map((rf) => (
                      <div key={rf.id} className="attached-file-chip">
                        {rf.previewUrl ? (
                          <img src={rf.previewUrl} alt={rf.name} className="rf-thumb" />
                        ) : (
                          <FileText size={20} className="rf-icon" />
                        )}
                        <div className="rf-details">
                          <span className="rf-name">{rf.name}</span>
                          <small className="rf-size">{(rf.size / (1024 * 1024)).toFixed(2)} MB</small>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRecordFile(rf.id)}
                          className="rf-remove-btn"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {uploadProgress > 0 && (
                <div className="upload-progress-bar-wrap">
                  <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              <div className="health-modal-actions">
                <button type="button" onClick={() => setUploadModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" disabled={uploadLoading} className="btn-save-record">
                  {uploadLoading ? <Loader2 size={16} className="spinner-icon" /> : <Check size={16} />}
                  <span>{uploadLoading ? "Uploading & Encrypting..." : "Save Record"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAGE HEADER - WCAG AA HIGH CONTRAST */}
      <div className="health-header">
        <div>
          <span className="health-kicker">CLINICAL TELEMETRY & DOSSIER</span>
          <h1 className="health-main-title">My Health Application</h1>
          <p className="health-main-subtitle">
            Continuous physiological vital-signs telemetry, 3D biomechanical cardiac models, and encrypted EHR records.
          </p>
        </div>

        <div className="health-header-actions">
          <button className="health-add-btn" onClick={() => setUploadModal(true)}>
            <Plus size={16} />
            <span>Add Record</span>
          </button>

          <Link to="/patient/ai-assistant" className="health-assistant-btn">
            <Activity size={16} />
            <span>Consult AI</span>
          </Link>
        </div>
      </div>

      {/* TOAST BANNER */}
      {toastMessage && (
        <div className="health-toast-banner">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* OVERALL HEALTH STATUS CARD */}
      <section className={`health-status-card ${isAlert ? "alert-mode" : ""}`}>
        <div className="health-status-icon">
          {isAlert ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
        </div>

        <div className="health-status-content">
          <span>CLINICAL TRIAGE STATUS</span>
          <h2>{isAlert ? "Attention Recommended" : "Vitals are Stable & Normal"}</h2>
          <p>
            {alertSummary?.message ||
              (isAlert
                ? "Some recorded parameters fall outside standard physiological thresholds. Review active alerts below."
                : "All recent vital sign measurements are within configured safe healthcare parameters.")}
          </p>
        </div>

        <div className="health-status-date">
          <CalendarDays size={15} />
          {vitals?.recorded_at
            ? `Synced ${new Date(vitals.recorded_at).toLocaleDateString()}`
            : "Telemetry Active"}
        </div>
      </section>

      {/* 3D ANATOMICAL HEART VISUALIZATION */}
      <AnatomicalHeart3D
        heartRate={vitals?.heart_rate || 72}
        isAbnormal={vitals?.heart_rate ? vitals.heart_rate > 100 || vitals.heart_rate < 55 : false}
        status={alertSummary?.status || "NORMAL"}
      />

      {/* INTERACTIVE BODY MAP */}
      <InteractiveBodyMap vitals={vitals} healthProfile={healthProfile} alerts={alerts} />

      {/* VITALS GRID */}
      <section className="health-section">
        <div className="health-section-heading">
          <div>
            <span className="heading-kicker">PHYSIOLOGICAL TELEMETRY</span>
            <h2 className="heading-title">Latest Recorded Vitals</h2>
          </div>
          {vitals?.recorded_at && (
            <span className="last-sync-tag">
              <Clock size={13} />
              {new Date(vitals.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        <div className="vitals-grid">
          {vitalsList.map((vital) => {
            const Icon = vital.icon;
            const isAbnormal =
              vital.status === "Abnormal" ||
              vital.status === "High" ||
              vital.status === "Fever" ||
              vital.status === "Low";

            return (
              <div
                className={`vital-card ${vital.className} ${isAbnormal ? "vital-alert" : ""}`}
                key={vital.label}
              >
                <div className="vital-top">
                  <div className="vital-icon">
                    <Icon size={18} />
                  </div>
                  <span className={`vital-status ${isAbnormal ? "status-bad" : "status-good"}`}>
                    {vital.status}
                  </span>
                </div>

                <span className="vital-label">{vital.label}</span>

                <div className="vital-value">
                  {vital.value}
                  <small>{vital.unit}</small>
                </div>

                <div className="vital-trend">
                  <TrendingUp size={13} />
                  {isAbnormal ? "Clinical Review Needed" : "Safe Range"}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* RECORDS & ALERTS SECTION */}
      <div className="health-content-grid">
        {/* RECORDS CARD WITH MULTI-SELECT & DELETE */}
        <section className="records-card">
          <div className="health-section-heading">
            <div>
              <span className="heading-kicker">CLINICAL DOSSIER</span>
              <h2 className="heading-title">Medical Health Records</h2>
            </div>
            <div className="records-header-actions">
              <span className="count-pill">{healthRecords.length} Records</span>
              <button className="small-add-record-btn" onClick={() => setUploadModal(true)}>
                <Plus size={14} /> Add Record
              </button>
            </div>
          </div>

          {/* BATCH ACTION TOOLBAR */}
          {healthRecords.length > 0 && (
            <div className="records-bulk-toolbar">
              <button type="button" onClick={toggleSelectAll} className="bulk-select-all-btn">
                {selectedRecordIds.length === healthRecords.length ? (
                  <CheckSquare size={15} />
                ) : (
                  <Square size={15} />
                )}
                <span>
                  {selectedRecordIds.length === healthRecords.length ? "Deselect All" : "Select All"}
                </span>
              </button>

              {selectedRecordIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBatchDeleteConfirm(true)}
                  className="bulk-delete-btn"
                >
                  <Trash2 size={14} />
                  <span>Delete Selected ({selectedRecordIds.length})</span>
                </button>
              )}
            </div>
          )}

          {healthRecords.length === 0 ? (
            <div className="empty-inner-state">
              <FileText size={36} />
              <p>No electronic health records uploaded yet.</p>
              <button className="upload-first-btn" onClick={() => setUploadModal(true)}>
                <Upload size={14} /> Upload First Record
              </button>
            </div>
          ) : (
            <div className="records-list">
              {healthRecords.map((rec) => {
                const rId = rec._id || rec.id;
                const isSelected = selectedRecordIds.includes(rId);

                return (
                  <div key={rId} className={`record-item ${isSelected ? "selected" : ""}`}>
                    <div className="record-item-select">
                      <button
                        type="button"
                        onClick={() => toggleSelectRecord(rId)}
                        className="item-checkbox-btn"
                      >
                        {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </div>

                    <div className="record-item-icon">
                      <FileText size={18} />
                    </div>

                    <div className="record-item-body">
                      <div className="record-item-header">
                        <span className="record-type-badge">{rec.record_type}</span>
                        <span className="record-date">
                          {rec.record_date || new Date(rec.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h4>{rec.title}</h4>

                      {rec.diagnosis && (
                        <p className="record-diagnosis">
                          <strong>Diagnosis:</strong> {rec.diagnosis}
                        </p>
                      )}

                      <div className="record-meta-row">
                        <span className="record-meta-chip">
                          <Stethoscope size={12} />
                          {rec.doctor_name || "Specialist"}
                        </span>
                        <span className="record-meta-chip">
                          <Building size={12} />
                          {rec.hospital_name || "CareBridge Medical"}
                        </span>
                        {rec.attachments && rec.attachments.length > 0 && (
                          <span className="record-meta-chip att-count">
                            <ImageIcon size={12} />
                            {rec.attachments.length} attachment(s)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="record-item-actions">
                      <button
                        className="record-action-icon-btn view"
                        onClick={() => setSelectedRecord(rec)}
                        title="View Record & Attachments"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        className="record-action-icon-btn delete"
                        onClick={() => setRecordToDelete(rec)}
                        title="Delete Record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ALERTS CARD */}
        <section className="alerts-card">
          <div className="health-section-heading">
            <div>
              <span className="heading-kicker">SAFETY THRESHOLDS</span>
              <h2 className="heading-title">Active Health Alerts</h2>
            </div>
            <span className="count-pill red">{alerts.length} Alerts</span>
          </div>

          {alerts.length === 0 ? (
            <div className="empty-inner-state">
              <CheckCircle2 size={36} className="text-green" />
              <p>No active physiological alerts. All measured parameters are within configured safe bounds.</p>
            </div>
          ) : (
            <div className="alerts-list">
              {alerts.map((alert) => (
                <div key={alert.id || alert._id} className="alert-item">
                  <div className="alert-item-icon">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="alert-item-body">
                    <div className="alert-item-top">
                      <span className="alert-type-badge">{alert.alert_type}</span>
                      <span className="alert-severity-badge">{alert.severity}</span>
                    </div>
                    <p>{alert.message}</p>
                    <span className="alert-time">
                      {alert.created_at
                        ? new Date(alert.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "Active"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Health;