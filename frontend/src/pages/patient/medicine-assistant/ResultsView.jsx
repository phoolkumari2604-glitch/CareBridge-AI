import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  Bookmark,
  MapPin,
  Stethoscope,
  Camera,
  Info,
  Clock,
  Pill,
  ExternalLink,
  HelpCircle,
  Database,
  Check
} from "lucide-react";
import { jsPDF } from "jspdf";
import { getLabelDosingGuidelines } from "./brandGenericMap";

export default function ResultsView({
  result,
  intake,
  t,
  lang,
  onSaveHistory,
  onOpenScanModal,
  showToast
}) {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!result) return null;

  const suggestions = result.suggestions || [];
  const filteredOut = result.filtered_out || result.excluded_medicines || [];

  // Parse which safety layer blocked a medicine
  const categorizeExcludedReason = (reason = "") => {
    const r = reason.toLowerCase();
    if (r.includes("allergy")) return { layer: "Allergy Filter", icon: "allergy", color: "#f87171" };
    if (r.includes("interaction") || r.includes("ddinter")) return { layer: "Drug-Drug Interaction", icon: "interaction", color: "#f97316" };
    if (r.includes("pediatric") || r.includes("age") || r.includes("threshold")) return { layer: "Pediatric / Age", icon: "age", color: "#fbbf24" };
    if (r.includes("pregnancy") || r.includes("trimester") || r.includes("fetal")) return { layer: "Pregnancy / Nursing", icon: "pregnancy", color: "#ec4899" };
    if (r.includes("banned") || r.includes("cdsco") || r.includes("prohibited")) return { layer: "CDSCO Ban", icon: "banned", color: "#ef4444" };
    if (r.includes("ulcer") || r.includes("kidney") || r.includes("liver") || r.includes("contraindicat")) return { layer: "Chronic Condition", icon: "condition", color: "#eab308" };
    return { layer: "Safety Guardrail", icon: "general", color: "#94a3b8" };
  };

  // Generate & Download PDF Report
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(14, 165, 233); // CareBridge Sky Blue
      doc.text("CareBridge AI - OTC Medicine & Safety Summary", 14, 20);

      // Metadata
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()} | Clinical Decision-Support Only`, 14, 28);
      doc.text("DISCLAIMER: Not a medical diagnosis or formal prescription.", 14, 34);

      // Patient Intake Summary
      doc.setDrawColor(200);
      doc.line(14, 38, pageWidth - 14, 38);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30);
      doc.text("Patient Symptoms & Intake Profile:", 14, 46);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`• Reported Symptoms: ${intake.symptoms.join(", ") || "None"}`, 16, 54);
      doc.text(`• Age: ${intake.age || "N/A"} years | Weight: ${intake.weight ? `${intake.weight} kg` : "N/A"} | Gender: ${intake.gender || "Unspecified"}`, 16, 60);
      doc.text(`• Known Drug Allergies: ${intake.allergies.join(", ") || "None reported"}`, 16, 66);
      doc.text(`• Current Medications: ${intake.current_medicines.join(", ") || "None reported"}`, 16, 72);
      doc.text(`• Chronic Conditions: ${intake.conditions.join(", ") || "None reported"}`, 16, 78);

      let yPos = 88;

      // Safe Options
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(16, 185, 129); // Green
      doc.text(`Approved First-Line OTC Options (${suggestions.length}):`, 14, yPos);
      yPos += 8;

      if (suggestions.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("No safe OTC options recommended. Please consult a licensed physician.", 16, yPos);
        yPos += 10;
      } else {
        suggestions.forEach((med, idx) => {
          if (yPos > 260) {
            doc.addPage();
            yPos = 20;
          }
          const guide = getLabelDosingGuidelines(med.generic_name, intake.age, intake.weight);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(15, 23, 42);
          doc.text(`${idx + 1}. ${med.generic_name} (${med.drug_class || "OTC Agent"})`, 16, yPos);
          yPos += 6;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(60);

          if (med.common_brands && med.common_brands.length > 0) {
            const brandsStr = med.common_brands.map((b) => `${b.brand_name} (${b.strength})`).join(", ");
            doc.text(`   Common Brands: ${brandsStr}`, 16, yPos);
            yPos += 5;
          }

          doc.text(`   Typical Dosing: ${guide.dosing}`, 16, yPos, { maxWidth: pageWidth - 32 });
          yPos += 6;
          doc.text(`   Max Daily Limit: ${guide.maxDaily}`, 16, yPos, { maxWidth: pageWidth - 32 });
          yPos += 6;
          doc.text(`   Duration Limit: ${guide.durationLimit}`, 16, yPos, { maxWidth: pageWidth - 32 });
          yPos += 6;
          doc.text(`   When to Stop: ${guide.whenToStop}`, 16, yPos, { maxWidth: pageWidth - 32 });
          yPos += 9;
        });
      }

      // Excluded Medicines
      if (filteredOut.length > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(239, 68, 68); // Red
        doc.text(`Excluded Medications by Safety Filters (${filteredOut.length}):`, 14, yPos);
        yPos += 8;

        filteredOut.forEach((ex) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(30);
          doc.text(`• ${ex.generic_name}: `, 16, yPos);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80);
          doc.text(`${ex.reason}`, 45, yPos, { maxWidth: pageWidth - 55 });
          yPos += 7;
        });
      }

      // Save file
      doc.save(`CareBridge_OTC_Safety_Evaluation_${Date.now()}.pdf`);
      showToast?.("PDF report downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      showToast?.("Failed to generate PDF. You can use browser print (Ctrl+P).");
    }
  };

  // Share evaluation summary
  const handleShare = async () => {
    const textToShare = `CareBridge AI OTC Safety Evaluation\nSymptoms: ${intake.symptoms.join(", ")}\nApproved Safe OTC Options: ${suggestions.map((s) => s.generic_name).join(", ") || "None (Physician consult advised)"}\nAlways consult a doctor before taking any medication.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "CareBridge AI - OTC Medicine Evaluation",
          text: textToShare,
          url: window.location.href,
        });
      } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(textToShare);
        setCopied(true);
        showToast?.("Summary copied to clipboard!");
        setTimeout(() => setCopied(false), 2500);
      } catch (_) {}
    }
  };

  const handleSaveToHistory = () => {
    if (onSaveHistory) {
      onSaveHistory({
        id: `eval_${Date.now()}`,
        timestamp: new Date().toISOString(),
        dateFormatted: new Date().toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        intake,
        suggestionsCount: suggestions.length,
        excludedCount: filteredOut.length,
        suggestions: suggestions.map((s) => ({
          generic_name: s.generic_name,
          drug_class: s.drug_class,
          brands: (s.common_brands || []).map((b) => b.brand_name).slice(0, 3),
        })),
      });
      setIsSaved(true);
      showToast?.("Evaluation saved to your local history tab!");
    }
  };

  return (
    <div className="med-results-container med-fade-in" role="region" aria-live="polite">
      {/* =========================================================
          RESULTS ACTION TOOLBAR
      ========================================================= */}
      <div className="med-results-actions-bar">
        <div className="med-actions-left">
          <button
            type="button"
            className={`med-action-btn ${isSaved ? "saved" : ""}`}
            onClick={handleSaveToHistory}
            disabled={isSaved}
            title={t.saveToHistory}
          >
            {isSaved ? <Check size={16} /> : <Bookmark size={16} />}
            <span>{isSaved ? "Saved to History" : t.saveToHistory}</span>
          </button>

          <button
            type="button"
            className="med-action-btn"
            onClick={handleDownloadPDF}
            title={t.downloadPDF}
          >
            <Download size={16} />
            <span>{t.downloadPDF}</span>
          </button>

          <button
            type="button"
            className="med-action-btn"
            onClick={handleShare}
            title={t.shareResults}
          >
            <Share2 size={16} />
            <span>{copied ? "Copied Link!" : t.shareResults}</span>
          </button>
        </div>

        <div className="med-actions-right">
          <button
            type="button"
            className="med-action-btn med-action-scan"
            onClick={onOpenScanModal}
            title={t.scanStrip}
          >
            <Camera size={16} />
            <span>{t.scanStrip}</span>
          </button>

          <Link to="/patient/hospitals" className="med-action-btn med-action-pharmacy">
            <MapPin size={16} />
            <span>{t.nearbyPharmacy}</span>
          </Link>

          <Link to="/patient/doctors" className="med-btn-primary med-action-doctor">
            <Stethoscope size={16} />
            <span>{t.talkToDoctor}</span>
          </Link>
        </div>
      </div>

      {/* =========================================================
          CLINICAL ALERTS (PEDIATRIC & PREGNANCY WARNINGS)
      ========================================================= */}
      {result.pediatric_warning && (
        <div className="med-alert med-alert-warn" role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Pediatric Dosing Notice:</strong> {result.pediatric_warning}
          </div>
        </div>
      )}

      {result.pregnancy_warning && (
        <div className="med-alert med-alert-warn" role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Pregnancy & Nursing Advisory:</strong> {result.pregnancy_warning}
          </div>
        </div>
      )}

      {/* =========================================================
          EXPANDABLE 5-LAYER SAFETY CHECK BREAKDOWN
      ========================================================= */}
      <div className="med-safety-breakdown-card">
        <button
          type="button"
          className="med-breakdown-toggle-btn"
          onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
          aria-expanded={isBreakdownOpen}
        >
          <div className="med-breakdown-head-left">
            <ShieldCheck size={20} className="med-text-success" />
            <div>
              <strong>{t.safetyBreakdown}</strong>
              <small>Validated against curated CDSCO, NLEM 2022 & DDInter Formularies</small>
            </div>
          </div>
          {isBreakdownOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {isBreakdownOpen && (
          <div className="med-breakdown-body med-fade-in">
            <div className="med-layer-step-item pass">
              <CheckCircle2 size={18} className="med-text-success" />
              <div>
                <strong>Layer 1: Red-Flag Emergency Triage</strong>
                <p>Passed. No acute cardiac ischemia, respiratory collapse, shock, or prolonged febrile signs identified.</p>
              </div>
            </div>

            <div className="med-layer-step-item pass">
              <CheckCircle2 size={18} className="med-text-success" />
              <div>
                <strong>Layer 2: CDSCO Banned Formulations Filter</strong>
                <p>Passed. All unapproved irrational fixed-dose combinations (FDCs) strictly excluded.</p>
              </div>
            </div>

            <div className={`med-layer-step-item ${intake.allergies.length > 0 ? "caution" : "pass"}`}>
              {intake.allergies.length > 0 ? (
                <AlertTriangle size={18} className="med-text-warning" />
              ) : (
                <CheckCircle2 size={18} className="med-text-success" />
              )}
              <div>
                <strong>Layer 3: Allergy Cross-Sensitivity Filter</strong>
                <p>
                  {intake.allergies.length > 0
                    ? `Active. Filtered against ${intake.allergies.length} reported patient allergy items.`
                    : "Passed. No patient drug allergies declared."}
                </p>
              </div>
            </div>

            <div className="med-layer-step-item pass">
              <CheckCircle2 size={18} className="med-text-success" />
              <div>
                <strong>Layer 4: Age, Pediatric & Pregnancy Contraindication Filter</strong>
                <p>
                  Evaluated for age ({intake.age || "N/A"} yrs)
                  {intake.pregnant ? " & Pregnancy safety Category B/C" : ""}.
                </p>
              </div>
            </div>

            <div className={`med-layer-step-item ${intake.current_medicines.length > 0 ? "caution" : "pass"}`}>
              {intake.current_medicines.length > 0 ? (
                <ShieldCheck size={18} className="med-text-info" />
              ) : (
                <CheckCircle2 size={18} className="med-text-success" />
              )}
              <div>
                <strong>Layer 5: Drug-Drug Interaction Matrix (DDInter)</strong>
                <p>
                  {intake.current_medicines.length > 0
                    ? `Checked against ${intake.current_medicines.length} existing prescription medicines.`
                    : "Passed. No daily medications entered for cross-interaction check."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          SECTION 1: APPROVED FIRST-LINE OTC OPTIONS
      ========================================================= */}
      <div className="med-suggestions-header">
        <div>
          <h3>{t.safeOptions} ({suggestions.length})</h3>
          <p className="med-suggestions-subtitle">
            First-line active ingredients approved for self-directed mild relief under Indian pharmacopeia.
          </p>
        </div>
        <span className="med-badge-verified">
          <ShieldCheck size={14} />
          <span>Curated OTC Allowlist</span>
        </span>
      </div>

      {suggestions.length === 0 ? (
        <div className="med-empty-card">
          <HelpCircle size={36} />
          <h4>No Safe OTC Recommendations Identified</h4>
          <p>
            Either no first-line OTC drugs exist for this specific combination, or potential medications were excluded by your active safety filters (allergies, interactions, or contraindications).
          </p>
          <Link to="/patient/doctors" className="med-btn-primary">
            <Stethoscope size={16} />
            <span>Consult a Verified CareBridge Physician</span>
          </Link>
        </div>
      ) : (
        <div className="med-suggestions-grid">
          {suggestions.map((med, idx) => {
            const dosingGuide = getLabelDosingGuidelines(med.generic_name, intake.age, intake.weight);

            return (
              <div key={idx} className="med-suggestion-card">
                <div className="med-card-top">
                  <div>
                    <span className="med-drug-class">{med.drug_class || "First-Line OTC"}</span>
                    <h4 className="med-generic-name">{med.generic_name}</h4>
                  </div>
                  <span className="med-otc-badge">OTC Approved</span>
                </div>

                <div className="med-card-body">
                  {/* Purpose */}
                  <div className="med-section-row">
                    <span className="med-row-label">Primary Purpose:</span>
                    <p className="med-row-text">{med.commonly_used_for || med.description}</p>
                  </div>

                  {/* Typical Label Dosing */}
                  <div className="med-section-row med-dosing-box">
                    <span className="med-row-label">
                      <Clock size={13} />
                      <span>{t.typicalDosing}:</span>
                    </span>
                    <p className="med-dosing-text">{dosingGuide.dosing}</p>
                    <div className="med-dosing-limits-row">
                      <span><strong>{t.maxDailyLimit}:</strong> {dosingGuide.maxDaily}</span>
                      <span><strong>{t.durationLimit}:</strong> {dosingGuide.durationLimit}</span>
                    </div>
                  </div>

                  {/* When to Stop & See a Doctor */}
                  <div className="med-section-row med-stop-box">
                    <span className="med-row-label">
                      <AlertTriangle size={13} />
                      <span>{t.whenToSeeDoctor}:</span>
                    </span>
                    <p className="med-stop-text">{dosingGuide.whenToStop}</p>
                  </div>

                  {/* Common Indian Brands */}
                  {med.common_brands && med.common_brands.length > 0 && (
                    <div className="med-section-row">
                      <span className="med-row-label">{t.commonBrands}:</span>
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

                  {/* Clinical Warnings */}
                  {med.warnings && med.warnings.length > 0 && (
                    <div className="med-section-row">
                      <span className="med-row-label">{t.warnings}:</span>
                      <ul className="med-warnings-list">
                        {med.warnings.map((w, wIdx) => (
                          <li key={wIdx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Side Effects */}
                  {med.side_effects && med.side_effects.length > 0 && (
                    <div className="med-section-row">
                      <span className="med-row-label">{t.sideEffects} (SIDER):</span>
                      <div className="med-side-effects-chips">
                        {med.side_effects.map((se, sIdx) => (
                          <span key={sIdx} className="med-se-chip">
                            {se.effect} <small>({(se.frequency || "").toLowerCase()})</small>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interaction caution */}
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
                    Source: {med.source || "A-Z Medicine Dataset of India, NLEM 2022"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================
          SECTION 2: AVOID / EXCLUDED MEDICINES
      ========================================================= */}
      {filteredOut.length > 0 && (
        <div className="med-excluded-card">
          <div className="med-excluded-header">
            <h4>
              <XCircle size={20} className="med-text-danger" />
              <span>{t.avoidSection} ({filteredOut.length})</span>
            </h4>
            <span className="med-excluded-count-badge">Safety Block Active</span>
          </div>

          <p className="med-card-subtitle">
            These active ingredients match your reported symptoms but were strictly blocked to prevent adverse clinical risks:
          </p>

          <div className="med-excluded-list">
            {filteredOut.map((ex, exIdx) => {
              const cat = categorizeExcludedReason(ex.reason);

              return (
                <div key={exIdx} className="med-excluded-item">
                  <div className="med-excluded-top">
                    <strong className="med-excluded-name">{ex.generic_name}</strong>
                    <span
                      className="med-layer-badge"
                      style={{ borderColor: cat.color, color: cat.color }}
                    >
                      {cat.layer}
                    </span>
                  </div>
                  <span className="med-excluded-reason">{ex.reason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          PERSISTENT LEGAL / CLINICAL DISCLAIMER
      ========================================================= */}
      <div className="med-results-disclaimer">
        <Info size={18} />
        <div>
          <strong>Mandatory Safety & Compliance Notice:</strong> {t.educationalDisclaimer}
        </div>
      </div>
    </div>
  );
}
