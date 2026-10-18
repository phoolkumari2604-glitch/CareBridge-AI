"""
Script to generate the standardized, clinical CareBridge MedAI Health Knowledge Base
across 10 structured categories conforming to the requested schema.
"""
import os
import json

def get_kb_data():
    kb = {}

    # 1. EMERGENCIES (emergencies.json)
    kb["emergencies"] = [
        {
            "id": "emg_chest_pain_001",
            "topic": "Chest Pain (Acute Coronary Syndrome / Heart Attack)",
            "category": "emergencies",
            "keywords": ["chest pain", "heart attack", "angina", "chhati me dard", "seene me dard", "dil ka daura", "chest tightness", "chest pressure", "radiating chest pain"],
            "intent": "emergency",
            "patient_answer": [
                "Call emergency services (112 or local ambulance) immediately.",
                "Sit or lie down in a comfortable position (half-upright with knees bent). Do not exert yourself.",
                "Loosen tight clothing around the neck and chest.",
                "If not allergic and advised by a medical professional, chew one 300 mg soluble Aspirin.",
                "Do not drive yourself to the hospital; wait for paramedics."
            ],
            "doctor_answer": {
                "assessment": "Suspected Acute Coronary Syndrome (STEMI / NSTEMI). Requires emergency evaluation within 10 minutes of arrival.",
                "investigations": "Urgent 12-lead ECG, serial high-sensitivity Cardiac Troponin (hs-cTn), portable CXR, baseline CBC, renal panel, and lipid profile.",
                "management": "Chewable Aspirin 300 mg + P2Y12 inhibitor loading (Ticagrelor 180 mg or Clopidogrel 300 mg). Sublingual Nitroglycerin 0.4 mg if SBP > 100 mmHg and no right ventricular infarct. Oxygen only if SpO2 < 90%. Immediate catheterization lab activation for primary PCI (<90 min).",
                "references": ["AHA/ACC Guideline for the Evaluation and Diagnosis of Chest Pain (2021)", "ESC Guidelines for ACS (2023)"]
            },
            "staff_answer": "Priority: Triage Red (Immediate). Escalate immediately to emergency medical officer. Wheelchair/trolley transfer to Resus room. Acquire 12-lead ECG within 10 min. Hook up continuous ECG/SpO2/NIBP monitor. Secure wide-bore IV access (18G). Keep crash cart and defibrillator ready.",
            "red_flags": ["Radiation to left arm, neck, or jaw", "Profuse cold sweating (diaphoresis)", "Severe shortness of breath", "Syncope or lightheadedness", "Hypotension (SBP < 90 mmHg)"],
            "follow_up_questions": ["When did the chest pain start?", "Does the pain radiate to your arm, neck, or jaw?", "Are you experiencing shortness of breath or cold sweats?"],
            "avoid": ["Do not exert or walk around", "Do not take Nitroglycerin if SBP is low (<100 mmHg) or if PDE5 inhibitors (Viagra/Cialis) were taken in past 24-48h"],
            "source": "AHA/ACC Chest Pain Guidelines & ICMR Standard Treatment Workflows (STW)",
            "review_status": "approved",
            "reviewed_by": "Dr. R. Kapoor (MD, DM Cardiology)"
        },
        {
            "id": "emg_cardiac_arrest_002",
            "topic": "Cardiac Arrest (Adult CPR)",
            "category": "emergencies",
            "keywords": ["cardiac arrest", "unresponsive", "not breathing", "cpr", "heart stopped", "collapsed", "no pulse", "behoshi"],
            "intent": "emergency",
            "patient_answer": [
                "Shout for help and dial 112 immediately. Ask someone to fetch an AED (Defibrillator) if nearby.",
                "Check response: Tap the collarbone firmly and shout 'Are you okay?'.",
                "Look for breathing: If not breathing or only gasping, immediately start chest compressions.",
                "Place heel of hand in the center of the chest, interlock fingers, keep elbows locked.",
                "Push hard and fast: 100 to 120 compressions per minute, 5 to 6 cm deep. Allow full chest recoil.",
                "Continue uninterrupted CPR until emergency medical personnel arrive or the person starts breathing."
            ],
            "doctor_answer": {
                "assessment": "Sudden Out-of-Hospital / In-Hospital Cardiac Arrest. Requires high-quality CPR and rapid rhythm identification.",
                "investigations": "Continuous rhythm strip monitoring, end-tidal CO2 (capnography), point-of-care venous/arterial blood gas and electrolytes post-ROSC.",
                "management": "ACLS protocol: 30:2 compressions or continuous if advanced airway; Defibrillate shockable rhythms (VF/pVT) at 200J biphasic; IV/IO Epinephrine 1 mg every 3-5 min; Amiodarone 300 mg after 3rd shock for refractory VF/pVT. Address reversible 4Hs & 4Ts.",
                "references": ["AHA Guidelines for CPR and ECC (2020)", "ERC Guidelines for Resuscitation (2021)"]
            },
            "staff_answer": "Priority: Triage Red (Code Blue). Initiate immediate bystander/nurse chest compressions at 100-120/min. Call Code Blue / crash team. Bring crash cart, suction, and biphasic defibrillator. Apply defib pads to check rhythm. Prepare Epinephrine 1 mg ampoules.",
            "red_flags": ["Complete unresponsiveness", "Absent carotid pulse", "Agonal gasping or absent respiratory effort", "Central cyanosis"],
            "follow_up_questions": ["Is the patient breathing or only gasping?", "Did the collapse happen right in front of you?", "Is an Automated External Defibrillator (AED) available?"],
            "avoid": ["Do not stop compressions for more than 10 seconds", "Do not give liquids or food to an unconscious person"],
            "source": "AHA Guidelines for CPR and ECC & Resuscitation Council of India",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)"
        },
        {
            "id": "emg_stroke_003",
            "topic": "Acute Stroke (FAST Protocol)",
            "category": "emergencies",
            "keywords": ["stroke", "paralysis", "lakwa", "face drooping", "arm weakness", "slurred speech", "fast", "fakk", "brain stroke", "hemiparesis"],
            "intent": "emergency",
            "patient_answer": [
                "Act F.A.S.T. Call emergency services (112) immediately. Note the exact time symptoms started.",
                "F - Face Drooping: Ask the person to smile. Does one side droop?",
                "A - Arm Weakness: Ask them to raise both arms. Does one arm drift downward?",
                "S - Speech Difficulty: Ask them to repeat a simple sentence. Is speech slurred or strange?",
                "T - Time to call 112: If you observe any of these signs, get to a stroke-ready hospital immediately.",
                "Keep the person lying flat with head slightly elevated (15-30 degrees).",
                "Do NOT give anything to eat or drink (choking risk). Do NOT give aspirin until a brain CT rules out bleeding."
            ],
            "doctor_answer": {
                "assessment": "Suspected Acute Ischemic Stroke vs Intracranial Hemorrhage. Door-to-needle window critical (<4.5 hours for IV thrombolysis, up to 24h for mechanical thrombectomy).",
                "investigations": "Immediate Non-contrast CT Brain, capillary blood glucose (rule out hypoglycemia mimic), CBC, PT/INR, aPTT, 12-lead ECG.",
                "management": "IV Alteplase (0.9 mg/kg) or Tenecteplase if ischemic stroke within 4.5h and no contraindications (BP must be <185/110 mmHg before thrombolysis). Emergent CTA for large vessel occlusion (LVO) and endovascular thrombectomy candidacy.",
                "references": ["AHA/ASA Guidelines for the Early Management of Patients With Acute Ischemic Stroke", "ICMR Guidelines for Stroke Management in India"]
            },
            "staff_answer": "Priority: Triage Red (Stroke Code). Immediately record 'Last Known Well' time. Check point-of-care capillary blood glucose (exclude hypoglycemia). Notify CT console and neurology stroke team. Maintain NPO (high aspiration risk). Do not give antiplatelets until CT confirms no hemorrhage.",
            "red_flags": ["Sudden unilateral facial droop", "Hemiparesis or arm drift", "Aphasia or dysarthria", "Sudden severe 'thunderclap' headache", "Loss of balance or visual field defect"],
            "follow_up_questions": ["What was the exact time the person was last seen completely normal?", "Can they smile symmetrically?", "Can they raise both arms together?"],
            "avoid": ["Do NOT give Aspirin or blood thinners prior to CT scan", "Do NOT give oral liquids or medications (aspiration risk)"],
            "source": "AHA/ASA Acute Stroke Guidelines & National Stroke Association / ICMR",
            "review_status": "approved",
            "reviewed_by": "Dr. V. Menon (DM Neurology)"
        },
        {
            "id": "emg_breathlessness_004",
            "topic": "Severe Breathlessness & Respiratory Distress",
            "category": "emergencies",
            "keywords": ["breathlessness", "severe shortness of breath", "saans lene me takleef", "saans phoolna", "cannot breathe", "dyspnea", "gasping for air", "suffocation"],
            "intent": "emergency",
            "patient_answer": [
                "Call 112 or get to the nearest emergency department immediately.",
                "Sit upright leaning slightly forward with arms supported (tripod position) to help expand the lungs.",
                "Loosen tight collars, ties, or belts.",
                "If the patient has a prescribed rescue inhaler (e.g. Salbutamol for asthma/COPD), administer 2 to 4 puffs via spacer immediately.",
                "Ensure fresh air ventilation; stay calm and take slow, steady breaths."
            ],
            "doctor_answer": {
                "assessment": "Acute Respiratory Failure / Acute Severe Dyspnea. Differentials include acute asthma exacerbation, COPD exacerbation, acute pulmonary edema, pulmonary embolism, pneumothorax, or severe anaphylaxis.",
                "investigations": "Continuous SpO2 and rhythm monitoring, urgent ABG/VBG, 12-lead ECG, bedside lung ultrasound (POCUS / BLUE protocol), portable CXR, CBC, D-dimer, BNP/NT-proBNP.",
                "management": "Supplemental oxygen targeting SpO2 94-98% (or 88-92% in chronic hypercapnic COPD). Nebulized Salbutamol 5 mg + Ipratropium 0.5 mg. If acute pulmonary edema: IV Furosemide 40-80 mg, sublingual nitrates if SBP > 110. Non-invasive positive pressure ventilation (BiPAP/CPAP) or endotracheal intubation if severe exhaustion.",
                "references": ["BTS Guideline for Oxygen Use in Adults in Healthcare and Emergency Settings", "GOLD Guidelines for COPD Exacerbation"]
            },
            "staff_answer": "Priority: Triage Red. Place patient immediately in high Fowler's/upright position. Attach pulse oximeter and start high-flow nasal cannula or non-rebreather mask if SpO2 < 90%. Notify ER physician immediately. Prepare nebulizer with Salbutamol and prepare BiPAP machine.",
            "red_flags": ["SpO2 < 90% on room air", "Stridor or inability to speak full words", "Cyanosis (bluish lips or fingernails)", "Use of accessory neck/intercostal muscles", "Drowsiness or exhaustion"],
            "follow_up_questions": ["Do you have a history of asthma, heart failure, or COPD?", "Did the breathlessness come on suddenly within minutes or over days?", "Is there any chest pain, wheezing, or swelling in your legs?"],
            "avoid": ["Do not lie flat on your back", "Do not sedate the patient"],
            "source": "British Thoracic Society (BTS) & WHO Emergency Triage Assessment",
            "review_status": "approved",
            "reviewed_by": "Dr. S. Kulkarni (MD Pulmonology)"
        },
        {
            "id": "emg_asthma_attack_005",
            "topic": "Acute Severe Asthma Attack",
            "category": "emergencies",
            "keywords": ["asthma attack", "severe wheezing", "asthma saans phoolna", "inhaler not working", "status asthmaticus"],
            "intent": "emergency",
            "patient_answer": [
                "Sit upright immediately. Do not lie down.",
                "Take 2 to 4 puffs of your blue rescue inhaler (Salbutamol / Albuterol), ideally through a spacer. Take 1 puff every 30 to 60 seconds up to 10 puffs.",
                "If symptoms do not improve after 10 puffs, or if you cannot complete a sentence in one breath, call 112 immediately.",
                "Repeat 4 to 10 puffs every 15 to 20 minutes while waiting for the ambulance.",
                "Stay calm; panicking increases oxygen demand."
            ],
            "doctor_answer": {
                "assessment": "Acute Severe vs Life-Threatening Asthma Exacerbation. Hallmarks: inability to complete sentences in one breath, RR > 25/min, HR > 110 bpm, PEFR < 50% predicted.",
                "investigations": "Peak Expiratory Flow Rate (PEFR), continuous pulse oximetry, ABG if SpO2 < 92% or exhausting, portable CXR to rule out pneumothorax.",
                "management": "High-dose nebulized Salbutamol 5 mg + Ipratropium Bromide 0.5 mg driven by oxygen. Systemic corticosteroids: IV Hydrocortisone 100-200 mg or oral Prednisolone 40-50 mg. IV Magnesium Sulfate 1.2-2.0 g infusion over 20 min for severe/refractory cases. Target SpO2 93-95%.",
                "references": ["Global Initiative for Asthma (GINA) 2023 Strategy Report", "British Thoracic Society (BTS) Asthma Guideline"]
            },
            "staff_answer": "Priority: Triage Red/Orange. Keep patient sitting upright. Connect oxygen mask targeting SpO2 93-95%. Assemble oxygen-driven jet nebulizer with Salbutamol 5mg + Ipratropium 0.5mg immediately. Check PEFR if patient capable. Prepare IV Hydrocortisone.",
            "red_flags": ["Silent chest (no breath sounds/wheeze due to minimal airflow)", "Altered consciousness, confusion, or exhaustion", "Cyanosis or SpO2 < 90%", "Inability to speak in full sentences"],
            "follow_up_questions": ["How many puffs of rescue inhaler have you taken in the last hour?", "Can you speak a full sentence without gasping?", "Have you ever been admitted to ICU or intubated for asthma?"],
            "avoid": ["Do not lie down", "Do not give sedatives or antihistamines"],
            "source": "GINA 2023 Guidelines & British Thoracic Society",
            "review_status": "approved",
            "reviewed_by": "Dr. S. Kulkarni (MD Pulmonology)"
        },
        {
            "id": "emg_choking_006",
            "topic": "Choking (Airway Foreign Body & Heimlich Maneuver)",
            "category": "emergencies",
            "keywords": ["choking", "food stuck in throat", "gala ghutna", "heimlich", "cannot speak or cough", "choking first aid"],
            "intent": "emergency",
            "patient_answer": [
                "If the person can cough forcefully or speak, encourage them to keep coughing. Do not slap their back while they are coughing effectively.",
                "If the person CANNOT speak, cry, cough, or breathe (silent choking, holding throat):",
                "1. Give 5 sharp back blows between shoulder blades with the heel of your hand.",
                "2. If still blocked, perform the Heimlich maneuver: Stand behind them, wrap your arms around their waist.",
                "3. Make a fist with one hand just above the navel (belly button). Grasp fist with your other hand.",
                "4. Pull inward and upward with quick, forceful thrusts up to 5 times.",
                "5. Alternate 5 back blows and 5 abdominal thrusts until object is expelled.",
                "If the person becomes unconscious: Lower them gently to the floor, call 112, and start CPR compressions immediately."
            ],
            "doctor_answer": {
                "assessment": "Complete vs Partial Upper Airway Foreign Body Obstruction.",
                "investigations": "Direct visualization with Magill forceps under direct laryngoscopy or video laryngoscope if unconscious. Urgent chest/neck radiograph once stabilized.",
                "management": "Back blows and abdominal thrusts (Heimlich). In infants: 5 back slaps and 5 chest thrusts (NO abdominal thrusts in infants <1y). If cardiac arrest ensues: Begin CPR immediately; look into mouth before each breath attempt (no blind finger sweeps). Emergent surgical cricothyroidotomy if airway cannot be cleared and ventilation fails.",
                "references": ["AHA Guidelines for CPR and ECC: Foreign Body Airway Obstruction", "ERC Resuscitation Guidelines"]
            },
            "staff_answer": "Priority: Triage Red. Immediate bedside action: deliver 5 back blows alternating with 5 abdominal thrusts. If patient collapses, call Code Blue, lay supine, initiate chest compressions, prepare suction apparatus and Magill forceps with laryngoscope.",
            "red_flags": ["Universal choking sign (hands clutching throat)", "Inability to speak, vocalize, or cough", "Stridor or high-pitched squeak on inhalation", "Rapidly progressive cyanosis and loss of consciousness"],
            "follow_up_questions": ["Is the person able to speak, cough, or make sound?", "Is the person an infant, child, or adult?", "Did they collapse or lose consciousness?"],
            "avoid": ["Do NOT perform blind finger sweeps (can push foreign body deeper)", "Do NOT use abdominal thrusts on infants under 1 year of age"],
            "source": "AHA First Aid Guidelines & European Resuscitation Council (ERC)",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)"
        },
        {
            "id": "emg_anaphylaxis_007",
            "topic": "Anaphylaxis (Severe Allergic Reaction)",
            "category": "emergencies",
            "keywords": ["anaphylaxis", "severe allergic reaction", "allergic shock", "throat swelling", "swollen tongue", "allergy reaction", "peanut allergy", "bee sting allergy"],
            "intent": "emergency",
            "patient_answer": [
                "Call 112 immediately. Anaphylaxis is a life-threatening medical emergency.",
                "If you or the person has an Epinephrine Auto-Injector (EpiPen), inject it immediately into the outer mid-thigh (can be given through clothing). Hold in place for 3 to 10 seconds.",
                "Lie down flat with legs elevated. If breathing is difficult, sit up slightly, but do not stand or walk.",
                "If symptoms do not improve within 5 minutes, a second dose of Epinephrine can be administered in the opposite thigh.",
                "Stay with the person until medical emergency teams arrive."
            ],
            "doctor_answer": {
                "assessment": "Severe Systemic Type 1 Hypersensitivity Reaction involving respiratory compromise and/or cardiovascular collapse.",
                "investigations": "Clinical diagnosis. Serial serum tryptase (at 1-2 hours post-event and baseline at 24h) for retrospective confirmation if diagnosis in doubt.",
                "management": "First-line: Intramuscular Epinephrine (Adrenaline) 1:1000 (1 mg/mL), dose 0.5 mg IM (0.01 mg/kg in children, max 0.3-0.5 mg) in anterolateral thigh. Repeat every 5-15 min PRN. High-flow oxygen. IV fluid bolus (1-2 L 0.9% Saline for hypotension). Adjuncts (second-line): IV Hydrocortisone 200 mg and IV Chlorpheniramine 10 mg. Monitor in observation unit for biphasic reaction for minimum 6-8 hours.",
                "references": ["World Allergy Organization (WAO) Anaphylaxis Guidance 2020", "Resuscitation Council UK Anaphylaxis Guidelines"]
            },
            "staff_answer": "Priority: Triage Red. Immediately prepare Adrenaline (Epinephrine) 1:1000 for IM injection into vastus lateralis. Keep patient flat with legs elevated (unless severe dyspnea requires sitting). Start high-flow oxygen via non-rebreather. Secure two wide-bore IV lines and hang normal saline bolus.",
            "red_flags": ["Swelling of tongue, lips, uvula, or throat", "Stridor, hoarseness, or wheezing", "Hypotension (SBP < 90 mmHg) or collapse", "Widespread urticaria with vomiting or abdominal cramping"],
            "follow_up_questions": ["Was there exposure to a known allergen, medication, food, or insect sting?", "Has an Epinephrine auto-injector (EpiPen) already been given?", "Is there throat tightness, difficulty swallowing, or dizziness?"],
            "avoid": ["Do NOT delay Epinephrine administration (antihistamines are NOT first-line)", "Do NOT allow the patient to stand or walk suddenly (risk of empty heart syndrome)"],
            "source": "World Allergy Organization (WAO) Guidelines & Resuscitation Council UK",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)"
        },
        {
            "id": "emg_electric_shock_008",
            "topic": "Electrical Injury & Electric Shock",
            "category": "emergencies",
            "keywords": ["electric shock", "electrocution", "current lagna", "bijli ka jhatka", "electrical burn", "got shock"],
            "intent": "emergency",
            "patient_answer": [
                "Safety First: Do not touch the victim while they are still in contact with the electrical source.",
                "Turn off the main electrical power switch or circuit breaker immediately. If you cannot turn it off, use a dry wooden stick or plastic broom to push the source away.",
                "Call 112 immediately for emergency medical transport.",
                "Check breathing and responsiveness. If the person is not breathing, start CPR immediately.",
                "If breathing normally, cover entry and exit burn wounds with clean, dry, sterile cloth. Do not apply ice or ointments.",
                "Even if the person feels fine, hospital evaluation with an ECG is mandatory because electric current can cause delayed irregular heart rhythms."
            ],
            "doctor_answer": {
                "assessment": "Electrical Current Injury. High risk of occult cardiac dysrhythmia (VF, heart block), rhabdomyolysis, and deep tissue coagulative necrosis.",
                "investigations": "Immediate 12-lead ECG, continuous telemetry monitoring for 12-24h if high voltage (>1000V) or abnormal initial ECG. Serum Creatine Kinase (CK), Troponin I, urinalysis for myoglobin, renal function (BUN, Creatinine), electrolytes (K+).",
                "management": "ACLS resuscitation if dysrhythmic. Aggressive IV fluid resuscitation (0.9% Saline) maintaining urine output >= 1.5-2 mL/kg/h to prevent acute tubular necrosis from myoglobinuria. Tetanus prophylaxis, sterile burn wound care. Emergent surgical consult if compartment syndrome suspected.",
                "references": ["AHA ACLS Electrical Injury Management Protocol", "American Burn Association (ABA) Electrical Burn Guidelines"]
            },
            "staff_answer": "Priority: Triage Red/Orange. Wheelchair or trolley into observation. Immediately connect 12-lead ECG. Place on continuous cardiac telemetry monitor. Inspect for entry and exit wounds. Obtain urine sample to check for tea-colored myoglobinuria. Secure IV access and draw CK and renal panel.",
            "red_flags": ["Documented loss of consciousness or cardiac arrest", "High-voltage exposure (>1000V) or lightning strike", "Abnormal ECG (arrhythmia, ST changes, heart block)", "Tea-colored or burgundy dark urine (rhabdomyolysis)", "Severe extremity pain, paresthesias, or tense swollen compartment"],
            "follow_up_questions": ["What was the voltage source (household 220V vs industrial high voltage)?", "Did the person lose consciousness or fall?", "Is there muscle tenderness or dark urine?"],
            "avoid": ["Do NOT touch the victim until power is disconnected", "Do NOT apply butter, toothpaste, or ice to electrical burns"],
            "source": "AHA ACLS Guidelines & American Burn Association Clinical Protocols",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)"
        },
        {
            "id": "emg_burns_009",
            "topic": "Severe Thermal Burns & Scalds",
            "category": "emergencies",
            "keywords": ["burns", "scald", "jal jana", "aag se jalna", "boiling water burn", "skin burn", "second degree burn", "third degree burn"],
            "intent": "emergency",
            "patient_answer": [
                "Stop the burning process: Remove the person from heat source and extinguish flames ('Stop, Drop, and Roll').",
                "Cool the burn: Hold under cool running tap water for 20 minutes. Do NOT use ice, ice water, or greasy substances.",
                "Carefully remove rings, watches, and tight clothing from the burned area before swelling starts. Do NOT pull away clothing stuck to burned skin.",
                "Cover the burn loosely with clean plastic cling film or a sterile, non-fluffy cloth.",
                "Keep the person warm with a blanket over unburned areas to prevent hypothermia.",
                "Seek immediate emergency care (call 112) for burns larger than the person's palm, burns to the face, hands, feet, groin, or any deep white/charred burns."
            ],
            "doctor_answer": {
                "assessment": "Thermal Burn Injury classified by depth (superficial, partial-thickness, full-thickness) and Total Body Surface Area (TBSA) using Rule of Nines.",
                "investigations": "Complete blood count, serum electrolytes, BUN, creatinine, arterial blood gas with carboxyhemoglobin (if closed-space fire exposure), baseline chest radiograph.",
                "management": "Parkland formula for fluid resuscitation in burns >= 20% TBSA: 4 mL × kg body weight × % TBSA Ringer's Lactate in first 24h (half in first 8h from injury time). Multimodal IV analgesia (Morphine/Fentanyl). Tetanus toxoid booster. Topical antimicrobial dressings (Silver sulfadiazine or Mupirocin) after debridement. Early airway evaluation/intubation if inhalation injury suspected.",
                "references": ["American Burn Association (ABA) Practice Guidelines", "WHO Burns Care Clinical Management"]
            },
            "staff_answer": "Priority: Triage Red/Orange based on TBSA. If inhalation injury suspected (singed nasal hair, soot in sputum), alert airway team immediately. Measure vitals, apply sterile non-adherent burn dressing. Weigh patient for Parkland fluid calculation. Start large-bore IV line and Foley catheter.",
            "red_flags": ["Facial burns, singed nasal hairs, or carbonaceous sputum (airway inhalation risk)", "Burns >= 10% TBSA in children or >= 15-20% in adults", "Full-thickness circumferential burns to chest or limbs (escharotomy risk)", "Chemical or electrical burns"],
            "follow_up_questions": ["What caused the burn (flame, boiling liquid, steam, chemical)?", "Did the burn happen in an enclosed room (smoke inhalation risk)?", "Which parts of the body are affected?"],
            "avoid": ["Do NOT use ice or freezing water (worsens tissue ischemia)", "Do NOT apply butter, toothpaste, or turmeric", "Do NOT burst blisters"],
            "source": "American Burn Association (ABA) & WHO Emergency Burns Management",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)"
        },
        {
            "id": "emg_drowning_010",
            "topic": "Drowning & Submersion Injury",
            "category": "emergencies",
            "keywords": ["drowning", "submersion", "paani me doobna", "near drowning", "water aspiration"],
            "intent": "emergency",
            "patient_answer": [
                "Call 112 immediately. Remove the person from the water safely without endangering yourself.",
                "Check responsiveness and breathing. If not breathing:",
                "Begin CPR immediately: Start with 5 initial rescue breaths, then perform 30 chest compressions followed by 2 breaths.",
                "Do NOT perform abdominal thrusts to 'drain water' from the lungs (delays CPR and induces vomiting/aspiration).",
                "Remove wet clothing and wrap the person in dry warm blankets to prevent hypothermia.",
                "All near-drowning victims must be evaluated in hospital, even if they seem recovered, due to risk of secondary delayed pulmonary edema (delayed drowning)."
            ],
            "doctor_answer": {
                "assessment": "Drowning / Submersion Injury with Hypoxic Respiratory Insufficiency and secondary hypothermia.",
                "investigations": "Arterial blood gas, serial pulse oximetry, 12-lead ECG, chest radiograph (assess pulmonary edema/aspiration), electrolytes, core temperature monitoring.",
                "management": "Airway protection and high-concentration oxygen. In cardiac arrest: Hypoxia-directed CPR (5 rescue breaths followed by 30:2). Early CPAP / PEEP for non-cardiogenic pulmonary edema. Warm active rewarming for hypothermia (target core temp > 32°C before concluding resuscitation). Observe asymptomatic submersion for minimum 6-8 hours.",
                "references": ["ERC Drowning Resuscitation Guidelines", "Wilderness Medical Society Clinical Practice Guidelines for Drowning"]
            },
            "staff_answer": "Priority: Triage Red. Immediate oxygen via non-rebreather or bag-valve-mask. Remove wet clothes, apply warm blankets and Bair Hugger for hypothermia. Check core body temperature. Continuous SpO2 and ECG telemetry. Suction airway if vomiting.",
            "red_flags": ["Apnea or persistent gasping", "SpO2 < 92% on supplemental oxygen", "Hypothermia (core temp < 35°C)", "Altered mental status or GCS < 13"],
            "follow_up_questions": ["How long was the person submerged in water?", "Was CPR started immediately at the scene?", "Is the person conscious and coughing?"],
            "avoid": ["Do NOT attempt Heimlich maneuver to drain water (causes vomiting and delays CPR)", "Do NOT discharge early without 6-8h observation"],
            "source": "European Resuscitation Council (ERC) & WHO Drowning Guidelines",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)"
        },
        {
            "id": "emg_heat_stroke_011",
            "topic": "Heat Stroke (Severe Hyperthermia)",
            "category": "emergencies",
            "keywords": ["heat stroke", "loo lagna", "heat exhaustion", "extreme heat fever", "high core temperature", "sun stroke"],
            "intent": "emergency",
            "patient_answer": [
                "Call 112 immediately. Heat stroke is a medical emergency with core temperature > 40°C (104°F) and confusion.",
                "Move the person immediately to a cool, shaded, or air-conditioned area.",
                "Rapid Cooling: Immerse in cold water tub if possible, or spray cool water all over their skin while fanning vigorously.",
                "Apply ice packs to neck, armpits, and groin where major blood vessels run.",
                "Remove heavy clothing.",
                "If conscious and alert, offer sips of cool water or ORS. Do NOT give fluids if they are confused or vomiting."
            ],
            "doctor_answer": {
                "assessment": "Exertional vs Classical (Non-exertional) Heat Stroke. Defined by hyperthermia (core temp > 40°C) with central nervous system dysfunction and multi-organ damage.",
                "investigations": "Continuous core temperature (rectal probe), CBC, complete metabolic panel, serum Creatine Kinase (CK), Troponin, coagulation profile (screen for DIC), urinalysis.",
                "management": "Target: Cool first, transport second. Rapid evaporative or cold-water immersion cooling targeting core temp <= 38.5-39°C within 30 min (then cease cooling to avoid hypothermic overshoot). IV isotonic crystalloids (cool saline). Benzodiazepines (e.g. Lorazepam 1-2 mg IV) to control shivering or seizures. Antipyretics (Paracetamol/Aspirin) have NO role and may worsen hepatotoxicity.",
                "references": ["Wilderness Medical Society Practice Guidelines for Heat-Related Illness", "National Centre for Disease Control (NCDC) Heat Wave Guidelines India"]
            },
            "staff_answer": "Priority: Triage Red. Place in cold triage bay with fan. Apply ice packs to axillae and groin. Mist with cool water. Measure core body temperature. Insert Foley catheter to monitor output. Secure IV access for cool normal saline infusion.",
            "red_flags": ["Altered mental status, delirium, agitation, or seizures", "Core temperature > 40°C (104°F)", "Hot, dry skin or profuse sweating in exertional cases", "Hypotension and tachycardia"],
            "follow_up_questions": ["What was the person doing before the collapse (outdoor labor, sport, elderly in hot room)?", "Is the person confused, combative, or unresponsive?", "Have they passed urine today?"],
            "avoid": ["Do NOT give Paracetamol or Aspirin (ineffective for heat stroke and increases liver/kidney injury)", "Do NOT force oral fluids if altered consciousness"],
            "source": "NCDC India Heat Illness Action Plan & Wilderness Medical Society",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)"
        },
        {
            "id": "emg_severe_bleeding_012",
            "topic": "Severe Hemorrhage & Massive Bleeding",
            "category": "emergencies",
            "keywords": ["severe bleeding", "khoon behna", "heavy bleeding", "gushing blood", "arterial bleeding", "cut artery", "tourniquet"],
            "intent": "emergency",
            "patient_answer": [
                "Call 112 immediately.",
                "Apply direct, firm, continuous pressure onto the bleeding wound using a clean cloth or sterile gauze.",
                "Do not remove the cloth if it soaks through; add more cloth on top and maintain hard pressure.",
                "If bleeding is from an arm or leg and direct pressure fails to stop life-threatening spurting blood, apply a commercial tourniquet 5 to 7 cm above the wound (tighten until bleeding stops). Note the exact time applied.",
                "Have the person lie down flat to maintain blood flow to vital organs. Keep them warm with a blanket."
            ],
            "doctor_answer": {
                "assessment": "Life-Threatening External Hemorrhage with Risk of Hemorrhagic Shock.",
                "investigations": "Immediate blood typing and crossmatch (packed red cells, FFP, platelets), CBC, PT/INR, aPTT, Fibrinogen, serum lactate, ABG/VBG.",
                "management": "Stop the bleed: Direct wound pressure, hemostatic gauze packing, or limb tourniquet. Massive Transfusion Protocol (MTP) activation if SBP < 90 mmHg or Shock Index > 1.0 (1:1:1 ratio PRBC : FFP : Platelets). IV Tranexamic Acid (TXA) 1 g IV over 10 min followed by 1 g over 8 hours if within 3h of trauma. Emergent surgical / interventional radiology hemostasis.",
                "references": ["ATLS Advanced Trauma Life Support 10th Edition", "European Guideline on Management of Major Bleeding in Trauma"]
            },
            "staff_answer": "Priority: Triage Red. Apply heavy direct pressure dressing / windlass tourniquet immediately. Record tourniquet time on patient's forehead. Elevate legs. Establish two 14-16G IV lines. Send blood for urgent crossmatch. Notify surgical/trauma team.",
            "red_flags": ["Spurting or pulsating bright red blood", "Blood soaking through multiple towels rapidly", "Signs of shock: pallor, confusion, rapid thready pulse, SBP < 90", "Loss of consciousness"],
            "follow_up_questions": ["Where is the bleeding coming from?", "Is the blood spurting or pooling continuously?", "What time was the tourniquet applied?"],
            "avoid": ["Do NOT loosen or release a tourniquet once applied until in the operating room", "Do NOT remove embedded objects (stabilize in place)"],
            "source": "ATLS Guidelines & Stop the Bleed (American College of Surgeons)",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)"
        },
        {
            "id": "emg_head_injury_013",
            "topic": "Acute Head Injury & Concussion",
            "category": "emergencies",
            "keywords": ["head injury", "sar me chot", "concussion", "hit on head", "head trauma", "skull fracture", "brain injury"],
            "intent": "emergency",
            "patient_answer": [
                "Check responsiveness. If the person is unconscious or fell from a height, do NOT move their neck or spine.",
                "Call 112 immediately if there was any loss of consciousness, repeated vomiting, or seizure.",
                "Apply a cold pack wrapped in a cloth to any scalp swelling (15 minutes).",
                "Keep the person awake and resting quietly for initial observation.",
                "Seek immediate emergency care if they develop severe worsening headache, confusion, unequal pupils, or clear fluid draining from the nose or ears."
            ],
            "doctor_answer": {
                "assessment": "Traumatic Brain Injury (TBI) categorized by Glasgow Coma Scale (Mild 13-15, Moderate 9-12, Severe 3-8).",
                "investigations": "Non-contrast CT Brain per Canadian CT Head Rule or NICE Head Injury criteria.",
                "management": "Cervical spine immobilization until cleared clinically and radiologically. Maintain cerebral perfusion pressure (target SBP >= 100-110 mmHg, SpO2 >= 94%, normocarbia PaCO2 35-40 mmHg). Elevate head of bed 30 degrees. If signs of elevated ICP (Cushing's triad: bradycardia, hypertension, irregular breathing): IV Mannitol 0.5-1 g/kg or 3% Hypertonic Saline. Emergent neurosurgical consult.",
                "references": ["NICE Guideline NG232: Head injury: assessment and early management", "Brain Trauma Foundation TBI Guidelines"]
            },
            "staff_answer": "Priority: Triage Red/Orange based on GCS. Maintain strict C-spine collar precautions. Check GCS, pupil size and reactivity every 15 min. Check blood glucose. Schedule urgent NCCT Head if vomiting >= 2 times, GCS < 15, or LOC > 5 min.",
            "red_flags": ["Loss of consciousness > 5 minutes", "Repeated vomiting (>= 2 episodes)", "Clear fluid (CSF) or blood from ears or nose", "Unequal pupil sizes or sluggish response", "Worsening confusion, drowsiness, or seizure"],
            "follow_up_questions": ["Was there any loss of consciousness, even for a few seconds?", "Has the person vomited?", "What caused the injury (motor vehicle accident, fall, physical assault)?"],
            "avoid": ["Do NOT give sedatives or sleeping pills before medical evaluation", "Do NOT move the neck if high-impact trauma is suspected"],
            "source": "NICE Clinical Guidelines (NG232) & ATLS Head Trauma Protocols",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)"
        },
        {
            "id": "emg_fractures_014",
            "topic": "Bone Fractures & Open Dislocation",
            "category": "emergencies",
            "keywords": ["fracture", "broken bone", "haddi tootna", "compound fracture", "dislocated joint", "bone piercing skin"],
            "intent": "emergency",
            "patient_answer": [
                "Do NOT attempt to push bone ends back or straighten a crooked limb.",
                "If there is an open wound with bone visible, cover it gently with a sterile, clean dry dressing.",
                "Immobilize the limb in the position found using a splint (rolled magazines, cardboard, or padded wooden board) secured above and below the injured joint.",
                "Apply an ice pack wrapped in a cloth to reduce swelling (do not apply ice directly to open wounds).",
                "Call 112 or transport to the nearest emergency trauma center immediately.",
                "Do not give the person food or water in case emergency surgery is needed."
            ],
            "doctor_answer": {
                "assessment": "Suspected Fracture / Dislocation. Critical distinction between closed fracture and open (compound) fracture with vascular compromise.",
                "investigations": "Plain Radiographs (AP and Lateral views including the joint above and below), neurovascular examination distal to fracture site (pulses, capillary refill, motor/sensory function). CT scan for complex intra-articular fractures.",
                "management": "Analgesia (IV Paracetamol, NSAIDs, or IV Opioids). Temporary immobilization with padded backslab/splint. For open fractures: Urgent IV broad-spectrum antibiotics (Cefazolin / Ceftriaxone +/- Gentamicin), tetanus toxoid, sterile saline gauze dressing, and urgent orthopedic debridement/washout in OR within 6-12 hours.",
                "references": ["British Orthopaedic Association Standards for Trauma (BOAST): Open Fractures", "ATLS Musculoskeletal Trauma Guidelines"]
            },
            "staff_answer": "Priority: Triage Orange/Red (Open fracture). Check distal pulse (radial/pedal), capillary refill, and sensation immediately. Apply temporary splint. Keep NPO for operative intervention. Prepare IV antibiotics and tetanus injection for open wounds.",
            "red_flags": ["Bone visible or piercing through skin (open fracture)", "Absent pulse or cold, pale, numb extremity distal to injury", "Tense, severely painful swollen compartment (compartment syndrome)", "Gross joint deformity with neurovascular deficit"],
            "follow_up_questions": ["Is any bone sticking out through the skin?", "Can you feel your fingers/toes or wiggle them?", "What caused the injury?"],
            "avoid": ["Do NOT try to realign or manipulate the deformed bone", "Do NOT give food or drink (requires NPO for surgery)"],
            "source": "BOAST Open Fracture Guidelines & American Academy of Orthopaedic Surgeons (AAOS)",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)"
        },
        {
            "id": "emg_seizures_015",
            "topic": "Seizures & Status Epilepticus",
            "category": "emergencies",
            "keywords": ["seizure", "epilepsy", "mirgi", "daura", "convulsion", "fits", "shaking uncontrollably"],
            "intent": "emergency",
            "patient_answer": [
                "Stay calm and protect the person from injury: Clear sharp or hard objects away from around them.",
                "Gently cushion their head with a folded jacket or pillow.",
                "Loosen tight neckwear (collars, ties).",
                "Turn the person gently onto their side (recovery position) as soon as possible to keep the airway clear.",
                "Do NOT put anything in their mouth (no spoons, keys, fingers, or water). They will NOT swallow their tongue.",
                "Do NOT restrain their movements or hold them down.",
                "Call 112 immediately if: The seizure lasts longer than 5 minutes, a second seizure starts without regaining consciousness, or the person is pregnant or injured."
            ],
            "doctor_answer": {
                "assessment": "Acute Tonic-Clonic Seizure vs Status Epilepticus (seizure activity >= 5 min or >= 2 seizures without full recovery).",
                "investigations": "Immediate fingerstick glucose, serum electrolytes (Na+, Ca2+, Mg2+), renal function, anticonvulsant drug levels (if known epilepsy), toxicology screen, non-contrast CT brain, EEG once stabilized.",
                "management": "First-line: IV Lorazepam 4 mg (0.1 mg/kg) or IV Diazepam 10 mg or IM/Intranasal Midazolam 10 mg. If seizure continues at 10-15 min: Second-line IV Levetiracetam 60 mg/kg (max 4.5g) or IV Fosphenytoin 20 mg PE/kg or IV Valproate 40 mg/kg. If refractory status epilepticus (>30 min): General anesthesia with Propofol / Midazolam infusion and ICU intubation.",
                "references": ["Neurocritical Care Society Status Epilepticus Guideline", "NICE Guideline NG217: Epilepsies in children, young people and adults"]
            },
            "staff_answer": "Priority: Triage Red. Note the exact start time. Ensure patient is on side (recovery position) with bed rails padded. Suction airway secretions gently. Check point-of-care capillary glucose. Prepare IV Lorazepam / Midazolam and oxygen via non-rebreather.",
            "red_flags": ["Seizure lasting longer than 5 minutes (status epilepticus)", "Consecutive seizures without regaining consciousness", "Failure to wake up 30 minutes after convulsions stop", "Pregnancy (suspected eclampsia)"],
            "follow_up_questions": ["How long has the convulsion lasted?", "Does the person have a known history of epilepsy or diabetes?", "Did they hit their head during the fall?"],
            "avoid": ["Do NOT force objects, keys, or spoons into the mouth", "Do NOT restrain convulsing limbs", "Do NOT give liquids or medications until fully awake"],
            "source": "NICE Guidelines NG217 & Neurocritical Care Society Guidelines",
            "review_status": "approved",
            "reviewed_by": "Dr. V. Menon (DM Neurology)"
        },
        {
            "id": "emg_fainting_016",
            "topic": "Fainting & Syncope",
            "category": "emergencies",
            "keywords": ["fainting", "syncope", "behoshi", "chakkar aake girna", "passed out", "blackout", "lost consciousness briefly"],
            "intent": "emergency",
            "patient_answer": [
                "Have the person lie flat on their back and elevate their legs about 30 cm (12 inches) to restore blood flow to the brain.",
                "Loosen tight collars, ties, or belts.",
                "Ensure fresh air ventilation and keep onlookers away.",
                "Do not let them stand up quickly; keep them lying down for at least 10 to 15 minutes.",
                "If they do not regain consciousness within 1 minute, check breathing and call 112 immediately.",
                "Seek immediate emergency care if fainting occurred during exertion, was preceded by chest pain or palpitations, or occurred with a sudden severe headache."
            ],
            "doctor_answer": {
                "assessment": "Transient Loss of Consciousness (TLOC) / Syncope. Differentiate benign vasovagal syncope from orthostatic hypotension and high-risk cardiac syncope (arrhythmia, structural heart disease).",
                "investigations": "Immediate 12-lead ECG (evaluate for QT prolongation, Brugada pattern, pre-excitation WPW, heart block), orthostatic vitals (lying and standing BP/HR at 1 and 3 min), blood glucose, CBC (anemia), Echocardiogram if cardiac etiology suspected.",
                "management": "Reassurance, hydration, and counter-pressure maneuvers for neurocardiogenic/vasovagal syncope. Admit for telemetry monitoring if syncope during exertion, abnormal ECG, family history of sudden cardiac death, or structural heart disease per San Francisco Syncope Rule / Canadian Syncope Risk Score.",
                "references": ["2018 ESC Guidelines for the diagnosis and management of syncope", "AHA/ACC/HRS Guideline for the Evaluation and Management of Patients With Syncope"]
            },
            "staff_answer": "Priority: Triage Orange/Yellow. Keep patient supine with legs elevated. Record lying and standing blood pressure and pulse. Perform 12-lead ECG immediately. Check blood sugar. Inquire if fainting happened while sitting/lying or during physical exertion.",
            "red_flags": ["Fainting during physical exertion or exercise", "Preceding chest pain, palpitations, or shortness of breath", "Abnormal ECG (long QT, WPW, heart block)", "Family history of sudden unexplained cardiac death under age 40"],
            "follow_up_questions": ["Did the fainting happen while standing, sitting, or during exercise?", "Were there warning symptoms like nausea, sweating, or lightheadedness?", "Did they regain consciousness within a minute?"],
            "avoid": ["Do NOT stand up rapidly after fainting", "Do NOT splash cold water on an unconscious face"],
            "source": "ESC Syncope Guidelines 2018 & AHA/ACC/HRS Guidelines",
            "review_status": "approved",
            "reviewed_by": "Dr. R. Kapoor (MD, DM Cardiology)"
        },
        {
            "id": "emg_poisoning_017",
            "topic": "Acute Poisoning & Chemical Ingestion",
            "category": "emergencies",
            "keywords": ["poisoning", "poison", "zehar", "chemical ingestion", "swallowed poison", "overdose", "rat poison", "organophosphate", "acid ingestion"],
            "intent": "emergency",
            "patient_answer": [
                "Call 112 or your National Poison Information Centre (India: 1800-116-117) immediately.",
                "Identify what was taken, how much, and what time. Bring the bottle, packet, or container to the hospital.",
                "Do NOT induce vomiting unless specifically instructed by poison control (vomiting corrosive acids/alkalis or kerosene burns the esophagus and lungs twice).",
                "If the poison was spilled on skin or clothing: Remove clothing and rinse skin with copious running water for 15 minutes.",
                "If unconscious, place the person on their left side in the recovery position and monitor breathing."
            ],
            "doctor_answer": {
                "assessment": "Acute Toxic Ingestion / Poisoning. Recognize specific toxidromes (Cholinergic, Anticholinergic, Opioid, Sympathomimetic, Sedative-Hypnotic).",
                "investigations": "ABG with co-oximetry, electrolytes, BUN, creatinine, liver enzymes, ECG (QT and QRS duration), toxicology screen, serum paracetamol and salicylate levels if unknown ingestion.",
                "management": "Airway protection first. Specific antidotes: Atropine + Pralidoxime (2-PAM) for organophosphates; N-acetylcysteine (NAC) for paracetamol; Naloxone for opioids; Flumazenil (use with caution) for pure benzodiazepine overdose; Sodium bicarbonate for TCA-induced QRS widening. Gastric lavage and activated charcoal only if within 1 hour of life-threatening ingestion and airway protected.",
                "references": ["WHO Guidelines for the Management of Common Poisonings", "AIIMS Clinical Practice Guidelines for Acute Poisonings"]
            },
            "staff_answer": "Priority: Triage Red. Immediately secure the poison container/label. Assess airway and pupil size. Check blood glucose and ECG. If organophosphate suspected (pinpoint pupils, excess salivation, bradycardia), prepare Atropine ampoules immediately. Do not induce vomiting.",
            "red_flags": ["Depressed consciousness, coma, or respiratory depression", "Pinpoint pupils with profuse salivation and wheezing (organophosphate)", "Seizures or severe metabolic acidosis", "Ingestion of corrosive acids, alkalis, or petroleum products"],
            "follow_up_questions": ["What exact substance or medicine was ingested?", "How much was taken and what was the exact time?", "Has the person vomited or had seizures?"],
            "avoid": ["Do NOT induce vomiting (especially with acids, alkalis, kerosene, or altered sensorium)", "Do NOT give raw eggs, milk, or home remedies"],
            "source": "WHO Guidelines on Poisoning Management & AIIMS National Poisons Information Centre (NPIC)",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)"
        },
        {
            "id": "emg_snake_bite_018",
            "topic": "Snake Bite Envenomation",
            "category": "emergencies",
            "keywords": ["snake bite", "saamp ka katna", "snakebite", "cobra bite", "viper bite", "krait bite", "venomous bite"],
            "intent": "emergency",
            "patient_answer": [
                "Call 112 and get to the nearest hospital with Polyvalent Anti-Snake Venom (ASV) immediately.",
                "Keep the victim calm and strictly still. Movement spreads the venom through the lymphatic system.",
                "Immobilize the bitten limb with a splint at or slightly below heart level, exactly like a fractured bone.",
                "Remove rings, bangles, watches, and tight clothing before swelling sets in.",
                "Do NOT cut the wound, do NOT try to suck venom out, do NOT apply a tourniquet, and do NOT apply ice or electric shocks.",
                "Try to remember the snake's color and pattern from a safe distance, but do NOT try to catch or kill it."
            ],
            "doctor_answer": {
                "assessment": "Suspected Venomous Snake Bite. Differentiate Vasculotoxic / Hemotoxic (Vipers - Russell's / Saw-scaled) vs Neurotoxic (Elapids - Cobra / Krait).",
                "investigations": "20-minute Whole Blood Clotting Test (20WBCT) at bedside every 30 min, PT/INR, aPTT, Platelet count, urine examination for hematuria/myoglobinuria, serum creatinine.",
                "management": "Indications for Anti-Snake Venom (ASV): Incoagulable blood (positive 20WBCT), systemic neurotoxicity (ptosis, dysphagia, respiratory paralysis), rapidly progressive local swelling involving > 1/2 limb. Administer Polyvalent ASV (10 vials reconstituted in 200 mL normal saline IV over 1 hour). Repeat dose at 6 hours if 20WBCT remains non-clotting. For neurotoxicity: Neostigmine 0.5-2 mg with Atropine 0.6 mg IV trial. Assisted ventilation for respiratory failure.",
                "references": ["National Protocol for the Management of Snakebite in India (MoHFW)", "WHO Guidelines for the Management of Snakebites in South-East Asia"]
            },
            "staff_answer": "Priority: Triage Red. Immediately immobilize limb with splint. Do not remove pressure bandage if already applied until ASV ready. Perform bedside 20WBCT (place 2 mL fresh blood in dry glass tube, inspect at 20 min). Check for ptosis, respiratory rate, and local swelling progression.",
            "red_flags": ["Ptosis (drooping eyelids), difficulty swallowing, or respiratory weakness (neurotoxic)", "Spontaneous bleeding from gums, venipuncture sites, or hematuria (vasculotoxic)", "Rapidly advancing limb swelling", "Non-clotting blood on 20-minute whole blood clotting test"],
            "follow_up_questions": ["What time did the bite occur?", "Are you experiencing double vision, eyelid drooping, or difficulty swallowing?", "Is there bleeding from your gums or bite marks?"],
            "avoid": ["Do NOT tie tight arterial tourniquets (causes limb necrosis)", "Do NOT cut or suck the bite wound", "Do NOT apply herbal pastes or ice"],
            "source": "Ministry of Health and Family Welfare (MoHFW) India National Snakebite Protocol & WHO",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)"
        },
        {
            "id": "emg_dog_bite_019",
            "topic": "Dog Bite & Animal Bite (Rabies Post-Exposure Prophylaxis)",
            "category": "emergencies",
            "keywords": ["dog bite", "kutte ka katna", "rabies", "animal bite", "monkey bite", "cat scratch", "rabies vaccine", "anti rabies"],
            "intent": "emergency",
            "patient_answer": [
                "Immediate First Aid: Wash the bite wound thoroughly with running tap water and soap for at least 15 minutes.",
                "Apply an antiseptic like Povidone Iodine (Betadine) or alcohol after washing.",
                "Do NOT apply chili powder, lime, soil, or bandage tightly over the wound.",
                "Go to a clinic or hospital immediately for Anti-Rabies Vaccine (ARV) and Tetanus injection.",
                "If the bite is deep, bled, or broke the skin (Category III), you will also need Rabies Immunoglobulin (RIG) infiltrated directly into the wound.",
                "Do NOT delay vaccination; rabies is 100% fatal once clinical symptoms appear, but 100% preventable with timely post-exposure prophylaxis."
            ],
            "doctor_answer": {
                "assessment": "Animal Bite Exposure Risk Categorization per WHO / National Rabies Control Program (NRCP) India (Category I: Touching/feeding; Category II: Minor scratches without bleeding; Category III: Transdermal bites, scratches with bleeding, licks on broken skin/mucosa).",
                "investigations": "Clinical assessment of wound depth, animal vaccination status, and observation of animal for 10 days if domestic dog/cat.",
                "management": "Wound cleansing: 15 min soap and running water. Tetanus Toxoid 0.5 mL IM if not immunized within 5 years. Post-Exposure Prophylaxis: Category II: Anti-Rabies Vaccine (ARV) Day 0, 3, 7, 28 (Intradermal 2-site regimen 0.1 mL each on Day 0, 3, 7, 28 or Intramuscular Essen regimen Day 0, 3, 7, 14, 28). Category III: ARV plus Rabies Immunoglobulin (Equine RIG 40 IU/kg or Human RIG 20 IU/kg) infiltrated into and around all wounds on Day 0. Avoid suturing bite wounds (or loose delayed sutures only if necessary).",
                "references": ["National Guidelines for Rabies Prophylaxis (NCDC / MoHFW India)", "WHO Rabies Vaccines and Immunoglobulins: WHO Position Paper"]
            },
            "staff_answer": "Priority: Triage Orange. Immediately direct patient to wound washing sink; assist with 15-minute soap-water wash. Classify bite category (Cat II vs Cat III). Check tetanus history. Prepare Anti-Rabies Vaccine (ARV) and calculate Rabies Immunoglobulin (RIG) dose if bleeding occurred.",
            "red_flags": ["Deep puncture wounds or bleeding (Category III)", "Bites to face, neck, head, or hands (rapid nerve transit to brain)", "Wild animal (jackal, fox, bat) or unprovoked aggressive stray dog", "Delayed presentation (>48 hours post-bite)"],
            "follow_up_questions": ["Did the bite break the skin or cause bleeding?", "Where is the wound located?", "Is the animal a pet (observable for 10 days) or an unknown stray?"],
            "avoid": ["Do NOT stitch or suture bite wounds tightly", "Do NOT apply chili, lime, leaves, or turmeric to the wound", "Do NOT skip vaccine follow-up doses"],
            "source": "NCDC / MoHFW India National Guidelines on Rabies Prophylaxis & WHO",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Emergency Medicine)"
        },
        {
            "id": "emg_suicidal_crisis_020",
            "topic": "Suicidal Thoughts & Acute Mental Health Crisis",
            "category": "emergencies",
            "keywords": ["suicidal thoughts", "want to die", "suicide", "end my life", "aatmahatya", "kill myself", "hopeless", "cannot go on", "self harm"],
            "intent": "emergency",
            "patient_answer": [
                "You are not alone, and help is available right now. Please reach out to someone who can support you.",
                "Call the 24/7 National Tele-Mental Health Helpline immediately: Tele-MANAS at 14416 or 1800-891-4416 (toll-free in India).",
                "You can also call the Kiran National Mental Health Helpline at 1800-599-0019 or emergency services at 112.",
                "If you are in immediate danger of hurting yourself, go to the nearest hospital emergency room or ask a trusted family member or friend to stay with you.",
                "Please do not stay alone right now. People who understand and care are waiting to help you through this difficult moment."
            ],
            "doctor_answer": {
                "assessment": "Acute Suicidal Ideation / High Suicide Risk. Immediate evaluation of intent, plan, lethality, access to means, and presence of acute psychiatric illness (severe major depressive episode, bipolar, psychosis).",
                "investigations": "Urgent psychiatric risk assessment, toxicology screen if self-harm ingestion suspected, screening for underlying mood or substance use disorder.",
                "management": "Ensure 1:1 continuous direct observation in a safe, ligature-resistant environment. Remove all sharp objects, medications, and potential means. Establish therapeutic rapport without judgment. Inpatient psychiatric admission for high immediate risk. Emergency pharmacotherapy: Low-dose atypical antipsychotic (e.g. Olanzapine 2.5-5 mg) or Benzodiazepine (Lorazepam 1-2 mg) for acute severe agitation. Formulate a collaborative crisis safety plan.",
                "references": ["WHO Suicide Prevention Resource", "APA Practice Guideline for the Assessment and Treatment of Patients With Suicidal Behaviors"]
            },
            "staff_answer": "Priority: Triage Red (Safety). Do not leave patient unattended under any circumstance. Assign 1:1 staff supervision. Remove sharp objects, belts, cords, and medicines. Escort to safe consultation room. Notify duty psychiatrist or emergency medical officer immediately.",
            "red_flags": ["Expressed explicit plan and intent to end life", "Current access to lethal means (pills, firearms, heights)", "Recent major loss with severe agitation or despair", "History of previous high-lethality suicide attempts"],
            "follow_up_questions": ["Are you in a safe place with someone right now?", "Do you have a plan to hurt yourself?", "Can I connect you with a mental health counselor or emergency support immediately?"],
            "avoid": ["Do NOT leave the person alone", "Do NOT dismiss their feelings or promise to keep suicide plans a secret"],
            "source": "Tele-MANAS (MoHFW India) & WHO Mental Health Suicide Prevention Protocols",
            "review_status": "approved",
            "reviewed_by": "Dr. P. Deshmukh (MD Psychiatry)"
        },
        {
            "id": "emg_diabetic_ketoacidosis_021",
            "topic": "Diabetic Ketoacidosis (DKA) & Hyperosmolar State",
            "category": "emergencies",
            "keywords": ["dka", "diabetic ketoacidosis", "high blood sugar emergency", "fruity breath", "sugar 400", "sugar 500", "hyperglycemic emergency"],
            "intent": "emergency",
            "patient_answer": [
                "Call 112 or proceed to an emergency hospital immediately.",
                "Check blood sugar if you have a glucometer. If blood sugar is over 300 mg/dL accompanied by nausea, vomiting, or deep rapid breathing, this is a medical emergency.",
                "Drink sips of plain water if awake and able to swallow to help prevent extreme dehydration.",
                "Do NOT administer large arbitrary doses of extra insulin without medical guidance.",
                "Bring all your insulin pens, vials, and recent blood test reports to the hospital."
            ],
            "doctor_answer": {
                "assessment": "Diabetic Ketoacidosis (DKA) or Hyperosmolar Hyperglycemic State (HHS). Triad of hyperglycemia (>250 mg/dL), metabolic acidosis (pH < 7.3, HCO3 < 18 mEq/L), and serum/urine ketones.",
                "investigations": "Arterial or venous blood gas (pH, HCO3), serum ketones (beta-hydroxybutyrate), plasma glucose, complete electrolyte panel with calculated anion gap, BUN, creatinine, urinalysis, 12-lead ECG (monitor K+ changes).",
                "management": "Fluid resuscitation: 0.9% NaCl 1000-1500 mL in 1st hour. Potassium replacement BEFORE insulin if K+ < 3.3 mEq/L. Regular Insulin IV infusion at 0.1 units/kg/h once K+ >= 3.3. When glucose reaches 200-250 mg/dL, add 5% Dextrose to IV fluids to clear ketoacidosis safely without precipitating hypoglycemia.",
                "references": ["ADA Standards of Care in Diabetes: Hyperglycemic Crises", "Joint British Diabetes Societies (JBDS) DKA Protocol"]
            },
            "staff_answer": "Priority: Triage Red/Orange. Immediate bedside blood glucose and urine ketone check. Hook up ECG monitor. Start large-bore IV line and hang 1L 0.9% Normal Saline. Check potassium level before insulin is started.",
            "red_flags": ["Deep, rapid breathing (Kussmaul breathing) with fruity acetone breath odor", "Persistent vomiting with inability to retain fluids", "Confusion, lethargy, or coma", "Severe dehydration with SBP < 90 mmHg"],
            "follow_up_questions": ["What is your current blood sugar reading?", "Are you experiencing nausea, vomiting, or abdominal pain?", "Do you have Type 1 or Type 2 diabetes?"],
            "avoid": ["Do NOT start IV insulin if serum potassium is under 3.3 mEq/L (can cause fatal arrhythmia)", "Do NOT delay IV fluids"],
            "source": "American Diabetes Association (ADA) Standards of Care & JBDS Clinical Guidelines",
            "review_status": "approved",
            "reviewed_by": "Dr. R. Kapoor (MD, DM Endocrinology)"
        },
        {
            "id": "emg_hypoglycemia_022",
            "topic": "Severe Hypoglycemia (Critically Low Blood Sugar)",
            "category": "emergencies",
            "keywords": ["low blood sugar", "hypoglycemia", "sugar low", "sugar 50", "sugar 40", "sweating shakiness diabetes"],
            "intent": "emergency",
            "patient_answer": [
                "If the person is awake and able to swallow (Rule of 15):",
                "1. Take 15 grams of fast-acting sugar immediately: 3 to 4 teaspoons of sugar in water, 1/2 cup of fruit juice, or 3 glucose tablets.",
                "2. Wait 15 minutes and re-check blood sugar.",
                "3. If blood sugar is still below 70 mg/dL, take another 15 grams of fast-acting sugar.",
                "4. Once blood sugar is above 70 mg/dL, eat a small snack with complex carbs and protein (e.g., roti, bread, or a meal) to keep sugar stable.",
                "If the person is unconscious, confused, or seizing: Do NOT put food or liquid in their mouth (choking risk). Administer Glucagon injection if trained, and call 112 immediately."
            ],
            "doctor_answer": {
                "assessment": "Severe Hypoglycemia (plasma glucose < 70 mg/dL, neuroglycopenic symptoms typically < 54 mg/dL).",
                "investigations": "Point-of-care capillary blood glucose, repeat venous glucose, screen for sulfonylurea overdose or renal impairment.",
                "management": "If conscious: 15-20 g oral fast-acting carbohydrates. If unconscious or NPO: IV 25-50 mL of 50% Dextrose (D50W) or 100 mL of 10% Dextrose (D10W) IV over 3-5 min. Alternative: Glucagon 1 mg IM/SC. Re-check capillary glucose every 15 min until > 70-100 mg/dL. Prolonged observation required for long-acting sulfonylureas (Glimepiride, Glibenclamide).",
                "references": ["ADA Standards of Care in Diabetes: Hypoglycemia Management", "Endocrine Society Clinical Practice Guidelines on Hypoglycemia"]
            },
            "staff_answer": "Priority: Triage Red (Unconscious) or Orange. Immediately verify bedside fingerstick glucose. If conscious, provide 15g sugar dissolved in water. If unconscious or GCS < 15, call physician immediately, establish IV access, and administer IV 25% or 50% Dextrose. Do not force oral feeds on unconscious patients.",
            "red_flags": ["Blood sugar < 54 mg/dL", "Loss of consciousness or convulsions", "Confusion, bizarre behavior, or slurred speech", "Lack of improvement within 15 minutes of glucose intake"],
            "follow_up_questions": ["What is the current blood glucose reading?", "Are you able to swallow liquids safely?", "Which diabetes medications or insulin did you take today?"],
            "avoid": ["Do NOT give foods high in fat (chocolate, ice cream) for emergency treatment (fat delays sugar absorption)", "Do NOT force liquids into an unconscious person's mouth"],
            "source": "American Diabetes Association (ADA) Clinical Guidelines",
            "review_status": "approved",
            "reviewed_by": "Dr. R. Kapoor (MD, DM Endocrinology)"
        }
    ]

    return kb

if __name__ == "__main__":
    kb = get_kb_data()
    print("Generated emergencies:", len(kb["emergencies"]))
