/**
 * Organ Configurations for CareBridge Body Explorer (Phase 2 & Extensible).
 * 
 * Each organ configuration includes:
 * - id: unique string identifier
 * - name: human-readable name
 * - subtitle: anatomical & physiological subsystem
 * - system: registered system group ID ("internal-organs")
 * - description: 2-3 sentence patient-friendly clinical description
 * - whatItDoes: functional explanation of biological action
 * - dataKey: primary telemetry mapping key
 * - relatedIndicators: list of related telemetry or lab markers
 * - thresholds: reference bounds for status calculation
 * - defaultCamera: initial 3D position and zoom constraints
 */

export const ORGANS_CONFIG = {
  brain: {
    id: "brain",
    name: "Brain",
    subtitle: "Central Nervous System & Neural Perfusion",
    system: "internal-organs",
    color: "#38bdf8",
    description:
      "The brain is the command center of the nervous system, orchestrating sensory perception, motor control, cognitive functions, and vital autonomic rhythms. Continuous oxygenated blood perfusion is essential for neural vitality.",
    whatItDoes:
      "Processes systemic sensory inputs, regulates hemodynamic autonomic tone, coordinates endocrine signalling, and maintains cognitive neurotransmission.",
    dataKey: "blood_pressure",
    aiPromptSuggestion: "Explain my brain and nervous system status, cerebral perfusion markers, and neurological wellness.",
    relatedIndicators: [
      {
        key: "blood_pressure",
        label: "Arterial Cerebral Perfusion (BP)",
        unit: "mmHg",
        source: "telemetry",
        normalRange: "90/60 - 120/80 mmHg",
      },
    ],
    thresholds: {
      blood_pressure_sys: { criticalHigh: 160, criticalLow: 90, watchHigh: 135, watchLow: 95 },
    },
    defaultCamera: {
      position: [0, 0, 4.5],
      target: [0, 0, 0],
      minDistance: 2.2,
      maxDistance: 8.5,
    },
  },

  stomach: {
    id: "stomach",
    name: "Stomach",
    subtitle: "Upper Gastrointestinal Reservoir & Acid Digestion",
    system: "internal-organs",
    description:
      "The stomach breaks down food with gastric acids and enzymes before passing it to the small intestine. Its thick mucosal lining protects against acid, while smooth muscle contractions churn contents continuously.",
    whatItDoes:
      "Secretes digestive gastric juice (hydrochloric acid and pepsinogen), mechanically churns protein boluses into chyme, acts as an acidic microbial barrier, and regulates release into the duodenum.",
    dataKey: "stomach",
    aiPromptSuggestion: "Explain my stomach and upper gastrointestinal status, and what dietary habits support healthy gastric mucosal lining.",
    relatedIndicators: [
      {
        key: "temperature",
        label: "Gastric Core Temperature",
        unit: "°C",
        source: "telemetry",
        normalRange: "36.5 - 37.5 °C",
      },
      {
        key: "gi_symptoms",
        label: "Clinical Dyspepsia Screen",
        unit: "Index",
        source: "records",
        normalRange: "Negative",
      },
    ],
    thresholds: {
      temperature: { criticalHigh: 38.5, criticalLow: 35.0, watchHigh: 37.5, watchLow: 36.1 },
    },
    defaultCamera: {
      position: [0, 0.2, 4.5],
      target: [0, 0, 0],
      minDistance: 2.5,
      maxDistance: 9.0,
    },
  },

  pancreas: {
    id: "pancreas",
    name: "Pancreas",
    subtitle: "Endocrine Glycemic Regulation & Exocrine Digestion",
    system: "internal-organs",
    description:
      "The pancreas is a dual-function gland situated behind the stomach. It synthesizes insulin and glucagon in the Islets of Langerhans to balance blood sugar, and secretes essential enzymes directly into the duodenum for nutrient breakdown.",
    whatItDoes:
      "Synthesizes insulin to lower blood glucose and glucagon to elevate it, while its acinar cells produce alkaline pancreatic juice containing amylase, lipase, and proteases.",
    dataKey: "blood_sugar",
    aiPromptSuggestion: "Explain my Pancreas status, glycemic trends, and what dietary adjustments I should consider.",
    relatedIndicators: [
      {
        key: "blood_sugar",
        label: "Blood Glucose (Fasting / Random)",
        unit: "mg/dL",
        source: "telemetry",
        normalRange: "70 - 140 mg/dL",
      },
      {
        key: "hba1c",
        label: "Glycated Hemoglobin (HbA1c)",
        unit: "%",
        source: "records",
        normalRange: "< 5.7 %",
      },
    ],
    thresholds: {
      blood_sugar: {
        criticalHigh: 200,
        criticalLow: 70,
        watchHigh: 140,
        watchLow: 80,
      },
    },
    defaultCamera: {
      position: [0, 0.3, 4.8],
      target: [0, 0, 0],
      minDistance: 2.8,
      maxDistance: 9.5,
    },
  },

  thyroid: {
    id: "thyroid",
    name: "Thyroid",
    subtitle: "Endocrine Metabolic & Thermogenic Control",
    system: "internal-organs",
    description:
      "The thyroid is a butterfly-shaped endocrine gland located at the base of the neck, wrapping the front of the trachea. It secretes hormones that dictate how fast every cell in your body converts nutrients into energy.",
    whatItDoes:
      "Produces thyroxine (T4) and triiodothyronine (T3) to regulate basal metabolic rate, oxygen consumption, resting cardiac chronotropy, and cellular thermogenesis.",
    dataKey: "tsh",
    aiPromptSuggestion: "Explain my Thyroid status, resting metabolic markers, and how thyroid hormones influence my heart rate and energy levels.",
    relatedIndicators: [
      {
        key: "heart_rate",
        label: "Resting Heart Rate (Metabolic Proxy)",
        unit: "BPM",
        source: "telemetry",
        normalRange: "60 - 100 BPM",
      },
      {
        key: "tsh",
        label: "Serum Thyroid Stimulating Hormone (TSH)",
        unit: "mIU/L",
        source: "records",
        normalRange: "0.4 - 4.0 mIU/L",
      },
    ],
    thresholds: {
      heart_rate: {
        criticalHigh: 120,
        criticalLow: 50,
        watchHigh: 100,
        watchLow: 58,
      },
    },
    defaultCamera: {
      position: [0, 0, 4.2],
      target: [0, 0, 0],
      minDistance: 2.2,
      maxDistance: 8.5,
    },
  },

  intestines: {
    id: "intestines",
    name: "Intestines",
    subtitle: "Enteric Nutrient Absorption, Microbiome & Water Transport",
    system: "internal-organs",
    description:
      "The intestinal tract includes the long, coiled small intestine, which absorbs almost all vitamins, proteins, and minerals, and the framing large intestine, which reclaims water, compacts waste, and nurtures the gut microbiome.",
    whatItDoes:
      "Performs enzymatic breakdown of chyme, absorbs monosaccharides and fatty acids across intestinal villi, recovers electrolytes and water, and sustains gut-immune homeostasis.",
    dataKey: "intestines",
    aiPromptSuggestion: "Explain my Intestines status, digestive balance, and what hydration or fiber intake is optimal for my enteric motility.",
    relatedIndicators: [
      {
        key: "blood_pressure",
        label: "Mesenteric Perfusion (Arterial MAP)",
        unit: "mmHg",
        source: "telemetry",
        normalRange: "90/60 - 120/80 mmHg",
      },
      {
        key: "electrolyte_k",
        label: "Serum Potassium / Electrolytes",
        unit: "mmol/L",
        source: "records",
        normalRange: "3.5 - 5.0 mmol/L",
      },
    ],
    thresholds: {
      blood_pressure_sys: {
        criticalHigh: 160,
        criticalLow: 90,
        watchHigh: 135,
        watchLow: 95,
      },
    },
    defaultCamera: {
      position: [0, 0, 5.0],
      target: [0, 0, 0],
      minDistance: 2.8,
      maxDistance: 10.0,
    },
  },
};

/**
 * Extensible organ registration method for future phases.
 * @param {Object} organConfig
 */
export function registerOrgan(organConfig) {
  if (!organConfig || !organConfig.id) {
    console.error("Invalid organ config registration:", organConfig);
    return;
  }
  ORGANS_CONFIG[organConfig.id] = organConfig;
}

/**
 * Returns organ config by id.
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getOrganConfig(id) {
  return ORGANS_CONFIG[id];
}

export default ORGANS_CONFIG;
