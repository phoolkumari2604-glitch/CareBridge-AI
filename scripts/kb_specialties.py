"""
Specialties knowledge base module (20 entries)
"""
def get_specialties():
    specs = [
        ("spec_cardiology_001", "Cardiology", ["cardiologist", "heart doctor", "cardiology", "dil ka doctor", "chest doctor heart", "ecg doctor"],
         "Cardiologists specialize in diagnosing and treating diseases of the heart and blood vessels, including heart attacks, hypertension, heart failure, and arrhythmias.",
         "Schedule a consultation if you experience chest pain, breathlessness on exertion, palpitations, ankle swelling, or have high cardiovascular risk factors.",
         "Cardiology consult indicated for CAD, valve disorders, cardiomyopathy, arrhythmias, and post-PCI/CABG follow-up. Investigations: ECG, 2D Echo, TMT, Holter.",
         "Triage Yellow/Red based on chest pain or hemodynamics. Direct to ECG room.", "ACC/AHA Guidelines for Cardiovascular Disease"),

        ("spec_pulmonology_002", "Pulmonology / Respiratory Medicine", ["pulmonologist", "chest specialist", "lung doctor", "asthma doctor", "phephde ka doctor", "respiratory doctor"],
         "Pulmonologists diagnose and treat conditions affecting the respiratory system, including asthma, COPD, pneumonia, tuberculosis, and sleep apnea.",
         "Consult a pulmonologist if you have a persistent cough lasting over 2 weeks, shortness of breath, chronic wheezing, or coughing up blood.",
         "Pulmonary evaluation indicated for obstructive/restrictive lung disease, chronic cough, interstitial lung disease, and hemoptysis. Spirometry, DLCO, HRCT Chest.",
         "Triage Yellow/Red based on SpO2 and respiratory rate. Prepare nebulizer.", "ATS/BTS Guidelines for Respiratory Illnesses"),

        ("spec_neurology_003", "Neurology", ["neurologist", "nerve doctor", "brain doctor", "dimag ka doctor", "seizure doctor", "stroke doctor", "headache doctor"],
         "Neurologists specialize in disorders of the brain, spinal cord, nerves, and muscles, including stroke, epilepsy, migraines, Parkinson's, and neuropathy.",
         "See a neurologist for recurring severe headaches, unexplained seizures, numbness or tingling in limbs, tremors, or memory changes.",
         "Neurological workup indicated for central/peripheral nervous system disorders. Investigations: Brain MRI/MRA, EEG, NCS/EMG, lumbar puncture.",
         "Triage Red for acute stroke or status epilepticus; Green/Yellow for outpatient headaches.", "American Academy of Neurology (AAN) Practice Guidelines"),

        ("spec_gastroenterology_004", "Gastroenterology & Hepatology", ["gastroenterologist", "stomach doctor", "liver doctor", "pet ka doctor", "endoscopy doctor", "digestive doctor"],
         "Gastroenterologists treat disorders of the digestive tract, including the esophagus, stomach, intestines, liver, gallbladder, and pancreas.",
         "Consult a gastroenterologist for chronic acid reflux, unexplained abdominal pain, yellow jaundice, rectal bleeding, or persistent bowel changes.",
         "Gastroenterology consult indicated for GERD, peptic ulcer, IBD, chronic liver disease/cirrhosis, and chronic diarrhea. Endoscopy, Colonoscopy, FibroScan.",
         "Triage Red if hematemesis or acute severe pancreatitis; Green for chronic dyspepsia.", "American College of Gastroenterology (ACG) Clinical Guidelines"),

        ("spec_endocrinology_005", "Endocrinology & Diabetology", ["endocrinologist", "diabetes specialist", "thyroid doctor", "hormone doctor", "sugar doctor"],
         "Endocrinologists specialize in hormone-producing glands and metabolic conditions like diabetes, thyroid disorders, osteoporosis, and adrenal disease.",
         "See an endocrinologist for uncontrolled diabetes, difficult thyroid disorders, sudden unexplained weight changes, or pituitary hormone imbalances.",
         "Endocrine referral indicated for brittle diabetes, thyroid nodules, adrenal disorders, PCOS, hypercalcemia, and metabolic bone disease.",
         "Triage Green unless severe hypo/hyperglycemia. Review glucose log and HbA1c.", "Endocrine Society & American Diabetes Association (ADA) Guidelines"),

        ("spec_nephrology_006", "Nephrology", ["nephrologist", "kidney doctor", "dialysis doctor", "gurde ka doctor", "renal specialist"],
         "Nephrologists diagnose and manage acute and chronic kidney diseases, electrolyte imbalances, high blood pressure refractory to treatment, and dialysis.",
         "Consult a nephrologist if blood tests show elevated serum creatinine, protein in your urine, swollen legs, or if you need dialysis management.",
         "Nephrology evaluation indicated for CKD stage 3-5, nephrotic/nephritic syndrome, resistant hypertension, and refractory electrolyte abnormalities.",
         "Triage Yellow/Orange if hyperkalemia or fluid overload; Green for CKD follow-up.", "KDIGO Clinical Practice Guidelines for Kidney Diseases"),

        ("spec_oncology_007", "Oncology (Medical, Surgical & Radiation)", ["oncologist", "cancer specialist", "cancer doctor", "tumor doctor", "chemotherapy doctor"],
         "Oncologists specialize in diagnosing, staging, and treating cancer using chemotherapy, immunotherapy, targeted therapy, radiation, and surgical excision.",
         "Seek oncological evaluation for suspicious lumps, abnormal biopsies, unexplained significant weight loss, or persistent unhealed sores.",
         "Multidisciplinary tumor board assessment. Investigations: tissue biopsy with IHC, PET-CT, genetic profiling, tumor markers. Coordinate staging and systemic therapy.",
         "Triage Yellow. Handle with compassion and expedite staging tests.", "National Comprehensive Cancer Network (NCCN) Guidelines"),

        ("spec_pediatrics_008", "Pediatrics & Child Health", ["pediatrician", "child specialist", "baby doctor", "bachhon ka doctor", "infant specialist"],
         "Pediatricians manage the physical, behavioral, and mental health of infants, children, and adolescents, including growth milestones and vaccinations.",
         "Bring your child to a pediatrician for routine well-baby checks, vaccinations, high fever, feeding problems, or developmental concerns.",
         "Pediatric clinical care from neonatal period to adolescence. Assess growth curves (WHO z-scores), developmental milestones, and immunization schedules.",
         "Triage Red if infant <3 months febrile or respiratory distress. Weigh child accurately.", "Indian Academy of Pediatrics (IAP) & AAP Guidelines"),

        ("spec_obgyn_009", "Obstetrics & Gynecology (OB-GYN)", ["gynecologist", "obstetrician", "lady doctor", "mahila doctor", "pregnancy doctor", "delivery doctor", "pcos doctor"],
         "OB-GYNs provide care for the female reproductive system, pregnancy, childbirth, contraception, menopause, and menstrual disorders.",
         "Visit an OB-GYN for prenatal checkups, irregular or painful periods, pelvic pain, contraceptive counseling, cervical cancer screening (Pap smear), or pregnancy.",
         "Comprehensive maternal-fetal and gynecological care. Ultrasound pelvis/obstetric, Pap smear, HPV co-testing, hormonal assays, antenatal monitoring.",
         "Triage Red if bleeding in pregnancy or ectopic rupture; Green for routine ANC.", "ACOG Guidelines & FOGSI (Federation of Obstetric and Gynaecological Societies of India)"),

        ("spec_dermatology_010", "Dermatology & Venereology", ["dermatologist", "skin doctor", "chamdi ka doctor", "hair doctor", "acne specialist", "rash doctor"],
         "Dermatologists diagnose and treat skin, hair, and nail conditions, including eczema, psoriasis, acne, hair loss, skin infections, and skin cancers.",
         "Consult a dermatologist for stubborn skin rashes, changing or bleeding moles, persistent acne, severe itching, or sudden hair thinning.",
         "Dermatological evaluation including dermoscopy, Wood's lamp, KOH fungal mount, and skin biopsy. Formulate topical and systemic treatment protocols.",
         "Triage Green unless severe blistering drug reaction (SJS/TEN - Triage Red).", "American Academy of Dermatology (AAD) Practice Guidelines"),

        ("spec_orthopedics_011", "Orthopedics & Joint Replacement", ["orthopedic doctor", "bone doctor", "haddi ka doctor", "joint doctor", "fracture specialist", "spine surgeon"],
         "Orthopedic surgeons specialize in the diagnosis and surgical/non-surgical treatment of bone, joint, ligament, tendon, and spine disorders.",
         "See an orthopedic doctor for broken bones, persistent joint pain, torn ligaments, back pain radiating to legs, or sports injuries.",
         "Musculoskeletal assessment: evaluate neurovascular status, joint alignment, and range of motion. Plain radiographs, CT, MRI. Casting, arthroscopy, arthroplasty.",
         "Triage Orange/Red for open fractures or neurovascular compromise; Green for chronic OA.", "American Academy of Orthopaedic Surgeons (AAOS) Guidelines"),

        ("spec_ophthalmology_012", "Ophthalmology", ["ophthalmologist", "eye doctor", "aankh ka doctor", "cataract doctor", "retina specialist", "vision doctor"],
         "Ophthalmologists are medical doctors specializing in complete eye care, vision testing, eye diseases like glaucoma and cataracts, and eye surgery.",
         "Visit an ophthalmologist for sudden blurry vision, flashes of light, severe eye pain, floaters, cataracts, or regular diabetic eye checkups.",
         "Ophthalmic evaluation: visual acuity (Snellen), slit-lamp biomicroscopy, intraocular pressure (tonometry), and dilated fundoscopy.",
         "Triage Red if sudden painless vision loss or acute angle closure; Green for refraction.", "American Academy of Ophthalmology (AAO) Preferred Practice Patterns"),

        ("spec_ent_013", "ENT (Otorhinolaryngology)", ["ent doctor", "ear nose throat doctor", "kaan naak gala doctor", "sinus doctor", "hearing specialist"],
         "ENT specialists diagnose and treat disorders of the ears, nose, throat, sinuses, vocal cords, and structures of the head and neck.",
         "Consult an ENT specialist for persistent ear discharge, chronic sinusitis, hearing loss, recurring tonsillitis, vertigo, or hoarseness.",
         "Diagnostic otoscopy, flexible nasopharyngolaryngoscopy, pure tone audiometry, and impedance audiometry. Medical and surgical management.",
         "Triage Red for stridor or severe foreign body aspiration; Green for allergic rhinitis.", "American Academy of Otolaryngology-Head and Neck Surgery (AAO-HNS)"),

        ("spec_psychiatry_014", "Psychiatry & Behavioral Health", ["psychiatrist", "mental health doctor", "depression doctor", "counseling doctor", "psychologist mental health"],
         "Psychiatrists specialize in the diagnosis, medical treatment, and psychotherapy of mental health, emotional, and substance use disorders.",
         "Reach out to a psychiatrist for overwhelming anxiety, depression, insomnia, mood swings, panic attacks, or difficulty coping with daily life.",
         "Comprehensive psychiatric assessment using DSM-5 / ICD-11 criteria. Pharmacotherapy (antidepressants, anxiolytics, mood stabilizers) and psychotherapeutic referral.",
         "Triage Red for active suicidal ideation or acute agitation (1:1 supervision).", "American Psychiatric Association (APA) Practice Guidelines & WHO Mental Health"),

        ("spec_general_surgery_015", "General & Laparoscopic Surgery", ["general surgeon", "surgeon", "operation doctor", "hernia surgeon", "appendix doctor"],
         "General surgeons perform surgical procedures for abdominal organs (appendix, gallbladder, hernia, bowel), breasts, skin cysts, and trauma.",
         "Consult a general surgeon for suspected appendicitis, painful gallstones, groin hernias, anal fissures, hemorrhoids, or unresolved abdominal lumps.",
         "Pre-operative and post-operative surgical management. Urgent evaluation for acute surgical abdomen (peritonitis, bowel obstruction, acute appendicitis).",
         "Triage Red if acute rigid abdomen, incarcerated hernia, or active trauma.", "American College of Surgeons (ACS) & Association of Surgeons of India (ASI)"),

        ("spec_urology_016", "Urology", ["urologist", "urine doctor", "prostate doctor", "kidney stone specialist", "men health doctor"],
         "Urologists specialize in the urinary tract of both sexes and the male reproductive system, including kidney stones, prostate enlargement, and urinary issues.",
         "See a urologist for kidney stone pain, blood in urine, weak urine flow in men, difficulty emptying the bladder, or male fertility issues.",
         "Urological evaluation: ultrasonography KUB, uroflowmetry, non-contrast CT KUB for urolithiasis, Serum PSA for prostate screening, cystoscopy.",
         "Triage Yellow for renal colic; Red if infected hydronephrosis with fever.", "American Urological Association (AUA) & European Association of Urology (EAU)"),

        ("spec_rheumatology_017", "Rheumatology", ["rheumatologist", "gathiya doctor", "arthritis specialist", "autoimmune doctor", "lupus specialist"],
         "Rheumatologists specialize in autoimmune and inflammatory diseases affecting joints, muscles, and bones, such as lupus, rheumatoid arthritis, and vasculitis.",
         "Consult a rheumatologist for unexplained joint inflammation, morning stiffness lasting >1 hour, positive ANA tests, or multi-organ inflammatory symptoms.",
         "Diagnostic workup for systemic autoimmune rheumatic diseases (SARD): autoimmune serology (ANA, dsDNA, ENA panel, ANCA), inflammatory markers, musculoskeletal ultrasound.",
         "Triage Green/Yellow unless pulmonary-renal syndrome or active lupus nephritis.", "American College of Rheumatology (ACR) Guidelines"),

        ("spec_hematology_018", "Hematology", ["hematologist", "blood specialist", "blood disease doctor", "hemophilia doctor", "thalassemia doctor"],
         "Hematologists diagnose and treat blood disorders, including complex anemias, thalassemia, hemophilia, leukemia, lymphoma, and bleeding disorders.",
         "See a hematologist for unexplained low blood counts, easy bruising or abnormal bleeding, enlarged lymph nodes, or family history of blood disorders.",
         "Hematological evaluation: peripheral blood smear morphology, bone marrow aspiration/biopsy, flow cytometry, hemoglobin electrophoresis, coagulation profiles.",
         "Triage Orange/Red if severe neutropenic fever or acute coagulopathy.", "American Society of Hematology (ASH) Practice Guidelines"),

        ("spec_infectious_diseases_019", "Infectious Diseases", ["infectious disease specialist", "id specialist", "tropical doctor", "infection expert"],
         "Infectious disease specialists diagnose and manage complex, tropical, or antibiotic-resistant infections, HIV, complicated malaria, and fever of unknown origin.",
         "Consult an infectious disease specialist for fevers that have resisted standard treatments, HIV management, travel-related illnesses, or hospital-acquired infections.",
         "Investigation of Fever of Unknown Origin (FUO), antimicrobial stewardship, management of multi-drug resistant (MDR) bacterial and fungal pathogens.",
         "Triage Yellow/Orange depending on hemodynamic stability and infection control needs.", "Infectious Diseases Society of America (IDSA) Guidelines"),

        ("spec_emergency_medicine_020", "Emergency Medicine", ["emergency doctor", "casualty doctor", "er doctor", "emergency room", "trauma doctor", "urgent care"],
         "Emergency physicians specialize in rapid resuscitation, stabilization, and immediate care for acute life-threatening medical emergencies and trauma.",
         "Go directly to the Emergency Department for chest pain, sudden paralysis, severe breathing difficulty, high-impact accidents, or unconsciousness.",
         "Immediate triage (Red/Orange/Yellow/Green), resuscitation according to ABCDE protocols, emergency airway management, point-of-care ultrasound (POCUS), stabilization.",
         "Immediate Triage Red/Orange for all acute emergent complaints.", "Resuscitation Council & ACEP Guidelines")
    ]

    out = []
    for sid, topic, kw, p_ans, p_ans2, doc_m, staff_m, src in specs:
        out.append({
            "id": sid,
            "topic": f"Medical Specialty: {topic}",
            "category": "specialties",
            "keywords": kw,
            "intent": "appointment_or_navigation",
            "patient_answer": [
                p_ans,
                p_ans2,
                "You can book an appointment directly through the CareBridge app or ask our reception desk to guide you to this department."
            ],
            "doctor_answer": {
                "assessment": f"Specialty Consultation: {topic}.",
                "investigations": "Relevant targeted laboratory, radiological, or electrophysiological studies prior to referral.",
                "management": doc_m,
                "references": [src]
            },
            "staff_answer": staff_m,
            "red_flags": ["Acute severe chest pain or breathlessness", "Sudden weakness or loss of speech", "Severe trauma or unresponsiveness", "Severe bleeding"],
            "follow_up_questions": ["What specific symptoms are you seeking consultation for?", "Do you have existing medical reports or referrals?", "Would you like help booking an appointment with this department?"],
            "avoid": ["Do NOT delay emergency care for an outpatient specialty appointment"],
            "source": src,
            "review_status": "approved",
            "reviewed_by": "Dr. A. Sharma (MD, Medical Administration)"
        })
    return out
