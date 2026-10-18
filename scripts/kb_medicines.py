"""
Medicines knowledge base module (16 essential medicines)
"""
def get_medicines():
    meds = [
        ("med_paracetamol_001", "Paracetamol (Acetaminophen)", ["paracetamol", "crocin", "calpol", "dolo", "dolo 650", "acetaminophen", "fever tablet"],
         "Antipyretic and mild analgesic used for fever, headache, body aches, and mild-to-moderate pain.",
         [
             "Adult dose: 500 mg to 650 mg every 4 to 6 hours as needed.",
             "Maximum safe limit for adults: Never exceed 3000 mg (or 4000 mg under strict physician supervision) in 24 hours.",
             "Do not combine multiple cold/flu syrups or pain medications that also contain hidden paracetamol.",
             "Safe for use during pregnancy and breastfeeding at recommended doses.",
             "Reduce dose or avoid in severe chronic liver disease or heavy alcohol use."
         ],
         {"assessment": "Analgesic and antipyretic. Central COX inhibition with serotonergic pathway modulation.", "investigations": "Monitor LFTs if high-dose chronic therapy or acute overdose (Serum paracetamol nomogram).", "management": "Oral 500-1000 mg Q4-6H PRN (max 4g/day). Pediatric: 10-15 mg/kg/dose Q4-6H. Antidote for toxicity: IV N-Acetylcysteine (NAC).", "references": ["WHO Model List of Essential Medicines", "FDA Paracetamol Safety Guidance"]},
         "Verify total 24h intake across all medications to prevent accidental hepatotoxicity.",
         ["Accidental overdose > 4g/day", "Dark urine, right upper quadrant pain, yellow jaundice (Hepatic Necrosis)"],
         ["Do NOT exceed 3000 mg in 24 hours", "Do NOT drink heavy alcohol while taking paracetamol"],
         "WHO Model Formulary & FDA Drug Safety Communication", "Dr. A. Sharma (MD, Pharmacology)"),

        ("med_ibuprofen_002", "Ibuprofen", ["ibuprofen", "brufen", "combiflam", "advil", "nsaid painkiller", "swelling painkiller"],
         "Non-Steroidal Anti-Inflammatory Drug (NSAID) used for inflammatory pain, arthritis, dental pain, and menstrual cramps.",
         [
             "Adult dose: 200 mg to 400 mg every 6 to 8 hours as needed.",
             "ALWAYS take Ibuprofen with or immediately after food or milk to protect your stomach lining from ulcers.",
             "Do NOT take if you have active stomach ulcers, chronic kidney disease, severe heart failure, or uncontrolled high blood pressure.",
             "Avoid during pregnancy, especially in the third trimester (can harm fetal heart and kidney circulation).",
             "Do NOT take if you have severe asthma triggered by Aspirin or NSAIDs."
         ],
         {"assessment": "Non-selective COX-1 and COX-2 inhibitor with analgesic, antipyretic, and anti-inflammatory properties.", "investigations": "BUN, Serum Creatinine, CBC if chronic therapy.", "management": "Oral 200-400 mg TID-QID with meals (max 1200 mg OTC, 2400 mg prescription). Caution: Renal impairment, peptic ulcer disease, heart failure.", "references": ["WHO Essential Medicines", "NICE CKS: NSAIDs prescribing"]},
         "Check for history of peptic ulcer disease or renal insufficiency before dispensing.",
         ["Black tarry stools or vomiting blood (Gastric Bleeding)", "Sudden drop in urine output or leg swelling", "Severe allergic wheezing"],
         ["NEVER take on an empty stomach", "Do NOT use in suspected Dengue fever (causes severe hemorrhage)", "Do NOT use in 3rd trimester of pregnancy"],
         "NICE Clinical Knowledge Summaries & WHO Model List", "Dr. A. Sharma (MD, Internal Medicine)"),

        ("med_amoxicillin_003", "Amoxicillin", ["amoxicillin", "mox", "novamox", "amox", "antibiotic capsule"],
         "Aminopenicillin antibiotic used for bacterial infections of the chest, throat, ear, sinus, and urinary tract.",
         [
             "Take strictly according to your doctor's prescription (typically 500 mg every 8 hours) with plenty of water.",
             "Complete the entire course of antibiotics prescribed, even if you feel completely healthy after 2 days.",
             "Can be taken with or without food.",
             "Do NOT take if you have a known allergy to Penicillin or amoxicillin.",
             "Report severe watery diarrhea or allergic skin rashes to your physician immediately."
         ],
         {"assessment": "Moderate-spectrum bactericidal beta-lactam antibiotic. Inhibits bacterial cell wall synthesis.", "investigations": "Culture and sensitivity prior to treatment when feasible.", "management": "Oral 500 mg TID or 875 mg BID for 5-10 days depending on indication. Adjust for eGFR < 30 mL/min.", "references": ["WHO Essential Medicines List", "IDSA Antimicrobial Guidelines"]},
         "Ask explicitly about Penicillin allergy before administering. If rash or wheezing develops, stop immediately.",
         ["Sudden facial swelling, hives, or difficulty breathing (Penicillin Anaphylaxis)", "Severe watery or bloody diarrhea (C. difficile colitis)"],
         ["Do NOT stop antibiotic treatment early", "Do NOT take for viral colds, flu, or simple viral sore throat"],
         "WHO Model Formulary & IDSA Practice Guidelines", "Dr. A. Sharma (MD, Internal Medicine)"),

        ("med_azithromycin_004", "Azithromycin", ["azithromycin", "azithral", "zithromax", "azee", "3 day antibiotic"],
         "Macrolide antibiotic used for respiratory tract infections, atypical pneumonia, sinusitis, and certain skin infections.",
         [
             "Adult dose: Typically 500 mg once daily for 3 to 5 days, taken at the same time each day.",
             "Take with or without food (taking with food can reduce mild stomach upset).",
             "Complete the full prescribed 3 to 5 day course without skipping doses.",
             "Inform your doctor if you have a history of irregular heartbeats or take heart medications.",
             "Do not use for simple viral colds or runny nose; antibiotics do not kill viruses."
         ],
         {"assessment": "Macrolide antibiotic. Binds to 50S ribosomal subunit inhibiting protein synthesis. Long tissue half-life (~68 hours).", "investigations": "Baseline ECG if cardiac history (risk of QT prolongation).", "management": "Oral 500 mg once daily for 3 days (or 500 mg Day 1 then 250 mg Days 2-5).", "references": ["WHO Essential Medicines", "FDA Drug Safety: Azithromycin and QT risk"]},
         "Check for concomitant QT-prolonging drugs (antiarrhythmics, antipsychotics).",
         ["Severe palpitations, fainting, or chest fluttering (Torsades de Pointes / QT prolongation)", "Jaundice or severe upper right belly pain"],
         ["Do NOT take without a doctor's confirmed bacterial diagnosis", "Do NOT combine with other QT-prolonging drugs without clearance"],
         "FDA Drug Safety & WHO Model List of Essential Medicines", "Dr. A. Sharma (MD, Internal Medicine)"),

        ("med_metformin_005", "Metformin", ["metformin", "glycomet", "glucophage", "sugar tablet metformin"],
         "Biguanide antidiabetic medication; the standard first-line oral medicine for controlling blood sugar in Type 2 Diabetes.",
         [
             "Take Metformin with or immediately after meals to minimize common stomach side effects like nausea or loose stools.",
             "Swallow extended-release (ER/SR) tablets whole; do not crush or chew them.",
             "Metformin does not cause hypoglycemia (low blood sugar) when taken on its own.",
             "Temporarily stop taking Metformin before any medical imaging procedure that uses intravenous contrast dye (like CT scans) as directed by your hospital.",
             "Report severe unexplained fatigue, muscle aches, or rapid breathing to your doctor immediately."
         ],
         {"assessment": "Biguanide. Decreases hepatic gluconeogenesis and increases peripheral insulin sensitivity without stimulating beta-cell insulin secretion.", "investigations": "Serum Creatinine/eGFR annually (eGFR 30-45: max 1000 mg/day; eGFR < 30: contraindicated). Serum Vitamin B12 every 2-3 years.", "management": "Oral 500 mg daily or BID with meals; titrate weekly up to 1000 mg BID (max 2000-2550 mg/day).", "references": ["ADA Standards of Care in Diabetes", "WHO Model List of Essential Medicines"]},
         "Hold Metformin 48 hours prior to iodinated contrast dye procedures if eGFR < 60 mL/min.",
         ["Rapid deep breathing, extreme weakness, vomiting, and cold skin (Lactic Acidosis - Emergency)", "Severe kidney impairment with eGFR < 30 mL/min"],
         ["Do NOT crush extended-release tablets", "Do NOT take if eGFR is below 30 mL/min"],
         "American Diabetes Association (ADA) Guidelines & WHO Formulary", "Dr. R. Kapoor (MD, Endocrinology)"),

        ("med_amlodipine_006", "Amlodipine", ["amlodipine", "stamlo", "amlong", "norvasc", "bp tablet amlodipine"],
         "Calcium Channel Blocker used for high blood pressure and angina (chest pain).",
         [
             "Adult dose: Typically 2.5 mg to 10 mg once daily, taken at the same time each day.",
             "Can be taken with or without food.",
             "A common mild side effect is swelling around the ankles or feet; inform your doctor if this occurs.",
             "Do not stop taking this medication abruptly, as this can cause your blood pressure to surge.",
             "Avoid consuming grapefruit or grapefruit juice while taking amlodipine."
         ],
         {"assessment": "Dihydropyridine calcium channel blocker. Inhibits transmembrane influx of calcium ions into vascular smooth muscle causing peripheral arterial vasodilation.", "investigations": "Monitor BP and check for peripheral edema.", "management": "Oral 5 mg once daily; titrate after 1-2 weeks to 10 mg daily if needed. Starting dose 2.5 mg in elderly or hepatic impairment.", "references": ["ACC/AHA Hypertension Guidelines", "WHO Model List of Essential Medicines"]},
         "Check for bilateral pedal edema and dizziness on standing.",
         ["Severe dizziness or fainting upon standing (severe orthostatic hypotension)", "Chest pain that worsens after initial dose (paradoxical angina)"],
         ["Do NOT stop abruptly", "Do NOT consume grapefruit juice in large quantities"],
         "ACC/AHA Guidelines & WHO Model Formulary", "Dr. R. Kapoor (MD, Cardiology)"),

        ("med_telmisartan_007", "Telmisartan", ["telmisartan", "telma", "micardis", "arb bp tablet"],
         "Angiotensin II Receptor Blocker (ARB) used for high blood pressure and cardiovascular protection.",
         [
             "Adult dose: 40 mg to 80 mg once daily with or without food.",
             "Helps relax blood vessels and protects kidneys in patients with diabetes or hypertension.",
             "STRICTLY FORBIDDEN during pregnancy; stop immediately and tell your doctor if you become pregnant.",
             "Have your blood tested periodically for kidney function and potassium levels.",
             "Avoid potassium-based salt substitutes without consulting your physician."
         ],
         {"assessment": "Angiotensin II Receptor Blocker (AT1 subtype selective). Blocks vasoconstriction and aldosterone secretion.", "investigations": "Serum Potassium and Creatinine/eGFR at baseline and 1-2 weeks after initiation.", "management": "Oral 40-80 mg once daily. Contraindicated in pregnancy (teratogenic / oligohydramnios).", "references": ["ACC/AHA Guidelines", "ESC Hypertension Guidelines"]},
         "Verify patient is not pregnant and check serum potassium.",
         ["Facial, lip, or tongue swelling (Angioedema)", "Hyperkalemia (K > 5.5 mEq/L) with muscle weakness"],
         ["NEVER take during pregnancy (causes severe fetal damage)", "Do NOT combine simultaneously with ACE inhibitors (Ramipril)"],
         "ACC/AHA Guidelines & European Society of Cardiology", "Dr. R. Kapoor (MD, Cardiology)"),

        ("med_atorvastatin_008", "Atorvastatin", ["atorvastatin", "atorva", "lipitor", "statin", "cholesterol tablet"],
         "HMG-CoA reductase inhibitor (Statin) used to lower LDL ('bad') cholesterol and prevent heart attacks and strokes.",
         [
             "Adult dose: 10 mg to 80 mg once daily, preferably taken in the evening or at night.",
             "Continue taking your statin even if your cholesterol numbers improve; it provides continuous plaque stabilization.",
             "Report any unexplained, persistent muscle pain, tenderness, or weakness to your doctor immediately.",
             "Avoid large amounts of grapefruit juice, which can increase the drug level in your bloodstream.",
             "Contraindicated during pregnancy and breastfeeding."
         ],
         {"assessment": "Competitive inhibitor of HMG-CoA reductase, the rate-limiting enzyme in cholesterol biosynthesis. Upregulates hepatic LDL receptors.", "investigations": "Baseline LFTs (ALT/AST). Check CPK if muscle symptoms arise.", "management": "Moderate intensity: 10-20 mg daily. High intensity: 40-80 mg daily.", "references": ["AHA/ACC Cholesterol Guidelines", "WHO Model List"]},
         "Ask about muscle aches or tea-colored urine.",
         ["Severe muscle pain with dark tea-colored urine (Rhabdomyolysis)", "Yellowing of eyes or skin with severe nausea (Hepatotoxicity)"],
         ["Do NOT stop statin without talking to doctor", "Do NOT use in pregnancy or active acute liver disease"],
         "AHA/ACC Guidelines on Blood Cholesterol & WHO Model List", "Dr. R. Kapoor (MD, Cardiology)"),

        ("med_pantoprazole_009", "Pantoprazole", ["pantoprazole", "pantocid", "pan 40", "ppi", "acidity tablet morning"],
         "Proton Pump Inhibitor (PPI) that decreases stomach acid production for GERD, acid reflux, and peptic ulcers.",
         [
             "Adult dose: 40 mg once daily, taken 30 to 60 minutes BEFORE your first meal (breakfast) with water.",
             "Swallow the tablet whole; do not chew, crush, or break it.",
             "Best used for short courses (4 to 8 weeks) as recommended by your physician.",
             "Prolonged unmonitored use over years can decrease absorption of Vitamin B12, magnesium, and calcium.",
             "Do not take antacids at the exact same moment as pantoprazole."
         ],
         {"assessment": "Irreversible inhibitor of the H+/K+ ATPase pump in gastric parietal cells, suppressing basal and stimulated acid secretion.", "investigations": "Monitor serum B12 and magnesium if on long-term therapy (>1 year).", "management": "Oral 40 mg once daily before breakfast for 4-8 weeks. IV formulation for upper GI bleed.", "references": ["ACG GERD Guidelines", "WHO Model List"]},
         "Confirm patient takes it 30-60 min before breakfast, not after.",
         ["Persistent watery diarrhea with abdominal cramping (C. difficile infection)", "Unexplained bone fractures on long-term therapy"],
         ["Do NOT take after food (drastically reduces efficacy)", "Do NOT take indefinitely without medical review"],
         "American College of Gastroenterology (ACG) & WHO Formulary", "Dr. A. Sharma (MD, Gastroenterology)"),

        ("med_omeprazole_010", "Omeprazole", ["omeprazole", "omez", "prilosec", "acid suppressor"],
         "Proton Pump Inhibitor (PPI) used for acid reflux, heartburn, and stomach ulcers.",
         [
             "Adult dose: 20 mg to 40 mg once daily, taken 30 to 60 minutes before breakfast.",
             "Swallow capsule whole with a full glass of water.",
             "Inform your doctor if you take Clopidogrel (blood thinner), as omeprazole can decrease its effectiveness.",
             "Eat small, regular meals and avoid late-night snacks to support acid recovery.",
             "Seek medical evaluation if heartburn is accompanied by difficulty swallowing or weight loss."
         ],
         {"assessment": "Substituted benzimidazole PPI suppressing gastric acid secretion.", "investigations": "Check drug interactions (inhibits CYP2C19).", "management": "Oral 20 mg once daily before morning meal for 4-8 weeks.", "references": ["WHO Essential Medicines", "ACG Guidelines"]},
         "Check for co-prescription with Clopidogrel (switch to Pantoprazole if needed).",
         ["Severe gastrointestinal infection symptoms", "Signs of acute interstitial nephritis (fever, rash, oliguria)"],
         ["Do NOT take after meals", "Do NOT combine with Clopidogrel without doctor approval"],
         "WHO Model List of Essential Medicines & ACG Guidelines", "Dr. A. Sharma (MD, Gastroenterology)"),

        ("med_cetirizine_011", "Cetirizine", ["cetirizine", "cetzine", "zyrtec", "allergy tablet", "antihistamine tablet"],
         "Second-generation antihistamine used for allergic rhinitis, sneezing, runny nose, itching, and hives (urticaria).",
         [
             "Adult dose: 10 mg once daily, preferably taken in the evening or at bedtime.",
             "May cause mild drowsiness in some individuals; avoid driving or operating machinery if affected.",
             "Avoid alcohol while taking cetirizine, as alcohol increases drowsiness.",
             "Safe for short-term allergy flare-ups or seasonal hay fever.",
             "Reduce dose to 5 mg daily if you have moderate kidney impairment."
         ],
         {"assessment": "Selective peripheral H1-receptor antagonist with low blood-brain barrier penetration.", "investigations": "Renal function in elderly (dose reduction for eGFR < 50 mL/min).", "management": "Oral 10 mg once daily at bedtime. Children 6-12y: 5 mg BID or 10 mg daily.", "references": ["EAACI Guidelines on Allergic Rhinitis", "WHO Model List"]},
         "Advise patient regarding mild drowsiness and avoiding alcohol.",
         ["Extreme somnolence or urinary retention in elderly males with BPH"],
         ["Do NOT consume alcohol while taking cetirizine", "Do NOT drive if feeling drowsy"],
         "EAACI Urticaria Guidelines & WHO Model List", "Dr. A. Sharma (MD, Internal Medicine)"),

        ("med_salbutamol_012", "Salbutamol (Albuterol)", ["salbutamol", "albuterol", "asthalin", "blue inhaler", "rescue inhaler", "bronchodilator puffer"],
         "Short-Acting Beta-2 Agonist (SABA) rapid rescue inhaler for acute wheezing, asthma attacks, and bronchospasm.",
         [
             "Dose for sudden shortness of breath: 1 to 2 puffs (100-200 mcg) via spacer as needed.",
             "Provides rapid breathing relief within 3 to 5 minutes.",
             "Common temporary side effects: mild hand trembling, shakiness, and fast heartbeat.",
             "ALWAYS use a spacer device to ensure medication reaches your small airways.",
             "If you need your blue rescue inhaler more than 2 to 3 times a week, your asthma is uncontrolled and you need a daily controller inhaler."
         ],
         {"assessment": "Selective beta-2 adrenergic agonist stimulating intracellular adenyl cyclase, causing bronchial smooth muscle relaxation.", "investigations": "Peak Expiratory Flow Rate (PEFR), pulse oximetry.", "management": "MDI 100-200 mcg (1-2 puffs) PRN via spacer. Acute severe: 4-10 puffs Q20 min for 1 hour.", "references": ["GINA 2023 Guidelines", "WHO Model List"]},
         "Demonstrate spacer technique. Check frequency of rescue inhaler usage.",
         ["Using > 1 canister per month (significantly increases mortality risk)", "Inability to speak sentences despite rescue puffs"],
         ["NEVER rely on Salbutamol alone without an inhaled corticosteroid controller", "Do NOT exceed recommended doses without medical assistance"],
         "Global Initiative for Asthma (GINA) & WHO Model List", "Dr. S. Kulkarni (MD, Pulmonology)"),

        ("med_metronidazole_013", "Metronidazole", ["metronidazole", "flagyl", "metrogyl", "loose motion tablet metrogyl"],
         "Nitroimidazole antimicrobial used for amoebic dysentery, giardiasis, trichomoniasis, and anaerobic bacterial infections.",
         [
             "Adult dose: Typically 400 mg three times daily with food for 5 to 10 days as prescribed.",
             "STRICTLY FORBIDDEN WITH ALCOHOL: Do not consume any alcohol during treatment and for at least 48 hours after your last pill (causes violent nausea, vomiting, throbbing headache, and flushing).",
             "A metallic taste in your mouth and dark-colored urine are common, harmless side effects.",
             "Take with or after meals to reduce stomach discomfort.",
             "Complete the entire course prescribed by your doctor."
         ],
         {"assessment": "Synthetic nitroimidazole antimicrobial. Reduced by electron transport proteins in anaerobes/protozoa to produce toxic free radicals that disrupt DNA.", "investigations": "Stool examination for cysts/trophozoites.", "management": "Oral 400-800 mg TID with meals for 7-10 days. Avoid in 1st trimester pregnancy.", "references": ["CDC Treatment Guidelines", "WHO Model List"]},
         "Emphasize 100% complete alcohol abstinence during and 48h post-therapy.",
         ["Severe disulfiram reaction if alcohol consumed", "Peripheral neuropathy or seizures with prolonged high-dose therapy"],
         ["STRICTLY AVOID ALL ALCOHOL during and 48 hours after therapy", "Do NOT use in first trimester of pregnancy"],
         "CDC Clinical Treatment Guidelines & WHO Model List", "Dr. A. Sharma (MD, Internal Medicine)"),

        ("med_ors_014", "Oral Rehydration Salts (WHO-ORS)", ["ors", "oral rehydration salts", "electral", "who ors", "dehydration packet"],
         "Balanced electrolyte and glucose formulation for preventing and treating dehydration caused by diarrhea and vomiting.",
         [
             "Prepare correctly: dissolve the ENTIRE packet of WHO-ORS powder in exactly 1 LITER (1000 mL) of clean drinking water.",
             "Do NOT mix with milk, juice, soda, or add extra sugar or salt; the formula is scientifically balanced for intestinal absorption.",
             "Drink 1 glass of prepared ORS solution after each loose watery bowel movement.",
             "Discard any prepared solution that has been left open for more than 24 hours and prepare a fresh batch.",
             "Give in small, frequent sips to children or individuals who are nauseous."
         ],
         {"assessment": "WHO reduced-osmolarity formulation (total osmolarity 245 mOsm/L: Na 75, Glucose 75, K 20, Cl 65, Citrate 10 mmol/L). Couples sodium and glucose co-transport across intestinal brush border.", "investigations": "Assess dehydration level (WHO Plans A, B, C).", "management": "Plan A: 200-400 mL after each loose stool. Plan B: 75 mL/kg over 4 hours. Transition to IV if shock.", "references": ["WHO/UNICEF Clinical Management of Acute Diarrhoea", "WHO Model List"]},
         "Confirm dilution: 1 packet in exactly 1 liter clean water.",
         ["Inability to swallow or altered consciousness (shift immediately to IV fluids)", "Persistent severe dehydration despite ORS"],
         ["Do NOT mix in less or more water than specified (hyper/hypotonic solution)", "Do NOT boil the solution after mixing"],
         "WHO/UNICEF Diarrhea Management Guidelines", "Dr. A. Sharma (MD, Internal Medicine)"),

        ("med_ciprofloxacin_015", "Ciprofloxacin", ["ciprofloxacin", "cipro", "ciplox", "fluoroquinolone antibiotic"],
         "Fluoroquinolone antibiotic used for complicated urinary tract infections, bacterial gastroenteritis, and typhoid fever.",
         [
             "Adult dose: Typically 500 mg twice daily, taken 12 hours apart.",
             "Drink plenty of fluids throughout the day while taking ciprofloxacin to prevent crystals from forming in your urine.",
             "Do NOT take with antacids, iron tablets, calcium supplements, or milk (wait at least 2 hours before or 4 hours after ciprofloxacin).",
             "Stop taking and contact your doctor immediately if you experience pain, swelling, or tenderness in your Achilles tendon (behind the heel).",
             "Protect your skin from direct sunlight; ciprofloxacin can make your skin unusually sensitive to sunburn."
         ],
         {"assessment": "Broad-spectrum fluoroquinolone. Inhibits bacterial DNA gyrase (topoisomerase II) and topoisomerase IV.", "investigations": "Renal function (dose reduction required if eGFR < 50 mL/min).", "management": "Oral 500 mg BID for 3-7 days depending on infection severity. Avoid in children and pregnancy unless no alternative.", "references": ["FDA Black Box Warnings: Fluoroquinolones", "IDSA Guidelines"]},
         "Warn patient regarding tendon pain, photosensitivity, and chelation with antacids.",
         ["Sudden Achilles tendon pain or rupture", "Severe muscle weakness in Myasthenia Gravis (contraindicated)"],
         ["Do NOT take simultaneously with antacids, dairy, calcium, or iron", "Do NOT use for simple uncomplicated cystitis or mild colds"],
         "FDA Drug Safety Guidance & IDSA Guidelines", "Dr. A. Sharma (MD, Internal Medicine)"),

        ("med_levothyroxine_016", "Levothyroxine", ["levothyroxine", "thyronorm", "eltroxin", "synthroid", "thyroid medicine"],
         "Synthetic thyroid hormone (T4) used for lifelong replacement in primary and secondary hypothyroidism.",
         [
             "Adult dose: 25 mcg to 150 mcg once daily, personalized by your doctor based on your TSH blood test.",
             "ALWAYS take first thing in the morning on an empty stomach with a full glass of plain water.",
             "Wait at least 30 to 60 minutes after taking your pill before having breakfast, tea, coffee, or milk.",
             "Do NOT take calcium supplements, iron pills, or antacids within 4 hours of your thyroid pill (they block absorption).",
             "Do not stop taking or skip doses even when you feel completely fine; it is continuous replacement therapy."
         ],
         {"assessment": "Synthetic levo-isomer of thyroxine (T4). Converted peripherally to active T3 to regulate cellular metabolism.", "investigations": "Serum TSH monitored 6-8 weeks after dose changes, then every 6-12 months once euthyroid.", "management": "Oral 1.6 mcg/kg/day in young healthy adults. Start 25-50 mcg daily in elderly or CAD. Target TSH: 0.5-2.5 mIU/L.", "references": ["American Thyroid Association (ATA) Hypothyroidism Guidelines", "WHO Model List"]},
         "Verify patient takes tablet empty stomach with plain water only.",
         ["Symptoms of thyrotoxicosis from overtreatment: rapid heart rate, palpitations, chest pain, tremors", "Myxedema coma if untreated"],
         ["Do NOT take with tea, coffee, milk, or calcium/iron pills", "Do NOT skip doses or stop therapy"],
         "ATA Guidelines for Hypothyroidism & WHO Model List", "Dr. R. Kapoor (MD, Endocrinology)")
    ]

    out = []
    for mid, topic, kw, desc, p_ans, doc_a, staff_m, red_f, avoid_l, src, rev in meds:
        out.append({
            "id": mid,
            "topic": f"Medicine: {topic}",
            "category": "medicines",
            "keywords": kw,
            "intent": "drug_info",
            "patient_answer": p_ans,
            "doctor_answer": doc_a,
            "staff_answer": staff_m,
            "red_flags": red_f,
            "follow_up_questions": ["What dosage and frequency were you prescribed?", "Are you experiencing any unexpected side effects?", "Are you taking any other prescription or over-the-counter medications?"],
            "avoid": avoid_l,
            "source": src,
            "review_status": "approved",
            "reviewed_by": rev
        })
    return out
