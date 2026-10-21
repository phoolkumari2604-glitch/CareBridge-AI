"""
CareBridge AI - Clinical Reference Bounds & Severity Thresholds
Clinician-reviewed reference intervals for visceral organ telemetry and laboratory indicators.
"""

VALID_ORGAN_KEYS = {
    "kidneys",
    "brain",
    "stomach",
    "pancreas",
    "thyroid",
    "intestines",
    "lungs"
}

# Reference ranges for common physiological & laboratory indicators
# Each entry specifies unit, label, safeMin, safeMax, and thresholds for watch vs critical.
CLINICAL_INDICATORS_CONFIG = {
    "kidneys": {
        "creatinine": {
            "label": "Serum Creatinine",
            "unit": "mg/dL",
            "safeMin": 0.6,
            "safeMax": 1.2,
            "watchMin": 0.5,
            "watchMax": 1.5,
            "criticalHigh": 2.5,
            "criticalLow": 0.3,
            "normalRange": "0.6 – 1.2 mg/dL",
        },
        "egfr": {
            "label": "Estimated GFR (eGFR)",
            "unit": "mL/min/1.73m²",
            "safeMin": 60.0,
            "safeMax": 120.0,
            "watchMin": 45.0,
            "watchMax": 120.0,
            "criticalLow": 30.0,
            "normalRange": "60 – 120 mL/min/1.73m²",
        },
        "blood_pressure_systolic": {
            "label": "Renal Perfusion Pressure (Sys)",
            "unit": "mmHg",
            "safeMin": 90,
            "safeMax": 120,
            "watchMin": 85,
            "watchMax": 140,
            "criticalHigh": 180,
            "criticalLow": 75,
            "normalRange": "90 – 120 mmHg",
        }
    },
    "brain": {
        "cerebral_perfusion": {
            "label": "Cerebral Perfusion Pressure",
            "unit": "mmHg",
            "safeMin": 70,
            "safeMax": 90,
            "watchMin": 60,
            "watchMax": 100,
            "criticalHigh": 115,
            "criticalLow": 50,
            "normalRange": "70 – 90 mmHg",
        },
        "oxygenation_cerebral": {
            "label": "Transcranial Cerebral SpO₂",
            "unit": "%",
            "safeMin": 60,
            "safeMax": 80,
            "watchMin": 55,
            "watchMax": 85,
            "criticalLow": 48,
            "normalRange": "60 – 80 %",
        }
    },
    "stomach": {
        "gastric_motility": {
            "label": "Gastric Motility Rhythm",
            "unit": "cpm",
            "safeMin": 2.5,
            "safeMax": 3.5,
            "watchMin": 2.0,
            "watchMax": 4.0,
            "criticalHigh": 5.0,
            "criticalLow": 1.0,
            "normalRange": "2.5 – 3.5 cpm",
        },
        "temperature_proxy": {
            "label": "Core Epigastric Temperature Proxy",
            "unit": "°F",
            "safeMin": 97.5,
            "safeMax": 99.0,
            "watchMin": 96.5,
            "watchMax": 100.5,
            "criticalHigh": 102.5,
            "criticalLow": 95.0,
            "normalRange": "97.5 – 99.0 °F",
        }
    },
    "pancreas": {
        "blood_glucose": {
            "label": "Blood Glucose",
            "unit": "mg/dL",
            "safeMin": 70,
            "safeMax": 140,
            "watchMin": 65,
            "watchMax": 180,
            "criticalHigh": 250,
            "criticalLow": 54,
            "normalRange": "70 – 140 mg/dL",
        },
        "hba1c": {
            "label": "Glycated Hemoglobin (HbA1c)",
            "unit": "%",
            "safeMin": 4.0,
            "safeMax": 5.6,
            "watchMin": 4.0,
            "watchMax": 6.5,
            "criticalHigh": 9.0,
            "normalRange": "4.0 – 5.6 %",
        }
    },
    "thyroid": {
        "tsh": {
            "label": "Thyroid Stimulating Hormone (TSH)",
            "unit": "mIU/L",
            "safeMin": 0.4,
            "safeMax": 4.0,
            "watchMin": 0.3,
            "watchMax": 5.5,
            "criticalHigh": 10.0,
            "criticalLow": 0.1,
            "normalRange": "0.4 – 4.0 mIU/L",
        },
        "heart_rate": {
            "label": "Metabolic Heart Rate Response",
            "unit": "bpm",
            "safeMin": 60,
            "safeMax": 100,
            "watchMin": 50,
            "watchMax": 110,
            "criticalHigh": 140,
            "criticalLow": 45,
            "normalRange": "60 – 100 bpm",
        }
    },
    "intestines": {
        "blood_pressure": {
            "label": "Mesenteric Arterial Perfusion (BP)",
            "unit": "mmHg",
            "safeMin": 90,
            "safeMax": 120,
            "watchMin": 85,
            "watchMax": 140,
            "criticalHigh": 180,
            "criticalLow": 75,
            "normalRange": "90/60 – 120/80 mmHg",
        },
        "transit_rate": {
            "label": "Gastrointestinal Transit Window",
            "unit": "hrs",
            "safeMin": 24,
            "safeMax": 48,
            "watchMin": 18,
            "watchMax": 60,
            "criticalHigh": 72,
            "criticalLow": 12,
            "normalRange": "24 – 48 hrs",
        }
    },
    "lungs": {
        "spo2": {
            "label": "Oxygen Saturation (SpO₂)",
            "unit": "%",
            "safeMin": 95,
            "safeMax": 100,
            "watchMin": 92,
            "watchMax": 100,
            "criticalLow": 90,
            "normalRange": "95 – 100 %",
        },
        "respiratory_rate": {
            "label": "Respiratory Rate",
            "unit": "breaths/min",
            "safeMin": 12,
            "safeMax": 20,
            "watchMin": 10,
            "watchMax": 24,
            "criticalHigh": 30,
            "criticalLow": 8,
            "normalRange": "12 – 20 breaths/min",
        }
    }
}


def evaluate_telemetry_severity(indicator_key: str, organ_id: str, value: float | int | str, safe_min=None, safe_max=None) -> str:
    """
    Evaluates indicator severity against clinical reference thresholds.
    Returns: 'normal' | 'watch' | 'critical'
    """
    # Handle composite blood pressure strings like "185/115"
    if isinstance(value, str) and "/" in value:
        parts = value.split("/")
        try:
            sys_val = float(parts[0].strip())
            dia_val = float(parts[1].strip())
            if sys_val >= 180 or dia_val >= 110 or sys_val <= 75:
                return "critical"
            if sys_val > 120 or dia_val > 80 or sys_val < 90 or dia_val < 60:
                return "watch"
            return "normal"
        except (ValueError, IndexError):
            return "watch"

    try:
        num_val = float(value)
    except (TypeError, ValueError):
        return "normal"

    organ_cfg = CLINICAL_INDICATORS_CONFIG.get(organ_id, {})
    ind_cfg = organ_cfg.get(indicator_key, {})

    s_min = safe_min if safe_min is not None else ind_cfg.get("safeMin")
    s_max = safe_max if safe_max is not None else ind_cfg.get("safeMax")
    c_high = ind_cfg.get("criticalHigh")
    c_low = ind_cfg.get("criticalLow")

    # If critical bounds explicitly defined
    if c_high is not None and num_val >= c_high:
        return "critical"
    if c_low is not None and num_val <= c_low:
        return "critical"

    # If safe bounds are known
    if s_min is not None and s_max is not None:
        if num_val < s_min or num_val > s_max:
            # Check if far outside only when explicit critical bounds are not defined
            span = max(1.0, s_max - s_min)
            if c_high is None and num_val > s_max + 0.5 * span:
                return "critical"
            if c_low is None and num_val < s_min - 0.5 * span:
                return "critical"
            return "watch"
        return "normal"

    return "normal"
