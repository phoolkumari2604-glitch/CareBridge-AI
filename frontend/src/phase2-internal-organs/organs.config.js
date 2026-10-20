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
  lungs: {
    id: "lungs",
    name: "Lungs",
    subtitle: "Respiratory Vitality & Gas Exchange",
    system: "internal-organs",
    color: "#38bdf8",
    imageSrc: "/assets/organs/lungs-realistic.png",
    status: "watch",
    breathingRate: 16,
    painPoints: [
      {
        id: "l1",
        x: 27,
        y: 38,
        title: "Right Upper Lobe Finding",
        severity: "watch",
        note: "Apical bronchovesicular air entry attenuation and mild mucosal congestion on spirometric correlation.",
      },
      {
        id: "l2",
        x: 28,
        y: 72,
        title: "Right Lower Lobe Finding",
        severity: "watch",
        note: "Basilar breath sound coarsening without consolidation or pleural effusion on physical auscultation.",
      },
      {
        id: "l3",
        x: 72,
        y: 72,
        title: "Left Lower Lobe Finding",
        severity: "normal",
        note: "Clear vesicular breath sounds throughout left lower lobe; normal diaphragmatic excursion.",
      },
      {
        id: "l4",
        x: 50,
        y: 52,
        title: "Bronchial Bifurcation Finding",
        severity: "watch",
        note: "Transient bronchial airway resistance variation during peak inspiration at tracheal bifurcation.",
      },
    ],
    description:
      "The lungs facilitate vital respiratory gas exchange, extracting ambient oxygen into the arterial circulation while clearing metabolic carbon dioxide. Specialized alveoli maintain elastic recoil and surfactant stability.",
    whatItDoes:
      "Oxygenates hemoglobin through alveolar-capillary diffusion, exhales carbon dioxide, regulates acid-base blood pH balance, and provides physical antimicrobial filtration.",
    dataKey: "spo2",
    aiPromptSuggestion: "Explain my Lungs status, respiratory rate patterns, and oxygenation efficiency.",
    relatedIndicators: [
      {
        key: "spo2",
        label: "Oxygen Saturation (SpO₂)",
        unit: "%",
        source: "telemetry",
        normalRange: "95 - 100 %",
      },
      {
        key: "respiratory_rate",
        label: "Respiratory Rate",
        unit: "breaths/min",
        source: "telemetry",
        normalRange: "12 - 20 breaths/min",
      },
    ],
    thresholds: {
      spo2: { criticalHigh: 100, criticalLow: 90, watchHigh: 99, watchLow: 94 },
    },
    defaultCamera: {
      position: [0, 0, 4.5],
      target: [0, 0, 0],
      minDistance: 2.2,
      maxDistance: 8.5,
    },
  },

  kidneys: {
    id: "kidneys",
    name: "Kidneys",
    subtitle: "Renal Filtration, Fluid Balance & Osmoregulation",
    system: "internal-organs",
    color: "#f87171",
    imageSrc: "/assets/organs/kidney-cross-section.png",
    painPoints: [
      {
        id: "k1",
        x: 35,
        y: 50,
        title: "Mild Cortical Thinning",
        severity: "watch",
        note: "Early bilateral cortical echogenicity and cortical thickness narrowing on renal ultrasound.",
      },
      {
        id: "k2",
        x: 62,
        y: 42,
        title: "Elevated Resistance Index",
        severity: "critical",
        note: "Renal interlobar arterial Doppler resistance index is 0.72, signaling vascular stiffness.",
      },
    ],
    description:
      "The kidneys filter waste products, toxins, and excess water from circulating blood into urine. They balance blood electrolytes, maintain acid-base homeostasis, and secrete hormones controlling arterial blood pressure and erythropoiesis.",
    whatItDoes:
      "Performs nephron ultrafiltration, clears urea and creatinine, regulates blood volume via the renin-angiotensin-aldosterone axis, and produces erythropoietin.",
    dataKey: "creatinine",
    aiPromptSuggestion: "Explain my Kidneys status, renal filtration load, and optimal hydration and electrolyte management.",
    relatedIndicators: [
      {
        key: "creatinine",
        label: "Serum Creatinine / eGFR",
        unit: "mg/dL",
        source: "records",
        normalRange: "0.7 - 1.3 mg/dL",
      },
      {
        key: "blood_pressure",
        label: "Renal Perfusion Pressure (MAP)",
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

  brain: {
    id: "brain",
    name: "Brain",
    subtitle: "Central Nervous System & Neural Perfusion",
    system: "internal-organs",
    color: "#ef4444",
    status: "critical",
    imageSrc: "/assets/organs/brain-realistic.png",
    painPoints: [
      {
        id: "b1",
        x: 22,
        y: 42,
        title: "Frontal Lobe Finding",
        severity: "critical",
        note: "Frontal cortical perfusion pressure variance correlated with sustained systemic systolic hypertension load.",
      },
      {
        id: "b2",
        x: 60,
        y: 22,
        title: "Parietal Lobe (Top) Finding",
        severity: "critical",
        note: "Superior parietal microvascular resistance index elevation signaling cerebral auto-regulation challenge.",
      },
      {
        id: "b3",
        x: 34,
        y: 63,
        title: "Temporal Lobe Finding",
        severity: "watch",
        note: "Mild temporal-insular arterial pulsation variance documented during peak hemodynamic intervals.",
      },
      {
        id: "b4",
        x: 72,
        y: 68,
        title: "Cerebellum Finding",
        severity: "watch",
        note: "Vertebrobasilar posterior circulation flow symmetry maintained; minor muscular tension reflex noted.",
      },
    ],
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
    imageSrc: "/assets/organs/stomach.jpg",
    painPoints: [
      {
        id: "s1",
        x: 42,
        y: 52,
        title: "Antral Erythema",
        severity: "watch",
        note: "Focal mucosal erythema in gastric antrum without active hemorrhage or ulceration.",
      },
      {
        id: "s2",
        x: 58,
        y: 38,
        title: "Fundic Irritation",
        severity: "normal",
        note: "Mild mucosal fold prominence in fundus, consistent with acid reflux response.",
      },
    ],
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
    color: "#ef4444",
    status: "critical",
    imageSrc: "/assets/organs/pancreas-realistic.png",
    painPoints: [
      {
        id: "p1",
        x: 50,
        y: 40,
        title: "Pancreatic Body Finding",
        severity: "critical",
        note: "Focal acute inflammatory edema and tissue hyperemia across the pancreatic body with elevated glycemic stress response.",
      },
      {
        id: "p2",
        x: 30,
        y: 52,
        title: "Pancreatic Head Finding",
        severity: "watch",
        note: "Mild parenchymal prominent contour adjacent to the medial duodenal sweep without ductal dilatation.",
      },
      {
        id: "p3",
        x: 84,
        y: 38,
        title: "Pancreatic Tail Finding",
        severity: "watch",
        note: "Parenchymal attenuation in the distal tail with preserved peripancreatic fat planes.",
      },
    ],
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
    color: "#f59e0b",
    imageSrc: "/assets/organs/thyroid-realistic.png",
    painPoints: [
      {
        id: "t1",
        x: 31,
        y: 52,
        title: "Left Lobe Finding",
        severity: "watch",
        note: "1.1 cm well-defined hypoechoic nodule in the left thyroid lobe. Benign sonographic architecture with peripheral vascularity and regular margins.",
      },
      {
        id: "t2",
        x: 69,
        y: 52,
        title: "Right Lobe Finding",
        severity: "watch",
        note: "0.8 cm well-circumscribed benign colloid nodule with internal comet-tail acoustic artifacts and no microcalcifications.",
      },
      {
        id: "t3",
        x: 50,
        y: 62,
        title: "Isthmus Bridge Finding",
        severity: "watch",
        note: "Mild diffuse echotexture coarsening across the central thyroid isthmus bridge, characteristic of autoimmune thyroiditis in early evolution.",
      },
    ],
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
    color: "#f59e0b",
    status: "watch",
    imageSrc: "/assets/organs/intestines-realistic.png",
    painPoints: [
      {
        id: "i1",
        x: 50,
        y: 32,
        title: "Upper small intestine finding",
        severity: "watch",
        note: "Transient mucosal irritation and rapid peristaltic transit observed along proximal jejunal loops.",
      },
      {
        id: "i2",
        x: 55,
        y: 50,
        title: "Middle small intestine finding",
        severity: "watch",
        note: "Mild gaseous distension and segmental hyper-motility along mid-enteric coils.",
      },
      {
        id: "i3",
        x: 45,
        y: 68,
        title: "Lower small intestine finding",
        severity: "watch",
        note: "Hyperactive ileocecal junctional tone with intermittent focal cramping response.",
      },
      {
        id: "i4",
        x: 60,
        y: 84,
        title: "Large intestine finding",
        severity: "watch",
        note: "Spasmodic segmental contraction wave in descending colon with localized hypersensitivity.",
      },
    ],
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
