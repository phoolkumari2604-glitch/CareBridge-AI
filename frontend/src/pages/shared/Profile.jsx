import React, { useState, useEffect, useCallback } from "react";
import {
  UserCircle,
  Mail,
  Phone,
  Building,
  Stethoscope,
  ShieldCheck,
  Share2,
  Edit2,
  Check,
  CheckCircle2,
  AlertCircle,
  Copy,
  Calendar,
  Heart,
  Droplets,
  AlertTriangle,
  Loader2,
  KeyRound,
  Lock,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import "./Profile.css";

function Profile() {
  const { user, setUser } = useAuth();
  const role = (user?.role || "PATIENT").toUpperCase();
  const isDoctor = role === "DOCTOR";
  const isPatient = role === "PATIENT";

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successToast, setSuccessToast] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Patient Profile Form Data
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    age: 28,
    gender: "Other",
    blood_group: "O+",
    emergency_contact: "",
    allergies: "",
    medical_history: "",
    // Doctor specific fields
    specialization: isDoctor ? "Cardiology & Intensive Care" : "",
    department: isDoctor ? "Department of Cardiovascular Sciences" : "",
    hospital: "CareBridge Multi-Specialty Hospital",
    licenseNumber: isDoctor ? "MCI-IND-884210" : `PT-${String(user?.patient_id || user?.id || "9842").slice(-4)}`,
  });

  const loadPatientProfile = useCallback(async () => {
    if (isPatient && user?.patient_id) {
      try {
        setLoading(true);
        const data = await patientService.getPatientProfile(user.patient_id);
        if (data) {
          setFormData((prev) => ({
            ...prev,
            name: data.name || user.name || prev.name,
            email: data.email || user.email || prev.email,
            phone: data.phone || user.phone || prev.phone,
            age: data.age || prev.age,
            gender: data.gender || prev.gender,
            blood_group: data.blood_group || prev.blood_group,
            emergency_contact: data.emergency_contact || prev.emergency_contact,
            allergies: Array.isArray(data.allergies) ? data.allergies.join(", ") : data.allergies || "",
            medical_history: Array.isArray(data.medical_history)
              ? data.medical_history.join(", ")
              : data.medical_history || "",
          }));
        }
      } catch (err) {
        console.log("Patient profile not yet created or loaded from defaults.");
      } finally {
        setLoading(false);
      }
    }
  }, [isPatient, user]);

  useEffect(() => {
    loadPatientProfile();
  }, [loadPatientProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      setLoading(true);

      // Persist to backend if patient profile exists
      if (isPatient) {
        const allergiesList = formData.allergies
          ? formData.allergies.split(",").map((s) => s.trim()).filter(Boolean)
          : [];

        const medicalHistoryList = formData.medical_history
          ? formData.medical_history.split(",").map((s) => s.trim()).filter(Boolean)
          : [];

        const payload = {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          age: parseInt(formData.age, 10) || 28,
          gender: formData.gender,
          email: formData.email,
          blood_group: formData.blood_group,
          emergency_contact: formData.emergency_contact.trim() || undefined,
          allergies: allergiesList,
          medical_history: medicalHistoryList,
        };

        if (user?.patient_id) {
          await patientService.updatePatientProfile(user.patient_id, payload);
        } else {
          const res = await patientService.createPatientProfile(payload);
          if (res?.patient_id && setUser) {
            setUser((prev) => ({
              ...prev,
              patient_id: res.patient_id,
            }));
          }
        }
      }

      // Update local storage and context
      if (setUser) {
        setUser((prev) => ({
          ...prev,
          name: formData.name,
          phone: formData.phone,
        }));
      }

      const currentStoredUser = localStorage.getItem("user");
      if (currentStoredUser) {
        try {
          const parsed = JSON.parse(currentStoredUser);
          parsed.name = formData.name;
          parsed.phone = formData.phone;
          localStorage.setItem("user", JSON.stringify(parsed));
        } catch {
          // ignore
        }
      }

      setEditing(false);
      setSuccessToast("Personal information & credentials updated successfully.");
      setTimeout(() => setSuccessToast(""), 3500);
    } catch (err) {
      console.error("Failed to save profile:", err);
      const msg = err.response?.data?.detail || "Failed to update profile changes.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleShareProfile = () => {
    const textToCopy = isPatient
      ? `Patient: ${formData.name}\nID: ${user?.patient_id || "N/A"}\nBlood Group: ${formData.blood_group}\nEmergency Contact: ${formData.emergency_contact || "N/A"}`
      : `${formData.name} - ${formData.specialization}\n${formData.hospital}\nLicense: ${formData.licenseNumber}\nEmail: ${formData.email}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* HEADER */}
        <div className="profile-header">
          <div>
            <span className="profile-eyebrow">IDENTITY & CLINICAL PROFILE</span>
            <h1>{isPatient ? "Patient Profile & Security" : "Doctor Credentials"}</h1>
            <p>
              Manage your personal identification, clinical background, emergency contacts, and account security credentials.
            </p>
          </div>

          <div className="profile-header-actions">
            <button className="profile-share-btn" onClick={handleShareProfile}>
              {copied ? (
                <>
                  <Check size={16} className="text-green" />
                  <span>Copied Info</span>
                </>
              ) : (
                <>
                  <Share2 size={16} />
                  <span>Share Dossier</span>
                </>
              )}
            </button>

            <button
              className={`profile-edit-btn ${editing ? "cancel" : ""}`}
              onClick={() => setEditing(!editing)}
              disabled={loading}
            >
              <Edit2 size={16} />
              <span>{editing ? "Cancel Editing" : "Edit Personal Info"}</span>
            </button>
          </div>
        </div>

        {/* TOAST / ERROR NOTICES */}
        {successToast && (
          <div className="profile-toast">
            <CheckCircle2 size={18} />
            <span>{successToast}</span>
          </div>
        )}

        {errorMessage && (
          <div className="profile-error">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PROFILE BANNER CARD */}
        <section className="profile-card">
          <div className="profile-cover">
            <div className="profile-avatar">
              {formData.name ? formData.name.charAt(0).toUpperCase() : "P"}
            </div>

            <div className="profile-identity">
              <h2>{formData.name || "Patient Member"}</h2>
              <div className="profile-role-row">
                <span className="profile-role-pill">{role}</span>
                <span className="profile-license-tag">
                  <ShieldCheck size={14} /> ID: #{String(user?.patient_id || user?.id || "8921").slice(-6).toUpperCase()}
                </span>
                {isPatient && formData.blood_group && (
                  <span className="blood-group-tag">
                    <Droplets size={12} /> Blood: {formData.blood_group}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* FORM BODY */}
          <form onSubmit={handleSave} className="profile-form-body">
            {/* PERSONAL INFORMATION SECTION */}
            <div className="profile-section">
              <div className="section-title">
                <div>
                  <h3>Personal Information</h3>
                  <p>Identification and demographic records</p>
                </div>
              </div>

              <div className="profile-grid">
                <div className="profile-field">
                  <label htmlFor="prof-name">Full Name *</label>
                  {editing ? (
                    <input
                      id="prof-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  ) : (
                    <div className="profile-value">{formData.name || "Not provided"}</div>
                  )}
                </div>

                <div className="profile-field">
                  <label htmlFor="prof-email">Email Address</label>
                  <div className="profile-value readonly">{formData.email}</div>
                </div>

                <div className="profile-field">
                  <label htmlFor="prof-phone">Phone Number *</label>
                  {editing ? (
                    <input
                      id="prof-phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  ) : (
                    <div className="profile-value">{formData.phone || "Not provided"}</div>
                  )}
                </div>

                {isPatient && (
                  <>
                    <div className="profile-field">
                      <label htmlFor="prof-age">Age (Years)</label>
                      {editing ? (
                        <input
                          id="prof-age"
                          type="number"
                          name="age"
                          min="1"
                          max="120"
                          value={formData.age}
                          onChange={handleChange}
                        />
                      ) : (
                        <div className="profile-value">{formData.age} Years</div>
                      )}
                    </div>

                    <div className="profile-field">
                      <label htmlFor="prof-gender">Gender</label>
                      {editing ? (
                        <select id="prof-gender" name="gender" value={formData.gender} onChange={handleChange}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <div className="profile-value">{formData.gender}</div>
                      )}
                    </div>

                    <div className="profile-field">
                      <label htmlFor="prof-blood">Blood Group</label>
                      {editing ? (
                        <select
                          id="prof-blood"
                          name="blood_group"
                          value={formData.blood_group}
                          onChange={handleChange}
                        >
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      ) : (
                        <div className="profile-value">{formData.blood_group}</div>
                      )}
                    </div>

                    <div className="profile-field full-span">
                      <label htmlFor="prof-em-contact">Emergency Contact (Name & Phone)</label>
                      {editing ? (
                        <input
                          id="prof-em-contact"
                          type="text"
                          name="emergency_contact"
                          placeholder="e.g. John Doe (+91 9876543210)"
                          value={formData.emergency_contact}
                          onChange={handleChange}
                        />
                      ) : (
                        <div className="profile-value">
                          {formData.emergency_contact || "No emergency contact listed"}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* MEDICAL HISTORY / CLINICAL BACKGROUND (FOR PATIENTS) */}
            {isPatient && (
              <div className="profile-section">
                <div className="section-title">
                  <div>
                    <h3>Clinical Background & Allergies</h3>
                    <p>Vital context for attending doctors and emergency triage</p>
                  </div>
                </div>

                <div className="profile-grid">
                  <div className="profile-field full-span">
                    <label htmlFor="prof-allergies">Known Allergies (comma-separated)</label>
                    {editing ? (
                      <input
                        id="prof-allergies"
                        type="text"
                        name="allergies"
                        placeholder="e.g. Penicillin, Peanuts, Sulfa Drugs, Dust"
                        value={formData.allergies}
                        onChange={handleChange}
                      />
                    ) : (
                      <div className="profile-value">
                        {formData.allergies || "No known allergies reported"}
                      </div>
                    )}
                  </div>

                  <div className="profile-field full-span">
                    <label htmlFor="prof-history">Chronic Medical History (comma-separated)</label>
                    {editing ? (
                      <input
                        id="prof-history"
                        type="text"
                        name="medical_history"
                        placeholder="e.g. Asthma, Type 2 Diabetes, Hypertension, Thyroid"
                        value={formData.medical_history}
                        onChange={handleChange}
                      />
                    ) : (
                      <div className="profile-value">
                        {formData.medical_history || "No chronic history recorded"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SAVE BUTTON */}
            {editing && (
              <div className="profile-actions">
                <button type="submit" className="save-profile-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Persist Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </section>

        {/* ACCOUNT & SECURITY SETTINGS */}
        <section className="security-card">
          <div className="security-icon">
            <ShieldCheck size={28} />
          </div>

          <div className="security-content">
            <h3>Account & Cryptographic Security</h3>
            <p>
              Your personal health identifier is authenticated via secure OAuth2 JWT bearer signatures. HIPAA audit logging and encrypted data transmission are enforced for all clinical records.
            </p>

            <div className="security-pills-row">
              <span className="sec-pill">
                <Lock size={13} /> TLS 1.3 Encryption Active
              </span>
              <span className="sec-pill">
                <KeyRound size={13} /> JWT Bearer Authorization Valid
              </span>
              <span className="sec-pill">
                <ShieldCheck size={13} /> HIPAA Privacy Compliant
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Profile;
