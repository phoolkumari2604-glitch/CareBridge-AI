import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  FileText,
  Languages,
  Bookmark,
  Camera,
  Check
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import medicineService from "../../services/medicineService";
import patientService from "../../services/patientService";
import CameraModal from "../../components/common/CameraModal";

import { I18N } from "./medicine-assistant/i18n";
import { checkRedFlagEmergency } from "./medicine-assistant/redFlagChecker";
import SymptomWizard from "./medicine-assistant/SymptomWizard";
import ResultsView from "./medicine-assistant/ResultsView";
import RedFlagModal from "./medicine-assistant/RedFlagModal";
import HistoryTab from "./medicine-assistant/HistoryTab";

import "./MedicineAssistant.css";

const STORAGE_HISTORY_KEY = "carebridge_medicine_eval_history";

function MedicineAssistant() {
  const { user } = useAuth();

  // Language state (en, hi, te)
  const [lang, setLang] = useState(() => {
    return localStorage.getItem("carebridge_lang") || "en";
  });
  const t = useMemo(() => I18N[lang] || I18N.en, [lang]);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem("carebridge_lang", newLang);
  };

  // Active Tab: "intake" | "chat" | "search" | "history"
  const [activeTab, setActiveTab] = useState("intake");

  // Patient Clinical Intake State
  const [intake, setIntake] = useState({
    symptoms: [],
    symptomDetails: {}, // { [label]: { duration: '1-3 days', severity: 'mild' } }
    age: "",
    weight: "",
    gender: "unspecified",
    pregnant: false,
    nursing: false,
    pregnancyTrimester: "",
    alcohol: false,
    smoking: false,
    allergies: [],
    current_medicines: [],
    conditions: [],
    hasAutofilled: false,
  });

  // User Profile loaded from auth or health record
  const [userProfile, setUserProfile] = useState(null);

  // Red-flag emergency screening state
  const [emergencyData, setEmergencyData] = useState({ triggered: false });

  // Evaluation & Results State
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [evalError, setEvalError] = useState(null);

  // Camera Modal for Scanning Medicine Strip
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // Evaluation History State
  const [historyItems, setHistoryItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Search Tab State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [partnerDrug, setPartnerDrug] = useState("");
  const [interactionResult, setInteractionResult] = useState(null);
  const [interactionLoading, setInteractionLoading] = useState(false);

  // Chat Tab State
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

  // Load Patient Profile from Patient Service / Auth Context
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const patientId = user?.patient_id || user?.id;
        if (patientId) {
          const profile = await patientService.getPatientProfile(patientId);
          if (profile) {
            setUserProfile(profile);
          }
        } else if (user) {
          setUserProfile(user);
        }
      } catch (err) {
        if (user) setUserProfile(user);
      }
    };
    fetchProfile();
  }, [user]);

  // Save history to localStorage whenever updated
  const saveEvaluationHistory = (newItem) => {
    const updated = [newItem, ...historyItems].slice(0, 30);
    setHistoryItems(updated);
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
    } catch (_) {}
  };

  const clearEvaluationHistory = () => {
    if (window.confirm("Are you sure you want to clear your local evaluation history?")) {
      setHistoryItems([]);
      localStorage.removeItem(STORAGE_HISTORY_KEY);
      showToast("Evaluation history cleared.");
    }
  };

  const reloadIntakeFromHistory = (historicalIntake) => {
    if (historicalIntake) {
      setIntake({
        ...historicalIntake,
        hasAutofilled: true,
      });
      setEvalResult(null);
      setActiveTab("intake");
      showToast("Historical symptoms and profile re-loaded into wizard.");
    }
  };

  // =========================================================
  // EVALUATION & RED-FLAG EMERGENCY TRIAGE
  // =========================================================
  const handleEvaluate = async () => {
    setEvalError(null);

    // B. CLIENT-SIDE RED-FLAG EMERGENCY SCREENING (Runs BEFORE evaluation)
    const redFlagCheck = checkRedFlagEmergency({
      symptoms: intake.symptoms,
      symptomDetails: intake.symptomDetails,
      age: intake.age ? parseInt(intake.age, 10) : null,
      pregnant: intake.pregnant,
      pregnancyTrimester: intake.pregnancyTrimester,
    });

    if (redFlagCheck.triggered) {
      setEmergencyData(redFlagCheck);
      setEvaluating(false);
      return;
    }

    setEvaluating(true);
    setEvalResult(null);

    try {
      const payload = {
        symptoms: intake.symptoms,
        age: intake.age ? parseInt(intake.age, 10) : null,
        gender: intake.gender,
        pregnant: intake.pregnant,
        pregnancy_trimester: intake.pregnancyTrimester,
        allergies: intake.allergies,
        current_medicines: intake.current_medicines,
        conditions: intake.conditions,
      };

      const data = await medicineService.suggestMedicines(payload);

      // Also check if backend returned an emergency triage
      if (data.is_emergency || data.red_flag_triggered) {
        setEmergencyData({
          triggered: true,
          code: "BACKEND_EMERGENCY",
          title: "Critical Clinical Triage Alert",
          reason: data.alert_message || data.emergency_alert,
          actionText: "Seek immediate emergency hospital medical evaluation.",
        });
      } else {
        setEvalResult(data);
        showToast("Clinical safety evaluation completed successfully!");
      }
    } catch (err) {
      setEvalError(
        err.response?.data?.error ||
          "Failed to evaluate symptoms. Please check network connectivity and retry."
      );
    } finally {
      setEvaluating(false);
    }
  };

  // Medicine Strip Camera Capture Handler
  const handleMedicineStripCaptured = (file) => {
    showToast(`Captured photo: "${file.name || "medicine_scan.jpg"}". Searching database...`);
    // Pre-populate search query and switch to search tab
    const cleanName = (file.name || "").replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    if (cleanName && !cleanName.startsWith("camera_capture")) {
      setSearchQuery(cleanName);
      setActiveTab("search");
      medicineService.searchMedicines(cleanName).then((data) => {
        setSearchResults(data.results || []);
      });
    } else {
      setActiveTab("search");
    }
  };

  // Handle Brand Search
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

  // Handle Conversational RAG Chat Submit
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
        age: intake.age ? parseInt(intake.age, 10) : null,
        gender: intake.gender,
        pregnant: intake.pregnant,
        pregnancy_trimester: intake.pregnancyTrimester,
        allergies: intake.allergies,
        current_medicines: intake.current_medicines,
        conditions: intake.conditions,
        symptoms: intake.symptoms,
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
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="med-toast-container" role="status" aria-live="polite">
          <div className="med-toast-card">
            <CheckCircle2 size={16} className="med-text-success" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* RED-FLAG EMERGENCY MODAL */}
      <RedFlagModal
        emergency={emergencyData}
        onClose={() => setEmergencyData({ triggered: false })}
        lang={lang}
        t={t}
      />

      {/* CAMERA SCANNER MODAL */}
      <CameraModal
        open={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleMedicineStripCaptured}
      />

      {/* =========================================================
          PERSISTENT LEGAL & EDUCATIONAL DISCLAIMER BANNER
      ========================================================= */}
      <div className="med-disclaimer-banner" role="region" aria-label="Medical Disclaimer">
        <div className="med-disclaimer-content">
          <Info size={18} className="med-disclaimer-icon" />
          <div className="med-disclaimer-text">
            <strong>{t.educationalDisclaimer.split(":")[0]}:</strong>{" "}
            {t.educationalDisclaimer.split(":")[1] || t.educationalDisclaimer}
            <div className="med-privacy-note">
              🔒 <strong>{t.privacyNote.split(":")[0]}:</strong>{" "}
              {t.privacyNote.split(":")[1] || t.privacyNote}
            </div>
          </div>
        </div>
        <Link to="/patient/sources-attribution" className="med-sources-pill-btn">
          <Database size={13} />
          <span>{t.sourcesAttribution}</span>
        </Link>
      </div>

      {/* =========================================================
          HEADER & LANGUAGE SWITCHER
      ========================================================= */}
      <div className="med-header">
        <div>
          <span className="med-eyebrow">5-LAYER CLINICAL SAFETY PIPELINE</span>
          <h1>{t.title}</h1>
          <p>{t.subtitle}</p>
        </div>

        <div className="med-header-actions">
          {/* Language Toggle */}
          <div className="med-lang-switch-wrapper">
            <Languages size={15} className="med-lang-icon" />
            <div className="med-lang-toggle-group">
              <button
                type="button"
                className={`med-lang-btn ${lang === "en" ? "active" : ""}`}
                onClick={() => handleLangChange("en")}
              >
                EN
              </button>
              <button
                type="button"
                className={`med-lang-btn ${lang === "hi" ? "active" : ""}`}
                onClick={() => handleLangChange("hi")}
              >
                हिन्दी
              </button>
              <button
                type="button"
                className={`med-lang-btn ${lang === "te" ? "active" : ""}`}
                onClick={() => handleLangChange("te")}
              >
                తెలుగు
              </button>
            </div>
          </div>

          <Link to="/patient/doctors" className="med-btn-primary">
            <Stethoscope size={16} />
            <span>{t.talkToDoctor}</span>
          </Link>
        </div>
      </div>

      {/* =========================================================
          NAVIGATION TABS (4 TABS: Intake, Chat, Search, History)
      ========================================================= */}
      <div className="med-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "intake"}
          className={`med-tab-btn ${activeTab === "intake" ? "active" : ""}`}
          onClick={() => setActiveTab("intake")}
        >
          <ShieldCheck size={16} />
          <span>{t.tabIntake}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "chat"}
          className={`med-tab-btn ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          <Bot size={16} />
          <span>{t.tabChat}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "search"}
          className={`med-tab-btn ${activeTab === "search" ? "active" : ""}`}
          onClick={() => setActiveTab("search")}
        >
          <Search size={16} />
          <span>{t.tabSearch}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "history"}
          className={`med-tab-btn ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <Clock size={16} />
          <span>
            {t.tabHistory} ({historyItems.length})
          </span>
        </button>
      </div>

      {/* =========================================================
          TAB 1: SYMPTOM INTAKE WIZARD & 5-LAYER SAFETY RESULTS
      ========================================================= */}
      {activeTab === "intake" && (
        <div className="med-intake-container">
          {/* 4-Step Wizard */}
          <SymptomWizard
            intake={intake}
            setIntake={setIntake}
            onEvaluate={handleEvaluate}
            evaluating={evaluating}
            evalError={evalError}
            t={t}
            lang={lang}
            userProfile={userProfile}
          />

          {/* Results View */}
          {evalResult && (
            <ResultsView
              result={evalResult}
              intake={intake}
              t={t}
              lang={lang}
              onSaveHistory={saveEvaluationHistory}
              onOpenScanModal={() => setCameraModalOpen(true)}
              showToast={showToast}
            />
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: CONVERSATIONAL RAG ASSISTANT
      ========================================================= */}
      {activeTab === "chat" && (
        <div className="med-chat-container med-fade-in">
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
                        <strong>Emergency Alert:</strong> Critical symptoms detected. Call 112 /
                        108 or proceed to emergency triage immediately.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="med-chat-bubble ai">
                <div className="med-bubble-avatar">
                  <Bot size={16} />
                </div>
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
        <div className="med-search-container med-fade-in">
          <div className="med-card">
            <div className="med-card-header-row">
              <div>
                <h2>Indian Brand & Generic Medicine Lookup</h2>
                <p className="med-card-subtitle">
                  Fuzzy search across 30,000+ Indian pharmaceutical brands, composition strengths, and NLEM essential drug statuses.
                </p>
              </div>
              <button
                type="button"
                className="med-btn-scan-strip"
                onClick={() => setCameraModalOpen(true)}
              >
                <Camera size={16} />
                <span>Scan Medicine Strip</span>
              </button>
            </div>

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
                        <p>
                          <strong>Manufacturer:</strong> {m.manufacturer}
                        </p>
                        <p>
                          <strong>Form & Strength:</strong> {m.dosage_form} ({m.strength})
                        </p>
                        {m.price_inr && (
                          <p>
                            <strong>Price:</strong> ₹{m.price_inr} MRP
                          </p>
                        )}
                        <div className="med-search-badges">
                          {m.is_otc ? (
                            <span className="med-badge-otc">OTC Available</span>
                          ) : (
                            <span className="med-badge-rx">Prescription Only</span>
                          )}
                          {m.is_nlem && <span className="med-badge-nlem">NLEM Essential</span>}
                          {m.is_banned && (
                            <span className="med-badge-banned">CDSCO Banned FDC</span>
                          )}
                        </div>
                      </div>

                      {/* Interaction check button */}
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

            {/* Interaction Check Modal / Panel */}
            {selectedMed && (
              <div className="med-interaction-panel med-fade-in">
                <div className="med-panel-header">
                  <h3>
                    Check Drug Interaction for: {selectedMed.brand_name} (
                    {selectedMed.generic_name})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedMed(null)}
                    className="med-close-btn"
                  >
                    ×
                  </button>
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
                      {interactionLoading ? (
                        <Loader2 size={16} className="med-spin" />
                      ) : (
                        <ShieldCheck size={16} />
                      )}
                      <span>Check Compatibility</span>
                    </button>
                  </div>

                  {interactionResult && (
                    <div className="med-interaction-result">
                      {interactionResult.interactions &&
                      interactionResult.interactions.length > 0 ? (
                        <div className="med-alert med-alert-error">
                          <AlertTriangle size={20} />
                          <div>
                            <strong>
                              Interaction Alert ({interactionResult.interactions[0].severity}):
                            </strong>
                            <p>{interactionResult.interactions[0].clinical_advice}</p>
                            <small>
                              Mechanism: {interactionResult.interactions[0].mechanism}
                            </small>
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

      {/* =========================================================
          TAB 4: EVALUATION HISTORY
      ========================================================= */}
      {activeTab === "history" && (
        <HistoryTab
          historyItems={historyItems}
          onClearHistory={clearEvaluationHistory}
          onReloadIntake={reloadIntakeFromHistory}
          t={t}
        />
      )}
    </div>
  );
}

export default MedicineAssistant;
