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
  Send,
  Timer,
  Check,
  FileCheck,
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
  const [activeTab, setActiveTab] = useState("active"); // "active", "archive", "verify"

  const [activePasses, setActivePasses] = useState([]);
  const [selectedPass, setSelectedPass] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [copied, setCopied] = useState(false);

  // Scanner & Validation State
  const [verifyToken, setVerifyToken] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // OTP Verification State
  const [otpMode, setOtpMode] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpInfo, setOtpInfo] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputRefs = useRef([]);

  // Camera & Scanner Modal State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("environment"); // "environment" | "user"
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanAnimationRef = useRef(null);
  const fileInputRef = useRef(null);
  const uploadQrInputRef = useRef(null);

  // Drag and Drop QR upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [decodingUpload, setDecodingUpload] = useState(false);

  // -------------------------------------------------------------
  // DATA LOADING
  // -------------------------------------------------------------
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
            status:
              apt.status === "COMPLETED"
                ? "USED"
                : apt.approval_status === "APPROVED"
                ? "ACTIVE"
                : "PENDING",
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

  // Resend Timer Countdown
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  // Lookup helpers
  const getDoctor = (doctorId) => {
    return doctors.find((d) => d._id === doctorId || d.id === doctorId) || {};
  };

  const getHospital = (hospitalId) => {
    return hospitals.find((h) => h._id === hospitalId || h.id === hospitalId) || {};
  };

  // -------------------------------------------------------------
  // TOKEN & PASS VALIDATION
  // -------------------------------------------------------------
  const handleValidatePass = async (tokenToVerify) => {
    const token = (tokenToVerify || verifyToken || "").trim();
    if (!token) return;

    try {
      setValidating(true);
      setValidationError(null);
      setValidationResult(null);
      setOtpMode(false);
      setOtpError(null);

      const res = await patientService.validateOPDPass(token);
      setValidationResult(res);
    } catch (err) {
      console.error("Pass validation failed:", err);
      setValidationError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Invalid OPD Pass or Token not found in hospital registry."
      );
    } finally {
      setValidating(false);
    }
  };

  // -------------------------------------------------------------
  // OTP WORKFLOW
  // -------------------------------------------------------------
  const handleRequestOTP = async () => {
    const token = (verifyToken || selectedPass?.pass_number || "").trim();
    if (!token) {
      setValidationError("Please enter or select a valid Pass Number first.");
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError(null);
      setValidationError(null);

      const res = await patientService.requestOPDPassOTP(token);
      setOtpInfo(res);
      setOtpMode(true);
      setResendTimer(res.cooldown_seconds || 30);
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => {
        if (otpInputRefs.current[0]) otpInputRefs.current[0].focus();
      }, 100);
    } catch (err) {
      console.error("Failed to request OTP:", err);
      setOtpError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Unable to dispatch verification OTP. Please try again."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, "");
    if (!cleanVal && value !== "") return;

    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal ? cleanVal.slice(-1) : "";
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (cleanVal && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }

    // Auto-submit if all 6 digits are filled
    const fullCode = newDigits.join("");
    if (fullCode.length === 6 && !newDigits.includes("")) {
      handleVerifyOTPCode(fullCode);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1].focus();
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

    const focusIndex = Math.min(pastedData.length, 5);
    if (otpInputRefs.current[focusIndex]) {
      otpInputRefs.current[focusIndex].focus();
    }

    if (pastedData.length === 6) {
      handleVerifyOTPCode(pastedData);
    }
  };

  const handleVerifyOTPCode = async (codeToVerify) => {
    const token = (verifyToken || selectedPass?.pass_number || "").trim();
    const code = codeToVerify || otpDigits.join("");

    if (code.length !== 6) {
      setOtpError("Please enter all 6 digits of the verification OTP.");
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError(null);

      const res = await patientService.verifyOPDPassOTP(token, code);
      setValidationResult(res);
      setOtpMode(false);
    } catch (err) {
      console.error("OTP verification failed:", err);
      setOtpError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Invalid or expired verification OTP."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // -------------------------------------------------------------
  // CAMERA & QR SCANNER
  // -------------------------------------------------------------
  const startCameraScanner = async () => {
    setCameraError(null);
    setCameraModalOpen(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported on this device. Use file upload instead.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        scanAnimationFrame();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(err.message || "Camera access denied. Please grant permissions or upload a QR image.");
    }
  };

  const stopCamera = () => {
    if (scanAnimationRef.current) {
      cancelAnimationFrame(scanAnimationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraModalOpen(false);
  };

  const switchCameraFacing = async () => {
    stopCamera();
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    setTimeout(() => {
      startCameraScanner();
    }, 200);
  };

  const scanAnimationFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      scanAnimationRef.current = requestAnimationFrame(scanAnimationFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      const decodedText = code.data.trim();
      // Extract OPD pass token if inside a JSON or URL
      let passToken = decodedText;
      if (decodedText.includes("OPD-")) {
        const match = decodedText.match(/OPD-[\w-]+/i);
        if (match) passToken = match[0];
      }

      setVerifyToken(passToken);
      stopCamera();
      handleValidatePass(passToken);
      return;
    }

    scanAnimationRef.current = requestAnimationFrame(scanAnimationFrame);
  };

  // -------------------------------------------------------------
  // QR IMAGE UPLOAD & DECODE (Drag-and-Drop & Picker)
  // -------------------------------------------------------------
  const handleQrImageFile = (file) => {
    if (!file) return;
    setUploadError(null);

    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      setUploadError("Please upload a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File exceeds the 5 MB size limit.");
      return;
    }

    setDecodingUpload(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        setDecodingUpload(false);
        if (code && code.data) {
          let token = code.data.trim();
          if (token.includes("OPD-")) {
            const match = token.match(/OPD-[\w-]+/i);
            if (match) token = match[0];
          }
          setVerifyToken(token);
          handleValidatePass(token);
        } else {
          setUploadError("Could not detect a valid QR code in the uploaded image. Please try another photo.");
        }
      };
      img.onerror = () => {
        setDecodingUpload(false);
        setUploadError("Failed to parse image file.");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleCopy = async () => {
    if (!selectedPass?.pass_number) return;
    try {
      await navigator.clipboard.writeText(selectedPass.pass_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("Unable to copy Pass ID");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const activeList = activePasses.filter((p) => p.status === "ACTIVE" || p.status === "PENDING");
  const archiveList = activePasses.filter(
    (p) => p.status === "USED" || p.status === "EXPIRED" || p.status === "CANCELLED"
  );

  const currentPassDoctor = selectedPass ? getDoctor(selectedPass.doctor_id) : {};
  const currentPassHospital = selectedPass ? getHospital(selectedPass.hospital_id) : {};

  return (
    <div className="opd-page">
      {/* HEADER */}
      <div className="opd-header">
        <div>
          <span className="opd-kicker">VERIFIED PATIENT ACCESS</span>
          <h1 className="opd-main-title">Digital OPD Pass</h1>
          <p className="opd-main-subtitle">
            Cryptographically signed QR verification for outpatient hospital admission, doctor triage, and reception check-in.
          </p>
        </div>

        <div className="opd-header-actions">
          <button
            className="opd-outline-btn"
            onClick={handlePrint}
            disabled={!selectedPass || activeTab === "verify"}
            title="Print Official Outpatient Pass Slip"
          >
            <Printer size={16} />
            <span>Print Pass</span>
          </button>

          <button
            className="opd-download-btn"
            onClick={handlePrint}
            disabled={!selectedPass || activeTab === "verify"}
            title="Export Digital Pass PDF Document"
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
          <QrCode size={15} /> Scanner Validation & OTP
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

      {/* =========================================================
          SCANNER VALIDATION & OTP TAB
      ========================================================= */}
      {activeTab === "verify" && (
        <section className="opd-validator-section" aria-label="OPD Pass Validation">
          <div className="validator-card">
            <div className="validator-header">
              <div className="validator-icon">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h2>OPD Pass Validator & Token Scanner</h2>
                <p>
                  Verify cryptographic legitimacy, authenticate via 6-digit patient OTP, and validate hospital intake readiness.
                </p>
              </div>
            </div>

            {/* SCAN & UPLOAD ACTION BUTTONS */}
            <div className="validator-quick-actions">
              <button
                type="button"
                className="v-action-btn primary"
                onClick={startCameraScanner}
                title="Scan QR Code with Camera"
              >
                <Camera size={16} />
                <span>Scan QR with Camera</span>
              </button>

              <button
                type="button"
                className="v-action-btn secondary"
                onClick={() => uploadQrInputRef.current?.click()}
                title="Upload QR Code Image File"
              >
                <Upload size={16} />
                <span>Upload QR Image</span>
              </button>

              <input
                ref={uploadQrInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleQrImageFile(e.target.files[0]);
                }}
              />
            </div>

            {/* DRAG AND DROP ZONE */}
            <div
              className={`qr-dropzone ${isDragging ? "dragging" : ""} ${decodingUpload ? "decoding" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) handleQrImageFile(e.dataTransfer.files[0]);
              }}
              onClick={() => uploadQrInputRef.current?.click()}
            >
              {decodingUpload ? (
                <div className="dropzone-decoding">
                  <Loader2 size={24} className="spinner-icon" />
                  <span>Decoding QR matrix...</span>
                </div>
              ) : (
                <div className="dropzone-inner">
                  <QrCode size={28} />
                  <span>Drag & drop QR image here, or <u>click to browse</u> (PNG, JPG up to 5MB)</span>
                </div>
              )}
            </div>

            {uploadError && (
              <div className="validation-alert invalid mini" role="alert">
                <AlertCircle size={16} />
                <span>{uploadError}</span>
              </div>
            )}

            {/* TOKEN INPUT FORM */}
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
                  placeholder="Enter or paste OPD Pass Number (e.g. OPD-20261009-ABC123)..."
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
                  <span>{validating ? "Validating..." : "Verify Token"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRequestOTP}
                  disabled={otpLoading || !verifyToken.trim()}
                  className="validator-otp-trigger-btn"
                  title="Authenticate via patient OTP"
                >
                  {otpLoading ? <Loader2 size={16} className="spinner-icon" /> : <KeyRound size={16} />}
                  <span>Verify with OTP</span>
                </button>
              </div>

              {selectedPass?.pass_number && (
                <div className="quick-token-buttons">
                  <span>Current Pass:</span>
                  <button
                    type="button"
                    className="quick-token-chip"
                    onClick={() => {
                      setVerifyToken(selectedPass.pass_number);
                    }}
                  >
                    Use {selectedPass.pass_number}
                  </button>
                </div>
              )}
            </form>

            {/* OTP VERIFICATION MODAL / DRAWER */}
            {otpMode && (
              <div className="otp-verification-panel">
                <div className="otp-panel-header">
                  <div className="otp-title-wrap">
                    <KeyRound size={20} className="otp-icon" />
                    <div>
                      <h4>6-Digit Security OTP Verification</h4>
                      <p>
                        A 6-digit authorization code has been dispatched to{" "}
                        <strong>{otpInfo?.masked_contact || "patient's registered contact"}</strong>.
                      </p>
                    </div>
                  </div>
                  <button className="otp-close-btn" onClick={() => setOtpMode(false)} aria-label="Cancel OTP">
                    <X size={16} />
                  </button>
                </div>

                {otpInfo?.demo_otp && (
                  <div className="demo-otp-banner">
                    <span>Demo Environment OTP Hint:</span>
                    <strong>{otpInfo.demo_otp}</strong>
                  </div>
                )}

                {/* 6 OTP INPUT BOXES */}
                <div className="otp-boxes-container" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`otp-digit-box ${digit ? "filled" : ""}`}
                      autoFocus={idx === 0}
                      aria-label={`OTP Digit ${idx + 1}`}
                    />
                  ))}
                </div>

                {otpError && (
                  <div className="otp-error-msg" role="alert">
                    <AlertCircle size={15} />
                    <span>{otpError}</span>
                  </div>
                )}

                <div className="otp-footer-actions">
                  <div className="otp-timer">
                    {resendTimer > 0 ? (
                      <span>
                        <Timer size={14} /> Resend available in <strong>{resendTimer}s</strong>
                      </span>
                    ) : (
                      <button type="button" className="otp-resend-btn" onClick={handleRequestOTP} disabled={otpLoading}>
                        Resend New OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="otp-verify-submit-btn"
                    onClick={() => handleVerifyOTPCode()}
                    disabled={otpLoading || otpDigits.join("").length !== 6}
                  >
                    {otpLoading ? <Loader2 size={16} className="spinner-icon" /> : <CheckCircle2 size={16} />}
                    <span>Confirm & Authorize</span>
                  </button>
                </div>
              </div>
            )}

            {/* VALIDATION ERROR */}
            {validationError && (
              <div className="validation-alert invalid" role="alert">
                <AlertCircle size={20} />
                <div>
                  <strong>Validation Failed</strong>
                  <p>{validationError}</p>
                </div>
              </div>
            )}

            {/* VALIDATION SUCCESS RESULT */}
            {validationResult && (
              <div
                className={`validation-alert ${
                  validationResult.valid || validationResult.verified
                    ? "valid"
                    : validationResult.status === "USED"
                    ? "used"
                    : "warning"
                }`}
              >
                <div className="result-icon-box">
                  {validationResult.valid || validationResult.verified ? (
                    <CheckCircle2 size={28} />
                  ) : (
                    <AlertCircle size={28} />
                  )}
                </div>
                <div className="validation-result-details">
                  <div className="validation-result-header">
                    <strong>
                      {validationResult.verified
                        ? "Pass Cryptographically Signed & OTP Authorized"
                        : validationResult.valid
                        ? "Pass Cryptographically Verified & Active"
                        : `Verification Notice: ${validationResult.status || "Status Check"}`}
                    </strong>
                    <span className={`status-badge-mini ${(validationResult.status || "active").toLowerCase()}`}>
                      {validationResult.status || "VERIFIED"}
                    </span>
                  </div>
                  <p>{validationResult.message}</p>
                  <div className="validation-grid">
                    <div>
                      <span>Pass Number:</span>
                      <strong>{validationResult.pass_number}</strong>
                    </div>
                    <div>
                      <span>Patient Name:</span>
                      <strong>{validationResult.patient_name || user?.name || "Verified Patient"}</strong>
                    </div>
                    <div>
                      <span>Consulting Doctor:</span>
                      <strong>{validationResult.doctor_name || "Assigned Medical Practitioner"}</strong>
                    </div>
                    <div>
                      <span>Hospital / Unit:</span>
                      <strong>{validationResult.hospital_name || "CareBridge Medical Center"}</strong>
                    </div>
                    <div>
                      <span>Scheduled Slot:</span>
                      <strong>
                        {validationResult.appointment_date || "Today"} at{" "}
                        {validationResult.appointment_time || "10:00 AM"}
                      </strong>
                    </div>
                    <div>
                      <span>Clinical Reason:</span>
                      <strong>{validationResult.reason || "Outpatient Clinical Consultation"}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* EMPTY STATE */}
      {activeTab !== "verify" &&
        !loading &&
        !error &&
        (activeTab === "active" ? activeList.length === 0 : archiveList.length === 0) && (
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

      {/* =========================================================
          MAIN OPD PASS DISPLAY
      ========================================================= */}
      {activeTab !== "verify" && !loading && !error && selectedPass && (
        <div className="opd-layout">
          {/* PASS SELECTOR PILLS */}
          {activePasses.length > 1 && (
            <div className="opd-selector-row">
              {(activeTab === "active" ? activeList : archiveList).map((pass) => (
                <button
                  key={pass._id}
                  className={`pass-select-pill ${selectedPass._id === pass._id ? "selected" : ""}`}
                  onClick={() => setSelectedPass(pass)}
                >
                  <Ticket size={14} />
                  <span>{pass.pass_number}</span>
                  <small>({pass.status})</small>
                </button>
              ))}
            </div>
          )}

          {/* DIGITAL PASS CARD (PRINTABLE) */}
          <section className="digital-pass-card" id="printable-opd-pass">
            <div className="pass-top">
              <div className="pass-brand">
                <div className="pass-logo">CB</div>
                <div>
                  <strong>CareBridge AI Health Network</strong>
                  <span>Official Outpatient Admission Pass</span>
                </div>
              </div>

              <div className="verified-badge">
                <ShieldCheck size={15} />
                <span>HIPAA & HL7 Cryptographically Verified</span>
              </div>
            </div>

            <div className="pass-divider" />

            <div className="pass-content">
              <div className="pass-status-row">
                <span className={`pass-status-badge ${selectedPass.status?.toLowerCase()}`}>
                  <CheckCircle2 size={16} />
                  {selectedPass.status === "ACTIVE" ? "Valid for Intake & Triage" : selectedPass.status}
                </span>

                <span className="pass-dept-tag">
                  {currentPassDoctor.specialization || "Clinical Outpatient"}
                </span>
              </div>

              <h2>{selectedPass.reason || "General Medical Consultation"}</h2>
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

              {/* PASS ID & COPY */}
              <div className="pass-id-box">
                <div>
                  <span>Digital Pass Identification Number</span>
                  <strong>{selectedPass.pass_number}</strong>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="copy-pass-btn"
                  title="Copy Pass ID to clipboard"
                >
                  {copied ? <Check size={16} className="text-green" /> : <Copy size={16} />}
                  <span>{copied ? "Copied" : "Copy ID"}</span>
                </button>
              </div>
            </div>

            {/* QR CODE SCANNING SECTION */}
            <div className="qr-section">
              <div className="qr-box">
                <div className="qr-pattern">
                  <QrCode size={118} strokeWidth={1.5} />
                </div>
                <span className="qr-code-label">SECURE TOKEN</span>
              </div>

              <div className="qr-text">
                <strong>Hospital Reception & Triage Scan</strong>
                <p>
                  Present this QR code at hospital reception kiosks, nurse triage desks, or doctor chamber scanners for instant admissions check-in.
                </p>
                <div className="qr-meta">
                  <span>Authorized by CareBridge Health Network &middot; Single Patient Use</span>
                </div>
              </div>
            </div>

            <div className="pass-footer">
              <span>
                <ShieldCheck size={14} /> Cryptographically Signed OPD Authorization
              </span>
              <span>Valid for Single Hospital Entry</span>
            </div>
          </section>

          {/* VISIT SUMMARY TIMELINE SIDEBAR */}
          <aside className="visit-sidebar">
            <div className="visit-card">
              <div className="visit-card-header">
                <div>
                  <span className="small-label">CLINICAL VISIT WORKFLOW</span>
                  <h3>Consultation Timeline</h3>
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
                <h3>Keep Pass Ready</h3>
                <p>
                  Printed PDF passes, screenshots, and in-app tokens are accepted at all partner hospital reception counters.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* =========================================================
          CAMERA SCANNER MODAL (LIVE GETUSERMEDIA)
      ========================================================= */}
      {cameraModalOpen && (
        <div className="scanner-modal-overlay" onClick={stopCamera}>
          <div className="scanner-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="scanner-modal-header">
              <div className="scanner-title">
                <Camera size={20} />
                <h3>Live QR Code Scanner</h3>
              </div>
              <div className="scanner-header-actions">
                <button
                  type="button"
                  className="switch-cam-btn"
                  onClick={switchCameraFacing}
                  title="Switch Front/Rear Camera"
                >
                  <SwitchCamera size={16} />
                  <span>Switch</span>
                </button>
                <button type="button" className="close-cam-btn" onClick={stopCamera} aria-label="Close Scanner">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="scanner-viewport-wrap">
              {cameraError ? (
                <div className="scanner-error-state">
                  <AlertCircle size={32} />
                  <p>{cameraError}</p>
                  <button
                    type="button"
                    className="file-fallback-btn"
                    onClick={() => {
                      stopCamera();
                      uploadQrInputRef.current?.click();
                    }}
                  >
                    Upload QR Image Instead
                  </button>
                </div>
              ) : (
                <>
                  <video ref={videoRef} className="scanner-video" playsInline autoPlay muted />
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                  <div className="scan-target-box">
                    <div className="scan-corner tl" />
                    <div className="scan-corner tr" />
                    <div className="scan-corner bl" />
                    <div className="scan-corner br" />
                    <div className="scan-laser-line" />
                  </div>
                  <span className="scan-instructions">Align OPD Pass QR Code within the frame</span>
                </>
              )}
            </div>

            <div className="scanner-modal-footer">
              <button
                type="button"
                className="cam-cancel-btn"
                onClick={stopCamera}
              >
                Cancel Scanner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DigitalOPDPass;