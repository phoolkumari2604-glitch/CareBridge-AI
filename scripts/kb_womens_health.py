"""
Women's health knowledge base module (20 entries)
Covers menstrual health, PCOS, menopause, contraception, antenatal care, pregnancy danger signs, breastfeeding, postpartum care.
"""
def get_womens_health():
    wh = [
        ("wh_dysmenorrhea_periods_001", "Menstrual Cramps & Dysmenorrhea (Period Pain)", ["period pain", "menstrual cramps", "dysmenorrhea", "periods dard", "painful periods", "stomach pain periods"],
         [
             "Apply a warm water bag or heating pad across your lower abdomen or lower back for 15 to 20 minutes to relax contracting uterine muscles.",
             "Take an NSAID pain reliever like Ibuprofen (400 mg with food) or Mefenamic Acid (Meftal-Spas) at the very start of cramping; NSAIDs block excess prostaglandins that cause uterine spasms.",
             "Engage in light aerobic exercise, gentle pelvic yoga stretches (child's pose, cat-cow), or walking, which naturally stimulates endorphin release.",
             "Drink warm chamomile, ginger, or peppermint tea and stay well-hydrated to reduce abdominal bloating.",
             "Consult a gynecologist if period pain is excruciating, does not improve with pain relievers, or disrupts your school or work life (to evaluate for endometriosis)."
         ],
         {"assessment": "Primary Dysmenorrhea (prostaglandin F2-alpha mediated myometrial hypercontractility) vs Secondary Dysmenorrhea (Endometriosis, Adenomyosis, Uterine Fibroids, Pelvic Inflammatory Disease).", "investigations": "Pelvic Ultrasonography (transvaginal/transabdominal) to rule out structural pelvic pathology. High-vaginal swabs if pelvic pain or fever.", "management": "First-line: NSAIDs (Ibuprofen 400 mg TID or Mefenamic Acid 500 mg TID initiated 1-2 days prior to menses onset). Combined Oral Contraceptive Pills (COCPs) or Progestin-only pills / Levonorgestrel IUD to suppress ovulation and endometrial proliferation.", "references": ["ACOG Committee Opinion on Dysmenorrhea and Endometriosis in the Adolescent", "NICE Guidelines on Period Pain"]},
         "Priority: Triage Green unless severe acute pelvic pain with fever or abnormal bleeding (Triage Yellow). Inquire about onset and severity.",
         ["Sudden severe sharp lower abdominal pain with fever or chills (Pelvic Inflammatory Disease / Tubo-ovarian abscess)", "Severe pelvic pain with delayed period and positive pregnancy test (Ruptured Ectopic Pregnancy Emergency)"],
         ["Do NOT dismiss severe incapacitating period pain as 'just normal' (screen for endometriosis)", "Do NOT take NSAIDs on an empty stomach"],
         "American College of Obstetricians and Gynecologists (ACOG) & NICE Guidelines", "draft", None),

        ("wh_irregular_periods_002", "Irregular Periods & Oligomenorrhea", ["irregular periods", "period delayed", "irregular cycle", "periods late", "infrequent periods", "oligomenorrhea"],
         [
             "A normal menstrual cycle typically ranges between 21 and 35 days, counting from the first day of one period to the first day of the next.",
             "If you are sexually active and your period is even a few days late, take a home urine pregnancy test first thing in the morning with your first urine.",
             "Common causes of irregular cycles include polycystic ovary syndrome (PCOS), thyroid disorders, extreme stress, sudden weight fluctuations, and intense athletic training.",
             "Track your cycles on a calendar or phone app: record start dates, flow duration, and associated symptoms.",
             "See a gynecologist if your periods are consistently absent for more than 3 months, or arrive more frequently than every 21 days."
         ],
         {"assessment": "Abnormal Uterine Bleeding / Oligomenorrhea (cycle interval > 35 days). Evaluate FIGO PALM-COEIN classification (Polyp, Adenomyosis, Leiomyoma, Malignancy - Coagulopathy, Ovulatory dysfunction, Endometrial, Iatrogenic, Not yet classified).", "investigations": "Urine Pregnancy Test (hCG) mandatory first step. Serum TSH, Prolactin, Total/Free Testosterone, LH/FSH ratio, Fasting Glucose. Pelvic Ultrasound.", "management": "Etiology-driven. PCOS: lifestyle, cyclical progestins, or combined oral contraceptives. Hypothyroidism: Levothyroxine. Hyperprolactinemia: Dopamine agonists (Cabergoline).", "references": ["FIGO System 2 for Normal and Abnormal Uterine Bleeding", "ACOG Practice Bulletin on Amenorrhea"]},
         "Always perform point-of-care urine pregnancy test first in any female of reproductive age with delayed periods.",
         ["Severe acute pelvic pain or shoulder tip pain in a patient with delayed menses (Suspected Ectopic Pregnancy)", "Heavy menstrual flooding soaking > 2 thick pads per hour for 2 consecutive hours"],
         ["Do NOT assume irregular bleeding is harmless without ruling out pregnancy and thyroid imbalance", "Do NOT start hormonal pills without a gynecological evaluation"],
         "FIGO Classification System & American College of Obstetricians and Gynecologists (ACOG)", "draft", None),

        ("wh_pcos_symptoms_care_003", "PCOS Symptoms, Diagnosis & Long-Term Care", ["pcos", "pcod", "polycystic ovary syndrome", "facial hair women", "acne pcos", "ovary cysts"],
         [
             "PCOS (Polycystic Ovary Syndrome) is a common hormonal imbalance diagnosed by having at least 2 of 3 features (Rotterdam criteria): irregular/infrequent periods, excess androgens (acne, facial hair growth), and polycystic ovaries on ultrasound.",
             "Lifestyle changes are the cornerstone: losing just 5% to 10% of body weight significantly restores regular ovulation, improves fertility, and balances hormones.",
             "Adopt a low-glycemic, anti-inflammatory diet (millets, vegetables, pulses, lean proteins) and avoid sugary foods, refined maida, and sodas.",
             "Engage in at least 150 minutes of moderate exercise per week, combining brisk walking with strength training to overcome insulin resistance.",
             "Consult a gynecologist for targeted medical treatments: birth control pills for regular bleeding and acne, Metformin for insulin resistance, or fertility medications when planning a family."
         ],
         {"assessment": "Polycystic Ovary Syndrome (PCOS). Diagnosed by Rotterdam Consensus Criteria (2 of 3: Oligo/anovulation, Clinical/biochemical hyperandrogenism, Polycystic ovarian morphology on USG >=20 follicles/ovary).", "investigations": "Pelvic Ultrasound (transvaginal preferred in non-virgins), Fasting Glucose/HbA1c, Fasting Lipid Panel, Total Testosterone, DHEAS, TSH, 17-OHP (rule out Non-Classic Congenital Adrenal Hyperplasia).", "management": "First-line: Lifestyle intervention (5-10% weight loss). Cycle control: Combined Oral Contraceptives or cyclical micronized progesterone. Hyperandrogenism/Hirsutism: COCPs +/- Spironolactone (requires reliable contraception due to teratogenicity). Insulin sensitizer: Metformin 500-1500 mg/day.", "references": ["International Evidence-Based Guideline for the Assessment and Management of PCOS (2023)", "Androgen Excess and PCOS Society"]},
         "Screen for metabolic syndrome components: check BP, waist circumference, and fasting glucose.",
         ["Endometrial hyperplasia risk: Amenorrhea lasting > 3-4 months without withdrawal bleed (requires progestin withdrawal to protect uterine lining)", "Severe depression or anxiety related to body image"],
         ["Do NOT rely on birth control pills alone without addressing nutrition and exercise", "Do NOT assume PCOS means permanent infertility (most women conceive with lifestyle and ovulation induction)"],
         "International Evidence-Based Guideline for PCOS & ACOG", "draft", None),

        ("wh_menopause_hrt_004", "Menopause, Perimenopause & Hot Flashes", ["menopause", "hot flashes", "perimenopause", "night sweats menopause", "hrt", "vaginal dryness menopause", "mood swings 45"],
         [
             "Perimenopause is the natural transition leading up to menopause (typically between ages 45 and 55) marked by irregular periods, hot flashes, night sweats, sleep trouble, and mood swings.",
             "Menopause is officially reached when you have had 12 continuous months without a menstrual period (average age is 51 years).",
             "Manage hot flashes: dress in light layers, keep bedroom cool, avoid spicy foods, hot beverages, caffeine, and alcohol, and practice slow deep diaphragmatic breathing.",
             "For vaginal dryness and discomfort: use over-the-counter water-based or silicone vaginal moisturizers and lubricants during intimacy.",
             "Consult your doctor to discuss Hormone Replacement Therapy (HRT): modern HRT is highly effective for severe hot flashes and bone protection when started within 10 years of menopause in healthy women."
         ],
         {"assessment": "Perimenopause / Menopause transition. Characterized by follicular depletion, fluctuating estradiol, and elevated serum FSH (>30 IU/L). Symptoms: vasomotor (hot flashes), genitourinary syndrome of menopause (GSM), sleep disturbance, osteopenia.", "investigations": "Clinical diagnosis in women >45y with typical symptoms. Serum FSH/Estradiol not routinely required unless premature menopause (<40y). Baseline Mammogram, Pap smear, Pelvic ultrasound, DEXA bone scan, Lipid panel.", "management": "Vasomotor symptoms: Menopausal Hormone Therapy (MHT / HRT: Estrogen + Progestogen if uterus present; Estrogen alone if prior hysterectomy). Non-hormonal alternatives: SSRI/SNRIs (Venlafaxine, Paroxetine), Gabapentin, or Fezolinetant (NK3 receptor antagonist). Genitourinary syndrome: Low-dose local vaginal estrogen cream or tablets.", "references": ["NAMS (North American Menopause Society) Position Statement on Hormone Therapy", "NICE Guideline NG23: Menopause: diagnosis and management"]},
         "Review history of breast cancer, thromboembolism, or unexplained vaginal bleeding before HRT counseling.",
         ["ANY postmenopausal vaginal bleeding (even light spotting after 12 months of amenorrhea requires URGENT endometrial biopsy to rule out endometrial cancer)", "Severe unilateral leg swelling or chest pain"],
         ["NEVER IGNORE postmenopausal bleeding (it is a red-flag symptom until cancer is excluded)", "Do NOT smoke while taking oral hormone therapy"],
         "North American Menopause Society (NAMS) & NICE Guidelines NG23", "draft", None),

        ("wh_contraception_options_005", "Contraception & Birth Control Options", ["contraception", "birth control", "copper t", "oral contraceptive pills", "condom", "iud", "family planning"],
         [
             "Reversible contraception options include Barrier methods (Male and Female condoms), Hormonal pills, Injectables, and Long-Acting Reversible Contraception (IUDs).",
             "Male latex condoms are the ONLY contraceptive method that provides dual protection: preventing unintended pregnancy AND protecting against Sexually Transmitted Infections (STIs).",
             "Intrauterine Devices (Copper T or hormonal Mirena IUD) provide over 99% reliable birth control lasting 3 to 10 years and are completely reversible upon removal.",
             "Combined Oral Contraceptive Pills (COCPs) are taken daily at the same time; if you miss a pill, take it as soon as remembered and follow package guidelines.",
             "Consult a healthcare provider to choose the safest method tailored to your health profile, blood pressure, and future family plans."
         ],
         {"assessment": "Contraceptive counseling and selection based on WHO Medical Eligibility Criteria for Contraceptive Use (MEC Categories 1 to 4).", "investigations": "Blood pressure measurement (mandatory prior to combined hormonal contraception). Pelvic examination prior to IUD insertion. Pregnancy rule-out.", "management": "Tier 1 (Highest efficacy <1% failure): LARC (Levonorgestrel IUD, Copper IUD, Subdermal implant). Tier 2 (2-9% failure): Combined hormonal pills, Progestin-only pills, DMPA injectable. Tier 3 (10-20% failure): Barrier methods (condoms), fertility awareness. Contraindications to Estrogen (MEC 4): Migraine with aura, age >35y smoking >15 cig/day, uncontrolled hypertension, history of VTE/stroke.", "references": ["WHO Medical Eligibility Criteria for Contraceptive Use (5th Edition)", "CDC US Medical Eligibility Criteria for Contraceptive Use"]},
         "Check blood pressure before recommending combined oral contraceptive pills. Rule out active pregnancy.",
         ["Severe sudden chest pain, shortness of breath, or coughing blood in a woman on birth control pills (Pulmonary Embolism)", "Severe focal headache with visual aura on combined pills (Stroke Risk)"],
         ["Do NOT use combined estrogen pills if you experience migraines with visual aura (significantly spikes ischemic stroke risk)", "Do NOT use dual condoms together (friction causes breakage)"],
         "World Health Organization (WHO) MEC & Centers for Disease Control and Prevention (CDC)", "draft", None),

        ("wh_emergency_contraception_006", "Emergency Contraceptive Pill (Morning-After Pill / i-Pill)", ["emergency contraceptive", "morning after pill", "ipill", "unwanted 72", "levonorgestrel emergency", "ec pill"],
         [
             "Emergency contraception prevents pregnancy after unprotected intercourse, condom failure, or missed birth control pills.",
             "Levonorgestrel single-dose pill (1.5 mg, e.g., i-Pill, Unwanted-72) must be taken AS SOON AS POSSIBLE, ideally within 24 hours, and no later than 72 hours (3 days) after intercourse.",
             "The sooner the pill is swallowed, the higher its effectiveness in preventing ovulation.",
             "If you vomit within 2 hours of taking the pill, you MUST swallow another tablet immediately, as the first dose was not absorbed.",
             "Emergency pills do NOT cause abortion; they work strictly by delaying or preventing the release of an egg (ovulation). They do not affect an existing pregnancy.",
             "These pills are meant for emergency backup only and should NOT be used as routine regular birth control."
         ],
         {"assessment": "Post-coital emergency contraception. Mechanism: delays or inhibits LH surge and follicular development. Ineffective once implantation has occurred; does not interrupt established pregnancy.", "investigations": "Urine Pregnancy Test if menses is delayed by > 1 week beyond expected date or if atypical bleeding occurs.", "management": "Oral Levonorgestrel 1.5 mg single dose (effective up to 72 hours). Alternative: Ulipristal Acetate 30 mg single dose (effective up to 120 hours / 5 days). Most effective emergency method: Copper IUD inserted within 5 days of unprotected coitus (>99% effective). Resume routine regular contraception immediately.", "references": ["WHO Fact Sheet: Emergency Contraception", "ACOG Practice Bulletin on Emergency Contraception"]},
         "Verify time elapsed since unprotected intercourse (<72h for Levonorgestrel, <120h for Ulipristal/Copper IUD).",
         ["Severe lower abdominal pain 3-5 weeks after taking emergency contraception (must evaluate for Ectopic Pregnancy)", "Severe allergic reaction"],
         ["Do NOT use emergency pills as routine regular birth control (high hormone dose causes irregular bleeding and is less effective than regular methods)", "Do NOT assume emergency pills protect against STIs"],
         "World Health Organization (WHO) & American College of Obstetricians and Gynecologists (ACOG)", "draft", None),

        ("wh_antenatal_routine_anc_007", "Antenatal Care Schedule & Essential Pregnancy Tests (ANC)", ["antenatal care", "anc visits", "pregnancy checkup schedule", "pregnancy scans", "tifa scan", "blood test pregnancy"],
         [
             "Schedule regular Antenatal Care (ANC) visits: at least 4 visits minimum (WHO recommends 8 contacts) starting early in the first trimester.",
             "Key ultrasound scans during pregnancy:",
             "  1. Early Dating / Viability Scan (6 to 8 weeks): Confirms heartbeat and intrauterine pregnancy.",
             "  2. NT Scan & Dual Marker (11 to 13 weeks): Screens for chromosomal conditions like Down syndrome.",
             "  3. Anomaly Scan (TIFA / Level 2 Scan, 18 to 20 weeks): Detailed head-to-toe examination of fetal organ development.",
             "  4. Growth & Doppler Scan (28 to 36 weeks): Tracks baby's growth rate and placental blood flow.",
             "Routine blood tests: Blood group & Rh factor, complete blood count (Hb), Thyroid (TSH), Blood sugar (OGTT for gestational diabetes at 24-28 weeks), Urine test, and infection screening (HIV, HBsAg, VDRL).",
             "Receive two doses of Td (Tetanus-Diphtheria) vaccine and daily Iron and Calcium supplements starting from the second trimester."
         ],
         {"assessment": "Standard maternal-fetal surveillance and risk stratification during gestation.", "investigations": "Initial: Blood type & Rh antibody screen, CBC, Rubella IgG, Syphilis (VDRL), HBsAg, HIV, Urine culture. 11-13w: NT scan + PAPP-A/beta-hCG. 18-20w: Detailed anatomical survey (TIFA). 24-28w: 75g 2-hour Oral Glucose Tolerance Test (OGTT). Repeat Hb/platelets at 28 weeks. 35-37w: Group B Streptococcus (GBS) recto-vaginal swab.", "management": "Routine ANC visits: Q4W until 28 weeks, Q2W until 36 weeks, weekly until delivery. Daily elemental Iron (60 mg) and Folic Acid (400 mcg) + Calcium (1000 mg/day; taken separately). Blood pressure and urine dipstick for protein at every visit.", "references": ["WHO Recommendations on Antenatal Care for a Positive Pregnancy Experience", "MoHFW Guidelines for Antenatal Care and Skilled Attendance at Birth"]},
         "Record BP, fundal height, maternal weight, and urine albumin at every single visit. Check Rh status.",
         ["Blood pressure >= 140/90 mmHg with proteinuria (Preeclampsia)", "Fundal height measuring > 3 cm smaller or larger than gestational age"],
         ["Do NOT take Iron and Calcium tablets at the exact same moment (calcium severely inhibits iron absorption)", "Do NOT miss the critical 18-20 week Anomaly scan"],
         "World Health Organization (WHO) & Ministry of Health and Family Welfare (MoHFW) India", "draft", None),

        ("wh_pregnancy_danger_signs_008", "Critical Pregnancy Warning Signs (Immediate Emergency)", ["pregnancy danger signs", "emergency in pregnancy", "bleeding during pregnancy", "water breaking early", "baby not moving pregnancy", "danger signs pregnant"],
         [
             "Go to the nearest maternity hospital or emergency delivery room IMMEDIATELY if you experience any of these red-flag danger signs:",
             "1. Vaginal bleeding (any amount of spotting or fresh blood at any stage of pregnancy).",
             "2. Severe headache, blurred vision, seeing flashing spots, or sudden swelling of face, hands, and feet (signs of dangerous high blood pressure / Preeclampsia).",
             "3. Sudden gush or continuous leaking of watery fluid from your vagina (preterm rupture of membranes / water breaking).",
             "4. Noticeable decrease or complete absence of baby's movements (kick count dropping significantly in the 3rd trimester).",
             "5. Severe, continuous abdominal pain or cramping that does not relax.",
             "6. High fever with chills or foul-smelling vaginal discharge.",
             "Do not wait for your scheduled appointment if any of these signs appear; seek emergency care immediately."
         ],
         {"assessment": "Obstetric Emergencies: Antepartum Hemorrhage (Placenta Previa / Placental Abruption), Severe Preeclampsia / Eclampsia, Preterm Prelabor Rupture of Membranes (PPROM), Fetal Distress, Chorioamnionitis.", "investigations": "Continuous electronic fetal monitoring (CTG / Non-Stress Test), immediate maternal vitals, urine protein, urgent Obstetric Ultrasound with biophysical profile, CBC, coagulation profile (PT/INR, fibrinogen).", "management": "Severe Preeclampsia: IV Magnesium Sulfate (Pritchard/Zuspan regimen) for eclampsia seizure prophylaxis + IV Labetalol or oral Nifedipine for SBP >= 160 or DBP >= 110. Placental abruption: urgent fluid/blood resuscitation and emergency Cesarean delivery.", "references": ["ACOG Practice Bulletin: Gestational Hypertension and Preeclampsia", "WHO Recommendations for Prevention and Treatment of Pre-eclampsia and Eclampsia"]},
         "Priority: Triage Red. Place in left lateral tilt position. Connect continuous fetal CTG monitor and check maternal BP immediately.",
         ["Seizures or convulsions in pregnancy (Eclampsia - STAT IV Magnesium Sulfate)", "Massive vaginal bleeding with uterine rigidity (Placental Abruption)", "Fetal heart rate < 110 bpm or persistent decelerations (Fetal Distress)"],
         ["Do NOT perform digital vaginal examination in cases of unexplained antepartum hemorrhage (risk of torrential fatal bleeding in placenta previa)", "Do NOT delay emergency transfer"],
         "American College of Obstetricians and Gynecologists (ACOG) & World Health Organization", "draft", None),

        ("wh_breastfeeding_latch_009", "Breastfeeding Basics, Proper Latch & Sore Nipples", ["breastfeeding", "how to latch baby", "breastfeeding pain", "sore nipples", "low breast milk", "stanpan", "mother milk feeding"],
         [
             "Initiate breastfeeding within the first hour of delivery; early suckling stimulates prolactin and oxytocin hormones for milk production.",
             "The early thick yellowish milk is Colostrum: packed with protective antibodies and white blood cells, it acts as your newborn's first natural immunization.",
             "Technique for a deep, pain-free latch:",
             "  - Bring baby to breast, not breast to baby.",
             "  - Tickle baby's lips with nipple until they open mouth wide like a yawn.",
             "  - Aim nipple toward the roof of baby's mouth and pull baby close quickly.",
             "  - Baby's mouth should cover most of the dark lower areola (asymmetric latch), with lips flanged outwards and chin touching the breast.",
             "Breastfeeding should NOT hurt; if you feel sharp pinching or toe-curling nipple pain, gently break the suction with a clean finger in the baby's mouth corner and relatch.",
             "Feed on demand whenever baby shows early hunger cues (rooting, sucking hands, rapid eye movements) rather than waiting for crying."
         ],
         {"assessment": "Lactation assessment. Evaluate maternal positioning, infant oral anatomy (rule out ankyloglossia / tongue-tie), and latch mechanics (LATCH scoring system).", "investigations": "Clinical examination of nipples (cracks, erythema, candida) and infant weight gain trajectory (expected weight regain by 10-14 days).", "management": "Re-educate on deep asymmetric latch. For sore/cracked nipples: express a few drops of hindmilk and smear over nipple, allow to air dry; medical-grade purified lanolin cream. Frequency: 8-12 feeds per 24 hours. Assess wet diapers (>= 6 pale wet diapers/day confirms adequate intake after day 5).", "references": ["Academy of Breastfeeding Medicine (ABM) Clinical Protocols", "WHO/UNICEF Ten Steps to Successful Breastfeeding"]},
         "Observe a full feed. Check latch depth and baby's swallowing sounds. Weigh baby.",
         ["Severe breast engorgement with high fever, red painful breast wedge (Lactational Mastoiditis / Breast Abscess)", "Neonatal weight loss > 10% of birth weight or severe jaundice with dehydration"],
         ["Do NOT wash nipples with harsh soaps before every feed (strips natural protective Montgomery gland oils)", "Do NOT give prelacteal feeds like honey, sugar water, or ghutti"],
         "Academy of Breastfeeding Medicine (ABM) & WHO/UNICEF Guidelines", "draft", None),

        ("wh_mastitis_breast_abscess_010", "Mastitis & Blocked Milk Ducts", ["mastitis", "breast infection", "blocked milk duct", "breast swelling fever", "painful breast lump nursing"],
         [
             "A blocked milk duct presents as a tender, hard lump in the breast without systemic fever; treat it with gentle warmth, gentle massage toward the nipple while feeding, and frequent breast emptying.",
             "Mastitis is an inflammation or infection of the breast presenting with a hot, red, wedge-shaped swollen area on the breast accompanied by high fever (>= 38.5°C / 101.3°F), chills, and flu-like body aches.",
             "CRUCIAL RULE: CONTINUE BREASTFEEDING frequently from the affected breast; nursing does NOT harm the baby and is essential to clear milk stasis.",
             "Start feeds on the affected breast to ensure complete emptying, or pump if nursing is too painful.",
             "Take Paracetamol or Ibuprofen to reduce fever and breast inflammation.",
             "Consult a doctor promptly if fever persists over 24 hours; prescription antibiotics (safe for breastfeeding) are required to prevent a breast abscess."
         ],
         {"assessment": "Lactational Mastitis (inflammatory spectrum from milk stasis to bacterial infection, most commonly Staphylococcus aureus). Risk of progression to fluctuant Breast Abscess.", "investigations": "Clinical diagnosis. Breast milk culture if recurrent, hospital-acquired, or failing treatment. Breast ultrasonography if a discrete fluctuant mass is palpable to confirm or drain an abscess.", "management": "Continued effective milk removal (frequent nursing or pumping). Cold compresses and NSAIDs (Ibuprofen 400-600 mg TID) to reduce edema. If systemic signs or no improvement after 12-24h of conservative care: Oral antibiotic active against S. aureus (Cephalexin 500 mg QID, Flucloxacillin 500 mg QID, or Amoxicillin-Clavulanate 625 mg TID for 10-14 days). Breastfeeding is safe during antibiotic therapy.", "references": ["Academy of Breastfeeding Medicine (ABM) Protocol #36: The Mastitis Spectrum", "WHO Mastitis: Causes and Management"]},
         "Verify patient continues to breastfeed or pump. Check for fluctuant breast abscess.",
         ["Palpable soft, fluctuant, exquisitely tender breast mass (Breast Abscess requiring surgical drainage / ultrasound aspiration)", "Spreading redness with rigors and sepsis"],
         ["NEVER abruptly stop breastfeeding on the infected breast (causes severe milk stagnation and rapidly triggers abscess formation)", "Do NOT perform aggressive deep tissue breast squeezing"],
         "Academy of Breastfeeding Medicine (ABM) Clinical Protocols & WHO", "draft", None),

        ("wh_postpartum_danger_signs_011", "Postpartum Warning Signs (After-Delivery Emergencies)", ["postpartum warning signs", "after delivery danger signs", "postpartum bleeding", "heavy bleeding after birth", "postpartum fever"],
         [
             "The 6 weeks following childbirth (the postpartum period) require close vigilance for life-threatening maternal complications.",
             "Seek emergency medical care immediately if you experience:",
             "  1. Heavy vaginal bleeding: Soaking more than 1 large sanitary pad in an hour, passing blood clots larger than a lemon, or sudden return of bright red heavy bleeding (Postpartum Hemorrhage).",
             "  2. High fever (> 38°C / 100.4°F) or foul-smelling vaginal discharge (Uterine infection / Endometritis).",
             "  3. Severe headache, vision changes, or pain in the upper right belly (Postpartum Preeclampsia - can occur up to 6 weeks after delivery).",
             "  4. Sudden shortness of breath, chest pain, or coughing up blood (Pulmonary Embolism).",
             "  5. Pain, severe swelling, redness, or warmth in one calf muscle (Deep Vein Thrombosis).",
             "  6. Severe thoughts of harming yourself or your baby (Postpartum Depression / Psychosis)."
         ],
         {"assessment": "Postpartum maternal morbidity: Secondary Postpartum Hemorrhage (subinvolution, retained products of conception, infection), Puerperal Sepsis (Endometritis), Postpartum Preeclampsia / Eclampsia, Venous Thromboembolism (DVT/PE).", "investigations": "Urgent maternal vitals, CBC, coagulation profile, pelvic ultrasound (retained placental fragments), blood cultures, lower extremity duplex ultrasound or CTPA if VTE suspected.", "management": "Secondary PPH: Uterotonic agents (Oxytocin, Ergometrine, Carboprost, Misoprostol), uterine exploration/curettage. Puerperal sepsis: IV broad-spectrum antibiotics (Ampicillin + Gentamicin + Metronidazole). Postpartum preeclampsia: IV Magnesium sulfate + antihypertensives.", "references": ["ACOG Postpartum Toolkit & Maternal Safety Bundles", "WHO Recommendations for Prevention and Treatment of Postpartum Haemorrhage"]},
         "Priority: Triage Red. Check uterine firmness (boggy uterus indicates atony), measure BP, and quantify pad soaking rate.",
         ["Massive vaginal hemorrhage with hypotension and tachycardia (Severe Secondary PPH)", "Postpartum convulsions (Postpartum Eclampsia)", "Severe sudden dyspnea and tachycardia (Pulmonary Embolism)"],
         ["Do NOT dismiss severe postpartum headache as simple exhaustion", "Do NOT hesitate to seek emergency care for heavy pad soaking"],
         "American College of Obstetricians and Gynecologists (ACOG) & World Health Organization", "draft", None),

        ("wh_postpartum_blues_depression_012", "Baby Blues vs Postpartum Depression (PPD)", ["postpartum depression", "baby blues", "ppd", "crying after baby", "feeling sad after delivery", "postpartum mental health"],
         [
             "Baby Blues is very common (affecting up to 80% of new mothers): mild mood swings, crying spells, anxiety, and fatigue starting within 2 to 3 days after birth and resolving naturally within 10 to 14 days with rest and family support.",
             "Postpartum Depression (PPD) is a serious medical illness affecting 1 in 7 mothers: severe sadness, hopelessness, inability to bond with the baby, persistent panic, feeling inadequate, or intrusive scary thoughts lasting beyond 2 weeks.",
             "PPD is NOT a sign of weakness, personal failure, or being a bad mother; it is caused by massive postpartum hormonal crashes and neurochemical shifts.",
             "Treatment is highly effective: counseling/psychotherapy and breastfeeding-safe medications can restore your well-being.",
             "CRITICAL WARNING (Postpartum Psychosis): Hearing voices, seeing things that are not there, severe confusion, paranoia, or urges to harm the baby is an acute psychiatric emergency requiring immediate hospital admission."
         ],
         {"assessment": "Postpartum Mood Disorders: Postpartum Blues (self-limiting <2 weeks) vs Postpartum Depression (DSM-5 MDD with peripartum onset) vs Postpartum Psychosis (medical emergency; onset typically within 1-2 weeks postpartum, high infanticide/suicide risk).", "investigations": "Edinburgh Postnatal Depression Scale (EPDS >= 10 indicates probable depression). Screen TSH and CBC (postpartum thyroiditis and anemia mimic depression).", "management": "PPD: First-line psychotherapy (CBT, Interpersonal Therapy). Moderate-to-severe PPD: Pharmacotherapy with lactation-compatible SSRIs (Sertraline has lowest breastmilk excretion ratio). Postpartum Psychosis: Emergent psychiatric inpatient admission, atypical antipsychotics, lithium, avoid leaving mother alone with infant.", "references": ["ACOG Clinical Practice Guideline: Screening and Management of Perinatal Depression", "APA Practice Guideline for Peripartum Psychiatric Disorders"]},
         "Administer EPDS screening questionnaire at 6-week postnatal check. Screen specifically for intrusive self-harm or infant-harm thoughts.",
         ["Active suicidal ideation or thoughts of harming the infant", "Delusions, hallucinations, or severe paranoia (Postpartum Psychosis - Emergency)"],
         ["Do NOT tell a struggling mother to 'just snap out of it' or keep silent out of shame", "NEVER leave a psychotic postpartum mother alone with the infant"],
         "American College of Obstetricians and Gynecologists (ACOG) & American Psychiatric Association", "draft", None),

        ("wh_vaginitis_discharge_013", "Vaginal Discharge, Yeast Infection & Bacterial Vaginosis", ["vaginal discharge", "yeast infection", "white discharge", "bacterial vaginosis", "vaginal itching", "likoria", "curd discharge"],
         [
             "A small amount of clear, white, odorless vaginal discharge that changes in consistency across your menstrual cycle is completely normal and healthy.",
             "Yeast Infection (Candida thrush): Thick, white, clumpy discharge resembling cottage cheese or curd, accompanied by intense vaginal itching, redness, and burning.",
             "Bacterial Vaginosis (BV): Thin, watery, grayish-white discharge with a distinct, strong 'fishy' odor that becomes more noticeable after sex or washing with soap.",
             "Trichomoniasis (an STI): Frothy, greenish-yellow discharge with foul odor, genital itching, and pain during urination or intercourse.",
             "Treatment requires targeted medicines: antifungal pessaries/capsules for yeast, or prescription antibiotics (like Metronidazole) for BV.",
             "Never douche or wash inside the vagina; the vagina is naturally self-cleaning. Use plain warm water externally on the vulva only."
         ],
         {"assessment": "Vaginitis / Vulvovaginitis. Differentiate Candida albicans, Bacterial Vaginosis (Gardnerella / anaerobic overgrowth), and Trichomonas vaginalis.", "investigations": "Vaginal pH testing (pH < 4.5 in yeast; pH > 4.5 in BV and Trichomonas). Wet mount microscopy (budding yeast/pseudohyphae, clue cells for BV, motile flagellated trichomonads). Whiff amine test (10% KOH).", "management": "Vulvovaginal Candidiasis: Oral Fluconazole 150 mg single dose or topical Clotrimazole 100 mg vaginal tablets for 6 nights. Bacterial Vaginosis: Oral Metronidazole 400-500 mg BID for 7 days or Metronidazole 0.75% vaginal gel. Trichomoniasis: Oral Metronidazole 500 mg BID for 7 days (mandatory simultaneous treatment of male partner).", "references": ["CDC Sexually Transmitted Infections Treatment Guidelines (2021) - Vaginitis", "ACOG Practice Bulletin on Vaginitis"]},
         "Inquire about color, consistency, and odor of discharge. Ask about itching and dysuria.",
         ["Discharge accompanied by severe lower abdominal pelvic pain and high fever (Pelvic Inflammatory Disease)", "Recurrent refractory infections in diabetic patients"],
         ["Do NOT use vaginal douches, perfumed sprays, or scented soaps (destroys protective lactobacilli flora)", "Do NOT drink alcohol while taking Metronidazole"],
         "Centers for Disease Control and Prevention (CDC) & ACOG Guidelines", "draft", None),

        ("wh_urinary_tract_infections_women_014", "Recurrent UTIs in Women & Prevention", ["recurrent uti women", "frequent urine infection women", "uti prevention women", "peshab me jalan bar bar", "cystitis female"],
         [
             "Women have a much shorter urethra than men, making it far easier for bacteria from the skin and bowel to enter the bladder and cause urinary infections.",
             "Drink 2 to 3 liters of water daily; frequent urination naturally flushes bacteria out before they can multiply.",
             "Wipe strictly from FRONT TO BACK after using the toilet to avoid dragging intestinal bacteria forward into the urethra.",
             "Always urinate shortly after sexual intercourse to clear any bacteria pushed into the bladder during intimacy.",
             "Avoid holding your urine; empty your bladder completely every 3 to 4 hours.",
             "Avoid irritating feminine hygiene products: scented bubble baths, feminine deodorants, and douches that irritate the delicate urethral opening."
         ],
         {"assessment": "Recurrent Urinary Tract Infections in Women (>= 2 episodes in 6 months or >= 3 in 12 months). Exclude structural urological abnormalities, pelvic organ prolapse, and postmenopausal atrophic vaginitis.", "investigations": "Clean-catch midstream urine culture and sensitivity testing during active episode. Post-void residual bladder volume via ultrasound if incomplete emptying suspected.", "management": "Acute episode: First-line Nitrofurantoin 100 mg BID for 5 days or Fosfomycin 3g single dose. Non-antimicrobial prophylaxis: Hydration (>=1.5-2 L/day), post-coital voiding, Cranberry proanthocyanidins, D-mannose. In postmenopausal women: Vaginal Estrogen therapy (reverses atrophic changes and restores lactobacilli). Low-dose post-coital or daily antibiotic prophylaxis for refractory cases.", "references": ["EAU Guidelines on Urological Infections", "ACOG Clinical Consensus on Recurrent Urinary Tract Infections in Women"]},
         "Check urine culture reports before starting antibiotics. Counsel on front-to-back wiping and post-coital voiding.",
         ["High fever, chills, and one-sided flank/back pain (Acute Pyelonephritis)", "Visible blood in urine (Gross Hematuria)", "Severe dysuria during pregnancy"],
         ["Do NOT wipe from back to front after defecating", "Do NOT self-medicate with leftover partial antibiotic courses"],
         "European Association of Urology (EAU) & American College of Obstetricians and Gynecologists", "draft", None),

        ("wh_breast_self_exam_lumps_015", "Breast Health, Self-Examination & Lumps", ["breast lump", "breast self exam", "breast cancer screening", "breast pain", "mammogram", "stan me ganth"],
         [
             "Most breast lumps (over 80%) are completely benign (non-cancerous), such as harmless cysts, fibroadenomas, or hormonal breast tissue changes.",
             "However, ANY new or unusual breast lump MUST be evaluated promptly by a doctor with imaging (ultrasound or mammogram).",
             "Perform a breast self-check once a month, ideally a few days after your menstrual period ends when breasts are least swollen.",
             "Look in the mirror with arms at your sides, then raised: check for skin dimpling, puckering, nipple inversion, or redness.",
             "Feel your breasts while lying down using the flat pads of your 3 middle fingers, moving in small overlapping circles to cover the entire breast and armpit.",
             "Mammogram screening: Routine screening mammography is recommended every 1 to 2 years for women aged 40 to 74."
         ],
         {"assessment": "Evaluation of breast mass / breast symptoms (Triple Assessment: Clinical breast exam + Diagnostic Imaging [Ultrasound if <30y; Mammogram if >=30y] + Core Needle Biopsy if BI-RADS 4/5).", "investigations": "Diagnostic Bilateral Digital Mammography with Tomosynthesis and Breast Ultrasound. Core needle biopsy (CNB) under ultrasound/stereotactic guidance for suspicious lesions. Breast MRI for high-risk BRCA mutation carriers.", "management": "Benign lesions (Fibroadenoma, simple cyst): reassurance or aspiration if painful. Suspicious/malignant lesions: multidisciplinary surgical and oncological referral for staging and management.", "references": ["NCCN Clinical Practice Guidelines in Oncology: Breast Cancer Screening and Diagnosis", "WHO Breast Cancer Early Detection Guidelines"]},
         "Inquire about lump duration, changes with periods, skin changes, and family history of breast/ovarian cancer.",
         ["Hard, painless, irregular, fixed breast lump that does not fluctuate with menstrual cycles", "Spontaneous single-duct bloody nipple discharge", "Skin dimpling, puckering, or 'orange peel' appearance (Peau d'orange)", "New unilateral retraction or inversion of the nipple"],
         ["Do NOT ignore a painless breast lump assuming that painlessness means it is harmless (cancers are usually painless)", "Do NOT perform self-exam right before your period when breasts are naturally lumpy and tender"],
         "National Comprehensive Cancer Network (NCCN) & World Health Organization (WHO)", "draft", None),

        ("wh_endometriosis_adenomyosis_016", "Endometriosis & Adenomyosis", ["endometriosis", "adenomyosis", "severe period pain chronic", "pain during sex endometriosis", "chocolate cyst"],
         [
             "Endometriosis occurs when tissue similar to the lining of the womb grows outside the uterus (on ovaries, fallopian tubes, bowel, or pelvic lining), causing chronic inflammation and scarring.",
             "Key symptoms include debilitating period pain that does not respond to painkillers, chronic daily pelvic pain, deep pain during sexual intercourse, painful bowel movements during periods, and difficulty getting pregnant.",
             "Adenomyosis occurs when this endometrial tissue grows deep into the muscular wall of the uterus, causing an enlarged, tender womb and very heavy, painful periods.",
             "Treatment options include hormonal therapies (continuous birth control pills, progestin implants, or Mirena IUD) to suppress tissue bleeding and laparoscopic surgery to remove lesions.",
             "Consult a specialized gynecologist if severe pelvic pain interferes with your normal daily activities."
         ],
         {"assessment": "Endometriosis and Adenomyosis. Characterized by ectopic endometrial stroma and glands inducing chronic peritoneal inflammation, adhesions, endometriomas ('chocolate cysts'), and deep infiltrating endometriosis (DIE).", "investigations": "High-resolution specialized Pelvic Ultrasound with sliding sign (evaluates pouch of Douglas obliteration and adenomyosis features). Pelvic MRI with endometriosis protocol. Diagnostic Laparoscopy with histological biopsy (gold standard).", "management": "First-line medical therapy: Continuous Combined Hormonal Contraceptives or high-dose Progestins (Dienogest 2 mg daily). Levonorgestrel-releasing IUD (LNG-IUD). Second-line: GnRH antagonists (Relugolix, Elagolix) with add-back hormone therapy. Conservative laparoscopic excision of endometriotic implants and adhesiolysis for pain refractory to medical therapy or subfertility.", "references": ["ESHRE Guideline on Endometriosis (2022 Update)", "ACOG Practice Bulletin on Endometriosis"]},
         "Assess pain score, functional impairment, and fertility goals. Inquire about dyspareunia and dyschezia.",
         ["Acute severe abdominal pain from rupture or torsion of an ovarian endometrioma (Surgical Emergency)", "Ureteral involvement causing hydronephrosis"],
         ["Do NOT dismiss chronic debilitating pelvic pain as 'normal woman's pain'", "Do NOT undergo repeated laparoscopies without expert excision surgery"],
         "European Society of Human Reproduction and Embryology (ESHRE) & ACOG", "draft", None),

        ("wh_cervical_cancer_screening_pap_017", "Cervical Cancer Screening (Pap Smear & HPV DNA)", ["cervical screening", "pap smear", "pap test", "hpv dna test", "cervical cancer checkup", "cancer screening women"],
         [
             "Cervical cancer is one of the most preventable cancers because it develops slowly over 10 to 15 years from high-risk HPV infections and can be caught at pre-cancer stages.",
             "Screening recommendations for women:",
             "  - Age 21 to 29 years: Pap smear every 3 years.",
             "  - Age 30 to 65 years: High-risk HPV DNA testing alone every 5 years, OR HPV + Pap co-testing every 5 years, OR Pap smear alone every 3 years.",
             "A Pap smear is a quick, gentle clinic procedure where a nurse or doctor gently brushes loose cells from the cervix (neck of the womb).",
             "Preparation: Avoid intercourse, douching, or vaginal creams for 48 hours before the test; schedule the appointment when you are not menstruating.",
             "An abnormal result usually means mild pre-cancerous cell changes that can be easily treated in the clinic before cancer ever develops."
         ],
         {"assessment": "Secondary prevention of Cervical Carcinoma via screening for high-risk oncogenic HPV (types 16, 18, and pooled hrHPV) and cervical intraepithelial neoplasia (CIN).", "investigations": "Liquid-Based Cytology (LBC / Pap test) and hrHPV DNA PCR testing. If cytology shows ASC-US/LSIL/HSIL or HPV 16/18 positive: Colposcopy with directed cervical biopsy.", "management": "Management based on ASCCP Risk-Based Management Consensus Guidelines. CIN 1: surveillance. CIN 2/3: excisional therapy (LEEP / LLETZ or Cold Knife Conization) or ablative cryotherapy.", "references": ["USPSTF Cervical Cancer Screening Recommendations", "ASCCP Risk-Based Management Consensus Guidelines"]},
         "Confirm patient is not actively menstruating. Verify last screening date in EHR.",
         ["Post-coital bleeding (bleeding immediately after intercourse - key red flag for cervical cancer)", "Foul-smelling persistent watery vaginal discharge with pelvic pain"],
         ["Do NOT skip routine screening because you feel healthy (early pre-cancer has zero symptoms)", "Do NOT stop screening after receiving the HPV vaccine (vaccine covers major strains but screening remains essential)"],
         "United States Preventive Services Task Force (USPSTF) & ASCCP Guidelines", "draft", None),

        ("wh_gestational_diabetes_018", "Gestational Diabetes Mellitus (GDM / Sugar in Pregnancy)", ["gestational diabetes", "gdm", "pregnancy sugar", "diabetes in pregnancy", "sugar high pregnancy", "ogtt pregnancy"],
         [
             "Gestational Diabetes is high blood sugar that develops during pregnancy, usually diagnosed between 24 and 28 weeks of gestation.",
             "Diagnosed using a 75-gram Oral Glucose Tolerance Test (OGTT): you drink a sweet glucose drink and blood is tested after 2 hours.",
             "Target blood sugars during pregnancy are strict to protect your baby:",
             "  - Fasting blood sugar: Under 95 mg/dL.",
             "  - 1 hour after meals: Under 140 mg/dL.",
             "  - 2 hours after meals: Under 120 mg/dL.",
             "Uncontrolled sugar can cause excessive fetal weight (macrosomia > 4 kg), birth trauma, preterm delivery, and low sugar in the baby after birth.",
             "Most mothers can control GDM through healthy eating (millets, vegetables, lean protein) and daily walks; if targets are not met, insulin injections are safe and effective."
         ],
         {"assessment": "Gestational Diabetes Mellitus (GDM). Carbohydrate intolerance resulting in hyperglycemia with onset or first recognition during pregnancy due to placental lactogen and progesterone insulin resistance.", "investigations": "Diagnostic 75g 2-hour Oral Glucose Tolerance Test (IADPSG / ADA criteria: Fasting >= 92, 1h >= 180, 2h >= 153 mg/dL; DIPSI single-step criteria: 2h non-fasting >= 140 mg/dL). Baseline HbA1c, serial ultrasound for fetal abdominal circumference / macrosomia.", "management": "First-line: Medical Nutrition Therapy (MNT) with carbohydrate distribution and postprandial walking for 1-2 weeks. If fasting > 95 or 2h PP > 120 mg/dL: initiate Human Insulin (regular + NPH / Detemir) or Metformin. Re-evaluate with 75g OGTT at 4-12 weeks postpartum to screen for permanent T2D.", "references": ["ADA Standards of Care in Diabetes: Management of Diabetes in Pregnancy", "DIPSI (Diabetes in Pregnancy Study Group India) Guidelines"]},
         "Review self-monitoring blood glucose log (Fasting and 2h post-meal). Check fetal abdominal circumference on ultrasound.",
         ["Persistent fasting glucose > 120 mg/dL or post-meal > 200 mg/dL", "Polyhydramnios (excess amniotic fluid) on ultrasound", "Reduced fetal movements"],
         ["Do NOT skip meals to keep blood sugar low (triggers ketonemia harmful to fetal brain)", "Do NOT skip postpartum diabetes testing at 6 weeks"],
         "American Diabetes Association (ADA) & DIPSI Guidelines", "draft", None),

        ("wh_preeclampsia_eclampsia_019", "Preeclampsia & High Blood Pressure in Pregnancy", ["preeclampsia", "high bp in pregnancy", "protein in urine pregnancy", "eclampsia", "swelling pregnancy high bp", "pregnancy bp 140"],
         [
             "Preeclampsia is a serious pregnancy complication characterized by high blood pressure (140/90 mmHg or higher) developing after 20 weeks of pregnancy, often with protein in the urine.",
             "CRITICAL WARNING SIGNS (Seek Emergency Hospital Care Immediately):",
             "  - Severe, throbbing headache that does not go away with paracetamol.",
             "  - Visual disturbances: blurred vision, seeing flashing lights, spots, or temporary blindness.",
             "  - Severe pain in the upper right side of your belly under the ribs.",
             "  - Sudden, dramatic swelling of your face, hands, and eyelids within a few days.",
             "  - Shortness of breath or difficulty catching your breath.",
             "Preeclampsia can progress rapidly to Eclampsia (life-threatening seizures); prompt medical management protects both mother and baby."
         ],
         {"assessment": "Preeclampsia (SBP >= 140 or DBP >= 90 mmHg on two occasions >=4h apart after 20 weeks gestation in a previously normotensive woman, with proteinuria [>=300 mg/24h or protein/creatinine ratio >=0.3] or end-organ dysfunction). Stratify Severe Features: SBP >= 160 or DBP >= 110, platelets < 100,000, ALT/AST > 2x normal, serum creatinine > 1.1, pulmonary edema, new cerebral/visual symptoms.", "investigations": "Urgent maternal BP monitoring, Urine protein-to-creatinine ratio, CBC (platelets), LFTs (AST, ALT, LDH), Serum Creatinine, Uric acid. Fetal Non-Stress Test (NST) and umbilical artery Doppler ultrasound.", "management": "Severe Features: Hospital admission. Seizure prophylaxis: IV Magnesium Sulfate (Loading 4g IV over 15-20 min, then 1-2 g/h maintenance; monitor deep tendon reflexes, RR, urine output). Antihypertensive therapy: IV Labetalol (20 mg IV bolus) or oral immediate-release Nifedipine (10 mg) targeting BP 140-150 / 90-100 mmHg. Delivery is definitive treatment: deliver at >=34 weeks if severe features, or immediately if maternal/fetal compromise.", "references": ["ACOG Practice Bulletin #222: Gestational Hypertension and Preeclampsia", "WHO Recommendations on Prevention and Treatment of Pre-eclampsia"]},
         "Priority: Triage Red. Place patient in left lateral position. Connect continuous fetal monitor. Check patellar reflexes and prepare Magnesium Sulfate.",
         ["Blood pressure >= 160/110 mmHg (Hypertensive Emergency in Pregnancy)", "Convulsions or seizures (Eclampsia - STAT IV Magnesium Sulfate)", "HELLP Syndrome: Hemolysis, Elevated Liver enzymes, Low Platelets"],
         ["Do NOT dismiss facial and hand swelling as normal late pregnancy edema", "Do NOT use ACE inhibitors or ARBs (Telmisartan) in pregnancy (strictly contraindicated/teratogenic)"],
         "American College of Obstetricians and Gynecologists (ACOG) & WHO", "draft", None),

        ("wh_folic_acid_preconception_020", "Preconception Care & Folic Acid Planning", ["preconception planning", "folic acid pregnancy", "planning baby", "pre pregnancy checkup", "folvite"],
         [
             "If you are planning to conceive, start taking 400 to 500 mcg of Folic Acid (Folvite) daily at least 1 to 3 months BEFORE becoming pregnant.",
             "Folic acid is scientifically proven to reduce neural tube birth defects (severe spinal cord and brain malformations like spina bifida) by up to 70%.",
             "Schedule a preconception health visit with a gynecologist to review existing medical conditions (diabetes, thyroid, hypertension) and optimize medications to baby-safe alternatives.",
             "Ensure your vaccinations are up to date: Rubella (German measles) and Hepatitis B vaccines should be administered at least 1 month before conceiving.",
             "Both partners should completely stop smoking and alcohol consumption to support healthy egg, sperm, and early embryo development."
         ],
         {"assessment": "Preconception health evaluation and maternal risk factor modification.", "investigations": "Preconception laboratory panel: Blood group & Rh type, CBC (anemia screening), Rubella IgG immunity, TSH, Fasting glucose / HbA1c, Urine routine, screening for thalassemia trait (Hb HPLC) and infectious diseases (HIV, HBsAg, VDRL).", "management": "Routine Folic Acid: 400-500 mcg orally daily starting >= 1 month prior to conception through 12 weeks gestation. High-risk Folic Acid (5 mg daily): previous neural tube defect pregnancy, maternal diabetes, obesity (BMI > 30), or maternal anti-epileptic drug therapy. Review medication safety: switch teratogenic drugs (ACEi/ARBs, statins, methotrexate, sodium valproate) to pregnancy-compatible regimens.", "references": ["CDC Preconception Health and Health Care Clinical Guidelines", "ACOG Committee Opinion on Prepregnancy Care"]},
         "Verify daily folic acid supplementation. Review chronic medications for teratogenic risks.",
         ["Patient on known teratogenic medications (Valproate, Isotretinoin, Methotrexate, ACE inhibitors) planning pregnancy without medication switch", "Uncontrolled HbA1c > 8.0% prior to conception (high risk of congenital malformations)"],
         ["Do NOT wait until a positive pregnancy test to start folic acid (the neural tube closes within the first 28 days of conception)", "Do NOT take live vaccines (MMR, Varicella) within 4 weeks of conceiving"],
         "Centers for Disease Control and Prevention (CDC) & ACOG Guidelines", "draft", None)
    ]

    out = []
    for wid, topic, kw, p_ans, doc_a, staff_m, red_f, avoid_l, src, rev_st, rev_by in wh:
        out.append({
            "id": wid,
            "topic": f"Women's Health: {topic}",
            "category": "womens_health",
            "keywords": kw,
            "intent": "chronic_condition_guidance",
            "patient_answer": p_ans,
            "doctor_answer": doc_a,
            "staff_answer": staff_m,
            "red_flags": red_f,
            "follow_up_questions": ["When was the first day of your last menstrual period (LMP)?", "Is there any possibility of pregnancy?", "Are you experiencing any red flag symptoms like severe pelvic pain, heavy bleeding, or high fever?"],
            "avoid": avoid_l,
            "source": src,
            "review_status": rev_st,
            "reviewed_by": rev_by
        })
    return out
