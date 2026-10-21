/**
 * Red-flag emergency screening.
 * Runs on the client side BEFORE submitting to the backend.
 * Blocks the OTC flow if any life-threatening or red-flag clinical criteria are met.
 */

export function checkRedFlagEmergency({
  symptoms = [],
  symptomDetails = {}, // { [symptomLabel]: { duration, severity } }
  age = null,
  pregnant = false,
  pregnancyTrimester = null,
  customSymptoms = []
}) {
  const allSymptomStrings = [
    ...symptoms,
    ...(Array.isArray(customSymptoms) ? customSymptoms : [])
  ].map((s) => s.toLowerCase().trim());

  const combinedText = allSymptomStrings.join(" ");

  // 1. CHEST PAIN / PRESSURE
  const chestPainRegex = /\b(chest\s+pain|chest\s+tightness|chest\s+pressure|radiat(ing|es)\s+to\s+arm|radiat(ing|es)\s+to\s+jaw|heart\s+attack|angina)\b/i;
  if (chestPainRegex.test(combinedText)) {
    return {
      triggered: true,
      code: "CHEST_PAIN",
      title: "Potential Cardiac / Chest Emergency",
      reason: "Acute chest pain, pressure, or discomfort radiating to the arm or jaw can indicate myocardial ischemia (heart attack) or pulmonary embolism.",
      actionText: "Do NOT take OTC painkillers or antacids. Call emergency services immediately or proceed to the nearest emergency trauma center."
    };
  }

  // 2. BREATHING DIFFICULTY
  const breathingRegex = /\b(breathless(ness)?|difficulty\s+breathing|short(ness)?\s+of\s+breath|gasping|can'?t\s+breathe|severe\s+dyspnea|choking|wheezing\s+severe|stridor)\b/i;
  if (breathingRegex.test(combinedText)) {
    return {
      triggered: true,
      code: "RESPIRATORY_DISTRESS",
      title: "Acute Respiratory Distress",
      reason: "Severe shortness of breath or inability to catch breath indicates potential bronchospasm, acute asthma, pulmonary edema, or foreign body airway compromise.",
      actionText: "Requires immediate clinical oxygenation and emergency medical care. Call 112 / 108 or proceed to the nearest casualty ward."
    };
  }

  // 3. SEVERE BLEEDING
  const bleedingRegex = /\b(severe\s+bleeding|heavy\s+bleeding|vomiting\s+blood|coughing\s+up\s+blood|uncontrolled\s+bleeding|hematemesis|hemoptysis|rectal\s+bleeding|black\s+tarry\s+stool)\b/i;
  if (bleedingRegex.test(combinedText)) {
    return {
      triggered: true,
      code: "SEVERE_BLEEDING",
      title: "Severe Hemorrhage / Internal Bleeding",
      reason: "Significant blood loss, vomiting blood, or uncontrolled bleeding is a surgical emergency and risks hypovolemic shock.",
      actionText: "Apply firm direct pressure to external wounds. Call 112 or 108 for an ambulance immediately."
    };
  }

  // 4. CONFUSION / ALTERED MENTAL STATE / FAINTING / SEIZURE
  const neuroRegex = /\b(confusion|disorient(ed|ation)|faint(ed|ing)?|loss\s+of\s+consciousness|syncope|seizure|convulsion|slurred\s+speech|facial\s+droop|passed\s+out|unresponsive)\b/i;
  if (neuroRegex.test(combinedText)) {
    return {
      triggered: true,
      code: "NEUROLOGICAL_CRISIS",
      title: "Neurological Emergency / Altered Consciousness",
      reason: "Acute confusion, fainting, seizure, or neurological deficits can signal stroke, intracranial pathology, or profound metabolic decompensation.",
      actionText: "Place patient in a recovery position if unconscious. Ensure open airway and call 112 / 108 immediately."
    };
  }

  // 5. FEVER > 3 DAYS (Prolonged Fever)
  const isFeverReported = allSymptomStrings.some((s) => s.includes("fever") || s.includes("temp") || s.includes("pyrexia"));
  if (isFeverReported) {
    // Check if user set duration > 3 days on fever chip
    let prolongedDuration = false;
    for (const [sym, details] of Object.entries(symptomDetails)) {
      if (sym.toLowerCase().includes("fever") && details?.duration === ">3 days") {
        prolongedDuration = true;
        break;
      }
    }

    const prolongedTextRegex = /\b(fever\s*(>|over|more\s+than)?\s*3\s*days|fever\s*4\s*days|fever\s*5\s*days|fever\s*week|persistent\s+fever)\b/i;
    if (prolongedDuration || prolongedTextRegex.test(combinedText)) {
      return {
        triggered: true,
        code: "PROLONGED_FEVER",
        title: "Prolonged Fever (> 3 Days)",
        reason: "Fever persisting for more than 72 hours requires laboratory workup (CBC, Dengue NS1, Typhoid/Widal, Malaria) to identify bacterial or vector-borne etiology rather than continued self-medication.",
        actionText: "Do not continue self-administering OTC antipyretics. Consult a physician for diagnostic blood evaluation."
      };
    }
  }

  // 6. INFANT UNDER 3 MONTHS WITH FEVER (or under 1 year with high fever)
  const numericAge = typeof age === "number" ? age : parseFloat(age);
  if (isFeverReported && (numericAge !== null && !isNaN(numericAge) && numericAge < 1)) {
    return {
      triggered: true,
      code: "INFANT_FEVER",
      title: "Urgent Pediatric Emergency: Infant Fever",
      reason: "Febrile infants under 3 to 12 months have immature immune defenses and carry high risk for rapid neonatal sepsis, occult bacteremia, or meningitis.",
      actionText: "Do NOT give adult OTC medicines or aspirin. Take the infant to a pediatric emergency hospital or pediatrician immediately."
    };
  }

  // 7. PREGNANCY WITH SEVERE SYMPTOMS
  if (pregnant) {
    // Check if any symptom has severity 'severe'
    let hasSevere = false;
    for (const [, details] of Object.entries(symptomDetails)) {
      if (details?.severity === "severe") {
        hasSevere = true;
        break;
      }
    }

    const pregnantHighRiskRegex = /\b(cramp|bleed|fever|headache\s+severe|vision\s+blur|swelling\s+sudden|high\s+bp|preeclampsia)\b/i;
    if (hasSevere || (isFeverReported && hasSevere) || pregnantHighRiskRegex.test(combinedText)) {
      return {
        triggered: true,
        code: "PREGNANCY_SEVERE",
        title: "High-Risk Pregnancy Clinical Warning",
        reason: "Severe symptoms during pregnancy (severe headache, fever, acute pain, or bleeding) can represent obstetric complications such as pre-eclampsia, placental complications, or systemic infection.",
        actionText: "Most OTC drugs are contraindicated in pregnancy. Contact your obstetrician/gynecologist or report to the labor and delivery emergency room."
      };
    }
  }

  return { triggered: false };
}
