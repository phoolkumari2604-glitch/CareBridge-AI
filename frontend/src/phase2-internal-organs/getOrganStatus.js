/**
 * Pure clinical status resolver for CareBridge Body Explorer.
 * 
 * Rules:
 * - Read-only from patient telemetry and alerts.
 * - Computes: green (normal), amber (watch), red (critical), grey (No data yet).
 * - Maps status to organ tint/emissive AND accessible text badge.
 * - Labeled: "Related indicator, not a diagnosis".
 * - Never modifies or mutates external alerts or telemetry.
 */

import { ORGANS_CONFIG } from "./organs.config.js";

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

/**
 * Pure function: Computes organ clinical status and indicators.
 * 
 * @param {string} organId - 'stomach' | 'pancreas' | 'thyroid' | 'intestines'
 * @param {Object} patientData - { vitals, alerts, healthProfile, healthRecords }
 * @returns {Object} { status, label, color, tintHex, badgeClass, summary, indicators, disclaimer }
 */
export function getOrganStatus(organId, patientData = {}) {
  const cfg = ORGANS_CONFIG[organId];
  if (!cfg) {
    return {
      ...STATUS_THEME.grey,
      summary: "Organ configuration not found.",
      indicators: [],
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  const vitals = patientData.vitals || {};
  const alerts = Array.isArray(patientData.alerts) ? patientData.alerts : [];
  const timestamp = vitals.recorded_at
    ? new Date(vitals.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Recent";

  // 0. BRAIN: maps to Arterial Perfusion Pressure & Neurological Indicators
  if (organId === "brain") {
    // Check neurological or hypertensive cerebral alerts
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
            value: brainAlert.alert_type || "Cerebral Perfusion",
            unit: "",
            timestamp: brainAlert.created_at ? new Date(brainAlert.created_at).toLocaleTimeString() : timestamp,
            status: statusKey,
            note: "Correlated from active clinical alerts feed",
          },
        ],
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
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    return {
      ...STATUS_THEME.grey,
      summary: "No direct intracranial perfusion markers logged. Neural pathways operating in steady homeostasis.",
      indicators: [],
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  // 1. PANCREAS: maps to Blood Glucose
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
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    // Check if any active alerts specifically flag glucose / diabetes / pancreas
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
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    return {
      ...STATUS_THEME.grey,
      summary: "No blood glucose telemetry logged for this interval. Insulin/pancreatic regulation status pending data.",
      indicators: [],
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  // 2. THYROID: checks TSH lab or metabolic heart rate proxy
  if (organId === "thyroid") {
    // Check if patient records or vitals contain TSH lab
    const rawTsh = vitals.tsh;
    if (rawTsh !== null && rawTsh !== undefined && rawTsh !== "" && !isNaN(Number(rawTsh))) {
      const tsh = Number(rawTsh);
      let statusKey = "green";
      let summary = "Serum TSH levels are within normal physiological reference range (0.4 - 4.0 mIU/L).";

      if (tsh > 10.0 || tsh < 0.1) {
        statusKey = "red";
        summary = `Significant thyroid hormone deviation (TSH: ${tsh} mIU/L). Endocrinological consultation recommended.`;
      } else if (tsh > 4.5 || tsh < 0.3) {
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
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    // Fallback: Check resting heart rate as metabolic proxy
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
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    return {
      ...STATUS_THEME.grey,
      summary: "No thyroid lab panel or metabolic markers logged. Gland status awaiting diagnostic record.",
      indicators: [],
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  // 3. STOMACH: checks GI-related alerts or core temperature
  if (organId === "stomach") {
    // Check if any active alerts specifically mention gastric / stomach / acid
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
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    // Secondary check: core temperature
    const rawTemp = vitals.temperature;
    if (rawTemp !== null && rawTemp !== undefined && rawTemp !== "" && !isNaN(Number(rawTemp))) {
      const temp = Number(rawTemp);
      const cTemp = temp > 50 ? (temp - 32) * 5 / 9 : temp; // normalize F to C
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
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    return {
      ...STATUS_THEME.grey,
      summary: "No direct gastric pathology or dyspeptic telemetry logged. Mucosal function stable.",
      indicators: [],
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  // 4. INTESTINES: checks enteric alerts or systemic perfusion (BP)
  if (organId === "intestines") {
    // Check if any active alerts mention bowel / intestines / colon / enteric
    const entericAlert = alerts.find((a) => {
      const msg = (a.message || a.alert_type || "").toLowerCase();
      return msg.includes("bowel") || msg.includes("intestine") || msg.includes("colon") || msg.includes("enteric");
    });

    if (entericAlert) {
      const isCritical = (entericAlert.severity || "").toLowerCase() === "critical";
      const statusKey = isCritical ? "red" : "amber";
      return {
        ...STATUS_THEME[statusKey],
        summary: entericAlert.message || "Enteric tract indicator detected in active alerts.",
        indicators: [
          {
            label: "Enteric Clinical Alert",
            value: entericAlert.alert_type || "Active Alert",
            unit: "",
            timestamp: entericAlert.created_at ? new Date(entericAlert.created_at).toLocaleTimeString() : timestamp,
            status: statusKey,
            note: "Correlated from active clinical alerts feed",
          },
        ],
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    // Secondary check: Mesenteric arterial perfusion via systolic/diastolic BP
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
        disclaimer: "Related indicator, not a diagnosis.",
      };
    }

    return {
      ...STATUS_THEME.grey,
      summary: "No enteric motility or direct colon pathology logged. Intestinal transport operating in steady state.",
      indicators: [],
      disclaimer: "Related indicator, not a diagnosis.",
    };
  }

  // Fallback for any unknown organ
  return {
    ...STATUS_THEME.grey,
    summary: "No clinical telemetry recorded for this organ.",
    indicators: [],
    disclaimer: "Related indicator, not a diagnosis.",
  };
}

export default getOrganStatus;
