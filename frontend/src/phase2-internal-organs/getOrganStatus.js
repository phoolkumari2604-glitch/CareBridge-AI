/**
 * Pure clinical status resolver for CareBridge Body Explorer.
 * 
 * Rules:
 * - Read-only from patient telemetry, findings, and clinical state.
 * - Computes: green (normal), amber (watch), red (critical), grey (No data yet).
 * - Maps status to organ tint/emissive AND accessible text badge.
 * - Labeled: "Related indicator, not a diagnosis".
 * - A doctor's statusOverride always wins over computed status.
 * - Prioritizes live database organ dossier when available.
 */

import { ORGANS_CONFIG } from "./organs.config.js";
import { evaluateTelemetrySeverity } from "./clinicalThresholds.js";

export const STATUS_THEME = {
  green: {
    key: "green",
    label: "Normal",
    color: "#10b981",
    tintHex: 0x10b981,
    bg: "rgba(16, 185, 129, 0.15)",
    border: "rgba(16, 185, 129, 0.4)",
    badgeClass: "badge-normal",
  },
  amber: {
    key: "amber",
    label: "Watch",
    color: "#f59e0b",
    tintHex: 0xf59e0b,
    bg: "rgba(245, 158, 11, 0.15)",
    border: "rgba(245, 158, 11, 0.4)",
    badgeClass: "badge-watch",
  },
  red: {
    key: "red",
    label: "Critical",
    color: "#ef4444",
    tintHex: 0xef4444,
    bg: "rgba(239, 68, 68, 0.15)",
    border: "rgba(239, 68, 68, 0.4)",
    badgeClass: "badge-critical",
  },
  grey: {
    key: "grey",
    label: "No data yet",
    color: "#64748b",
    tintHex: 0x475569,
    bg: "rgba(100, 116, 139, 0.15)",
    border: "rgba(100, 116, 139, 0.3)",
    badgeClass: "badge-nodata",
  },
};

const STATUS_KEY_MAP = {
  normal: "green",
  watch: "amber",
  critical: "red",
  no_data: "grey",
};

/**
 * Pure function: Computes organ clinical status and indicators.
 * 
 * @param {string} organId - 'kidneys' | 'brain' | 'stomach' | 'pancreas' | 'thyroid' | 'intestines'
 * @param {Object} patientData - { vitals, alerts, healthProfile, healthRecords, organDossiers }
 * @param {Object|null} organDossier - Direct dossier from backend /api/patients/:id/organs
 * @returns {Object} { key, label, color, tintHex, badgeClass, summary, indicators, disclaimer, findings, reports, clinicalState }
 */
export function getOrganStatus(organId, patientData = {}, organDossier = null) {
  const cfg = ORGANS_CONFIG[organId];
  if (!cfg) {
    return {
      ...STATUS_THEME.grey,
      summary: "Organ configuration not found.",
      indicators: [],
      findings: [],
      reports: [],
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  // Check if live dossier was passed directly or embedded inside patientData
  const dossier = organDossier || patientData?.organDossiers?.[organId] || patientData?.dossiers?.[organId];

  if (dossier) {
    const rawStatus = dossier.statusOverride || dossier.status || "no_data";
    const statusKey = STATUS_KEY_MAP[rawStatus] || "grey";
    const theme = STATUS_THEME[statusKey] || STATUS_THEME.grey;

    const indicators = Array.isArray(dossier.telemetry)
      ? dossier.telemetry.map((t) => {
          const sev = t.severity || evaluateTelemetrySeverity(t.indicatorKey, organId, t.value, t.safeMin, t.safeMax);
          const indStatus = STATUS_KEY_MAP[sev] || "green";
          const formattedTime = t.recordedAt
            ? new Date(t.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Recent";

          return {
            label: t.label || t.indicatorKey,
            value: String(t.value),
            unit: t.unit || "",
            timestamp: formattedTime,
            normalRange: t.safeMin !== undefined && t.safeMax !== undefined ? `${t.safeMin} – ${t.safeMax} ${t.unit || ""}` : undefined,
            status: indStatus,
            note: t.note || "Live physiological telemetry",
            source: t.source || "CareBridge Sensor",
            isProxy: false,
          };
        })
      : [];

    const activeFindings = Array.isArray(dossier.findings)
      ? dossier.findings.filter((f) => !f.resolvedAt)
      : [];

    let summary = dossier.clinicalState?.text || "";
    if (!summary) {
      if (rawStatus === "critical") {
        summary = `Critical alerts recorded for ${cfg.name}. Immediate clinical evaluation advised.`;
      } else if (rawStatus === "watch") {
        summary = `Clinical watch indicators active for ${cfg.name}. Ongoing physiological monitoring.`;
      } else if (rawStatus === "normal") {
        summary = `${cfg.name} telemetry within healthy physiological ranges.`;
      } else {
        summary = `No immediate telemetry measurements recorded for this cycle.`;
      }
    }

    return {
      ...theme,
      summary,
      indicators,
      findings: activeFindings,
      reports: dossier.reports || [],
      clinicalState: dossier.clinicalState || null,
      statusOverride: dossier.statusOverride || null,
      rawStatus,
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  // =========================================================================
  // FALLBACK PATH: evaluate using legacy patientData { vitals, alerts }
  // =========================================================================
  const vitals = patientData.vitals || {};
  const alerts = Array.isArray(patientData.alerts) ? patientData.alerts : [];
  const timestamp = vitals.recorded_at
    ? new Date(vitals.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Recent";

  // 0. KIDNEYS
  if (organId === "kidneys") {
    const kidneyAlert = alerts.find((a) => {
      const msg = (a.message || a.alert_type || "").toLowerCase();
      return msg.includes("kidney") || msg.includes("renal") || msg.includes("creatinine") || msg.includes("egfr");
    });

    if (kidneyAlert) {
      const isCritical = (kidneyAlert.severity || "").toLowerCase() === "critical";
      const statusKey = isCritical ? "red" : "amber";
      return {
        ...STATUS_THEME[statusKey],
        summary: kidneyAlert.message || "Renal clearance fluctuation detected in active clinical alerts.",
        indicators: [
          {
            label: "Renal Function Alert",
            value: kidneyAlert.alert_type || "Renal Alert",
            unit: "",
            timestamp: kidneyAlert.created_at ? new Date(kidneyAlert.created_at).toLocaleTimeString() : timestamp,
            status: statusKey,
            note: "Correlated from active clinical alerts feed",
          },
        ],
        findings: [],
        reports: [],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    const sys = vitals.systolic_bp;
    const dia = vitals.diastolic_bp;
    if (sys !== null && sys !== undefined && sys !== "" && !isNaN(Number(sys))) {
      const s = Number(sys);
      const d = dia ? Number(dia) : 80;
      let statusKey = "green";
      let summary = "Balanced renal hemodynamic perfusion and stable glomerular filtration pressure.";

      if (s >= 160 || s < 85) {
        statusKey = "red";
        summary = `High arterial perfusion pressure (${s}/${d} mmHg) places elevated filtration stress on renal glomeruli.`;
      } else if (s >= 135 || d >= 90) {
        statusKey = "amber";
        summary = `Borderline arterial blood pressure (${s}/${d} mmHg). Maintain optimal hydration and monitor renal markers.`;
      }

      return {
        ...STATUS_THEME[statusKey],
        summary,
        indicators: [
          {
            label: "Renal Perfusion (BP)",
            value: `${s}/${d}`,
            unit: "mmHg",
            timestamp,
            normalRange: "90/60 - 120/80 mmHg",
            status: statusKey,
            note: "Hemodynamic indicator of renal glomerular perfusion load",
          },
        ],
        findings: [],
        reports: [],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    return {
      ...STATUS_THEME.grey,
      summary: "No immediate telemetry measurements recorded for this cycle.",
      indicators: [],
      findings: [],
      reports: [],
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  // 1. BRAIN
  if (organId === "brain") {
    const brainAlert = alerts.find((a) => {
      const msg = (a.message || a.alert_type || "").toLowerCase();
      return msg.includes("brain") || msg.includes("cerebral") || msg.includes("neuro") || msg.includes("hypertensive");
    });

    if (brainAlert) {
      const isCritical = (brainAlert.severity || "").toLowerCase() === "critical";
      const statusKey = isCritical ? "red" : "amber";
      return {
        ...STATUS_THEME[statusKey],
        summary: brainAlert.message || "Cerebral perfusion variance detected in active clinical telemetry.",
        indicators: [
          {
            label: "Neurological Alert",
            value:
              brainAlert.alert_type && brainAlert.alert_type !== "PHYSIOLOGICAL_TELEMETRY"
                ? brainAlert.alert_type.replace(/_/g, " ")
                : "Active Cerebral Telemetry Alert",
            unit: "",
            timestamp: brainAlert.created_at ? new Date(brainAlert.created_at).toLocaleTimeString() : timestamp,
            status: statusKey,
            note: brainAlert.message || "Correlated from active clinical alerts feed",
          },
        ],
        findings: [],
        reports: [],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    const sys = vitals.systolic_bp;
    const dia = vitals.diastolic_bp;
    if (sys !== null && sys !== undefined && sys !== "" && !isNaN(Number(sys))) {
      const s = Number(sys);
      const d = dia ? Number(dia) : 80;
      let statusKey = "green";
      let summary = "Optimal cerebral perfusion and intracranial vascular hemodynamics.";

      if (s >= 160 || s < 85) {
        statusKey = "red";
        summary = `High systolic perfusion load (${s}/${d} mmHg) carries hypertensive cerebrovascular risks.`;
      } else if (s >= 135 || d >= 90) {
        statusKey = "amber";
        summary = `Borderline cerebral perfusion pressure (${s}/${d} mmHg). Monitor intracranial comfort.`;
      }

      return {
        ...STATUS_THEME[statusKey],
        summary,
        indicators: [
          {
            label: "Cerebral Perfusion (BP)",
            value: `${s}/${d}`,
            unit: "mmHg",
            timestamp,
            normalRange: "90/60 - 120/80 mmHg",
            status: statusKey,
            note: "Primary hemodynamic cerebral perfusion indicator",
          },
        ],
        findings: [],
        reports: [],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    return {
      ...STATUS_THEME.grey,
      summary: "No immediate telemetry measurements recorded for this cycle.",
      indicators: [],
      findings: [],
      reports: [],
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  // 2. PANCREAS
  if (organId === "pancreas") {
    const rawSugar = vitals.blood_sugar;
    if (rawSugar !== null && rawSugar !== undefined && rawSugar !== "" && !isNaN(Number(rawSugar))) {
      const sugar = Number(rawSugar);
      let statusKey = "green";
      let summary = "Optimal glycemic regulation. Blood sugar readings remain within safe target boundaries.";

      if (sugar >= 200 || sugar < 70) {
        statusKey = "red";
        summary = sugar >= 200
          ? `Acute hyperglycemia detected (${sugar} mg/dL). Immediate clinical review indicated.`
          : `Hypoglycemia detected (${sugar} mg/dL). Rapid glucose intake advised.`;
      } else if (sugar > 140 || sugar < 80) {
        statusKey = "amber";
        summary = `Borderline glycemic reading (${sugar} mg/dL). Monitor postprandial levels and hydration.`;
      }

      return {
        ...STATUS_THEME[statusKey],
        summary,
        indicators: [
          {
            label: "Blood Glucose",
            value: `${sugar}`,
            unit: "mg/dL",
            timestamp,
            normalRange: "70 - 140 mg/dL",
            status: statusKey,
            note: "Primary pancreatic endocrine proxy",
          },
        ],
        findings: [],
        reports: [],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    const glucoseAlert = alerts.find((a) => {
      const msg = (a.message || a.alert_type || "").toLowerCase();
      return msg.includes("glucose") || msg.includes("sugar") || msg.includes("pancreas") || msg.includes("diabetes") || msg.includes("glycemic");
    });

    if (glucoseAlert) {
      const isCritical = (glucoseAlert.severity || "").toLowerCase() === "critical";
      const statusKey = isCritical ? "red" : "amber";
      return {
        ...STATUS_THEME[statusKey],
        summary: glucoseAlert.message || "Active glycemic alert flagged in clinical records.",
        indicators: [
          {
            label: "Blood Glucose Alert",
            value: glucoseAlert.alert_type || "Critical",
            unit: "",
            timestamp: glucoseAlert.created_at ? new Date(glucoseAlert.created_at).toLocaleTimeString() : timestamp,
            status: statusKey,
            note: "Correlated from active clinical alerts feed",
          },
        ],
        findings: [],
        reports: [],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    return {
      ...STATUS_THEME.grey,
      summary: "No immediate telemetry measurements recorded for this cycle.",
      indicators: [],
      findings: [],
      reports: [],
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  // 3. THYROID
  if (organId === "thyroid") {
    const rawTsh = vitals.tsh;
    if (rawTsh !== null && rawTsh !== undefined && rawTsh !== "" && !isNaN(Number(rawTsh))) {
      const tsh = Number(rawTsh);
      let statusKey = "green";
      let summary = "Thyroid Stimulating Hormone (TSH) within euthyroid reference range (0.4 – 4.0 mIU/L).";

      if (tsh >= 10.0 || tsh <= 0.1) {
        statusKey = "red";
        summary = `Significant thyroid hormone deviation (TSH: ${tsh} mIU/L). Endocrinological consultation recommended.`;
      } else if (tsh > 4.0 || tsh < 0.4) {
        statusKey = "amber";
        summary = `Subclinical TSH variance (${tsh} mIU/L). Follow-up panel suggested.`;
      }

      return {
        ...STATUS_THEME[statusKey],
        summary,
        indicators: [
          {
            label: "Serum TSH",
            value: `${tsh}`,
            unit: "mIU/L",
            timestamp,
            normalRange: "0.4 - 4.0 mIU/L",
            status: statusKey,
            note: "Direct thyroid endocrine biomarker",
          },
        ],
        findings: [],
        reports: [],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    const rawHr = vitals.heart_rate;
    if (rawHr !== null && rawHr !== undefined && rawHr !== "" && !isNaN(Number(rawHr))) {
      const hr = Number(rawHr);
      let statusKey = "green";
      let summary = "Resting heart rate aligns with steady thyroid-regulated basal metabolic activity.";

      if (hr > 125 || hr < 45) {
        statusKey = "amber";
        summary = `Resting heart rate (${hr} BPM) may reflect metabolic or autonomic variance.`;
      }

      return {
        ...STATUS_THEME[statusKey],
        summary,
        indicators: [
          {
            label: "Resting Heart Rate",
            value: `${hr}`,
            unit: "BPM",
            timestamp,
            normalRange: "60 - 100 BPM",
            status: statusKey,
            note: "Metabolic rate hemodynamic proxy (TSH not directly logged)",
            isProxy: true,
          },
        ],
        findings: [],
        reports: [],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    const thyroidAlert = alerts.find((a) => {
      const msg = (a.message || a.alert_type || "").toLowerCase();
      return msg.includes("thyroid") || msg.includes("tsh") || msg.includes("goiter");
    });

    if (thyroidAlert) {
      const isCritical = (thyroidAlert.severity || "").toLowerCase() === "critical";
      const statusKey = isCritical ? "red" : "amber";
      return {
        ...STATUS_THEME[statusKey],
        summary: thyroidAlert.message || "Thyroid endocrine observation logged.",
        indicators: [],
        findings: [],
        reports: [],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    return {
      ...STATUS_THEME.grey,
      summary: "No immediate telemetry measurements recorded for this cycle.",
      indicators: [],
      findings: [],
      reports: [],
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  // 4. STOMACH
  if (organId === "stomach") {
    const giAlert = alerts.find((a) => {
      const msg = (a.message || a.alert_type || "").toLowerCase();
      return msg.includes("gastric") || msg.includes("stomach") || msg.includes("reflux") || msg.includes("ulcer");
    });

    if (giAlert) {
      const isCritical = (giAlert.severity || "").toLowerCase() === "critical";
      const statusKey = isCritical ? "red" : "amber";
      return {
        ...STATUS_THEME[statusKey],
        summary: giAlert.message || "Gastrointestinal tract observation logged in active alerts.",
        indicators: [
          {
            label: "Gastric Observation",
            value: giAlert.alert_type || "Symptom Alert",
            unit: "",
            timestamp: giAlert.created_at ? new Date(giAlert.created_at).toLocaleTimeString() : timestamp,
            status: statusKey,
            note: "Correlated from active clinical alerts feed",
          },
        ],
        findings: [],
        reports: [],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    const rawTemp = vitals.temperature;
    if (rawTemp !== null && rawTemp !== undefined && rawTemp !== "" && !isNaN(Number(rawTemp))) {
      const temp = Number(rawTemp);
      const cTemp = temp > 50 ? ((temp - 32) * 5) / 9 : temp; // normalize F to C
      let statusKey = "green";
      let summary = "Core gastric region temperature is within safe biological limits.";

      if (cTemp >= 38.5 || cTemp <= 35.0) {
        statusKey = "red";
        summary = `Core temperature deviation (${cTemp.toFixed(1)} °C) indicating potential systemic or enteric stress.`;
      } else if (cTemp >= 37.5 || cTemp <= 35.8) {
        statusKey = "amber";
        summary = `Mild temperature elevation (${cTemp.toFixed(1)} °C).`;
      }

      return {
        ...STATUS_THEME[statusKey],
        summary,
        indicators: [
          {
            label: "Core Body Temperature",
            value: `${cTemp.toFixed(1)}`,
            unit: "°C",
            timestamp,
            normalRange: "36.5 - 37.5 °C",
            status: statusKey,
            note: "Gastric core homeostasis indicator",
          },
        ],
        findings: [],
        reports: [],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    return {
      ...STATUS_THEME.grey,
      summary: "No immediate telemetry measurements recorded for this cycle.",
      indicators: [],
      findings: [],
      reports: [],
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  // 5. INTESTINES
  if (organId === "intestines") {
    const entericAlert = alerts.find((a) => {
      const msg = (a.message || a.alert_type || "").toLowerCase();
      return msg.includes("bowel") || msg.includes("intestine") || msg.includes("colon") || msg.includes("enteric") || msg.includes("motility");
    });

    if (entericAlert) {
      const isCritical = (entericAlert.severity || "").toLowerCase() === "critical";
      const statusKey = isCritical ? "red" : "amber";
      return {
        ...STATUS_THEME[statusKey],
        summary: entericAlert.message || "Enteric motility variance detected.",
        indicators: [
          {
            label: "Enteric Motility Alert",
            value: entericAlert.alert_type || "Enteric Alert",
            unit: "",
            timestamp: entericAlert.created_at ? new Date(entericAlert.created_at).toLocaleTimeString() : timestamp,
            status: statusKey,
            note: "Correlated from active clinical alerts feed",
          },
        ],
        findings: [],
        reports: [],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    const sys = vitals.systolic_bp;
    const dia = vitals.diastolic_bp;
    if (sys !== null && sys !== undefined && sys !== "" && !isNaN(Number(sys))) {
      const s = Number(sys);
      const d = dia ? Number(dia) : 80;
      let statusKey = "green";
      let summary = "Systemic and mesenteric blood perfusion are optimal for nutrient and fluid absorption.";

      if (s >= 160 || d >= 100 || s < 85) {
        statusKey = "amber";
        summary = `High or low arterial perfusion pressure (${s}/${d} mmHg) may impact mesenteric microvascular exchange.`;
      }

      return {
        ...STATUS_THEME[statusKey],
        summary,
        indicators: [
          {
            label: "Arterial Perfusion (BP)",
            value: `${s}/${d}`,
            unit: "mmHg",
            timestamp,
            normalRange: "90/60 - 120/80 mmHg",
            status: statusKey,
            note: "Mesenteric microvascular perfusion proxy",
            isProxy: true,
          },
        ],
        findings: [],
        reports: [],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    return {
      ...STATUS_THEME.grey,
      summary: "No immediate telemetry measurements recorded for this cycle.",
      indicators: [],
      findings: [],
      reports: [],
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  // Fallback for any other organ
  return {
    ...STATUS_THEME.grey,
    summary: "No immediate telemetry measurements recorded for this cycle.",
    indicators: [],
    findings: [],
    reports: [],
    disclaimer: "Related indicator, not a diagnosis.",
  };
}

export default getOrganStatus;
