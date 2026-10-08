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
  Calendar,
  Heart,
  Droplets,
  Loader2,
  KeyRound,
  Lock,
  DollarSign,
  Award,
  MapPin,
  Clock,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import doctorService from "../../services/doctorService";
import authAPI from "../../services/auth";
import "./Profile.css";

function Profile() {
  const { user, setUser } = useAuth();
  const role = (user?.role || "PATIENT").toUpperCase();
  const isDoctor = role === "DOCTOR";
  const isPatient = role === "PATIENT";

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successToast, setSuccessToast] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [doctorId, setDoctorId] = useState(user?.doctor_id || null);

  // Profile Form Data
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    // Patient specific fields
    age: 28,
    gender: "Other",
    blood_group: "O+",
    emergency_contact: "",
    allergies: "",
    medical_history: "",
    // Doctor specific fields
    specialty: "Cardiology & Internal Medicine",
    department: "Cardiovascular Sciences",
    hospital: "CareBridge Multi-Specialty Hospital",
    license_number: `MCI-IND-${String(user?.id || "884210").slice(-6).toUpperCase()}`,
    experience_years: "10",
    consultation_fee: "800",
    room_number: "OPD-304",
    bio: "Senior Consultant committed to evidence-based clinical diagnostics, cardiovascular therapeutics, and patient-centered clinical care.",
    available_days: "Monday, Tuesday, Wednesday, Thursday, Friday, Saturday",
  });

  const loadProfile = useCallback(async () => {
    setInitialLoading(true);
    setErrorMessage("");

    try {
      if (isPatient) {
        const patientId = user?.patient_id || user?.id;
        if (patientId) {
          const data = await patientService.getPatientProfile(patientId);
          if (data) {
            setFormData((prev) => ({
              ...prev,
              name: data.name || user?.name || prev.name,
              email: data.email || user?.email || prev.email,
              phone: data.phone || user?.phone || prev.phone,
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
        }
      } else if (isDoctor) {
        // Load doctor details from doctor profile endpoint
        const docProfile = await doctorService.getDoctorProfile();
        if (docProfile) {
          const docId = docProfile._id || docProfile.id;
          if (docId) setDoctorId(docId);
          
          setFormData((prev) => ({
            ...prev,
            name: docProfile.name || user?.name || prev.name,
            email: docProfile.email || user?.email || prev.email,
            phone: docProfile.phone || user?.phone || prev.phone,
            specialty: docProfile.specialty || prev.specialty,
            department: docProfile.department || prev.department,
            hospital: docProfile.hospital || prev.hospital,
            license_number: docProfile.license_number || prev.license_number,
            experience_years: docProfile.experience_years ? String(docProfile.experience_years) : prev.experience_years,
            consultation_fee: docProfile.consultation_fee ? String(docProfile.consultation_fee) : prev.consultation_fee,
            room_number: docProfile.room_number || prev.room_number,
            bio: docProfile.bio || prev.bio,
            available_days: Array.isArray(docProfile.available_days)
              ? docProfile.available_days.join(", ")
              : docProfile.available_days || prev.available_days,
          }));
        }
      }
    } catch (err) {
      console.warn("Could not load extended profile from API, using authenticated session details.");
    } finally {
      setInitialLoading(false);
    }
  }, [isPatient, isDoctor, user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCancel = () => {
    setEditing(false);
    setErrorMessage("");
    loadProfile();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
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
      } else if (isDoctor) {
        // Save doctor profile
        const daysList = formData.available_days
          ? formData.available_days.split(",").map((s) => s.trim()).filter(Boolean)
          : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        const docPayload = {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          specialty: formData.specialty.trim(),
          department: formData.department.trim(),
          hospital: formData.hospital.trim(),
          license_number: formData.license_number.trim(),
          experience_years: parseInt(formData.experience_years, 10) || 10,
          consultation_fee: parseInt(formData.consultation_fee, 10) || 800,
          room_number: formData.room_number.trim(),
          bio: formData.bio.trim(),
          available_days: daysList,
        };

        const targetDoctorId = doctorId || user?.doctor_id || user?.id;
        if (targetDoctorId) {
          await doctorService.updateDoctor(targetDoctorId, docPayload);
        } else {
          // Fallback auth profile update
          await authAPI.updateProfile({ name: docPayload.name, phone: docPayload.phone });
        }
      } else {
        // Generic Staff / Admin update
        await authAPI.updateProfile({ name: formData.name.trim(), phone: formData.phone.trim() });
      }

      // Update user state and localStorage
      if (setUser) {
        setUser((prev) => ({
          ...prev,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
        }));
      }

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          parsed.name = formData.name.trim();
          parsed.phone = formData.phone.trim();
          localStorage.setItem("user", JSON.stringify(parsed));
        } catch (e) {
          // ignore
        }
      }

      setEditing(false);
      setSuccessToast(isDoctor ? "Doctor credentials and clinical profile updated successfully." : "Personal information updated successfully.");
      setTimeout(() => setSuccessToast(""), 4000);
    } catch (err) {
      console.error("Failed to save profile changes:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to persist profile changes to backend.";
      setErrorMessage(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleShareProfile = () => {
    const textToCopy = isPatient
      ? `Patient Dossier — CareBridge AI\nName: ${formData.name}\nPatient ID: ${user?.patient_id || user?.id || "N/A"}\nBlood Group: ${formData.blood_group}\nEmergency Contact: ${formData.emergency_contact || "N/A"}\nEmail: ${formData.email}`
      : `Dr. ${formData.name}\n${formData.specialty}\n${formData.department} — ${formData.hospital}\nLicense No: ${formData.license_number}\nOPD Room: ${formData.room_number}\nPhone: ${formData.phone}\nEmail: ${formData.email}`;

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
            <span className="profile-eyebrow">
              {isDoctor ? "CLINICAL CREDENTIALS & PRACTICE" : "IDENTITY & PERSONAL HEALTH RECORD"}
            </span>
            <h1>{isDoctor ? "Doctor Clinical Profile" : "Patient Profile & Identity"}</h1>
            <p>
              {isDoctor
                ? "Manage your hospital appointment details, specialty credentials, consultation fees, and practice information."
                : "Manage your demographic identity, emergency contact coordinates, allergies, and clinical background."}
            </p>
          </div>

          <div className="profile-header-actions">
            <button className="profile-share-btn" onClick={handleShareProfile} title="Copy profile dossier">
              {copied ? (
                <>
                  <Check size={16} className="text-green" />
                  <span>Copied Dossier</span>
                </>
              ) : (
                <>
                  <Share2 size={16} />
                  <span>Share Profile</span>
                </>
              )}
            </button>

            {!editing ? (
              <button
                className="profile-edit-btn"
                onClick={() => setEditing(true)}
                disabled={loading || initialLoading}
              >
                <Edit2 size={16} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                className="profile-edit-btn cancel"
                onClick={handleCancel}
                disabled={loading}
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* TOAST NOTIFICATIONS */}
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

        {/* PROFILE CARD */}
        <section className="profile-card">
          <div className="profile-cover">
            <div className="profile-avatar">
              {formData.name ? formData.name.charAt(0).toUpperCase() : (isDoctor ? "D" : "P")}
            </div>

            <div className="profile-identity">
              <h2>{isDoctor ? `Dr. ${formData.name || "Doctor"}` : (formData.name || "Patient Member")}</h2>
              <div className="profile-role-row">
                <span className="profile-role-pill">{role}</span>
                <span className="profile-license-tag">
                  <ShieldCheck size={14} /> ID: #{String(doctorId || user?.patient_id || user?.id || "8921").slice(-6).toUpperCase()}
                </span>
                {isPatient && formData.blood_group && (
                  <span className="blood-group-tag">
                    <Droplets size={12} /> Blood: {formData.blood_group}
                  </span>
                )}
                {isDoctor && formData.specialty && (
                  <span className="blood-group-tag specialty">
                    <Stethoscope size={12} /> {formData.specialty}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* FORM BODY */}
          <form onSubmit={handleSave} className="profile-form-body">
            {/* GENERAL PERSONAL & CONTACT SECTION */}
            <div className="profile-section">
              <div className="section-title">
                <div>
                  <h3>Identity & Contact Details</h3>
                  <p>Basic verification and primary contact information</p>
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
                      placeholder="e.g. Dr. Rajesh Sharma"
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
                      placeholder="+91 9876543210"
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
                          placeholder="e.g. Ramesh Kumar (+91 9876543210)"
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

            {/* DOCTOR CLINICAL CREDENTIALS & PRACTICE DETAILS */}
            {isDoctor && (
              <div className="profile-section">
                <div className="section-title">
                  <div>
                    <h3>Clinical Practice & Hospital Information</h3>
                    <p>Department, license verification, consultation fee, and clinic room</p>
                  </div>
                </div>

                <div className="profile-grid">
                  <div className="profile-field">
                    <label htmlFor="prof-specialty">Medical Specialty *</label>
                    {editing ? (
                      <input
                        id="prof-specialty"
                        type="text"
                        name="specialty"
                        value={formData.specialty}
                        onChange={handleChange}
                        placeholder="e.g. Cardiology & Intensive Care"
                        required
                      />
                    ) : (
                      <div className="profile-value">{formData.specialty}</div>
                    )}
                  </div>

                  <div className="profile-field">
                    <label htmlFor="prof-dept">Department</label>
                    {editing ? (
                      <input
                        id="prof-dept"
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        placeholder="e.g. Department of Cardiovascular Sciences"
                      />
                    ) : (
                      <div className="profile-value">{formData.department}</div>
                    )}
                  </div>

                  <div className="profile-field">
                    <label htmlFor="prof-hospital">Affiliated Hospital / Medical Center</label>
                    {editing ? (
                      <input
                        id="prof-hospital"
                        type="text"
                        name="hospital"
                        value={formData.hospital}
                        onChange={handleChange}
                        placeholder="e.g. CareBridge Multi-Specialty Hospital"
                      />
                    ) : (
                      <div className="profile-value">{formData.hospital}</div>
                    )}
                  </div>

                  <div className="profile-field">
                    <label htmlFor="prof-license">Medical License Number</label>
                    {editing ? (
                      <input
                        id="prof-license"
                        type="text"
                        name="license_number"
                        value={formData.license_number}
                        onChange={handleChange}
                        placeholder="e.g. MCI-IND-884210"
                      />
                    ) : (
                      <div className="profile-value">{formData.license_number}</div>
                    )}
                  </div>

                  <div className="profile-field">
                    <label htmlFor="prof-exp">Experience (Years)</label>
                    {editing ? (
                      <input
                        id="prof-exp"
                        type="number"
                        name="experience_years"
                        min="0"
                        max="60"
                        value={formData.experience_years}
                        onChange={handleChange}
                      />
                    ) : (
                      <div className="profile-value">{formData.experience_years} Years Clinical Practice</div>
                    )}
                  </div>

                  <div className="profile-field">
                    <label htmlFor="prof-fee">Consultation Fee (₹)</label>
                    {editing ? (
                      <input
                        id="prof-fee"
                        type="number"
                        name="consultation_fee"
                        min="0"
                        step="50"
                        value={formData.consultation_fee}
                        onChange={handleChange}
                      />
                    ) : (
                      <div className="profile-value">₹{formData.consultation_fee} per consultation</div>
                    )}
                  </div>

                  <div className="profile-field">
                    <label htmlFor="prof-room">OPD Chamber / Room No.</label>
                    {editing ? (
                      <input
                        id="prof-room"
                        type="text"
                        name="room_number"
                        value={formData.room_number}
                        onChange={handleChange}
                        placeholder="e.g. OPD Room 304, Block B"
                      />
                    ) : (
                      <div className="profile-value">{formData.room_number}</div>
                    )}
                  </div>

                  <div className="profile-field full-span">
                    <label htmlFor="prof-days">Available Consultation Days (comma-separated)</label>
                    {editing ? (
                      <input
                        id="prof-days"
                        type="text"
                        name="available_days"
                        value={formData.available_days}
                        onChange={handleChange}
                        placeholder="e.g. Monday, Tuesday, Wednesday, Thursday, Friday, Saturday"
                      />
                    ) : (
                      <div className="profile-value">{formData.available_days}</div>
                    )}
                  </div>

                  <div className="profile-field full-span">
                    <label htmlFor="prof-bio">Doctor Bio & Clinical Focus</label>
                    {editing ? (
                      <textarea
                        id="prof-bio"
                        name="bio"
                        rows="3"
                        value={formData.bio}
                        onChange={handleChange}
                        placeholder="Brief summary of clinical specialties, fellowships, and research focus..."
                      />
                    ) : (
                      <div className="profile-value">{formData.bio}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PATIENT CLINICAL HISTORY & ALLERGIES */}
            {isPatient && (
              <div className="profile-section">
                <div className="section-title">
                  <div>
                    <h3>Clinical Background & Allergies</h3>
                    <p>Critical context for attending physicians, prescriptions, and emergency triage</p>
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
                        placeholder="e.g. Penicillin, Peanuts, Sulfa Drugs, Dust Mites"
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
                        placeholder="e.g. Hypertension, Type 2 Diabetes, Mild Asthma"
                        value={formData.medical_history}
                        onChange={handleChange}
                      />
                    ) : (
                      <div className="profile-value">
                        {formData.medical_history || "No chronic medical conditions recorded"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SAVE & CANCEL ACTIONS BAR */}
            {editing && (
              <div className="profile-actions-bar">
                <button
                  type="button"
                  className="cancel-profile-btn"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>

                <button type="submit" className="save-profile-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spinner-icon" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </section>

        {/* SECURITY CARD */}
        <section className="security-card">
          <div className="security-icon">
            <ShieldCheck size={28} />
          </div>

          <div className="security-content">
            <h3>CareBridge AI Security & Compliance</h3>
            <p>
              Your clinical identity and health telemetry are protected with end-to-end TLS 1.3 encryption and cryptographically signed JWT bearer tokens. HIPAA and NABH compliance controls are enforced.
            </p>

            <div className="security-pills-row">
              <span className="sec-pill">
                <Lock size={13} /> TLS 1.3 Active
              </span>
              <span className="sec-pill">
                <KeyRound size={13} /> OAuth2 JWT Verified
              </span>
              <span className="sec-pill">
                <ShieldCheck size={13} /> HIPAA / NABH Compliant
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Profile;
