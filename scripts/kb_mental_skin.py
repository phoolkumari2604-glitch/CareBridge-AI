"""
Mental Health (20 entries) and Skin, Eye, ENT & Dental (20 entries) module
"""
def get_mental_health():
    mh = [
        ("mh_anxiety_management_001", "Generalized Anxiety & Worry Management", ["anxiety", "feeling anxious", "worry all the time", "nervousness", "ghabrahat", "anxiety attacks", "restless mind"],
         [
             "Practice the '4-7-8 Breathing Technique' to activate your body's relaxation system: inhale quietly through your nose for 4 seconds, hold your breath for 7 seconds, and exhale completely through your mouth making a whoosh sound for 8 seconds. Repeat 4 times.",
             "Grounding with the 5-4-3-2-1 technique: notice 5 things you can see around you, 4 things you can physically feel, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.",
             "Limit caffeine and energy drinks: high caffeine spikes adrenaline and physical jitteriness, triggering anxiety episodes.",
             "Establish a designated 15-minute 'Worry Window' in the early evening: write down your worries and actionable steps, then close the notebook and move on.",
             "Engage in daily brisk physical activity (walking, running, yoga) which burns off excess stress hormones.",
             "If persistent anxiety interferes with your work, sleep, or relationships for over 6 months, a mental health professional can provide Cognitive Behavioral Therapy (CBT)."
         ],
         {"assessment": "Generalized Anxiety Disorder (GAD-7 criteria). Screen for comorbid depression, panic disorder, substance use, and organic medical mimics (hyperthyroidism, pheochromocytoma, arrhythmia).", "investigations": "GAD-7 screening scale, TSH, Serum Electrolytes, Fasting Glucose, 12-lead ECG if palpitations.", "management": "First-line Psychotherapy: Cognitive Behavioral Therapy (CBT: cognitive restructuring, exposure therapy). First-line Pharmacotherapy: SSRIs (Escitalopram 10-20 mg daily or Sertraline 50-100 mg daily) or SNRIs (Venlafaxine/Duloxetine). Avoid long-term Benzodiazepines due to dependence and tolerance.", "references": ["NICE Guideline CG113: Generalised anxiety disorder and panic disorder in adults", "APA Practice Guideline for the Treatment of Patients With Panic Disorder and GAD"]},
         "Priority: Triage Green unless severe panic with chest pain (rule out ACS). Offer quiet, calming space.",
         ["Chest pain, severe palpitations, and shortness of breath (must rule out Acute Coronary Syndrome first)", "Active suicidal ideation or self-harm thoughts"],
         ["Do NOT consume excessive caffeine or energy drinks", "Do NOT use alcohol to self-medicate anxiety (triggers severe rebound anxiety)"],
         "National Institute for Health and Care Excellence (NICE) CG113 & APA Guidelines", "draft", None),

        ("mh_panic_attack_grounding_002", "Panic Attack First Aid & Immediate Calming", ["panic attack", "sudden panic", "heart racing panic", "feeling like dying panic", "panic attack help", "hyperventilating panic"],
         [
             "REMIND YOURSELF: 'This is a panic attack. It is terrifying, but it is NOT dangerous. My body is in a false alarm fight-or-flight mode. It will peak and pass within 10 to 15 minutes.'",
             "Box Breathing: Inhale slowly through your nose for 4 counts, hold for 4 counts, exhale through your mouth for 4 counts, and hold empty for 4 counts.",
             "Anchor yourself physically: plant both feet firmly flat on the floor, place one hand on your chest and one on your belly, and feel the solid ground beneath you.",
             "Splash cold water on your face or hold an ice cube in your palm: the sudden cold triggers the 'Mammalian Dive Reflex', which instantly slows down your racing heart rate.",
             "Do NOT breathe into a paper bag (can cause dangerous carbon dioxide buildup); focus on slow, long exhalations through pursed lips.",
             "Stay where you are until the surge subsides; running away reinforces fear to the brain."
         ],
         {"assessment": "Acute Panic Attack / Panic Disorder (discrete period of intense fear or discomfort peaking within minutes with >=4 symptoms: palpitations, sweating, trembling, dyspnea, choking sensation, chest pain, nausea, dizziness, derealization/depersonalization, fear of losing control or dying).", "investigations": "Rule out acute medical emergencies: 12-lead ECG (arrhythmia/ACS), pulse oximetry, capillary glucose.", "management": "Acute abortive: Compassionate reassurance, guided breathing retraining. Short-term low-dose Benzodiazepine (Lorazepam 0.5-1 mg sublingual) only for acute severe incapacitation. Long-term: CBT focused on interoceptive exposure + SSRIs (Sertraline, Paroxetine, Escitalopram).", "references": ["APA Practice Guideline for Panic Disorder", "NICE Guideline CG113"]},
         "Priority: Triage Yellow. Check vitals and 12-lead ECG to rule out cardiac event. Guide patient through slow breathing.",
         ["First-time panic presentation with chest pain and breathlessness (must rule out acute myocardial infarction and pulmonary embolism)", "Loss of consciousness"],
         ["Do NOT breathe into a paper bag (causes hypoxia and respiratory acidosis)", "Do NOT tell the person 'it is all in your head' (the physical sensations are genuine)"],
         "American Psychiatric Association (APA) & NICE Guideline CG113", "draft", None),

        ("mh_depression_support_003", "Depression Support & Coping Guidance", ["depression", "feeling depressed", "hopelessness", "udasi", "lack of interest", "feeling empty", "loss of motivation"],
         [
             "Depression is a genuine medical condition involving brain neurochemistry, not a personal flaw, laziness, or lack of willpower.",
             "Take one tiny step at a time ('Micro-Goals'): when getting out of bed feels impossible, focus only on sitting up, drinking a glass of water, or washing your face. Small wins build momentum.",
             "Behavioral Activation: Do NOT wait to feel motivated before doing things; motivation follows action. Engage in a brief 10-minute walk in natural morning sunlight, even when you do not feel like it.",
             "Maintain human connection: reach out to one trusted friend, family member, or counselor, even with a short text message; isolation deepens depression.",
             "Establish a consistent routine: wake up, eat meals, and go to bed at fixed hours every day.",
             "Reach out to a psychiatrist or clinical psychologist: evidence-based psychotherapy and modern medications can help you feel like yourself again."
         ],
         {"assessment": "Major Depressive Disorder (DSM-5 MDD: >=5 of 9 symptoms for >=2 weeks with functional impairment, including depressed mood or anhedonia). Stratify severity: Mild, Moderate, Severe with or without psychotic features.", "investigations": "PHQ-9 screening score. Workup for organic mimics: TSH, Vitamin B12, 25-OH Vitamin D, CBC, Serum Electrolytes.", "management": "Mild MDD: Psychotherapy (CBT, Behavioral Activation, Interpersonal Therapy) first-line. Moderate-to-Severe MDD: Combined Psychotherapy + Pharmacotherapy (First-line SSRI: Sertraline, Escitalopram, Fluoxetine; or SNRI: Venlafaxine, Duloxetine). Full therapeutic trial requires 4-8 weeks at therapeutic dosage.", "references": ["APA Practice Guideline for the Treatment of Patients With Major Depressive Disorder", "NICE Guideline NG222: Depression in adults: treatment and management"]},
         "Administer PHQ-9. Screen specifically for suicidal ideation (PHQ-9 item 9). Connect with support.",
         ["Expressed desire to end life, plans, or access to lethal means (Immediate Crisis Response / Tele-MANAS 14416)", "Severe self-neglect, refusing fluids/food, or psychotic delusions"],
         ["Do NOT tell a depressed person to 'just cheer up' or 'be positive'", "Do NOT stop prescribed antidepressants abruptly (triggers severe discontinuation syndrome)"],
         "American Psychiatric Association (APA) & NICE Guideline NG222", "draft", None),

        ("mh_suicide_crisis_protocol_004", "Crisis Response for Suicidal Thoughts & Self-Harm", ["suicide", "want to die", "kill myself", "end my life", "suicidal thoughts", "self harm", "atmaghat", "khudkushi", "no reason to live"],
         [
             "If you are feeling overwhelmed, in deep pain, or thinking of ending your life, PLEASE PAUSE. YOU ARE NOT ALONE, and help is available right now.",
             "IMMEDIATE CRISIS HELPLINES (Free, Confidential, 24/7 in India):",
             "  - Tele-MANAS (Government of India National Mental Health Helpline): Dial 14416 or 1800-891-4416.",
             "  - Kiran Mental Health Helpline: 1800-599-0019.",
             "  - National Emergency Services: Dial 112.",
             "Reach out immediately to a trusted family member, close friend, or doctor, and tell them honestly how you are feeling right now.",
             "Please do not stay alone in this moment; go to the nearest hospital emergency room where compassionate doctors and counselors are waiting to keep you safe.",
             "Pain and despair can feel permanent, but crisis moments pass, and things can get better with the right support."
         ],
         {"assessment": "Acute Suicidal Crisis / Imminent Self-Harm Risk. High emergency priority. Immediate evaluation of intent, plan, lethality, and access to means.", "investigations": "Urgent risk assessment. Toxicology screen if ingestion suspected. Rule out severe psychiatric decompensation or acute substance intoxication.", "management": "Ensure continuous 1:1 supervision in a secure, ligature-resistant environment. Remove all sharp objects, ropes, and medications. Establish empathetic therapeutic contact. Inpatient psychiatric admission for stabilization. Crisis safety planning. Pharmacotherapy: low-dose atypical antipsychotic or benzodiazepine for severe agitation.", "references": ["WHO Suicide Prevention Protocol", "APA Practice Guideline for the Assessment and Treatment of Patients With Suicidal Behaviors"]},
         "Priority: Triage Red (Immediate Safety). Do NOT leave patient unattended under any circumstance. Assign 1:1 staff. Escort to safe room and notify psychiatrist immediately.",
         ["Explicit expressed plan and intent to end life", "Current possession of or access to lethal means (pills, weapons, heights)", "Recent severe self-harm or overdose attempt", "Severe agitation, despair, and hopelessness"],
         ["NEVER leave the person alone", "NEVER promise to keep suicide plans a secret", "Do NOT dismiss or minimize suicidal statements"],
         "Tele-MANAS (MoHFW India) & World Health Organization (WHO)", "approved", "Dr. P. Deshmukh (MD Psychiatry)"),

        ("mh_sleep_problems_insomnia_005", "Sleep Hygiene & Non-Pharmacological Insomnia Care", ["sleep problems", "cannot sleep", "insomnia help", "neend ki samasya", "sleep hygiene tips", "tossing and turning bed"],
         [
             "Reserve your bed exclusively for sleep and intimacy; do not work on laptops, study, or watch television in bed (this trains your brain to associate bed with wakefulness).",
             "Keep a fixed sleep schedule: wake up and go to sleep at the exact same time every day, including on weekends.",
             "The 20-Minute Rule: If you cannot fall asleep after approximately 20 minutes, get out of bed, go to a dimly lit room, read a physical book or listen to calming music, and return to bed ONLY when genuinely sleepy.",
             "Turn off all screens (smartphones, tablets, TV) at least 60 minutes before bedtime; blue screen light suppresses melatonin release.",
             "Keep your bedroom cool, dark, and quiet; use blackout curtains or an eye mask if needed.",
             "Avoid caffeine, heavy dinners, and alcohol within 4 to 6 hours of bedtime (alcohol disrupts deep REM sleep and causes midnight waking)."
         ],
         {"assessment": "Chronic Insomnia Disorder (DSM-5 / ICSD-3: Difficulty initiating or maintaining sleep >=3 nights/week for >=3 months with daytime impairment).", "investigations": "Two-week sleep diary. Screen for Obstructive Sleep Apnea (STOP-BANG score), Restless Legs Syndrome, and Depression.", "management": "First-line Treatment of Choice: Cognitive Behavioral Therapy for Insomnia (CBT-I: stimulus control, sleep restriction, cognitive restructuring, sleep hygiene). CBT-I has superior long-term efficacy compared to hypnotics without adverse risks. Reserve short-term pharmacotherapy (Melatonin 2-3 mg or non-benzodiazepine hypnotics) strictly for acute distress (<2 weeks).", "references": ["AASM Clinical Practice Guideline for Chronic Insomnia in Adults", "ACP Clinical Guideline on Management of Chronic Insomnia"]},
         "Review 24h caffeine intake, screen usage in bed, and sleep diary. Screen for sleep apnea.",
         ["Severe daytime sleepiness leading to falling asleep while driving or operating machinery", "Loud choking/gasping in sleep (Sleep Apnea)"],
         ["Do NOT stay in bed tossing and turning for hours (creates conditioned arousal)", "Do NOT use alcohol as a nightcap sleep aid"],
         "American Academy of Sleep Medicine (AASM) & American College of Physicians", "draft", None),

        ("mh_stress_burnout_coping_006", "Workplace Stress, Burnout & Resilience", ["stress", "burnout", "work stress", "mental exhaustion", "overwhelmed", "tanav", "chronic stress"],
         [
             "Burnout is a state of chronic physical, emotional, and mental exhaustion caused by prolonged, unmanaged workplace or caregiving stress.",
             "Key signs: Feeling chronically depleted of energy, mental detachment or cynicism toward your job, and reduced professional effectiveness.",
             "Set firm boundaries: establish clear work-life cutoff hours (turn off work emails and notifications after work hours) and take your allotted annual leaves.",
             "Practice the 'Micro-Break' routine: take a 3 to 5 minute break every 90 minutes to stretch, drink water, look away from screens, and breathe deeply.",
             "Prioritize non-negotiable recovery activities: regular exercise, hobbies, family meals, and uninterrupted sleep.",
             "Learn to say 'no' to non-essential commitments; taking on too much without boundaries accelerates burnout.",
             "Talk to a counselor or mental health therapist to develop cognitive stress management tools."
         ],
         {"assessment": "Occupational Burnout (ICD-11 QD85: Syndrome conceptualized as resulting from chronic workplace stress that has not been successfully managed). Screen for secondary clinical depression or anxiety.", "investigations": "Maslach Burnout Inventory (MBI) or Copenhagen Burnout Inventory. Screen for comorbid MDD with PHQ-9.", "management": "Individual and organizational interventions: Cognitive behavioral stress inoculation, boundary-setting training, mindfulness-based stress reduction (MBSR), workload restructuring. Psychotherapeutic support.", "references": ["WHO ICD-11 Classification of Burnout", "American Psychological Association (APA) Stress in America Report"]},
         "Assess for physical symptoms of chronic stress (headaches, dyspepsia, hypertension). Inquire about work hours.",
         ["Burnout progressing to severe Major Depressive Disorder with suicidal ideation", "Substance abuse (alcohol/prescription sedatives) to cope with stress"],
         ["Do NOT ignore chronic physical exhaustion and emotional numbness", "Do NOT sacrifice sleep to work longer hours"],
         "World Health Organization (WHO) & American Psychological Association (APA)", "draft", None),

        ("mh_grief_bereavement_007", "Grief, Loss & Bereavement Support", ["grief", "bereavement", "loss of loved one", "mourning", "shok", "crying over death", "grief support"],
         [
             "Grief is a natural, deeply personal response to losing someone you love; there is no 'right' way to grieve and no fixed timeline.",
             "Grief often comes in waves: intense pangs of sadness, anger, disbelief, guilt, numbness, or yearning can arise unexpectedly months after the loss.",
             "Allow yourself to feel your emotions without judgment; crying and talking about the person who passed away is a vital part of emotional healing.",
             "Take care of physical basics: ensure you eat regular meals, drink water, take prescribed medications, and get some rest even when sleep is fragmented.",
             "Do not isolate yourself: spend time with supportive friends or family who listen without offering unsolicited advice or clichés.",
             "Prolonged Grief Disorder: If intense, incapacitating grief, inability to function, or feeling that life is meaningless continues beyond 12 months, specialized grief counseling can provide gentle healing support."
         ],
         {"assessment": "Normal Bereavement vs Prolonged Grief Disorder (DSM-5-TR / ICD-11: Intense yearning/preoccupation with deceased persisting > 12 months [>6 months in children], accompanied by functional impairment).", "investigations": "Inventory of Complicated Grief (ICG). Screen for secondary Major Depression and suicide risk.", "management": "Normal grief: Empathetic presence, bereavement support groups, psychoeducation. Prolonged Grief Disorder: Prolonged Grief Therapy (PGT / Complicated Grief Therapy: specialized 16-session manualized protocol). Antidepressant pharmacotherapy indicated if comorbid MDD diagnosed.", "references": ["APA Diagnostic and Statistical Manual of Mental Disorders (DSM-5-TR)", "WHO ICD-11 Prolonged Grief Disorder Guidance"]},
         "Provide compassionate, unhurried space. Screen for severe self-neglect or active suicidal thoughts.",
         ["Active suicidal ideation (desire to die to join the deceased)", "Severe inability to care for oneself or dependent children"],
         ["Do NOT rush someone through their grief with phrases like 'you need to move on'", "Do NOT make major life-altering decisions (selling house, moving) during the acute grief period"],
         "American Psychiatric Association (APA) & Center for Prolonged Grief", "draft", None),

        ("mh_substance_addiction_support_008", "Alcohol & Substance Use Support (De-addiction Basics)", ["substance abuse", "alcohol addiction", "drug problem", "deaddiction", "sharab chhudana", "alcohol withdrawal", "nashe ki aadat"],
         [
             "Substance use disorder (addiction) is a treatable chronic medical brain disease, NOT a moral failure or lack of character.",
             "Overcoming addiction requires a structured medical approach combining medically supervised detox, counseling, and long-term relapse prevention.",
             "DANGER OF SUDDEN ALCOHOL STOPPING (Cold Turkey): If you drink heavily daily, abruptly stopping alcohol completely on your own can trigger life-threatening alcohol withdrawal (Delirium Tremens: severe shaking, hallucinations, high fever, and fatal seizures).",
             "Medical detox must be supervised by a doctor: safe medications (like Chlordiazepoxide or Diazepam) prevent dangerous withdrawal seizures.",
             "SUPPORT HELPLINES (Free & Confidential in India):",
             "  - National Toll-Free Drug De-Addiction Helpline (KIRAN): 1800-11-0031.",
             "  - Tele-MANAS Mental Health Helpline: 14416.",
             "Join local peer support groups like Alcoholics Anonymous (AA) or Narcotics Anonymous (NA); sharing recovery with peers who understand is one of the most powerful tools for lifelong sobriety."
         ],
         {"assessment": "Substance Use Disorder (DSM-5 criteria: Mild, Moderate, Severe). Stratify alcohol withdrawal risk using CIWA-Ar scale (Clinical Institute Withdrawal Assessment for Alcohol).", "investigations": "CIWA-Ar score, LFTs (AST/ALT ratio > 2, GGT), CBC (MCV), PT/INR, Electrolytes, Blood Alcohol Level, Urine drug screen.", "management": "Acute Alcohol Withdrawal: Medically supervised detox with Benzodiazepines (Diazepam or Chlordiazepoxide symptom-triggered protocol). IV Thiamine (100-500 mg) BEFORE any IV glucose to prevent Wernicke-Korsakoff Encephalopathy. Relapse Prevention Pharmacotherapy: Disulfiram, Acamprosate, or Naltrexone. Motivational Interviewing (MI), CBT, and 12-Step facilitation.", "references": ["WHO Guidelines for the Psychosocially Assisted Pharmacological Treatment of Opioid and Alcohol Dependence", "ASAM Clinical Practice Guideline on Alcohol Withdrawal Management"]},
         "Priority: Triage Orange/Red if active alcohol withdrawal tremors, tachycardia, or hallucinations. Administer Thiamine before glucose.",
         ["Severe alcohol withdrawal: coarse hand tremors, auditory/visual hallucinations, fever, or seizures (Delirium Tremens - Medical Emergency)", "Opioid overdose: pinpoint pupils, unconsciousness, and respiratory depression (STAT IV Naloxone)"],
         ["NEVER abruptly stop heavy daily alcohol without medical supervision (severe withdrawal can be fatal)", "NEVER give glucose fluids to an alcoholic without administering Thiamine first (precipitates Wernicke's encephalopathy)"],
         "World Health Organization (WHO) & American Society of Addiction Medicine (ASAM)", "draft", None),

        ("mh_ocd_intrusive_thoughts_009", "Obsessive-Compulsive Disorder (OCD) & Intrusive Thoughts", ["ocd", "intrusive thoughts", "obsessive compulsive", "repeated checking", "washing hands repeatedly", "bar bar hath dhona"],
         [
             "OCD involves two components: Obsessions (distressing, unwanted intrusive thoughts, images, or urges that pop into the head) and Compulsions (repetitive behaviors or mental rituals done to reduce the anxiety caused by the obsession).",
             "Common patterns: excessive handwashing or cleaning fear of contamination, repeatedly checking locks/stoves, counting or tapping rituals, symmetry/arranging, and terrifying intrusive thoughts of causing accidental harm.",
             "Key insight: Compulsions only provide brief, temporary relief; performing the ritual actually feeds the obsession and makes it stronger over time.",
             "First-line gold standard therapy is Exposure and Response Prevention (ERP): a specialized form of therapy where you gradually face the anxiety trigger without performing the compulsive ritual.",
             "Consult a psychiatrist: High-dose SSRI medications combined with ERP therapy can significantly decrease the intensity and frequency of intrusive thoughts."
         ],
         {"assessment": "Obsessive-Compulsive Disorder (DSM-5 criteria). Quantify severity using Yale-Brown Obsessive Compulsive Scale (Y-BOCS: 0-7 subclinical, 8-15 mild, 16-23 moderate, 24-31 severe, 32-40 extreme).", "investigations": "Y-BOCS assessment scale. Screen for comorbid depression, tic disorders, and body dysmorphic disorder.", "management": "First-line Psychological: Exposure and Response Prevention (ERP) behavioral therapy. First-line Pharmacological: High-dose SSRIs (Fluoxetine 40-80 mg, Sertraline 150-200 mg, Fluvoxamine 150-300 mg daily) requiring longer trials (10-12 weeks for clinical response). Second-line: Clomipramine or augmentation with atypical antipsychotics (Aripiprazole / Risperidone).", "references": ["APA Practice Guideline for the Treatment of Patients With Obsessive-Compulsive Disorder", "NICE Guideline CG31: Obsessive-compulsive disorder and body dysmorphic disorder"]},
         "Administer Y-BOCS. Inquire about time consumed by compulsions daily (>1 hour indicates functional impairment).",
         ["Severe OCD with raw bleeding skin from continuous handwashing", "Severe comorbid depression with active suicidal thoughts"],
         ["Do NOT participate in or endlessly reassure a loved one's compulsive rituals (reassurance feeds the OCD cycle)", "Do NOT stop ERP homework exercises"],
         "American Psychiatric Association (APA) & NICE Guideline CG31", "draft", None),

        ("mh_ptsd_trauma_care_010", "Post-Traumatic Stress Disorder (PTSD) & Trauma Recovery", ["ptsd", "trauma", "flashbacks", "post traumatic stress", "bad memories accident", "trauma triggers"],
         [
             "PTSD can develop after experiencing or witnessing a terrifying, life-threatening event (serious road accident, violent assault, natural disaster, abuse, or war combat).",
             "Key symptoms:",
             "  - Re-experiencing: Intrusive memories, recurrent nightmares, or sudden vivid flashbacks where you feel the event is happening all over again.",
             "  - Avoidance: Staying away from places, people, conversations, or thoughts that trigger memories of the trauma.",
             "  - Hyperarousal: Feeling constantly on edge, exaggerated startle reaction (jumping at loud noises), irritability, and hypervigilance.",
             "  - Negative changes in thoughts: Feeling detached from loved ones, memory gaps regarding the trauma, or intense guilt and shame.",
             "Trauma recovery is possible: Trauma-focused Cognitive Behavioral Therapy (TF-CBT) and Eye Movement Desensitization and Reprocessing (EMDR) help your brain safely reprocess and store the traumatic memory so it no longer triggers physical panic."
         ],
         {"assessment": "Post-Traumatic Stress Disorder (DSM-5 criteria: Exposure to actual or threatened death, serious injury, or sexual violence, with intrusion, avoidance, negative alterations in cognition/mood, and hyperarousal persisting > 1 month).", "investigations": "PCL-5 (PTSD Checklist for DSM-5). Screen for comorbid depression, traumatic brain injury (TBI), and substance abuse.", "management": "First-line Evidence-Based Psychotherapy: Trauma-Focused CBT (TF-CBT), Prolonged Exposure (PE), or Eye Movement Desensitization and Reprocessing (EMDR). First-line Pharmacotherapy: SSRIs (Sertraline, Paroxetine) or SNRI (Venlafaxine). Prazosin (alpha-1 blocker 1-10 mg bedtime) for severe trauma-related nightmares. Avoid Benzodiazepines (worsens PTSD recovery).", "references": ["VA/DoD Clinical Practice Guideline for the Management of Posttraumatic Stress Disorder", "APA Practice Guideline for the Treatment of PTSD"]},
         "Administer PCL-5 checklist. Provide calm, trauma-informed care. Screen for nightmares.",
         ["Acute trauma flashbacks with extreme dissociative state or self-harm", "Severe active suicidal ideation in PTSD patients"],
         ["Do NOT use Benzodiazepines (Alprazolam, Clonazepam) for PTSD (blocks therapeutic extinction and worsens trauma outcomes)", "Do NOT force someone to recount traumatic details before they feel emotionally safe"],
         "Veterans Affairs / Department of Defense (VA/DoD) & APA Guidelines", "draft", None),

        ("mh_adhd_adult_child_011", "ADHD Symptoms & Executive Function Support", ["adhd", "attention deficit", "cannot focus", "hyperactivity child", "adult adhd", "distracted mind"],
         [
             "Attention-Deficit/Hyperactivity Disorder (ADHD) is a neurodevelopmental condition involving differences in brain dopamine and executive function circuits.",
             "Core presentations:",
             "  - Inattentive: Difficulty sustaining attention, making careless mistakes, losing daily items (keys, wallet, phone), disorganization, and constant daydreaming.",
             "  - Hyperactive-Impulsive: Inability to sit still, constant fidgeting, restlessness, interrupting conversations, and impulsive decision-making.",
             "Practical executive function strategies:",
             "  - Externalize your memory: Use digital phone reminders, alarms, visual sticky notes, and a single master to-do list.",
             "  - The 'Body Doubling' technique: Working on boring or difficult tasks in the physical or virtual presence of another focused person.",
             "  - Break large tasks into tiny 15-minute chunks with a visible timer (Pomodoro technique).",
             "Comprehensive clinical evaluation by a psychiatrist or psychologist can determine if ADHD coaching and medical treatments (stimulants or non-stimulants) are appropriate."
         ],
         {"assessment": "Attention-Deficit/Hyperactivity Disorder (DSM-5: >=6 symptoms of inattention and/or hyperactivity-impulsivity in children, >=5 in adults, present across >=2 settings, onset before age 12). Subtypes: Combined, Predominantly Inattentive, Predominantly Hyperactive-Impulsive.", "investigations": "Standardized rating scales (Vanderbilt Assessment Scales for children; ASRS-v1.1 for adults) completed by patient, parents, and teachers. Rule out sensory deficits (audiometry, vision).", "management": "Children <6y: Parent Training in Behavior Management (PTBM) first-line. Children >=6y and Adults: Multimodal therapy combining Behavioral therapy/Coaching + Pharmacotherapy (First-line stimulants: Methylphenidate; Non-stimulants: Atomoxetine, Clonidine, Guanfacine).", "references": ["AAP Clinical Practice Guideline for the Diagnosis, Evaluation, and Treatment of ADHD", "NICE Guideline NG87: Attention deficit hyperactivity disorder"]},
         "Collect rating scales from both home and school/work settings. Screen for comorbid learning disabilities or anxiety.",
         ["Severe impulsive behaviors causing severe physical injury or reckless driving", "Marked emotional dysregulation with aggressive outbursts"],
         ["Do NOT dismiss ADHD as 'bad parenting' or 'laziness'", "Do NOT start stimulant medications without baseline cardiovascular screening (BP, pulse, family history of sudden cardiac death)"],
         "American Academy of Pediatrics (AAP) & NICE Guideline NG87", "draft", None),

        ("mh_bipolar_mood_swings_012", "Bipolar Disorder & Managing Extreme Mood Swings", ["bipolar", "mood swings extreme", "mania", "bipolar depression", "bipolar mood disorder"],
         [
             "Bipolar disorder involves dramatic, distinct shifts in mood, energy, and activity levels, alternating between manic (or hypomanic) highs and depressive lows.",
             "Manic Episode features: Abnormally elevated, euphoric, or irritable mood, grand plans, racing thoughts, talking very rapidly, needing very little sleep (feeling energized after 2 hours), and impulsive risky behaviors (excessive spending, reckless driving).",
             "Depressive Episode features: Extreme sadness, total lack of energy, inability to enjoy anything, and feelings of worthlessness.",
             "Key routine for stability: Maintain strict social rhythm stability: wake up, eat meals, and go to bed at the exact same hours every single day; disrupted sleep cycles are a major trigger for manic relapses.",
             "Never stop mood-stabilizing medications (such as Lithium, Valproate, or Quetiapine) without consulting your psychiatrist; stopping pills during a stable period frequently precipitates severe manic episodes."
         ],
         {"assessment": "Bipolar I Disorder (at least one manic episode) vs Bipolar II Disorder (hypomanic episode and major depressive episode, no full mania) vs Cyclothymic Disorder.", "investigations": "Mood charting. Rule out secondary medical mania: TSH, toxicology screen, brain MRI. Baseline Renal function, electrolytes, and thyroid panel (prior to Lithium); LFTs and platelets (prior to Valproate).", "management": "Acute Mania: Mood stabilizer (Lithium, Divalproex Sodium) + Second-generation atypical antipsychotic (Quetiapine, Olanzapine, Aripiprazole). Bipolar Depression: Quetiapine, Lurasidone, or Olanzapine-Fluoxetine combination (avoid antidepressant monotherapy due to risk of manic switch). Maintenance: Lifelong mood stabilizer therapy + Interpersonal and Social Rhythm Therapy (IPSRT).", "references": ["CANMAT/ISBD Guidelines for the Management of Patients with Bipolar Disorder", "APA Practice Guideline for the Treatment of Patients With Bipolar Disorder"]},
         "Priority: Triage Orange/Red for acute mania with psychosis or high-risk reckless behavior. Check medication adherence.",
         ["Acute mania with psychotic delusions, extreme agitation, or severe financial/physical risk-taking", "Severe depressive phase with high suicide risk"],
         ["NEVER treat bipolar depression with antidepressant pills alone without a mood stabilizer (triggers rapid manic switch)", "Do NOT stop mood stabilizers when feeling well"],
         "CANMAT & International Society for Bipolar Disorders (ISBD) Guidelines", "draft", None),

        ("mh_eating_disorders_basics_013", "Eating Disorders (Anorexia, Bulimia & Binge Eating)", ["eating disorder", "anorexia", "bulimia", "binge eating", "vomiting after eating", "fear of gaining weight"],
         [
             "Eating disorders are complex, serious mental illnesses characterized by severe disturbances in eating behaviors and distressing thoughts and emotions related to food, weight, and body shape.",
             "Anorexia Nervosa: Severe restriction of food intake, intense fear of gaining weight, and distorted body image leading to dangerous, life-threatening low body weight.",
             "Bulimia Nervosa: Recurrent episodes of eating large amounts of food (bingeing) followed by compensatory behaviors (purging through self-induced vomiting, laxative abuse, or extreme exercise).",
             "Binge Eating Disorder: Frequent episodes of eating uncontrollably in a short time to the point of painful fullness, accompanied by deep shame and distress, without purging.",
             "Physical dangers include heart rhythm collapse, electrolyte imbalances, stomach tears, severe bone loss, and kidney failure.",
             "Recovery requires a compassionate multidisciplinary team: medical stabilization, psychological therapy, and specialized nutritional rehabilitation."
         ],
         {"assessment": "Eating Disorders (DSM-5: Anorexia Nervosa, Bulimia Nervosa, Binge Eating Disorder, ARFID). High mortality among all psychiatric conditions.", "investigations": "Comprehensive metabolic panel, Serum Electrolytes (hypokalemia, hypochloremic metabolic alkalosis from vomiting), 12-lead ECG (QT prolongation, bradycardia, arrhythmias), CBC, Phosphorus (screen for refeeding syndrome), DEXA scan.", "management": "Medical stabilization criteria: HR < 40 bpm, BP < 90/60, QTc > 460 ms, K+ < 3.0 mEq/L, BMI < 13-14 kg/m2 (requires inpatient admission). Nutritional rehabilitation: gradual caloric refeeding with close phosphate monitoring (prevent Refeeding Syndrome). Psychotherapy: Family-Based Treatment (FBT / Maudsley) for adolescents; Enhanced CBT (CBT-E) for adults. Fluoxetine for Bulimia; Lisdexamfetamine for Binge Eating.", "references": ["APA Practice Guideline for the Treatment of Patients With Eating Disorders (2023)", "NICE Guideline NG69: Eating disorders: recognition and treatment"]},
         "Check orthostatic vitals, core temperature, and 12-lead ECG. Inspect knuckles for Russell's sign (abrasions from self-induced vomiting).",
         ["Heart rate < 40 bpm, SBP < 80 mmHg, or temperature < 35.5°C", "Serum Potassium < 2.5 mEq/L (Cardiac Arrest Risk)", "Severe acute hematemesis (Mallory-Weiss esophageal tear)"],
         ["Do NOT rapidly refeed a severely malnourished individual without monitoring serum phosphate (fatal Refeeding Syndrome risk)", "Do NOT comment negatively on body weight or appearance"],
         "American Psychiatric Association (APA) & NICE Guideline NG69", "draft", None),

        ("mh_social_anxiety_shyness_014", "Social Anxiety Disorder vs Shyness", ["social anxiety", "fear of talking in public", "social phobia", "shy anxiety", "fear of embarrassment"],
         [
             "Shyness is a normal personality trait where someone feels slightly hesitant or quiet in new social situations, but it does not prevent them from living their life.",
             "Social Anxiety Disorder is an intense, persistent, irrational fear of being watched, judged, scrutinized, or humiliated by others in everyday social or performance situations.",
             "Physical symptoms: Blushing, profuse sweating, trembling hands or voice, racing heart, and nausea whenever required to speak, eat, or interact in front of others.",
             "Avoidance trap: Avoiding social situations provides temporary relief, but it reinforces to your brain that social situations are dangerous, shrinking your world.",
             "Graduated Exposure: Make a hierarchy list of social situations from easiest to hardest (e.g. saying 'hello' to a shopkeeper, then asking for directions, then speaking in a meeting); practice facing them step by step.",
             "Cognitive Behavioral Therapy (CBT) and public speaking exposure groups are highly effective in building confident social comfort."
         ],
         {"assessment": "Social Anxiety Disorder (Social Phobia, DSM-5: Marked fear or anxiety about one or more social situations in which the individual is exposed to possible scrutiny by others, lasting >= 6 months).", "investigations": "Liebowitz Social Anxiety Scale (LSAS). Screen for comorbid depression and alcohol use disorder (common self-medication).", "management": "First-line Psychological: Individual Cognitive Behavioral Therapy (CBT: Clark & Wells or Heimberg models focusing on video feedback, attention training, and in-vivo behavioral experiments). First-line Pharmacotherapy: SSRIs (Sertraline, Paroxetine, Escitalopram) or SNRIs (Venlafaxine). Beta-blockers (Propranolol 10-40 mg 1h prior) for performance-only social anxiety (e.g. public speaking).", "references": ["NICE Guideline CG159: Social anxiety disorder: recognition, assessment and treatment", "APA Practice Guidelines for Social Anxiety"]},
         "Administer Liebowitz Social Anxiety Scale (LSAS). Inquire about alcohol use to cope socially.",
         ["Severe social isolation leading to total home confinement (Agoraphobia)", "Secondary Major Depression with suicidal thoughts"],
         ["Do NOT use alcohol to calm nerves before social events (rapidly leads to alcohol dependency)", "Do NOT avoid social encounters entirely"],
         "NICE Clinical Guideline CG159 & American Psychiatric Association", "draft", None),

        ("mh_mindfulness_meditation_stress_015", "Mindfulness, Meditation & Relaxation Techniques", ["mindfulness", "meditation stress", "deep breathing relaxation", "dhyan lagana", "stress relief exercises"],
         [
             "Mindfulness is the practice of paying attention to the present moment on purpose, without judgment, rather than getting lost in regrets about the past or worries about the future.",
             "Progressive Muscle Relaxation (PMR): Systematically tense each muscle group in your body (feet, calves, thighs, abdomen, shoulders, face) tightly for 5 seconds, then consciously release and relax them for 15 seconds. Notice the sensation of physical tension melting away.",
             "Mindful Daily Habits: Practice being fully present during simple everyday tasks: feel the warm water and smell of soap while washing dishes, or notice the flavors, textures, and aromas of each bite during meals.",
             "Daily 10-minute meditation: Sit quietly, focus your attention on the physical sensation of your breath entering and leaving your nostrils. Whenever your mind wanders (which is completely normal), gently guide your attention back to your breath without frustration.",
             "Scientific benefits: Regular mindfulness practice physically shrinks the amygdala (the brain's fear center) and strengthens prefrontal cortex emotional control."
         ],
         {"assessment": "Mindfulness-Based Interventions (MBI: Mindfulness-Based Stress Reduction [MBSR] and Mindfulness-Based Cognitive Therapy [MBCT]).", "investigations": "Perceived Stress Scale (PSS).", "management": "Incorporate structured mindfulness training (8-week MBSR program), diaphragmatic breathing, and Progressive Muscle Relaxation (PMR) into comprehensive management for stress, mild-moderate anxiety, chronic pain, and prevention of depressive relapse (MBCT has efficacy equivalent to maintenance antidepressants).", "references": ["Kabat-Zinn Mindfulness-Based Interventions Evidence Review", "NICE Guideline on Depression: MBCT Recommendations"]},
         "Demonstrate diaphragmatic breathing and progressive muscle relaxation technique.",
         ["Patient experiencing acute psychosis, severe dissociative episode, or severe PTSD flashbacks during meditation (requires trauma-adapted grounding rather than open mindfulness)"],
         ["Do NOT expect your mind to become completely blank (the goal of meditation is noticing thoughts without judgment, not stopping thoughts)", "Do NOT give up after a few days"],
         "NICE Clinical Guidelines & Harvard Health Publishing on Mindfulness", "draft", None),

        ("mh_caregiver_stress_support_016", "Family Caregiver Burnout & Respite Support", ["caregiver burnout", "caring for sick parent stress", "caregiver exhaustion", "looking after dementia parent stress"],
         [
             "Caring for a chronically ill, bedridden, or dementia-affected loved one is an immense emotional and physical commitment that frequently leads to caregiver burnout.",
             "Signs of caregiver strain: Chronic exhaustion, feeling constantly irritable or resentful, sleep disturbances, withdrawing from friends, and feeling guilty whenever you take a break.",
             "Remember the Airplane Oxygen Mask Rule: You MUST put on your own oxygen mask first before assisting others. You cannot care for someone else if you completely burn out.",
             "Accept and ask for help: Create a specific list of tasks (picking up groceries, sitting with the patient for 2 hours, cooking a meal) that friends and relatives can take over.",
             "Utilize Respite Care: Explore day-care centers, home nursing attendants, or short-term respite facilities so you can take a scheduled weekend break to rest and recharge.",
             "Join a caregiver support group: Sharing practical tips and venting with other families facing the exact same challenges reduces isolation."
         ],
         {"assessment": "Caregiver Burden Assessment in Chronic Illness / Dementia. Quantify burden using Zarit Burden Interview (ZBI score > 21 indicates significant caregiver burden).", "investigations": "Zarit Burden Interview (ZBI), PHQ-9 and GAD-7 screening for caregiver.", "management": "Multicomponent caregiver interventions: Psychoeducation on disease trajectory, problem-solving skills training, stress management, formal respite care linkage, support group participation. Treat caregiver depression/anxiety.", "references": ["Alzheimer's Association Caregiver Stress and Burnout Guidelines", "WHO Global Action Plan on the Public Health Response to Dementia"]},
         "Administer Zarit Burden Interview to family caregivers. Provide respite care contacts.",
         ["Caregiver expressing severe depressive hopelessness, suicidal thoughts, or signs of elder abuse/neglect from exhaustion"],
         ["Do NOT feel guilty for taking personal time away from caregiving", "Do NOT attempt to handle 24/7 chronic care alone without assistance"],
         "Alzheimer's Association & World Health Organization (WHO)", "draft", None),

        ("mh_anger_management_017", "Anger Management & Emotional Regulation", ["anger management", "gussa control", "short tempered", "rage outbursts", "controlling temper"],
         [
             "Anger is a natural human emotion; however, uncontrollable outbursts, verbal rage, and physical aggression harm your heart health, relationships, and career.",
             "Recognize early physical warning signs: clenched fists, tight jaw, grinding teeth, rapid heartbeat, sweating, and feeling hot in your face.",
             "The 'Time-Out' Strategy: When you notice anger rising, say 'I need a 10-minute break before we continue this conversation', step away into another room, and let your adrenaline drop.",
             "The 10-Second Count: Before responding or typing a heated reply, take a slow deep breath and count slowly from 1 to 10 in your head.",
             "Use 'I' statements instead of 'You' statements: Say 'I feel overwhelmed when dishes are left in the sink' instead of 'You never do anything around here and you are lazy.'",
             "Cognitive reframing: Ask yourself: 'Will this matter 5 years from now? Is shouting going to solve this problem?'",
             "Consult a counselor for Cognitive Behavioral Anger Management if anger causes relationship breakdowns, workplace trouble, or physical aggression."
         ],
         {"assessment": "Intermittent Explosive Disorder (DSM-5 criteria) vs Emotional Dysregulation secondary to ADHD, Bipolar Disorder, Borderline Personality, or chronic stress.", "investigations": "Clinical psychiatric evaluation. Screen for substance abuse (alcohol disinhibition).", "management": "Cognitive Behavioral Therapy for Anger (identifying cognitive distortions, physiological arousal awareness, assertion training, relaxation). Pharmacotherapy (SSRIs like Fluoxetine or mood stabilizers) if severe impulsive aggression / Intermittent Explosive Disorder.", "references": ["APA Practice Guidelines on Anger Management", "NICE Guidelines on Antisocial Personality and Aggression"]},
         "Assess for domestic violence risk, impulsivity, and substance use.",
         ["Physical violence, domestic abuse, or weapon brandishing", "Severe rage accompanied by homicidal threats"],
         ["Do NOT punch walls or throw items to 'vent anger' (research shows physical venting actually reinforces aggressive neurological pathways)", "Do NOT engage in arguments while under the influence of alcohol"],
         "American Psychological Association (APA) & NICE Guidelines", "draft", None),

        ("mh_seasonal_affective_disorder_018", "Seasonal Affective Disorder (Winter Blues / SAD)", ["sad", "winter depression", "seasonal affective disorder", "winter blues", "feeling down in winter"],
         [
             "Seasonal Affective Disorder (SAD) is a type of depression that follows a seasonal pattern, typically beginning in late autumn or winter when daylight hours become short and fading in spring.",
             "Common signs: Low energy, persistent sadness, oversleeping and difficulty waking up in the morning, intense carbohydrate cravings (bread, sweets, pasta), and winter weight gain.",
             "Maximized daylight exposure: Open all window blinds during the day, sit near bright windows, and take a 30-minute outdoor walk in the morning sunlight.",
             "Light Therapy (Phototherapy): Sitting in front of a specialized 10,000-lux light box for 20 to 30 minutes every morning significantly resets circadian rhythms and relieves winter depression.",
             "Engage in regular aerobic exercise and keep connected with friends and family during winter months.",
             "Consult a doctor: Light therapy, counseling, and antidepressant medications can keep your mood and energy bright throughout winter."
         ],
         {"assessment": "Major Depressive Disorder with Seasonal Pattern (Seasonal Affective Disorder - SAD). Melatonin phase-shift and circadian misalignment secondary to reduced photoperiod.", "investigations": "PHQ-9 screening, TSH (rule out winter hypothyroidism), 25-OH Vitamin D.", "management": "First-line Treatment: Bright Light Therapy (10,000 lux broad-spectrum white light box for 30 minutes every morning upon waking). Second-line / Adjunctive: CBT for SAD (CBT-SAD) and SSRIs (Bupropion XL or Sertraline). Vitamin D3 supplementation.", "references": ["American Psychiatric Association Practice Guidelines for Depression", "CANMAT Guidelines on Seasonal Affective Disorder"]},
         "Review timing of light therapy (early morning). Verify 10,000-lux UV-filtered light box specifications.",
         ["Severe seasonal depression with suicidal thoughts", "Hypomanic switch triggered by bright light therapy in unsuspected bipolar disorder"],
         ["Do NOT use standard tanning beds for light therapy (dangerous UV radiation damages eyes and causes skin cancer)", "Do NOT use light boxes late in the evening (causes insomnia)"],
         "American Psychiatric Association (APA) & CANMAT Guidelines", "draft", None),

        ("mh_body_dysmorphia_self_esteem_019", "Body Dysmorphic Disorder (BDD) & Self-Esteem", ["body dysmorphic disorder", "bdd", "obsessed with appearance", "ugly complex", "mirror checking obsession"],
         [
             "Body Dysmorphic Disorder (BDD) is a mental health condition where a person spends hours every day worrying about flaws in their appearance that are either unnoticeable or appear very minor to others.",
             "Common obsessions: Skin blemishes, nose shape, hair thinning, facial symmetry, or body build.",
             "Repetitive compulsive behaviors: Constantly checking mirrors (or completely avoiding mirrors), excessive grooming, picking at skin, seeking constant reassurance, or comparing appearance to others on social media.",
             "Important insight: Undergoing repeated cosmetic surgeries or dermatological procedures does NOT cure BDD; the brain quickly transfers the obsession to another body part.",
             "Reduce social media triggers: unfollow beauty accounts that trigger self-comparison and limit daily screen time.",
             "Specialized treatment: Cognitive Behavioral Therapy (CBT) focused on perception restructuring and ERP is highly effective in freeing your mind from appearance obsessions."
         ],
         {"assessment": "Body Dysmorphic Disorder (DSM-5: Preoccupation with one or more perceived defects or flaws in physical appearance that are not observable or appear slight to others, causing clinically significant distress/impairment). Differentiate from eating disorders.", "investigations": "BDD Questionnaire (BDDQ) or Yale-Brown Obsessive Compulsive Scale Modified for BDD (BDD-YBOCS).", "management": "First-line Psychological: Cognitive Behavioral Therapy tailored for BDD (perceptual retraining, mirror retraining, ERP). First-line Pharmacological: High-dose SSRIs (Fluoxetine, Sertraline, Escitalopram). Avoid referring for cosmetic surgery or aesthetic procedures (ineffective and associated with post-procedure dissatisfaction and litigation).", "references": ["NICE Guideline CG31: Body Dysmorphic Disorder", "APA Practice Guidelines for OCD and BDD"]},
         "Administer BDDQ screening. Warn against repeated aesthetic/cosmetic procedures.",
         ["Extremely high suicide risk associated with BDD (suicide ideation rate ~80%)", "Severe skin picking causing open infected ulcerations"],
         ["Do NOT pursue cosmetic surgery for perceived flaws driven by BDD (it does not resolve the underlying brain obsession)", "Do NOT spend hours comparing yourself to edited photos on social media"],
         "NICE Clinical Guideline CG31 & American Psychiatric Association", "draft", None),

        ("mh_tele_manas_mental_health_resources_020", "National Mental Health Resources & Tele-MANAS (India)", ["tele manas", "kiran helpline", "mental health helpline india", "free counseling india", "psychologist helpline"],
         [
             "Accessing professional mental health support in India is completely free, confidential, and available 24/7 across multiple regional languages.",
             "KEY NATIONAL HELPLINES:",
             "  - Tele-MANAS (Tele Mental Health Assistance and Networking Across States - MoHFW, Govt of India): Dial 14416 or 1800-891-4416 (Available in English, Hindi, and 20+ regional Indian languages).",
             "  - KIRAN Mental Health Helpline (Ministry of Social Justice and Empowerment): Dial 1800-599-0019.",
             "  - Vandrevala Foundation Helpline: +91 9999 666 555.",
             "  - Childline (for children and adolescents): Dial 1098.",
             "What happens when you call Tele-MANAS:",
             "  - Your call is answered by a trained mental health counselor who listens without judgment.",
             "  - They offer crisis de-escalation, emotional first aid, and can connect you with psychiatrists at district mental health centers (DMHP) or premier institutions like NIMHANS.",
             "Taking the step to speak with someone is an act of courage; you never have to carry emotional burdens alone."
         ],
         {"assessment": "Public mental health resource utilization and referral pathways under the National Mental Health Programme (NMHP) and Tele-MANAS initiative (NIMHANS nodal center).", "investigations": "Tele-triage risk assessment and geographic district mental health program linkage.", "management": "Direct linkage to 24/7 tele-counseling (14416), referral to District Mental Health Programme (DMHP) clinics, or specialized tertiary care (NIMHANS, CIP Ranchi, LGBRIMH Tezpur). Free psychotropic medication access under essential drug lists at primary health centers.", "references": ["Tele-MANAS Operational Guidelines, MoHFW Government of India", "National Mental Health Act 2017"]},
         "Provide 14416 Tele-MANAS number clearly. Confirm patient has saved emergency mental health contacts.",
         ["Acute active suicidal crisis or psychiatric emergency (Immediate EMS 112 / Emergency Department escort)"],
         ["Do NOT delay seeking help due to societal mental health stigma", "Do NOT pay for unverified online therapy without credential checks"],
         "Ministry of Health and Family Welfare (MoHFW) India & NIMHANS", "draft", None)
    ]

    out_mh = []
    for mid, topic, kw, p_ans, doc_a, staff_m, red_f, avoid_l, src, rev_st, rev_by in mh:
        out_mh.append({
            "id": mid,
            "topic": f"Mental Health: {topic}",
            "category": "mental_health",
            "keywords": kw,
            "intent": "chronic_condition_guidance",
            "patient_answer": p_ans,
            "doctor_answer": doc_a,
            "staff_answer": staff_m,
            "red_flags": red_f,
            "follow_up_questions": ["How long have you been feeling this way?", "Is this affecting your sleep, appetite, or daily work?", "Are you feeling completely safe right now?"],
            "avoid": avoid_l,
            "source": src,
            "review_status": rev_st,
            "reviewed_by": rev_by
        })

    return out_mh


def get_skin_eye_ent_dental():
    sed = [
        ("sed_acne_vulgaris_001", "Acne Vulgaris & Breakouts (Pimples / Keel Muhase)", ["acne", "pimples", "keel muhase", "blackheads", "whiteheads", "cystic acne", "acne treatment"],
         [
             "Wash your face twice daily with a gentle, non-comedogenic foaming cleanser and lukewarm water; do NOT scrub vigorously.",
             "For mild acne: Over-the-counter topical Benzoyl Peroxide (2.5% to 5% gel) or Salicylic Acid wash kills acne bacteria and clears blocked pores.",
             "For stubborn acne: Consult a dermatologist for topical retinoids (such as Adapalene 0.1% gel applied at bedtime in a pea-sized amount).",
             "Always use an oil-free, non-comedogenic moisturizer and broad-spectrum sunscreen daily; acne treatments can cause mild peeling.",
             "NEVER pop, squeeze, or pick at pimples; popping forces infection deeper into the skin and causes permanent pitted scarring and dark pigmentation."
         ],
         {"assessment": "Acne Vulgaris (multifactorial follicular disease: follicular hyperkeratinization, Cutibacterium acnes colonization, excess sebum production, and inflammation). Classify severity: Mild (comedonal), Moderate (papulopustular), Severe (nodulocystic).", "investigations": "Clinical diagnosis. Endocrine evaluation (Total testosterone, DHEAS, LH/FSH) if adult female with hirsutism or irregular menses (rule out PCOS).", "management": "Mild: Topical Retinoid (Adapalene 0.1%) + Topical Benzoyl Peroxide (BPO 2.5-5%). Moderate: Topical Retinoid + BPO + Topical/Oral Antibiotic (Doxycycline 100 mg daily for max 8-12 weeks; always combine with BPO to prevent resistance). Severe nodulocystic / scarring: Oral Isotretinoin (0.5-1.0 mg/kg/day; strict teratogenicity / pregnancy prevention protocol).", "references": ["AAD Guidelines of Care for the Management of Acne Vulgaris", "European Evidence-Based Guidelines for the Treatment of Acne"]},
         "Verify patient does not squeeze pimples. Check pregnancy status before any oral retinoid prescription.",
         ["Severe nodulocystic acne with scarring (requires oral Isotretinoin)", "Sudden explosive severe acne with joint pain and fever (Acne Fulminans)"],
         ["NEVER squeeze or pop pimples (causes permanent scarring)", "NEVER take oral Isotretinoin during pregnancy (severe teratogenicity / birth defects)"],
         "American Academy of Dermatology (AAD) & European Dermatology Forum", "draft", None),

        ("sed_fungal_ringworm_tinea_002", "Fungal Skin Infections (Ringworm / Tinea / Daad)", ["ringworm", "tinea", "daad", "fungal skin infection", "itchy circular rash", "jock itch", "athlete foot"],
         [
             "Ringworm (Tinea) is a fungal infection of the skin that forms red, circular, raised, ring-shaped patches with clear centers and scaly, itchy borders.",
             "Common locations: Body (Tinea corporis), Groin (Tinea cruris / Jock itch), and Feet (Tinea pedis / Athlete's foot).",
             "Apply a topical antifungal cream (such as Clotrimazole 1%, Terbinafine 1%, or Luliconazole 1%) twice daily, covering 2 cm beyond the border of the rash.",
             "Continue applying the cream for at least 1 to 2 weeks AFTER the rash completely disappears to eradicate deep fungal spores.",
             "Keep the skin completely clean and dry; wear loose, breathable cotton clothing and change innerwear twice daily in humid weather.",
             "STRICT DANGER WARNING: NEVER apply steroid creams (like Betnovate, Panderm, Quadriderm, Dermovate) to a fungal rash; steroids temporarily reduce itching but supercharge the fungal growth, causing extensive, treatment-resistant infection."
         ],
         {"assessment": "Dermatophytosis (Tinea Corporis / Cruris / Pedis, caused by Trichophyton, Microsporum, or Epidermophyton genera). Recognize Tinea Incognito (fungal infection masked and exacerbated by improper topical corticosteroid abuse).", "investigations": "KOH direct microscopic mount of skin scrapings (demonstrating septate branching hyphae). Fungal culture if refractory.", "management": "Localized: Topical allylamine (Terbinafine 1% cream BID for 2-3 weeks) or topical azole (Luliconazole 1% or Sertaconazole). Extensive / recalcitrant / steroid-modified: Oral Antifungal (Oral Terbinafine 250 mg daily for 2-4 weeks or Itraconazole 100-200 mg daily for 2-4 weeks; monitor LFTs). STRICTLY PROHIBIT topical corticosteroids.", "references": ["IADVL Guidelines for Management of Dermatophytosis in India", "CDC Fungal Diseases: Ringworm Treatment"]},
         "Ask explicitly if patient applied mixed steroid-antifungal-antibiotic creams (Panderm/Quadriderm). Prohibit steroids.",
         ["Extensive body involvement covering > 30% body surface area (Steroid-modified Tinea Incognito)", "Secondary bacterial cellulitis from deep scratching"],
         ["STRICTLY AVOID applying topical steroid creams (Betnovate, Panderm, Quadriderm) to fungal infections", "Do NOT share towels, bedsheets, or soap with family members"],
         "Indian Association of Dermatologists, Venereologists and Leprologists (IADVL) & CDC", "draft", None),

        ("sed_eczema_atopic_dermatitis_003", "Eczema (Atopic Dermatitis) Care & Flare Control", ["eczema", "atopic dermatitis", "dry itchy skin patches", "childhood eczema", "khujli dry skin"],
         [
             "Eczema is a chronic inflammatory skin condition characterized by a damaged skin barrier leading to dry, intensely itchy, red, cracked patches (commonly in elbow and knee creases).",
             "Moisturize, moisturize, moisturize: Apply a thick, fragrance-free emollient ointment or cream (petroleum jelly, ceramide cream) immediately within 3 minutes of stepping out of the shower while skin is still damp.",
             "Take short baths (5 to 10 minutes) in lukewarm (never hot) water using mild, soap-free cleansers.",
             "Wear smooth, 100% breathable cotton clothing; avoid scratchy wool, synthetic fabrics, and scented laundry detergents.",
             "Keep fingernails trimmed short; scratching damages the skin barrier and introduces dangerous bacterial infections.",
             "Consult a doctor during flare-ups for short courses of topical anti-inflammatory creams (mild corticosteroid or topical calcineurin inhibitor)."
         ],
         {"assessment": "Atopic Dermatitis (chronic relapsing pruritic inflammatory dermatosis associated with epidermal barrier dysfunction [filaggrin gene mutations] and immune dysregulation).", "investigations": "Clinical diagnosis (Hanifin and Rajka criteria). Skin swab culture only if secondary bacterial impetiginization.", "management": "Stepped care: 1. Baseline: Liberal emollient therapy (>=250-500 g/week), avoidance of irritants. 2. Acute flares: Low-to-medium potency Topical Corticosteroids (Hydrocortisone 1% for face; Triamcinolone or Mometasone for body) applied BID for 5-14 days. 3. Maintenance: Proactive twice-weekly topical calcineurin inhibitor (Tacrolimus 0.03-0.1% ointment). Systemic biologics (Dupilumab) for severe refractory disease.", "references": ["AAD Guidelines of Care for the Management of Atopic Dermatitis", "NICE Guideline CG57: Atopic eczema in under 12s"]},
         "Examine distribution (flexural creases in children/adults, cheeks/extensors in infants). Reinforce liberal emollient application.",
         ["Rapid outbreak of painful, punched-out, umbilicated blisters with fever (Eczema Herpeticum - Medical Emergency requiring IV Acyclovir)", "Honey-colored crusting indicating secondary Staphylococcal infection"],
         ["Do NOT take long, scalding hot baths (strips skin lipids and severely worsens itching)", "Do NOT use fragranced soaps, bubble baths, or harsh perfumed detergents"],
         "American Academy of Dermatology (AAD) & NICE Guideline CG57", "draft", None),

        ("sed_hives_acute_urticaria_004", "Hives & Acute Urticaria (Allergic Wheals / Chhapaki)", ["hives", "urticaria", "chhapaki", "itchy welts", "allergic rash bumps", "acute hives"],
         [
             "Hives (Urticaria) are raised, red or pink, intensely itchy skin welts of varying shapes and sizes that appear suddenly and individual welts typically fade within 24 hours without leaving scars.",
             "Common triggers: Viral infections (most common in children), food allergies, antibiotics or painkillers (NSAIDs), insect stings, or sudden temperature changes.",
             "Take a modern, non-drowsy oral second-generation antihistamine (such as Cetirizine 10 mg, Fexofenadine 180 mg, or Bilastine 20 mg) for rapid relief of itching and wheals.",
             "Apply soothing calamine lotion or cool damp cloths to relieve intense itching.",
             "Take lukewarm baths; avoid hot water, tight belts, and strenuous exercise while hives are active.",
             "EMERGENCY WARNING (ANAPHYLAXIS): Seek emergency care immediately if hives are accompanied by swelling of your lips, tongue, or eyelids, difficulty breathing, throat tightness, or dizziness."
         ],
         {"assessment": "Acute Urticaria (< 6 weeks duration). Mast cell degranulation releasing histamine and inflammatory mediators. Must assess for systemic Anaphylaxis and Angioedema.", "investigations": "Clinical diagnosis. Allergy testing not indicated for self-limiting acute episodes unless clear anaphylaxis trigger.", "management": "First-line: Second-generation non-sedating H1-antihistamines (Cetirizine 10 mg, Fexofenadine 180 mg, Bilastine 20 mg daily; dose can be titrated up to 4-fold under physician supervision for stubborn wheals). Short-course oral Prednisolone (20-30 mg daily for 3-5 days) reserved only for severe acute angioedema. Discontinue suspect culprit medications.", "references": ["EAACI/GA²LEN/EuroGuiDerm/APAAACI Guideline for the Definition, Classification, Diagnosis, and Management of Urticaria", "WAO Guidelines"]},
         "Priority: Triage Red if facial/lip swelling, throat tightness, or dyspnea (Anaphylaxis); Green if isolated hives. Check airway and vitals.",
         ["Swelling of lips, tongue, uvula, or difficulty swallowing (Angioedema)", "Wheezing, stridor, or shortness of breath", "Dizziness, fainting, or SBP < 90 mmHg (Anaphylactic Shock - STAT IM Epinephrine)"],
         ["Do NOT take Ibuprofen, Aspirin, or NSAIDs during an urticaria outbreak (frequently worsens hives dramatically)", "Do NOT scratch vigorously"],
         "EAACI/GA²LEN/WAO Urticaria Guidelines & World Allergy Organization", "draft", None),

        ("sed_scabies_itch_burrows_005", "Scabies Mite Infestation (Nocturnal Itching)", ["scabies", "scabies itch", "burrows skin", "night itching hands", "permethrin scabies", "itch between fingers"],
         [
             "Scabies is caused by microscopic mites (Sarcoptes scabiei) that burrow into the upper layer of the skin to live and lay eggs, triggering an intense allergic reaction.",
             "Hallmark sign: Severe, unbearable itching that becomes DRAMATICALLY WORSE AT NIGHT in bed or after a hot bath.",
             "Common locations: Tiny pimple-like bumps and thin wavy gray/red burrow lines between the fingers, wrists, armpits, waist, navel, and genital area.",
             "TREATMENT PROCEDURE: Apply 5% Permethrin dermal cream over your entire body from the neck down to the tips of your toes, leaving it on for 8 to 14 hours (overnight) before washing off.",
             "REPEAT APPLICATION: Apply the treatment again exactly 7 days later to eradicate any newly hatched mites.",
             "ALL HOUSEHOLD CONTACTS MUST BE TREATED ON THE SAME NIGHT, even if they have zero itching, to prevent endless reinfection.",
             "Wash all bedsheets, towels, and clothing in hot water (at least 50°C / 122°F) and dry on high heat."
         ],
         {"assessment": "Scabies Infestation. Highly contagious ectoparasitosis. Differentiate classic scabies from Crusted (Norwegian) scabies in immunocompromised patients.", "investigations": "Clinical diagnosis. Dermoscopy ('delta-wing' jet sign), skin scraping with mineral oil microscopy (identifies mites, eggs, scybala).", "management": "First-line: Topical Permethrin 5% cream applied neck-to-toes for 8-14 hours, repeated on Day 8. Oral Ivermectin (200 mcg/kg single dose with food, repeated on Day 8-14) for institutional outbreaks or topical failures. Mandatory simultaneous treatment of all household contacts. Oral antihistamines and topical hydrocortisone for post-scabetic pruritus (persists 2-4 weeks after mite death).", "references": ["CDC Scabies Treatment Guidelines", "IUSTI European Guideline for the Management of Scabies"]},
         "Confirm that ALL household members are treated on the same night. Instruct hot water laundering of bedding.",
         ["Crusted (Norwegian) scabies: thick warty hyperkeratotic crusts containing millions of mites (highly infectious, requires oral Ivermectin + topical Permethrin)", "Secondary bacterial cellulitis"],
         ["Do NOT treat only one family member while ignoring household contacts (causes immediate reinfection loop)", "Do NOT assume ongoing itch in the first 2 weeks means treatment failed (post-scabetic itch takes weeks to settle)"],
         "Centers for Disease Control and Prevention (CDC) & International Alliance for the Control of Scabies", "draft", None),

        ("sed_psoriasis_plaques_006", "Psoriasis (Scaly Plaques & Flakes)", ["psoriasis", "silvery scales skin", "scaly skin patches", "psoriasis plaques", "red scaly elbows knees"],
         [
             "Psoriasis is a chronic autoimmune condition that speeds up the lifecycle of skin cells, causing cells to build up rapidly on the surface into thick, silvery-scaled red plaques.",
             "Common areas: Knees, elbows, scalp, lower back, and nails (nail pitting or discoloration).",
             "Moisturize daily: Apply thick emollient ointments immediately after bathing to soften scales and soothe dryness.",
             "Take short lukewarm baths with Epsom salts or oatmeal to gently loosen thick plaques; do NOT vigorously pick or scrape scales.",
             "Sensible sunlight exposure (10-15 minutes of mild morning sun) can help slow skin cell proliferation.",
             "Consult a dermatologist for specialized treatments: prescription Vitamin D analogues (Calcipotriol), topical corticosteroids, targeted phototherapy (narrowband UVB), or modern biologic therapies."
         ],
         {"assessment": "Plaque Psoriasis (Psoriasis Vulgaris, T-cell mediated autoimmune dermatosis). Screen for Psoriatic Arthritis (PsA: DIP joint involvement, dactylitis 'sausage digit', enthesitis) and metabolic syndrome.", "investigations": "Psoriasis Area and Severity Index (PASI score). Screen for PsA using PEST questionnaire. Baseline LFT, lipid profile, fasting glucose, hepatitis/TB screen prior to systemic agents.", "management": "Mild (<3-5% BSA): Topical Corticosteroid + Topical Vitamin D3 analogue (Calcipotriol/Betamethasone combination ointment). Moderate-to-Severe (>10% BSA or refractory): Narrowband UVB Phototherapy, Systemic non-biologics (Methotrexate 10-25 mg ONCE WEEKLY, Apremilast), or Biologic therapy (anti-TNF, anti-IL-17, anti-IL-23).", "references": ["AAD-NPF Guidelines of Care for the Management and Treatment of Psoriasis", "NICE Guideline CG153: Psoriasis: assessment and management"]},
         "Inspect joints and nails (pitting, onycholysis). Screen for joint pain and dactylitis.",
         ["Joint pain, morning stiffness, or swollen 'sausage' fingers/toes (Psoriatic Arthritis - requires urgent systemic therapy to prevent joint destruction)", "Sudden generalized redness and skin shedding over >90% body (Erythrodermic Psoriasis - Medical Emergency)"],
         ["Do NOT aggressively pick, peel, or scratch scales (triggers the Koebner phenomenon, where injury creates new plaques)", "Do NOT stop systemic psoriasis medications abruptly"],
         "American Academy of Dermatology (AAD) & National Psoriasis Foundation (NPF)", "draft", None),

        ("sed_dandruff_seborrheic_dermatitis_007", "Dandruff & Seborrheic Dermatitis (Scalp Flakes)", ["dandruff", "seborrheic dermatitis", "scalp flakes", "itchy scalp", "rusi", "cradle cap baby"],
         [
             "Dandruff is a mild form of seborrheic dermatitis driven by sensitivity to a naturally occurring harmless scalp yeast called Malassezia.",
             "Key signs: Itchy scalp, white or yellowish greasy flakes in your hair and on your shoulders, and redness along the hairline, eyebrows, sides of the nose, and ears.",
             "In infants: Known as 'Cradle Cap' (thick, yellowish, greasy crusts on the baby's scalp), which is harmless and usually resolves on its own.",
             "Effective treatment for adults: Use an anti-dandruff shampoo containing Ketoconazole 2%, Zinc Pyrithione, Selenium Sulfide, or Salicylic Acid 2 to 3 times a week.",
             "CRUCIAL SHAMPOO TECHNIQUE: Lather the shampoo into your scalp and LEAVE IT ON FOR 5 FULL MINUTES before rinsing out, allowing the active antifungal medicine time to work.",
             "Avoid applying heavy hair oils (mustard oil, heavy coconut oil); excess oil feeds the Malassezia yeast and worsens inflammation."
         ],
         {"assessment": "Seborrheic Dermatitis (inflammatory dermatosis involving sebum-rich areas, driven by Malassezia yeast colonization and altered sebum lipid profile). Differentiate from scalp psoriasis (thick silvery micaceous scales).", "investigations": "Clinical diagnosis. Rule out underlying HIV or Parkinson's disease if acute, severe, or generalized recalcitrant seborrheic dermatitis.", "management": "Adult scalp: Ketoconazole 2% shampoo or Ciclopirox 1% shampoo twice weekly (leave on scalp for 5 minutes). Mild topical corticosteroid lotion or topical calcineurin inhibitor for facial/ear involvement. Infant cradle cap: Softening with mineral oil/coconut oil followed by gentle soft-brush combing and gentle baby shampoo.", "references": ["AAD Guidelines on Seborrheic Dermatitis", "British Association of Dermatologists Guidelines"]},
         "Instruct patient on leaving antifungal shampoo on scalp for full 5 minutes before rinsing.",
         ["Severe refractory seborrheic dermatitis in young adult (consider HIV testing)", "Secondary bacterial infection with impetigo crusts"],
         ["Do NOT apply heavy cooking or hair oils to active seborrheic dermatitis (feeds the yeast)", "Do NOT wash shampoo off instantly (requires 5-minute contact time)"],
         "American Academy of Dermatology (AAD) & British Association of Dermatologists", "draft", None),

        ("sed_warts_molluscum_viral_008", "Warts (Verrucae) & Molluscum Contagiosum", ["warts", "verruca", "massa", "skin warts", "plantar warts", "molluscum contagiosum", "water warts"],
         [
             "Common warts are benign skin growths caused by Human Papillomavirus (HPV) infection of the outer skin layer, commonly appearing on fingers, hands, and feet (plantar warts).",
             "Molluscum Contagiosum is another common viral skin infection (frequent in children) causing small, firm, dome-shaped, pearly bumps with a tiny dimple in the center.",
             "Both are spread through direct skin-to-skin contact, sharing towels, or walking barefoot around damp swimming pool decks.",
             "Home treatment for warts: Over-the-counter Salicylic acid liquid or wart pads: soak wart in warm water for 5 minutes, gently file dead skin with an emery board, apply medicine strictly to the wart, and cover with tape.",
             "Never scratch, pick, or bite warts; scratching spreads the virus to surrounding skin.",
             "Consult a dermatologist for stubborn warts: treatments include cryotherapy (freezing with liquid nitrogen), chemical peeling, or laser removal."
         ],
         {"assessment": "Verruca Vulgaris / Plantar Warts (HPV types 1, 2, 4, 27, 57) and Molluscum Contagiosum (Poxvirus). Benign epidermal proliferations with high rates of eventual spontaneous immune clearance.", "investigations": "Clinical examination (dermoscopy of verruca shows pinpoint thrombosed black capillaries).", "management": "Warts: Topical Salicylic Acid (17-40% with occlusion) or Cryotherapy (liquid nitrogen Q2-3W). Plantar warts: pairing followed by cryotherapy. Molluscum: Watchful waiting (typically clears spontaneously in 6-18 months), topical cantharidin, or gentle curettage.", "references": ["British Association of Dermatologists Guidelines for the Management of Cutaneous Warts", "CDC Molluscum Contagiosum Guidance"]},
         "Verify diagnosis. Confirm patient does not pick at lesions.",
         ["Genital warts (Condyloma acuminata - requires evaluation for sexually transmitted HPV)", "Rapidly proliferating extensive warts in immunocompromised patients"],
         ["Do NOT cut or slice warts off at home with razors or nail clippers (causes severe infection and scarring)", "Do NOT share personal towels or pumice stones"],
         "British Association of Dermatologists & Centers for Disease Control and Prevention", "draft", None),

        ("sed_acute_red_eye_conjunctivitis_009", "Red Eye: Viral vs Bacterial vs Allergic Conjunctivitis", ["red eye", "pink eye", "conjunctivitis", "aankh lal", "eye discharge", "sticky eye morning", "allergic eye"],
         [
             "Red eye is most commonly caused by conjunctivitis (inflammation of the clear membrane covering the white of your eye).",
             "DIFFERENTIATING TYPES OF CONJUNCTIVITIS:",
             "  - Viral ('Pink Eye'): Watery discharge, gritty feeling, starts in one eye and spreads to the other within 24 to 48 hours; highly contagious; resolves on its own in 1 to 2 weeks.",
             "  - Bacterial: Thick, yellow or green pus-like discharge that glues your eyelids shut in the morning; requires antibiotic eye drops.",
             "  - Allergic: Intense bilateral itching, watery eyes, and puffy swollen lids, often accompanied by sneezing and runny nose.",
             "Clean discharge gently with clean cotton pads soaked in cooled boiled water, wiping from the inner corner outwards.",
             "Do NOT wear contact lenses or eye makeup until the red eye has completely resolved.",
             "DANGER SIGNS: If you have severe deep eye pain, sensitivity to light, or decreased vision, see an eye specialist immediately."
         ],
         {"assessment": "Acute Conjunctivitis. Differentiate Viral vs Bacterial vs Allergic vs sight-threatening conditions (Keratitis, Acute Anterior Uveitis, Acute Angle-Closure Glaucoma).", "investigations": "Visual acuity testing (Snellen), slit-lamp biomicroscopy, fluorescein staining to rule out corneal abrasions/herpetic dendritic ulcers.", "management": "Viral: Supportive (cold compresses, preservative-free artificial tears). Bacterial: Topical antibiotic drops (Moxifloxacin 0.5% or Tobramycin 0.3% QID for 5-7 days). Allergic: Topical Olopatadine 0.1% BID or Ketotifen drops.", "references": ["AAO Preferred Practice Pattern: Conjunctivitis", "RCOphth Clinical Guidelines on Management of Acute Red Eye"]},
         "Check visual acuity and pupil reactivity. Ask if patient wears contact lenses (high risk for Pseudomonas keratitis).",
         ["Severe deep eye pain or intense sensitivity to light (Photophobia)", "Noticeable reduction in vision or cloudy cornea", "Contact lens wearer with red eye and white corneal spot (Corneal Ulcer Emergency)"],
         ["NEVER use steroid eye drops without an eye doctor's explicit examination (can cause corneal perforation or blindness if viral)", "Do NOT share towels or eye drops"],
         "American Academy of Ophthalmology (AAO) & Royal College of Ophthalmologists", "draft", None),

        ("sed_dry_eyes_digital_strain_010", "Dry Eye Disease & Digital Eye Strain (Computer Vision Syndrome)", ["dry eyes", "digital eye strain", "computer vision syndrome", "eye strain screens", "burning eyes computer", "artificial tears"],
         [
             "Staring at smartphone, laptop, or TV screens reduces your natural blinking rate by over 60%, causing the protective tear film on your eyes to evaporate rapidly.",
             "Symptoms: Gritty sensation (feeling like sand in the eyes), burning, redness, eye fatigue, and paradoxical watery tearing (reflex tears triggered by dry spots).",
             "THE 20-20-20 RULE: Every 20 minutes of screen time, look at an object at least 20 feet away for at least 20 seconds to relax your eye focusing muscles.",
             "Blink consciously: Make a deliberate effort to perform full, complete blinks while reading or working on screens.",
             "Use preservative-free lubricating artificial tear drops 3 to 4 times a day to replenish moisture.",
             "Screen setup: Position your monitor about arm's length away, with the top of the screen slightly below eye level so you look slightly downward (which exposes less eye surface to air)."
         ],
         {"assessment": "Dry Eye Disease (DED: Evaporative [Meibomian Gland Dysfunction] vs Aqueous Deficient) and Digital Eye Strain.", "investigations": "Tear Break-Up Time (TBUT < 10s abnormal), Schirmer's test, ocular surface fluorescein staining, Meibography.", "management": "Environmental and behavioral modification (20-20-20 rule, conscious blinking, humidification). Preservative-free artificial tears (Carboxymethylcellulose 0.5% or Sodium Hyaluronate 0.1-0.18%). Warm compresses and eyelid hygiene for Meibomian Gland Dysfunction. Topical Cyclosporine 0.05% or Lifitegrast for chronic inflammatory DED.", "references": ["TFOS DEWS II (Tear Film & Ocular Surface Society Dry Eye Workshop II) Report", "AAO Preferred Practice Pattern: Dry Eye Syndrome"]},
         "Review daily screen hours and contact lens use. Demonstrate warm compress and lid massage technique.",
         ["Severe persistent eye pain or foreign body sensation that does not improve with lubricating drops", "Corneal abrasions or vision loss"],
         ["Do NOT use 'redness-reliever' eye drops (like naphazoline/decongestant drops) daily (causes severe rebound red eye)", "Do NOT direct air conditioning fans or blowers straight at your face"],
         "TFOS DEWS II Global Consensus & American Academy of Ophthalmology", "draft", None),

        ("sed_stye_chalazion_eyelid_011", "Stye (Hordeolum) vs Chalazion (Eyelid Lumps)", ["stye", "chalazion", "eyelid bump", "pimple on eyelid", "bilni", "swollen eyelid lump"],
         [
             "A Stye (Hordeolum) is an acute, painful, red bacterial infection of an eyelash oil gland at the eyelid edge, looking like a tender red pimple.",
             "A Chalazion is a painless, firm, non-infected lump deeper inside the eyelid caused by a blocked meibomian oil gland.",
             "THE BEST TREATMENT: Warm compresses applied 3 to 4 times daily for 10 to 15 minutes each time. Soak a clean washcloth in warm water and place it gently over the closed eyelid.",
             "The moist heat melts hardened oils inside the blocked gland, allowing it to drain and heal naturally.",
             "NEVER POP OR SQUEEZE an eyelid bump; the eyelid tissues are delicate and popping can spread severe bacterial infection into the eye socket.",
             "Do not wear eye makeup or contact lenses until the stye has completely drained and healed.",
             "Consult an ophthalmologist if the bump does not shrink after 2 weeks, or if swelling spreads to the entire eyelid."
         ],
         {"assessment": "Hordeolum (acute focal infection, internal [Meibomian] or external [Zeis/Moll], most commonly Staphylococcus aureus) vs Chalazion (chronic sterile lipogranulomatous inflammatory lesion of Meibomian gland).", "investigations": "Clinical slit-lamp examination. Evert eyelid to inspect tarsal conjunctiva.", "management": "Frequent warm moist compresses (10-15 min TID-QID) + gentle eyelid margin hygiene. Topical antibiotic ointment (Erythromycin or Bacitracin) for external hordeolum. Persistent chalazion (>4-6 weeks): Incision and curettage under local anesthesia or intralesional triamcinolone injection.", "references": ["AAO Preferred Practice Pattern: Blepharitis and Hordeolum", "RCOphth Clinical Guidelines on Chalazion Management"]},
         "Examine eyelid margin. Verify redness is localized to the lid and not spreading to the periorbital tissue.",
         ["Swelling, redness, and heat spreading to the entire cheek or eyebrow with fever (Periorbital / Orbital Cellulitis - STAT Emergency)", "Proptosis (eyeball protruding forward) or painful eye movement"],
         ["NEVER squeeze, prick, or pop a stye with a pin (can cause orbital cellulitis or cavernous sinus thrombosis)", "Do NOT apply warm compresses that are scalding hot"],
         "American Academy of Ophthalmology (AAO) & Royal College of Ophthalmologists", "draft", None),

        ("sed_glaucoma_warning_signs_012", "Glaucoma Warning Signs & Vision Preservation", ["glaucoma", "kala motia", "eye pressure", "intraocular pressure", "loss of side vision", "glaucoma test"],
         [
             "Glaucoma ('Kala Motia') is a group of eye diseases that damage the optic nerve, typically associated with elevated pressure inside the eye (Intraocular Pressure).",
             "THE SILENT THIEF OF SIGHT: Open-Angle Glaucoma (the most common type) has ZERO pain and ZERO warning symptoms in early stages; it slowly steals peripheral (side) vision so gradually that patients do not notice until permanent tunnel vision occurs.",
             "Vision lost to glaucoma can NEVER be recovered; however, early treatment with daily pressure-lowering eye drops completely halts further damage.",
             "ACUTE ANGLE-CLOSURE GLAUCOMA (SIGHT-THREATENING EMERGENCY):",
             "  - Sudden, severe, excruciating eye pain and headache.",
             "  - Rainbow-colored halos around bright lights.",
             "  - Severe nausea and vomiting.",
             "  - Red eye with a cloudy or steamy cornea and fixed, enlarged pupil.",
             "If you experience sudden severe eye pain with halos, go to an eye hospital emergency department IMMEDIATELY.",
             "Everyone aged 40 and older, and anyone with a family history of glaucoma, should have their eye pressure tested annually."
         ],
         {"assessment": "Glaucoma: Primary Open-Angle Glaucoma (POAG: chronic progressive optic neuropathy with cupping and visual field loss) vs Primary Angle-Closure Glaucoma (PACG: acute or chronic appositional/synechial closure of anterior chamber angle).", "investigations": "Goldmann Applanation Tonometry (IOP > 21 mmHg is elevated), Gonioscopy (angle assessment), Automated Visual Field perimetry (Humphrey visual fields: arcuate scotomas), Optical Coherence Tomography (OCT of retinal nerve fiber layer / RNFL).", "management": "POAG: First-line Topical Prostaglandin Analogues (Latanoprost, Bimatoprost once daily bedtime). Second-line: Beta-blockers (Timolol 0.5%), Alpha-2 agonists, or Carbonic anhydrase inhibitors. Selective Laser Trabeculoplasty (SLT). Acute Angle-Closure Emergency: STAT medical pressure reduction (IV Mannitol, oral Acetazolamide 500 mg, topical Timolol, Pilocarpine 2%) followed by definitive bilateral Laser Peripheral Iridotomy (LPI).", "references": ["AAO Preferred Practice Pattern: Primary Open-Angle Glaucoma", "EGS (European Glaucoma Society) Terminology and Guidelines for Glaucoma"]},
         "Priority: Triage Red for acute painful red eye with nausea and halos. Measure intraocular pressure immediately.",
         ["Acute severe eye pain with blurred vision, halos around lights, and nausea/vomiting (Acute Angle-Closure Glaucoma - STAT Emergency)", "Sudden painless loss of vision in one eye"],
         ["Do NOT skip daily prescribed glaucoma eye drops (IOP spikes silently when doses are missed)", "Do NOT take over-the-counter anticholinergic or cold medications if diagnosed with narrow angles"],
         "American Academy of Ophthalmology (AAO) & European Glaucoma Society (EGS)", "draft", None),

        ("sed_acute_sinusitis_facial_pain_013", "Sinusitis & Facial Pressure (Sinus Infection)", ["sinusitis", "sinus pain", "facial pressure forehead", "sinus headache", "blocked nose headache", "sinus infection"],
         [
             "Sinusitis is inflammation of the air cavities inside your skull around your nose, forehead, and cheeks, most commonly following a viral cold.",
             "Key signs: Facial pain, aching pressure behind the eyes, forehead, or cheekbones that worsens when bending forward, nasal congestion, and thick yellow or green nasal mucus.",
             "Over 90% of acute sinus infections are VIRAL and resolve on their own within 7 to 10 days WITHOUT antibiotics.",
             "Effective home relief:",
             "  - Inhale steam from a bowl of hot water or take a warm steamy shower for 10 minutes 2 to 3 times a day.",
             "  - Flush your sinuses with a saline nasal spray or sinus rinse bottle (use sterile/distilled water).",
             "  - Place a warm washcloth across your cheeks and forehead to ease pressure.",
             "  - Take Paracetamol or Ibuprofen for facial pain.",
             "Consult a doctor if symptoms last more than 10 days without improvement, or if fever spikes after initially improving ('double sickening')."
         ],
         {"assessment": "Acute Rhinosinusitis (ARS: symptoms < 4 weeks). Differentiate Acute Viral Rhinosinusitis (AVRS) from Acute Bacterial Rhinosinusitis (ABRS: criteria = symptoms >= 10 days without improvement, severe onset [temp >=39°C + purulent rhinorrhea >=3-4 consecutive days], or 'double sickening' worsening).", "investigations": "Clinical diagnosis. Routine sinus CT is NOT recommended for uncomplicated ARS. CT Paranasal Sinuses indicated if orbital/intracranial complications or recurrent refractory disease.", "management": "Symptomatic therapy for viral ARS: Saline nasal irrigation, Intranasal Corticosteroids (Mometasone / Fluticasone spray 2 sprays per nostril BID), analgesia. First-line for confirmed ABRS: Oral Amoxicillin-Clavulanate 875/125 mg BID for 5-7 days. Alternative in penicillin allergy: Doxycycline 100 mg BID.", "references": ["IDSA Clinical Practice Guideline for Acute Bacterial Rhinosinusitis in Children and Adults", "AAO-HNS Clinical Practice Guideline: Adult Sinusitis"]},
         "Check for orbital swelling, diplopia, or meningismus. Assess duration (>=10 days for bacterial suspicion).",
         ["Swelling, redness, or pain around one eye socket (Periorbital / Orbital Cellulitis complication)", "Severe unrelenting forehead headache with high fever and neck stiffness (Intracranial abscess / Meningitis)"],
         ["Do NOT use OTC nasal decongestant sprays (like Otrivin/Xylometazoline) for more than 3 to 5 days (causes severe rebound congestion)", "Do NOT demand antibiotics for early sinus colds (<10 days)"],
         "Infectious Diseases Society of America (IDSA) & AAO-HNS Guidelines", "draft", None),

        ("sed_earwax_impaction_cleaning_014", "Earwax Impaction & Safe Ear Cleaning", ["earwax", "blocked ear wax", "kaan me mail", "earwax removal", "ear drops wax", "cerumen impaction"],
         [
             "Earwax (cerumen) is natural and healthy: it traps dirt, lubricates the ear canal, and contains enzymes that fight bacterial and fungal infections.",
             "Your ears are naturally self-cleaning: chewing and jaw movements continuously migrate old earwax outwards to the ear opening where it flakes off.",
             "Impaction occurs when wax builds up and blocks the canal, causing muffled hearing, fullness, ringing (tinnitus), or mild ear discomfort.",
             "SAFE HOME SOFTENING: Instill 2 to 3 drops of plain mineral oil, baby oil, or earwax drops (such as carbamide peroxide or sodium bicarbonate drops) twice daily for 3 to 5 days to soften the wax so it drains naturally.",
             "STRICT GOLDEN RULE: NEVER insert cotton swabs (Q-tips), safety pins, matchsticks, or car keys into your ear canal; swabs act like a piston that pushes wax deeper, packing it against your delicate eardrum and risking eardrum puncture.",
             "If hearing remains blocked, visit an ENT clinic for painless ear syringing or micro-suction removal under direct vision."
         ],
         {"assessment": "Cerumen Impaction (accumulation of cerumen causing symptoms [hearing loss, otalgia, tinnitus, fullness] or preventing necessary clinical examination).", "investigations": "Otoscopic examination (identifies dark yellow, brown, or black cerumen completely occluding external auditory canal).", "management": "Options: 1. Cerumenolytic drops (Carbamide peroxide 6.5%, mineral oil, sodium bicarbonate 5% drops for 3-5 days). 2. Irrigation with body-temperature water (must confirm tympanic membrane is intact without perforation). 3. Manual removal / Micro-suction under direct microscopic or otoscopic visualization by trained clinician.", "references": ["AAO-HNS Clinical Practice Guideline: Cerumen Impaction (Update)", "NICE Clinical Knowledge Summaries: Earwax"]},
         "Examine canal with otoscope. Verify water temperature is strictly body temperature (37°C) before irrigation (cold/hot water triggers violent caloric vertigo).",
         ["Sudden sharp excruciating pain with hearing loss and bleeding while inserting a swab (Traumatic Tympanic Membrane Perforation)", "Severe pain and foul drainage in an elderly diabetic patient (Malignant Otitis Externa)"],
         ["NEVER insert cotton buds, keys, or foreign objects into your ear canal", "Do NOT use 'Ear Candling' (completely ineffective and causes severe ear burns and canal obstruction)"],
         "American Academy of Otolaryngology-Head and Neck Surgery (AAO-HNS)", "draft", None),

        ("sed_gingivitis_gum_bleeding_015", "Gingivitis & Bleeding Gums (Gum Health Basics)", ["bleeding gums", "gingivitis", "gums bleeding brushing", "pyria", "gum disease", "mukh se badbu", "periodontitis"],
         [
             "Gingivitis is the early, reversible stage of gum disease caused by dental plaque (a sticky film of bacteria) accumulating along the gumline.",
             "Key signs: Gums that bleed easily when you brush or floss, red swollen tender gums, and persistent bad breath (halitosis).",
             "If neglected, gingivitis advances to Periodontitis: the gum tissue pulls away from the teeth, bone support dissolves, and teeth become loose and fall out.",
             "Daily oral hygiene essentials:",
             "  - Brush your teeth thoroughly twice a day for a full 2 minutes using a soft-bristled toothbrush and fluoride toothpaste.",
             "  - Floss between your teeth once a day to clean food and plaque from tight spaces your toothbrush bristles cannot reach.",
             "  - Rinse with a warm salt water rinse or antiseptic mouthwash.",
             "Do NOT stop brushing or flossing because your gums bleed; gentle, thorough cleaning removes the bacterial plaque that causes the bleeding in the first place.",
             "Visit a dentist every 6 months for professional scaling and cleaning to remove hardened tartar (calculus)."
         ],
         {"assessment": "Gingivitis (plaque-induced gingival inflammation without loss of attachment) vs Periodontitis (irreversible destruction of periodontal ligament and alveolar bone). Screen for systemic associations (diabetes mellitus, pregnancy, smoking, leukemia).", "investigations": "Periodontal probing depth measurements (probing depths > 3 mm indicate periodontal pocketing). Full mouth dental radiographs (OPG / periapical).", "management": "Professional dental scaling and root planing (deep cleaning). Oral hygiene instruction: Bass brushing technique, daily interdental flossing. Chlorhexidine gluconate 0.12% mouthwash short-term (max 2 weeks to prevent tooth staining). Treat systemic comorbidities (glycemic control in diabetics).", "references": ["AAP / EFP World Workshop on the Classification of Periodontal and Peri-Implant Diseases", "ADA Guidelines on Periodontal Disease"]},
         "Inquire about brushing frequency, flossing, and history of diabetes or blood thinners.",
         ["Rapid spontaneous gum bleeding accompanied by easy skin bruising, extreme fatigue, and fever (screen for Acute Leukemia)", "Teeth becoming visibly loose and shifting position"],
         ["Do NOT stop brushing because your gums bleed (cleaning clears the bacterial cause of bleeding)", "Do NOT use stiff hard-bristled toothbrushes (damages enamel and recedes gums)"],
         "American Dental Association (ADA) & European Federation of Periodontology", "draft", None),

        ("sed_dental_abscess_emergency_016", "Dental Abscess & Severe Tooth Infection", ["tooth abscess", "dental infection", "pus in tooth", "severe toothache swelling", "daant me peeb", "face swollen tooth"],
         [
             "A dental abscess is a localized collection of pus caused by a severe bacterial infection that spreads from an untreated dental cavity into the root of the tooth or surrounding jawbone.",
             "Key signs: Severe, continuous, throbbing tooth pain that radiates to your jaw, ear, or neck, extreme sensitivity to hot and cold, swelling in your cheek or jaw, and a foul taste in your mouth if the abscess ruptures.",
             "First aid while waiting for dental care:",
             "  - Take Ibuprofen (400 mg with food) or Paracetamol for pain and inflammation.",
             "  - Rinse gently with warm salt water (1/2 teaspoon salt in a glass of warm water) 3 to 4 times a day.",
             "  - Hold an ice pack wrapped in a cloth against the outside of your cheek for 15 minutes.",
             "URGENT DENTAL ATTENTION IS MANDATORY: An abscess will NEVER heal on its own; a dentist must drain the infection and perform root canal treatment or extract the tooth.",
             "AIRWAY EMERGENCY WARNING: If swelling spreads down into your neck, under your tongue, or makes it difficult to swallow or breathe, go to a hospital emergency room IMMEDIATELY (concern for Ludwig's Angina)."
         ],
         {"assessment": "Periapical Abscess vs Periodontal Abscess. High risk of fascial space infection (Ludwig's Angina / Submandibular space cellulitis) and cavernous sinus thrombosis.", "investigations": "Dental periapical radiograph, panoramic OPG. Check for trismus (inability to open mouth) and floor-of-mouth elevation.", "management": "Urgent dental referral for drainage: incision and drainage or pulpectomy/root canal therapy. Analgesia: NSAIDs + Paracetamol. Systemic antibiotics indicated if systemic signs (fever, lymphadenopathy, cellulitis): Amoxicillin-Clavulanate 625 mg TID or Clindamycin 300 mg QID for 5-7 days.", "references": ["ADA Clinical Practice Guideline on Antibiotic Use for Odontogenic Infections", "NICE Clinical Knowledge Summaries: Dental Abscess"]},
         "Priority: Triage Red if facial/neck swelling with difficulty swallowing or breathing. Check for floor-of-mouth elevation and trismus.",
         ["Swelling spreading into the neck or floor of the mouth, causing difficulty swallowing or breathing (Ludwig's Angina - Critical Airway Emergency)", "Inability to open mouth wider than 1 finger (Severe Trismus)"],
         ["NEVER place an Aspirin tablet directly against your gum or tooth (causes severe chemical burn and tissue necrosis)", "Do NOT delay dental treatment hoping antibiotics alone will cure an abscess"],
         "American Dental Association (ADA) & American Association of Endodontists", "draft", None),

        ("sed_mouth_ulcers_canker_sores_017", "Mouth Ulcers & Canker Sores (Aphthous Stomatitis)", ["mouth ulcer", "canker sore", "chhale", "muh me chhale", "aphthous ulcer", "painful mouth sore"],
         [
             "Canker sores (Aphthous ulcers) are small, painful, shallow oval ulcers with a white or yellowish center and a bright red border appearing inside the cheeks, lips, gums, or under the tongue.",
             "They are NOT contagious and are NOT caused by cold sores (herpes virus).",
             "Common triggers: Accidental cheek biting, sharp food scratches, stress, lack of sleep, Vitamin B12 / iron deficiency, or food sensitivities (acidic fruits, spicy chili).",
             "Soothing relief:",
             "  - Rinse with warm salt water (1/2 teaspoon salt in 1 cup warm water) 3 times daily.",
             "  - Apply an over-the-counter soothing oral gel containing Choline Salicylate, Benzocaine, or protective hyaluronic acid over the ulcer before meals.",
             "  - Avoid spicy, salty, citrus, and rough crunchy foods that cause sharp burning pain.",
             "Most canker sores heal completely on their own within 7 to 10 days.",
             "RED FLAG: ANY mouth ulcer that lasts longer than 3 WEEKS without healing MUST be examined by a dentist or ENT specialist to rule out oral cancer."
         ],
         {"assessment": "Recurrent Aphthous Stomatitis (RAS: Minor <10 mm, Major >10 mm, Herpetiform). Differentiate from Oral Squamous Cell Carcinoma (OSCC), Behcet's disease, Crohn's disease, and Celiac disease.", "investigations": "Clinical diagnosis. Laboratory workup for recurrent ulcers: CBC, Serum Ferritin, Vitamin B12, Folate, anti-tTG IgA. Incisional biopsy mandatory for any non-healing indurated ulcer persisting > 3 weeks.", "management": "Topical analgesia/anesthetic gels (Benzocaine/Lidocaine gel). Topical anti-inflammatory: Triamcinolone acetonide 0.1% dental paste applied QID after meals. Antimicrobial mouth rinse (Chlorhexidine 0.2%). Supplement nutritional deficiencies.", "references": ["AAO-HNS Clinical Guidelines on Aphthous Ulcers", "British Dental Association Clinical Reference"]},
         "Inquire about ulcer duration. Inspect ulcer base (firm induration requires biopsy). Screen for tobacco/areca nut use.",
         ["Mouth ulcer persisting for longer than 3 WEEKS without healing (Mandatory Oral Biopsy to rule out Oral Cancer)", "Ulcer accompanied by hard, enlarged, non-tender neck lymph nodes", "Multiple deep painful ulcers accompanied by genital ulcers and eye inflammation (Behcet's Disease)"],
         ["Do NOT ignore a painless or painful mouth ulcer that lasts longer than 3 weeks", "Do NOT use tobacco, gutkha, paan, or supari (primary causes of oral pre-cancer and cancer)"],
         "American Academy of Oral Medicine & British Dental Association", "draft", None),

        ("sed_nosebleeds_epistaxis_first_aid_018", "Nosebleeds First Aid & Epistaxis Management", ["nosebleed", "bleeding nose", "nakseer", "epistaxis", "nose blood first aid", "how to stop nosebleed"],
         [
             "CORRECT FIRST AID TO STOP A NOSEBLEED:",
             "1. Sit upright and LEAN SLIGHTLY FORWARD. (Do NOT tilt your head backwards; tilting backwards causes blood to drain down into your throat and stomach, triggering vomiting and choking).",
             "2. PINCH THE SOFT LOWER PART OF YOUR NOSE (just below the bony bridge) firmly using your thumb and index finger.",
             "3. Hold continuous, uninterrupted pressure for AT LEAST 10 TO 15 FULL MINUTES while breathing calmly through your mouth.",
             "4. Apply an ice pack or cold damp cloth across the bridge of your nose and forehead to constrict blood vessels.",
             "5. After 15 minutes, gently release pressure. Do NOT blow your nose, pick inside, or bend over for several hours to keep the blood clot intact.",
             "SEEK EMERGENCY CARE IF: Bleeding does not stop after 20 minutes of firm direct pressure, bleeding is heavy and flowing down the back of your throat, or if the nosebleed started after a severe head blow."
         ],
         {"assessment": "Epistaxis: Anterior (Kiesselbach's / Little's plexus on anterior septum ~90%) vs Posterior (Sphenopalatine artery ~10%, common in elderly/hypertensive, high airway compromise risk).", "investigations": "Check vital signs (blood pressure), CBC, PT/INR, aPTT if on anticoagulants or frequent recurrent bleeds.", "management": "Firm continuous compression of anterior nasal cartilages for 15 minutes with forward lean. Topical vasoconstrictor (Oxymetazoline or Phenylephrine spray). Chemical cautery with Silver Nitrate (75%) if discrete bleeding vessel visualized on anterior septum. Anterior nasal packing (Rapid Rhino or Merocel) if compression fails. Posterior packing / balloon catheter and hospital admission for posterior bleeds.", "references": ["AAO-HNS Clinical Practice Guideline: Nosebleed (Epistaxis)", "NICE Clinical Knowledge Summaries: Epistaxis"]},
         "Priority: Triage Yellow/Red based on blood loss and hemodynamic stability. Check BP immediately. Ensure patient leans FORWARD.",
         ["Bleeding continuing unabated after 20 minutes of continuous direct pressure", "Posterior bleeding with large volumes of blood pouring down the pharynx", "Nosebleed accompanied by dizziness, pallor, or SBP < 90 mmHg (Hemorrhagic shock)"],
         ["NEVER tilt your head backwards during a nosebleed (causes blood swallowing, vomiting, and airway aspiration)", "Do NOT pack your nose with dry tissue paper or unsterile cotton"],
         "American Academy of Otolaryngology-Head and Neck Surgery (AAO-HNS)", "draft", None),

        ("sed_foreign_body_eye_ear_nose_019", "Foreign Body in Eye, Ear, or Nose First Aid", ["foreign body eye", "something in eye", "object in ear", "child put bead in nose", "dust in eye removal"],
         [
             "FOREIGN OBJECT IN THE EYE (Dust, eyelash, insect):",
             "  - Blink repeatedly in a cup of clean, lukewarm water or flush gently with saline eye drops.",
             "  - Pull the upper eyelid gently down over the lower lid so lower lashes sweep out the particle.",
             "  - NEVER RUB YOUR EYE; rubbing scratches the clear cornea with the sharp particle (corneal abrasion).",
             "  - If a metal fragment, chemical, or sharp object penetrates the eye: do NOT touch it, tape a protective paper cup over the eye, and go to an eye hospital IMMEDIATELY.",
             "CHILD WITH OBJECT IN NOSE (Bead, button battery, pea):",
             "  - Practice the 'Mother's Kiss': cover the clear nostril with a finger, place your mouth over the child's mouth, and deliver a quick puff of air to pop the object out.",
             "  - NEVER use tweezers to blindly poke inside the nose (pushes the object deeper into the breathing airway).",
             "DANGER: BUTTON BATTERIES: If a tiny circular button battery is stuck in the ear or nose, it releases electric current and caustic alkali that destroys tissue within 2 hours; seek EMERGENCY hospital removal immediately."
         ],
         {"assessment": "Foreign body in sensory organ (Corneal/conjunctival foreign body, Aural foreign body, Nasal foreign body). High-risk categories: Button batteries (rapid tissue necrosis), magnetic objects, penetrating intraocular foreign bodies.", "investigations": "Eye: Slit-lamp exam, fluorescein stain with cobalt blue light (demonstrates corneal epithelial defect / Seidel's test for perforation). ENT: Otoscopy, anterior rhinoscopy.", "management": "Superficial ocular FB: Gentle saline irrigation or moist cotton swab under topical anesthesia. Button battery in ear/nose: IMMEDIATE STAT emergency endoscopic extraction. Live insect in ear: Instill mineral oil to suffocate insect before gentle removal.", "references": ["AAO Preferred Practice Patterns: Eye Trauma", "AAO-HNS Clinical Guidance on Pediatric Foreign Bodies"]},
         "Priority: Triage Red if button battery lodged in nose/ear or penetrating eye injury. Keep patient NPO for potential ENT removal under anesthesia.",
         ["Button battery lodged in nose or ear (Emergency tissue liquefactive necrosis within 2 hours)", "Penetrating eye injury with distorted pupil or leaking fluid (STAT Ophthalmology)"],
         ["Do NOT blindly dig inside the ear or nose with tweezers or pins (risks pushing object into lungs or puncturing eardrum)", "Do NOT rub an eye containing a foreign object"],
         "American Academy of Ophthalmology & AAO-HNS Clinical Guidance", "draft", None),

        ("sed_cataract_symptoms_surgery_020", "Cataracts (Safed Motia) & Modern Phaco Surgery", ["cataract", "safed motia", "cloudy eye vision", "cataract surgery", "lens cloudy", "blurry vision old age"],
         [
             "A Cataract is a natural clouding of the clear lens inside your eye, occurring predominantly as a normal part of aging (usually starting after age 55 to 60).",
             "Key signs: Gradual, painless blurring of vision (feeling like looking through a foggy or frosted glass window), colors appearing faded or yellowed, difficulty driving at night due to glare from oncoming headlights, and needing brighter light to read.",
             "Eye drops, exercises, diets, or glasses CANNOT dissolve or cure a cataract; surgery is the only scientifically proven treatment.",
             "When is surgery needed? Cataract surgery is NOT an emergency; you can choose surgery whenever cloudy vision begins to interfere with your daily activities (reading, watching TV, cooking, or driving safely).",
             "Modern Phacoemulsification surgery: A quick, painless, 15-minute outpatient procedure performed under numbing eye drops (no needle injection); an ultrasound probe liquefies the cloudy lens, and a clear foldable Intraocular Lens (IOL) is inserted."
         ],
         {"assessment": "Age-Related Cataract (Nuclear Sclerosis, Cortical, Posterior Subcapsular). Differentiate from Glaucoma, Macular Degeneration, and Diabetic Retinopathy.", "investigations": "Visual acuity, Slit-lamp biomicroscopy after pupillary dilation, Intraocular lens (IOL) power calculation via Optical Biometry (IOLMaster / Lenstar). Dilated fundus examination.", "management": "Definitive curative management: Micro-Incision Cataract Surgery (MICS / Phacoemulsification) with foldable IOL implantation (Monofocal, Toric for astigmatism, or Multifocal/EDOF for spectacle independence) under topical anesthesia. Postoperative care: Topical antibiotic-corticosteroid drops tapered over 4 weeks.", "references": ["AAO Preferred Practice Pattern: Cataract in the Adult Eye", "RCOphth Cataract Surgery Guidelines"]},
         "Verify patient understands surgery is elective based on functional visual goals. Review systemic medications (Alpha-blockers like Tamsulosin cause Intraoperative Floppy Iris Syndrome / IFIS).",
         ["Severe acute eye pain, redness, and rapid vision loss days after cataract surgery (Acute Postoperative Endophthalmitis - STAT Emergency)", "Dense hypermature morgagnian cataract causing phacolytic glaucoma"],
         ["Do NOT purchase unproven OTC eye drops claiming to 'dissolve cataracts'", "Do NOT rub your eye or splash tap water into the eye during the first 2 weeks after surgery"],
         "American Academy of Ophthalmology (AAO) & Royal College of Ophthalmologists", "draft", None)
    ]

    out_sed = []
    for sid, topic, kw, p_ans, doc_a, staff_m, red_f, avoid_l, src, rev_st, rev_by in sed:
        out_sed.append({
            "id": sid,
            "topic": f"Skin, Eye, ENT & Dental: {topic}",
            "category": "skin_eye_ent_dental",
            "keywords": kw,
            "intent": "symptom_first_aid",
            "patient_answer": p_ans,
            "doctor_answer": doc_a,
            "staff_answer": staff_m,
            "red_flags": red_f,
            "follow_up_questions": ["How long have you had this symptom?", "Is there any severe pain, discharge, or changes in vision or hearing?", "Have you applied any creams or drops already?"],
            "avoid": avoid_l,
            "source": src,
            "review_status": rev_st,
            "reviewed_by": rev_by
        })

    return out_sed
