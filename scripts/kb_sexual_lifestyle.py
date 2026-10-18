"""
Sexual & Reproductive Health (20 entries) and Lifestyle (20 entries) module
"""
def get_sexual_health():
    srh = [
        ("srh_sti_symptoms_testing_001", "Sexually Transmitted Infections (STIs) Overview & Testing", ["sti symptoms", "std testing", "sex infection symptoms", "std symptoms", "safe sex screening", "gupt rog janch"],
         [
             "Sexually transmitted infections (STIs) are very common bacterial, viral, or parasitic infections passed through vaginal, anal, or oral sexual contact.",
             "Many STIs have ZERO noticeable symptoms initially, especially in women; you or your partner can have an STI without knowing it.",
             "Common signs to watch for:",
             "  - Unusual discharge from the penis or vagina (yellow, green, foul-smelling, or cloudy).",
             "  - Pain, burning, or stinging sensation while urinating.",
             "  - Sores, blisters, bumps, or ulcers around the genitals, anus, or mouth.",
             "  - Lower abdominal or pelvic pain, or pain during sexual intercourse.",
             "  - Unusual vaginal bleeding between periods or after sex.",
             "Routine STI testing is confidential, routine, and judgment-free; most bacterial STIs (like chlamydia and gonorrhea) are easily cured with simple antibiotics."
         ],
         {"assessment": "Screening and diagnostic evaluation for Sexually Transmitted Infections (STIs). Syndromic management vs laboratory-based pathogen identification.", "investigations": "Urine Nucleic Acid Amplification Testing (NAAT) for Chlamydia trachomatis and Neisseria gonorrhoeae, Serological screening for HIV (4th gen Ag/Ab combo), Syphilis (Treponemal / RPR), and Hepatitis B (HBsAg).", "management": "Etiology-specific antimicrobial therapy. Mandatory partner notification and simultaneous treatment. Abstinence from sexual activity until 7 days post-completion of treatment and symptom resolution.", "references": ["CDC Sexually Transmitted Infections Treatment Guidelines (2021)", "WHO Guidelines for the Management of Symptomatic Sexually Transmitted Infections"]},
         "Provide confidential, non-judgmental triage. Offer testing for HIV, Syphilis, and Hepatitis B alongside primary complaint.",
         ["Genital ulcer with painless induration (Primary Syphilis chancre)", "Severe lower abdominal tenderness with cervical motion tenderness and fever (Pelvic Inflammatory Disease)"],
         ["Do NOT engage in sexual contact until full treatment is completed and partner is treated", "Do NOT feel shame or delay testing (STIs are common, curable medical conditions)"],
         "Centers for Disease Control and Prevention (CDC) & World Health Organization", "draft", None),

        ("srh_safe_sex_barrier_002", "Safe Sex Practices & Dual Protection", ["safe sex", "condom use", "how to use a condom", "prevent stis", "dual protection contraception"],
         [
             "Safe sex protects both partners from sexually transmitted infections (STIs) and prevents unintended pregnancy.",
             "Male latex or polyurethane condoms are the ONLY contraceptive method scientifically proven to protect against both pregnancy AND STIs (Dual Protection).",
             "CORRECT CONDOM USAGE STEPS:",
             "  1. Check the expiration date on the packet and check for the air cushion feel.",
             "  2. Open the wrapper carefully with your fingers; NEVER use teeth, scissors, or sharp fingernails.",
             "  3. Pinch the tip (reservoir) of the condom to squeeze out trapped air (trapped air causes condoms to pop during intercourse).",
             "  4. Unroll the condom all the way down the erect penis to the base before any genital contact.",
             "  5. Use only water-based or silicone lubricants; NEVER use oil-based products (Vaseline, baby oil, cooking oil, lotions) which dissolve latex within 60 seconds.",
             "  6. After ejaculation, hold the base of the condom firmly while pulling out to prevent slippage."
         ],
         {"assessment": "Barrier contraception and harm-reduction counseling for STI/HIV transmission and pregnancy prevention.", "investigations": "Assess patient knowledge of correct barrier technique and lubricant compatibility.", "management": "Counsel on consistent and correct condom usage. Educate on lubricant safety (water-based or silicone with latex; avoid petroleum/oil products). Emphasize Dual Protection strategy (LARC + Condom for optimal pregnancy and STI prevention).", "references": ["CDC Sexually Transmitted Infections Treatment Guidelines - Prevention", "WHO Condom Programming Guidelines"]},
         "Demonstrate correct condom unrolling on penile anatomical model. Provide free condoms.",
         ["Condom breakage or slippage during intercourse with an individual of unknown HIV status (requires Post-Exposure Prophylaxis / PEP within 72 hours)"],
         ["NEVER reuse a condom (strictly single-use)", "Do NOT use oil-based lubricants like Vaseline, butter, or coconut oil with latex condoms (causes rapid latex breakdown)"],
         "Centers for Disease Control and Prevention (CDC) & World Health Organization", "draft", None),

        ("srh_chlamydia_gonorrhea_003", "Chlamydia & Gonorrhea (Bacterial STIs)", ["chlamydia", "gonorrhea", "penis discharge burning", "burning urination after sex", "sujak", "gonococcal urethritis"],
         [
             "Chlamydia and Gonorrhea are common bacterial STIs that infect the urethra, cervix, rectum, and throat.",
             "Symptoms in men: Burning pain while urinating, white/yellow/green discharge from the tip of the penis, or pain/swelling in the testicles.",
             "Symptoms in women: Often completely silent (over 70% have no symptoms); can cause burning urination, increased vaginal discharge, or bleeding between periods.",
             "DANGER OF UNTREATED INFECTIONS: In women, untreated chlamydia or gonorrhea can travel up into the uterus and fallopian tubes, causing Pelvic Inflammatory Disease (PID), permanent scarring, and infertility.",
             "Both infections are curable: modern treatment uses targeted prescription antibiotics.",
             "BOTH PARTNERS MUST BE TREATED at the exact same time; avoid all sexual contact for 7 days after completing antibiotics."
         ],
         {"assessment": "Acute Urethritis in men / Mucopurulent Cervicitis in women (Neisseria gonorrhoeae vs Chlamydia trachomatis). High co-infection rate.", "investigations": "First-catch urine NAAT (men) or vaginal/endocervical swab NAAT (women). Gram stain of urethral discharge (Gram-negative intracellular diplococci confirms gonorrhea).", "management": "Uncomplicated Urogenital Gonorrhea: Ceftriaxone 500 mg IM single dose (1 g if weight >= 150 kg). If chlamydial infection not excluded: add Doxycycline 100 mg orally BID for 7 days. Chlamydia monotherapy: Doxycycline 100 mg BID for 7 days (or Azithromycin 1 g single oral dose in pregnancy). Partner treatment mandatory. Retest at 3 months for re-infection.", "references": ["CDC STI Treatment Guidelines (2021) - Gonococcal and Chlamydial Infections", "WHO Guidelines for the Treatment of Neisseria gonorrhoeae"]},
         "Collect first-void urine (patient must not have urinated for at least 1 hour). Ensure partner treatment.",
         ["High fever with severe lower abdominal pain and cervical motion tenderness (Pelvic Inflammatory Disease)", "Acute painful swollen scrotum (Epididymo-orchitis)"],
         ["Do NOT have sex until both you and your partner complete all antibiotics and wait 7 full days", "Do NOT self-treat with random leftover antibiotics (drives cephalosporin resistance)"],
         "Centers for Disease Control and Prevention (CDC) & World Health Organization", "draft", None),

        ("srh_hiv_aids_prep_pep_004", "HIV Basics, Testing, PrEP & Emergency PEP", ["hiv", "aids", "prep", "pep", "hiv test", "hiv exposure", "window period hiv", "antiretroviral"],
         [
             "HIV (Human Immunodeficiency Virus) attacks the body's immune system, specifically CD4 white blood cells that fight infections.",
             "With modern Antiretroviral Therapy (ART), HIV is now a manageable chronic condition: people taking daily treatment live long, healthy, full lives and achieve an undetectable viral load.",
             "U = U (Undetectable = Untransmittable): When a person with HIV takes daily medication and maintains an undetectable viral load, they CANNOT sexually transmit HIV to their partners.",
             "EMERGENCY PEP (Post-Exposure Prophylaxis): If you had unprotected sex with an HIV-positive person, had a condom break, or experienced a needle stick, PEP medications must be started WITHIN 72 HOURS (ideally within 2 to 24 hours) to prevent HIV from establishing in your body. It is a 28-day course.",
             "PrEP (Pre-Exposure Prophylaxis): A daily pill taken by HIV-negative individuals at high ongoing risk that reduces the risk of contracting HIV by over 99%.",
             "Routine HIV testing is fast, confidential, and fingerstick rapid tests provide results in 20 minutes."
         ],
         {"assessment": "HIV Infection Screening, Prevention (PrEP/PEP), and Antiretroviral Management.", "investigations": "4th-generation HIV-1/2 Antigen/Antibody combination immunoassay (window period ~18-45 days), HIV viral load (RNA PCR), CD4 count, Hepatitis B and C screening, Renal function (serum creatinine) prior to Tenofovir.", "management": "Post-Exposure Prophylaxis (PEP): Initiate <= 72 hours post-exposure: Tenofovir Disoproxil Fumarate (TDF) + Emtricitabine (FTC) + Dolutegravir (DTG) once daily for 28 days. Pre-Exposure Prophylaxis (PrEP): Daily oral TDF/FTC or TAF/FTC with quarterly HIV testing. Confirmed HIV: Immediate ART initiation regardless of CD4 count ('Test and Treat' policy).", "references": ["CDC US Public Health Service Guidelines: Preexposure and Postexposure Prophylaxis for HIV", "WHO Consolidated Guidelines on HIV Prevention, Testing, Treatment"]},
         "Priority: Triage Red/Orange for post-exposure within 72h. Time is critical; initiate 28-day PEP immediately.",
         ["Potential HIV exposure occurring within the past 72 hours (Emergency PEP window closes at 72 hours)", "Opportunistic infections: severe cryptococcal meningitis, pneumocystis pneumonia (PJP), or high fever in advanced HIV"],
         ["Do NOT wait beyond 72 hours to seek PEP after a potential exposure (efficacy drops drastically)", "Do NOT share needles or injection equipment"],
         "CDC Guidelines on HIV PrEP/PEP & World Health Organization (WHO)", "draft", None),

        ("srh_syphilis_stages_care_005", "Syphilis Stages, Sores & Penicillin Cure", ["syphilis", "chancre", "painless genital sore", "vdrl", "rpr", "syphilis rash palms", "aatshak"],
         [
             "Syphilis is a curable bacterial infection caused by Treponema pallidum that progresses through distinct clinical stages if left untreated.",
             "Primary Stage: A single, completely PAINLESS, firm, round sore (called a Chancre) appears where the bacteria entered the body (genitals, anus, or lips). Because it does not hurt, it often goes unnoticed and heals on its own, but the bacteria remain active in the blood.",
             "Secondary Stage (2 to 8 weeks later): A non-itchy rough red or brown rash appears, classically on the PALMS of the hands and SOLES of the feet, along with fever, swollen glands, and mouth sores.",
             "Latent & Tertiary Stage: If untreated, the infection hides silently for years before attacking the brain, nerves, eyes, and heart.",
             "CURE: Syphilis is completely curable with Benzathine Penicillin G injections prescribed by a doctor.",
             "All pregnant women should be screened early for syphilis to prevent congenital syphilis, which causes severe fetal harm or stillbirth."
         ],
         {"assessment": "Syphilis (Treponema pallidum spirochetal infection). Stage: Primary (chancre), Secondary (mucocutaneous lesions, condyloma lata, palmoplantar rash), Latent (early <1 year vs late >1 year), Tertiary (gummatous, cardiovascular, neurosyphilis).", "investigations": "Nontreponemal serology (RPR or VDRL: quantitative titers for monitoring treatment response) + Treponemal confirmatory test (FTA-ABS, TP-PA, or automated EIA/CIA). Lumbar puncture indicated if neurological/ocular signs or treatment failure.", "management": "Primary, Secondary, or Early Latent (<1 year): Benzathine Penicillin G 2.4 million units IM single dose. Late Latent (>1 year) or Unknown Duration: Benzathine Penicillin G 2.4 million units IM once weekly for 3 consecutive weeks (total 7.2 million units). Neurosyphilis: Aqueous Crystalline Penicillin G 18-24 million units IV daily for 10-14 days. If penicillin allergy: Desensitization (mandatory in pregnancy) or Doxycycline 100 mg BID for 14-28 days.", "references": ["CDC Sexually Transmitted Infections Treatment Guidelines (2021) - Syphilis", "WHO Guidelines for the Treatment of Treponema pallidum (Syphilis)"]},
         "Inspect palms and soles. Verify quantitative RPR/VDRL baseline titer. Screen for penicillin allergy.",
         ["Neurological symptoms (headache, confusion, altered gait, sudden vision loss) with positive syphilis serology (Neurosyphilis/Ocular Syphilis)", "Syphilis infection in pregnancy (immediate penicillin treatment required to prevent congenital syphilis)"],
         ["Do NOT assume a healed genital sore means the infection is gone (the bacteria have spread deeper into the bloodstream)", "Do NOT use non-penicillin alternatives in pregnant women without formal allergy desensitization"],
         "Centers for Disease Control and Prevention (CDC) & World Health Organization", "draft", None),

        ("srh_genital_herpes_hsv_006", "Genital Herpes (HSV-1 & HSV-2)", ["genital herpes", "hsv", "herpes blisters genitals", "painful bumps private parts", "herpes outbreak", "hsv 2"],
         [
             "Genital herpes is a common viral infection caused by Herpes Simplex Virus (HSV-2 or HSV-1).",
             "First outbreak symptoms: Clusters of small, painful fluid-filled blisters on or around the genitals or anus that break open into tender, shallow ulcers, accompanied by fever, body aches, and swollen groin glands.",
             "After the first episode, the virus remains dormant in nerve roots and can reactivate periodically, causing milder, shorter recurrences (often preceded by tingling or itching).",
             "Antiviral medications (such as Valacyclovir or Acyclovir) taken at the very first tingling sign of an outbreak speed healing, reduce pain, and shorten the episode.",
             "Daily suppressive therapy (taking a low-dose antiviral pill every day) is available for people with frequent outbreaks, reducing recurrences by 70-80% and lowering transmission risk.",
             "Avoid all sexual contact during active outbreaks (when blisters, sores, or tingling are present) to protect your partner."
         ],
         {"assessment": "Genital Herpes Simplex Virus infection (HSV-2 predominantly; increasing genital HSV-1 from oral-genital contact). Differentiate primary episode from recurrent outbreak.", "investigations": "Type-specific HSV PCR from active vesicular lesion fluid (gold standard). Type-specific glycoprotein G (gG) serology (HSV-1 vs HSV-2 IgG).", "management": "Primary Episode: Oral Valacyclovir 1000 mg BID for 7-10 days, or Acyclovir 400 mg TID for 7-10 days. Recurrent Outbreak (episodic therapy initiated <=24h of onset): Valacyclovir 500 mg BID for 3 days or 1000 mg once daily for 5 days. Daily Suppressive Therapy (for >=6 recurrences/year): Valacyclovir 500-1000 mg once daily. In pregnancy: suppressive Acyclovir from 36 weeks gestation to prevent neonatal herpes transmission.", "references": ["CDC STI Treatment Guidelines (2021) - Genital HSV", "IUSTI European Guideline for the Management of Genital Herpes"]},
         "Examine lesions with gloves. Advise warm salt water baths and loose cotton clothing.",
         ["Active genital herpes lesions in a woman at onset of labor (Cesarean delivery indicated to prevent fatal neonatal herpes encephalitis)", "Urinary retention from severe vulvar herpes pain"],
         ["Do NOT engage in sexual intimacy when blisters, sores, or prodromal tingling are present", "Do NOT pop or squeeze herpes blisters (spreads viral shedding)"],
         "Centers for Disease Control and Prevention (CDC) & IUSTI European Guidelines", "draft", None),

        ("srh_genital_warts_hpv_007", "Genital Warts (HPV 6 & 11) & Care", ["genital warts", "hpv warts", "bumps on private parts", "condyloma acuminata", "cauliflower bumps genitals"],
         [
             "Genital warts are flesh-colored, pink, or brownish soft growths that appear on the skin around the genitals and anus, caused by low-risk strains of Human Papillomavirus (primarily HPV types 6 and 11).",
             "They can look like tiny smooth bumps, flat patches, or raised rough clusters that resemble miniature cauliflower.",
             "They are generally painless, though they can sometimes cause mild itching, burning, or bleeding during intercourse.",
             "Important reassurance: The HPV strains that cause visible external warts (types 6 and 11) do NOT cause cervical or genital cancer.",
             "Treatment options performed by a doctor include freezing with liquid nitrogen (cryotherapy), chemical acid application (TCA), minor excision, or prescription patient-applied creams (such as Imiquimod 5% cream).",
             "Prevention: The HPV vaccine (Gardasil 9) provides powerful protection against the strains that cause genital warts."
         ],
         {"assessment": "Condylomata Acuminata (Anogenital Warts, caused by low-risk non-oncogenic HPV types 6 and 11). Differentiate from Condyloma Lata of secondary syphilis, molluscum contagiosum, and skin tags.", "investigations": "Clinical examination in good lighting. Biopsy indicated only if atypical, pigmented, indurated, ulcerated, or unresponsive to therapy.", "management": "Patient-applied: Imiquimod 5% cream (applied at bedtime 3 times/week for up to 16 weeks) or Podofilox 0.5% solution. Clinician-applied: Cryotherapy with liquid nitrogen (Q1-2W), Trichloroacetic acid (TCA 80-90% weekly), or surgical excision / electrocautery for large bulk lesions. Note: treatments remove visible lesions but do not eradicate latent viral reservoir.", "references": ["CDC Sexually Transmitted Infections Treatment Guidelines (2021) - Anogenital Warts", "BASHH UK National Guidelines on Anogenital Warts"]},
         "Inspect perianal and genital regions. Differentiate from syphilitic condyloma lata (order serology if questionable).",
         ["Rapidly growing, ulcerating, or deeply indurated mass (concern for Buschke-Lowenstein tumor / verrucous carcinoma)", "Massive lesions obstructing birth canal during pregnancy"],
         ["Do NOT use over-the-counter foot or hand wart removers on delicate genital skin (causes severe chemical burns)", "Do NOT cut or slice warts off at home"],
         "Centers for Disease Control and Prevention (CDC) & British Association for Sexual Health and HIV (BASHH)", "draft", None),

        ("srh_pelvic_inflammatory_disease_008", "Pelvic Inflammatory Disease (PID)", ["pid", "pelvic inflammatory disease", "pelvic infection", "lower belly pain after sex", "infected fallopian tubes", "pelvic infection women"],
         [
             "Pelvic Inflammatory Disease (PID) is a serious bacterial infection of a woman's reproductive organs (uterus, fallopian tubes, and ovaries), typically caused when untreated STIs (chlamydia or gonorrhea) travel upward from the vagina.",
             "Key symptoms:",
             "  - Continuous dull aching or sharp pain in the lower abdomen and pelvis.",
             "  - Unusual, foul-smelling vaginal discharge.",
             "  - Pain during or immediately after sexual intercourse.",
             "  - Bleeding between periods or after sex.",
             "  - Fever, chills, and painful, frequent urination.",
             "SEEK PROMPT MEDICAL TREATMENT: Prompt antibiotic treatment cures the infection and prevents permanent fallopian tube scarring, which can cause lifelong chronic pelvic pain, ectopic pregnancy, and infertility.",
             "Your sexual partner MUST also be treated with antibiotics simultaneously to prevent immediate reinfection."
         ],
         {"assessment": "Pelvic Inflammatory Disease (PID). Spectrum of inflammatory disorders of upper female genital tract (endometritis, salpingitis, tubo-ovarian abscess, pelvic peritonitis). CDC minimum clinical criteria: lower abdominal/pelvic pain with cervical motion tenderness, uterine tenderness, or adnexal tenderness.", "investigations": "NAAT for N. gonorrhoeae and C. trachomatis, Pelvic Ultrasound (evaluates for dilated fallopian tubes, fluid in cul-de-sac, or Tubo-Ovarian Abscess [TOA]), CBC, ESR/CRP, pregnancy test (rule out ectopic).", "management": "Outpatient regimen (mild-moderate): Ceftriaxone 500 mg IM single dose + Doxycycline 100 mg orally BID for 14 days + Metronidazole 500 mg orally BID for 14 days. Inpatient admission criteria (IV Ceftriaxone + Doxycycline + Metronidazole): pregnant, tubo-ovarian abscess, high fever, severe nausea/vomiting, or failing outpatient oral therapy after 72 hours.", "references": ["CDC STI Treatment Guidelines (2021) - Pelvic Inflammatory Disease", "ACOG Practice Bulletin on Pelvic Inflammatory Disease"]},
         "Priority: Triage Orange/Red based on peritoneal signs and temperature. Verify pregnancy test immediately.",
         ["High fever with palpable, exquisitely tender adnexal mass (Tubo-Ovarian Abscess requiring hospitalization and possible drainage)", "Rigid board-like abdomen with rebound tenderness (Pelvic Peritonitis Emergency)"],
         ["Do NOT delay antibiotic therapy while waiting for lab culture results (early treatment preserves fertility)", "Do NOT stop the 14-day antibiotic course early"],
         "Centers for Disease Control and Prevention (CDC) & ACOG Guidelines", "draft", None),

        ("srh_fertility_basics_ovulation_009", "Fertility Basics, Ovulation Tracking & Conception", ["fertility basics", "ovulation tracking", "how to get pregnant", "fertile window", "ovulation test", "garbhdharan"],
         [
             "The 'Fertile Window' is the approximately 6-day timeframe during each menstrual cycle (the 5 days leading up to ovulation plus the day of ovulation itself) when pregnancy is possible.",
             "Sperm can survive inside the female reproductive tract for up to 5 days, whereas a released egg survives for only 12 to 24 hours.",
             "In a regular 28-day cycle, ovulation typically occurs around Day 14 (about 14 days BEFORE the next period begins).",
             "Signs of approaching ovulation:",
             "  - Cervical mucus changes: becomes clear, slippery, stretchy, and lubricative (resembling raw egg white).",
             "  - Mild lower abdominal twinge on one side (Mittelschmerz).",
             "  - Positive home Ovulation Predictor Kit (LH surge urine test strip).",
             "Best timing for conception: Have intercourse every 1 to 2 days during your fertile window (especially the 2 to 3 days right before ovulation).",
             "Start taking daily Folic Acid (400 to 500 mcg) at least 1 month before trying to conceive to protect early embryonic spinal development."
         ],
         {"assessment": "Preconception Fertility Evaluation and Ovulatory Tracking. Identify optimal coital timing and evaluate ovulatory regularity.", "investigations": "Menstrual cycle diary. Home urinary Luteinizing Hormone (LH) surge detection kits. Basal Body Temperature (BBT) charting. Mid-luteal phase Serum Progesterone (tested 7 days prior to expected menses; >3 ng/mL confirms ovulation).", "management": "Recommend intercourse every 1-2 days during the 6-day fertile window terminating on day of ovulation. Preconception Folic Acid (400-500 mcg/day). Both partners: achieve healthy BMI, stop smoking, eliminate alcohol, and minimize high-heat exposures for men (saunas, hot tubs, tight briefs).", "references": ["ASRM (American Society for Reproductive Medicine) Optimizing Natural Fertility Guidelines", "NICE Guideline CG156: Fertility problems: assessment and treatment"]},
         "Inquire about cycle length and consistency. Verify daily folic acid supplementation.",
         ["Infertility definition: Failure to conceive after 12 months of regular unprotected intercourse (or after 6 months if female partner is aged 35 or older - requires fertility workup)"],
         ["Do NOT use commercial saliva or vaginal lubricants that are toxic to sperm (use sperm-friendly lubricants if needed)", "Do NOT schedule intercourse to once a week (infrequent intercourse leads to aged sperm and misses fertile window)"],
         "American Society for Reproductive Medicine (ASRM) & NICE Guideline CG156", "draft", None),

        ("srh_male_infertility_semen_analysis_010", "Male Fertility Basics & Semen Analysis", ["male fertility", "semen analysis", "sperm count", "low sperm count", "semen test", "male infertility test"],
         [
             "Infertility affects couples equally: male factor issues contribute to approximately 40% to 50% of all infertility cases.",
             "A Semen Analysis is the essential, painless first diagnostic test for male fertility, evaluating four primary parameters:",
             "  1. Semen Volume: Normal is at least 1.5 mL.",
             "  2. Sperm Concentration (Count): Normal is at least 15 million sperm per mL.",
             "  3. Sperm Motility (Movement): At least 40% of sperm should be moving actively, and at least 32% swimming straight forward.",
             "  4. Sperm Morphology (Shape): At least 4% of sperm should have normal anatomical shape (Kruger strict criteria).",
             "Preparation for testing: Abstain from sexual intercourse and ejaculation for strictly 2 to 7 days before collecting the sample.",
             "Lifestyle habits that boost sperm health: Stop smoking and tobacco, avoid excessive alcohol, maintain a healthy weight, keep laptops off your lap, avoid hot tubs/saunas, and eat antioxidant-rich foods."
         ],
         {"assessment": "Male Factor Infertility (Azoospermia, Oligozoospermia, Asthenozoospermia, Teratozoospermia). Evaluate for Varicocele, testicular failure, endocrine disorders (hypogonadism), and genetic causes (Klinefelter, Y-chromosome microdeletions).", "investigations": "Semen Analysis according to WHO Laboratory Manual (6th edition, 2021; two separate samples 2-4 weeks apart). If abnormal: Serum FSH, LH, Total Testosterone, Prolactin, Scrotal Doppler Ultrasound (varicocele), and genetic karyotyping if severe oligozoospermia (<5M/mL).", "management": "Lifestyle optimization. Surgical repair of clinical varicocele (subinguinal microsurgical varicocelectomy). Assisted Reproductive Technology (Intrauterine Insemination / IVF with Intracytoplasmic Sperm Injection [ICSI]) for moderate-severe male factor.", "references": ["WHO Laboratory Manual for the Examination and Processing of Human Semen (6th Edition)", "AUA/ASRM Guideline: Diagnosis and Treatment of Infertility in Men"]},
         "Confirm abstinence duration (strictly 2 to 7 days) before scheduling semen collection.",
         ["Complete Azoospermia (zero sperm in ejaculate - requires endocrine and genetic workup)", "Severe testicular pain with hard testicular mass (rule out testicular neoplasm)"],
         ["Do NOT keep laptops directly resting on the scrotum or soak in hot baths (heat severely damages spermatogenesis)", "Do NOT collect semen sample in standard latex condoms (latex and lubricants kill sperm)"],
         "American Urological Association (AUA) & World Health Organization (WHO)", "draft", None),

        ("srh_erectile_dysfunction_basics_011", "Erectile Dysfunction (ED) & Cardiovascular Health", ["erectile dysfunction", "ed", "impotence", "erection problem", "viagra safe use", "male sexual health"],
         [
             "Erectile Dysfunction (ED) is the consistent inability to achieve or maintain an erection firm enough for satisfactory sexual intercourse.",
             "ED IS A WINDOW TO THE HEART: The penile arteries are much smaller (1-2 mm) than coronary heart arteries (3-4 mm); penile artery narrowing from cholesterol and high blood pressure often appears 3 to 5 years BEFORE a heart attack or stroke occurs.",
             "Common causes: Diabetes, hypertension, high cholesterol, smoking, obesity, low testosterone, performance anxiety, and medications (like certain blood pressure pills).",
             "Lifestyle treatments: Brisk walking for 30 minutes daily, quitting smoking, losing belly fat, and managing blood sugar significantly improves erectile function.",
             "Prescription medications (like Sildenafil / Viagra or Tadalafil / Cialis) are safe and effective when prescribed by a doctor.",
             "CRITICAL FATAL WARNING: NEVER take Sildenafil or Tadalafil if you take nitrate heart medications (like Sorbitrate or Nitroglycerin); combining them triggers a fatal collapse in blood pressure."
         ],
         {"assessment": "Erectile Dysfunction. Assess etiology: Vasculogenic (endothelial dysfunction / early marker of CAD), Neurogenic, Hormonal (hypogonadism), Psychogenic, or Medication-induced.", "investigations": "IIEF-5 score (International Index of Erectile Function). Cardiovascular risk assessment. Fasting Glucose, HbA1c, Lipid Profile, Morning Total Testosterone (checked before 10 AM on two occasions). Penile Duplex Doppler if indicated.", "management": "Lifestyle modification and cardiovascular risk factor optimization. First-line: Oral PDE-5 Inhibitors (Sildenafil 25-100 mg PRN 1h before coitus, or Tadalafil 10-20 mg PRN / 5 mg daily). Second-line: Vacuum erection devices, intraurethral alprostadil, intracavernosal injections. Third-line: Inflatable penile prosthesis surgery. STRICT CONTRAINDICATION: Nitrates.", "references": ["AUA Clinical Guideline: Erectile Dysfunction", "EAU Guidelines on Sexual and Reproductive Health"]},
         "Screen for cardiovascular symptoms and exercise tolerance. Verify patient is NOT taking nitrates.",
         ["Patient taking Nitrates (Nitroglycerin/Sorbitrate) requesting PDE-5 inhibitors (ABSOLUTE CONTRAINDICATION / LETHAL)", "Sudden ED in a young male with saddle anesthesia and bowel/bladder dysfunction (Cauda Equina)"],
         ["NEVER combine Sildenafil or Tadalafil with Nitroglycerin or Sorbitrate heart medications", "Do NOT buy unverified herbal sex tonics or vitality supplements online (frequently adulterated with dangerous illegal drug quantities)"],
         "American Urological Association (AUA) & European Association of Urology (EAU)", "draft", None),

        ("srh_premature_ejaculation_techniques_012", "Premature Ejaculation (PE) & Behavioral Techniques", ["premature ejaculation", "pe", "early discharge", "jaldi nikal jana", "lasting longer bed", "ejaculation control"],
         [
             "Premature Ejaculation (PE) is defined as ejaculation that consistently occurs within approximately 1 minute of penetration, accompanied by an inability to delay ejaculation and personal distress.",
             "It is the single most common male sexual concern, affecting up to 30% of men at some point in their lives, and is highly treatable.",
             "EFFECTIVE BEHAVIORAL TECHNIQUES:",
             "  - The 'Start-Stop' Technique: Stimulate until you feel close to the point of ejaculatory inevitability, completely stop all stimulation for 30 seconds until the surge subsides, and then resume. Repeat 3 times before ejaculating.",
             "  - The 'Squeeze' Technique: When close to ejaculation, have your partner firmly squeeze the head of the penis (at the ridge between the head and shaft) for 10 to 20 seconds to suppress the ejaculatory reflex.",
             "Pelvic floor (Kegel) exercises strengthen the bulbocavernosus muscle to help you consciously control the ejaculatory response.",
             "Medical treatments: A doctor can prescribe short-acting SSRIs (like Dapoxetine taken 1-3 hours before intercourse) or mild desensitizing lidocaine sprays to enhance stamina."
         ],
         {"assessment": "Premature Ejaculation: Lifelong (primary: IELT < 1 min since first sexual encounter) vs Acquired (secondary: gradual reduction in IELT, often associated with ED, prostatitis, or anxiety).", "investigations": "Detailed psychosexual history, Intravaginal Ejaculatory Latency Time (IELT). Screen for comorbid erectile dysfunction and prostatitis.", "management": "Behavioral therapy (start-stop and squeeze techniques, pelvic floor muscle training). Pharmacotherapy: On-demand rapid-acting SSRI (Dapoxetine 30-60 mg taken 1-3h prior to intercourse) or daily off-label SSRI (Paroxetine, Sertraline). Topical local anesthetics (Lidocaine/Prilocaine spray applied 10-15 min prior; must wash off or use condom to avoid partner vaginal numbness).", "references": ["ISSM (International Society for Sexual Medicine) Guidelines for the Diagnosis and Treatment of Premature Ejaculation", "AUA Guidelines on Premature Ejaculation"]},
         "Inquire about estimated ejaculatory latency time (IELT). Reassure patient that PE is very common and treatable.",
         ["Severe secondary premature ejaculation accompanied by severe burning urination and pelvic pain (Chronic Prostatitis)"],
         ["Do NOT use excessive numbing creams without washing off or using a condom (causes partner vaginal numbness)", "Do NOT consume unprescribed pills from unregulated street vendors"],
         "International Society for Sexual Medicine (ISSM) & American Urological Association", "draft", None),

        ("srh_vaginal_dryness_dyspareunia_013", "Vaginal Dryness & Painful Intercourse (Dyspareunia)", ["vaginal dryness", "painful sex", "dyspareunia", "pain during intercourse", "sex hurts", "dry vagina sex"],
         [
             "Painful sexual intercourse (Dyspareunia) or persistent vaginal dryness is very common and should never be suffered in silence.",
             "Common causes: Lack of sufficient arousal and foreplay, postpartum breastfeeding hormones (low estrogen), perimenopause and menopause, vaginal yeast infections, and pelvic muscle tension (Vaginismus).",
             "Immediate practical relief:",
             "  - Use generous amounts of water-based or silicone lubricants right before and during intercourse.",
             "  - Use a regular vaginal moisturizer (applied 2 to 3 times a week, independent of sex) to restore moisture and elasticity to vaginal tissues.",
             "  - Take extended time for gentle foreplay to allow natural arousal fluids to lubricate the vagina.",
             "For menopausal women: Low-dose local vaginal estrogen creams or tablets (prescribed by a gynecologist) restore natural thickness, acidity, and moisture to vaginal tissues with minimal absorption into the rest of the body.",
             "Consult a gynecologist or pelvic floor physical therapist if pain is deep in the pelvis or persists."
         ],
         {"assessment": "Dyspareunia (superficial entry pain vs deep pelvic thrusting pain) and Genitourinary Syndrome of Menopause (GSM). Differentiate atrophic vaginitis, vulvodynia, vaginismus, and endometriosis.", "investigations": "Gentle pelvic examination (evaluate vulvar vestibular erythema, vaginal mucosal rugae, vaginal pH > 5.0 in atrophy, pelvic floor hypertonicity, cervical motion tenderness).", "management": "Non-hormonal: Vaginal moisturizers (polycarbophil, hyaluronic acid) applied regularly + silicone/water-based lubricants during coitus. Atrophic vaginitis (GSM): Local low-dose Vaginal Estrogen therapy (Estradiol 10 mcg tablet or Estriol cream 2-3 times/week). Vaginismus: Pelvic floor physical therapy, progressive vaginal dilators. Deep dyspareunia: Workup for endometriosis or adenomyosis.", "references": ["ACOG Practice Bulletin on Female Sexual Dysfunction", "NAMS Genitourinary Syndrome of Menopause Position Statement"]},
         "Inquire whether pain is at the entrance (superficial) or deep in the pelvis. Check menopausal status.",
         ["Deep pelvic pain with fever and abnormal bleeding (PID or Endometriosis flare)", "Post-coital bleeding or visible ulcer on vulva"],
         ["Do NOT use petroleum jelly (Vaseline), cooking oils, or saliva as sexual lubricants (they disrupt vaginal pH and damage condoms)", "Do NOT force painful intercourse (triggers protective pelvic muscle spasm)"],
         "American College of Obstetricians and Gynecologists (ACOG) & NAMS", "draft", None),

        ("srh_pubic_lice_crabs_014", "Pubic Lice (Crabs / Phthiriasis)", ["pubic lice", "crabs", "lice in private parts", "itching pubic hair", "phthiriasis pubis"],
         [
             "Pubic lice ('Crabs') are tiny parasitic insects (Phthirus pubis) that attach to coarse body hair, predominantly in the pubic and groin area, and feed on blood.",
             "Spread primarily through sexual and intimate physical contact, or occasionally through sharing contaminated bedsheets, blankets, and towels.",
             "Key signs: Intense, severe itching in the genital and pubic hair area, visible tiny crab-like insects crawling on hair shafts, small oval white/tan eggs (nits) glued to the base of hairs, and tiny bluish skin spots from bites.",
             "TREATMENT PROCEDURE: Apply 1% Permethrin lotion or 1% Lindane-free shampoo to all pubic hair and surrounding skin, leave on for 10 minutes, and rinse thoroughly.",
             "Use a fine-toothed nit comb to remove dead lice and attached eggs from hair shafts.",
             "ALL SEXUAL PARTNERS from the past month must be treated simultaneously to prevent reinfection.",
             "Wash all bedsheets, underwear, and towels in hot water (at least 50°C / 122°F) and dry on high heat."
         ],
         {"assessment": "Pediculosis Pubis (Pubic lice infestation). Often coexists with other sexually transmitted infections.", "investigations": "Clinical examination under magnification or dermoscopy (demonstrates characteristic crab-like lice and nits cemented to hair shafts). Mandatory full STI screening (HIV, Syphilis, Gonorrhea, Chlamydia).", "management": "Topical Permethrin 1% lotion applied to affected areas and washed off after 10 minutes. Repeat application in 9-10 days if live lice remain. Machine wash clothing and bedding in hot water (>= 50°C) or seal in plastic bags for 2 weeks. Simultaneous partner treatment.", "references": ["CDC STI Treatment Guidelines (2021) - Pediculosis Pubis", "IUSTI European Guideline for the Management of Pediculosis Pubis"]},
         "Inspect pubic and perianal hair with penlight. Offer comprehensive STI screening panel.",
         ["Secondary bacterial impetigo or cellulitis from intense excoriation scratching"],
         ["Do NOT apply pubic lice insecticides to eyelashes or eyebrows (use ophthalmic petroleum jelly instead)", "Do NOT share clothing or bedding until treatment is complete"],
         "Centers for Disease Control and Prevention (CDC) & IUSTI European Guidelines", "draft", None),

        ("srh_pap_smear_hpv_results_015", "Understanding Abnormal Pap Smear & HPV Results", ["abnormal pap smear", "hpv positive result", "asc-us pap smear", "cervical dysplasia", "colposcopy"],
         [
             "Getting an 'abnormal' Pap smear or 'HPV positive' test result can be alarming, but it does NOT mean you have cervical cancer.",
             "Almost all sexually active adults contract HPV at some point in their lives; in over 90% of cases, your body's immune system clears the virus naturally within 1 to 2 years.",
             "What common Pap smear results mean:",
             "  - ASC-US: Atypical Squamous Cells of Undetermined Significance (borderline mild changes, often caused by simple vaginal irritation or infection).",
             "  - LSIL (Low-Grade Lesion): Mild changes caused by an active HPV infection; usually monitored closely as it frequently clears on its own.",
             "  - HSIL (High-Grade Lesion): More significant pre-cancerous cellular changes that require treatment to prevent cancer.",
             "Next steps: Depending on your age and HPV status, your gynecologist will recommend either repeating the test in 12 months or performing a Colposcopy (a gentle, illuminated examination of the cervix with a magnifying lens).",
             "Attending your recommended follow-up appointments prevents abnormal cells from ever advancing to cancer."
         ],
         {"assessment": "Cervical Cytology and Molecular hrHPV Testing Interpretation according to Bethesda System and ASCCP Risk-Based Management Guidelines.", "investigations": "Review cytology report and hrHPV genotyping (HPV 16 and 18 carry highest immediate CIN 3+ risk). Colposcopy with directed punch biopsy and Endocervical Curettage (ECC) if indicated.", "management": "Manage according to ASCCP risk thresholds (immediate risk of CIN 3+ >= 4% warrants colposcopy; risk >= 60% warrants immediate excisional treatment). Histologically confirmed CIN 2/3: Loop Electrosurgical Excision Procedure (LEEP) or Cold Knife Conization. Annual post-treatment surveillance.", "references": ["ASCCP Risk-Based Management Consensus Guidelines for Abnormal Cervical Cancer Screening Tests and Cancer Precursors", "USPSTF Cervical Cancer Guidelines"]},
         "Review cytology grade and HPV 16/18 genotype. Reassure patient that abnormal Pap does not equal cancer.",
         ["High-grade squamous intraepithelial lesion (HSIL) or atypical glandular cells (AGC) requiring urgent colposcopy", "Visible macroscopic cervical exophytic mass"],
         ["Do NOT panic or assume an abnormal Pap means you have cancer", "Do NOT skip follow-up colposcopy or surveillance appointments"],
         "American Society for Colposcopy and Cervical Pathology (ASCCP) & USPSTF", "draft", None),

        ("srh_bph_prostate_health_016", "Benign Prostatic Hyperplasia (BPH) & Prostate Health", ["bph", "enlarged prostate", "prostate symptoms", "weak urine stream male", "waking up to pee bph", "psa test prostate"],
         [
             "Benign Prostatic Hyperplasia (BPH) is a non-cancerous enlargement of the prostate gland that occurs naturally in over 50% of men over age 50 and 80% of men over age 70.",
             "The prostate sits like a donut around the urethra; as it enlarges, it compresses the urinary pipe, causing:",
             "  - Weak, slow, or interrupted urine stream.",
             "  - Difficulty starting urination (hesitancy) and straining to pass urine.",
             "  - Frequent daytime urination and waking up multiple times at night to pee (nocturia).",
             "  - A feeling that your bladder never completely empties.",
             "Lifestyle relief: Limit fluids in the 2 hours before bedtime, avoid caffeine and alcohol in the evening, and 'double void' (urinate, wait 30 seconds, and try again).",
             "Medical treatments: A doctor can prescribe medications like Alpha-blockers (Tamsulosin) to relax the prostate muscles within days, and 5-ARIs (Finasteride) to shrink the prostate over months."
         ],
         {"assessment": "Benign Prostatic Hyperplasia (BPH) / Lower Urinary Tract Symptoms (LUTS). Quantify severity using International Prostate Symptom Score (IPSS: 0-7 mild, 8-19 moderate, 20-35 severe).", "investigations": "Digital Rectal Examination (DRE: assesses prostate size, symmetry, and excludes hard malignant nodules), Urinalysis (rule out UTI/hematuria), Serum Prostate-Specific Antigen (PSA: baseline and cancer screening), Post-Void Residual (PVR) volume via ultrasound, Uroflowmetry.", "management": "Mild LUTS (IPSS < 8): Watchful waiting and fluid management. Moderate-to-Severe (IPSS >= 8): Alpha-1 adrenergic antagonist (Tamsulosin 0.4 mg or Silodosin 8 mg daily at bedtime) + 5-alpha reductase inhibitor (Finasteride 5 mg or Dutasteride 0.5 mg daily for prostate volume > 30 cc). Surgical intervention (TURP / Laser Enucleation) for refractory retention, recurrent UTIs, bladder stones, or renal insufficiency.", "references": ["AUA Clinical Guideline: Management of Lower Urinary Tract Symptoms Attributed to BPH", "EAU Guidelines on Management of Non-Neurogenic Male LUTS"]},
         "Administer IPSS questionnaire. Perform DRE. Check post-void residual volume on ultrasound.",
         ["Acute complete urinary retention: excruciating suprapubic pain with full palpable bladder (STAT Urethral Catheterization)", "Painless gross visible blood in urine (requires workup for bladder/prostate malignancy)"],
         ["Do NOT take over-the-counter cold decongestants or antihistamines (they constrict bladder neck and trigger sudden acute urinary retention)", "Do NOT restrict daytime fluids severely"],
         "American Urological Association (AUA) & European Association of Urology (EAU)", "draft", None),

        ("srh_vasectomy_female_sterilization_017", "Permanent Contraception: Vasectomy vs Tubal Ligation", ["vasectomy", "tubal ligation", "permanent birth control", "naspandi", "female sterilization", "male sterilization"],
         [
             "Permanent contraception (surgical sterilization) is an irreversible birth control option for individuals or couples who are completely certain they do not want any future biological children.",
             "VASECTOMY (Male Sterilization):",
             "  - A quick, minor, 15-minute outpatient procedure performed under local numbing injection.",
             "  - The two tiny tubes (vas deferens) that carry sperm from the testicles are snipped and sealed through a tiny puncture ('No-Scalpel Vasectomy').",
             "  - It does NOT affect sex drive, testosterone hormones, erections, orgasms, or ejaculate volume (sperm makes up less than 2% of semen).",
             "  - IMPORTANT: You are NOT sterile immediately; you must use backup contraception until a semen test at 3 months confirms zero sperm.",
             "TUBAL LIGATION (Female Sterilization):",
             "  - Laparoscopic surgery under general anesthesia where the fallopian tubes are clipped, sealed, or removed.",
             "  - Effective immediately, but carries higher surgical and anesthesia risks than vasectomy.",
             "Vasectomy is simpler, safer, faster, more effective, and has a much quicker recovery than female sterilization."
         ],
         {"assessment": "Permanent Surgical Contraception Counseling and Eligibility Assessment.", "investigations": "Pre-operative assessment. For vasectomy: Post-Vasectomy Semen Analysis (PVSA) at 12 weeks and >= 20 ejaculations post-procedure (clearance requires azoospermia or <100,000 non-motile sperm).", "management": "No-Scalpel Vasectomy (NSV) under local anesthesia. Laparoscopic Tubal Ligation (bipolar coagulation, Falope ring, or bilateral salpingectomy) under general anesthesia. Mandatory informed consent with counseling on irreversibility.", "references": ["AUA Vasectomy Guideline", "ACOG Practice Bulletin on Benefits and Risks of Sterilization"]},
         "Verify informed written consent. Emphasize mandatory 3-month post-vasectomy semen check before stopping barrier contraception.",
         ["Hematoma or severe swelling of scrotum post-vasectomy", "Unprotected intercourse prior to 3-month clearance semen test resulting in pregnancy"],
         ["Do NOT assume vasectomy is effective immediately (takes ~20 ejaculations / 3 months to clear stored sperm)", "Do NOT undergo permanent sterilization if there is any hesitation or marital pressure"],
         "American Urological Association (AUA) & ACOG Guidelines", "draft", None),

        ("srh_sexual_consent_healthy_relationships_018", "Sexual Consent & Communication in Healthy Relationships", ["sexual consent", "healthy sexual relationship", "consent basics", "intimate communication"],
         [
             "Consent is the clear, voluntary, enthusiastic, and ongoing agreement between partners to engage in any sexual activity.",
             "THE PRINCIPLES OF CONSENT (F.R.I.E.S.):",
             "  - Freely Given: Given without pressure, guilt, manipulation, fear, or power imbalances.",
             "  - Reversible: Anyone can change their mind and stop at any time, even if they said yes earlier or engaged in sex before.",
             "  - Informed: Both partners know what is going to happen (including condom use and STI status).",
             "  - Enthusiastic: Expressed with genuine desire, not silence, hesitation, or resignation.",
             "  - Specific: Saying yes to kissing does NOT mean consenting to intercourse.",
             "Intoxication Rule: A person who is incapacitated by alcohol, sleeping pills, or drugs CANNOT legally or ethically give consent.",
             "Healthy communication: Talking openly with your partner about desires, boundaries, protection, and comfort creates a deeply fulfilling, safe sexual life."
         ],
         {"assessment": "Psychosexual counseling on affirmative consent, relationship safety, and intimate partner violence (IPV) screening.", "investigations": "Screen for Intimate Partner Violence (HITS tool: Hurt, Insult, Threaten, Scream).", "management": "Psychoeducation on mutual affirmative consent. Provide resources for domestic violence and sexual assault support (National Commission for Women Helpline: 7827170170, Emergency 112).", "references": ["WHO Clinical and Policy Guidelines: Responding to Intimate Partner Violence and Sexual Violence Against Women", "CDC Intimate Partner Violence Prevention Guidance"]},
         "Provide private, confidential screening. Assess immediate safety from intimate partner violence.",
         ["Acute sexual assault presenting within 72 hours (Immediate medical evaluation, forensic preservation, STI prophylaxis, emergency contraception, and crisis counseling)", "Active domestic violence threats"],
         ["NEVER assume silence or absence of resistance means consent", "Do NOT engage in sexual contact with an intoxicated person"],
         "World Health Organization (WHO) & Centers for Disease Control and Prevention", "draft", None),

        ("srh_testicular_exam_lumps_019", "Testicular Health & Self-Examination", ["testicular lump", "testicle self exam", "lump in balls", "testicular cancer check", "swollen testicle", "andoshoth"],
         [
             "Testicular cancer is the most common cancer in young men aged 15 to 35, but when caught early, it has a cure rate of over 95%.",
             "Every young man should perform a simple 1-minute testicular self-check once a month, ideally after a warm shower or bath when the scrotal skin is relaxed.",
             "HOW TO PERFORM A SELF-CHECK:",
             "  1. Support each testicle with one hand and gently roll it between your thumb and fingers of both hands.",
             "  2. Feel for any hard pea-sized lump, painless swelling, or change in firmness.",
             "  3. Learn your normal anatomy: At the back and top of each testicle is a soft, tender, cord-like structure called the Epididymis; this is normal and healthy.",
             "It is completely normal for one testicle (usually the left) to hang slightly lower than the other.",
             "ANY hard, firm, painless lump or sudden swelling in a testicle must be examined by a doctor with an ultrasound immediately.",
             "SUDDEN TESTICULAR PAIN EMERGENCY: If you experience sudden, severe, excruciating pain in one testicle, go to the emergency room IMMEDIATELY (Testicular Torsion can destroy the testicle within 6 hours if blood flow is cut off)."
         ],
         {"assessment": "Scrotal Mass / Pain Evaluation: Testicular Neoplasm (firm, non-tender intratesticular mass), Epididymitis/Orchitis, Hydrocele, Varicocele, Spermatocele, Testicular Torsion (surgical emergency).", "investigations": "Urgent Scrotal High-Resolution Ultrasound with Color Doppler (differentiates intratesticular mass from extratesticular fluid/cysts; assesses testicular perfusion). Serum tumor markers: AFP, beta-hCG, LDH.", "management": "Intratesticular mass: Radical inguinal orchiectomy (trans-scrotal biopsy is contraindicated due to tumor seeding). Testicular Torsion: Emergent surgical exploration and bilateral orchiopexy within 6 hours. Epididymo-orchitis: Ceftriaxone 500 mg IM + Doxycycline 100 mg BID for 10 days.", "references": ["AUA Guideline on Diagnosis and Treatment of Early Stage Testicular Cancer", "EAU Guidelines on Testicular Cancer"]},
         "Priority: Triage Red for acute sudden severe scrotal pain (Testicular Torsion - 6h salvage window).",
         ["Sudden severe unilateral testicular pain and high-riding horizontal testicle (Testicular Torsion - STAT Surgical Emergency)", "Hard, painless, non-transilluminating intratesticular lump"],
         ["NEVER ignore a painless lump in the testicle", "Do NOT delay emergency care for sudden testicle pain (delay leads to testicular necrosis and removal)"],
         "American Urological Association (AUA) & European Association of Urology (EAU)", "draft", None),

        ("srh_pruritus_ani_genital_itching_020", "Genital & Perianal Itching (Pruritus Ani / Vulvae)", ["genital itching", "itching private parts", "pruritus ani", "anal itching", "itching around anus", "vulvar itching"],
         [
             "Itching in the genital or perianal area is extremely common and is usually caused by skin irritation, fungal yeast infections, moisture, or hemorrhoids.",
             "Common causes:",
             "  - Moisture and friction: Sweating, tight synthetic underwear, and sitting for long periods.",
             "  - Chemical irritation: Scented body washes, perfumed toilet paper, laundry detergents, or harsh soaps.",
             "  - Fungal infections: Candida yeast infection (thrush) or Tinea cruris (jock itch).",
             "  - Pinworms (Enterobius): Very common in families with children, causing intense anal itching especially at night.",
             "Home care relief:",
             "  - Wash gently with plain lukewarm water; pat dry with a soft clean towel; never scrub vigorously.",
             "  - Wear loose, 100% breathable cotton underwear and change it twice daily if sweating.",
             "  - Apply plain petroleum jelly or zinc oxide paste to protect the skin from acidic moisture.",
             "Consult a doctor: A proper visual exam will determine if an antifungal, mild steroid, or deworming tablet is needed."
         ],
         {"assessment": "Pruritus Ani / Pruritus Vulvae. Etiologies: Contact dermatitis, candidiasis, tinea cruris, pinworm (Enterobius vermicularis), lichen sclerosus, hemorrhoids, fecal soiling.", "investigations": "Visual skin inspection, tape test for pinworm ova (scotch tape test in early morning), fungal scraping KOH mount, screen for diabetes.", "management": "Hygiene optimization: Wash with water only, pat dry, barrier ointments. If candidiasis: Clotrimazole cream. If pinworms: Albendazole 400 mg single oral dose, repeated in 2 weeks for all household members. If lichen sclerosus: Ultra-potent topical corticosteroid (Clobetasol propionate 0.05% ointment).", "references": ["ASCRS Clinical Practice Guideline for the Management of Pruritus Ani", "British Association of Dermatologists Guidelines"]},
         "Inspect perianal and vulvar skin. Ask about nocturnal itching and household members.",
         ["White atrophic porcelain-like patches with architectural distortion around vulva/anus (Lichen Sclerosus - requires biopsy to rule out malignancy)", "Severe spreading perianal redness with high fever (Fournier's Gangrene Emergency)"],
         ["Do NOT scratch the area (creates an itch-scratch-damage cycle)", "Do NOT use scented feminine sprays, medicated wipes, or harsh soaps"],
         "American Society of Colon and Rectal Surgeons (ASCRS) & BAD Guidelines", "draft", None)
    ]

    out_srh = []
    for sid, topic, kw, p_ans, doc_a, staff_m, red_f, avoid_l, src, rev_st, rev_by in srh:
        out_srh.append({
            "id": sid,
            "topic": f"Sexual Health: {topic}",
            "category": "sexual_reproductive_health",
            "keywords": kw,
            "intent": "chronic_condition_guidance",
            "patient_answer": p_ans,
            "doctor_answer": doc_a,
            "staff_answer": staff_m,
            "red_flags": red_f,
            "follow_up_questions": ["What specific symptoms are you experiencing?", "How long have they been present?", "Is there any pain, unusual discharge, or sores?"],
            "avoid": avoid_l,
            "source": src,
            "review_status": rev_st,
            "reviewed_by": rev_by
        })

    return out_srh


def get_lifestyle():
    ls = [
        ("ls_aerobic_exercise_guidelines_001", "Aerobic Exercise & Physical Activity Guidelines", ["exercise guidelines", "how much exercise", "cardio workout", "daily steps", "aerobic exercise", "vyayam"],
         [
             "WHO and AHA physical activity recommendations for all adults:",
             "  - At least 150 to 300 minutes of moderate-intensity aerobic exercise per week (such as brisk walking at 5 km/h, light cycling, swimming, or dancing), OR",
             "  - At least 75 to 150 minutes of vigorous-intensity aerobic exercise per week (running, jogging, fast cycling, or singles tennis).",
             "Spread your activity throughout the week across at least 4 to 5 days rather than cramming everything into a single weekend.",
             "Aim for 7,000 to 10,000 steps daily: taking a 15-minute walk after lunch and dinner significantly flattens post-meal blood sugar and lowers blood pressure.",
             "Break up prolonged sitting: stand up, stretch, and walk for 2 minutes every 45 to 60 minutes of desk work.",
             "If you are over 40, have heart disease, or have been completely sedentary, consult your physician before starting high-intensity workouts."
         ],
         {"assessment": "Physical Activity Assessment and Prescription according to WHO / AHA Guidelines. Assess baseline functional capacity in METs (Metabolic Equivalents).", "investigations": "Cardiovascular risk stratification prior to vigorous exercise in high-risk individuals: 12-lead ECG, Treadmill Exercise Test (TMT / stress test) if symptomatic CAD.", "management": "Prescribe FITT principles (Frequency: 5 days/week; Intensity: 50-70% max heart rate; Time: 30-60 min/day; Type: dynamic aerobic). Reduces all-cause mortality by 20-30%, lowers SBP by 5-8 mmHg, improves insulin sensitivity, and elevates HDL-C.", "references": ["WHO Guidelines on Physical Activity and Sedentary Behaviour", "AHA Scientific Statement: Physical Activity Trajectories and Cardiovascular Health"]},
         "Assess current activity minutes per week. Check resting BP and pulse.",
         ["Chest pain, pressure, lightheadedness, or fainting during exercise (Exertional Angina / Arrhythmia Alert)", "Severe shortness of breath out of proportion to exertion"],
         ["Do NOT remain completely sedentary (physical inactivity is as dangerous to health as smoking)", "Do NOT perform sudden unaccustomed maximal exertion without warming up"],
         "World Health Organization (WHO) & American Heart Association (AHA)", "draft", None),

        ("ls_strength_resistance_training_002", "Strength & Resistance Training for Muscle & Bone Health", ["strength training", "weight lifting health", "resistance exercise", "muscle building seniors", "gym health"],
         [
             "Adults of all ages should perform muscle-strengthening resistance activities involving all major muscle groups (legs, hips, back, chest, abdomen, shoulders, and arms) at least 2 to 3 days per week.",
             "You do not need heavy gym weights: bodyweight exercises (squats, lunges, push-ups, wall sits) or elastic resistance bands are highly effective.",
             "Key health benefits: Rebuilds lost muscle mass (combats sarcopenia), strengthens bone density against osteoporosis, and boosts resting metabolic rate to burn more calories around the clock.",
             "Form over weight: Always master correct posture and smooth controlled movements before adding weights.",
             "Rest and recover: Allow 48 hours of recovery between working the same muscle groups; muscles grow and repair during rest, not during the workout itself.",
             "Breathe continuously: Exhale as you push or lift against gravity; inhale as you lower the weight. Never hold your breath (holding breath causes dangerous blood pressure spikes / Valsalva maneuver)."
         ],
         {"assessment": "Resistance Training Prescription. Muscle hypertrophy and neuromuscular adaptation assessment.", "investigations": "Baseline musculoskeletal screening. Blood pressure check.", "management": "Prescribe 2-3 non-consecutive days/week: 8-10 exercises targeting major muscle groups, 2-3 sets of 8-12 repetitions to moderate fatigue. Emphasize progressive overload. Proven to improve glycemic control (independent of aerobic exercise), enhance bone mineral density, and reduce fall risk.", "references": ["ACSM (American College of Sports Medicine) Position Stand on Resistance Training", "WHO Physical Activity Guidelines"]},
         "Verify patient does not perform Valsalva breath-holding during lifting. Check BP.",
         ["Acute severe joint swelling or inability to move a limb following lifting (muscle tear/herniation)", "Chest tightness or severe dizziness while lifting weights"],
         ["Do NOT hold your breath while lifting (spikes intracranial and blood pressure)", "Do NOT sacrifice safe lifting form to lift heavier weights"],
         "American College of Sports Medicine (ACSM) & WHO", "draft", None),

        ("ls_smoking_tobacco_cessation_003", "Smoking & Tobacco Cessation (Quitting Nicotine)", ["quit smoking", "stop tobacco", "smoking cessation", "bidi chhodna", "gutkha chhodna", "nicotine gum"],
         [
             "Quitting smoking and tobacco is the single best decision you can make for your health, and your body begins healing within minutes:",
             "  - Within 20 minutes: Your heart rate and blood pressure drop to normal.",
             "  - Within 24 hours: Poisonous carbon monoxide levels in your blood clear completely.",
             "  - Within 2 to 12 weeks: Circulation improves and lung function increases by up to 30%.",
             "  - Within 1 year: Your risk of a heart attack drops by HALF compared to a smoker.",
             "The 4 D's to beat a 3-minute craving:",
             "  1. Delay: Wait 5 minutes; cravings peak and naturally pass.",
             "  2. Deep Breathe: Take slow, deep belly breaths.",
             "  3. Drink Water: Sip a glass of cold water slowly.",
             "  4. Distract: Call a friend, go for a walk, or chew on sugar-free gum or clove.",
             "Medical quitting aids: Nicotine Replacement Therapy (Nicotex gums or patches) and prescription tablets (Bupropion or Varenicline) double your chances of quitting permanently.",
             "NATIONAL QUITLINE (Free in India): Call 1800-112-356 or SMS 'QUIT' to 56161 for free personalized counselor support."
         ],
         {"assessment": "Tobacco Use Disorder (Nicotine Dependence). Quantify using Fagerström Test for Nicotine Dependence (FTND score > 6 indicates high physical dependence). Use the 5 A's Model (Ask, Advise, Assess, Assist, Arrange).", "investigations": "Spirometry, CXR in chronic heavy smokers (>20 pack-years), blood pressure, oral cavity screening for leukoplakia/erythroplakia.", "management": "Combination Pharmacotherapy + Behavioral Counseling: Nicotine Replacement Therapy (NRT: Nicotine patch for basal coverage + Nicotine gum/lozenge 2-4 mg for acute breakthrough cravings) OR Varenicline (alpha-4-beta-2 partial agonist 0.5-1 mg BID) OR Bupropion SR (150 mg BID). Behavioral cognitive relapse prevention. Link to National Tobacco Quitline Services.", "references": ["USPSTF Recommendation: Tobacco Smoking Cessation in Adults", "WHO Tobacco Cessation Toolkit"]},
         "Ask smoking status at every clinical encounter. Provide Quitline 1800-112-356 number clearly.",
         ["Persistent hoarseness of voice > 3 weeks in a smoker (Screen for Laryngeal Cancer)", "Coughing up fresh blood (Hemoptysis - screen for Bronchogenic Carcinoma)", "White leathery non-scrapable patch inside cheek in a gutkha chewer (Oral Leukoplakia - Pre-cancer)"],
         ["Do NOT chew Nicotine gum like regular bubblegum (must 'chew and park' between cheek and gum to absorb across mucosa)", "Do NOT give up if you experience a slip-up; most successful quitters attempt 4-5 times before succeeding"],
         "United States Preventive Services Task Force (USPSTF) & WHO", "draft", None),

        ("ls_alcohol_moderation_harm_004", "Alcohol Guidelines, Moderation & Health Risks", ["alcohol limits", "how much alcohol is safe", "safe drinking units", "sharab peene ki limit", "alcohol health risks"],
         [
             "Global health scientific consensus (WHO 2023 update): There is NO completely 'safe' or zero-risk level of alcohol consumption for health; even small amounts increase the risk of cancers (especially breast, esophagus, and colorectal cancers).",
             "If you choose to drink, follow standard moderation limits:",
             "  - Men: No more than 2 standard drinks per day.",
             "  - Women: No more than 1 standard drink per day.",
             "What counts as 1 Standard Drink (approx. 10 to 14 grams of pure alcohol):",
             "  - 330 mL of regular beer (5% alcohol), OR",
             "  - 140 mL of table wine (12% alcohol), OR",
             "  - 40 mL (one standard peg) of 40% spirits (whiskey, vodka, rum, gin).",
             "Keep at least 3 to 4 days completely ALCOHOL-FREE every week to give your liver and cardiovascular system time to regenerate.",
             "NEVER DRINK IF: You are pregnant or trying to conceive, taking medications (especially Metronidazole, Paracetamol, sedatives, or blood pressure pills), driving, or have a history of liver disease."
         ],
         {"assessment": "Alcohol Consumption Risk Assessment. Screen using AUDIT-C (Alcohol Use Disorders Identification Test - Consumption) or CAGE questionnaire.", "investigations": "LFTs (GGT, AST, ALT; AST/ALT ratio > 2 suggests alcoholic etiology), CBC (macrocytosis / elevated MCV), abdominal ultrasound.", "management": "Brief Motivational Intervention (FRAMES model). Education on cancer risks associated with alcohol. Encourage alcohol-free days. Harm reduction and complete abstinence for liver disease, hypertension, or cardiomyopathy.", "references": ["WHO Statement on Alcohol Consumption and Health (2023)", "Dietary Guidelines for Americans - Alcohol Guidance"]},
         "Administer AUDIT-C screening. Calculate weekly units of alcohol. Warn against binge drinking.",
         ["Signs of alcohol-related end-organ damage: jaundice, ascites, upper GI bleeding (esophageal varices)", "Alcohol withdrawal seizures or Delirium Tremens"],
         ["NEVER consume alcohol during pregnancy (causes irreversible Fetal Alcohol Spectrum Disorder)", "Do NOT engage in weekend 'binge drinking' (consuming 5+ drinks in 2 hours dramatically triggers atrial fibrillation and strokes)"],
         "World Health Organization (WHO) & Centers for Disease Control and Prevention", "draft", None),

        ("ls_sleep_optimization_circadian_005", "Optimizing Sleep Quality & Circadian Rhythms", ["sleep quality", "how to sleep better", "circadian rhythm", "better sleep tips", "deep sleep", "sleep optimization"],
         [
             "Adults require 7 to 9 hours of quality, restorative sleep each night for immune function, brain waste clearance (glymphatic system), and metabolic regulation.",
             "Synchronize your master circadian clock: Get 20 to 30 minutes of natural outdoor sunlight within 1 hour of waking up; morning photons set your daytime alertness and start the 14-hour timer for evening melatonin release.",
             "Dim ambient indoor lighting after sunset; avoid bright overhead LED lights and blue screens at night.",
             "Keep your bedroom cold: Your core body temperature must drop by approximately 1°C (2°F) to initiate deep sleep; keep the room comfortably cool (around 18-20°C / 65-68°F).",
             "Maintain consistent timing: Going to sleep and waking up at the exact same times every day (even on weekends) stabilizes deep delta sleep stages.",
             "Avoid eating within 3 hours of sleep: digesting heavy meals raises core body temperature and elevates nighttime heart rate, disrupting sleep continuity."
         ],
         {"assessment": "Circadian Rhythm and Sleep Quality Assessment. Differentiate Circadian Rhythm Sleep-Wake Disorders (Delayed Sleep Phase, Advanced Sleep Phase, Shift Work Disorder) from Primary Insomnia.", "investigations": "Munich Chronotype Questionnaire, Actigraphy, Sleep diary.", "management": "Circadian entrainment: Early morning bright light therapy (>=10,000 lux or natural outdoor sun), strict wake-time consistency, evening light avoidance (blue-blocking), pre-sleep core cooling. Melatonin timing: micro-dose (0.5 mg) administered 4-5 hours prior to desired bedtime for phase-advancement.", "references": ["AASM Clinical Practice Guidelines for Circadian Rhythm Sleep-Wake Disorders", "National Sleep Foundation Sleep Guidelines"]},
         "Review morning sunlight habits, evening screen habits, and bed-time consistency.",
         ["Falling asleep unintentionally while driving or operating machinery", "Extreme shift-work sleep disorder leading to severe medical errors or cognitive impairment"],
         ["Do NOT sleep in late on weekends to 'make up' for lost sleep (creates 'social jetlag' that destroys weekday sleep quality)", "Do NOT keep mobile phones beside your pillow"],
         "American Academy of Sleep Medicine (AASM) & National Sleep Foundation", "draft", None),

        ("ls_stress_management_mind_body_006", "Mind-Body Stress Reduction & Cortisol Management", ["manage stress", "reduce cortisol", "stress relief", "how to de-stress", "chronic stress relief", "mental calm"],
         [
             "Chronic unmanaged stress keeps your nervous system in a continuous fight-or-flight state, flooding your body with cortisol and adrenaline that elevates blood pressure, spikes blood sugar, and suppresses immune cells.",
             "The 'Physiological Sigh': A rapid reset for acute stress discovered by neuroscientists: take two quick sniffs in through your nose (one deep breath, followed by a second sharp top-up sniff), then exhale slowly and fully through your mouth. Doing this just 2 to 3 times instantly slows heart rate.",
             "Engage in non-sleep deep rest (NSDR / Yoga Nidra): a 20-minute guided relaxation session that restores physical energy and replenishes mental focus.",
             "Nature exposure ('Shinrin-yoku' / Forest bathing): Spending just 20 minutes in a green park or natural setting scientifically reduces salivary cortisol and heart rate variability.",
             "Audit your digital consumption: reduce doom-scrolling, social media comparison, and continuous breaking news alerts.",
             "Connect with friends: social laughter and physical hugs release oxytocin, the body's natural hormone that neutralizes stress chemicals."
         ],
         {"assessment": "Chronic Allostatic Load and Stress Assessment. Evaluate sympathetic overdrive and hypothalamic-pituitary-adrenal (HPA) axis dysregulation.", "investigations": "Perceived Stress Scale (PSS-10), resting heart rate, 24-hour ambulatory blood pressure, fasting glucose.", "management": "Evidence-based autonomic modulation: Physiological sigh breathing protocols, Mindfulness-Based Stress Reduction (MBSR), progressive muscle relaxation, nature immersion therapy. Cognitive restructuring of catastrophic cognitive distortions.", "references": ["Huberman Lab / Stanford Studies on Cyclic Sighing and Autonomic Control", "American Psychological Association (APA) Stress Guidelines"]},
         "Demonstrate the physiological sigh technique (double inhale through nose, long exhale through mouth).",
         ["Severe acute panic or hypertensive spike triggered by emotional stress", "Stress manifesting as severe chest pain (must rule out Takotsubo Cardiomyopathy / Broken Heart Syndrome)"],
         ["Do NOT use nicotine, alcohol, or junk food as stress coping mechanisms", "Do NOT bottle up chronic emotional distress without talking to someone"],
         "Stanford Medicine Neurobiology Research & American Psychological Association", "draft", None),

        ("ls_hydration_water_rules_007", "Daily Hydration Guidelines & Water Balance", ["how much water to drink", "daily water intake", "pani kitna piye", "dehydration prevention", "hydration rules"],
         [
             "General daily fluid guideline: Healthy adults living in temperate climates require approximately 2.5 to 3 liters (10 to 12 glasses) of water daily for men, and 2.0 to 2.5 liters (8 to 10 glasses) daily for women.",
             "Increase water intake in hot summer weather, humid conditions, and during physical exercise (drink 1 to 2 extra glasses for every 30 minutes of sweating).",
             "THE SIMPLE URINE COLOR TEST: Check your urine color in the toilet bowl: pale straw or light transparent yellow indicates healthy, optimal hydration. Dark yellow, amber, or brown urine means you are dehydrated and need to drink water immediately.",
             "Drink a tall glass of water first thing upon waking to rehydrate your body after 8 hours of overnight sleep.",
             "IMPORTANT MEDICAL EXCEPTION: If your cardiologist or nephrologist has placed you on a strict fluid limit (common in congestive heart failure and advanced kidney disease), follow your doctor's exact daily milliliter limit."
         ],
         {"assessment": "Euhydration vs Hypohydration Assessment. Evaluate fluid turnover, renal concentrating capacity, and environmental heat load.", "investigations": "Urine color chart (Armstrong 8-point scale; grades 1-3 indicate euhydration), Serum Sodium, BUN/Creatinine ratio, urine specific gravity.", "management": "Individualized fluid prescription based on body weight (~30-35 mL/kg/day in healthy adults) adjusted for ambient temperature and physical activity. Recognize medical fluid restrictions in heart failure (typically 1.5-2 L/day) and oliguric CKD.", "references": ["National Academies of Sciences, Engineering, and Medicine Dietary Reference Intakes for Water", "European Food Safety Authority (EFSA) Hydration Guidelines"]},
         "Review urine color. Check for medical fluid restriction orders in EHR (CHF/CKD).",
         ["Hyponatremia symptoms: confusion, nausea, seizures from drinking massive volumes of water rapidly (Water Intoxication / Hyponatremia)", "Severe dehydration with SBP < 90 mmHg and dark concentrated urine"],
         ["Do NOT drink gallons of water excessively beyond thirst (can dilute blood sodium dangerously)", "Do NOT wait until you feel desperately thirsty (thirst signals that dehydration has already begun)"],
         "National Academies of Sciences (NASEM) & European Food Safety Authority (EFSA)", "draft", None),

        ("ls_ergonomics_desk_posture_008", "Workplace Ergonomics & Posture (Preventing Tech Neck)", ["ergonomics", "desk posture", "computer neck pain", "tech neck", "sitting posture back pain", "ergonomic chair setup"],
         [
             "Poor sitting ergonomics causes chronic cervical spine strain ('tech neck'), rounded shoulders, lower back stiffness, and carpal tunnel wrist pain.",
             "OPTIMAL WORKSTATION SETUP:",
             "  1. Monitor Height: Position your monitor directly in front of you so the TOP THIRD of the screen is at eye level (looking down bends your neck; looking straight ahead relieves neck spine load).",
             "  2. Arm Length Distance: Screen should be approximately arm's length (50 to 70 cm) away from your face.",
             "  3. Chair Support: Sit with your hips pushed all the way to the back of the chair; use a small lumbar cushion to support your natural lower back curve.",
             "  4. Foot Placement: Keep both feet flat on the floor; use a footrest if your feet dangle.",
             "  5. Elbow Angle: Keep elbows bent at 90 degrees with forearms resting parallel to the desk while typing.",
             "THE 30-MINUTE MOVEMENT RULE: Stand up, stretch, and perform chin tucks (gently pulling your chin back like making a double chin) every 30 to 45 minutes."
         ],
         {"assessment": "Workplace Ergonomic and Postural Strain Assessment. Evaluate Upper Crossed Syndrome (tight pectorals/upper trapezius, weak deep neck flexors/rhomboids) and lumbar disc compression.", "investigations": "Physical exam: forward head posture angle (craniovertebral angle), cervical range of motion, Spurling's test (rule out radiculopathy).", "management": "Ergonomic workstation adjustment (monitor elevation, lumbar support, 90-degree elbow/knee angles). Postural correction exercises: chin tucks, wall angels, thoracic extension over foam roller, core strengthening.", "references": ["OSHA Computer Workstations Ergonomics Guidelines", "Mayo Clinic Guide to Office Ergonomics"]},
         "Demonstrate proper chin tuck and screen height alignment. Assess daily desk hours.",
         ["Shooting sharp pain, numbness, or tingling traveling down from neck into fingers (Cervical Radiculopathy)", "Severe progressive weakness in hand grip"],
         ["Do NOT slouch forward or rest your chin in your hands while staring at screens", "Do NOT work on a laptop flat on your lap for hours (use a laptop riser stand with external keyboard)"],
         "Occupational Safety and Health Administration (OSHA) & Mayo Clinic Guidelines", "draft", None),

        ("ls_ultra_processed_foods_risks_009", "Ultra-Processed Foods (UPFs) & Metabolic Health", ["ultra processed foods", "junk food health risks", "packaged food dangers", "upf foods", "healthy eating whole foods"],
         [
             "Ultra-processed foods (UPFs) are industrial food formulations made mostly from extracted substances (modified starches, hydrogenated fats, isolated soy protein) with artificial flavorings, colors, and emulsifiers.",
             "Common examples: Packaged chips, commercial namkeens, instant noodles, sugary breakfast cereals, packaged sweet biscuits, hot dogs, and packaged soda drinks.",
             "Scientific health dangers: Heavy consumption of UPFs is directly linked to chronic systemic inflammation, obesity, Type 2 diabetes, high blood pressure, fatty liver, and increased cancer risk.",
             "Chemical cravings: UPFs are scientifically engineered to achieve the 'bliss point' of salt, sugar, and fat that bypasses normal brain fullness signals, causing overeating.",
             "THE 80/20 RULE: Fill at least 80% of your diet with whole, single-ingredient foods cooked from scratch (vegetables, lentils, fresh fruits, whole grains, eggs, curd).",
             "Read labels: If the ingredient list contains chemical names, artificial preservatives, or items you would never find in a home kitchen, it is an ultra-processed product."
         ],
         {"assessment": "Dietary Quality and Processing Classification using NOVA Food Classification System (Group 1: Unprocessed/Minimally processed; Group 4: Ultra-processed food formulations).", "investigations": "Fasting lipid panel, Fasting glucose & HbA1c, LFTs, hs-CRP, BMI and waist circumference.", "management": "Structured transition toward whole-food, plant-rich dietary patterns (Mediterranean, DASH). Educate on reading nutrition facts labels (identifying hidden sugars, high sodium, and industrial emulsifiers). Replace UPF snacks with whole alternatives (roasted chana, unsalted nuts, fresh fruit).", "references": ["NOVA Food Classification System (Monteiro et al.)", "BMJ Clinical Review: Ultra-processed food exposure and adverse health outcomes"]},
         "Assess daily percentage of diet from packaged/fast foods. Review nutrition labels.",
         ["Severe metabolic syndrome (obesity + hypertension + elevated triglycerides + elevated fasting glucose)"],
         ["Do NOT believe misleading health claims on the front of packaged boxes ('Heart healthy', 'Rich in vitamins') without checking the actual ingredient list", "Do NOT use ultra-processed snacks as primary meal replacements"],
         "NOVA System (University of São Paulo) & British Medical Journal (BMJ)", "draft", None),

        ("ls_sun_exposure_vitamin_d_010", "Sensible Sun Exposure & Sunscreen Protection", ["sun exposure", "sunscreen use", "how to get vitamin d from sun", "sunburn prevention", "spf guide"],
         [
             "Morning sunlight is the most natural way for your skin to synthesize Vitamin D3, essential for strong bones, calcium absorption, and healthy immune function.",
             "SENSIBLE SUN EXPOSURE FOR VITAMIN D: Expose your arms, face, and legs to natural morning sunlight for 15 to 20 minutes (before 10 AM or after 4 PM) 3 to 4 times a week without burning.",
             "SUNSCREEN PROTECTION DURING PEAK HOURS: Between 10 AM and 4 PM, ultraviolet (UV) rays are intense and cause DNA skin damage, premature skin aging (wrinkles, dark spots), and skin cancers.",
             "How to use sunscreen correctly:",
             "  - Choose a broad-spectrum sunscreen with SPF 30 or higher and PA+++ rating (protects against both UVA aging rays and UVB burning rays).",
             "  - Apply generously (about 2 finger-lengths of cream for face and neck) at least 15 to 20 minutes before going outdoors.",
             "  - Reapply every 2 hours if outdoors, or immediately after swimming or heavy sweating.",
             "Wear UV-blocking sunglasses and a wide-brimmed hat during midday sun."
         ],
         {"assessment": "Photoprotection vs Cutaneous Vitamin D Synthesis. Assess Fitzpatrick Skin Phototype (Type I-VI) and ultraviolet index (UV Index).", "investigations": "Serum 25-OH Vitamin D level.", "management": "Sensible sun exposure tailored to skin type (darker phototypes IV-VI require longer exposure for equivalent Vitamin D synthesis). Daily broad-spectrum sunscreen (SPF >= 30, PA+++) application for photocarcinogenesis and photoaging prevention. Oral Vitamin D3 supplementation (1000-2000 IU/day) preferred over excessive unprotected UV exposure.", "references": ["AAD Guidelines on Sunscreen and Sun Safety", "WHO Guidelines on Ultraviolet Radiation and Health"]},
         "Educate on the two-finger rule for sunscreen application. Check 25-OH Vitamin D levels.",
         ["Severe blistering sunburn with fever, chills, and dizziness (Sunburn Toxemia / Sunstroke Emergency)", "Changing, irregularly pigmented, asymmetric skin mole (Screen for Melanoma)"],
         ["Do NOT stay in intense midday sun without sunscreen protection", "Do NOT use tanning beds or artificial UV tanning lamps"],
         "American Academy of Dermatology (AAD) & World Health Organization (WHO)", "draft", None),

        ("ls_sedentary_lifestyle_risks_011", "Breaking Prolonged Sitting & Sedentary Behavior", ["sedentary lifestyle", "sitting all day health risks", "desk job sitting dangers", "active workstation", "sitting disease"],
         [
             "Prolonged unbroken sitting (more than 8 hours daily) slows down blood circulation, deactivates muscle enzymes that clear fats and blood sugar, and significantly increases cardiovascular and diabetes mortality.",
             "Even if you exercise for 30 minutes in the morning, sitting motionless for the remaining 10 hours still carries independent health risks ('The Active Couch Potato' effect).",
             "HOW TO BREAK UP SITTING TIME (EASY MICRO-HABITS):",
             "  - The '20-8-2 Rule': For every 30 minutes of desk work, sit for 20 minutes, stand for 8 minutes, and walk/stretch for 2 minutes.",
             "  - Take phone calls standing up or walking around the room.",
             "  - Stand up and stretch every time an online video meeting ends.",
             "  - Walk over to talk to a colleague instead of sending an internal message.",
             "  - Take the stairs instead of the elevator for 1 to 2 floors.",
             "Small, frequent movements throughout the day keep metabolic enzymes active and prevent neck and lower back stiffness."
         ],
         {"assessment": "Sedentary Behavior Assessment (total daily sitting hours and sitting bout durations). Differentiate sedentary behavior from physical inactivity.", "investigations": "Daily sitting time logs, step count tracking, fasting lipid profile, HbA1c.", "management": "Sedentary break prescription: Interrupt sitting every 30-45 minutes with 2-3 minutes of light-intensity physical activity (walking, calf raises, standing). Sit-stand desk utilization. Proven to lower postprandial glucose and insulin excursions by 15-20% and reduce vascular endothelial dysfunction.", "references": ["WHO Guidelines on Physical Activity and Sedentary Behaviour", "AHA Scientific Statement on Sedentary Behavior"]},
         "Ask patient to estimate total daily sitting hours. Prescribe active movement breaks.",
         ["Sudden calf swelling, warmth, and pain after long motionless sitting (Deep Vein Thrombosis Alert)", "Acute severe back spasm with inability to stand"],
         ["Do NOT sit motionless for 3 to 4 continuous hours without standing up", "Do NOT assume a morning workout completely cancels out 10 hours of unbroken sitting"],
         "World Health Organization (WHO) & American Heart Association", "draft", None),

        ("ls_mindful_eating_habits_012", "Mindful Eating & Overcoming Emotional Eating", ["mindful eating", "emotional eating", "eating when bored", "overeating habits", "slow eating benefits"],
         [
             "Mindful eating is the practice of paying full, curious attention to the physical experience of eating, rather than eating automatically while distracted.",
             "The 20-Minute Satiety Lag: It takes approximately 15 to 20 minutes for your stomach to produce and send fullness hormones (leptin, CCK) to your brain. Eating too fast causes you to swallow excess food before your brain realizes you are full.",
             "PRACTICE MINDFUL EATING HABITS:",
             "  - Eliminate screen distractions: Turn off the TV and put your smartphone away during meals; distracted eating leads to consuming 30% more calories.",
             "  - Chew thoroughly: Chew each mouthful 15 to 20 times to appreciate flavors, textures, and facilitate smooth stomach digestion.",
             "  - Put your fork or spoon down between bites.",
             "Differentiate Physical Hunger from Emotional Hunger:",
             "  - Physical hunger builds up gradually, can be satisfied with healthy food (like an apple or dal), and stops when full.",
             "  - Emotional hunger strikes suddenly, craves a specific comfort food (like ice cream or chips), and is accompanied by guilt afterward.",
             "When emotional hunger hits, pause and ask: 'Am I actually hungry, or am I stressed, bored, or lonely?' Drink a glass of water first."
         ],
         {"assessment": "Eating Behavior Assessment. Screen for emotional eating, binge eating episodes, and external eating cues.", "investigations": "Mindful Eating Questionnaire (MEQ), food and mood diary.", "management": "Mindful eating interventions (slowing down eating speed, recognizing hunger/fullness cues on a 1-10 scale, sensory appreciation of food). Cognitive behavioral strategies for emotional eating (developing non-food coping mechanisms for stress and sadness: walks, journaling, music).", "references": ["Harvard T.H. Chan School of Public Health Mindful Eating Review", "Center for Mindful Eating Guidelines"]},
         "Inquire about meal speed and eating in front of televisions/screens. Review hunger scale.",
         ["Binge eating disorder with severe loss of control, distress, and guilt", "Severe self-induced vomiting after meals (Bulimia)"],
         ["Do NOT eat meals while staring at smartphone screens or television", "Do NOT use food as your primary emotional reward or stress relief"],
         "Harvard T.H. Chan School of Public Health & Center for Mindful Eating", "draft", None),

        ("ls_smoking_secondhand_smoke_013", "Secondhand & Thirdhand Smoke Dangers to Family", ["secondhand smoke", "passive smoking", "thirdhand smoke", "smoke danger children", "passive smoking risks"],
         [
             "Secondhand smoke (passive smoking) is the smoke exhaled by a smoker plus the smoke that drifts from the burning tip of a cigarette or bidi.",
             "There is NO safe level of secondhand smoke exposure: non-smokers who breathe secondhand smoke inhale the exact same 7,000 toxic chemicals and 70 cancer-causing substances as the smoker.",
             "DANGERS TO CHILDREN AND BABIES:",
             "  - Dramatically increases the risk of Sudden Infant Death Syndrome (SIDS / cot death).",
             "  - Triggers severe, frequent asthma attacks and chronic bronchitis in children.",
             "  - Causes recurring painful middle ear infections and hospitalizations for pneumonia.",
             "THIRDHAND SMOKE: Toxic nicotine and chemical gases soak into carpets, curtains, sofas, walls, and clothing, lingering for months. Babies crawling on floors absorb these poisons through their skin and hands.",
             "Smoking in another room, opening a window, or turning on a fan does NOT eliminate the danger; the ONLY effective way to protect your family is to maintain a 100% strictly SMOKE-FREE home and car."
         ],
         {"assessment": "Environmental Tobacco Smoke (ETS) Exposure Assessment in pediatric and non-smoking adult populations.", "investigations": "Urinary cotinine levels (if testing exposure), pediatric respiratory evaluation.", "management": "Establish 100% smoke-free home and vehicle policies. Smoking cessation support for household smokers. Counsel parents that outdoor smoking still leaves thirdhand residues on clothing; emphasize handwashing and changing clothes before holding infants.", "references": ["US Surgeon General's Report: The Health Consequences of Involuntary Exposure to Tobacco Smoke", "WHO Second-Hand Smoke Fact Sheet"]},
         "Ask non-smokers and mothers of asthmatic children about household smoking exposures. Prescribe smoke-free home.",
         ["Severe pediatric asthma exacerbation requiring emergency admission in a household with smokers", "Infant with severe recurrent lower respiratory infections"],
         ["Do NOT smoke inside the house even if children are in a different room (smoke travels through ventilation)", "Do NOT smoke inside cars even with windows rolled down"],
         "US Surgeon General & World Health Organization (WHO)", "draft", None),

        ("ls_circadian_shift_work_health_014", "Shift Work Health, Night Shifts & Sleep Adaptation", ["shift work", "night shift health", "night duty sleep", "working night shift health", "shift work sleep disorder"],
         [
             "Working rotating or overnight shifts forces your body to operate against its natural 24-hour circadian clock, increasing the risk of digestive issues, sleep debt, metabolic syndrome, and heart disease.",
             "PREPARING FOR SLEEP AFTER A NIGHT SHIFT:",
             "  - Wear dark sunglasses on your morning drive or commute home; bright morning sunlight signals your brain to wake up and suppresses daytime sleep.",
             "  - Keep your bedroom as dark as a cave: use heavy blackout curtains or a comfortable eye mask.",
             "  - Use earplugs or a white noise machine (or fan) to drown out daytime neighborhood noise.",
             "  - Turn off phone notifications and ask family members to treat your daytime sleep as sacred and uninterrupted.",
             "NUTRITION ON NIGHT SHIFT:",
             "  - Eat your main balanced meal BEFORE your night shift begins.",
             "  - Eat light, protein-rich snacks (nuts, fruit, curd) during the shift; avoid heavy greasy curries or pizzas at 3 AM (your digestive enzymes are naturally asleep at night).",
             "  - Stop all caffeine (tea, coffee, energy drinks) at least 4 to 5 hours before your shift ends so caffeine clears your system before bedtime."
         ],
         {"assessment": "Shift Work Sleep Disorder (ICSD-3: Insomnia or excessive sleepiness temporally associated with a recurring work schedule that overlaps the normal sleep period).", "investigations": "Sleep log, Epworth Sleepiness Scale (ESS), metabolic profiling.", "management": "Circadian alignment: Dark sunglasses on morning commute home, strict blackout bedroom, scheduled core sleep. Strategic caffeine use (early in shift, avoid in second half). Anchor sleep strategy for permanent night workers. Short-term Melatonin (3-5 mg taken prior to daytime sleep) to enhance daytime sleep duration.", "references": ["AASM Practice Parameters for the Clinical Evaluation and Treatment of Circadian Rhythm Sleep Disorders", "ACOEM Guidance on Fatigue Risk Management"]},
         "Review shift schedule and sleep environment. Check for drowsy driving risk after night duty.",
         ["Severe micro-sleeps while driving home after night shift (High motor vehicle collision danger)", "Chronic insomnia with severe metabolic syndrome"],
         ["Do NOT consume coffee or energy drinks during the last 4 hours of your night shift", "Do NOT skip daytime sleep to run household errands"],
         "American Academy of Sleep Medicine (AASM) & ACOEM Guidelines", "draft", None),

        ("ls_alcohol_hangover_myths_facts_015", "Alcohol Hangover Recovery: Evidence vs Myths", ["hangover cure", "hangover recovery", "hangover headache nausea", "sharab ka nasha utarna", "hangover remedy"],
         [
             "A hangover is your body's physical reaction to acute alcohol poisoning, driven by dehydration, toxic acetaldehyde buildup, stomach lining irritation, and sleep disruption.",
             "EVIDENCE-BASED RECOVERY STEPS:",
             "  1. Rehydrate with electrolytes: Drink plenty of water along with Oral Rehydration Salts (ORS), coconut water, or fruit juices to replace vital fluids and salts flushed out by alcohol.",
             "  2. Eat bland carbohydrates: Toast, crackers, khichdi, or porridge gently raise depleted blood sugar levels without upsetting your inflamed stomach.",
             "  3. Take Paracetamol cautiously for headache: Do NOT exceed 1000 mg (and avoid heavy paracetamol with chronic alcohol); NEVER take Ibuprofen or Aspirin on a hangover-inflamed stomach (triggers severe stomach bleeding and ulcers).",
             "  4. Rest and sleep: Time and sleep are the only true cures; your liver requires time to metabolize and clear toxic breakdown products.",
             "POPULAR HANGOVER MYTHS DEBUNKED:",
             "  - MYTH: 'Hair of the dog' (drinking more alcohol in the morning) cures a hangover. TRUTH: It only delays the hangover and deepens alcohol dependency.",
             "  - MYTH: A cold shower or strong black coffee sobers you up. TRUTH: Coffee does not clear alcohol from your blood and further irritates your stomach."
         ],
         {"assessment": "Acute Alcohol Hangover (Veisalgia). Multi-factorial physiological state involving dehydration, mild metabolic acidosis, hypoglycemia, gastrointestinal irritation, and cytokine release.", "investigations": "Clinical assessment. If patient is unrousable: check fingerstick glucose immediately (alcohol-induced hypoglycemia) and evaluate for head trauma.", "management": "Oral fluid and electrolyte replacement (WHO ORS). Bland complex carbohydrates to correct mild hypoglycemia. Cautious analgesia: Paracetamol (max 1-2g/day) or antacids for gastritis. Avoid NSAIDs due to heightened gastric mucosal injury risk. Rest.", "references": ["Alcohol Hangover Research Group (AHRG) Consensus Guidelines", "Mayo Clinic Clinical Review on Hangover Management"]},
         "Check mental status and blood glucose if patient is lethargic. Verify no head trauma.",
         ["Alcohol poisoning: unrousable, slow breathing (<8 breaths/min), cold clammy bluish skin, or vomiting while unconscious (Medical Emergency - Place on side and call 112)", "Severe coffee-ground vomiting"],
         ["NEVER take Ibuprofen or Aspirin for a hangover (destroys stomach lining)", "NEVER drink more alcohol in the morning to 'cure' a hangover"],
         "Alcohol Hangover Research Group & Mayo Clinic Clinical Guidance", "draft", None),

        ("ls_sugar_addiction_reduction_016", "Cutting Added Sugars & Breaking Sweet Cravings", ["reduce sugar", "stop eating sugar", "sugar addiction", "sweet cravings", "mithai kam karna", "cut down sugar"],
         [
             "WHO recommendation for added sugars: Less than 5% to 10% of total daily calories (approximately 5 to 6 teaspoons / 25 grams of added sugar daily). Most people consume more than triple this amount.",
             "Added sugars provide zero vitamins or minerals ('empty calories') and are the primary driver of obesity, fatty liver, insulin resistance, and dental cavities.",
             "WHERE HIDDEN SUGARS LURK: Packaged sodas, commercial fruit juices, sweetened chai/coffee, flavored yogurts, tomato ketchup, energy bars, and breakfast cereals.",
             "PRACTICAL STEPS TO CUT SUGAR:",
             "  - Stop drinking your sugar: Replace sodas, packaged juices, and sweet teas with plain water, lime water (nimbu pani without sugar), or unsweetened green tea.",
             "  - Satisfy sweet cravings with whole fruits: Fresh apples, berries, papayas, and oranges provide natural sweetness bound with dietary fiber that prevents sugar spikes.",
             "  - Reduce sugar in tea and coffee gradually by half every week until your tastebuds adapt.",
             "  - Eat protein and healthy fats with meals; balanced meals stabilize blood glucose and prevent the sharp insulin drops that trigger intense sweet cravings."
         ],
         {"assessment": "Dietary Free Sugar Assessment. Quantify added/free sugar intake against WHO guidelines (<5-10% of total energy).", "investigations": "Fasting blood glucose, HbA1c, fasting lipid panel, dental examination.", "management": "Nutritional counseling to eliminate sugar-sweetened beverages (SSBs) and ultra-processed confectionery. Gradual taste receptor adaptation. Increase dietary fiber and protein to enhance satiety. Educational label reading (identifying sucrose, high-fructose corn syrup, maltodextrin, dextrose).", "references": ["WHO Guideline: Sugars Intake for Adults and Children", "AHA Scientific Statement on Dietary Sugars and Cardiovascular Health"]},
         "Review daily consumption of sugary chai/coffee, sodas, and Indian sweets (mithai).",
         ["Severe uncontrolled hyperglycemia in known diabetics consuming high-sugar diets"],
         ["Do NOT replace sugar with unlimited jaggery (gur) or honey (both contain over 90% sucrose/fructose and spike blood sugar identically)", "Do NOT consume commercial diet sodas in massive quantities"],
         "World Health Organization (WHO) & American Heart Association", "draft", None),

        ("ls_smoking_vaping_ecigarettes_017", "E-Cigarettes & Vaping Health Hazards", ["vaping", "e-cigarettes", "vape health risks", "is vaping safe", "vaping vs smoking", "e-cigarette ban india"],
         [
             "E-cigarettes (vapes) are NOT harmless water vapor; they heat an aerosol liquid containing highly addictive concentrated nicotine, heavy metals (lead, nickel, tin), ultrafine particles that penetrate deep into the lungs, and toxic chemical flavorings.",
             "Vaping and lung health: Vaping chemicals cause acute lung inflammation, chronic wheezing, and EVALI (E-cigarette or Vaping Product Use-Associated Lung Injury), a life-threatening pneumonia-like lung damage.",
             "Brain development risks: Nicotine in vapes permanently alters brain circuits controlling attention, learning, and impulse control in teenagers and young adults.",
             "LEGAL STATUS IN INDIA: E-cigarettes and all vaping devices are completely BANNED in India under the Prohibition of Electronic Cigarettes Act (2019) due to grave public health hazards to youth.",
             "Quitting vaping: If you vape, switch to medically approved nicotine replacement therapies (gums/patches) and behavioral support to quit nicotine safely."
         ],
         {"assessment": "E-Cigarette or Vaping Product Use Assessment. Screen for EVALI (E-cigarette or Vaping Product Use-Associated Lung Injury) and nicotine dependence.", "investigations": "CXR / HRCT Chest (ground-glass opacities, subpleural sparing characteristic of EVALI), pulse oximetry, spirometry.", "management": "Complete cessation of all vaping and combustible tobacco. For EVALI: Hospitalization, supportive oxygen, systemic corticosteroids (Methylprednisolone/Prednisone), rule out infectious pneumonia. Nicotine dependence management with approved NRT.", "references": ["CDC Guidelines on E-cigarette, or Vaping, Product Use-Associated Lung Injury (EVALI)", "Government of India Prohibition of Electronic Cigarettes Act 2019"]},
         "Ask adolescents and young adults about vaping habits. Check oxygen saturation if respiratory symptoms present.",
         ["Acute shortness of breath, chest pain, and hypoxemia in a vaper (EVALI - Immediate Hospitalization)", "Seizures or accidental ingestion of liquid nicotine refill by young children (Toxic Nicotine Emergency)"],
         ["Do NOT believe the marketing myth that vaping is 'harmless water vapor'", "Do NOT modify commercial vape cartridges or add illicit oils"],
         "Centers for Disease Control and Prevention (CDC) & Ministry of Health India", "draft", None),

        ("ls_cold_plunge_ice_baths_018", "Cold Water Plunges & Ice Baths: Safety & Science", ["cold plunge", "ice bath", "cold water therapy", "ice bath benefits", "cold shower health"],
         [
             "Cold water immersion (ice baths at 10°C to 15°C / 50°F to 59°F for 2 to 5 minutes) has gained popularity for boosting alertness, reducing muscle soreness, and stimulating norepinephrine release.",
             "HOW IT WORKS: Sudden cold triggers an intense sympathetic nervous system shock: deep gasp reflex, rapid heart rate spike, and massive constriction of blood vessels throughout your body.",
             "CARDIOVASCULAR WARNING: The sudden cold shock causes an immediate surge in blood pressure and cardiac workload; it is DANGEROUS for anyone with high blood pressure, heart disease, cardiac arrhythmias, or Raynaud's disease.",
             "Safe cold immersion rules:",
             "  - Start slowly: Begin with 30 seconds of cool water at the end of a normal warm shower.",
             "  - Never hyperventilate or hold your breath before entering cold water (can trigger shallow-water blackout and drowning).",
             "  - Keep sessions brief: 2 to 3 minutes is sufficient for alertness benefits; longer immersion risks dangerous hypothermia.",
             "  - Never plunge alone in deep water or open rivers.",
             "If you have high blood pressure, history of heart attacks, or arrhythmias, consult a cardiologist before attempting ice baths."
         ],
         {"assessment": "Cardiovascular and Autonomic Effects of Cold Water Immersion (CWI). Differentiate cold habituation from acute Cold Shock Response (CSR) and diving reflex conflict.", "investigations": "Cardiovascular risk screening (12-lead ECG, blood pressure check) prior to extreme temperature challenges.", "management": "Education on safety protocols. Emphasize breathing control (avoid hyperventilation). Absolute contraindications: Uncontrolled hypertension, coronary artery disease, cardiac arrhythmias, Raynaud's phenomenon, peripheral artery disease. Duration limit <= 2-5 minutes at 10-15°C.", "references": ["American Heart Association Scientific Advisory on Cold Water Immersion", "Extreme Physiology & Medicine Review on Cold Water Immersion"]},
         "Screen for hypertension and cardiac history before patient attempts cold plunges.",
         ["Severe chest pain, palpitations, or syncope upon entering cold water (Acute Arrhythmia / Coronary Spasm Emergency)", "Signs of hypothermia: uncontrollable shivering, slurred speech, confusion"],
         ["NEVER hyperventilate before entering cold water (causes immediate blackout and drowning)", "Do NOT perform cold water plunging if you have heart disease or high blood pressure"],
         "American Heart Association (AHA) & International Life Saving Federation", "draft", None),

        ("ls_sauna_heat_therapy_cardio_019", "Sauna & Heat Therapy: Cardiovascular Benefits & Safety", ["sauna benefits", "steam bath health", "heat therapy", "sauna blood pressure", "sauna safety"],
         [
             "Regular sauna bathing (dry Finnish sauna at 80°C to 90°C / 176°F to 194°F for 10 to 20 minutes) mimics moderate-intensity cardiovascular exercise: your heart rate elevates to 120-150 bpm, blood vessels dilate, and circulation increases.",
             "Health benefits: Studies show that 2 to 3 sauna sessions weekly are associated with lower blood pressure, reduced cardiovascular mortality, improved arterial compliance, and relaxed muscle tension.",
             "ESSENTIAL SAUNA SAFETY RULES:",
             "  - Hydrate before and after: Drink 2 to 3 full glasses of water before entering and immediately after leaving the sauna to replace heavy sweat losses.",
             "  - Time limit: Stay inside for only 10 to 15 minutes; exit immediately if you feel dizzy, lightheaded, or nauseous.",
             "  - Cool down gradually: Sit quietly at room temperature for 10 minutes before taking a shower.",
             "ABSOLUTE DANGER: NEVER CONSUME ALCOHOL before or during a sauna; alcohol plus sauna heat causes severe dehydration, profound blood pressure collapse, and fatal arrhythmias.",
             "Contraindicated in unstable angina, recent heart attack, severe aortic stenosis, and during pregnancy."
         ],
         {"assessment": "Hemodynamic and Neuroendocrine Effects of Whole-Body Hyperthermia (Sauna Bathing). Induces cutaneous vasodilation, elevated cardiac output, and heat shock protein (HSP) synthesis.", "investigations": "Resting blood pressure, cardiovascular history.", "management": "Sauna protocol: 10-20 minutes at 80-90°C, followed by hydration. Contraindications: Unstable angina, recent myocardial infarction (<3 months), severe aortic stenosis, decompensated heart failure, orthostatic hypotension, pregnancy (hyperthermia is teratogenic in 1st trimester). Absolute prohibition of alcohol.", "references": ["Mayo Clinic Proceedings Review: Cardiovascular and Other Health Benefits of Sauna Bathing", "AHA Guidance on Heat Exposure"]},
         "Review cardiac history. Confirm patient drinks water before and after sauna.",
         ["Dizziness, lightheadedness, or syncope upon standing inside/outside sauna", "Angina chest pain or rapid irregular heartbeats in sauna"],
         ["NEVER drink alcohol before or during a sauna (severely spikes fatal collapse risk)", "Do NOT use a sauna during pregnancy (high core heat causes fetal neural tube defects)"],
         "Mayo Clinic Proceedings & American Heart Association", "draft", None),

        ("ls_intermittent_fasting_safety_020", "Intermittent Fasting (16/8 Method) Benefits & Safe Practice", ["intermittent fasting", "16 8 fasting", "fasting for weight loss", "time restricted eating", "intermittent fasting rules"],
         [
             "Intermittent Fasting (Time-Restricted Eating) is an eating pattern where you cycle between periods of eating and fasting, most commonly the 16/8 method (fasting for 16 hours and eating all meals within an 8-hour window, such as 11 AM to 7 PM).",
             "Health benefits: Improves insulin sensitivity, promotes cellular cleanup (autophagy), lowers visceral belly fat, and supports weight loss by naturally curbing late-night snacking.",
             "During the fasting window: You can drink water, plain black coffee, and unsweetened green or herbal tea (zero-calorie liquids do NOT break the fast).",
             "During the 8-hour eating window: Eat balanced, nutrient-dense whole meals (vegetables, dal, paneer, eggs, whole grains); fasting is NOT an excuse to gorge on junk food or sweets.",
             "WHO SHOULD NOT DO INTERMITTENT FASTING:",
             "  - Pregnant or breastfeeding women.",
             "  - People with a history of eating disorders (anorexia, bulimia).",
             "  - Type 1 diabetics or Type 2 diabetics taking insulin or sulfonylurea medicines (fasting without medication adjustment triggers severe, life-threatening low blood sugar / hypoglycemia).",
             "Consult your doctor before starting fasting if you take prescription medications."
         ],
         {"assessment": "Time-Restricted Eating (TRE) / Intermittent Fasting (IF). Metabolic effects: glycogen depletion, fatty acid oxidation, ketone generation, and circadian metabolic synchronization.", "investigations": "Baseline Fasting Glucose, HbA1c, Lipid panel, review medication administration schedule.", "management": "16/8 protocol: 8-hour daytime feeding window aligned with circadian rhythms (e.g., 9 AM - 5 PM or 10 AM - 6 PM). Maintain nutrient density. Contraindications: Pregnancy, lactation, active eating disorders, lean/frail elderly (sarcopenia risk). In diabetic patients on insulin/sulfonylureas: mandatory endocrinologist medication adjustment to prevent fatal hypoglycemia.", "references": ["New England Journal of Medicine Review: Effects of Intermittent Fasting on Health, Aging, and Disease", "ADA Standards of Care in Diabetes"]},
         "Check if patient is diabetic on insulin or sulfonylureas before recommending fasting. Adjust medication timing.",
         ["Hypoglycemia (blood sugar < 70 mg/dL with shakiness, sweating, confusion) while fasting", "Orthostatic fainting or severe electrolyte depletion"],
         ["Do NOT fast if you take insulin or sulfonylureas without medical supervision (causes fatal hypoglycemia)", "Do NOT binge on ultra-processed junk food during the eating window"],
         "New England Journal of Medicine (NEJM) & American Diabetes Association", "draft", None)
    ]

    out_ls = []
    for lid, topic, kw, p_ans, doc_a, staff_m, red_f, avoid_l, src, rev_st, rev_by in ls:
        out_ls.append({
            "id": lid,
            "topic": f"Lifestyle: {topic}",
            "category": "lifestyle",
            "keywords": kw,
            "intent": "chronic_condition_guidance",
            "patient_answer": p_ans,
            "doctor_answer": doc_a,
            "staff_answer": staff_m,
            "red_flags": red_f,
            "follow_up_questions": ["What is your current daily routine and lifestyle habits?", "Do you have any existing chronic medical conditions?", "What specific lifestyle goals are you looking to achieve?"],
            "avoid": avoid_l,
            "source": src,
            "review_status": rev_st,
            "reviewed_by": rev_by
        })

    return out_ls
