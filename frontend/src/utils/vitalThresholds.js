/**
 * Vital Signs Clinical Thresholds and Diagnostic Rules
 * Standardized medical reference ranges for adult patients
 */

export const VITAL_THRESHOLDS = {
  spo2: {
    key: "spo2",
    label: "SpO₂",
    fullName: "Blood Oxygen Saturation",
    unit: "%",
    normalRange: "95–100%",
    normalMin: 95,
    normalMax: 100,
    evaluate: (val) => {
      if (val == null || isNaN(val)) return null;
      const num = Number(val);
      if (num < 90) {
        return {
          severity: "CRITICAL",
          status: "Critical Hypoxia",
          message: "SpO₂ " + num + "% (normal 95–100%) – Critical Hypoxia",
          urgency: "Immediate supplemental O₂ & airway assessment required",
        };
      }
      if (num < 95) {
        return {
          severity: "WARNING",
          status: "Mild Hypoxemia",
          message: "SpO₂ " + num + "% (normal 95–100%) – Mild Hypoxemia",
          urgency: "Monitor respiratory effort and oxygen trend",
        };
      }
      return { severity: "NORMAL", status: "Optimal", message: "SpO₂ " + num + "% – Normal" };
    },
  },

  heart_rate: {
    key: "heart_rate",
    label: "Heart Rate",
    fullName: "Resting Heart Rate",
    unit: "bpm",
    normalRange: "60–100 bpm",
    normalMin: 60,
    normalMax: 100,
    evaluate: (val) => {
      if (val == null || isNaN(val)) return null;
      const num = Number(val);
      if (num > 130) {
        return {
          severity: "CRITICAL",
          status: "Severe Tachycardia",
          message: "Heart rate " + num + " bpm (normal 60–100) – Severe Tachycardia",
          urgency: "Evaluate for arrhythmia, shock, or severe sepsis",
        };
      }
      if (num > 100) {
        return {
          severity: "WARNING",
          status: "Tachycardia",
          message: "Heart rate " + num + " bpm (normal 60–100) – High",
          urgency: "Check hydration, fever, pain, or anxiety",
        };
      }
      if (num < 50) {
        return {
          severity: "CRITICAL",
          status: "Severe Bradycardia",
          message: "Heart rate " + num + " bpm (normal 60–100) – Severe Bradycardia",
          urgency: "Assess perfusion, AV block, and medication toxicity",
        };
      }
      if (num < 60) {
        return {
          severity: "WARNING",
          status: "Bradycardia",
          message: "Heart rate " + num + " bpm (normal 60–100) – Low",
          urgency: "Monitor resting hemodynamics",
        };
      }
      return { severity: "NORMAL", status: "Normal", message: "Heart rate " + num + " bpm – Normal" };
    },
  },

  systolic_bp: {
    key: "systolic_bp",
    label: "Systolic BP",
    fullName: "Systolic Blood Pressure",
    unit: "mmHg",
    normalRange: "90–120 mmHg",
    normalMin: 90,
    normalMax: 120,
    evaluate: (val, diastolicVal) => {
      if (val == null || isNaN(val)) return null;
      const sys = Number(val);
      const dia = diastolicVal != null && !isNaN(diastolicVal) ? Number(diastolicVal) : null;
      const bpStr = dia != null ? (sys + "/" + dia) : ("" + sys);

      if (sys >= 180 || (dia != null && dia >= 120)) {
        return {
          severity: "CRITICAL",
          status: "Stage 2 Hypertensive Crisis",
          message: "BP " + bpStr + " mmHg (normal 120/80) – Stage 2 Crisis",
          urgency: "Stat antihypertensive management; assess end-organ damage",
        };
      }
      if (sys >= 140 || (dia != null && dia >= 90)) {
        return {
          severity: "WARNING",
          status: "Hypertension",
          message: "BP " + bpStr + " mmHg (normal 120/80) – High",
          urgency: "Recheck manual cuff; review medication adherence",
        };
      }
      if (sys < 90 || (dia != null && dia < 60)) {
        return {
          severity: "CRITICAL",
          status: "Hypotension",
          message: "BP " + bpStr + " mmHg (normal 120/80) – Low / Hypotension",
          urgency: "Evaluate volume status, sepsis, or vasovagal episode",
        };
      }
      return { severity: "NORMAL", status: "Normotensive", message: "BP " + bpStr + " mmHg – Normal" };
    },
  },

  temperature: {
    key: "temperature",
    label: "Temperature",
    fullName: "Body Temperature",
    unit: "°C",
    normalRange: "36.5–37.5 °C (97.7–99.5 °F)",
    evaluate: (val) => {
      if (val == null || isNaN(val)) return null;
      let num = Number(val);
      let isFahrenheit = false;
      if (num > 50) {
        isFahrenheit = true;
        num = Number((((num - 32) * 5) / 9).toFixed(1));
      }

      if (num >= 39.5) {
        return {
          severity: "CRITICAL",
          status: "High Fever / Pyrexia",
          message: "Temp " + num + " °C" + (isFahrenheit ? (" (" + val + " °F)") : "") + " – High Fever",
          urgency: "Initiate antipyretics, infectious workup, blood cultures",
        };
      }
      if (num >= 38.0) {
        return {
          severity: "WARNING",
          status: "Fever",
          message: "Temp " + num + " °C" + (isFahrenheit ? (" (" + val + " °F)") : "") + " – Elevated Temp",
          urgency: "Monitor for systemic infection",
        };
      }
      if (num < 35.5) {
        return {
          severity: "CRITICAL",
          status: "Hypothermia",
          message: "Temp " + num + " °C" + (isFahrenheit ? (" (" + val + " °F)") : "") + " – Hypothermia",
          urgency: "Active warming measures indicated",
        };
      }
      return { severity: "NORMAL", status: "Normothermic", message: "Temp " + num + " °C – Normal" };
    },
  },

  blood_sugar: {
    key: "blood_sugar",
    label: "Blood Sugar",
    fullName: "Blood Glucose",
    unit: "mg/dL",
    normalRange: "70–140 mg/dL",
    normalMin: 70,
    normalMax: 140,
    evaluate: (val) => {
      if (val == null || isNaN(val)) return null;
      const num = Number(val);
      if (num < 54) {
        return {
          severity: "CRITICAL",
          status: "Severe Hypoglycemia",
          message: "Blood sugar " + num + " mg/dL (normal 70–140) – Severe Low",
          urgency: "Stat oral glucose / IV D50W / glucagon administration",
        };
      }
      if (num < 70) {
        return {
          severity: "WARNING",
          status: "Hypoglycemia",
          message: "Blood sugar " + num + " mg/dL (normal 70–140) – Low",
          urgency: "Provide fast-acting carbohydrate snack",
        };
      }
      if (num >= 250) {
        return {
          severity: "CRITICAL",
          status: "Severe Hyperglycemia",
          message: "Blood sugar " + num + " mg/dL (normal 70–140) – Critical High",
          urgency: "Check ketones; assess for DKA or HHS",
        };
      }
      if (num > 180) {
        return {
          severity: "WARNING",
          status: "Hyperglycemia",
          message: "Blood sugar " + num + " mg/dL (normal 70–140) – Elevated",
          urgency: "Review insulin/hypoglycemic regimen and dietary intake",
        };
      }
      return { severity: "NORMAL", status: "Euglycemic", message: "Blood sugar " + num + " mg/dL – Normal" };
    },
  },
};

export function formatRelativeTime(dateString) {
  if (!dateString) return "Recently";
  const now = new Date();
  const past = new Date(dateString);
  const diffSec = Math.floor((now - past) / 1000);

  if (isNaN(diffSec) || diffSec < 0) return "Recently";
  if (diffSec < 45) return "Just now";
  if (diffSec < 90) return "1 min ago";
  if (diffSec < 3600) return Math.floor(diffSec / 60) + " min ago";
  if (diffSec < 7200) return "1 hour ago";
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + " hours ago";
  return Math.floor(diffSec / 86400) + " days ago";
}

export function computeTrendIndicator(currentVal, previousVal) {
  if (currentVal == null || previousVal == null) return null;
  const c = Number(currentVal);
  const p = Number(previousVal);
  if (isNaN(c) || isNaN(p) || c === p) return "stable";
  return c > p ? "rising" : "falling";
}

export function extractAbnormalVitalChips(currentVital = {}, previousVital = null) {
  const chips = [];
  if (!currentVital) return chips;

  const recordedAt = currentVital.recorded_at || currentVital.created_at;
  const timeAgo = formatRelativeTime(recordedAt);

  if (currentVital.spo2 != null) {
    const evalResult = VITAL_THRESHOLDS.spo2.evaluate(currentVital.spo2);
    if (evalResult && evalResult.severity !== "NORMAL") {
      const trend = computeTrendIndicator(currentVital.spo2, previousVital?.spo2);
      chips.push({
        id: "spo2",
        vital: "SpO₂",
        value: currentVital.spo2 + "%",
        normalRange: "95–100%",
        severity: evalResult.severity,
        status: evalResult.status,
        timeAgo: timeAgo,
        trend: trend,
        urgency: evalResult.urgency,
      });
    }
  }

  if (currentVital.heart_rate != null) {
    const evalResult = VITAL_THRESHOLDS.heart_rate.evaluate(currentVital.heart_rate);
    if (evalResult && evalResult.severity !== "NORMAL") {
      const trend = computeTrendIndicator(currentVital.heart_rate, previousVital?.heart_rate);
      chips.push({
        id: "heart_rate",
        vital: "Heart rate",
        value: currentVital.heart_rate + " bpm",
        normalRange: "60–100 bpm",
        severity: evalResult.severity,
        status: evalResult.status,
        timeAgo: timeAgo,
        trend: trend,
        urgency: evalResult.urgency,
      });
    }
  }

  if (currentVital.systolic_bp != null) {
    const evalResult = VITAL_THRESHOLDS.systolic_bp.evaluate(
      currentVital.systolic_bp,
      currentVital.diastolic_bp
    );
    if (evalResult && evalResult.severity !== "NORMAL") {
      const trend = computeTrendIndicator(currentVital.systolic_bp, previousVital?.systolic_bp);
      const diaStr = currentVital.diastolic_bp ? ("/" + currentVital.diastolic_bp) : "";
      chips.push({
        id: "bp",
        vital: "BP",
        value: currentVital.systolic_bp + diaStr + " mmHg",
        normalRange: "120/80 mmHg",
        severity: evalResult.severity,
        status: evalResult.status,
        timeAgo: timeAgo,
        trend: trend,
        urgency: evalResult.urgency,
      });
    }
  }

  if (currentVital.temperature != null) {
    const evalResult = VITAL_THRESHOLDS.temperature.evaluate(currentVital.temperature);
    if (evalResult && evalResult.severity !== "NORMAL") {
      const trend = computeTrendIndicator(currentVital.temperature, previousVital?.temperature);
      chips.push({
        id: "temperature",
        vital: "Temp",
        value: currentVital.temperature + " °C",
        normalRange: "36.5–37.5 °C",
        severity: evalResult.severity,
        status: evalResult.status,
        timeAgo: timeAgo,
        trend: trend,
        urgency: evalResult.urgency,
      });
    }
  }

  if (currentVital.blood_sugar != null) {
    const evalResult = VITAL_THRESHOLDS.blood_sugar.evaluate(currentVital.blood_sugar);
    if (evalResult && evalResult.severity !== "NORMAL") {
      const trend = computeTrendIndicator(currentVital.blood_sugar, previousVital?.blood_sugar);
      chips.push({
        id: "blood_sugar",
        vital: "Blood sugar",
        value: currentVital.blood_sugar + " mg/dL",
        normalRange: "70–140 mg/dL",
        severity: evalResult.severity,
        status: evalResult.status,
        timeAgo: timeAgo,
        trend: trend,
        urgency: evalResult.urgency,
      });
    }
  }

  return chips;
}
