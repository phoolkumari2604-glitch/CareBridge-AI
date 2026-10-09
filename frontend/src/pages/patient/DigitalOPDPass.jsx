import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import jsQR from "jsqr";
import {
  CheckCircle2,
  Clock3,
  Download,
  MapPin,
  CalendarDays,
  Stethoscope,
  ShieldCheck,
  QrCode,
  Printer,
  Copy,
  Building,
  AlertCircle,
  Loader2,
  Archive,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Ticket,
  Camera,
  Upload,
  SwitchCamera,
  X,
  KeyRound,
  FileCheck2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import "./DigitalOPDPass.css";

function DigitalOPDPass() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const appointmentIdParam = searchParams.get("appointmentId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // "active", "archive", or "verify"

  const [activePasses, setActivePasses] = useState([]);
  const [selectedPass, setSelectedPass] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [copyToast, setCopyToast] = useState(false);

  // Scanner & Validation State
  const [verifyToken, setVerifyToken] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpContact, setOtpContact] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [demoOtp, setDemoOtp] = useState(null);

  // Camera Live Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("environment"); // "environment" or "user"
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraFallbackInputRef = useRef(null);
  const otpInputRefs = useRef([]);

  // Timer effect for OTP Cooldown
  useEffect(() => {
    let timer;
    if (otpCooldown > 0) {
      timer = setInterval(() => {
        setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const loadOPDPassData = useCallback(async () => {
    if (!user?.patient_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [passesRes, aptsRes, docsRes, hospsRes] = await Promise.allSettled([
        patientService.getPatientOPDPasses(user.patient_id),
        patientService.getPatientAppointments(user.patient_id),
        patientService.getDoctors(),
        patientService.getHospitals(),
      ]);

      let passes = [];
      if (passesRes.status === "fulfilled") {
        passes = passesRes.value || [];
      }

      let appointments = [];
      if (aptsRes.status === "fulfilled") {
        appointments = aptsRes.value || [];
      }

      if (docsRes.status === "fulfilled") {
        setDoctors(docsRes.value || []);
      }
      if (hospsRes.status === "fulfilled") {
        setHospitals(hospsRes.value || []);
      }

      const consolidatedPasses = [...passes];

      appointments.forEach((apt) => {
        const aptId = apt._id || apt.id;
        const exists = consolidatedPasses.some((p) => p.appointment_id === aptId);
        if (!exists) {
          const passNumber = `OPD-${(apt.appointment_date || "20261009").replace(/-/g, "")}-${String(aptId).slice(-6).toUpperCase()}`;
          consolidatedPasses.push({
            _id: `gen-${aptId}`,
            appointment_id: aptId,
            patient_id: user.patient_id,
            hospital_id: apt.hospital_id,
            doctor_id: apt.doctor_id,
            pass_number: passNumber,
            status: apt.status === "COMPLETED" ? "USED" : apt.approval_status === "APPROVED" ? "ACTIVE" : "PENDING",
            created_at: apt.created_at,
            appointment_date: apt.appointment_date,
            appointment_time: apt.appointment_time,
            reason: apt.reason,
          });
        }
      });

      setActivePasses(consolidatedPasses);

      if (appointmentIdParam) {
        const matched = consolidatedPasses.find((p) => p.appointment_id === appointmentIdParam);
        if (matched) setSelectedPass(matched);
        else setSelectedPass(consolidatedPasses[0] || null);
      } else {
        setSelectedPass(consolidatedPasses[0] || null);
      }
    } catch (err) {
      console.error("Failed to load OPD pass data:", err);
      setError("Unable to retrieve digital pass information. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, appointmentIdParam]);

  useEffect(() => {
    loadOPDPassData();
  }, [loadOPDPassData]);

  // Doctor & Hospital Helpers
  const getDoctor = (doctorId) => {
    return doctors.find((d) => d._id === doctorId || d.id === doctorId) || {};
  };

  const getHospital = (hospitalId) => {
    return hospitals.find((h) => h._id === hospitalId || h.id === hospitalId) || {};
  };

  // Direct Token Verification (Instant Lookup)
  const handleValidatePass = async (tokenToVerify) => {
    const token = (tokenToVerify || verifyToken || "").trim();
    if (!token) return;
    try {
      setValidating(true);
      setValidationError(null);
      setValidationResult(null);
      const res = await patientService.validateOPDPass(token);
      setValidationResult(res);
    } catch (err) {
      console.error("Pass validation failed:", err);
      setValidationError(
        err.response?.data?.message || err.response?.data?.detail || "Invalid OPD Pass or Token not found in hospital registry."
      );
    } finally {
      setValidating(false);
    }
  };

  // OTP Flow
  const handleRequestOTP = async () => {
    const token = verifyToken.trim() || selectedPass?.pass_number;
    if (!token) {
      setValidationError("Please enter a valid pass number first.");
      return;
    }
    try {
      setOtpLoading(true);
      setOtpError(null);
      setValidationError(null);
      const res = await patientService.requestOPDPassOTP(token);
      setOtpSent(true);
      setOtpContact(res.masked_contact || "registered contact");
      setOtpCooldown(res.cooldown_seconds || 30);
      setDemoOtp(res.demo_otp || null);
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      console.error("OTP request failed:", err);
      setOtpError(err.response?.data?.detail || err.response?.data?.message || "Failed to send OTP code.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpDigitChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || "";
    }
    setOtpDigits(newDigits);
    const targetIdx = Math.min(pastedData.length, 5);
    otpInputRefs.current[targetIdx]?.focus();
  };

  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault();
    const token = verifyToken.trim() || selectedPass?.pass_number;
    const fullOtp = otpDigits.join("");
    if (fullOtp.length < 6) {
      setOtpError("Please enter the complete 6-digit OTP code.");
      return;
    }
    try {
      setOtpLoading(true);
      setOtpError(null);
      const res = await patientService.verifyOPDPassOTP(token, fullOtp);
      setValidationResult(res);
      setOtpSent(false);
    } catch (err) {
      console.error("OTP verification failed:", err);
      setOtpError(err.response?.data?.detail || err.response?.data?.message || "Invalid OTP code entered.");
    } finally {
      setOtpLoading(false);
    }
  };

  // Camera Live QR Scanner
  const startCamera = async (facing = cameraFacing) => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Live camera access is not supported by your browser. Please use the file upload or mobile photo option.");
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        scanQRCodeLoop();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings or upload an image.");
      } else {
        setCameraError("Unable to access camera feed. Please use QR file upload instead.");
      }
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScannerOpen(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  const scanQRCodeLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanQRCodeLoop);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      const scannedText = code.data.trim();
      stopCamera();
      setVerifyToken(scannedText);
      handleValidatePass(scannedText);
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanQRCodeLoop);
  };

  // Open / Close Scanner Modal
  const openScannerModal = () => {
    setScannerOpen(true);
    setTimeout(() => {
      startCamera(cameraFacing);
    }, 150);
  };

  // Decode Image File (Drag & Drop or File Picker)
  const processImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setValidationError("Selected file is not an image. Please upload a PNG or JPEG file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setValidationError("File is too large (maximum 5MB allowed).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const offCanvas = document.createElement("canvas");
        offCanvas.width = img.width;
        offCanvas.height = img.height;
        const ctx = offCanvas.getContext("2d");
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          const rawData = code.data.trim();
          setVerifyToken(rawData);
          handleValidatePass(rawData);
        } else {
          setValidationError("No valid QR code detected in this image. Please upload a clearer photo.");
        }
      };
      img.onerror = () => {
        setValidationError("Failed to read the image file.");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileScan = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Clipboard Copy with Toast
  const handleCopy = async () => {
    if (!selectedPass?.pass_number) return;
    try {
      await navigator.clipboard.writeText(selectedPass.pass_number);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2500);
    } catch {
      alert("Pass ID: " + selectedPass.pass_number);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const activeList = activePasses.filter((p) => p.status === "ACTIVE" || p.status === "PENDING");
  const archiveList = activePasses.filter((p) => p.status === "USED" || p.status === "EXPIRED" || p.status === "CANCELLED");

  const currentPassDoctor = selectedPass ? getDoctor(selectedPass.doctor_id) : {};
  const currentPassHospital = selectedPass ? getHospital(selectedPass.hospital_id) : {};

  return (
    <div className="opd-page">
      {/* COPY TOAST */}
      {copyToast && (
        <div className="opd-toast-alert" role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          <span>Pass ID copied to clipboard!</span>
        </div>
      )}

      {/* HEADER */}
      <div className="opd-header">
        <div>
          <span className="opd-kicker">VERIFIED PATIENT ACCESS</span>
          <h1 className="opd-page-title">Digital OPD Pass</h1>
          <p className="opd-header-desc">
            Instant QR verification for outpatient hospital admission, doctor triage, and reception check-in.
          </p>
        </div>

        <div className="opd-header-actions">
          <button
            className="opd-outline-btn"
            onClick={handlePrint}
            disabled={!selectedPass || activeTab === "verify"}
            aria-label="Print Digital OPD Pass"
          >
            <Printer size={16} />
            <span>Print Pass</span>
          </button>

          <button
            className="opd-download-btn"
            onClick={handlePrint}
            disabled={!selectedPass || activeTab === "verify"}
            aria-label="Download Pass as PDF"
          >
            <Download size={16} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* PASS SELECTION TABS */}
      <div className="opd-tabs-bar" role="tablist">
        <button
          className={`opd-tab-btn ${activeTab === "active" ? "active" : ""}`}
          onClick={() => setActiveTab("active")}
          role="tab"
          aria-selected={activeTab === "active"}
        >
          <Ticket size={15} /> Active Passes ({activeList.length})
        </button>
        <button
          className={`opd-tab-btn ${activeTab === "archive" ? "active" : ""}`}
          onClick={() => setActiveTab("archive")}
          role="tab"
          aria-selected={activeTab === "archive"}
        >
          <Archive size={15} /> Pass Archive ({archiveList.length})
        </button>
        <button
          className={`opd-tab-btn ${activeTab === "verify" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("verify");
            if (selectedPass?.pass_number && !verifyToken) {
              setVerifyToken(selectedPass.pass_number);
            }
          }}
          role="tab"
          aria-selected={activeTab === "verify"}
        >
          <QrCode size={15} /> Pass Validator & Scanner
        </button>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="opd-loading">
          <Loader2 size={32} className="spinner-icon" />
          <p>Retrieving secure Digital OPD Pass credentials...</p>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="opd-error-banner" role="alert">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={loadOPDPassData}>Retry</button>
        </div>
      )}

      {/* SCANNER & VALIDATOR SECTION */}
      {activeTab === "verify" && (
        <section className="opd-validator-section" aria-label="OPD Pass Validation">
          <div className="validator-card">
            <div className="validator-header">
              <div className="validator-icon">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h2>Pass Validator & Reception Check-In</h2>
                <p>Verify cryptographic legitimacy, check reception intake readiness, and validate appointment credentials.</p>
              </div>
            </div>

            {/* SCAN / UPLOAD ACTION BAR */}
            <div className="validator-actions-toolbar">
              <button
                type="button"
                className="scanner-action-btn primary"
                onClick={openScannerModal}
                title="Scan QR code using device camera"
              >
                <Camera size={18} />
                <span>Scan with Camera</span>
              </button>

              <button
                type="button"
                className="scanner-action-btn outline"
                onClick={() => fileInputRef.current?.click()}
                title="Upload QR Code image"
              >
                <Upload size={18} />
                <span>Upload QR Image</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png, image/jpeg, image/webp"
                style={{ display: "none" }}
                onChange={handleFileScan}
              />

              {selectedPass?.pass_number && (
                <button
                  type="button"
                  className="scanner-action-btn chip"
                  onClick={() => {
                    setVerifyToken(selectedPass.pass_number);
                    handleValidatePass(selectedPass.pass_number);
                  }}
                >
                  <span>Auto-fill #{selectedPass.pass_number}</span>
                </button>
              )}
            </div>

            {/* DROPZONE HELPER */}
            <div
              className="validator-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <QrCode size={30} className="dropzone-icon" />
              <div>
                <strong>Drag & drop QR image here or click to browse</strong>
                <span>Supports PNG, JPG, WebP up to 5MB</span>
              </div>
            </div>

            {/* TOKEN INPUT & INSTANT VERIFICATION */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleValidatePass();
              }}
              className="validator-form"
            >
              <div className="validator-input-wrap">
                <input
                  type="text"
                  placeholder="Enter Pass ID (e.g. OPD-20261009-ABC123)..."
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                  className="validator-input"
                  required
                />
                <button
                  type="submit"
                  disabled={validating || !verifyToken.trim()}
                  className="validator-submit-btn"
                >
                  {validating ? <Loader2 size={16} className="spinner-icon" /> : <ShieldCheck size={16} />}
                  <span>{validating ? "Checking..." : "Verify Token"}</span>
                </button>
              </div>
            </form>

            {/* OTP VERIFICATION CARD (OPTIONAL PATIENT AUTH STEP) */}
            <div className="otp-verification-panel">
              <div className="otp-panel-header">
                <div className="otp-title-wrap">
                  <KeyRound size={18} />
                  <strong>Patient OTP Authorization</strong>
                </div>
                {!otpSent ? (
                  <button
                    type="button"
                    className="request-otp-btn"
                    onClick={handleRequestOTP}
                    disabled={otpLoading || (!verifyToken.trim() && !selectedPass?.pass_number)}
                  >
                    {otpLoading ? <Loader2 size={14} className="spinner-icon" /> : <KeyRound size={14} />}
                    <span>Request 6-Digit OTP</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="resend-otp-btn"
                    onClick={handleRequestOTP}
                    disabled={otpCooldown > 0 || otpLoading}
                  >
                    {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend OTP"}
                  </button>
                )}
              </div>

              {otpSent && (
                <div className="otp-box-section">
                  <p className="otp-helper-text">
                    Enter the 6-digit verification code sent to <strong>{otpContact}</strong> (valid for 5 mins):
                  </p>

                  <form onSubmit={handleVerifyOTP} className="otp-inputs-form">
                    <div className="otp-digits-row" onPaste={handleOtpPaste}>
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (otpInputRefs.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="otp-digit-input"
                          aria-label={`OTP Digit ${idx + 1}`}
                          autoComplete="off"
                        />
                      ))}
                    </div>

                    <div className="otp-submit-row">
                      <button
                        type="submit"
                        disabled={otpLoading || otpDigits.join("").length < 6}
                        className="otp-verify-btn"
                      >
                        {otpLoading ? <Loader2 size={16} className="spinner-icon" /> : <CheckCircle2 size={16} />}
                        <span>Verify & Authorize Intake</span>
                      </button>
                    </div>
                  </form>

                  {demoOtp && (
                    <div className="demo-otp-hint">
                      <Info size={14} />
                      <span>
                        Testing Code: <strong>{demoOtp}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {otpError && (
                <div className="otp-error-alert" role="alert">
                  <AlertTriangle size={16} />
                  <span>{otpError}</span>
                </div>
              )}
            </div>

            {/* ERROR ALERT */}
            {validationError && (
              <div className="validation-alert invalid" role="alert">
                <AlertCircle size={22} />
                <div>
                  <strong>Validation Unsuccessful</strong>
                  <p>{validationError}</p>
                </div>
              </div>
            )}

            {/* SUCCESS OR WARNING RESULT */}
            {validationResult && (
              <div
                className={`validation-alert ${
                  validationResult.valid || validationResult.verified ? "valid" : "warning"
                }`}
                role="status"
              >
                <CheckCircle2 size={26} />
                <div className="validation-result-details">
                  <div className="validation-result-header">
                    <strong>
                      {validationResult.valid || validationResult.verified
                        ? "Pass Cryptographically Verified & Active"
                        : "Verification Notice"}
                    </strong>
                    <span className={`status-badge-mini ${validationResult.status?.toLowerCase() || "active"}`}>
                      {validationResult.status || (validationResult.valid ? "ACTIVE" : "INVALID")}
                    </span>
                  </div>
                  <p>{validationResult.message}</p>
                  <div className="validation-grid">
                    <div>
                      <span>Pass Number:</span>
                      <strong>{validationResult.pass_number || verifyToken}</strong>
                    </div>
                    <div>
                      <span>Patient Name:</span>
                      <strong>{validationResult.patient_name || user?.name || "Verified Patient"}</strong>
                    </div>
                    <div>
                      <span>Assigned Doctor:</span>
                      <strong>{validationResult.doctor_name || "Specialist On-Duty"}</strong>
                    </div>
                    <div>
                      <span>Hospital / Unit:</span>
                      <strong>{validationResult.hospital_name || "CareBridge Medical Center"}</strong>
                    </div>
                    <div>
                      <span>Date & Time Slot:</span>
                      <strong>
                        {validationResult.appointment_date || "Today"} at{" "}
                        {validationResult.appointment_time || "Scheduled Slot"}
                      </strong>
                    </div>
                    <div>
                      <span>Consultation Reason:</span>
                      <strong>{validationResult.reason || "General Medical Intake"}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CAMERA SCANNER MODAL */}
      {scannerOpen && (
        <div className="camera-modal-overlay" role="dialog" aria-modal="true" aria-label="QR Code Scanner">
          <div className="camera-modal-box">
            <div className="camera-modal-header">
              <div className="modal-title-wrap">
                <Camera size={20} />
                <strong>Live QR Camera Scanner</strong>
              </div>
              <div className="modal-actions-wrap">
                <button
                  type="button"
                  className="modal-icon-btn"
                  onClick={toggleCameraFacing}
                  title="Switch Front/Back Camera"
                >
                  <SwitchCamera size={18} />
                </button>
                <button
                  type="button"
                  className="modal-icon-btn"
                  onClick={stopCamera}
                  title="Close Camera"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="camera-viewport-container">
              {cameraError ? (
                <div className="camera-error-container">
                  <AlertCircle size={36} />
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    className="fallback-capture-btn"
                    onClick={() => cameraFallbackInputRef.current?.click()}
                  >
                    <Camera size={16} /> Use Mobile Camera File Picker
                  </button>
                  <input
                    type="file"
                    ref={cameraFallbackInputRef}
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      stopCamera();
                      handleFileScan(e);
                    }}
                  />
                </div>
              ) : (
                <>
                  <video ref={videoRef} className="camera-live-video" autoPlay playsInline muted />
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                  <div className="scanner-overlay-frame">
                    <div className="scanner-target-box">
                      <div className="scanner-corner top-left" />
                      <div className="scanner-corner top-right" />
                      <div className="scanner-corner bottom-left" />
                      <div className="scanner-corner bottom-right" />
                      <div className="scanner-laser-line" />
                    </div>
                    <p className="scanner-instruction">Align OPD QR code inside frame</p>
                  </div>
                </>
              )}
            </div>

            <div className="camera-modal-footer">
              <span>Point camera at any CareBridge AI Digital Pass QR</span>
              <button type="button" className="camera-cancel-btn" onClick={stopCamera}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {activeTab !== "verify" && !loading && !error && (activeTab === "active" ? activeList.length === 0 : archiveList.length === 0) && (
        <div className="opd-empty-state">
          <Ticket size={48} />
          <h3>{activeTab === "active" ? "No Active OPD Passes" : "No Archived Passes"}</h3>
          <p>
            {activeTab === "active"
              ? "You do not have an active OPD Pass for today. Schedule an appointment to automatically receive a digital admission pass."
              : "No historical or completed OPD passes found in your medical archive."}
          </p>
          {activeTab === "active" && (
            <Link to="/patient/doctors" className="find-doc-btn">
              <Stethoscope size={16} /> Book an Appointment
            </Link>
          )}
        </div>
      )}

      {/* MAIN OPD PASS VIEW */}
      {activeTab !== "verify" && !loading && !error && selectedPass && (
        <div className="opd-layout">
          {/* MULTI PASS SELECTOR */}
          {activePasses.length > 1 && (
            <div className="opd-selector-row" role="tablist" aria-label="Available OPD Passes">
              {(activeTab === "active" ? activeList : archiveList).map((pass) => (
                <button
                  key={pass._id}
                  className={`pass-select-pill ${selectedPass._id === pass._id ? "selected" : ""}`}
                  onClick={() => setSelectedPass(pass)}
                  role="tab"
                  aria-selected={selectedPass._id === pass._id}
                >
                  <Ticket size={14} />
                  <span>{pass.pass_number}</span>
                  <small className={`pill-badge ${pass.status?.toLowerCase()}`}>({pass.status})</small>
                </button>
              ))}
            </div>
          )}

          {/* DIGITAL PASS CARD */}
          <section className="digital-pass-card" id="printable-opd-pass" aria-label="Digital Pass Card">
            <div className="pass-top">
              <div className="pass-brand">
                <div className="pass-logo">CB</div>
                <div>
                  <strong>CareBridge AI</strong>
                  <span>Digital Outpatient Pass</span>
                </div>
              </div>

              <div className="verified-badge">
                <ShieldCheck size={15} />
                <span>HL7 / HIPAA Verified</span>
              </div>
            </div>

            <div className="pass-divider" />

            <div className="pass-content">
              <div className="pass-status-row">
                <span className={`pass-status-badge ${selectedPass.status?.toLowerCase() || "active"}`}>
                  <CheckCircle2 size={15} />
                  {selectedPass.status === "ACTIVE"
                    ? "Valid for Consultation"
                    : selectedPass.status === "USED"
                    ? "Pass Completed"
                    : selectedPass.status}
                </span>

                <span className="pass-dept-tag">
                  {currentPassDoctor.specialization || "Clinical Outpatient"}
                </span>
              </div>

              <h2 className="pass-reason-title">{selectedPass.reason || "General Medical Consultation"}</h2>
              <p className="pass-subtitle">
                Patient: <strong>{user?.name || "Verified Patient"}</strong> &middot; ID: #
                {String(user?.patient_id || "").slice(-6).toUpperCase()}
              </p>

              {/* APPOINTMENT INFO GRID */}
              <div className="pass-info-grid">
                <div className="pass-info">
                  <div className="pass-info-icon">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <span>Consultation Date</span>
                    <strong>{selectedPass.appointment_date || "Today"}</strong>
                  </div>
                </div>

                <div className="pass-info">
                  <div className="pass-info-icon">
                    <Clock3 size={18} />
                  </div>
                  <div>
                    <span>Appointment Slot</span>
                    <strong>{selectedPass.appointment_time || "10:00 AM"}</strong>
                  </div>
                </div>

                <div className="pass-info">
                  <div className="pass-info-icon">
                    <Stethoscope size={18} />
                  </div>
                  <div>
                    <span>Consulting Specialist</span>
                    <strong>{currentPassDoctor.name || "Medical Practitioner"}</strong>
                  </div>
                </div>

                <div className="pass-info">
                  <div className="pass-info-icon">
                    <Building size={18} />
                  </div>
                  <div>
                    <span>Hospital / Medical Unit</span>
                    <strong>{currentPassHospital.name || "CareBridge Medical Center"}</strong>
                  </div>
                </div>
              </div>

              {/* PASS ID & WORKING COPY BUTTON */}
              <div className="pass-id-box">
                <div>
                  <span className="pass-id-label">Digital Pass Identification Number</span>
                  <strong className="pass-id-code">{selectedPass.pass_number}</strong>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="copy-pass-btn"
                  title="Copy Pass ID to clipboard"
                  aria-label="Copy Pass ID"
                >
                  <Copy size={16} />
                  <span>Copy ID</span>
                </button>
              </div>
            </div>

            {/* QR CODE SCANNING DISPLAY */}
            <div className="qr-section">
              <div className="qr-box">
                <div className="qr-pattern">
                  <QrCode size={120} strokeWidth={1.5} />
                </div>
                <span className="qr-code-label">OFFICIAL TOKEN</span>
              </div>

              <div className="qr-text">
                <strong>Hospital Reception & Triage Scan</strong>
                <p>
                  Present this verified QR code at hospital check-in kiosks, triage nursing counters, or doctor intake desks.
                </p>
                <div className="qr-meta">
                  <span>Cryptographically signed by CareBridge AI Health Network</span>
                </div>
              </div>
            </div>

            <div className="pass-footer">
              <span>
                <ShieldCheck size={14} /> HL7 FHIR Standard Compatible
              </span>
              <span>Valid for Single Hospital Entry</span>
            </div>
          </section>

          {/* VISIT SUMMARY TIMELINE SIDEBAR */}
          <aside className="visit-sidebar" aria-label="Visit Timeline">
            <div className="visit-card">
              <div className="visit-card-header">
                <div>
                  <span className="small-label">CLINICAL VISIT WORKFLOW</span>
                  <h3 className="visit-card-title">Consultation Timeline</h3>
                </div>
                <div className="visit-check">
                  <CheckCircle2 size={20} />
                </div>
              </div>

              <div className="visit-timeline">
                <div className="timeline-item completed">
                  <div className="timeline-dot">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <strong>1. Appointment Scheduled</strong>
                    <span>Validated & confirmed in system</span>
                  </div>
                </div>

                <div className="timeline-line completed" />

                <div className="timeline-item completed">
                  <div className="timeline-dot">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <strong>2. Digital Pass Issued</strong>
                    <span>QR verification generated</span>
                  </div>
                </div>

                <div className="timeline-line active" />

                <div className="timeline-item active">
                  <div className="timeline-dot">
                    <Clock3 size={14} />
                  </div>
                  <div>
                    <strong>3. Hospital Reception Intake</strong>
                    <span>Arrive 15 min prior to slot</span>
                  </div>
                </div>

                <div className="timeline-line" />

                <div className="timeline-item">
                  <div className="timeline-dot">
                    <Stethoscope size={14} />
                  </div>
                  <div>
                    <strong>4. Doctor Consultation</strong>
                    <span>Room & vitals review</span>
                  </div>
                </div>
              </div>

              <div className="live-queue-link-wrap">
                <Link to="/patient/queue" className="queue-action-link">
                  <span>Track Live Queue Position</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* HELPFUL GUIDELINES */}
            <div className="opd-help-card">
              <div className="help-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="opd-help-title">Keep Pass Ready</h3>
                <p>
                  Screenshots, digital passes, and printed copies are accepted across all partner hospital reception desks.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default DigitalOPDPass;