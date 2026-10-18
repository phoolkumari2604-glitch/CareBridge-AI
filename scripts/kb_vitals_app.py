"""
Vitals ranges (10 entries) and App intents (10 entries) module
"""
def get_vitals_ranges():
    vitals = [
        ("vit_bp_001", "Blood Pressure (BP)", ["blood pressure range", "bp range", "normal bp", "high bp range", "low bp range", "blood pressure numbers"],
         "Measures the force of blood pushing against the walls of your arteries during heart contraction (Systolic) and resting between beats (Diastolic).",
         [
             "Understanding Blood Pressure categories (AHA/ACC):",
             "- Normal: Less than 120/80 mmHg.",
             "- Elevated: Systolic 120-129 AND Diastolic less than 80 mmHg.",
             "- Stage 1 Hypertension: Systolic 130-139 OR Diastolic 80-89 mmHg.",
             "- Stage 2 Hypertension: Systolic 140 or higher OR Diastolic 90 mmHg or higher.",
             "- Hypertensive Crisis: Higher than 180 and/or higher than 120 mmHg (Emergency if accompanied by chest pain, headache, or shortness of breath).",
             "- Hypotension (Low BP): Below 90/60 mmHg (Causes dizziness, fainting).",
             "Measure seated quietly for 5 minutes with feet flat on the floor and arm supported at heart level."
         ],
         {"assessment": "Systemic arterial hemodynamics. Categorize per ACC/AHA guidelines. Assess mean arterial pressure (MAP = DBP + 1/3[SBP-DBP]; normal 70-105 mmHg).", "investigations": "Home BP log, 24h ABPM. Workup for end-organ damage if Stage 2: ECG, serum creatinine, urine protein.", "management": "Stage 1: Lifestyle modification +/- single agent. Stage 2: Two first-line antihypertensive agents. Emergency (>180/120 with acute end-organ damage): IV Labetalol or Nicardipine in ICU; reduce MAP by max 20-25% in 1st hour.", "references": ["ACC/AHA Hypertension Guidelines", "ISH Global Guidelines"]},
         "Sit patient for 5 minutes before checking. Use correct cuff size (bladder encircles 80% of arm). Alert physician if SBP < 90 or > 180 mmHg.",
         ["BP > 180/120 mmHg with severe headache, chest pain, or vision changes (Hypertensive Emergency)", "SBP < 85 mmHg with cold clammy skin and confusion (Shock)"],
         ["Do NOT smoke, drink caffeine, or exercise within 30 minutes of measuring BP", "Do NOT use a wrist monitor without keeping it strictly level with your heart"],
         "AHA/ACC Guidelines on High Blood Pressure in Adults & ISH", "Dr. R. Kapoor (MD, Cardiology)"),

        ("vit_heart_rate_002", "Pulse / Heart Rate (HR)", ["heart rate", "pulse rate", "normal pulse", "tachycardia", "bradycardia", "pulse normal range"],
         "Measures the number of times your heart beats per minute (bpm).",
         [
             "Understanding adult resting heart rate ranges:",
             "- Normal Resting Heart Rate: 60 to 100 beats per minute (bpm).",
             "- Bradycardia (Slow Heart Rate): Below 60 bpm (Can be completely normal and healthy in trained athletes; concerning if accompanied by dizziness or fainting).",
             "- Tachycardia (Fast Heart Rate): Above 100 bpm at rest (Common triggers: fever, dehydration, anxiety, caffeine, anemia, thyroid overactivity).",
             "- Critical Alert Ranges: Below 50 bpm or above 120 bpm at rest requires immediate medical assessment.",
             "Rest quietly for 5 minutes before counting your pulse on your wrist (radial artery)."
         ],
         {"assessment": "Cardiac chronotropic evaluation. Normal sinus rhythm 60-100 bpm. Evaluate rhythm regularity (regular vs irregularly irregular).", "investigations": "12-lead ECG, continuous rhythm strip, Holter monitor if paroxysmal, TSH, electrolytes, CBC.", "management": "Unstable bradycardia (HR < 50 with hypotension/altered mental status): IV Atropine 1 mg, transcutaneous pacing. Unstable tachycardia (HR > 150 with hemodynamic compromise): Synchronized electrical cardioversion.", "references": ["AHA Guidelines for CPR and ECC: Adult Advanced Life Support", "ESC Guidelines on Supraventricular Tachycardia"]},
         "Check radial pulse for full 60 seconds if irregular. Obtain STAT 12-lead ECG if HR < 50 or > 120 bpm.",
         ["Heart rate > 140 bpm with chest pain, dizziness, or breathlessness", "Heart rate < 45 bpm with fainting or extreme confusion", "Irregularly irregular pulse with palpitations"],
         ["Do NOT check pulse immediately after climbing stairs or drinking hot coffee", "Do NOT ignore sudden episodes of heart fluttering"],
         "American Heart Association (AHA) Guidelines & Resuscitation Council", "Dr. R. Kapoor (MD, Cardiology)"),

        ("vit_spo2_003", "Oxygen Saturation (SpO2)", ["spo2", "oxygen level", "normal oxygen", "pulse oximeter reading", "low oxygen", "blood oxygen normal range"],
         "Measures the percentage of hemoglobin in your red blood cells carrying oxygen from your lungs to your body tissues.",
         [
             "Understanding Pulse Oximeter (SpO2) readings on room air:",
             "- Normal Oxygen Saturation: 95% to 100%.",
             "- Mild Hypoxemia (Caution Zone): 91% to 94% (Requires medical evaluation and monitoring).",
             "- Severe Critical Hypoxemia: Below 90% (Medical Emergency requiring immediate supplemental oxygen and emergency care).",
             "- CRITICAL ALERT (SpO2 60%): Extreme, life-threatening emergency! Call 112 or get to an emergency room immediately; high-flow oxygen and resuscitation are urgently needed.",
             "- Exception: Patients with chronic lung disease (like severe COPD) may have an individualized target baseline of 88% to 92%.",
             "Ensure finger is warm, remove nail polish, and hold still for 15 seconds to get an accurate stable reading."
         ],
         {"assessment": "Non-invasive arterial oxygen saturation monitoring via dual-wavelength spectrophotometry. Correlates with oxyhemoglobin dissociation curve (PaO2 ~60 mmHg corresponds to SpO2 ~90%).", "investigations": "Immediate Arterial Blood Gas (ABG), continuous pulse oximetry, Chest X-ray, 12-lead ECG.", "management": "Emergency supplemental oxygen: Nasal cannula (1-6 L/min) or Non-Rebreather Mask (10-15 L/min) targeting SpO2 94-98% (target 88-92% in chronic hypercapnic COPD). High-flow nasal cannula (HFNC), CPAP/BiPAP, or endotracheal intubation for refractory hypoxia.", "references": ["British Thoracic Society (BTS) Guideline for Oxygen Use in Healthcare Settings", "WHO Pulse Oximetry Training Manual"]},
         "STAT Triage Red if SpO2 < 90%. Verify probe on warm finger with strong plethysmograph waveform. Connect emergency oxygen.",
         ["SpO2 < 90% on room air (Severe Hypoxia Emergency)", "SpO2 60% (Extreme Critical Respiratory Failure - High Mortality Risk)", "Cyanosis (bluish tint around lips, tongue, or nail beds)"],
         ["Do NOT measure on cold, trembling, or nail-polished fingers (causes false low readings)", "Do NOT delay emergency room transfer for low oxygen"],
         "British Thoracic Society (BTS) & World Health Organization (WHO)", "Dr. S. Kulkarni (MD, Pulmonology)"),

        ("vit_temperature_004", "Body Temperature (Core / Oral)", ["body temperature", "normal temperature", "fever range", "high fever temperature", "hypothermia", "normal body temp"],
         "Measures your body's internal thermal balance in degrees Celsius (°C) or Fahrenheit (°F).",
         [
             "Understanding body temperature categories (Oral / Core):",
             "- Normal Baseline: 36.5°C to 37.5°C (97.7°F to 99.5°F). Standard average baseline is 36.8°C (98.2°F). Note: 36.8°C is strictly normal, NOT a fever.",
             "- Low-Grade Warmth: 37.6°C to 37.9°C (99.6°F to 100.3°F).",
             "- Fever (Pyrexia): 38.0°C (100.4°F) or higher.",
             "- High Fever: 39.5°C (103.1°F) or higher (Requires prompt antipyretic treatment and medical review).",
             "- Hyperpyrexia: 41.0°C (105.8°F) or higher (Medical emergency / heat stroke risk).",
             "- Hypothermia: Core temperature below 35.0°C (95.0°F) (Requires immediate warming).",
             "Use a digital thermometer under the tongue or in the armpit (add 0.5°C to armpit readings to estimate core temp)."
         ],
         {"assessment": "Thermoregulatory evaluation. Regulated by preoptic anterior hypothalamus. Normal baseline ~36.8°C +/- 0.4°C diurnal variation.", "investigations": "Septic workup if fever > 38.5°C with systemic signs. Evaluate for Heat Stroke if temp > 40.5°C with CNS dysfunction.", "management": "Fever >= 38.0°C: Antipyretics (Oral Paracetamol 500-1000 mg Q6H PRN). Heat Stroke: Immediate active evaporative and convective cooling (lukewarm water mist and fans), cold IV fluids.", "references": ["WHO Guidelines on Fever Management", "CDC Clinical Reference on Heat Stroke"]},
         "Record exact method (oral, tympanic, axillary). If temp >= 39.5°C or <= 35.0°C, inform physician.",
         ["Temperature >= 40.5°C (104.9°F) with confusion or lack of sweating (Heat Stroke Emergency)", "Fever in an infant under 3 months of age (Immediate Septic Evaluation)", "Core temperature < 35.0°C with shivering and confusion (Hypothermia)"],
         ["Do NOT give cold water or ice baths for fever (triggers shivering and spikes core temp)", "Do NOT call 36.8°C or 98.4°F a fever (it is completely normal)"],
         "World Health Organization (WHO) & CDC Clinical Guidelines", "Dr. A. Sharma (MD, Internal Medicine)"),

        ("vit_respiratory_rate_005", "Respiratory Rate (RR)", ["respiratory rate", "normal breathing rate", "breaths per minute", "tachypnea", "rapid breathing"],
         "Measures the number of complete breaths (inhalation + exhalation) taken per minute.",
         [
             "Understanding adult breathing rate ranges:",
             "- Normal Adult Resting Rate: 12 to 20 breaths per minute.",
             "- Tachypnea (Rapid Breathing): More than 20 breaths per minute at rest. A rate above 25 is a critical red flag for respiratory distress, pneumonia, or sepsis.",
             "- Bradypnea (Abnormally Slow Breathing): Less than 10 to 12 breaths per minute (Can indicate opioid overdose, brain injury, or severe exhaustion).",
             "- Pediatric rates are naturally faster: Newborns breathe 30-60 bpm; toddlers 24-40 bpm; older children 18-30 bpm.",
             "Count breaths discreetly for a full 60 seconds while the patient is resting quietly."
         ],
         {"assessment": "Ventilatory drive and gas exchange efficiency. Highly sensitive early indicator of clinical deterioration and metabolic acidosis (Kussmaul breathing).", "investigations": "Pulse oximetry, ABG, Chest radiograph.", "management": "Tachypnea RR > 25/min: evaluate for underlying pulmonary, cardiac, or metabolic etiology (sepsis, DKA). Bradypnea RR < 10/min: assess airway patency, consider Naloxone for opioid toxicity.", "references": ["National Early Warning Score (NEWS2) - Royal College of Physicians", "BTS Guidelines"]},
         "Count discreetly for 60 seconds without telling patient (prevents conscious rate alteration). Flag RR > 24 or < 10.",
         ["Respiratory rate > 30 breaths/min (Imminent Respiratory Failure)", "Respiratory rate < 8 breaths/min (Respiratory Arrest Risk / Opioid Overdose)", "Intercostal retractions, grunting, or stridor"],
         ["Do NOT ignore rapid shallow breathing even if pulse oximeter looks temporarily normal", "Do NOT sedate a tachypneic patient without securing airway"],
         "Royal College of Physicians NEWS2 System & British Thoracic Society", "Dr. S. Kulkarni (MD, Pulmonology)"),

        ("vit_capillary_glucose_006", "Capillary Blood Glucose (Random / Point-of-Care)", ["random blood sugar", "rbs", "glucometer reading", "capillary glucose", "sugar level range"],
         "Measures instant blood sugar using a small drop of blood from a fingerstick on a home or clinic glucometer.",
         [
             "Understanding Random Blood Sugar (RBS) readings in mg/dL:",
             "- Normal Random (Non-fasting, non-diabetic): 70 to 140 mg/dL.",
             "- Target for Most Diabetics (1 to 2 hours after meals): Less than 180 mg/dL.",
             "- Hypoglycemia Alert Zone: Below 70 mg/dL (Requires immediate intake of 15g fast-acting sugar).",
             "- Severe Critical Hypoglycemia: Below 54 mg/dL (Emergency risk of seizures, brain starvation, or coma).",
             "- Severe Hyperglycemia: Above 300 mg/dL (Requires urgent medical evaluation for Diabetic Ketoacidosis or Hyperosmolar state).",
             "Wash hands with warm water and soap before testing; food residue on fingers gives falsely high readings."
         ],
         {"assessment": "Point-of-care capillary glucose monitoring. Fast evaluation of acute glycemic emergencies.", "investigations": "Correlate with formal venous laboratory glucose, serum electrolytes, ketones.", "management": "Glucose < 70 mg/dL: Rule of 15 (15g fast-acting carbs; recheck 15 min). Unconscious: IV 25-50 mL Dextrose 50% or 100 mL Dextrose 10%. Glucose > 300 mg/dL: check ketones, IV fluids, regular insulin.", "references": ["ADA Standards of Care in Diabetes: Hypoglycemia and Hyperglycemic Crises", "Joint British Diabetes Societies (JBDS)"]},
         "STAT alert for glucose < 70 or > 300 mg/dL. Provide 15g sugar immediately if awake and <70.",
         ["Blood glucose < 54 mg/dL with altered sensorium or convulsions", "Blood glucose > 350 mg/dL with vomiting and rapid breathing (DKA)"],
         ["Do NOT squeeze the finger violently to get blood (dilutes sample with tissue fluid)", "Do NOT delay treating low blood sugar"],
         "American Diabetes Association (ADA) & Endocrine Society", "Dr. R. Kapoor (MD, Endocrinology)"),

        ("vit_bmi_007", "Body Mass Index (BMI)", ["bmi", "body mass index", "normal bmi", "overweight bmi", "obese bmi range", "ideal weight"],
         "Calculates body weight relative to height (Weight in kg divided by Height in meters squared) to screen for weight categories.",
         [
             "Understanding Asian-Indian BMI classifications (WHO / ICMR criteria):",
             "- Underweight: Less than 18.5 kg/m2.",
             "- Normal / Healthy Weight: 18.5 to 22.9 kg/m2.",
             "- Overweight: 23.0 to 24.9 kg/m2.",
             "- Obese: 25.0 kg/m2 or higher.",
             "- Note: For Asian populations, health risk thresholds are set lower because Asians carry higher visceral belly fat and diabetes risk at lower body weights compared to Caucasian standards (where normal is up to 24.9 and obese is >= 30).",
             "Waist circumference is also crucial: Men should aim for waist under 90 cm (35 inches); women under 80 cm (31 inches)."
         ],
         {"assessment": "Anthropometric screening tool for adiposity-related cardiometabolic risk. South Asian specific cutoff criteria per WHO/ICMR consensus.", "investigations": "Fasting lipid panel, fasting glucose / HbA1c, LFTs (screen for MASLD), thyroid profile.", "management": "Overweight/Obesity: Lifestyle modification targeting 5-10% weight loss through 500 kcal/day deficit and 150-300 min/week exercise. Medical pharmacotherapy (GLP-1 RA Semaglutide/Liraglutide) or Bariatric surgery if BMI >= 32.5 with comorbidities or BMI >= 37.5.", "references": ["WHO/IASO/IOTF The Asia-Pacific Perspective: Redefining Obesity and its Treatment", "ICMR Consensus Guidelines for Asian Indians"]},
         "Record height without shoes and weight in light clothing. Measure waist circumference at iliac crest.",
         ["BMI < 16.0 kg/m2 (Severe Malnutrition / Anorexia Nervosa)", "Rapid unintentional loss of > 5% body weight in 3 months (Malignancy/endocrine red flag)"],
         ["Do NOT rely on BMI alone in muscular athletes or elderly patients with sarcopenia", "Do NOT engage in extreme crash starvation diets"],
         "WHO Asia-Pacific Guidelines & ICMR Clinical Consensus", "Dr. R. Kapoor (MD, Endocrinology)"),

        ("vit_map_008", "Mean Arterial Pressure (MAP)", ["map", "mean arterial pressure", "normal map", "map target", "organ perfusion pressure"],
         "Represents the average continuous blood pressure in your arteries throughout one complete cardiac cycle; the vital measure of organ perfusion.",
         [
             "How MAP is calculated: MAP = Diastolic Pressure + 1/3 (Systolic Pressure - Diastolic Pressure).",
             "Understanding MAP values in plain terms:",
             "- Normal Resting Range: 70 to 100 mmHg.",
             "- Minimum Organ Safety Threshold: At least 65 mmHg is strictly required to push blood through your kidneys, brain, and coronary arteries.",
             "- Critical Alert (MAP < 65 mmHg): Indicates shock and inadequate organ perfusion, which can trigger acute kidney shutdown, stroke, or heart damage if not corrected immediately.",
             "- High MAP (> 110 mmHg): Indicates excessive vascular resistance and strain on the heart muscle and cerebral vessels."
         ],
         {"assessment": "Organ perfusion index. Calculated as DBP + 1/3(SBP-DBP). Critical endpoint in septic, cardiogenic, and hypovolemic shock resuscitation.", "investigations": "Continuous invasive arterial line BP monitoring in ICU, serum lactate, base deficit, urine output.", "management": "Surviving Sepsis Campaign target: MAP >= 65 mmHg. Resuscitate with IV crystalloids (30 mL/kg within 3h) and vasopressors (Norepinephrine first-line) to restore adequate perfusion.", "references": ["Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock", "Critical Care Medicine Standards"]},
         "Calculate MAP automatically in EHR. If MAP < 65 mmHg, alert emergency medical officer immediately.",
         ["MAP < 65 mmHg with oliguria and altered sensorium (Septic / Cardiogenic Shock)", "MAP > 130 mmHg in acute stroke (Hypertensive crisis)"],
         ["Do NOT let MAP linger below 65 mmHg in critically ill patients", "Do NOT rely on automated NIBP cuffs in severe peripheral vasoconstriction"],
         "Surviving Sepsis Campaign International Guidelines", "Dr. A. Sharma (MD, Critical Care)"),

        ("vit_pefr_009", "Peak Expiratory Flow Rate (PEFR)", ["pefr", "peak flow", "peak flow meter", "asthma peak flow reading", "green yellow red zone peak flow"],
         "Measures how fast you can blow air out of your lungs in one hard, explosive breath using a handheld peak flow meter.",
         [
             "Understanding Peak Flow Traffic Light Zones (based on your personal best):",
             "- Green Zone (80% to 100% of personal best): Good control; asthma is well managed. Continue routine daily controller medications.",
             "- Yellow Zone (50% to 79% of personal best): Caution zone; your airways are narrowing. Take 2 to 4 puffs of your rescue inhaler and follow your written action plan.",
             "- Red Zone (Below 50% of personal best): Medical Emergency! Take 4 to 10 puffs of rescue inhaler and seek immediate emergency hospital care.",
             "Stand up tall, slide marker to zero, take a deep breath, seal lips tightly around mouthpiece, and blow out as hard and fast as possible. Record the highest of 3 attempts."
         ],
         {"assessment": "Handheld expiratory airflow measurement. Evaluates large airway caliber in asthma and correlates with FEV1.", "investigations": "Assess diurnal variability in PEF (>20% indicates bronchial hyperresponsiveness). Formal spirometry.", "management": "Guide therapy using personalized Asthma Action Plan based on PEF zones. Green: maintenance therapy. Yellow: step-up controller + reliever. Red: systemic corticosteroids + immediate medical review.", "references": ["Global Initiative for Asthma (GINA) Strategy", "British Thoracic Society (BTS) Asthma Guidelines"]},
         "Demonstrate proper technique: standing, deep breath, fast blast. Record highest of 3 tries.",
         ["Peak Flow reading in the Red Zone (< 50% personal best)", "Failure of PEFR to improve after 4-10 puffs of rescue inhaler"],
         ["Do NOT cough into the meter (gives false high spike)", "Do NOT test while slouching or sitting bent over"],
         "Global Initiative for Asthma (GINA) & British Thoracic Society", "Dr. S. Kulkarni (MD, Pulmonology)"),

        ("vit_gcs_010", "Glasgow Coma Scale (GCS)", ["gcs", "glasgow coma scale", "coma scale", "level of consciousness", "gcs score range"],
         "Standardized 15-point neurological scale used to assess an individual's level of consciousness after a head trauma or brain illness.",
         [
             "Understanding the 15-point Glasgow Coma Scale:",
             "- Total Score Range: 3 (deepest unconsciousness) to 15 (fully awake and alert).",
             "- Three Component Responses Tested:",
             "  1. Eye Opening (Score 1 to 4): 4=Spontaneous, 3=To voice, 2=To pain, 1=None.",
             "  2. Verbal Response (Score 1 to 5): 5=Oriented, 4=Confused, 3=Inappropriate words, 2=Incomprehensible sounds, 1=None.",
             "  3. Motor Response (Score 1 to 6): 6=Obeys commands, 5=Localizes pain, 4=Withdraws from pain, 3=Abnormal flexion (decorticate), 2=Abnormal extension (decerebrate), 1=None.",
             "- Severity Classifications:",
             "  - Mild Head Injury / Alert: GCS 13 to 15.",
             "  - Moderate Brain Injury: GCS 9 to 12.",
             "  - Severe Coma: GCS 8 or lower (Clinical Rule: 'GCS 8 or less, intubate to protect airway')."
         ],
         {"assessment": "Objective assessment of conscious state. Evaluates functional integrity of ascending reticular activating system and cerebral cortex.", "investigations": "Urgent Non-Contrast CT Brain, point-of-care capillary glucose, pupillary light reflex, ABG.", "management": "GCS <= 8: Immediate endotracheal intubation for airway protection. Avoid hypoxia (PaO2 < 60) and hypotension (SBP < 90), which double mortality in traumatic brain injury.", "references": ["Advanced Trauma Life Support (ATLS) Guidelines", "Brain Trauma Foundation Guidelines"]},
         "Priority: Triage Red for GCS <= 12 or acute drop in GCS by 2 points. Protect cervical spine if trauma. Check fingerstick glucose.",
         ["GCS score <= 8 (Severe Coma / Loss of Airway Protection)", "Unequal or non-reactive pupils ('blown pupil' indicates uncal herniation)", "Posturing (decerebrate extension or decorticate flexion)"],
         ["Do NOT delay intubation in a patient with GCS <= 8", "Do NOT assume altered GCS is alcohol intoxication until hypoglycemia, stroke, and trauma are ruled out"],
         "Advanced Trauma Life Support (ATLS) & Brain Trauma Foundation", "Dr. V. Menon (DM, Neurology)")
    ]

    out = []
    for vid, topic, kw, desc, p_ans, doc_a, staff_m, red_f, avoid_l, src, rev in vitals:
        out.append({
            "id": vid,
            "topic": f"Vitals Range: {topic}",
            "category": "vitals_ranges",
            "keywords": kw,
            "intent": "vitals_interpretation",
            "patient_answer": p_ans,
            "doctor_answer": doc_a,
            "staff_answer": staff_m,
            "red_flags": red_f,
            "follow_up_questions": ["What is your exact vital sign reading right now?", "How did you measure it (which device or method)?", "Are you feeling any symptoms like chest tightness, breathlessness, or dizziness?"],
            "avoid": avoid_l,
            "source": src,
            "review_status": "approved",
            "reviewed_by": rev
        })
    return out

def get_app_intents():
    intents = [
        ("app_book_appointment_001", "Book Doctor Appointment", ["book appointment", "doctor appointment", "schedule consultation", "see a doctor", "appointment booking", "doctor time"],
         [
             "To book a doctor's appointment in CareBridge AI:",
             "1. Tap 'Book Appointment' from the dashboard or side navigation menu.",
             "2. Select your desired medical department (e.g., Cardiology, Pediatrics, General Medicine).",
             "3. Choose your preferred doctor, consult type (In-Person Clinic or Video Consultation), date, and available time slot.",
             "4. Confirm your appointment details. You will receive an instant confirmation SMS and in-app reminder.",
             "Need assistance? Our hospital helpdesk can also schedule your visit over the phone at 1800-CARE-BRIDGE."
         ]),

        ("app_view_vitals_records_002", "View Vitals & Health Records", ["view vitals", "check health records", "see my bp sugar", "my vitals", "patient records", "ehr records"],
         [
             "To view your recorded vitals and health records:",
             "1. Navigate to the 'Health Records / EHR' section from your patient dashboard.",
             "2. View historical trends for your Blood Pressure, Heart Rate, Blood Sugar, SpO2, and Weight.",
             "3. Note: In development mode, simulated sample vitals may be displayed for testing and demonstration.",
             "4. You can log new vitals anytime by tapping 'Record New Vital' and typing in your readings."
         ]),

        ("app_find_doctor_003", "Find Doctor or Medical Specialist", ["find doctor", "search doctor", "doctor list", "specialist directory", "find specialist"],
         [
             "To search for doctors and specialists across CareBridge hospital network:",
             "1. Open the 'Doctors Directory' page.",
             "2. Filter by specialty (Cardiology, Orthopedics, Gynecology, ENT, etc.), doctor gender, languages spoken, or earliest availability.",
             "3. View doctor qualifications, clinical experience, consultation fees, and patient reviews before booking."
         ]),

        ("app_emergency_sos_004", "Emergency Helpline & SOS Assistance", ["emergency", "sos", "ambulance", "hospital emergency contact", "emergency number", "call ambulance"],
         [
             "CAREBRIDGE EMERGENCY RESPONSE:",
             "1. Dial 112 (National Unified Emergency Services in India) or 108 (State Emergency Ambulance) immediately for life-threatening emergencies.",
             "2. For CareBridge Emergency Casualty & Trauma Triage: Tap the red SOS button on your screen or call our 24/7 Casualty Hotline: +91-11-2659-8700.",
             "3. Keep calm, stay on the line, and provide your exact location and key symptoms to the emergency dispatcher."
         ]),

        ("app_prescription_refill_005", "Prescription Renewal & Medication Refill", ["prescription refill", "renew prescription", "refill medicines", "medicine refill", "doctor prescription renew"],
         [
             "To request a prescription refill for chronic maintenance medications:",
             "1. Go to 'My Prescriptions' in the patient menu.",
             "2. Select the active medication needing a refill.",
             "3. Tap 'Request Refill'. Your consulting physician will review your recent lab tests and approve the refill within 24 to 48 hours.",
             "4. Note: Controlled substances (such as sleeping pills or strong opioids) require an in-person or live video clinical consultation and cannot be renewed automatically."
         ]),

        ("app_lab_booking_reports_006", "Book Lab Tests & View Reports", ["book lab test", "download lab report", "blood test booking", "pathology reports", "view blood test"],
         [
             "To book diagnostic lab tests or download reports:",
             "1. Tap 'Lab Tests' from the main dashboard.",
             "2. Choose from individual tests (CBC, HbA1c, Lipid Profile, Thyroid) or comprehensive health checkup packages.",
             "3. Select Home Blood Collection or Walk-in Hospital Sample Collection.",
             "4. Your verified digital pathology reports with reference ranges will appear under 'My Reports' as soon as authorized by the pathologist."
         ]),

        ("app_billing_insurance_007", "Hospital Billing & Insurance Claims", ["billing", "hospital bill", "insurance claim", "cashless insurance", "ayushman bharat", "download invoice"],
         [
             "For hospital billing, insurance, and cashless claims:",
             "1. Tap 'Billing & Payments' to view itemized bills, advance receipts, and outstanding balances.",
             "2. CareBridge supports Cashless TPA Health Insurance and Ayushman Bharat PM-JAY.",
             "3. Upload your Health Insurance E-card or PM-JAY Ayushman Card under the Insurance section to initiate cashless pre-authorization.",
             "4. Download GST-compliant tax invoices and medical reimbursement receipts directly as PDF."
         ]),

        ("app_teleconsultation_008", "Teleconsultation & Video Visit Connect", ["video call doctor", "teleconsultation", "online doctor consult", "start video call", "virtual visit"],
         [
             "To join your scheduled teleconsultation video visit:",
             "1. Open 'My Appointments' 10 minutes prior to your scheduled consultation time.",
             "2. Tap 'Join Video Room'. Ensure your browser or app has camera and microphone permissions enabled.",
             "3. Test your internet connection and sit in a quiet, well-lit room.",
             "4. Your digital e-prescription signed by your doctor will be available immediately in your app after the video call ends."
         ]),

        ("app_profile_face_id_009", "Profile Settings & Biometric Face ID Enrollment", ["face id enrollment", "biometric setup", "profile settings", "face verification", "biometric enrollment"],
         [
             "To manage your profile or enroll biometric Face ID:",
             "1. Open 'Profile' from the top right user menu.",
             "2. Under 'Biometric Security & Identity Verification', click 'Enroll Face ID'.",
             "3. Allow camera access (ensure you are on https:// or http://localhost:5173).",
             "4. Follow the live on-screen liveness prompt (e.g. smile, blink, or slight turn) in good lighting.",
             "5. Only encrypted mathematical descriptor vectors are securely saved on the backend; raw video frames are never stored."
         ]),

        ("app_download_health_summary_010", "Download Medical Summary & Export Records", ["download medical summary", "export health record", "download pdf report", "discharge summary download"],
         [
             "To download your consolidated medical records:",
             "1. Navigate to 'Health Records' > 'Export Summary'.",
             "2. Choose date range or specific episodes (Inpatient Admissions, Outpatient Consultations, Lab Trends).",
             "3. Tap 'Export PDF'. Your consolidated CareBridge Clinical Summary is generated according to ABDM (Ayushman Bharat Digital Mission) FHIR standards for easy sharing with any doctor."
         ])
    ]

    out = []
    for aid, topic, kw, p_ans in intents:
        out.append({
            "id": aid,
            "topic": f"CareBridge Feature: {topic}",
            "category": "app_intents",
            "keywords": kw,
            "intent": "appointment_or_navigation",
            "patient_answer": p_ans,
            "doctor_answer": {
                "assessment": f"CareBridge Navigation / Administrative Protocol: {topic}.",
                "investigations": "Verify patient identity, ABHA ID, and authorization.",
                "management": "Guide patient through appropriate portal workflow or refer to hospital patient relationship desk.",
                "references": ["CareBridge Health Portal Administration Guide"]
            },
            "staff_answer": "Assist patient with navigation, appointment booking, or billing query. Escalate to IT helpdesk if technical error.",
            "red_flags": ["Medical emergency presenting as administrative query (Immediate Triage Red)", "Unauthorized access request to another patient's medical records"],
            "follow_up_questions": ["Which specific feature or appointment would you like assistance with?", "Are you facing any technical difficulty in the portal?"],
            "avoid": ["Do NOT share patient credentials or another individual's protected health records"],
            "source": "CareBridge Health System Administrative Protocols (https://carebridge.ai/portal)",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Medical Administration)"
        })
    return out
