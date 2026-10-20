import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Pill,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  Stethoscope,
  Info,
  Search,
  Sparkles,
  RefreshCw,
  PhoneCall,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Database,
  ExternalLink,
  Send,
  User,
  Bot,
  Loader2,
  AlertOctagon,
  Clock,
  HelpCircle,
  FileText
} from "lucide-react";
import medicineService from "../../services/medicineService";
import "./MedicineAssistant.css";

const PRESET_SYMPTOMS = [
  { id: "fever", label: "Fever / Pyrexia" },
  { id: "headache", label: "Headache" },
  { id: "body_ache", label: "Body Aches / Muscle Pain" },
  { id: "runny_nose", label: "Runny Nose / Cold" },
  { id: "sneezing", label: "Frequent Sneezing" },
  { id: "nasal_congestion", label: "Blocked Nose" },
  { id: "dry_cough", label: "Dry Cough" },
  { id: "wet_cough", label: "Chesty / Wet Cough" },
  { id: "sore_throat", label: "Sore Throat" },
  { id: "heartburn", label: "Heartburn / Acidity" },
  { id: "loose_motion", label: "Loose Motions / Diarrhea" },
  { id: "minor_cut", label: "Minor Cut / Scratch" },
  { id: "skin_rash_itchy", label: "Itchy Skin / Ringworm" },
];

const PRESET_ALLERGIES = ["Paracetamol", "Aspirin", "Ibuprofen", "Sulfa Drugs", "Penicillin"];
const PRESET_CONDITIONS = ["Peptic Ulcer", "Kidney Disease", "Liver Disease", "Asthma", "Hypertension"];

function MedicineAssistant() {
  const [activeTab, setActiveTab] = useState("intake"); // "intake" | "chat" | "search"

  // Intake State
  const [symptoms, setSymptoms] = useState([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("unspecified");
  const [pregnant, setPregnant] = useState(false);
  const [allergies, setAllergies] = useState([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [currentMedicines, setCurrentMedicines] = useState([]);
  const [customMed, setCustomMed] = useState("");
  const [conditions, setConditions] = useState([]);

  // Evaluation & Results State
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [evalError, setEvalError] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [partnerDrug, setPartnerDrug] = useState("");
  const [interactionResult, setInteractionResult] = useState(null);
  const [interactionLoading, setInteractionLoading] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: "Hello! I am your CareBridge OTC Medicine Assistant. I evaluate mild symptoms against verified Indian pharmaceutical datasets, CDSCO banned drug registers, and DDInter interaction matrices. What symptoms or questions do you have?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Toggle symptom chip
  const toggleSymptom = (label) => {
    if (symptoms.includes(label)) {
      setSymptoms(symptoms.filter((s) => s !== label));
    } else {
      setSymptoms([...symptoms, label]);
    }
  };

  const addCustomSymptom = (e) => {
    e.preventDefault();
    if (customSymptom.trim() && !symptoms.includes(customSymptom.trim())) {
      setSymptoms([...symptoms, customSymptom.trim()]);
      setCustomSymptom("");
    }
  };

  const toggleAllergy = (a) => {
    if (allergies.includes(a)) {
      setAllergies(allergies.filter((x) => x !== a));
    } else {
      setAllergies([...allergies, a]);
    }
  };

  const addCustomAllergy = (e) => {
    e.preventDefault();
    if (customAllergy.trim() && !allergies.includes(customAllergy.trim())) {
      setAllergies([...allergies, customAllergy.trim()]);
      setCustomAllergy("");
    }
  };

  const addCurrentMed = (e) => {
    e.preventDefault();
    if (customMed.trim() && !currentMedicines.includes(customMed.trim())) {
      setCurrentMedicines([...currentMedicines, customMed.trim()]);
      setCustomMed("");
    }
  };

  const toggleCondition = (c) => {
    if (conditions.includes(c)) {
      setConditions(conditions.filter((x) => x !== c));
    } else {
      setConditions([...conditions, c]);
    }
  };

  // Run 5-Layer Safety Evaluation
  const handleEvaluate = async () => {
    if (symptoms.length === 0) {
      setEvalError("Please select or enter at least one symptom to evaluate.");
      return;
    }
    setEvalError(null);
    setEvaluating(true);
    setEvalResult(null);

    try {
      const payload = {
        symptoms,
        age: age ? parseInt(age, 10) : null,
        gender,
        pregnant,
        allergies,
        current_medicines: currentMedicines,
        conditions,
      };
      const data = await medicineService.suggestMedicines(payload);
      setEvalResult(data);
    } catch (err) {
      setEvalError(
        err.response?.data?.error || "Failed to evaluate symptoms. Please check connectivity."
      );
    } finally {
      setEvaluating(false);
    }
  };

  // Handle Search
  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const data = await medicineService.searchMedicines(searchQuery.trim());
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Check Interaction
  const handleCheckInteraction = async (medName) => {
    if (!partnerDrug.trim()) return;
    setInteractionLoading(true);
    try {
      const data = await medicineService.checkInteractions(medName, [partnerDrug.trim()]);
      setInteractionResult(data);
    } catch {
      setInteractionResult(null);
    } finally {
      setInteractionLoading(false);
    }
  };

  // Handle Chat Submit
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    const userMsg = chatInput.trim();
    if (!userMsg || chatLoading) return;

    const newMsg = {
      id: String(Date.now()),
      sender: "user",
      text: userMsg,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const intakeData = {
        age: age ? parseInt(age, 10) : null,
        gender,
        pregnant,
        allergies,
        current_medicines: currentMedicines,
        conditions,
        symptoms,
      };

      const response = await medicineService.chatAssistant({
        message: userMsg,
        intake: intakeData,
      });

      const aiReply = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: response.reply,
        red_flag: response.red_flag_triggered,
        suggestions: response.suggestions || [],
        excluded: response.excluded_medicines || [],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, aiReply]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: "ai",
          text: "I encountered an error connecting to the clinical knowledge base. Please try again.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="med-assistant-page">
      {/* =========================================================
          PERSISTENT COMPLIANCE & EDUCATIONAL DISCLAIMER BANNER
      ========================================================= */}
      <div className="med-disclaimer-banner" role="region" aria-label="Medical Disclaimer">
        <div className="med-disclaimer-content">
          <Info size={18} className="med-disclaimer-icon" />
          <div className="med-disclaimer-text">
            <strong>Educational Non-Commercial Student Project:</strong> All suggestions are for informational and clinical decision-support evaluation only. This tool never provides a medical diagnosis or formal prescription. Always consult a qualified physician or pharmacist before taking medication.
            <div className="med-privacy-note">
              🔒 <strong>Privacy Assured:</strong> Symptoms and queries are processed anonymously without storing Personally Identifiable Information (non-PII).
            </div>
          </div>
        </div>
        <Link to="/patient/sources-attribution" className="med-sources-pill-btn">
          <Database size={13} />
          <span>Data Sources & Attribution</span>
        </Link>
      </div>

      {/* =========================================================
          HEADER
      ========================================================= */}
      <div className="med-header">
        <div>
          <span className="med-eyebrow">CLINICAL SAFETY ENGINE</span>
          <h1>Medicine Assistant & OTC Guide</h1>
          <p>
            Grounded Over-The-Counter pharmaceutical decision support using curated Indian formularies (NLEM 2022, CDSCO banned lists, DDInter, openFDA).
          </p>
        </div>

        <div className="med-header-actions">
          <Link to="/patient/doctors" className="med-btn-primary">
            <Stethoscope size={16} />
            <span>Talk to a Doctor</span>
          </Link>
        </div>
      </div>

      {/* =========================================================
          NAVIGATION TABS
      ========================================================= */}
      <div className="med-tabs">
        <button
          className={`med-tab-btn ${activeTab === "intake" ? "active" : ""}`}
          onClick={() => setActiveTab("intake")}
        >
          <ShieldCheck size={16} />
          <span>Symptom Intake & Safety Engine</span>
        </button>
        <button
          className={`med-tab-btn ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          <Bot size={16} />
          <span>Conversational RAG Assistant</span>
        </button>
        <button
          className={`med-tab-btn ${activeTab === "search" ? "active" : ""}`}
          onClick={() => setActiveTab("search")}
        >
          <Search size={16} />
          <span>Brand Search & Interactions</span>
        </button>
      </div>

      {/* =========================================================
          TAB 1: SYMPTOM INTAKE & 5-LAYER SAFETY EVALUATION
      ========================================================= */}
      {activeTab === "intake" && (
        <div className="med-intake-container">
          {/* INTAKE FORM */}
          <div className="med-card med-form-card">
            <h2>1. Patient Clinical Profile & Symptoms</h2>
            <p className="med-card-subtitle">
              Complete these clinical factors to activate the 5-layer safety filter (Allergy, Interaction, Pediatric, Pregnancy, and CDSCO Ban checks).
            </p>

            {/* SYMPTOMS SELECTOR */}
            <div className="med-form-section">
              <label className="med-label">
                Select Presenting Symptoms <span className="med-req">*</span>
              </label>
              <div className="med-chip-group">
                {PRESET_SYMPTOMS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`med-chip ${symptoms.includes(s.label) ? "selected" : ""}`}
                    onClick={() => toggleSymptom(s.label)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Custom Symptom Input */}
              <form onSubmit={addCustomSymptom} className="med-custom-input-form">
                <input
                  type="text"
                  placeholder="Or type custom symptom (e.g. tickly throat, chest tightness)..."
                  value={customSymptom}
                  onChange={(e) => setCustomSymptom(e.target.value)}
                  className="med-input"
                />
                <button type="submit" className="med-btn-secondary">
                  Add Symptom
                </button>
              </form>

              {symptoms.length > 0 && (
                <div className="med-selected-tags">
                  <span className="med-tags-title">Selected ({symptoms.length}):</span>
                  {symptoms.map((s) => (
                    <span key={s} className="med-active-tag">
                      {s}
                      <button type="button" onClick={() => toggleSymptom(s)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* AGE, GENDER & PREGNANCY */}
            <div className="med-form-grid">
              <div className="med-form-group">
                <label className="med-label">
                  Age (Years)
                  {age && parseInt(age, 10) < 12 && (
                    <span className="med-badge-warn">Pediatric (&lt;12)</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="e.g. 28"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="med-input"
                />
                <span className="med-hint">
                  Children under 12 receive strict weight-based pediatrician referral only.
                </span>
              </div>

              <div className="med-form-group">
                <label className="med-label">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="med-select"
                >
                  <option value="unspecified">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="med-form-group med-checkbox-group">
                <label className="med-checkbox-label">
                  <input
                    type="checkbox"
                    checked={pregnant}
                    onChange={(e) => setPregnant(e.target.checked)}
                  />
                  <span>Currently Pregnant or Nursing</span>
                </label>
                {pregnant && (
                  <span className="med-warn-text">
                    Strict pregnancy filter active: NSAIDs (Ibuprofen) are blocked.
                  </span>
                )}
              </div>
            </div>

            {/* ALLERGIES */}
            <div className="med-form-section">
              <label className="med-label">Known Drug Allergies</label>
              <div className="med-chip-group">
                {PRESET_ALLERGIES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`med-chip med-chip-danger ${allergies.includes(a) ? "selected" : ""}`}
                    onClick={() => toggleAllergy(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <form onSubmit={addCustomAllergy} className="med-custom-input-form">
                <input
                  type="text"
                  placeholder="Add other drug allergy..."
                  value={customAllergy}
                  onChange={(e) => setCustomAllergy(e.target.value)}
                  className="med-input"
                />
                <button type="submit" className="med-btn-secondary">Add Allergy</button>
              </form>
            </div>

            {/* CURRENT MEDICINES */}
            <div className="med-form-section">
              <label className="med-label">
                Current Medications (for Drug-Drug Interaction Check)
              </label>
              <form onSubmit={addCurrentMed} className="med-custom-input-form">
                <input
                  type="text"
                  placeholder="e.g. Warfarin, Metformin, Aspirin, Blood Pressure meds..."
                  value={customMed}
                  onChange={(e) => setCustomMed(e.target.value)}
                  className="med-input"
                />
                <button type="submit" className="med-btn-secondary">Add Medicine</button>
              </form>
              {currentMedicines.length > 0 && (
                <div className="med-selected-tags">
                  {currentMedicines.map((m) => (
                    <span key={m} className="med-active-tag med-active-tag-info">
                      {m}
                      <button type="button" onClick={() => setCurrentMedicines(currentMedicines.filter((x) => x !== m))}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* CHRONIC CONDITIONS */}
            <div className="med-form-section">
              <label className="med-label">Existing Chronic Conditions</label>
              <div className="med-chip-group">
                {PRESET_CONDITIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`med-chip ${conditions.includes(c) ? "selected" : ""}`}
                    onClick={() => toggleCondition(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {evalError && (
              <div className="med-alert med-alert-error">
                <AlertTriangle size={18} />
                <span>{evalError}</span>
              </div>
            )}

            <button
              type="button"
              className="med-btn-evaluate"
              disabled={evaluating || symptoms.length === 0}
              onClick={handleEvaluate}
            >
              {evaluating ? (
                <>
                  <Loader2 size={18} className="med-spin" />
                  <span>Evaluating 5-Layer Clinical Pipeline...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Evaluate Safe OTC Medicines</span>
                </>
              )}
            </button>
          </div>

          {/* EVALUATION RESULTS VIEW */}
          {evalResult && (
            <div className="med-results-section">
              {/* RED-FLAG EMERGENCY TRIAGE TRIGGERED */}
              {evalResult.red_flag_triggered || evalResult.is_emergency ? (
                <div className="med-red-flag-card">
                  <div className="med-red-flag-header">
                    <AlertOctagon size={32} className="med-pulse" />
                    <div>
                      <h3>CRITICAL RED-FLAG ALERT: SEEK IMMEDIATE MEDICAL CARE</h3>
                      <p>A potentially severe or life-threatening condition was identified. Do NOT take OTC medication.</p>
                    </div>
                  </div>

                  <div className="med-red-flag-alert-body">
                    <strong>Triage Reason:</strong> {evalResult.alert_message || evalResult.emergency_alert}
                  </div>

                  <div className="med-emergency-contacts">
                    <h4>Emergency Helplines (India):</h4>
                    <div className="med-contacts-grid">
                      <a href="tel:112" className="med-call-pill med-call-emergency">
                        <PhoneCall size={16} />
                        <span>112 - National Emergency</span>
                      </a>
                      <a href="tel:108" className="med-call-pill med-call-ambulance">
                        <PhoneCall size={16} />
                        <span>108 - Ambulance Service</span>
                      </a>
                      <a href="tel:14416" className="med-call-pill med-call-telemanas">
                        <PhoneCall size={16} />
                        <span>14416 - Tele-MANAS Mental Health</span>
                      </a>
                    </div>
                  </div>

                  <div className="med-red-flag-footer">
                    <Link to="/patient/doctors" className="med-btn-danger">
                      <Stethoscope size={16} />
                      <span>Find Nearest Emergency Doctor</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* CLINICAL ADVISORIES (Pediatric & Pregnancy) */}
                  {evalResult.pediatric_warning && (
                    <div className="med-alert med-alert-warn">
                      <AlertTriangle size={20} />
                      <div>
                        <strong>Pediatric Clinical Warning:</strong> {evalResult.pediatric_warning}
                      </div>
                    </div>
                  )}

                  {evalResult.pregnancy_warning && (
                    <div className="med-alert med-alert-warn">
                      <AlertTriangle size={20} />
                      <div>
                        <strong>Pregnancy Clinical Caution:</strong> {evalResult.pregnancy_warning}
                      </div>
                    </div>
                  )}

                  {/* APPROVED OTC SUGGESTIONS */}
                  <div className="med-suggestions-header">
                    <h3>Approved First-Line OTC Options ({evalResult.suggestions.length})</h3>
                    <span className="med-badge-verified">
                      <ShieldCheck size={14} />
                      Curated OTC Allowlist & DDInter Validated
                    </span>
                  </div>

                  {evalResult.suggestions.length === 0 ? (
                    <div className="med-empty-card">
                      <HelpCircle size={32} />
                      <h4>No Safe OTC Recommendations Found</h4>
                      <p>
                        Either no first-line OTC drugs exist for this specific combination, or potential medications were excluded by safety filters (allergies, interactions, or contraindications).
                      </p>
                      <Link to="/patient/doctors" className="med-btn-primary">
                        Consult a Verified CareBridge Physician
                      </Link>
                    </div>
                  ) : (
                    <div className="med-suggestions-grid">
                      {evalResult.suggestions.map((med, idx) => (
                        <div key={idx} className="med-suggestion-card">
                          <div className="med-card-top">
                            <div>
                              <span className="med-drug-class">{med.drug_class || "First-Line Agent"}</span>
                              <h4 className="med-generic-name">{med.generic_name}</h4>
                            </div>
                            <span className="med-otc-badge">OTC Approved</span>
                          </div>

                          <div className="med-card-body">
                            <div className="med-section-row">
                              <span className="med-row-label">Commonly Used For:</span>
                              <p className="med-row-text">{med.commonly_used_for}</p>
                            </div>

                            {/* BRANDS */}
                            {med.common_brands && med.common_brands.length > 0 && (
                              <div className="med-section-row">
                                <span className="med-row-label">Common Indian Brands:</span>
                                <div className="med-brands-list">
                                  {med.common_brands.map((b, bIdx) => (
                                    <div key={bIdx} className="med-brand-item">
                                      <div className="med-brand-title">
                                        <strong>{b.brand_name}</strong> ({b.strength}) - {b.form}
                                      </div>
                                      <div className="med-brand-meta">
                                        <span>Mfg: {b.manufacturer}</span>
                                        {b.price_inr && <span className="med-price">₹{b.price_inr} MRP</span>}
                                        {b.is_essential && (
                                          <span className="med-essential-pill">NLEM Essential</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* WARNINGS */}
                            {med.warnings && med.warnings.length > 0 && (
                              <div className="med-section-row">
                                <span className="med-row-label">Clinical Warnings:</span>
                                <ul className="med-warnings-list">
                                  {med.warnings.map((w, wIdx) => (
                                    <li key={wIdx}>{w}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* SIDE EFFECTS */}
                            {med.side_effects && med.side_effects.length > 0 && (
                              <div className="med-section-row">
                                <span className="med-row-label">Reported Side Effects (SIDER):</span>
                                <div className="med-side-effects-chips">
                                  {med.side_effects.map((se, sIdx) => (
                                    <span key={sIdx} className="med-se-chip">
                                      {se.effect} <small>({se.frequency.toLowerCase()})</small>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* INTERACTIONS CAUTION */}
                            {med.interactions_caution && (
                              <div className="med-section-row med-caution-box">
                                <span className="med-row-label">Drug Interaction Status:</span>
                                {med.interactions_caution.map((ic, iIdx) => (
                                  <p key={iIdx} className="med-caution-text">⚠️ {ic}</p>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="med-card-footer">
                            <span className="med-provenance-tag">
                              Source: {med.source || "A-Z Medicine Dataset of India (CC0), NLEM 2022"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* SAFETY FILTER LOG (EXCLUDED MEDICINES) */}
                  {evalResult.filtered_out && evalResult.filtered_out.length > 0 && (
                    <div className="med-excluded-card">
                      <h4>
                        <XCircle size={18} className="med-text-danger" />
                        Medications Excluded by 5-Layer Safety Filter ({evalResult.filtered_out.length})
                      </h4>
                      <p className="med-card-subtitle">
                        These medications match your symptoms but were strictly removed to protect against adverse clinical risks:
                      </p>
                      <div className="med-excluded-list">
                        {evalResult.filtered_out.map((ex, exIdx) => (
                          <div key={exIdx} className="med-excluded-item">
                            <span className="med-excluded-name">{ex.generic_name}</span>
                            <span className="med-excluded-reason">{ex.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: CONVERSATIONAL RAG ASSISTANT
      ========================================================= */}
      {activeTab === "chat" && (
        <div className="med-chat-container">
          <div className="med-chat-messages">
            {chatMessages.map((m) => (
              <div key={m.id} className={`med-chat-bubble ${m.sender === "user" ? "user" : "ai"}`}>
                <div className="med-bubble-avatar">
                  {m.sender === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="med-bubble-body">
                  <div className="med-bubble-header">
                    <span className="med-bubble-sender">
                      {m.sender === "user" ? "You" : "CareBridge Medicine Assistant"}
                    </span>
                    <span className="med-bubble-time">{m.time}</span>
                  </div>

                  <div className="med-bubble-text" style={{ whiteSpace: "pre-line" }}>
                    {m.text}
                  </div>

                  {m.red_flag && (
                    <div className="med-bubble-emergency-box">
                      <AlertOctagon size={20} />
                      <div>
                        <strong>Emergency Alert:</strong> Critical symptoms detected. Call 112 / 108 or proceed to emergency triage immediately.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="med-chat-bubble ai">
                <div className="med-bubble-avatar"><Bot size={16} /></div>
                <div className="med-bubble-body med-loading-bubble">
                  <Loader2 size={16} className="med-spin" />
                  <span>Searching verified pharmaceutical database & evaluating safety...</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleChatSubmit} className="med-chat-input-bar">
            <input
              type="text"
              placeholder="Ask about OTC relief (e.g. 'I have a sore throat and fever, age 25')..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="med-chat-input"
            />
            <button
              type="submit"
              className="med-btn-send"
              disabled={chatLoading || !chatInput.trim()}
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* =========================================================
          TAB 3: BRAND SEARCH & DRUG-DRUG INTERACTIONS
      ========================================================= */}
      {activeTab === "search" && (
        <div className="med-search-container">
          <div className="med-card">
            <h2>Indian Brand & Generic Medicine Lookup</h2>
            <p className="med-card-subtitle">
              Fuzzy search across 30,000+ Indian pharmaceutical brands, composition strengths, and NLEM essential drug statuses.
            </p>

            <form onSubmit={handleSearch} className="med-search-bar">
              <input
                type="text"
                placeholder="Search brand (Crocin, Dolo, Electral, Gelusil) or generic (Paracetamol, Cetirizine)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="med-input"
              />
              <button type="submit" className="med-btn-primary" disabled={searchLoading}>
                {searchLoading ? <Loader2 size={16} className="med-spin" /> : <Search size={16} />}
                <span>Search</span>
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="med-search-results-list">
                <h3>Results ({searchResults.length})</h3>
                <div className="med-search-cards-grid">
                  {searchResults.map((m) => (
                    <div key={m.id} className="med-search-item-card">
                      <div className="med-search-item-header">
                        <h4>{m.brand_name}</h4>
                        <span className="med-generic-pill">{m.generic_name}</span>
                      </div>
                      <div className="med-search-item-body">
                        <p><strong>Manufacturer:</strong> {m.manufacturer}</p>
                        <p><strong>Form & Strength:</strong> {m.dosage_form} ({m.strength})</p>
                        {m.price_inr && <p><strong>Price:</strong> ₹{m.price_inr} MRP</p>}
                        <div className="med-search-badges">
                          {m.is_otc ? (
                            <span className="med-badge-otc">OTC Available</span>
                          ) : (
                            <span className="med-badge-rx">Prescription Only</span>
                          )}
                          {m.is_nlem && <span className="med-badge-nlem">NLEM Essential</span>}
                          {m.is_banned && <span className="med-badge-banned">CDSCO Banned FDC</span>}
                        </div>
                      </div>

                      {/* INTERACTION CHECK BUTTON */}
                      <div className="med-search-item-footer">
                        <button
                          type="button"
                          className="med-btn-outline"
                          onClick={() => {
                            setSelectedMed(m);
                            setInteractionResult(null);
                          }}
                        >
                          Check Interaction
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* INTERACTION CHECK MODAL / PANEL */}
            {selectedMed && (
              <div className="med-interaction-panel">
                <div className="med-panel-header">
                  <h3>Check Drug Interaction for: {selectedMed.brand_name} ({selectedMed.generic_name})</h3>
                  <button type="button" onClick={() => setSelectedMed(null)} className="med-close-btn">×</button>
                </div>
                <div className="med-panel-body">
                  <div className="med-interaction-form">
                    <input
                      type="text"
                      placeholder="Enter other medicine (e.g. Warfarin, Aspirin, Ibuprofen, Alcohol)..."
                      value={partnerDrug}
                      onChange={(e) => setPartnerDrug(e.target.value)}
                      className="med-input"
                    />
                    <button
                      type="button"
                      className="med-btn-primary"
                      onClick={() => handleCheckInteraction(selectedMed.generic_name)}
                      disabled={interactionLoading || !partnerDrug.trim()}
                    >
                      {interactionLoading ? <Loader2 size={16} className="med-spin" /> : <ShieldCheck size={16} />}
                      <span>Check Compatibility</span>
                    </button>
                  </div>

                  {interactionResult && (
                    <div className="med-interaction-result">
                      {interactionResult.interactions && interactionResult.interactions.length > 0 ? (
                        <div className="med-alert med-alert-error">
                          <AlertTriangle size={20} />
                          <div>
                            <strong>Interaction Alert ({interactionResult.interactions[0].severity}):</strong>
                            <p>{interactionResult.interactions[0].clinical_advice}</p>
                            <small>Mechanism: {interactionResult.interactions[0].mechanism}</small>
                          </div>
                        </div>
                      ) : (
                        <div className="med-alert med-alert-info">
                          <Info size={20} />
                          <div>
                            <strong>Interaction Database Notice:</strong>
                            <p>
                              {interactionResult.missing_data_notice ||
                                "No severe interaction is documented in DDInter. However, lack of recorded interaction does NOT imply safety. Always consult your physician."}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MedicineAssistant;
