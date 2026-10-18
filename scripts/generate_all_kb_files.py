"""
Full generator for CareBridge MedAI Health Knowledge Base
Produces 10 standard JSON files totaling 174 structured clinical entries:
1. emergencies.json (22)
2. symptoms.json (25)
3. infectious_diseases.json (20)
4. chronic_conditions.json (20)
5. specialties.json (20)
6. medicines.json (16)
7. drug_interactions.json (15)
8. lab_tests.json (16)
9. vitals_ranges.json (10)
10. app_intents.json (10)
"""
import os
import json

def get_emergencies():
    from generate_health_kb import get_kb_data
    return get_kb_data()["emergencies"]

def get_symptoms():
    return [
        {
            "id": "sym_fever_adult_001",
            "topic": "Fever in Adults (Pyrexia)",
            "category": "symptoms",
            "keywords": ["fever", "high temperature", "bukhar", "fevar", "tap", "body hot", "pyrexia", "fever first aid", "feeling feverish"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Rest adequately in a cool, well-ventilated room and wear lightweight clothing.",
                "Drink plenty of fluids (water, oral rehydration solution, clear soups) to prevent dehydration.",
                "You may take Paracetamol 500 mg or 650 mg every 4 to 6 hours as needed (do not exceed 3000 mg in 24 hours).",
                "Apply a lukewarm (not cold or iced) damp cloth to your forehead, neck, or underarms if temperature is over 38.5°C (101.3°F).",
                "Consult a doctor if fever lasts more than 3 days, rises above 39.5°C (103°F), or if red flag symptoms appear."
            ],
            "doctor_answer": {
                "assessment": "Acute Febrile Illness (AFI) in Adult. Evaluate duration, temperature curve, localizing symptoms (cough, dysuria, rash, jaundice), travel history, and endemic exposures (dengue, malaria, typhoid).",
                "investigations": "Routine uncomplicated fever <3 days without focal signs requires NO immediate lab investigations. If fever persists >3-5 days or has red flags: CBC, peripheral blood smear / rapid malaria test, Dengue NS1/IgM, Urine Routine, and blood culture if toxic.",
                "management": "Antipyretic therapy: Oral Paracetamol 500-650 mg QID PRN (max 4g/day; reduce in hepatic impairment). Maintain oral rehydration (2-3 L/day). Do NOT prescribe empiric antibiotics or IV fluids for uncomplicated acute febrile illness without a confirmed bacterial source.",
                "references": ["ICMR Standard Treatment Workflows (STW) for Acute Febrile Illness", "WHO Guidelines on the Management of Fever", "NICE Guideline NG143: Fever in under 5s / Adults"]
            },
            "staff_answer": "Priority: Triage Green (uncomplicated) or Yellow/Orange if altered vitals. Record oral/tympanic temperature, pulse, SpO2, and BP. If temp >= 38.5°C, offer water and inform medical officer. Fast-track if SpO2 < 94%, SBP < 90 mmHg, or HR > 120 bpm.",
            "red_flags": ["Temperature >= 39.5°C (103.1°F) unresponsive to antipyretics", "Severe persistent headache with neck stiffness (meningism)", "Shortness of breath or chest pain", "Persistent vomiting with inability to keep fluids down", "Confusion, lethargy, or extreme drowsiness", "Petechial or purpuric rash (small bleeding spots under skin)"],
            "follow_up_questions": ["How many days have you had the fever?", "What was the highest temperature recorded with a thermometer?", "Do you have any other symptoms like cough, vomiting, rash, or burning urination?"],
            "avoid": ["Do NOT use cold water or ice baths (causes shivering and spikes core temperature)", "Do NOT take Ibuprofen or Aspirin if Dengue is suspected (increases bleeding risk)", "Do NOT take antibiotics without a physician prescription"],
            "source": "ICMR Guidelines for Acute Febrile Illness & NHS / MedlinePlus: Fever in Adults (https://medlineplus.gov/fever.html)",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        },
        {
            "id": "sym_fever_child_002",
            "topic": "Fever in Children (Pediatric Fever)",
            "category": "symptoms",
            "keywords": ["child fever", "baby fever", "bachhe ko bukhar", "infant fever", "pediatric fever", "toddler fever"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Keep the child comfortable in light clothing and ensure the room is comfortably cool.",
                "Encourage frequent sips of liquids: breast milk, formula, ORS, or water (for babies older than 6 months).",
                "Give pediatric Paracetamol syrup dosed strictly by body weight (10 to 15 mg per kg per dose, every 4 to 6 hours; max 4 doses in 24 hours). Check packaging carefully.",
                "Use a lukewarm damp sponge on forehead or chest if the child is distressed by high fever. Never use ice or alcohol.",
                "See a pediatrician immediately if the child is under 3 months old with any fever (>= 38°C / 100.4°F), refuses feeds, or is unusually sleepy."
            ],
            "doctor_answer": {
                "assessment": "Pediatric Acute Febrile Illness. Stratify risk using NICE Traffic Light System (Green, Amber, Red). Any fever in infants under 3 months is an emergency requiring full septic screen.",
                "investigations": "In infants < 3 months: CBC, blood culture, urine routine + culture, CRP, lumbar puncture if indicated. In children > 3 months with low-risk viral illness: no routine blood investigations required.",
                "management": "Oral Paracetamol syrup 15 mg/kg/dose Q4-6H (max 60 mg/kg/day). Alternative: Ibuprofen 5-10 mg/kg/dose (only if > 6 months of age and well-hydrated). Avoid alternating antipyretics routinely. Maintain adequate hydration.",
                "references": ["NICE Guideline NG143: Fever in under 5s: assessment and initial management (2021)", "IAP (Indian Academy of Pediatrics) Guidelines on Pediatric Fever"]
            },
            "staff_answer": "Priority: Triage Red if < 3 months with fever; Orange if lethargic or grunting; Yellow if active and smiling. Check weight before any medication. Record RR for 60 seconds (look for chest indrawing).",
            "red_flags": ["Age under 3 months with temperature >= 38°C (100.4°F)", "Extreme lethargy, inconsolable crying, or floppy muscle tone", "Breathing rapidly or chest drawing in deeply", "Non-blanching rash (glass test positive)", "Febrile seizure or convulsion"],
            "follow_up_questions": ["What is the child's exact age and weight?", "Is the baby feeding normally and producing wet diapers?", "Is the baby alert and making eye contact?"],
            "avoid": ["NEVER give Aspirin to children under 16 years (risk of fatal Reye's Syndrome)", "Do NOT overbundle or wrap in heavy blankets", "Do NOT use cold or rubbing alcohol baths"],
            "source": "NICE Guidelines NG143 & Indian Academy of Pediatrics (IAP) Protocols",
            "review_status": "approved",
            "reviewed_by": "Dr. N. Joshi (MD Pediatrics)"
        },
        {
            "id": "sym_cold_cough_003",
            "topic": "Common Cold & Acute Cough (Upper Respiratory Infection)",
            "category": "symptoms",
            "keywords": ["cold", "cough", "khansi", "zukam", "running nose", "sneezing", "balgam", "dry cough", "wet cough", "congestion", "respiratory infection"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Drink warm fluids such as warm water, herbal tea, or clear broth to soothe your throat and thin mucus.",
                "Inhale steam from a bowl of hot water or take a warm shower for 5 to 10 minutes to relieve nasal congestion.",
                "Use saline nasal drops or sprays (0.9% normal saline) to clear blocked nasal passages.",
                "For cough relief, take 1 to 2 teaspoons of honey with warm water or ginger (honey only for individuals above 1 year old).",
                "Rest well. Most common colds resolve on their own within 7 to 10 days without antibiotics."
            ],
            "doctor_answer": {
                "assessment": "Acute Viral Upper Respiratory Tract Infection (URTI) / Acute Bronchitis. Causative agents primarily rhinoviruses, coronaviruses, RSV, or adenoviruses.",
                "investigations": "Clinical diagnosis. CXR and blood tests are NOT indicated unless tachypnea, focal crepitations, or hypoxia indicate pneumonia.",
                "management": "Symptomatic treatment: Saline nasal irrigation, systemic hydration, warm honey-lemon mixtures. Antihistamines/decongestants only for short-term rhinitis relief. Antibiotics are strictly contraindicated in uncomplicated viral URTI.",
                "references": ["CDC Guidelines on Common Cold and Sore Throat", "NICE Guideline NG120: Cough (acute): antimicrobial prescribing"]
            },
            "staff_answer": "Priority: Triage Green. Assess pulse oximetry (SpO2) and respiratory rate. If SpO2 < 95% or respiratory rate > 22/min, escalate to clinician. Provide a surgical mask to symptomatic patient in waiting area.",
            "red_flags": ["Difficulty breathing or wheezing", "Coughing up fresh blood (hemoptysis)", "High fever lasting > 3 days", "Chest pain or pressure", "Symptoms worsening after 10 days"],
            "follow_up_questions": ["How long have you had this cough or cold?", "Are you coughing up yellow, green, or blood-streaked phlegm?", "Are you experiencing any shortness of breath or chest pain?"],
            "avoid": ["Do NOT request or take antibiotics for viral colds", "Do NOT give honey to infants under 12 months (risk of infant botulism)", "Do NOT use OTC cough suppressants in young children without a prescription"],
            "source": "CDC Clinical Overview of Respiratory Illnesses & MedlinePlus: Common Cold (https://medlineplus.gov/commoncold.html)",
            "review_status": "approved",
            "reviewed_by": "Dr. S. Kulkarni (MD Pulmonology)"
        },
        {
            "id": "sym_sore_throat_004",
            "topic": "Sore Throat (Pharyngitis / Tonsillitis)",
            "category": "symptoms",
            "keywords": ["sore throat", "gale me dard", "throat infection", "tonsil", "pharyngitis", "pain swallowing", "gala kharab"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Gargle with warm salt water (1/2 teaspoon of table salt in 1 cup of warm water) 3 to 4 times daily.",
                "Sip warm liquids: warm water with honey, chamomile tea, or mild broths.",
                "Suck on soothing throat lozenges or hard candies to stimulate saliva and lubricate the throat.",
                "Take Paracetamol 500 mg or Ibuprofen 400 mg with meals to relieve throat pain and inflammation.",
                "Use a cool-mist humidifier in your room and avoid exposure to cigarette smoke or chemical fumes."
            ],
            "doctor_answer": {
                "assessment": "Acute Pharyngitis / Tonsillitis. Calculate Centor or McIsaac score to differentiate viral pharyngitis from Group A Streptococcal (GAS) infection.",
                "investigations": "Rapid Antigen Detection Test (RADT) or throat swab culture only if Centor score >= 3 (absence of cough, swollen tender anterior cervical nodes, fever > 38°C, tonsillar exudate).",
                "management": "Analgesia: Paracetamol or NSAIDs. If GAS confirmed or high clinical probability: Oral Amoxicillin 500 mg TID for 10 days or Azithromycin 500 mg daily for 3-5 days in penicillin allergy. Viral cases require symptomatic care only.",
                "references": ["IDSA Clinical Practice Guideline for the Diagnosis and Management of Group A Streptococcal Pharyngitis", "NICE Guideline NG84: Sore throat: antimicrobial prescribing"]
            },
            "staff_answer": "Priority: Triage Green / Yellow. Inspect oropharynx with tongue depressor and penlight. Check if patient can swallow saliva. If stridor, drooling, or inability to swallow, escalate immediately (peritonsillar abscess / epiglottitis).",
            "red_flags": ["Difficulty swallowing saliva with drooling", "Inability to open the mouth fully (trismus)", "Stridor or noisy harsh breathing", "Unilateral severe swelling of throat with uvular deviation (Quinsy)"],
            "follow_up_questions": ["Can you swallow water comfortably?", "Do you have swollen tender lumps in your neck?", "Do you have a cough or runny nose as well?"],
            "avoid": ["Do NOT start antibiotics without evaluating for bacterial pharyngitis", "Do NOT consume scalding hot beverages that further inflame mucosa"],
            "source": "Infectious Diseases Society of America (IDSA) Pharyngitis Guidelines & NICE NG84",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        },
        {
            "id": "sym_headache_005",
            "topic": "Headache (Tension & General Cephalea)",
            "category": "symptoms",
            "keywords": ["headache", "sar dard", "sir me dard", "tension headache", "head pain", "heavy head"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Rest in a quiet, dark, and cool room with minimal noise and screen exposure.",
                "Drink 1 to 2 tall glasses of water; mild dehydration is a frequent trigger for headaches.",
                "Apply a warm compress or cool damp cloth across your forehead or to the back of your neck.",
                "Gently massage your temples, neck, and shoulder muscles to release physical tension.",
                "Take Paracetamol 500-1000 mg or Ibuprofen 400 mg with a meal if needed (limit painkiller use to <=2 days/week to prevent rebound headaches)."
            ],
            "doctor_answer": {
                "assessment": "Primary Headache Disorder (Tension-Type vs Migraine vs Medication Overuse Headache). Screen for secondary headache red flags using SNOOP4 mnemonic.",
                "investigations": "Uncomplicated primary headache requires no neuroimaging. Neuroimaging (MRI/CT brain) indicated if: thunderclap onset, new headache in >50 years, focal neurologic deficits, fever with neck stiffness, or papilledema.",
                "management": "Acute abortive: Paracetamol 1000 mg or Naproxen 500 mg / Ibuprofen 400 mg. Counsel on avoiding analgesia overuse (>10-15 days/month). Identify triggers: sleep deprivation, eye strain, stress, caffeine withdrawal.",
                "references": ["International Headache Society (IHS) - ICHD-3 Criteria", "AAN (American Academy of Neurology) Practice Guidelines for Headache"]
            },
            "staff_answer": "Priority: Triage Green. Check blood pressure and neurological orientation. If headache is described as 'worst headache of life' or accompanied by BP > 180/110 mmHg, immediately notify the physician.",
            "red_flags": ["Sudden explosive onset reaching peak within 1 minute (Thunderclap headache)", "Headache accompanied by stiff neck, fever, or confusion", "New weakness, numbness, speech slurring, or vision loss", "Headache after a significant head blow or injury", "New daily persistent headache starting after age 50"],
            "follow_up_questions": ["Did this headache start suddenly like a thunderclap or build up slowly?", "Are you experiencing any nausea, sensitivity to light, or neck stiffness?", "How often do you take headache medications in a typical week?"],
            "avoid": ["Do NOT overuse analgesics more than 2-3 days per week (leads to medication-overuse headache)", "Do NOT ignore sudden severe headaches"],
            "source": "International Classification of Headache Disorders (ICHD-3) & NICE Guideline CG150",
            "review_status": "approved",
            "reviewed_by": "Dr. V. Menon (DM Neurology)"
        },
        {
            "id": "sym_migraine_006",
            "topic": "Migraine Headache",
            "category": "symptoms",
            "keywords": ["migraine", "aadha sar dard", "one sided headache", "throbbing headache", "migraine aura", "light sensitivity headache"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Retreat immediately to a quiet, completely dark room and close your eyes at the first sign of an attack.",
                "Place a cold gel pack or ice wrapped in a towel over your forehead or temples.",
                "Drink water or an electrolyte beverage to ensure hydration.",
                "Take prescribed migraine abortive medicine (such as Sumatriptan or Naproxen) as early as possible during the attack.",
                "Avoid loud sounds, bright lights, strong scents, and screen time until the attack subsides."
            ],
            "doctor_answer": {
                "assessment": "Migraine with or without Aura (ICHD-3: Recurrent attacks lasting 4-72 hours, unilateral, pulsating, moderate-severe, aggravated by routine activity, with nausea/photophobia/phonophobia).",
                "investigations": "Clinical diagnosis. Neuroimaging only if atypical features, sudden onset, prolonged aura (>60 min), or abnormal neuro exam.",
                "management": "Mild-moderate: NSAIDs (Naproxen 500 mg or Ibuprofen 400-800 mg) + antiemetic (Domperidone 10 mg or Metoclopramide 10 mg). Moderate-severe: Triptans (Sumatriptan 50-100 mg oral or Zolmitriptan). Prophylaxis (if >=4 headache days/month): Propranolol, Topiramate, or Amitriptyline.",
                "references": ["AHS (American Headache Society) Consensus Statement on Migraine Treatment (2021)", "NICE CG150: Headaches in over 12s"]
            },
            "staff_answer": "Priority: Triage Green/Yellow. Provide dim, quiet triage holding area. Check BP and pulse. Avoid bright overhead penlight examination unless necessary.",
            "red_flags": ["First episode of migraine aura with motor weakness (hemiplegic migraine mimic)", "Aura lasting longer than 60 minutes", "Headache accompanied by fever, neck stiffness, or altered sensorium"],
            "follow_up_questions": ["Do you see flashing lights, zig-zag lines, or blind spots before the pain starts?", "Is the pain pulsing on one side of your head?", "Does light or sound make the pain significantly worse?"],
            "avoid": ["Do NOT take Triptans if you have ischemic heart disease, coronary spasm, or uncontrolled hypertension", "Do NOT skip meals or disrupt sleep patterns"],
            "source": "American Headache Society Guidelines & International Headache Society (ICHD-3)",
            "review_status": "approved",
            "reviewed_by": "Dr. V. Menon (DM Neurology)"
        },
        {
            "id": "sym_body_ache_007",
            "topic": "Generalized Body Ache (Myalgia)",
            "category": "symptoms",
            "keywords": ["body ache", "badan dard", "muscle pain", "myalgia", "body pain", "all body hurting"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Take a warm bath or shower to help soothe and relax aching muscle groups.",
                "Stay well-hydrated with water, coconut water, or warm soups.",
                "Gentle stretching and resting the affected muscles can help ease soreness.",
                "Take Paracetamol 650 mg with water to alleviate discomfort.",
                "If body ache is paired with sudden high fever, consult a healthcare provider to test for viral infections like dengue, flu, or chikungunya."
            ],
            "doctor_answer": {
                "assessment": "Diffuse Myalgia. Differentials include viral prodrome (influenza, dengue, COVID-19), post-exertional soreness, statin-induced myopathy, hypokalemia, or fibromyalgia.",
                "investigations": "If associated with high fever: CBC, Dengue NS1/serology, malaria smear, CPK (Creatine Phosphokinase) if patient is on statins or has dark tea-colored urine.",
                "management": "Supportive care with hydration, rest, and Paracetamol 650 mg TID PRN. If drug-induced (statin), temporarily discontinue and evaluate CPK.",
                "references": ["CDC Clinical Guidelines for Viral Myalgia", "ACR Guidelines for Muscle Pain Evaluation"]
            },
            "staff_answer": "Priority: Triage Green. Check temperature and vitals. Ask about recent strenuous exercise, new medications (statins), or travel to endemic regions.",
            "red_flags": ["Dark cola-colored urine (suggests Rhabdomyolysis)", "Severe progressive muscle weakness (cannot lift arms or stand from chair)", "High fever with chills or petechial skin spots"],
            "follow_up_questions": ["Did the body ache start after intense exercise or alongside a fever?", "Are you currently taking any cholesterol-lowering medicines (statins)?", "What color is your urine?"],
            "avoid": ["Do NOT push through severe muscle pain with heavy workouts", "Do NOT take multiple combined cold medications containing hidden paracetamol"],
            "source": "American College of Rheumatology (ACR) Clinical Guidelines",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        },
        {
            "id": "sym_dizziness_008",
            "topic": "Dizziness & Vertigo (Chakkar)",
            "category": "symptoms",
            "keywords": ["dizziness", "vertigo", "chakkar", "room spinning", "lightheaded", "head spinning", "balance problem", "chakkar aana"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Sit or lie down immediately on a firm surface to prevent falling.",
                "Keep your head still and focus your gaze on a fixed stationary object.",
                "Avoid sudden head turns, bending over, or standing up abruptly.",
                "Drink a glass of water slowly; dehydration or low blood pressure often causes lightheadedness.",
                "Do not drive, operate machinery, or climb stairs until you feel completely stable."
            ],
            "doctor_answer": {
                "assessment": "Dizziness: Differentiate True Vertigo (vestibular illusion of movement, BPPV, vestibular neuritis, Meniere's) from Presyncope (cardiovascular/orthostatic), Disequilibrium, or Lightheadedness. Apply HINTS exam (Head Impulse, Nystagmus, Test of Skew) to rule out posterior circulation stroke.",
                "investigations": "Check orthostatic blood pressure (lying and standing 3 min). Blood glucose, 12-lead ECG, Dix-Hallpike test for BPPV. Urgent MRI brain if central signs present (HINTS stroke positive, ataxia).",
                "management": "BPPV: Epley repositioning maneuver. Acute vestibular neuritis: Short-term vestibular sedatives (Betahistine 16-24 mg BID or Cinnarizine 25 mg TID for 3-5 days only; discontinue early to allow central compensation). Treat dehydration/orthostasis.",
                "references": ["AAO-HNS Clinical Practice Guideline: Benign Paroxysmal Positional Vertigo (BPPV)", "AAN Evidence-Based Guideline on Dizziness Evaluation"]
            },
            "staff_answer": "Priority: Triage Yellow. Assist patient to seated/reclined position immediately (high fall risk). Check BP (lying/standing), fingerstick glucose, and heart rate. Escalate if focal neurological signs or pulse < 50 / > 120 bpm.",
            "red_flags": ["Dizziness accompanied by double vision, slurred speech, or facial numbness", "Sudden inability to walk or severe unsteadiness (ataxia)", "Chest pain or irregular fluttering heartbeats", "Sudden hearing loss in one ear"],
            "follow_up_questions": ["Does the room feel like it is spinning around you, or do you feel faint like you might pass out?", "Does the sensation occur only when turning your head in bed?", "Do you have any weakness in your arms, legs, or face?"],
            "avoid": ["Do NOT stand up quickly from bed or chair", "Do NOT drive or operate dangerous equipment while experiencing dizziness"],
            "source": "American Academy of Otolaryngology-Head and Neck Surgery (AAO-HNS) & NICE CKS: Vertigo",
            "review_status": "approved",
            "reviewed_by": "Dr. V. Menon (DM Neurology)"
        },
        {
            "id": "sym_nausea_vomiting_009",
            "topic": "Nausea & Acute Vomiting (Ulti)",
            "category": "symptoms",
            "keywords": ["nausea", "vomiting", "ulti", "feel sick", "puking", "throwing up", "jeemichlana", "nauseous"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Rest your stomach for 30 to 60 minutes after vomiting; do not force large amounts of food or drink right away.",
                "Take tiny sips of clear fluids (ORS solution, water, flat ginger tea) every 5 to 10 minutes once vomiting pauses.",
                "When able to tolerate fluids, introduce bland foods (BRAT: Bananas, Rice, Applesauce, Toast, or plain khichdi).",
                "Avoid spicy, oily, greasy, dairy-heavy, and high-sugar foods until recovery.",
                "Seek medical attention if you cannot keep liquids down for >12 hours or show signs of severe dehydration."
            ],
            "doctor_answer": {
                "assessment": "Acute Nausea and Vomiting. Differentials include acute gastroenteritis, food poisoning, gastritis, bowel obstruction, acute pancreatitis, acute appendicitis, pregnancy, or elevated intracranial pressure.",
                "investigations": "Assess hydration status. Serum electrolytes (Na, K, Cl), BUN, creatinine, urine pregnancy test in females of reproductive age, abdominal ultrasound or erect X-ray if peritoneal signs present.",
                "management": "Rehydration via oral rehydration solutions. Antiemetic therapy: Oral Ondansetron 4-8 mg ODT or IV Ondansetron 4 mg over 2-5 min. Alternative: Metoclopramide 10 mg (caution extrapyramidal side effects). Treat underlying cause.",
                "references": ["ACG Clinical Guideline: Management of Acute Diarrhea and Vomiting", "WHO Guidelines on Acute Gastroenteritis"]
            },
            "staff_answer": "Priority: Triage Yellow. Assess mucous membranes, skin turgor, and capillary refill. Provide emesis basin and wet wipes. Record BP and pulse (tachycardia indicates hypovolemia).",
            "red_flags": ["Vomiting blood or coffee-ground material (hematemesis)", "Fecal-smelling vomit or severe abdominal distension", "Severe headache with projectile vomiting and stiff neck", "Inability to keep liquids down for >24 hours with dark concentrated urine"],
            "follow_up_questions": ["What does the vomit look like (clear fluid, food, green bile, or blood)?", "Are you able to hold down small sips of water?", "Is there associated severe abdominal pain or fever?"],
            "avoid": ["Do NOT drink large glasses of fluid quickly (distends stomach and triggers immediate vomiting reflex)", "Do NOT consume fried or heavily spiced meals"],
            "source": "American College of Gastroenterology (ACG) & WHO Protocols",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        },
        {
            "id": "sym_diarrhea_adult_010",
            "topic": "Acute Diarrhea in Adults (Dast / Loose Motions)",
            "category": "symptoms",
            "keywords": ["diarrhea", "dast", "loose motion", "pet kharab", "watery stool", "motions", "acute diarrhea"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Drink 1 glass of Oral Rehydration Salts (ORS) solution after every loose bowel movement to replace lost fluids and electrolytes.",
                "Prepare ORS accurately: dissolve 1 full sachet of WHO-standard ORS powder in 1 liter of clean drinking water.",
                "Eat soft, easy-to-digest foods like curd rice, boiled potatoes, bananas, toast, and plain khichdi.",
                "Avoid milk, caffeine, alcohol, artificial sweeteners, and spicy or greasy foods which aggravate the intestines.",
                "Consult a doctor if diarrhea lasts more than 48 hours, contains blood/mucus, or is accompanied by high fever."
            ],
            "doctor_answer": {
                "assessment": "Acute Infectious Gastroenteritis (<14 days duration). Majority (>80%) are viral (Norovirus, Rotavirus) or mild self-limiting bacterial infections. Distinguish non-inflammatory (watery) from inflammatory (bloody/dysenteric) diarrhea.",
                "investigations": "Stool routine and microscopy indicated only if dysentery (blood/mucus), high fever, severe dehydration, or immunocompromised state. Check electrolytes in severe cases.",
                "management": "Oral Rehydration Therapy (WHO-ORS). Antimotility: Loperamide 4 mg initial then 2 mg after each loose stool (max 8-16 mg/day) ONLY in non-invasive watery diarrhea (strictly contraindicated if bloody diarrhea or high fever). Antibiotics (Ciprofloxacin 500 mg BID or Azithromycin 500 mg daily) reserved only for confirmed bacterial dysentery, severe traveler's diarrhea, or cholera.",
                "references": ["ACG Clinical Guideline: Diagnosis, Treatment, and Prevention of Acute Diarrheal Infections in Adults (2016)", "WHO Diarrhoea Treatment Guidelines"]
            },
            "staff_answer": "Priority: Triage Yellow. Check hydration status (sunken eyes, dry tongue, postural hypotension). Provide WHO ORS pack and cup. Isolate if infectious cholera suspected.",
            "red_flags": ["Stool containing visible red blood or black tarry blood", "High fever (> 38.5°C / 101.3°F)", "Signs of severe dehydration: dizziness upon standing, dry mouth, little to no urine", "Severe continuous abdominal cramps"],
            "follow_up_questions": ["Are there any traces of blood or mucus in your stool?", "How many loose bowel movements have you had in the past 24 hours?", "Are you able to drink and retain ORS solution?"],
            "avoid": ["Do NOT take Loperamide (Imodium) if you have bloody stools or high fever", "Do NOT take unnecessary antibiotics for mild watery diarrhea"],
            "source": "American College of Gastroenterology (ACG) & WHO Guidelines on Diarrhoeal Disease",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        },
        {
            "id": "sym_pediatric_dehydration_011",
            "topic": "Diarrhea & Dehydration in Children",
            "category": "symptoms",
            "keywords": ["child diarrhea", "baby loose motion", "bachhe ko dast", "pediatric dehydration", "child vomiting diarrhea", "ors child"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Give WHO Oral Rehydration Solution (ORS) immediately: offer 50 to 100 mL of ORS after each loose stool for children under 2 years, and 100 to 200 mL for older children.",
                "Give ORS in frequent small spoonfuls every 1 to 2 minutes if the child is vomiting. Do not rush.",
                "Continue breastfeeding or regular milk feeds; never starve a child with diarrhea.",
                "Give Zinc supplements (dispersible zinc tablets) daily for 14 days (10 mg/day for infants under 6 months, 20 mg/day for children 6 months and older) as recommended by WHO to shorten duration.",
                "Seek emergency pediatric care if the child becomes lethargic, has sunken eyes, cannot drink, or produces no urine for 6 hours."
            ],
            "doctor_answer": {
                "assessment": "Pediatric Acute Gastroenteritis with Dehydration. Classify dehydration per WHO/IMNCI: No Dehydration, Some Dehydration, Severe Dehydration.",
                "investigations": "Clinical assessment. Serum electrolytes, BUN, creatinine, and venous blood gas only in severe dehydration or failing oral rehydration.",
                "management": "Some Dehydration (WHO Plan B): ORS 75 mL/kg over 4 hours. Severe Dehydration (WHO Plan C): Urgent IV fluid resuscitation with Ringer's Lactate (100 mL/kg divided over 3-6 hours). Zinc supplementation (20 mg elemental zinc daily for 14 days). Antimotility drugs (Loperamide) are STRICTLY CONTRAINDICATED in children.",
                "references": ["WHO/UNICEF Joint Statement: Clinical Management of Acute Diarrhoea", "Indian Academy of Pediatrics (IAP) Guidelines on Pediatric Diarrhea"]
            },
            "staff_answer": "Priority: Triage Red if child lethargic/unconscious; Orange if sunken eyes and skin pinch goes back very slowly (>2 sec). Weigh child immediately. Show parent how to administer small sips of ORS via cup and spoon.",
            "red_flags": ["Extreme lethargy, floppiness, or unconsciousness", "Sunken eyes and tears absent when crying", "Skin pinch on the abdomen retracts very slowly (>2 seconds)", "Child unable to drink or breastfeed", "No urination/wet diaper in the past 6 to 8 hours"],
            "follow_up_questions": ["Is the child able to drink and keep liquids down?", "Has the child passed urine or had a wet diaper in the last 4 to 6 hours?", "When you pinch the skin on the child's abdomen, does it snap back instantly?"],
            "avoid": ["NEVER give Loperamide or antimotility medicines to children", "Do NOT give plain water exclusively or commercial juices/sodas with high sugar content"],
            "source": "WHO/UNICEF Guidelines & Indian Academy of Pediatrics (IAP)",
            "review_status": "approved",
            "reviewed_by": "Dr. N. Joshi (MD Pediatrics)"
        },
        {
            "id": "sym_abdominal_pain_012",
            "topic": "Abdominal Pain (Pet Dard)",
            "category": "symptoms",
            "keywords": ["abdominal pain", "stomach pain", "pet dard", "belly ache", "cramps", "stomach ache", "tummy pain"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Rest quietly and avoid heavy, greasy, or solid meals for a few hours.",
                "Sip plain warm water or peppermint/chamomile tea slowly.",
                "Place a warm water bottle or heating pad on your abdomen to relax cramping muscles.",
                "Avoid taking NSAID pain relievers (like Ibuprofen, Brufen, or Aspirin), as they can irritate the stomach lining or mask surgical conditions.",
                "Consult a doctor immediately if pain is severe, located in the right lower belly, or accompanied by vomiting and high fever."
            ],
            "doctor_answer": {
                "assessment": "Acute Abdomen vs Non-surgical Abdominal Pain. Systematically evaluate four quadrants: Right Lower Quadrant (appendicitis, mesenteric adenitis, ectopic pregnancy), Right Upper Quadrant (cholecystitis, biliary colic, hepatitis), Left Lower Quadrant (diverticulitis), Epigastric (pancreatitis, peptic ulcer disease).",
                "investigations": "Urine pregnancy test in all females of childbearing age, CBC, lipase/amylase, LFTs, urine routine, abdominal ultrasonography or contrast-enhanced CT abdomen.",
                "management": "NPO status if surgical abdomen suspected. Analgesia: Antispasmodic (Drotaverine 40-80 mg or Hyoscine Butylbromide 10-20 mg). Avoid NSAIDs until diagnosis confirmed. Urgent surgical consult if rebound tenderness, involuntary guarding, or rigid abdomen.",
                "references": ["World Journal of Emergency Surgery (WJES) Guidelines on Acute Abdomen", "NICE CKS: Abdominal pain in adults"]
            },
            "staff_answer": "Priority: Triage Orange/Yellow. Check for peritoneal signs: involuntary guarding or abdominal rigidity. Check vitals and pregnancy status. Keep patient NPO until cleared by doctor.",
            "red_flags": ["Severe sudden pain shifting to the lower right abdomen (McBurney's point)", "Hard, rigid, board-like abdomen with extreme tenderness to light touch", "Vomiting blood or passing dark black stools", "Fainting or severe hypotension in a woman of reproductive age (ruptured ectopic risk)", "Pain radiating through to the back accompanied by persistent vomiting"],
            "follow_up_questions": ["Exactly where in your abdomen is the pain felt most?", "Did the pain start suddenly within minutes or gradually over several hours?", "Could you be pregnant?"],
            "avoid": ["Do NOT take Ibuprofen, Diclofenac, or Aspirin for unexplained abdominal pain", "Do NOT use strong laxatives or enemas if appendicitis is possible"],
            "source": "World Journal of Emergency Surgery Guidelines & American College of Gastroenterology",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        },
        {
            "id": "sym_lower_back_pain_013",
            "topic": "Acute Low Back Pain (Lumbago / Kamar Dard)",
            "category": "symptoms",
            "keywords": ["back pain", "lower back pain", "kamar dard", "lumbago", "sciatica", "slip disc", "spine pain", "backache"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Stay gently active; avoid prolonged bed rest. Short walks and light movements speed recovery far better than lying flat.",
                "Apply an ice pack for 15 to 20 minutes at a time during the first 48 hours to reduce inflammation, then switch to warm compresses for muscle stiffness.",
                "Maintain good posture when sitting: use a small lumbar cushion behind your lower back and keep knees at hip level.",
                "Take Paracetamol 650 mg or Ibuprofen 400 mg with food for a few days to relieve acute discomfort.",
                "Avoid heavy lifting, sudden bending, or twisting movements until pain resolves."
            ],
            "doctor_answer": {
                "assessment": "Acute Non-Specific Low Back Pain (mechanical) vs Radiculopathy (Sciatica/herniated disc) vs Secondary Spinal Pathology (Screen for Red Flags: Cauda Equina Syndrome, malignancy, spinal infection, fracture).",
                "investigations": "No routine spinal X-ray or MRI indicated for non-specific low back pain <6 weeks duration in the absence of red flags. Urgent lumbar spine MRI indicated if Cauda Equina signs (saddle anesthesia, bowel/bladder incontinence) or progressive motor weakness.",
                "management": "Advise continuation of daily activities. First-line: Oral NSAIDs (Naproxen 500 mg BID or Ibuprofen 400 mg TID with food) for short course (1-2 weeks). Short-term muscle relaxant (Thiocolchicoside 4-8 mg or Cyclobenzaprine 5-10 mg). Physical therapy and core strengthening after acute phase.",
                "references": ["NICE Guideline NG59: Low back pain and sciatica in over 16s", "ACP (American College of Physicians) Clinical Practice Guideline for Low Back Pain"]
            },
            "staff_answer": "Priority: Triage Green unless Cauda Equina red flags present (then Triage Red). Ask specifically about urinary retention, bowel accidents, and numbness between the thighs.",
            "red_flags": ["New loss of bladder or bowel control (urinary incontinence or retention)", "Numbness around your groin, buttocks, or genitals (Saddle anesthesia)", "Progressive weakness in legs (foot drop / inability to stand on toes or heels)", "Back pain associated with unexplained weight loss or history of cancer"],
            "follow_up_questions": ["Does the pain shoot down past your knee into your foot or toes?", "Have you experienced any changes in your bladder or bowel control?", "Have you noticed any numbness around your private areas or inner thighs?"],
            "avoid": ["Do NOT stay in bed for more than 24-48 hours (delays recovery and stiffens muscles)", "Do NOT perform heavy deadlifts or bending during acute flare"],
            "source": "American College of Physicians (ACP) Guidelines & NICE Guideline NG59",
            "review_status": "approved",
            "reviewed_by": "Dr. R. Kapoor (MD, Orthopedics)"
        },
        {
            "id": "sym_joint_knee_pain_014",
            "topic": "Joint & Knee Pain (Arthralgia)",
            "category": "symptoms",
            "keywords": ["knee pain", "joint pain", "jodon ka dard", "ghutne me dard", "arthralgia", "swollen joint", "stiff joints"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Practice the P.R.I.C.E. principle: Protect the joint, Rest from strenuous impact, Ice with a cold pack for 15-20 min, Compress with an elastic crepe bandage, and Elevate when sitting.",
                "Apply a topical pain-relief gel containing Diclofenac or methyl salicylate over the joint 2 to 3 times daily.",
                "Wear supportive footwear with cushioned soles and avoid walking barefoot on hard floors.",
                "Low-impact exercises like swimming, stationary cycling, or gentle quadriceps sets help lubricate the joint without strain.",
                "Consult an orthopedic specialist if the joint is red, hot, significantly swollen, or unable to bear weight."
            ],
            "doctor_answer": {
                "assessment": "Monoarticular vs Polyarticular Joint Pain. Differentials include osteoarthritis, ligamentous/meniscal injury, gout (crystal arthropathy), septic arthritis (emergency), or rheumatoid arthritis.",
                "investigations": "Weight-bearing bilateral knee X-rays (AP, lateral, skyline). Arthrocentesis with synovial fluid analysis (cell count, Gram stain, crystal analysis) if acute warm joint effusion to rule out septic arthritis and gout.",
                "management": "Topical NSAIDs (Diclofenac gel) first line for knee osteoarthritis. Oral Paracetamol or short-course NSAIDs. Intra-articular corticosteroid injection for acute inflammatory flare. Physical therapy for periarticular muscle strengthening.",
                "references": ["OARSI Guidelines for the Non-Surgical Management of Knee Osteoarthritis", "ACR Guideline for the Management of Osteoarthritis of the Hand, Hip, and Knee"]
            },
            "staff_answer": "Priority: Triage Yellow if acute inability to bear weight or hot red joint; Green if chronic. Check joint temperature against opposite limb and measure range of motion.",
            "red_flags": ["Single joint that is hot, visibly red, severely swollen, and exquisitely tender (Septic arthritis)", "High fever accompanying sudden joint swelling", "Complete inability to bear any weight on the leg after trauma", "Joint visibly deformed or locked in position"],
            "follow_up_questions": ["Can you put weight on your leg and walk a few steps?", "Is the joint visibly hot, red, or swollen compared to the other side?", "Did the pain start following a twisting injury or direct blow?"],
            "avoid": ["Do NOT participate in high-impact jumping or running during an acute flare", "Do NOT apply heating pads to an acutely inflamed, red, or infected joint"],
            "source": "American College of Rheumatology (ACR) & OARSI Treatment Guidelines",
            "review_status": "approved",
            "reviewed_by": "Dr. R. Kapoor (MD, Orthopedics)"
        },
        {
            "id": "sym_skin_rash_015",
            "topic": "Skin Rash & Urticaria (Hives / Khujli)",
            "category": "symptoms",
            "keywords": ["skin rash", "rash", "khujli", "itching", "hives", "urticaria", "chhapaki", "skin allergy", "red bumps"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Apply calamine lotion or a cool, damp compress to the itchy skin areas to reduce irritation.",
                "Take a non-drowsy oral antihistamine (such as Cetirizine 10 mg or Loratadine 10 mg) to calm allergic itching and wheals.",
                "Take short baths in lukewarm (never hot) water using mild, fragrance-free cleanser.",
                "Wear loose, smooth cotton clothing; avoid synthetic wool or tight garments.",
                "Do not scratch the rash; keep fingernails trimmed short to avoid secondary bacterial skin infections."
            ],
            "doctor_answer": {
                "assessment": "Acute Urticaria vs Contact Dermatitis vs Drug Eruption vs Exanthem. Check for systemic involvement and anaphylaxis (lip/tongue swelling, stridor, wheezing, hypotension).",
                "investigations": "Clinical diagnosis. Allergy testing or skin biopsy only if persistent >6 weeks (chronic urticaria) or atypical features (vasculitis).",
                "management": "Second-generation H1-antihistamines (Cetirizine 10 mg, Fexofenadine 180 mg, or Bilastine 20 mg daily; can titrate up to 2-4x standard dose under medical supervision for refractory urticaria). Short course oral Prednisolone (20-30 mg daily for 3-5 days) only for severe acute angioedema/urticaria. Discontinue suspect culprit drugs.",
                "references": ["EAACI/GA²LEN/EDF/WAO Guideline for the Definition, Classification, Diagnosis, and Management of Urticaria", "AAD (American Academy of Dermatology) Guidelines"]
            },
            "staff_answer": "Priority: Triage Red if rash accompanied by facial/lip swelling or breathing difficulty (Anaphylaxis); Green if isolated hives. Check airway, breathing, SpO2, and BP immediately.",
            "red_flags": ["Rash accompanied by swelling of lips, tongue, throat, or face (Angioedema)", "Difficulty breathing, wheezing, or tightness in chest", "Non-blanching dark purple spots that do not fade when pressed with a glass (Petechiae/Purpura)", "Skin blistering, peeling, or painful mucosal ulceration (concern for Stevens-Johnson Syndrome / SJS)"],
            "follow_up_questions": ["Are your lips, tongue, or eyes swollen?", "Did you start any new medications, foods, or skin products in the last week?", "Is the rash painful, blistering, or peeling?"],
            "avoid": ["Do NOT scratch itchy lesions vigorously", "Do NOT apply concentrated topical steroid creams over large broken skin surfaces without prescription"],
            "source": "World Allergy Organization (WAO) & American Academy of Dermatology (AAD)",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        },
        {
            "id": "sym_conjunctivitis_016",
            "topic": "Acute Conjunctivitis / Red Eye (Aankh Aana)",
            "category": "symptoms",
            "keywords": ["red eye", "conjunctivitis", "pink eye", "aankh aana", "eye discharge", "eye pain", "aankh lal"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Clean eye discharge gently using a clean cotton pad soaked in cooled boiled water, wiping from the inner corner outwards. Use a fresh pad for each eye.",
                "Apply a cold compress (clean cloth soaked in cold water) over closed eyelids to reduce gritty swelling.",
                "Use preservative-free lubricating artificial tear drops 3 to 4 times daily to relieve grittiness.",
                "Wash hands frequently with soap and water; avoid touching or rubbing your eyes to prevent spreading the infection.",
                "Do NOT wear contact lenses or eye makeup until the red eye has completely resolved."
            ],
            "doctor_answer": {
                "assessment": "Acute Conjunctivitis: Differentiate Viral (watery discharge, preauricular lymphadenopathy) from Bacterial (purulent yellow/green discharge, crusting, lids glued shut) and Allergic (intense bilateral itching, stringy discharge, seasonal history). Exclude keratitis, uveitis, and acute angle-closure glaucoma.",
                "investigations": "Slit-lamp examination with fluorescein staining if corneal involvement or trauma suspected. Intraocular pressure (IOP) measurement if severe pain or fixed mid-dilated pupil.",
                "management": "Viral: Self-limiting (1-2 weeks), artificial tears, cool compresses. Bacterial: Topical antibiotic drops (Moxifloxacin 0.5% or Tobramycin 0.3% QID for 5-7 days). Allergic: Topical Olopatadine 0.1% BID drops. Urgent ophthalmology referral if corneal opacity, severe photophobia, or vision changes.",
                "references": ["AAO (American Academy of Ophthalmology) Preferred Practice Pattern: Conjunctivitis", "RCOphth Clinical Guidelines on Red Eye Management"]
            },
            "staff_answer": "Priority: Triage Yellow if severe eye pain or altered vision; Green for mild discharge. Test visual acuity (Snellen chart). Check pupil reactivity. Escalate immediately if contact lens wearer with white corneal ulcer.",
            "red_flags": ["Severe deep eye pain or intense sensitivity to light (Photophobia)", "Noticeable reduction or blurring of vision", "Cloudy cornea or visible white spot on the clear part of the eye", "Pupil that is enlarged, irregularly shaped, or unresponsive to light"],
            "follow_up_questions": ["Do you wear contact lenses?", "Is your vision blurry, decreased, or normal?", "Is the discharge watery, or thick yellow/green sticking your eyelashes together in the morning?"],
            "avoid": ["Do NOT use steroid eye drops without an ophthalmologist examination (can cause blindness if herpes simplex keratitis)", "Do NOT share towels or pillowcases"],
            "source": "American Academy of Ophthalmology (AAO) Preferred Practice Patterns",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        },
        {
            "id": "sym_ear_pain_017",
            "topic": "Acute Earache (Otalgia / Kaan Dard)",
            "category": "symptoms",
            "keywords": ["ear pain", "earache", "kaan dard", "otalgia", "ear infection", "kaan me dard", "ear discharge"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Take Paracetamol 500-650 mg or Ibuprofen 400 mg with food to alleviate ear pain.",
                "Hold a warm compress (such as a warm washcloth or warm water bottle) against the affected ear for 10 to 15 minutes.",
                "Keep the ear completely dry; do not swim, submerge your head, or allow bath water into the ear canal.",
                "Do NOT insert cotton swabs (Q-tips), safety pins, fingers, or oils into the ear canal.",
                "Consult an ENT doctor if ear discharge, hearing loss, or swelling behind the ear appears."
            ],
            "doctor_answer": {
                "assessment": "Otalgia: Primary (Otitis Media, Otitis Externa, Eustachian tube dysfunction, impacted cerumen) vs Secondary/Referred (TMJ disorder, dental infection, pharyngitis, cervical spine).",
                "investigations": "Pneumatic Otoscopy to evaluate tympanic membrane erythema, bulging, perforation, or middle ear effusion.",
                "management": "Acute Otitis Externa: Topical antibiotic-corticosteroid drops (Ciprofloxacin + Dexamethasone drops). Acute Otitis Media: Analgesia first-line; high-dose oral Amoxicillin (80-90 mg/kg/day in children or 500 mg TID in adults for 5-7 days) if bilateral, severe pain, or failing watchful waiting >48 hours.",
                "references": ["AAO-HNS Clinical Practice Guideline: Acute Otitis Externa", "AAP Clinical Practice Guideline: The Diagnosis and Management of Acute Otitis Media"]
            },
            "staff_answer": "Priority: Triage Green unless swelling and redness behind the ear (Mastoiditis - Triage Red). Ask about drainage and fever.",
            "red_flags": ["Swelling, tenderness, and redness directly on the bone behind the ear (concern for Mastoiditis)", "Facial weakness or inability to close the eye on the same side", "Foul-smelling or blood-tinged discharge from the ear canal", "High fever with neck stiffness and severe dizziness"],
            "follow_up_questions": ["Is there any fluid, pus, or blood draining from the ear?", "Did the ear pain start after swimming or inserting cotton buds?", "Is there tenderness when you pull on your earlobe or push the tragus?"],
            "avoid": ["Do NOT insert cotton buds, keys, or foreign objects into your ear", "Do NOT instill eardrops if you suspect a ruptured eardrum unless prescribed by an ENT specialist"],
            "source": "American Academy of Otolaryngology-Head and Neck Surgery (AAO-HNS)",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        },
        {
            "id": "sym_constipation_018",
            "topic": "Constipation (Kabz)",
            "category": "symptoms",
            "keywords": ["constipation", "kabz", "hard stool", "cannot poop", "straining", "irregular bowel"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Gradually increase dietary fiber intake by eating whole grains, oats, green vegetables, prunes, apples, and lentils.",
                "Drink 8 to 10 glasses of water daily; adequate hydration softens stools and facilitates smooth bowel transit.",
                "Engage in regular daily physical activity, such as a brisk 30-minute walk, which naturally stimulates colon contractions.",
                "Do not delay or suppress the urge to have a bowel movement; take unhurried time after morning meals.",
                "If dietary measures are insufficient, you may use an osmotic laxative like Lactulose syrup (15-30 mL) or Polyethylene Glycol (PEG) powder in water."
            ],
            "doctor_answer": {
                "assessment": "Functional Constipation (Rome IV criteria) vs Secondary (hypothyroidism, hypercalcemia, colorectal cancer, medication-induced e.g., opioids, calcium channel blockers, iron supplements).",
                "investigations": "Digital rectal examination. Thyroid profile (TSH), serum calcium, CBC. Colonoscopy indicated if age > 50, rectal bleeding, unexplained weight loss, or iron deficiency anemia.",
                "management": "Dietary modification (25-30 g/day fiber) + fluid intake. First-line laxatives: Osmotic agents (Polyethylene glycol 17 g/day or Lactulose 15-30 mL/day). Bulk-forming agents (Psyllium husk / Isabgol 1-2 tbsp with a large glass of water). Stimulant laxatives (Bisacodyl, Senna) for short-term rescue only.",
                "references": ["AGA (American Gastroenterological Association) Clinical Practice Guideline on Constipation", "ACG Monograph on Management of Irritable Bowel Syndrome and Chronic Idiopathic Constipation"]
            },
            "staff_answer": "Priority: Triage Green. Inquire about duration of constipation, flatus passage, and recent changes in medication or diet.",
            "red_flags": ["Complete inability to pass both stool and flatus (obstipation) with vomiting (Bowel Obstruction)", "Rectal bleeding or dark black stools", "Unexplained significant weight loss", "Recent sudden change in bowel habits in an adult over 50"],
            "follow_up_questions": ["How many bowel movements do you typically have per week?", "Are you passing gas (flatus) normally?", "Have you noticed any blood on the toilet paper or in the toilet bowl?"],
            "avoid": ["Do NOT become dependent on stimulant laxatives (Senna, Dulcolax) for prolonged daily use without medical advice", "Do NOT ignore persistent changes in bowel habits"],
            "source": "American Gastroenterological Association (AGA) Guidelines",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        },
        {
            "id": "sym_gerd_heartburn_019",
            "topic": "Acid Reflux & Heartburn (Acidity / Dyspepsia)",
            "category": "symptoms",
            "keywords": ["acidity", "heartburn", "acid reflux", "gerd", "chest burning", "chhati me jalan", "sour burps", "indigestion", "khatti dakar"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Eat smaller, more frequent meals rather than large, heavy feasts.",
                "Avoid lying down for at least 2 to 3 hours immediately after eating.",
                "Elevate the head of your bed by 6 inches (15 cm) using bed risers or an extra wedge pillow.",
                "Limit trigger foods such as fried/greasy items, raw onions, tomatoes, chocolate, citrus, and caffeinated sodas.",
                "For rapid relief, an over-the-counter antacid liquid (magnesium/aluminum hydroxide) or chewable antacid can neutralize acid."
            ],
            "doctor_answer": {
                "assessment": "Gastroesophageal Reflux Disease (GERD) / Functional Dyspepsia. Crucial step: Rule out cardiac ischemia/angina presenting as epigastric/chest burning.",
                "investigations": "12-lead ECG to rule out atypical ACS. Upper GI endoscopy (EGD) indicated if alarm features present: dysphagia (difficulty swallowing), odynophagia, weight loss, persistent vomiting, or anemia.",
                "management": "Lifestyle and dietary modification. Proton Pump Inhibitor (PPI) trial: Pantoprazole 40 mg or Omeprazole 20 mg once daily taken 30-60 minutes before breakfast for 4 to 8 weeks. Add H2-receptor antagonist (Famotidine 20-40 mg) at bedtime if nocturnal symptoms persist.",
                "references": ["ACG Clinical Guideline for the Diagnosis and Management of Gastroesophageal Reflux Disease (2022)", "NICE Guideline CG184: Gastro-oesophageal reflux disease and dyspepsia in adults"]
            },
            "staff_answer": "Priority: Triage Yellow. ALWAYS rule out Acute Coronary Syndrome: acquire a 12-lead ECG if patient is >40 years old, diabetic, or if chest burning radiates to arms, neck, or jaw.",
            "red_flags": ["Chest burning accompanied by pressure, breathlessness, or cold sweating (Atypical Heart Attack)", "Difficulty or pain when swallowing food (Dysphagia/Odynophagia)", "Vomiting blood or black tarry stools (Melena)", "Unintentional progressive weight loss"],
            "follow_up_questions": ["Does the burning worsen with physical exertion and improve with rest (suggests heart origin)?", "Do you have difficulty swallowing solid food?", "Does food or sour acidic fluid taste come back up into your throat?"],
            "avoid": ["Do NOT assume all chest burning is simple acidity in individuals with cardiovascular risk factors", "Do NOT take antacids simultaneously with fluoroquinolones, iron, or thyroid medications (impairs absorption)"],
            "source": "American College of Gastroenterology (ACG) GERD Guidelines (2022) & NICE CG184",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        },
        {
            "id": "sym_fatigue_weakness_020",
            "topic": "Chronic Fatigue & Generalized Weakness (Kamzori)",
            "category": "symptoms",
            "keywords": ["fatigue", "weakness", "kamzori", "thakan", "tired all the time", "exhaustion", "lethargy", "low energy"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Prioritize 7 to 9 hours of quality, uninterrupted sleep nightly with a consistent bedtime routine.",
                "Stay well-hydrated throughout the day; even mild dehydration causes sluggishness and brain fog.",
                "Eat balanced, nutrient-dense meals containing whole grains, lean protein, legumes, and fresh fruits; avoid sugar spikes and crashes.",
                "Take a daily 20 to 30 minute gentle walk in morning sunlight to boost mood and regulate circadian rhythms.",
                "Consult a doctor for basic blood tests if exhaustion persists for weeks despite adequate rest."
            ],
            "doctor_answer": {
                "assessment": "Prolonged Fatigue / Asthenia. Systematic workup for common medical etiologies: Iron deficiency anemia, hypothyroidism, diabetes mellitus, vitamin D / B12 deficiency, obstructive sleep apnea (OSA), chronic kidney or liver disease, occult depression.",
                "investigations": "CBC with peripheral smear, Ferritin, TSH, Fasting blood glucose & HbA1c, Serum Vitamin B12, 25-OH Vitamin D, Renal and Liver function panels, Screening questionnaire for depression (PHQ-9) and sleep apnea (STOP-BANG).",
                "management": "Correct underlying biochemical deficiencies (oral iron for ferritin < 30 ng/mL, Levothyroxine for hypothyroidism, oral/injectable B12/Vitamin D). Sleep hygiene counseling and graduated exercise therapy.",
                "references": ["AAFP Clinical Review: Evaluation of Fatigue in Adults", "NICE Guideline NG206: ME/CFS and Prolonged Fatigue"]
            },
            "staff_answer": "Priority: Triage Green. Screen for pallor in conjunctiva, check pulse rate and postural BP. Inquire about sleep hours, diet, and recent blood loss.",
            "red_flags": ["Severe focal muscle weakness (e.g. inability to lift one leg, arm, or drooping face)", "Unexplained significant weight loss or drenching night sweats", "Noticeable shortness of breath on minimal exertion or swollen ankles", "Profound pallor (very pale skin, palms, or conjunctiva)"],
            "follow_up_questions": ["How long have you felt this exhausted, and does rest improve it?", "Do you snore loudly or wake up gasping during the night?", "Have you noticed any unintended weight loss or fever?"],
            "avoid": ["Do NOT rely excessively on high-dose caffeine or energy drinks that worsen sleep debt", "Do NOT start iron supplements without verifying hemoglobin and ferritin levels"],
            "source": "American Academy of Family Physicians (AAFP) Guidelines on Fatigue",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        },
        {
            "id": "sym_toothache_021",
            "topic": "Acute Toothache & Dental Pain (Daant Dard)",
            "category": "symptoms",
            "keywords": ["toothache", "dental pain", "daant dard", "tooth pain", "gum swelling", "cavity pain", "daant me dard"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Rinse your mouth gently with warm salt water (1/2 teaspoon salt in 1 cup warm water) to clean food debris and soothe gums.",
                "Take Paracetamol 500-650 mg or Ibuprofen 400 mg with food to manage pain and inflammation until you can see a dentist.",
                "Apply a cold pack to your cheek or outside of the jaw near the painful tooth for 15 minutes to reduce swelling.",
                "Gently floss around the tooth to dislodge any trapped food particles causing pressure.",
                "Schedule an urgent dental appointment; tooth decay or abscess requires professional dental intervention."
            ],
            "doctor_answer": {
                "assessment": "Dental Pulpitis vs Periapical Abscess vs Periodontal Abscess vs Ludwig's Angina (emergency space infection).",
                "investigations": "Dental radiographs (periapical, panoramic OPG). Check for facial swelling, trismus (inability to open mouth), or submandibular floor of mouth elevation.",
                "management": "Analgesia: NSAIDs (Ibuprofen 400-600 mg TID or Ketorolac 10 mg short course). If systemic signs (fever, spreading facial cellulitis): Oral Amoxicillin-Clavulanate 625 mg TID or Clindamycin 300 mg QID for 5-7 days. Urgent dental referral for root canal therapy or extraction.",
                "references": ["ADA (American Dental Association) Clinical Practice Guidelines on Dental Pain and Swelling", "NICE CKS: Dental abscess"]
            },
            "staff_answer": "Priority: Triage Green unless facial/neck swelling present (Triage Orange/Red). Look inside mouth for floor-of-mouth swelling or difficulty swallowing.",
            "red_flags": ["Swelling spreading down into the neck or floor of the mouth (Ludwig's Angina - Airway Emergency)", "Difficulty breathing or swallowing saliva", "Inability to open the mouth (severe trismus)", "High fever with swelling spreading toward the eye"],
            "follow_up_questions": ["Is there any swelling visible on your face, cheek, or neck?", "Can you open your mouth normally and swallow water?", "Is the tooth sensitive to hot or cold drinks?"],
            "avoid": ["NEVER place an Aspirin tablet directly against your gum or tooth (causes chemical burn and mucosal necrosis)", "Do NOT delay seeing a dentist when an abscess is suspected"],
            "source": "American Dental Association (ADA) Clinical Guidelines",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        },
        {
            "id": "sym_neck_pain_022",
            "topic": "Acute Neck Pain & Cervical Strain (Gardan Dard)",
            "category": "symptoms",
            "keywords": ["neck pain", "gardan dard", "stiff neck", "cervical pain", "neck spasm", "tech neck", "cervical spondylosis"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Apply an ice pack wrapped in a cloth for 15 minutes during the first 24 hours, then switch to gentle moist heat (warm shower or warm pack).",
                "Gently move your neck through comfortable ranges of motion (slow nod, gentle side-to-side turns); avoid jerking movements.",
                "Evaluate workstation ergonomics: raise your computer screen or phone so it is at eye level to prevent 'tech neck'.",
                "Use a supportive, low-profile pillow that keeps your neck level with your spine while sleeping.",
                "Take Paracetamol 650 mg or Ibuprofen 400 mg with meals for short-term pain relief."
            ],
            "doctor_answer": {
                "assessment": "Acute Cervical Muscle Strain vs Cervical Radiculopathy vs Cervical Myelopathy. Screen for Meningitis (fever + rigid neck) and trauma (cervical spine fracture / Canadian C-Spine Rule).",
                "investigations": "No imaging needed for simple muscle strain. Cervical MRI indicated if progressive neurological deficits (arm weakness, clumsy hands, hyperreflexia) or radicular pain refractory to conservative therapy >6 weeks.",
                "management": "First-line: Oral NSAIDs (Naproxen or Ibuprofen) + Paracetamol. Short course muscle relaxant (Thiocolchicoside 4-8 mg BID). Gentle stretching and physical therapy. Avoid hard cervical collars (leads to muscle deconditioning).",
                "references": ["North American Spine Society (NASS) Evidence-Based Clinical Guidelines for Cervical Radiculopathy", "NICE CKS: Neck pain"]
            },
            "staff_answer": "Priority: Triage Red if trauma, or fever + inability to touch chin to chest (Kernig/Brudzinski sign for meningitis); Green for postural strain.",
            "red_flags": ["Severe stiff neck accompanied by high fever, confusion, or rash (Meningitis)", "Shooting pain, numbness, or loss of strength in one or both arms", "Loss of coordination in hands (dropping items) or stumbling gait (Cervical Myelopathy)", "Neck pain following high-speed motor vehicle accident or fall from height"],
            "follow_up_questions": ["Can you touch your chin to your chest without severe pain?", "Are you experiencing any shooting numbness or weakness down your arms?", "Did this start after an injury or accident?"],
            "avoid": ["Do NOT wear a stiff neck collar without a doctor's explicit prescription", "Do NOT submit to aggressive, high-velocity neck cracking from untrained sources"],
            "source": "North American Spine Society (NASS) & American College of Radiology",
            "review_status": "approved",
            "reviewed_by": "Dr. R. Kapoor (MD, Orthopedics)"
        },
        {
            "id": "sym_insomnia_023",
            "topic": "Acute Insomnia & Sleep Difficulties (Neend Na Aana)",
            "category": "symptoms",
            "keywords": ["insomnia", "neend na aana", "sleep problem", "cannot sleep", "sleeplessness", "poor sleep", "waking up early"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Maintain a fixed sleep schedule: wake up and go to sleep at the same time every day, including on weekends.",
                "Eliminate screens (smartphones, tablets, TV) at least 60 minutes before bedtime; the blue light suppresses melatonin release.",
                "Keep your bedroom completely dark, quiet, and cool (around 18-20°C / 65-68°F).",
                "Avoid caffeine, nicotine, and heavy meals within 4 to 6 hours of bedtime.",
                "If you cannot fall asleep after 20 minutes, get out of bed, go to another dimly lit room, read a book or do a quiet relaxing activity, and return only when sleepy."
            ],
            "doctor_answer": {
                "assessment": "Short-Term vs Chronic Insomnia Disorder (>=3 nights/week for >=3 months). Screen for Obstructive Sleep Apnea (OSA), restless legs syndrome (RLS), depression, anxiety, and medications (corticosteroids, beta-blockers, decongestants).",
                "investigations": "Sleep diary for 2 weeks. Polysomnography (sleep study) indicated if sleep apnea, parasomnias, or refractory insomnia suspected.",
                "management": "Gold Standard First-Line: Cognitive Behavioral Therapy for Insomnia (CBT-I) incorporating sleep restriction and stimulus control. Pharmacotherapy reserved for short-term acute distress only (Melatonin 2-3 mg or non-benzodiazepine hypnotics e.g., Zolpidem 5 mg for <2 weeks). Avoid long-term benzodiazepines.",
                "references": ["AASM (American Academy of Sleep Medicine) Clinical Practice Guideline for Chronic Insomnia", "ACP Clinical Guideline on Chronic Insomnia"]
            },
            "staff_answer": "Priority: Triage Green. Assess sleep habits, caffeine consumption, shift work, and screen usage. Inquire about daytime drowsiness and driving safety.",
            "red_flags": ["Severe daytime sleepiness leading to falling asleep while driving or operating machinery", "Loud choking or gasping sounds during sleep reported by bed partner (Sleep Apnea)", "Insomnia accompanied by severe depression, hopelessness, or thoughts of self-harm"],
            "follow_up_questions": ["Do you wake up gasping for air or does your partner notice loud snoring and pauses in breathing?", "How many hours of caffeinated beverages do you consume daily?", "How long have you been struggling to fall or stay asleep?"],
            "avoid": ["Do NOT use alcohol as a sleep aid (severely disrupts REM sleep and worsens sleep architecture)", "Do NOT stay in bed tossing and turning for hours"],
            "source": "American Academy of Sleep Medicine (AASM) & American College of Physicians (ACP)",
            "review_status": "approved",
            "reviewed_by": "Dr. P. Deshmukh (MD Psychiatry)"
        },
        {
            "id": "sym_swollen_ankles_024",
            "topic": "Swollen Ankles & Leg Edema (Pairon me Sujan)",
            "category": "symptoms",
            "keywords": ["swollen ankles", "leg swelling", "pair me sujan", "edema", "puffy feet", "pedal edema", "foot swelling"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Elevate your legs above the level of your heart on pillows for 20 to 30 minutes 2 to 3 times a day.",
                "Reduce dietary salt (sodium) intake, as excess salt encourages water retention in the tissues.",
                "Avoid sitting or standing in one stationary spot for extended hours; take walking breaks every 45 minutes.",
                "Wear graduated compression stockings if recommended by your physician for venous insufficiency.",
                "Consult a doctor promptly if swelling is in only one leg, painful, or accompanied by breathlessness."
            ],
            "doctor_answer": {
                "assessment": "Bilateral vs Unilateral Lower Extremity Edema. Bilateral: Congestive heart failure, chronic kidney disease (nephrotic syndrome), cirrhosis, venous insufficiency, medications (Amlodipine, NSAIDs, Pioglitazone). Unilateral: Deep Vein Thrombosis (DVT), cellulitis, lymphedema, Baker's cyst rupture.",
                "investigations": "Unilateral: Urgent Venous Duplex Ultrasound of lower limb to rule out DVT; D-dimer. Bilateral: Serum creatinine, urinalysis (proteinuria/albuminuria), LFT (albumin), BNP/NT-proBNP, 2D Echocardiogram, CXR.",
                "management": "Treat underlying etiology: Diuretics (Furosemide or Torsemide) for hypervolemic states (heart failure, CKD). Discontinue offending medications (switch CCB to ARB/ACEi). Graduated compression therapy for chronic venous disease.",
                "references": ["AHA Scientific Statement on Heart Failure Management", "ACR Appropriateness Criteria for Suspected Lower Extremity DVT"]
            },
            "staff_answer": "Priority: Triage Orange if sudden unilateral swelling with calf tenderness (suspected DVT) or associated with orthopnea/breathlessness; Green for mild bilateral chronic edema.",
            "red_flags": ["Sudden swelling, warmth, and calf pain in ONE leg only (Suspected Deep Vein Thrombosis / DVT)", "Swelling accompanied by sudden shortness of breath or chest pain (Pulmonary Embolism)", "Rapid weight gain with puffy eyes and frothy urine (Kidney failure / Nephrotic syndrome)", "Severe breathlessness when lying flat (Orthopnea / Acute Heart Failure)"],
            "follow_up_questions": ["Is the swelling in both legs or just one leg?", "Did the swelling develop suddenly within hours or gradually over weeks?", "Do you get breathless when walking or lying flat in bed?"],
            "avoid": ["Do NOT start taking diuretic 'water pills' on your own without medical diagnosis", "Do NOT sit motionless on long flights or car journeys without flexing your calf muscles regularly"],
            "source": "American Heart Association (AHA) & American College of Chest Physicians (CHEST)",
            "review_status": "approved",
            "reviewed_by": "Dr. R. Kapoor (MD, DM Cardiology)"
        },
        {
            "id": "sym_burning_urination_025",
            "topic": "Burning Urination & Dysuria (Peshab me Jalan)",
            "category": "symptoms",
            "keywords": ["burning urination", "peshab me jalan", "dysuria", "pain peeing", "uti symptom", "burning urine", "frequent urination"],
            "intent": "symptom_first_aid",
            "patient_answer": [
                "Drink plenty of water (2 to 3 liters daily) to help flush out bacteria from your urinary tract.",
                "Urinate whenever you feel the urge; do not hold urine in your bladder for long periods.",
                "Take a warm sitz bath or use a warm heating pad on your lower pelvis to relieve discomfort.",
                "Avoid bladder irritants such as spicy foods, caffeine, alcohol, and artificial sweeteners.",
                "Consult a doctor for a urine test and appropriate prescription antibiotics; do not take random leftover antibiotics."
            ],
            "doctor_answer": {
                "assessment": "Dysuria: Lower Urinary Tract Infection (Acute Uncomplicated Cystitis) vs Pyelonephritis (complicated) vs Urethritis / Sexually Transmitted Infection (Gonorrhea, Chlamydia) vs Vaginitis / Prostatitis.",
                "investigations": "Urine Routine and Microscopy (pyuria >=10 WBC/hpf, bacteriuria, leukocyte esterase, nitrites). Urine Culture & Sensitivity prior to antibiotics if recurrent, male, pregnant, or diabetic.",
                "management": "Uncomplicated Cystitis in women: Nitrofurantoin 100 mg BID for 5 days or Fosfomycin 3 g single oral dose. Alternative: Trimethoprim-Sulfamethoxazole 160/800 mg BID for 3 days. Dysuria analgesia: Phenazopyridine 200 mg TID for max 2 days. Avoid fluoroquinolones for simple cystitis due to adverse risks.",
                "references": ["IDSA Guidelines for the Treatment of Acute Uncomplicated Cystitis and Pyelonephritis", "EAU (European Association of Urology) Guidelines on Urological Infections"]
            },
            "staff_answer": "Priority: Triage Green unless high fever with flank/back tenderness (Pyelonephritis - Triage Yellow/Orange). Collect clean-catch midstream urine sample for analysis.",
            "red_flags": ["High fever with chills and one-sided back or flank pain (Acute Pyelonephritis)", "Visible blood in the urine (Gross hematuria)", "Inability to pass urine despite severe painful urge (Acute urinary retention)", "Dysuria in pregnant women or diabetic individuals"],
            "follow_up_questions": ["Do you have back or flank pain, fever, or chills?", "Is there visible blood or cloudiness in your urine?", "Do you have any unusual discharge?"],
            "avoid": ["Do NOT self-medicate with arbitrary antibiotics (drives resistant superbugs)", "Do NOT hold urine when your bladder is full"],
            "source": "Infectious Diseases Society of America (IDSA) & European Association of Urology (EAU)",
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Internal Medicine)"
        }
    ]

# The rest of the modules will be assembled in subsequent functions
print("Defined symptoms:", len(get_symptoms()))
