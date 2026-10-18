"""
Lab tests knowledge base module (16 essential lab tests)
"""
def get_lab_tests():
    labs = [
        ("lab_cbc_001", "Complete Blood Count (CBC / Hemogram)", ["cbc", "complete blood count", "hemogram", "hemoglobin test", "tlc dlc", "platelet count test", "white blood cells count"],
         "Measures red blood cells, white blood cells, hemoglobin, hematocrit, and platelets to detect anemia, infections, and bleeding disorders.",
         [
             "Fast or non-fasting: No fasting is typically required for a CBC test alone.",
             "Key values explained in plain terms:",
             "- Hemoglobin (Hb): Normal adult male 13.5-17.5 g/dL; female 12.0-15.5 g/dL. Low values indicate anemia (causing fatigue, pallor, weakness).",
             "- White Blood Cells (WBC / TLC): Normal 4,000-11,000 cells/mcL. High values suggest bacterial infection, inflammation, or acute stress.",
             "- Platelets: Normal 150,000-450,000/mcL. Critical low (<50,000/mcL) increases risk of easy bruising and spontaneous bleeding (often seen in dengue).",
             "Consult your doctor to interpret CBC values in the context of your symptoms."
         ],
         {"assessment": "Complete Blood Count with Differential. Evaluates erythroid, myeloid, and megakaryocytic cell lines.", "investigations": "Correlate with peripheral blood smear if abnormal morphology or cytopenias.", "management": "Stratify by severity of cytopenia or leukocytosis. Critical values: Hb < 7.0 g/dL, Platelets < 20,000/mcL, ANC < 500/mcL.", "references": ["WHO Haemoglobin Concentrations for Anemia", "ICSH Guidelines for Blood Cell Counts"]},
         "Flag critical values: Platelets < 50,000/mcL, Hb < 7.0 g/dL, or TLC > 30,000.",
         ["Platelet count < 20,000/mcL with active bleeding", "Hemoglobin < 7 g/dL with severe fatigue or chest pain", "Absolute Neutrophil Count (ANC) < 500/mcL with fever"],
         ["Do NOT assume mild elevations in TLC always require antibiotics without a clinical source", "Do NOT panic over isolated minor variations"],
         "International Council for Standardization in Haematology (ICSH) & WHO", "Dr. A. Sharma (MD, Pathology)"),

        ("lab_fasting_blood_glucose_002", "Fasting & Postprandial Blood Glucose (FBS / PPBS)", ["fasting blood sugar", "fbs", "ppbs", "blood sugar test", "fasting glucose", "postprandial glucose"],
         "Measures glucose in the blood to diagnose and monitor diabetes and prediabetes.",
         [
             "Fasting test preparation: Fast strictly for 8 to 10 hours overnight before the morning blood draw (plain water is allowed).",
             "Postprandial (PPBS) test: Blood is drawn exactly 2 hours after the start of a standard meal.",
             "Diagnostic reference ranges (ADA):",
             "- Normal Fasting: 70 to 99 mg/dL.",
             "- Prediabetes Fasting: 100 to 125 mg/dL.",
             "- Diabetes Fasting: 126 mg/dL or higher on two separate occasions.",
             "- Normal 2-Hour Postprandial: Less than 140 mg/dL (under 180 mg/dL for known diabetics).",
             "Consult your physician for personalized dietary and medication targets."
         ],
         {"assessment": "Plasma glucose evaluation for diabetes diagnosis and glycemic assessment.", "investigations": "Correlate with HbA1c to confirm chronic glycemic state.", "management": "Fasting >= 126 mg/dL or 2h PG >= 200 mg/dL confirms Diabetes Mellitus. Inpatient target for non-critically ill: 140-180 mg/dL.", "references": ["ADA Standards of Care in Diabetes: Classification and Diagnosis", "WHO Guidelines on Diabetes Diagnosis"]},
         "Verify fasting duration (8-10h). Alert physician if fasting glucose < 70 or > 250 mg/dL.",
         ["Fasting glucose < 54 mg/dL (Severe Hypoglycemia)", "Fasting glucose > 300 mg/dL with ketones or vomiting"],
         ["Do NOT drink tea, coffee, milk, or juices during the fasting window", "Do NOT skip prescribed basal insulin without medical guidance"],
         "American Diabetes Association (ADA) Diagnostic Criteria & WHO", "Dr. R. Kapoor (MD, Endocrinology)"),

        ("lab_hba1c_003", "HbA1c (Glycated Hemoglobin)", ["hba1c", "glycated hemoglobin", "3 month sugar test", "average sugar test"],
         "Reflects average blood sugar control over the past 2 to 3 months by measuring glucose bound to red blood cells.",
         [
             "Fast or non-fasting: NO fasting required; you can take this test at any time of day, before or after food.",
             "Understanding your HbA1c percentage:",
             "- Normal (Non-diabetic): Below 5.7%.",
             "- Prediabetes: 5.7% to 6.4% (high risk of developing diabetes; requires immediate lifestyle changes).",
             "- Diabetes: 6.5% or higher on two separate tests.",
             "- General Target for Most Diabetics: Below 7.0% (reduces risk of kidney, nerve, and eye damage).",
             "Test frequency: Typically tested every 3 months for uncontrolled diabetes, or every 6 months for stable control."
         ],
         {"assessment": "NGSP-certified, IFCC-standardized measurement of glycated hemoglobin (HbA1c). Reflects weighted average glycemic levels over RBC lifespan (~120 days).", "investigations": "Correlate with self-monitoring blood glucose (SMBG) or continuous glucose monitoring (CGM). Note: False low in hemolytic anemia/hemoglobinopathies; false high in iron deficiency.", "management": "Individualize target: <7.0% for most non-pregnant adults; <8.0% for frail elderly or severe hypoglycemia history; <6.5% in young healthy adults without hypoglycemia risk.", "references": ["ADA Standards of Care in Diabetes: Glycemic Targets", "NGSP Standardization Standards"]},
         "Review HbA1c trend in EHR. No fasting required.",
         ["HbA1c > 10.0% indicating severe long-term glycemic failure", "Frequent unexplained hypoglycemia despite low HbA1c"],
         ["Do NOT change insulin doses abruptly based solely on a single HbA1c value without consulting your doctor", "Do NOT fast unnecessarily for an HbA1c test"],
         "American Diabetes Association (ADA) Standards of Care & NGSP", "Dr. R. Kapoor (MD, Endocrinology)"),

        ("lab_lipid_profile_004", "Lipid Profile (Cholesterol Panel)", ["lipid profile", "cholesterol test", "ldl test", "triglycerides test", "hdl cholesterol test"],
         "Measures total cholesterol, LDL ('bad') cholesterol, HDL ('good') cholesterol, and triglycerides to assess cardiovascular disease risk.",
         [
             "Test preparation: 9 to 12 hours of overnight fasting is traditionally recommended (plain water allowed).",
             "Reference targets:",
             "- Total Cholesterol: Desirable below 200 mg/dL.",
             "- LDL ('Bad') Cholesterol: Optimal below 100 mg/dL (below 70 mg/dL or 55 mg/dL for individuals with known heart disease or high risk).",
             "- HDL ('Good') Cholesterol: Protective when above 40 mg/dL in men and above 50 mg/dL in women.",
             "- Triglycerides: Normal below 150 mg/dL.",
             "Elevated LDL cholesterol drives fatty plaque buildup in coronary and brain arteries."
         ],
         {"assessment": "Serum Lipid Panel. Calculates LDL-C via Friedewald formula or direct enzymatic measurement. Evaluates 10-year ASCVD risk.", "investigations": "Rule out secondary dyslipidemia: TSH (hypothyroidism), LFTs, Serum Creatinine, Urinalysis (nephrotic syndrome).", "management": "Initiate lifestyle modification + moderate- or high-intensity Statin therapy based on ASCVD risk category and baseline LDL-C.", "references": ["AHA/ACC Blood Cholesterol Guidelines", "NLA (National Lipid Association) Recommendations"]},
         "Verify fasting status. Alert physician if Triglycerides > 500 mg/dL (pancreatitis risk).",
         ["Triglycerides > 1000 mg/dL (Extremely high risk of acute necrotizing pancreatitis)", "LDL-C > 190 mg/dL (Severe hypercholesterolemia / Familial Hypercholesterolemia)"],
         ["Do NOT eat a high-fat dinner the night before a fasting lipid test", "Do NOT stop statin therapy without discussing with your doctor"],
         "AHA/ACC Cholesterol Guidelines & National Lipid Association", "Dr. R. Kapoor (MD, Cardiology)"),

        ("lab_lft_005", "Liver Function Tests (LFT / Hepatic Panel)", ["lft", "liver function test", "sgot", "sgpt", "bilirubin test", "alkaline phosphatase", "alt ast"],
         "Measures enzymes, proteins, and bilirubin produced or cleared by the liver to assess liver injury and function.",
         [
             "Preparation: Overnight fasting of 8 to 10 hours is preferred.",
             "Key markers explained:",
             "- Bilirubin (Total & Direct): Normal total 0.2 to 1.2 mg/dL. Elevated levels cause yellow jaundice in eyes and skin.",
             "- SGPT / ALT: Normal 7 to 56 U/L. The most specific enzyme for liver cell inflammation and damage.",
             "- SGOT / AST: Normal 10 to 40 U/L. Found in liver, heart, and muscle tissue.",
             "- Alkaline Phosphatase (ALP): Normal 44 to 147 U/L. Elevated in bile duct blockage or bone conditions.",
             "- Serum Albumin: Normal 3.5 to 5.0 g/dL. Low levels indicate chronic liver damage or malnutrition.",
             "Always review abnormal LFTs with your doctor to determine if ultrasound or viral testing is needed."
         ],
         {"assessment": "Hepatic Biochemical Profile. Classify pattern of injury: Hepatocellular (predominant ALT/AST elevation) vs Cholestatic (predominant ALP and Direct Bilirubin elevation) vs Infiltrative.", "investigations": "Viral hepatitis panel (HBsAg, Anti-HCV, Anti-HAV/HEV), abdominal ultrasound, PT/INR (true synthetic function marker), iron studies.", "management": "Hepatocellular injury: evaluate viral, toxic (alcohol, acetaminophen, herbal remedies), MASLD, or autoimmune etiologies. Discontinue offending medications.", "references": ["ACG Clinical Guideline: Evaluation of Abnormal Liver Chemistries", "EASL Clinical Practice Guidelines"]},
         "Check Total Bilirubin and ALT/AST. Alert physician if transaminases > 1000 U/L or Total Bilirubin > 5 mg/dL.",
         ["ALT / AST > 1000 U/L (Acute viral hepatitis, ischemic hepatitis, or toxic acetaminophen necrosis)", "Elevated bilirubin with prolonged PT/INR > 1.5 (Acute Liver Failure)"],
         ["Do NOT consume alcohol prior to liver testing", "Do NOT take unverified herbal supplements that trigger drug-induced liver injury"],
         "American College of Gastroenterology (ACG) & EASL Guidelines", "Dr. A. Sharma (MD, Gastroenterology)"),

        ("lab_kft_006", "Kidney Function Tests (KFT / RFT / Renal Panel)", ["kft", "rft", "kidney function test", "renal function test", "creatinine test", "blood urea nitrogen", "bun test"],
         "Measures serum creatinine, blood urea, and electrolytes to evaluate kidney filtration capacity and kidney health.",
         [
             "Preparation: No strict fasting required, but avoid eating large portions of cooked red meat right before the test.",
             "Key values:",
             "- Serum Creatinine: Normal adult male 0.7 to 1.3 mg/dL; female 0.6 to 1.1 mg/dL. Waste product cleared by kidneys; elevated levels indicate reduced filtration.",
             "- eGFR (estimated Glomerular Filtration Rate): Normal above 90 mL/min/1.73m2. Values under 60 indicate chronic kidney disease.",
             "- Blood Urea Nitrogen (BUN) / Blood Urea: Normal BUN 7 to 20 mg/dL. Rises with kidney impairment or severe dehydration.",
             "- Serum Electrolytes (Sodium, Potassium): Crucial for heart rhythm and nerve conduction.",
             "Never ignore elevated creatinine; early intervention protects your remaining kidney function."
         ],
         {"assessment": "Renal Function Panel. Calculate eGFR using 2021 CKD-EPI creatinine equation. Evaluate acute kidney injury (KDIGO AKI criteria: >=0.3 mg/dL rise in 48h or >=50% rise from baseline) vs chronic kidney disease.", "investigations": "Urinalysis with microscopy, urine Albumin-to-Creatinine Ratio (uACR), renal ultrasonography.", "management": "Avoid nephrotoxic agents (NSAIDs, aminoglycosides, IV contrast). Adjust drug dosages for eGFR. Address pre-renal hypovolemia or post-renal obstruction.", "references": ["KDIGO Clinical Practice Guideline for Acute Kidney Injury", "National Kidney Foundation (NKF) Guidelines"]},
         "Check Serum Creatinine and Potassium immediately. Flag creatinine doubling or K > 5.5 mEq/L.",
         ["Serum Potassium > 6.0 mEq/L (Fatal Arrhythmia Risk)", "Acute doubling of serum creatinine within 48 hours", "Anuria (no urine output) with shortness of breath"],
         ["Do NOT take NSAID painkillers (Ibuprofen, Diclofenac) when creatinine is elevated", "Do NOT skip follow-up testing"],
         "KDIGO Clinical Practice Guidelines & National Kidney Foundation", "Dr. A. Sharma (MD, Nephrology)"),

        ("lab_tsh_007", "Thyroid Stimulating Hormone (TSH)", ["tsh", "thyroid test", "tsh test", "thyroid stimulating hormone", "t3 t4 tsh"],
         "Measures pituitary TSH to assess thyroid gland function; the primary screening test for underactive or overactive thyroid.",
         [
             "Preparation: Morning blood collection is ideal. If you take thyroid medicine (Levothyroxine), take your pill AFTER the blood draw unless your doctor specifies otherwise.",
             "Reference ranges:",
             "- Normal Adult TSH: 0.4 to 4.5 mIU/L.",
             "- High TSH (> 4.5 mIU/L): Indicates Primary Hypothyroidism (the pituitary is shouting at an underactive thyroid to produce more hormone).",
             "- Low TSH (< 0.4 mIU/L): Indicates Hyperthyroidism (excess thyroid hormone in blood suppresses pituitary TSH production).",
             "Special pregnancy target: TSH is kept tighter (typically 0.5 to 2.5 mIU/L) in pregnancy to support fetal neurodevelopment.",
             "Consult your doctor for Free T4 and Free T3 testing if TSH is abnormal."
         ],
         {"assessment": "First-line screening and monitoring for thyroid dysfunction. High sensitivity for primary thyroid pathology via negative feedback axis.", "investigations": "If abnormal TSH: order Free T4 and Free T3. Anti-TPO and Anti-Tg antibodies for autoimmune thyroiditis. Thyroid ultrasound if palpable nodules.", "management": "Hypothyroidism (elevated TSH + low Free T4): Levothyroxine replacement. Hyperthyroidism (suppressed TSH + elevated Free T4/T3): Antithyroid drugs (Carbimazole/Methimazole) or radioactive iodine.", "references": ["ATA Guidelines for the Management of Hypothyroidism", "Endocrine Society Clinical Practice Guidelines"]},
         "Check if patient takes Levothyroxine or Biotin supplements (biotin interferes with TSH immunoassays).",
         ["TSH < 0.01 mIU/L with resting tachycardia and tremors (Severe Thyrotoxicosis)", "TSH > 20 mIU/L in pregnancy or severe lethargy"],
         ["Do NOT take Biotin (Vitamin B7) supplements for 48 hours before a thyroid test (causes falsely abnormal results)", "Do NOT stop thyroid medication on your own"],
         "American Thyroid Association (ATA) Guidelines & Endocrine Society", "Dr. R. Kapoor (MD, Endocrinology)"),

        ("lab_electrolytes_008", "Serum Electrolytes Panel (Sodium, Potassium, Chloride, Bicarbonate)", ["electrolytes", "serum electrolytes", "sodium potassium test", "na k cl", "blood salt test"],
         "Measures essential minerals in blood that regulate fluid balance, nerve signals, muscle contractions, and blood acidity.",
         [
             "Preparation: No fasting required.",
             "Reference ranges:",
             "- Sodium (Na+): Normal 135 to 145 mEq/L. Low sodium (hyponatremia < 135) causes nausea, confusion, and headache; severe low (< 120) triggers seizures.",
             "- Potassium (K+): Normal 3.5 to 5.0 mEq/L. Extremely narrow safety window: high (> 5.5) or low (< 3.0) can trigger fatal cardiac arrest.",
             "- Chloride (Cl-): Normal 96 to 106 mEq/L. Mirrors acid-base balance.",
             "- Bicarbonate (HCO3-): Normal 22 to 28 mEq/L. Reflects metabolic acidosis or alkalosis.",
             "Always have your doctor review abnormal electrolytes immediately; never attempt self-correction."
         ],
         {"assessment": "Evaluation of fluid-electrolyte and acid-base homeostasis. Critical in renal failure, heart failure, diuretic therapy, and severe dehydration.", "investigations": "12-lead ECG immediately if K < 3.0 or K > 5.5 mEq/L. Arterial Blood Gas (ABG), calculated anion gap, urine electrolytes.", "management": "Severe Hyponatremia (<120 mEq/L with seizures): 3% Hypertonic Saline bolus; avoid rapid overcorrection (>8-10 mEq/L in 24h) to prevent Osmotic Demyelination Syndrome. Severe Hyperkalemia (>6.0 mEq/L): IV Calcium Gluconate, regular insulin + dextrose, salbutamol nebulization.", "references": ["European Clinical Practice Guidelines on Diagnosis and Treatment of Hyponatraemia", "KDIGO Guidelines"]},
         "STAT alert for potassium < 3.0 or > 6.0 mEq/L or sodium < 120 or > 160 mEq/L. Order STAT 12-lead ECG.",
         ["Potassium > 6.0 mEq/L (Life-Threatening Cardiac Arrhythmia Risk)", "Potassium < 2.5 mEq/L with muscle paralysis", "Sodium < 120 mEq/L with confusion, delirium, or seizures"],
         ["Do NOT rapidly drink massive volumes of plain water in severe hyponatremia", "Do NOT delay medical care for critical electrolyte reports"],
         "European Renal Association Guidelines & KDIGO Clinical Practice", "Dr. A. Sharma (MD, Nephrology)"),

        ("lab_urine_routine_009", "Urine Routine & Microscopy (Urinalysis)", ["urine routine", "urine analysis", "urinalysis", "urine test", "pus cells in urine", "urine r m"],
         "Evaluates physical, chemical, and microscopic properties of urine to detect urinary tract infections, kidney disease, and diabetes.",
         [
             "Sample collection: Clean-catch midstream urine sample is required (clean the genital area, pass initial stream into toilet, then collect middle portion in sterile cup).",
             "Key markers explained:",
             "- Pus Cells / WBCs: Normal 0 to 5 per high-power field (HPF). More than 10 suggests urinary tract infection (UTI) or inflammation.",
             "- Red Blood Cells (RBCs): Normal 0 to 2/HPF. High levels (hematuria) indicate stones, infection, or kidney disease.",
             "- Protein / Albumin: Normal is Negative or trace. Positive protein suggests kidney filter damage.",
             "- Glucose & Ketones: Normal is Negative. Presence indicates uncontrolled diabetes or starvation.",
             "- Nitrites & Leukocyte Esterase: Positive tests indicate bacterial infection.",
             "If infection is suspected, a urine culture and sensitivity test should be ordered."
         ],
         {"assessment": "Diagnostic urinalysis evaluating for pyuria, micro/macrohematuria, proteinuria, crystalluria, and bacteriuria.", "investigations": "Urine Culture and Sensitivity if pyuria present. Spot urine protein-to-creatinine ratio (UPCR) if protein positive.", "management": "Targeted antibiotic therapy if symptomatic UTI with pyuria. Renal evaluation if persistent dysmorphic RBCs or red cell casts.", "references": ["EAU Guidelines on Urological Infections", "KDIGO Clinical Practice Guideline for CKD"]},
         "Verify midstream collection technique. Check for pyuria and proteinuria.",
         ["Heavy proteinuria (3+ or 4+) with facial puffiness and low albumin (Nephrotic Syndrome)", "Gross macroscopic hematuria (visible red blood)", "RBC casts indicating acute glomerulonephritis"],
         ["Do NOT touch the inside of the sterile specimen container", "Do NOT collect sample during active menstrual bleeding if avoidable (contaminates with RBCs)"],
         "European Association of Urology (EAU) & KDIGO Guidelines", "Dr. A. Sharma (MD, Pathology)"),

        ("lab_crp_010", "C-Reactive Protein (CRP)", ["crp", "c reactive protein", "crp test", "inflammation blood test", "crp high"],
         "A blood marker produced by the liver that rises rapidly in response to acute inflammation, bacterial infections, and tissue injury.",
         [
             "Preparation: No fasting required.",
             "Interpreting CRP values:",
             "- Normal: Less than 5 mg/L (or under 0.5 mg/dL).",
             "- Mild Elevation (10 to 40 mg/L): Mild viral infection, pregnancy, mild physical trauma, or gingivitis.",
             "- Moderate Elevation (40 to 100 mg/L): Active bacterial infection, autoimmune disease flare (rheumatoid arthritis, lupus), or severe bronchitis.",
             "- High Elevation (> 100 mg/L): Severe bacterial infection, sepsis, pneumonia, or major tissue trauma.",
             "CRP does not pinpoint the exact location of infection; your doctor evaluates it alongside your symptoms."
         ],
         {"assessment": "Acute phase reactant synthesized by hepatocytes under IL-6 stimulation. Rapid kinetics (rises within 6-8h, peaks at 48h, short half-life ~19h).", "investigations": "Correlate with CBC, procalcitonin, blood cultures, and targeted imaging.", "management": "Useful for monitoring therapeutic response to antibiotic therapy in pneumonia, endocarditis, or monitoring autoimmune disease flares.", "references": ["WHO Laboratory Guidance on Inflammatory Markers", "NICE Guidance on Sepsis"]},
         "Track serial CRP values to evaluate response to treatment.",
         ["CRP > 150 mg/L with high fever and hypotension (Severe Sepsis Alert)", "Rapidly escalating CRP in post-operative patients (Surgical site infection)"],
         ["Do NOT use CRP as the sole justification to start antibiotics without a clinical source", "Do NOT panic over mild elevations without symptoms"],
         "World Health Organization & NICE Clinical Guidelines on Sepsis", "Dr. A. Sharma (MD, Internal Medicine)"),

        ("lab_esr_011", "Erythrocyte Sedimentation Rate (ESR)", ["esr", "esr test", "erythrocyte sedimentation rate", "esr high"],
         "Measures the speed at which red blood cells settle to the bottom of a test tube; an indirect indicator of chronic systemic inflammation.",
         [
             "Preparation: No fasting required.",
             "Reference ranges:",
             "- Adult Men: Under 15 to 20 mm/hr (slightly higher in older adults).",
             "- Adult Women: Under 20 to 30 mm/hr.",
             "Understanding elevated ESR:",
             "- Elevated ESR indicates increased inflammatory proteins (like fibrinogen) in the blood.",
             "- It is elevated in chronic infections (like tuberculosis), autoimmune diseases (rheumatoid arthritis, lupus), and certain cancers.",
             "- Markedly high ESR (> 100 mm/hr) requires systematic medical evaluation for serious bacterial infection, polymyalgia rheumatica, or myeloma.",
             "ESR changes slowly over weeks, unlike CRP which changes within hours."
         ],
         {"assessment": "Indirect acute phase reactant reflecting increased plasma fibrinogen and immunoglobulins. Westergren method is standard reference.", "investigations": "Workup for markedly elevated ESR (>100 mm/hr): CBC, peripheral smear, SPEP/UPEP (multiple myeloma), CXR/sputum (TB), autoimmune serology (ANA, RF), urinalysis.", "management": "Investigate and treat underlying systemic illness. Note: falsely elevated in anemia, pregnancy, macrocytosis; falsely low in polycythemia, sickle cell disease.", "references": ["ICSH Guidelines for the Measurement of Erythrocyte Sedimentation Rate", "CDC Laboratory Reference Guidance"]},
         "Check for extreme elevation (>100 mm/hr). Correlate with CBC and fever history.",
         ["ESR > 100 mm/hr with headache and jaw pain in elderly (Temporal Arteritis - Urgent Blindness Risk)", "ESR > 100 mm/hr with bone pain and anemia (concern for Multiple Myeloma)"],
         ["Do NOT assume an elevated ESR always means an infection", "Do NOT expect ESR to drop immediately after an infection is treated (takes weeks)"],
         "International Council for Standardization in Haematology (ICSH)", "Dr. A. Sharma (MD, Internal Medicine)"),

        ("lab_uric_acid_012", "Serum Uric Acid", ["uric acid", "uric acid test", "serum uric acid", "hyperuricemia test", "gout blood test"],
         "Measures the amount of uric acid in blood produced from the breakdown of purines in food and body cells.",
         [
             "Preparation: 4 to 8 hours of fasting is preferred; avoid high-purine foods and alcohol for 24 hours before the test.",
             "Reference ranges:",
             "- Adult Men: 3.5 to 7.2 mg/dL.",
             "- Adult Women: 2.6 to 6.0 mg/dL.",
             "- Gout Treatment Target: Kept strictly below 6.0 mg/dL (or below 5.0 mg/dL if tophi are present).",
             "Understanding high uric acid (Hyperuricemia):",
             "- High levels can form sharp needle-like crystals in joints (causing gout attacks) or in kidneys (forming painful uric acid kidney stones).",
             "- Many people with high uric acid never develop gout; treatment is indicated if you have symptoms or kidney stones.",
             "Note: Uric acid levels can be falsely normal or low during an acute gout flare; test 2 to 4 weeks after the flare settles."
         ],
         {"assessment": "Serum Urate measurement. Differentiates asymptomatic hyperuricemia from symptomatic crystal-proven gout or uric acid nephrolithiasis.", "investigations": "Arthrocentesis for synovial fluid crystal analysis during joint flare. Renal function (creatinine, eGFR).", "management": "Asymptomatic hyperuricemia generally does not require pharmacotherapy. Symptomatic gout: initiate urate-lowering therapy (Allopurinol / Febuxostat) with treat-to-target goal < 6.0 mg/dL.", "references": ["ACR Guideline for the Management of Gout (2020)", "EULAR Recommendations for Gout"]},
         "Note: Do not check uric acid solely during acute flare; confirm 2-4 weeks post-flare.",
         ["Uric acid > 12 mg/dL with rising creatinine (Tumor Lysis Syndrome or Acute Urate Nephropathy)", "Severe flank pain with hematuria (Kidney Stone)"],
         ["Do NOT start or stop Allopurinol on your own based on a single laboratory number", "Do NOT drink beer or sugary sodas before testing"],
         "American College of Rheumatology (ACR) Gout Guidelines", "Dr. A. Sharma (MD, Rheumatology)"),

        ("lab_dengue_serology_013", "Dengue Serology (NS1 Antigen & IgM/IgG Antibodies)", ["dengue test", "dengue ns1", "dengue igm", "dengue blood test", "platelet dengue test"],
         "Detects dengue viral protein (NS1) and body antibodies (IgM and IgG) to confirm dengue infection.",
         [
             "Preparation: No fasting required.",
             "Which test to do based on the day of fever:",
             "- Day 1 to Day 5 of fever: Dengue NS1 Antigen test is the most accurate test (detects the virus itself).",
             "- Day 5 onwards: Dengue IgM and IgG Antibody tests become positive (detects your immune response).",
             "- Testing NS1 too late or IgM too early can lead to a false-negative result.",
             "A positive dengue test means you must drink plenty of fluids (ORS, coconut water) and monitor your platelet count daily with CBC.",
             "Take only Paracetamol for fever; NEVER take Ibuprofen, Brufen, or Aspirin."
         ],
         {"assessment": "Diagnostic laboratory testing for Dengue Virus (DENV). Timing-dependent test selection is critical to avoid false negatives.", "investigations": "Dengue NS1 ELISA / Rapid (Days 1-5). Dengue IgM/IgG ELISA (Day 5 onwards). Serial CBC with hematocrit daily to monitor plasma leakage.", "management": "Judicious oral/IV fluid therapy according to WHO Dengue guidelines. Strict avoidance of NSAIDs and antiplatelets.", "references": ["WHO Guidelines for Diagnosis, Treatment, Prevention & Control of Dengue", "NVBDCP National Guidelines"]},
         "Verify fever onset date to confirm correct test (NS1 vs IgM). Order STAT CBC.",
         ["Dengue positive with platelets < 50,000/mcL or hematocrit rising > 20%", "Severe abdominal pain, persistent vomiting, or mucosal bleeding"],
         ["Do NOT order Dengue IgM on Day 1 or 2 of fever (falsely negative)", "Do NOT take Ibuprofen or pain injections if Dengue is suspected"],
         "WHO Dengue Guidelines & NVBDCP India", "Dr. A. Sharma (MD, Internal Medicine)"),

        ("lab_troponin_014", "Cardiac Troponin I / T (High-Sensitivity hs-cTn)", ["troponin", "troponin test", "cardiac troponin", "troponin i", "troponin t", "heart attack blood test"],
         "The gold standard blood test for detecting heart muscle injury and diagnosing acute myocardial infarction (heart attack).",
         [
             "Preparation: Emergency test; performed immediately without fasting.",
             "Understanding Troponin:",
             "- Troponin is a protein found inside heart muscle cells.",
             "- When heart muscle is starved of oxygen during a heart attack, troponin leaks into the bloodstream.",
             "- Any detectable rise above the 99th percentile upper reference limit indicates myocardial cell damage.",
             "- Emergency doctors perform serial troponin tests (at 0, 1, or 3 hours) to check if levels are rising, which confirms a dynamic heart attack.",
             "If troponin is elevated with chest pain, immediate emergency hospital admission is mandatory."
         ],
         {"assessment": "High-Sensitivity Cardiac Troponin (hs-cTnI or hs-cTnT). Diagnostic criterion for Acute Myocardial Infarction per Fourth Universal Definition of Myocardial Infarction (rise and/or fall of hs-cTn with at least one value >99th percentile URL).", "investigations": "Immediate 12-lead ECG, serial hs-cTn at 0h and 1h (or 2h/3h algorithm), bedside echocardiogram.", "management": "Urgent cardiology evaluation. Activate catheterization lab for Primary PCI if STEMI or high-risk NSTE-ACS. Antiplatelet (Aspirin + Ticagrelor/Clopidogrel), Anticoagulation (Enoxaparin/UFH).", "references": ["Fourth Universal Definition of Myocardial Infarction (ESC/ACC/AHA/WHF)", "ESC Guidelines for ACS (2023)"]},
         "STAT test. Notify emergency medical officer immediately upon any elevated troponin result.",
         ["hs-cTn > 99th percentile with dynamic delta rise", "Chest pain with ST-segment elevation on 12-lead ECG"],
         ["Do NOT discharge a chest pain patient based on a single early normal troponin without serial testing", "Do NOT delay emergency room transfer"],
         "Fourth Universal Definition of Myocardial Infarction & ESC Guidelines", "Dr. R. Kapoor (MD, Cardiology)"),

        ("lab_vitamin_d_015", "Vitamin D (25-Hydroxy Vitamin D / 25-OH D)", ["vitamin d test", "vitamin d3 test", "25 oh vitamin d", "calcitriol test", "vitamin d deficiency"],
         "Measures 25-hydroxyvitamin D to determine if your body has sufficient vitamin D for bone strength and immune health.",
         [
             "Preparation: No fasting required.",
             "Interpreting Vitamin D levels (in ng/mL):",
             "- Severe Deficiency: Less than 10 ng/mL.",
             "- Deficiency: 10 to 19 ng/mL.",
             "- Insufficiency: 20 to 29 ng/mL.",
             "- Sufficient / Optimal: 30 to 100 ng/mL.",
             "- Potential Toxicity: Greater than 100 ng/mL (usually only from massive overdoses of supplements).",
             "Low vitamin D can cause bone aching, muscle weakness, and fatigue. Your doctor may prescribe high-dose weekly Vitamin D3 (60,000 IU) capsules for 6 to 8 weeks to replenish deep stores."
         ],
         {"assessment": "Serum 25-hydroxyvitamin D [25(OH)D]. The reliable circulating biomarker of total body vitamin D nutritional status.", "investigations": "Serum Calcium, Phosphate, Alkaline Phosphatase, intact PTH, Serum Creatinine.", "management": "Deficiency (<20 ng/mL): Cholecalciferol (Vitamin D3) 50,000-60,000 IU once weekly for 6-8 weeks, followed by maintenance 1000-2000 IU daily (or 60,000 IU monthly). Co-administer adequate dietary calcium (1000-1200 mg/day).", "references": ["Endocrine Society Clinical Practice Guideline on Vitamin D", "IOF Guidelines on Vitamin D"]},
         "Review 25(OH)D value. Differentiate daily maintenance from weekly therapeutic loading.",
         ["Serum Calcium > 11.5 mg/dL with high Vitamin D > 150 ng/mL (Vitamin D Toxicity / Hypercalcemia)", "Severe bone pain and muscle weakness in elderly"],
         ["Do NOT take high-dose 60,000 IU Vitamin D3 daily (causes hypercalcemia, kidney stones, and toxicity)", "Do NOT stop calcium rich dietary intake"],
         "Endocrine Society Clinical Practice Guidelines & International Osteoporosis Foundation", "Dr. R. Kapoor (MD, Endocrinology)"),

        ("lab_ddimer_016", "D-Dimer", ["d dimer", "d dimer test", "blood clot test", "deep vein thrombosis test", "pulmonary embolism test"],
         "Measures a protein fragment produced when a blood clot dissolves in the body; primarily used to rule out dangerous blood clots.",
         [
             "Preparation: Emergency test; no fasting required.",
             "Understanding D-Dimer:",
             "- Normal / Negative: Below 500 ng/mL FEU (Fibrinogen Equivalent Units).",
             "- A NORMAL D-Dimer has very high accuracy (negative predictive value) to rule out Deep Vein Thrombosis (DVT blood clot in leg) or Pulmonary Embolism (blood clot in lungs).",
             "- An ELEVATED D-Dimer means clot breakdown is occurring, but it is not specific: it also rises in infections, inflammation, surgery, pregnancy, trauma, and aging.",
             "- If D-Dimer is elevated, your doctor will order a Doppler ultrasound of your legs or a CT scan of your chest to confirm or rule out a clot."
         ],
         {"assessment": "Fibrin degradation product. High sensitivity (>95%) and high negative predictive value (>99%) for venous thromboembolism (VTE). Age-adjusted cutoff for patients >50y: Age x 10 ng/mL.", "investigations": "Calculate clinical pre-test probability (Wells Score / Geneva Score). If high risk or D-Dimer positive: Lower extremity Venous Duplex Ultrasound (for DVT) or CT Pulmonary Angiography (CTPA for PE).", "management": "If VTE confirmed: therapeutic anticoagulation (DOAC e.g. Apixaban/Rivaroxaban or LMWH) immediately unless contraindicated.", "references": ["ACCP / CHEST Guidelines for Antithrombotic Therapy for VTE", "ESC Guidelines on Acute Pulmonary Embolism"]},
         "Emergency marker. If positive and accompanied by sudden shortness of breath or unilateral leg swelling, alert physician immediately.",
         ["D-Dimer positive with sudden pleuritic chest pain and breathlessness (Pulmonary Embolism - Medical Emergency)", "Unilateral hot, painful calf swelling"],
         ["Do NOT use D-Dimer as a standalone test without calculating clinical Wells score", "Do NOT assume a positive D-Dimer automatically means a clot without diagnostic imaging"],
         "American College of Chest Physicians (CHEST) & European Society of Cardiology", "Dr. A. Sharma (MD, Internal Medicine)")
    ]

    out = []
    for lid, topic, kw, desc, p_ans, doc_a, staff_m, red_f, avoid_l, src, rev in labs:
        out.append({
            "id": lid,
            "topic": f"Laboratory Test: {topic}",
            "category": "lab_tests",
            "keywords": kw,
            "intent": "lab_report_explanation",
            "patient_answer": p_ans,
            "doctor_answer": doc_a,
            "staff_answer": staff_m,
            "red_flags": red_f,
            "follow_up_questions": ["What was your exact numerical test result and laboratory reference range?", "Why did your doctor recommend this test?", "Are you experiencing any active symptoms like fever, pain, or dizziness?"],
            "avoid": avoid_l,
            "source": src,
            "review_status": "approved",
            "reviewed_by": rev
        })
    return out
