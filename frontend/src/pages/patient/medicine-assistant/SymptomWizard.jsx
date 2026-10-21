import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  X,
  Mic,
  MicOff,
  User,
  ShieldAlert,
  HeartPulse,
  Pill,
  Clock,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  Edit2,
  RefreshCw,
  Info
} from "lucide-react";
import {
  PRESET_SYMPTOMS_LIST,
  CHRONIC_CONDITIONS_LIST,
  ALLERGIES_PRESETS,
  searchMedicationDirectory
} from "./brandGenericMap";

export default function SymptomWizard({
  intake,
  setIntake,
  onEvaluate,
  evaluating,
  evalError,
  t,
  lang,
  onEmergencyTrigger,
  userProfile,
  onJumpToStep
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [validationError, setValidationError] = useState("");

  // Step 1: Symptoms Local State
  const [symptomSearch, setSymptomSearch] = useState("");
  const [customSymptomInput, setCustomSymptomInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const speechRecognitionRef = useRef(null);

  // Step 2: Patient Profile Local State
  const [isEditingAutofill, setIsEditingAutofill] = useState(false);

  // Step 3: Safety History Local State
  const [allergyInput, setAllergyInput] = useState("");
  const [medSearchInput, setMedSearchInput] = useState("");
  const [medSearchResults, setMedSearchResults] = useState([]);
  const [showMedDropdown, setShowMedDropdown] = useState(false);

  // Initialize Speech Recognition feature detection
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setVoiceAvailable(true);
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = lang === "hi" ? "hi-IN" : lang === "te" ? "te-IN" : "en-IN";

        recog.onresult = (event) => {
          const transcript = event.results[0]?.[0]?.transcript;
          if (transcript) {
            handleVoiceSymptom(transcript);
          }
          setIsListening(false);
        };

        recog.onerror = (err) => {
          console.warn("Speech recognition error:", err);
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        speechRecognitionRef.current = recog;
      }
    }
  }, [lang]);

  // Autofill from user profile if available on initial mount
  useEffect(() => {
    if (userProfile && !intake.hasAutofilled) {
      setIntake((prev) => ({
        ...prev,
        age: prev.age || (userProfile.age ? String(userProfile.age) : ""),
        gender: prev.gender !== "unspecified" ? prev.gender : (userProfile.gender?.toLowerCase() || "unspecified"),
        weight: prev.weight || (userProfile.weight ? String(userProfile.weight) : ""),
        allergies: prev.allergies.length > 0 ? prev.allergies : (userProfile.allergies || []),
        conditions: prev.conditions.length > 0 ? prev.conditions : (userProfile.conditions || []),
        hasAutofilled: true,
      }));
    }
  }, [userProfile, setIntake, intake.hasAutofilled]);

  // Voice toggle
  const toggleVoice = () => {
    if (!speechRecognitionRef.current) return;
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
      }
    }
  };

  const handleVoiceSymptom = (text) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    // Add as custom symptom with default details
    addSymptomWithDetails(cleaned);
  };

  // Helper to add/update symptom with duration and severity
  const addSymptomWithDetails = (label) => {
    if (!intake.symptoms.includes(label)) {
      setIntake((prev) => ({
        ...prev,
        symptoms: [...prev.symptoms, label],
        symptomDetails: {
          ...prev.symptomDetails,
          [label]: prev.symptomDetails[label] || { duration: "1-3 days", severity: "mild" },
        },
      }));
    }
  };

  const removeSymptom = (label) => {
    setIntake((prev) => {
      const nextSymptoms = prev.symptoms.filter((s) => s !== label);
      const nextDetails = { ...prev.symptomDetails };
      delete nextDetails[label];
      return {
        ...prev,
        symptoms: nextSymptoms,
        symptomDetails: nextDetails,
      };
    });
  };

  const updateSymptomDetail = (label, field, val) => {
    setIntake((prev) => ({
      ...prev,
      symptomDetails: {
        ...prev.symptomDetails,
        [label]: {
          ...(prev.symptomDetails[label] || { duration: "1-3 days", severity: "mild" }),
          [field]: val,
        },
      },
    }));
  };

  // Autocomplete for current medicines
  const handleMedSearchChange = (val) => {
    setMedSearchInput(val);
    if (!val.trim()) {
      setMedSearchResults([]);
      setShowMedDropdown(false);
      return;
    }
    const matches = searchMedicationDirectory(val);
    setMedSearchResults(matches);
    setShowMedDropdown(matches.length > 0);
  };

  const addCurrentMed = (medName) => {
    if (medName.trim() && !intake.current_medicines.includes(medName.trim())) {
      setIntake((prev) => ({
        ...prev,
        current_medicines: [...prev.current_medicines, medName.trim()],
      }));
      setMedSearchInput("");
      setMedSearchResults([]);
      setShowMedDropdown(false);
    }
  };

  // Step Validation
  const validateStep = (step) => {
    setValidationError("");
    if (step === 1) {
      if (intake.symptoms.length === 0) {
        setValidationError("Please select or enter at least one symptom to proceed.");
        return false;
      }
    } else if (step === 2) {
      if (!intake.age) {
        setValidationError("Please enter the patient's age.");
        return false;
      }
      const numAge = parseInt(intake.age, 10);
      if (isNaN(numAge) || numAge < 0 || numAge > 120) {
        setValidationError("Please enter a valid age between 0 and 120 years.");
        return false;
      }
      if (numAge < 12 && (!intake.weight || parseFloat(intake.weight) <= 0)) {
        setValidationError("Pediatric safety requirement: Patient weight (kg) is required for patients under 12 years.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1));
      window.scrollTo({ top: 300, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setValidationError("");
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Filtered symptoms for step 1 search
  const filteredPresetSymptoms = PRESET_SYMPTOMS_LIST.filter((s) => {
    if (!symptomSearch.trim()) return true;
    return s.label.toLowerCase().includes(symptomSearch.toLowerCase());
  });

  return (
    <div className="med-wizard-card">
      {/* =========================================================
          PROGRESS BAR & STEP INDICATORS
      ========================================================= */}
      <div className="med-wizard-header" role="navigation" aria-label="Intake Steps">
        <div className="med-wizard-steps-track">
          <div
            className="med-wizard-progress-fill"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          />
          {[1, 2, 3, 4].map((stepNum) => {
            const isCompleted = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;
            const stepTitle =
              stepNum === 1
                ? t.step1Title
                : stepNum === 2
                ? t.step2Title
                : stepNum === 3
                ? t.step3Title
                : t.step4Title;

            return (
              <button
                key={stepNum}
                type="button"
                className={`med-wizard-step-node ${isCompleted ? "completed" : ""} ${
                  isCurrent ? "active" : ""
                }`}
                onClick={() => {
                  if (isCompleted || currentStep === stepNum) {
                    setCurrentStep(stepNum);
                  }
                }}
                disabled={currentStep < stepNum}
                aria-current={isCurrent ? "step" : undefined}
                title={stepTitle}
              >
                <span className="med-node-number">
                  {isCompleted ? <Check size={14} /> : stepNum}
                </span>
                <span className="med-node-label">{stepTitle.split(". ")[1]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {validationError && (
        <div className="med-alert med-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{validationError}</span>
        </div>
      )}

      {/* =========================================================
          STEP 1: SYMPTOMS SELECTION & DETAILS
      ========================================================= */}
      {currentStep === 1 && (
        <div className="med-step-content med-fade-in" role="tabpanel" aria-labelledby="step-1-title">
          <div className="med-step-header">
            <div>
              <h2 id="step-1-title">{t.step1Title}</h2>
              <p className="med-step-subtitle">{t.step1Desc}</p>
            </div>
            {voiceAvailable && (
              <button
                type="button"
                className={`med-btn-voice ${isListening ? "active-listening" : ""}`}
                onClick={toggleVoice}
                title={isListening ? "Stop listening" : t.voiceInput}
                aria-label={isListening ? "Stop listening" : t.voiceInput}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                <span>{isListening ? t.voiceListening : t.voiceInput}</span>
              </button>
            )}
          </div>

          {/* Search bar + Custom input */}
          <div className="med-symptom-search-row">
            <div className="med-search-input-wrap">
              <Search size={16} />
              <input
                type="text"
                placeholder={t.searchSymptomsPlaceholder}
                value={symptomSearch}
                onChange={(e) => setSymptomSearch(e.target.value)}
                className="med-input"
                aria-label={t.searchSymptomsPlaceholder}
              />
              {symptomSearch && (
                <button
                  type="button"
                  onClick={() => setSymptomSearch("")}
                  className="med-input-clear"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customSymptomInput.trim()) {
                  addSymptomWithDetails(customSymptomInput.trim());
                  setCustomSymptomInput("");
                }
              }}
              className="med-custom-symptom-form"
            >
              <input
                type="text"
                placeholder={t.customSymptomPlaceholder}
                value={customSymptomInput}
                onChange={(e) => setCustomSymptomInput(e.target.value)}
                className="med-input"
                aria-label={t.customSymptomPlaceholder}
              />
              <button
                type="submit"
                className="med-btn-secondary"
                disabled={!customSymptomInput.trim()}
              >
                <Plus size={16} />
                <span>{t.add}</span>
              </button>
            </form>
          </div>

          {/* Preset symptom chips */}
          <div className="med-preset-symptoms-section">
            <div className="med-chip-group" role="group" aria-label="Available Symptoms">
              {filteredPresetSymptoms.map((s) => {
                const isSelected = intake.symptoms.includes(s.label);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`med-chip ${isSelected ? "selected" : ""} ${
                      s.redFlagCandidate ? "red-flag-candidate" : ""
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        removeSymptom(s.label);
                      } else {
                        addSymptomWithDetails(s.label);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (isSelected) removeSymptom(s.label);
                        else addSymptomWithDetails(s.label);
                      }
                    }}
                    aria-pressed={isSelected}
                  >
                    {s.label}
                    {isSelected && <Check size={14} className="med-chip-check" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected symptoms table with duration and severity */}
          {intake.symptoms.length > 0 && (
            <div className="med-selected-symptoms-table">
              <h3>
                {t.selectedSymptoms} ({intake.symptoms.length})
              </h3>
              <div className="med-symptom-cards-list">
                {intake.symptoms.map((sLabel) => {
                  const details = intake.symptomDetails[sLabel] || {
                    duration: "1-3 days",
                    severity: "mild",
                  };

                  return (
                    <div key={sLabel} className="med-symptom-item-card">
                      <div className="med-symptom-item-title">
                        <strong>{sLabel}</strong>
                        <button
                          type="button"
                          onClick={() => removeSymptom(sLabel)}
                          className="med-remove-symptom-btn"
                          aria-label={`Remove ${sLabel}`}
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="med-symptom-modifiers-grid">
                        {/* Duration Selector */}
                        <div className="med-modifier-col">
                          <label className="med-mini-label">
                            <Clock size={12} />
                            <span>{t.durationLabel}</span>
                          </label>
                          <div className="med-pill-selector">
                            {["<1 day", "1-3 days", ">3 days"].map((dur) => (
                              <button
                                key={dur}
                                type="button"
                                className={`med-mini-pill ${details.duration === dur ? "active" : ""} ${
                                  dur === ">3 days" ? "pill-warning" : ""
                                }`}
                                onClick={() => updateSymptomDetail(sLabel, "duration", dur)}
                              >
                                {dur === "<1 day"
                                  ? t.durationUnder1Day
                                  : dur === "1-3 days"
                                  ? t.duration1to3Days
                                  : t.durationOver3Days}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Severity Selector */}
                        <div className="med-modifier-col">
                          <label className="med-mini-label">
                            <HeartPulse size={12} />
                            <span>{t.severityLabel}</span>
                          </label>
                          <div className="med-pill-selector">
                            {["mild", "moderate", "severe"].map((sev) => (
                              <button
                                key={sev}
                                type="button"
                                className={`med-mini-pill ${details.severity === sev ? `active-${sev}` : ""}`}
                                onClick={() => updateSymptomDetail(sLabel, "severity", sev)}
                              >
                                {sev === "mild"
                                  ? t.severityMild
                                  : sev === "moderate"
                                  ? t.severityModerate
                                  : t.severitySevere}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          STEP 2: PATIENT CLINICAL PROFILE
      ========================================================= */}
      {currentStep === 2 && (
        <div className="med-step-content med-fade-in" role="tabpanel" aria-labelledby="step-2-title">
          <div className="med-step-header">
            <div>
              <h2 id="step-2-title">{t.step2Title}</h2>
              <p className="med-step-subtitle">{t.step2Desc}</p>
            </div>
            {intake.hasAutofilled && (
              <div className="med-autofill-badge">
                <Check size={14} />
                <span>{t.autofillNotice}</span>
              </div>
            )}
          </div>

          <div className="med-form-grid">
            {/* Age */}
            <div className="med-field-group">
              <label htmlFor="patient-age" className="med-label">
                {t.ageLabel} <span className="med-req">*</span>
              </label>
              <input
                id="patient-age"
                type="number"
                min="0"
                max="120"
                placeholder="e.g. 28"
                value={intake.age}
                onChange={(e) => setIntake({ ...intake, age: e.target.value })}
                className="med-input"
                required
              />
              {parseInt(intake.age, 10) < 12 && (
                <span className="med-field-help med-text-warning">
                  ⚠️ Age &lt; 12 requires pediatric weight-based dosing and physician supervision.
                </span>
              )}
            </div>

            {/* Weight */}
            <div className="med-field-group">
              <label htmlFor="patient-weight" className="med-label">
                {t.weightLabel}{" "}
                {parseInt(intake.age, 10) < 12 && <span className="med-req">*</span>}
              </label>
              <input
                id="patient-weight"
                type="number"
                min="2"
                max="300"
                step="0.5"
                placeholder="e.g. 62"
                value={intake.weight}
                onChange={(e) => setIntake({ ...intake, weight: e.target.value })}
                className="med-input"
              />
            </div>

            {/* Gender */}
            <div className="med-field-group">
              <label htmlFor="patient-gender" className="med-label">
                {t.genderLabel}
              </label>
              <select
                id="patient-gender"
                value={intake.gender}
                onChange={(e) => setIntake({ ...intake, gender: e.target.value })}
                className="med-select"
              >
                <option value="unspecified">{t.genderOther}</option>
                <option value="male">{t.genderMale}</option>
                <option value="female">{t.genderFemale}</option>
              </select>
            </div>

            {/* Pregnancy / Nursing Status (Shown if female or unspecified) */}
            {intake.gender !== "male" && (
              <div className="med-field-group med-full-width">
                <label className="med-label">{t.pregnancyNursingLabel}</label>
                <div className="med-pill-selector">
                  <button
                    type="button"
                    className={`med-pill ${!intake.pregnant && !intake.nursing ? "active" : ""}`}
                    onClick={() => setIntake({ ...intake, pregnant: false, nursing: false, pregnancyTrimester: "" })}
                  >
                    {t.notPregnant}
                  </button>
                  <button
                    type="button"
                    className={`med-pill ${intake.pregnant ? "active active-warn" : ""}`}
                    onClick={() => setIntake({ ...intake, pregnant: true, nursing: false })}
                  >
                    {t.pregnant}
                  </button>
                  <button
                    type="button"
                    className={`med-pill ${intake.nursing ? "active active-warn" : ""}`}
                    onClick={() => setIntake({ ...intake, nursing: true, pregnant: false, pregnancyTrimester: "" })}
                  >
                    {t.nursing}
                  </button>
                </div>

                {intake.pregnant && (
                  <div className="med-sub-field med-fade-in">
                    <label htmlFor="trimester-select" className="med-sub-label">
                      {t.trimesterLabel}
                    </label>
                    <select
                      id="trimester-select"
                      value={intake.pregnancyTrimester || "trimester1"}
                      onChange={(e) => setIntake({ ...intake, pregnancyTrimester: e.target.value })}
                      className="med-select"
                    >
                      <option value="trimester1">{t.trimester1}</option>
                      <option value="trimester2">{t.trimester2}</option>
                      <option value="trimester3">{t.trimester3}</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Alcohol and Smoking Toggles */}
            <div className="med-field-group med-full-width med-toggles-card">
              <label className="med-toggle-row">
                <input
                  type="checkbox"
                  checked={intake.alcohol}
                  onChange={(e) => setIntake({ ...intake, alcohol: e.target.checked })}
                />
                <div>
                  <strong>{t.alcoholToggle}</strong>
                  <small>Critical for paracetamol hepatotoxicity checks & CNS-depressant antihistamines.</small>
                </div>
              </label>

              <label className="med-toggle-row">
                <input
                  type="checkbox"
                  checked={intake.smoking}
                  onChange={(e) => setIntake({ ...intake, smoking: e.target.checked })}
                />
                <div>
                  <strong>{t.smokingToggle}</strong>
                  <small>Assesses airway reactivity and vascular contraindications.</small>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          STEP 3: SAFETY HISTORY (ALLERGIES, CURRENT MEDS, CHRONIC)
      ========================================================= */}
      {currentStep === 3 && (
        <div className="med-step-content med-fade-in" role="tabpanel" aria-labelledby="step-3-title">
          <div className="med-step-header">
            <div>
              <h2 id="step-3-title">{t.step3Title}</h2>
              <p className="med-step-subtitle">{t.step3Desc}</p>
            </div>
          </div>

          {/* 1. ALLERGIES */}
          <div className="med-history-section">
            <label className="med-label">
              <ShieldAlert size={16} />
              <span>{t.allergiesLabel}</span>
            </label>
            <p className="med-field-hint">
              Any previous rashes, swelling, or anaphylaxis from specific medications.
            </p>

            <div className="med-chip-group">
              {ALLERGIES_PRESETS.map((a) => {
                const isSelected = intake.allergies.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    className={`med-chip ${isSelected ? "selected-danger" : ""}`}
                    onClick={() => {
                      if (isSelected) {
                        setIntake({ ...intake, allergies: intake.allergies.filter((x) => x !== a) });
                      } else {
                        setIntake({ ...intake, allergies: [...intake.allergies, a] });
                      }
                    }}
                  >
                    {a}
                    {isSelected && <Check size={14} className="med-chip-check" />}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (allergyInput.trim() && !intake.allergies.includes(allergyInput.trim())) {
                  setIntake({ ...intake, allergies: [...intake.allergies, allergyInput.trim()] });
                  setAllergyInput("");
                }
              }}
              className="med-inline-add-form"
            >
              <input
                type="text"
                placeholder={t.searchAllergiesPlaceholder}
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                className="med-input"
              />
              <button
                type="submit"
                className="med-btn-secondary"
                disabled={!allergyInput.trim()}
              >
                <Plus size={16} />
                <span>{t.add}</span>
              </button>
            </form>
          </div>

          {/* 2. CURRENT MEDICATIONS (WITH AUTOCOMPLETE & BRAND MAPPING) */}
          <div className="med-history-section">
            <label className="med-label">
              <Pill size={16} />
              <span>{t.currentMedsLabel}</span>
            </label>
            <p className="med-field-hint">
              Used to check multi-drug interactions (DDInter matrix) against proposed OTC agents.
            </p>

            {/* Current Medicines Chips */}
            {intake.current_medicines.length > 0 && (
              <div className="med-active-tags-row">
                {intake.current_medicines.map((m) => (
                  <span key={m} className="med-active-tag">
                    {m}
                    <button
                      type="button"
                      onClick={() =>
                        setIntake({
                          ...intake,
                          current_medicines: intake.current_medicines.filter((x) => x !== m),
                        })
                      }
                      aria-label={`Remove ${m}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Autocomplete Input */}
            <div className="med-autocomplete-wrapper">
              <div className="med-search-input-wrap">
                <Search size={16} />
                <input
                  type="text"
                  placeholder={t.searchMedsPlaceholder}
                  value={medSearchInput}
                  onChange={(e) => handleMedSearchChange(e.target.value)}
                  onFocus={() => setShowMedDropdown(medSearchResults.length > 0)}
                  className="med-input"
                  aria-label={t.searchMedsPlaceholder}
                />
              </div>

              {showMedDropdown && (
                <div className="med-autocomplete-dropdown">
                  {medSearchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="med-autocomplete-item"
                      onClick={() => addCurrentMed(`${item.brand} (${item.generic})`)}
                    >
                      <div className="med-auto-main">
                        <strong>{item.brand}</strong>
                        <span className="med-auto-generic">{item.generic}</span>
                      </div>
                      <span className="med-auto-class">{item.class}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. CHRONIC CONDITIONS */}
          <div className="med-history-section">
            <label className="med-label">
              <HeartPulse size={16} />
              <span>{t.conditionsLabel}</span>
            </label>
            <p className="med-field-hint">
              Ensures contraindication checks (e.g. Asthma + Aspirin, Peptic Ulcer + NSAIDs, G6PD).
            </p>

            <div className="med-chip-group">
              {CHRONIC_CONDITIONS_LIST.map((c) => {
                const isSelected = intake.conditions.includes(c.label);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`med-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      if (isSelected) {
                        setIntake({ ...intake, conditions: intake.conditions.filter((x) => x !== c.label) });
                      } else {
                        setIntake({ ...intake, conditions: [...intake.conditions, c.label] });
                      }
                    }}
                    title={c.caution}
                  >
                    {c.label}
                    {isSelected && <Check size={14} className="med-chip-check" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          STEP 4: REVIEW & EVALUATE
      ========================================================= */}
      {currentStep === 4 && (
        <div className="med-step-content med-fade-in" role="tabpanel" aria-labelledby="step-4-title">
          <div className="med-step-header">
            <div>
              <h2 id="step-4-title">{t.reviewHeading}</h2>
              <p className="med-step-subtitle">{t.step4Desc}</p>
            </div>
          </div>

          <div className="med-review-grid">
            {/* Review Section 1: Symptoms */}
            <div className="med-review-card">
              <div className="med-review-card-head">
                <span className="med-review-title">1. {t.step1Title.split(". ")[1]}</span>
                <button
                  type="button"
                  className="med-review-edit-btn"
                  onClick={() => setCurrentStep(1)}
                >
                  <Edit2 size={13} />
                  <span>{t.editSection}</span>
                </button>
              </div>
              <div className="med-review-list">
                {intake.symptoms.map((s) => {
                  const det = intake.symptomDetails[s] || { duration: "1-3 days", severity: "mild" };
                  return (
                    <div key={s} className="med-review-item">
                      <strong>{s}</strong>
                      <span className="med-review-tag">
                        {det.duration} &middot; {det.severity}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Review Section 2: Patient Profile */}
            <div className="med-review-card">
              <div className="med-review-card-head">
                <span className="med-review-title">2. {t.step2Title.split(". ")[1]}</span>
                <button
                  type="button"
                  className="med-review-edit-btn"
                  onClick={() => setCurrentStep(2)}
                >
                  <Edit2 size={13} />
                  <span>{t.editSection}</span>
                </button>
              </div>
              <div className="med-review-details-grid">
                <div>
                  <small>Age</small>
                  <p>{intake.age || "Not specified"} years</p>
                </div>
                <div>
                  <small>Weight</small>
                  <p>{intake.weight ? `${intake.weight} kg` : "Not specified"}</p>
                </div>
                <div>
                  <small>Gender</small>
                  <p style={{ textTransform: "capitalize" }}>{intake.gender || "Unspecified"}</p>
                </div>
                <div>
                  <small>Pregnancy / Nursing</small>
                  <p>
                    {intake.pregnant
                      ? `Pregnant (${intake.pregnancyTrimester || "1st Trimester"})`
                      : intake.nursing
                      ? "Nursing"
                      : "None"}
                  </p>
                </div>
                <div>
                  <small>Alcohol / Smoking</small>
                  <p>
                    {intake.alcohol ? "Alcohol: Yes" : "Alcohol: No"} &middot;{" "}
                    {intake.smoking ? "Smoking: Yes" : "Smoking: No"}
                  </p>
                </div>
              </div>
            </div>

            {/* Review Section 3: Safety History */}
            <div className="med-review-card">
              <div className="med-review-card-head">
                <span className="med-review-title">3. {t.step3Title.split(". ")[1]}</span>
                <button
                  type="button"
                  className="med-review-edit-btn"
                  onClick={() => setCurrentStep(3)}
                >
                  <Edit2 size={13} />
                  <span>{t.editSection}</span>
                </button>
              </div>
              <div className="med-review-details-grid">
                <div>
                  <small>Drug Allergies ({intake.allergies.length})</small>
                  <p>{intake.allergies.join(", ") || "None reported"}</p>
                </div>
                <div>
                  <small>Current Daily Meds ({intake.current_medicines.length})</small>
                  <p>{intake.current_medicines.join(", ") || "None reported"}</p>
                </div>
                <div>
                  <small>Chronic Conditions ({intake.conditions.length})</small>
                  <p>{intake.conditions.join(", ") || "None reported"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Evaluate Action Button */}
          <div className="med-evaluate-cta-box">
            {evalError && (
              <div className="med-alert med-alert-error" role="alert">
                <AlertCircle size={18} />
                <span>{evalError}</span>
              </div>
            )}

            <button
              type="button"
              className="med-btn-evaluate"
              onClick={onEvaluate}
              disabled={evaluating}
            >
              {evaluating ? (
                <>
                  <Loader2 size={18} className="med-spin" />
                  <span>{t.evaluatingText}</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>{t.evaluateBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          WIZARD FOOTER NAVIGATION (BACK / NEXT)
      ========================================================= */}
      <div className="med-wizard-footer">
        {currentStep > 1 ? (
          <button
            type="button"
            className="med-btn-wizard med-btn-back"
            onClick={handleBack}
          >
            <ChevronLeft size={16} />
            <span>{t.back}</span>
          </button>
        ) : (
          <div />
        )}

        {currentStep < 4 ? (
          <button
            type="button"
            className="med-btn-wizard med-btn-next"
            onClick={handleNext}
          >
            <span>{t.next}</span>
            <ChevronRight size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
