// Indian Brand to Generic mapping, chronic conditions, and label dosing references

export const BRAND_TO_GENERIC_MAP = [
  { brand: "Dolo 650", generic: "Paracetamol", class: "Analgesic / Antipyretic", defaultStrength: "650mg" },
  { brand: "Crocin 500 / Advance", generic: "Paracetamol", class: "Analgesic / Antipyretic", defaultStrength: "500mg" },
  { brand: "Calpol", generic: "Paracetamol", class: "Analgesic / Antipyretic", defaultStrength: "250mg / 500mg" },
  { brand: "Brufen", generic: "Ibuprofen", class: "NSAID", defaultStrength: "400mg" },
  { brand: "Combiflam", generic: "Ibuprofen + Paracetamol", class: "NSAID Combination", defaultStrength: "400mg + 325mg" },
  { brand: "Disprin", generic: "Aspirin", class: "NSAID / Antiplatelet", defaultStrength: "350mg" },
  { brand: "Ecosprin", generic: "Aspirin", class: "Antiplatelet", defaultStrength: "75mg / 150mg" },
  { brand: "Allegra", generic: "Fexofenadine", class: "Antihistamine (2nd Gen)", defaultStrength: "120mg / 180mg" },
  { brand: "Cetzine / Cetcip", generic: "Cetirizine", class: "Antihistamine (2nd Gen)", defaultStrength: "10mg" },
  { brand: "Avil", generic: "Pheniramine", class: "Antihistamine (1st Gen)", defaultStrength: "25mg" },
  { brand: "Gelusil", generic: "Aluminium Hydroxide + Magnesium Hydroxide + Dimethicone", class: "Antacid", defaultStrength: "Liquid / Chewable" },
  { brand: "Digene", generic: "Magnesium Hydroxide + Aluminium Hydroxide + Simethicone", class: "Antacid", defaultStrength: "Tablet / Syrup" },
  { brand: "Eno", generic: "Sodium Bicarbonate + Citric Acid", class: "Antacid Sachet", defaultStrength: "5g Sachet" },
  { brand: "Pan 40 / Pantocid", generic: "Pantoprazole", class: "Proton Pump Inhibitor (PPI)", defaultStrength: "40mg" },
  { brand: "Omez", generic: "Omeprazole", class: "Proton Pump Inhibitor (PPI)", defaultStrength: "20mg" },
  { brand: "Rantac / Aciloc", generic: "Ranitidine", class: "H2 Blocker", defaultStrength: "150mg" },
  { brand: "Glycomet", generic: "Metformin", class: "Antidiabetic (Biguanide)", defaultStrength: "500mg" },
  { brand: "Telma / Telmikind", generic: "Telmisartan", class: "Antihypertensive (ARB)", defaultStrength: "40mg" },
  { brand: "Amlong / Stamlo", generic: "Amlodipine", class: "Antihypertensive (CCB)", defaultStrength: "5mg" },
  { brand: "Augmentin", generic: "Amoxicillin + Clavulanic Acid", class: "Antibiotic (Prescription)", defaultStrength: "625mg" },
  { brand: "Azithral", generic: "Azithromycin", class: "Antibiotic (Prescription)", defaultStrength: "500mg" },
  { brand: "Voveran", generic: "Diclofenac", class: "NSAID", defaultStrength: "50mg" },
  { brand: "Meftal-Spas", generic: "Mefenamic Acid + Dicyclomine", class: "Antispasmodic + NSAID", defaultStrength: "250mg + 10mg" },
  { brand: "Electral / ORS", generic: "Oral Rehydration Salts (WHO formula)", class: "Electrolyte Replenisher", defaultStrength: "WHO ORS Pack" },
  { brand: "Benadryl", generic: "Diphenhydramine", class: "Antitussive / Antihistamine", defaultStrength: "Syrup" },
  { brand: "Ascoril-D", generic: "Dextromethorphan + Phenylephrine + Chlorpheniramine", class: "Cough Formula", defaultStrength: "Syrup" },
  { brand: "Otrivin", generic: "Xylometazoline", class: "Nasal Decongestant", defaultStrength: "0.1% Nasal Drops" },
  { brand: "Thyronorm / Eltroxin", generic: "Levothyroxine", class: "Thyroid Hormone", defaultStrength: "50mcg / 100mcg" },
  { brand: "Deriphyllin", generic: "Theophylline + Etophylline", class: "Bronchodilator", defaultStrength: "150mg / 300mg" },
  { brand: "Betadine", generic: "Povidone Iodine", class: "Topical Antiseptic", defaultStrength: "5% / 10% Ointment" }
];

export const CHRONIC_CONDITIONS_LIST = [
  { id: "diabetes", label: "Diabetes Mellitus", caution: "Avoid sugar-based cough syrups; monitor kidney status." },
  { id: "hypertension", label: "Hypertension (High Blood Pressure)", caution: "Avoid systemic decongestants (pseudoephedrine/phenylephrine); avoid routine NSAIDs." },
  { id: "heart_disease", label: "Heart Disease / CAD / Heart Failure", caution: "NSAIDs contraindicated; may precipitate fluid retention or ischemia." },
  { id: "asthma", label: "Asthma / Reactive Airway Disease", caution: "Aspirin/NSAID-exacerbated respiratory disease (AERD) risk." },
  { id: "thyroid", label: "Thyroid Disorder (Hypo / Hyperthyroidism)", caution: "Ensure interactions with levothyroxine (antacids/calcium separate by 4 hours)." },
  { id: "g6pd_deficiency", label: "G6PD Deficiency", caution: "Avoid oxidant drugs (aspirin, dapsone, rasburicase, high-dose paracetamol)." },
  { id: "peptic_ulcer", label: "Peptic Ulcer / Acid Peptic Disease", caution: "Strictly avoid NSAIDs (ibuprofen, aspirin, diclofenac) to prevent gastrointestinal bleed." },
  { id: "kidney_disease", label: "Chronic Kidney Disease (CKD)", caution: "Avoid NSAIDs; reduced renal excretion for many compounds." },
  { id: "liver_disease", label: "Liver Disease / Cirrhosis", caution: "Paracetamol max limit strictly <2000mg/day or avoid; avoid hepatotoxic agents." },
  { id: "epilepsy", label: "Epilepsy / Seizure Disorder", caution: "Avoid first-generation antihistamines or decongestants that lower seizure threshold." },
  { id: "glaucoma", label: "Glaucoma (Angle-Closure)", caution: "Avoid anticholinergic antihistamines and decongestants that increase intraocular pressure." }
];

export const ALLERGIES_PRESETS = [
  "Paracetamol / Acetaminophen",
  "Ibuprofen",
  "Aspirin",
  "Diclofenac",
  "Sulfa Drugs / Sulfonamides",
  "Penicillin / Amoxicillin",
  "Cephalosporins",
  "Codeine / Opioids",
  "Latex",
  "Peanuts / Food Additives"
];

export const PRESET_SYMPTOMS_LIST = [
  { id: "fever", label: "Fever / Pyrexia", category: "General", redFlagCandidate: false },
  { id: "headache", label: "Headache (Mild/Moderate)", category: "Head & Neck", redFlagCandidate: false },
  { id: "body_ache", label: "Body Aches / Muscle Pain", category: "General", redFlagCandidate: false },
  { id: "runny_nose", label: "Runny Nose / Nasal Drip", category: "Respiratory", redFlagCandidate: false },
  { id: "sneezing", label: "Frequent Sneezing / Allergic Rhinitis", category: "Respiratory", redFlagCandidate: false },
  { id: "nasal_congestion", label: "Blocked Nose / Congestion", category: "Respiratory", redFlagCandidate: false },
  { id: "dry_cough", label: "Dry Hacking Cough", category: "Respiratory", redFlagCandidate: false },
  { id: "wet_cough", label: "Wet / Productive Phlegm Cough", category: "Respiratory", redFlagCandidate: false },
  { id: "sore_throat", label: "Sore Throat / Pharyngeal Irritation", category: "Head & Neck", redFlagCandidate: false },
  { id: "heartburn", label: "Heartburn / Acidity / Dyspepsia", category: "Digestive", redFlagCandidate: false },
  { id: "loose_motion", label: "Loose Stools / Mild Diarrhea", category: "Digestive", redFlagCandidate: false },
  { id: "minor_cut", label: "Minor Cut / Scratch / Abrasion", category: "Skin", redFlagCandidate: false },
  { id: "skin_rash_itchy", label: "Itchy Skin / Minor Allergic Rash", category: "Skin", redFlagCandidate: false },
  // Red flag symptoms selectable in list
  { id: "chest_pain", label: "Chest Pain or Pressure", category: "Emergency", redFlagCandidate: true },
  { id: "breathing_difficulty", label: "Severe Shortness of Breath / Breathing Difficulty", category: "Emergency", redFlagCandidate: true },
  { id: "severe_bleeding", label: "Severe Bleeding / Vomiting Blood", category: "Emergency", redFlagCandidate: true },
  { id: "confusion_fainting", label: "Confusion / Altered Mental State / Fainting", category: "Emergency", redFlagCandidate: true },
];

/**
 * Fuzzy search helper for brand and generic names
 */
export function searchMedicationDirectory(query) {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  
  return BRAND_TO_GENERIC_MAP.filter((item) => {
    return (
      item.brand.toLowerCase().includes(q) ||
      item.generic.toLowerCase().includes(q) ||
      item.class.toLowerCase().includes(q)
    );
  }).slice(0, 8);
}

/**
 * Typical label-based dosing, max daily limit, duration limit, and stop criteria
 */
export function getLabelDosingGuidelines(genericName, age, weight) {
  const g = (genericName || "").toLowerCase();
  const numAge = typeof age === "number" ? age : parseInt(age, 10);
  const numWeight = typeof weight === "number" ? weight : parseFloat(weight);

  if (g.includes("paracetamol") || g.includes("acetaminophen")) {
    if (numAge && numAge < 12) {
      if (numWeight && numWeight > 0) {
        const singleDose = Math.round(numWeight * 15);
        return {
          dosing: `Weight-based label dosing: ${singleDose} mg (15 mg/kg) orally every 6 to 8 hours as needed.`,
          maxDaily: `Maximum 60 mg/kg/day (approx. ${Math.round(numWeight * 60)} mg/day in divided doses).`,
          durationLimit: "Maximum 3 days without doctor evaluation.",
          whenToStop: "Stop immediately and seek medical care if fever persists >3 days, reaches >102°F (38.9°C), rash appears, or patient becomes lethargic."
        };
      }
      return {
        dosing: "Weight-based pediatric formulation (syrup/drops). Check package label calibrated measuring dropper.",
        maxDaily: "Do not exceed 4 doses in 24 hours. Strictly avoid adult tablets.",
        durationLimit: "Maximum 2–3 days without pediatric evaluation.",
        whenToStop: "Stop if child refuses fluids, develops breathing difficulty, high fever >3 days, or unusual drowsiness."
      };
    }
    return {
      dosing: "500 mg to 650 mg orally every 4 to 6 hours as needed after food.",
      maxDaily: "Do NOT exceed 4,000 mg (4 grams) in 24 hours across all sources (or 2,000 mg if history of liver disease / alcohol consumption).",
      durationLimit: "Maximum 3 days for fever relief; maximum 5 days for pain relief without medical consultation.",
      whenToStop: "Stop and consult a physician if fever lasts >3 days, pain worsens after 5 days, or signs of liver distress (yellowing eyes, nausea, dark urine) occur."
    };
  }

  if (g.includes("ibuprofen")) {
    if (numAge && numAge < 12) {
      return {
        dosing: "Pediatric ibuprofen must be prescribed and calculated by a pediatrician based on exact body weight (typically 5–10 mg/kg).",
        maxDaily: "Do not administer adult tablets to children. Maximum 40 mg/kg/day strictly under doctor supervision.",
        durationLimit: "Maximum 48 hours for pediatric fever.",
        whenToStop: "Stop immediately if child vomits, passes dark stools, shows decreased urination, or symptoms worsen."
      };
    }
    return {
      dosing: "200 mg to 400 mg orally every 6 to 8 hours immediately after meals with a full glass of water.",
      maxDaily: "Do NOT exceed 1,200 mg per day for self-directed OTC use.",
      durationLimit: "Maximum 3 days for fever, maximum 5 days for pain.",
      whenToStop: "Stop and see a doctor immediately if you experience stomach pain, black/tarry stools, heartburn, swelling, or skin rash."
    };
  }

  if (g.includes("cetirizine")) {
    return {
      dosing: numAge && numAge < 12 ? "2.5 mg to 5 mg once daily at bedtime." : "10 mg once daily orally in the evening.",
      maxDaily: "10 mg in 24 hours (do not take multiple doses).",
      durationLimit: "Maximum 5 to 7 days for acute allergy symptoms.",
      whenToStop: "Stop if extreme drowsiness occurs, or symptoms do not improve after 5 days. Consult doctor if pregnant or elderly."
    };
  }

  if (g.includes("oral rehydration") || g.includes("ors")) {
    return {
      dosing: "Dissolve 1 full sachet in exactly 1 litre of clean drinking water. Sip 200–400 ml after each loose motion.",
      maxDaily: "Use freely to match ongoing fluid losses. Prepare fresh solution every 24 hours; discard leftover.",
      durationLimit: "Continue while loose stools persist, up to 3 days.",
      whenToStop: "Seek immediate emergency hospital care if unable to drink fluids, sunken eyes, extreme weakness, blood in stool, or high fever."
    };
  }

  if (g.includes("pantoprazole") || g.includes("omeprazole")) {
    return {
      dosing: "20 mg to 40 mg once daily in the morning, 30 to 60 minutes before breakfast.",
      maxDaily: "40 mg in 24 hours for short-term OTC relief.",
      durationLimit: "Maximum 14 days of consecutive self-use.",
      whenToStop: "Stop and consult a physician if heartburn persists after 14 days, difficulty swallowing, or black tarry stools."
    };
  }

  if (g.includes("povidone") || g.includes("antiseptic")) {
    return {
      dosing: "Clean wound with water; apply thin layer of 5% ointment 1–2 times daily, cover with sterile gauze if needed.",
      maxDaily: "Apply sparingly to localized superficial cuts only.",
      durationLimit: "Maximum 7 days.",
      whenToStop: "Stop and see a doctor if wound develops increasing redness, swelling, pus discharge, heat, or does not heal within a week."
    };
  }

  // Default fallback
  return {
    dosing: "Follow the precise dosage printed on the approved manufacturer package label.",
    maxDaily: "Never exceed the maximum daily quantity stated on the package packaging.",
    durationLimit: "Maximum 3 to 5 days without clinical review.",
    whenToStop: "Stop use and consult a certified medical practitioner if symptoms do not improve or worsen."
  };
}
