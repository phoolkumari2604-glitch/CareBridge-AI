"""
Child Health (20 entries) and Elderly Care (20 entries) module
"""
def get_child_health():
    ch = [
        ("ch_newborn_danger_signs_001", "Newborn Danger Signs (Immediate Pediatric Emergency)", ["newborn danger signs", "baby emergency signs", "sick newborn", "navjat shishu khatra", "neonate not feeding", "floppy baby"],
         [
             "Rush to a neonatal intensive care unit (NICU) or emergency hospital IMMEDIATELY if your baby (under 28 days old) shows any of these critical signs:",
             "1. Refusal to feed or unable to suck breast milk.",
             "2. Convulsions, seizures, or sudden jerking movements of limbs.",
             "3. Fast breathing (60 or more breaths per minute) or chest drawing in deeply with each breath.",
             "4. High body temperature (fever >= 37.5°C / 99.5°F) or feeling unusually cold (hypothermia < 35.5°C / 95.9°F).",
             "5. Floppy muscle tone, extreme lethargy, or child not waking up for feeds.",
             "6. Yellow jaundice spreading to the palms of the hands and soles of the feet.",
             "7. Pus, redness, or foul smell around the umbilical cord stump."
         ],
         {"assessment": "Neonatal Emergency / Possible Serious Bacterial Infection (PSBI / Neonatal Sepsis). High mortality risk.", "investigations": "Urgent neonatal blood culture, CBC with differential, CRP, micro-ESR, lumbar puncture (CSF analysis), blood glucose, serum bilirubin.", "management": "Immediate neonatal resuscitation. Empirical IV antibiotic therapy for early/late-onset sepsis: IV Ampicillin (50-100 mg/kg/day) + Gentamicin (4-5 mg/kg/day) or Cefotaxime. Warmth (Kangaroo Mother Care / radiant warmer). Respiratory support (CPAP / oxygen).", "references": ["WHO Guidelines on Managing Possible Serious Bacterial Infection (PSBI) in Young Infants", "National Neonatology Forum (NNF) India Protocols"]},
         "Priority: Triage Red (Immediate Neonatal Resuscitation). Place under radiant warmer. Check respiratory rate, heart rate, and capillary blood glucose.",
         ["Unable to suck or feed", "Convulsions or twitching", "Severe chest indrawing or grunting", "Jaundice on palms and soles in the first 24-48 hours", "Umbilical stump draining foul pus with surrounding redness"],
         ["Do NOT delay hospital transfer in a sick newborn (neonatal sepsis can prove fatal within hours)", "Do NOT expose the baby to cold draughts"],
         "World Health Organization (WHO) & National Neonatology Forum (NNF) India", "draft", None),

        ("ch_newborn_care_basics_002", "Essential Newborn Care (Warmth, Cord & Bathing)", ["newborn care", "umbilical cord care baby", "bathing newborn", "navjat shishu dekhbhal", "baby care first month"],
         [
             "Practice Kangaroo Mother Care (KMC) / skin-to-skin contact: place baby directly on mother's bare chest wrapped in warm clothes to prevent hypothermia.",
             "Umbilical cord care: Keep the cord stump clean and completely DRY. Do NOT apply turmeric, oil, powder, or cow dung. The stump will naturally dry and fall off in 7 to 14 days.",
             "Delay the baby's first bath for at least 24 to 48 hours after delivery (and until the cord falls off) to protect the natural protective white skin coating (vernix) and maintain warmth.",
             "Ensure exclusive breastfeeding on demand, both day and night (at least 8 to 12 times in 24 hours).",
             "Check baby's diapers: by day 5, a well-fed baby should have at least 6 pale wet diapers and pass soft yellowish stools daily."
         ],
         {"assessment": "Essential Newborn Care (ENC) assessment per WHO standards.", "investigations": "Daily weight tracking (weight loss should not exceed 7-10% of birth weight; regain birth weight by 10-14 days).", "management": "Thermal protection (warm room, KMC). Dry cord care (chlorhexidine 7.1% application in high neonatal mortality settings per WHO). Exclusive breastfeeding. Administration of Vitamin K1 (1 mg IM) at birth to prevent Vitamin K Deficiency Bleeding (VKDB).", "references": ["WHO Recommendations on Newborn Health: Guidelines on Maternal, Newborn, Child and Adolescent Health", "MoHFW Facility Based Newborn Care (FBNC)"]},
         "Confirm Vitamin K1 administration. Demonstrate proper skin-to-skin positioning and dry cord care to parents.",
         ["Umbilical cord bleeding or surrounding skin becoming bright red and swollen (Omphalitis)", "Severe hypothermia (< 35.5°C) with cold blue hands and feet"],
         ["Do NOT apply turmeric, oil, talcum powder, or ash to the umbilical cord stump", "Do NOT give water, ghutti, or animal milk to a newborn"],
         "World Health Organization (WHO) & Ministry of Health and Family Welfare India", "draft", None),

        ("ch_neonatal_jaundice_003", "Neonatal Jaundice (Peeliya in Newborns)", ["neonatal jaundice", "baby jaundice", "newborn yellow eyes", "phototherapy baby", "jaundice newborn 3 days"],
         [
             "Physiological jaundice is very common: appears on day 2 or 3 of life, peaks around day 4 to 5, and gradually fades on its own by 2 weeks as the baby's liver matures.",
             "Check your baby in bright natural daylight: gently press the baby's forehead or nose; if the skin looks yellow where pressed, jaundice is present.",
             "DANGER SIGN: If jaundice appears within the FIRST 24 HOURS of birth, or spreads down to the baby's abdomen, palms, and soles, seek emergency pediatric evaluation.",
             "Frequent breastfeeding (every 2 to 3 hours) is crucial; breast milk promotes bowel movements that flush bilirubin out in the baby's stool.",
             "Do NOT expose the baby to direct outdoor sunlight (can cause sunburn and dehydration); if bilirubin levels are high, hospital phototherapy under specialized blue medical lights is required."
         ],
         {"assessment": "Neonatal Hyperbilirubinemia (Unconjugated vs Conjugated). Differentiate benign physiological jaundice from pathological hyperbilirubinemia (ABO/Rh incompatibility, G6PD deficiency, sepsis, biliary atresia). Risk of Kernicterus (bilirubin neurotoxicity / choreoathetoid cerebral palsy).", "investigations": "Total and Direct Serum Bilirubin (TSB) plotted on AAP Bhutani Nomogram, Blood type and Direct Antiglobulin Test (DAT / Coombs), CBC with reticulocyte count, G6PD screen.", "management": "Intensive Phototherapy (blue-green light 460-490 nm wavelength) initiated based on hour-specific risk nomograms. Adequate enteral hydration. Exchange Transfusion for acute bilirubin encephalopathy or TSB reaching exchange threshold.", "references": ["AAP Clinical Practice Guideline: Management of Hyperbilirubinemia in the Newborn Infant 35 or More Weeks of Gestation (2022)", "National Neonatology Forum (NNF) India"]},
         "Plot TSB on hour-specific nomogram. Assess cephalocaudal progression (Kramer's zones).",
         ["Jaundice appearing within the first 24 hours of life (always pathological)", "Baby becomes lethargic, has a high-pitched cry, or arches neck/back backwards (Acute Bilirubin Encephalopathy)", "Pale chalky white stools and dark urine (concern for Biliary Atresia)"],
         ["Do NOT place an unclothed baby under harsh outdoor direct sunlight (causes severe hypothermia or thermal burn)", "Do NOT stop breastfeeding"],
         "American Academy of Pediatrics (AAP) Guidelines & NNF India", "draft", None),

        ("ch_developmental_milestones_004", "Child Developmental Milestones (0 to 3 Years)", ["milestones child", "baby milestones", "when does baby walk", "speech delay child", "child development 1 year", "developmental delay"],
         [
             "Key milestones to watch in your baby's first 3 years:",
             "  - 2 to 3 Months: Smiles socially at parents, follows moving objects with eyes, holds head steady.",
             "  - 6 Months: Sits with support, rolls from stomach to back, babbles sounds ('ba-ba', 'ma-ma'), reaches for toys.",
             "  - 9 to 12 Months: Sits independently, crawls, pulls to stand, understands 'no', says single words ('mama', 'dada'), points at objects.",
             "  - 18 Months: Walks independently, drinks from a cup, speaks 6 to 10 words, climbs stairs with help.",
             "  - 2 Years: Runs, kicks a ball, speaks 2-word phrases ('want milk'), follows 2-step instructions.",
             "Every child develops at their own unique pace; however, significant delays in walking, speech, or social eye contact warrant an early pediatric assessment."
         ],
         {"assessment": "Developmental surveillance across four domains: Gross Motor, Fine Motor, Language/Communication, and Personal-Social/Cognitive.", "investigations": "Screen using standardized tools (Ages & Stages Questionnaires [ASQ-3], Denver Developmental Screening Test-II, M-CHAT-R for autism screening at 18 and 24 months).", "management": "Early Intervention Services (physiotherapy, speech therapy, occupational therapy) initiated promptly during periods of maximal neuroplasticity. Audiological evaluation for any speech delay.", "references": ["AAP Developmental Surveillance and Screening Guidelines", "CDC Milestone Tracker Guidance"]},
         "Perform developmental screening using standard milestones chart. Inquire about regression of previously acquired skills.",
         ["Red Flag: Regression or loss of any previously acquired speech, motor, or social skill at any age", "No babbling, pointing, or gestures by 12 months", "No single words by 16 months or no 2-word spontaneous phrases by 24 months", "Not walking independently by 18 months"],
         ["Do NOT take a 'wait and see' approach if a child loses words or eye contact (early intervention is critical)", "Do NOT expose children under 2 years to television or smartphone screens"],
         "American Academy of Pediatrics (AAP) & Centers for Disease Control and Prevention (CDC)", "draft", None),

        ("ch_pediatric_fever_management_005", "Pediatric Fever & Paracetamol Dosing", ["child fever", "baby bukhar", "infant paracetamol dose", "crocin syrup dose", "calpol drops dose", "bachhe ka bukhar"],
         [
             "Fever is your child's natural immune defense fighting an infection, not a disease itself.",
             "Keep the child lightly dressed in a comfortable, airy room; do not wrap them in heavy blankets or woolen sweaters.",
             "Encourage plenty of fluids: breast milk, formula, ORS, or water to prevent dehydration.",
             "Paracetamol Syrup Dosing: Strictly 10 to 15 mg per kg body weight per dose, every 4 to 6 hours as needed (maximum 4 doses in 24 hours). ALWAYS check the strength on the bottle label with a calibrated syringe or measuring cup.",
             "Use a lukewarm damp sponge on the forehead or chest if the child is distressed by high fever; NEVER use cold water, ice, or rubbing alcohol.",
             "SEEK IMMEDIATE PEDIATRIC CARE if: Baby is under 3 months old with any fever (>= 38°C / 100.4°F), baby is unusually sleepy/difficult to wake, has breathing trouble, or develops purple skin spots."
         ],
         {"assessment": "Pediatric Acute Febrile Illness. Risk stratify using NICE Traffic Light system (Green, Amber, Red). Full septic workup mandatory for infants < 3 months.", "investigations": "Infants < 3 months: CBC, blood culture, urinalysis + culture, LP, CXR. Children > 3 months: evaluate for localizing focus (otitis media, tonsillitis, UTI, viral exanthem).", "management": "Oral Paracetamol 15 mg/kg/dose Q4-6H (max 60 mg/kg/day). Alternative: Ibuprofen 5-10 mg/kg/dose (only in infants > 6 months who are well-hydrated). Avoid alternating antipyretics routinely. Antibiotics indicated only for confirmed or highly suspected bacterial focus.", "references": ["NICE Guideline NG143: Fever in under 5s: assessment and initial management", "Indian Academy of Pediatrics (IAP) Guidelines on Fever in Children"]},
         "Weigh the child accurately. Calculate exact Paracetamol mg and mL dose based on weight, not age.",
         ["Age under 3 months with fever >= 38.0°C (100.4°F)", "Non-blanching petechial/purpuric rash (Meningococcal Septicemia Alert - Glass Test Positive)", "Stiff neck, bulging fontanelle, or continuous high-pitched whimpering cry", "Lethargy (child does not look at parents or respond to voice)"],
         ["NEVER give Aspirin to children or teenagers (risk of fatal Reye's Syndrome)", "Do NOT dose pediatric syrups by 'teaspoon' (always use an exact milliliter oral syringe)", "Do NOT use rubbing alcohol or cold ice baths"],
         "NICE Guidelines NG143 & Indian Academy of Pediatrics (IAP)", "draft", None),

        ("ch_febrile_seizures_006", "Febrile Seizures (Fever Fits in Young Children)", ["febrile seizure", "fever fit baby", "child seizure fever", "convulsion fever child", "bukhar me jhatke"],
         [
             "A febrile seizure is a convulsion triggered by a rapid spike in body temperature, occurring in about 3% to 5% of healthy children aged 6 months to 5 years.",
             "WHAT TO DO DURING A SEIZURE (FIRST AID):",
             "  1. Stay calm. Place the child gently on their SIDE in the recovery position on a soft floor to keep their airway clear and prevent choking on saliva or vomit.",
             "  2. Remove nearby sharp, hard, or dangerous objects.",
             "  3. Loosen tight clothing around their neck.",
             "  4. Look at a clock and time the exact duration of the seizure.",
             "WHAT NOT TO DO:",
             "  - NEVER put anything in the child's mouth (no fingers, spoons, water, or onions).",
             "  - Do NOT physically hold down, restrain, or shake the child.",
             "Most febrile seizures stop on their own within 1 to 3 minutes without causing any brain damage. Seek emergency medical care immediately for any first-time seizure or if a seizure lasts longer than 5 minutes."
         ],
         {"assessment": "Simple Febrile Seizure (generalized tonic-clonic, <15 min duration, does not recur within 24h, neurologically normal child) vs Complex Febrile Seizure (focal onset, prolonged >15 min, or recurrent within 24h). Must rule out CNS infection (Meningitis / Encephalitis).", "investigations": "Lumbar puncture indicated if meningeal signs, bulging fontanelle, infants < 12 months with incomplete immunization, or prolonged post-ictal state. Routine EEG and neuroimaging are NOT indicated for simple febrile seizures.", "management": "Acute seizure lasting > 5 minutes: abortive therapy with Intranasal Midazolam (0.2 mg/kg) or rectal Diazepam (0.5 mg/kg). Post-ictal supportive care, antipyretics for comfort, identify and treat source of fever. Reassure parents that simple febrile seizures do not cause brain damage or cognitive impairment.", "references": ["AAP Clinical Practice Guideline: Febrile Seizures: Guideline for the Neurodiagnostic Evaluation of the Child", "IAP Guidelines on Pediatric Seizures"]},
         "Priority: Triage Red if active seizure or post-ictal lethargy. Check airway, position on side, check capillary blood glucose.",
         ["Seizure lasting longer than 5 minutes (Status Epilepticus Risk)", "Child remains unrousable or lethargic for > 1 hour after the seizure stops", "Fever accompanied by neck stiffness, purpuric spots, or bulging fontanelle (Meningitis)"],
         ["NEVER put fingers, spoons, or water into the mouth of a seizing child (causes severe airway obstruction and aspiration)", "Do NOT restrain convulsing limbs"],
         "American Academy of Pediatrics (AAP) & Indian Academy of Pediatrics", "draft", None),

        ("ch_croup_stridor_007", "Croup & Stridor (Barking Seal Cough)", ["croup", "barking cough child", "stridor child", "seal cough", "noisy breathing child", "laryngotracheobronchitis"],
         [
             "Croup is a viral infection that causes swelling around the vocal cords and windpipe, typically in children aged 6 months to 3 years.",
             "Key signs: A distinctive, loud, harsh cough that sounds like a barking seal or dog, a hoarse voice, and symptoms that worsen dramatically in the middle of the night.",
             "Stridor: A high-pitched squeaking or whistling noise heard when the child breathes IN.",
             "Home first aid: Keep the child calm (crying worsens airway swelling). Sit with the child in a steamy bathroom (run hot shower with door closed) for 10 to 15 minutes, or expose them to cool, fresh night air.",
             "SEEK EMERGENCY HOSPITAL CARE IMMEDIATELY if you hear stridor when the child is resting quietly, if the child is struggling to breathe, or if the skin sucks in around the neck or ribs."
         ],
         {"assessment": "Acute Laryngotracheobronchitis (Croup, most commonly Parainfluenza virus types 1 and 2). Score severity using Westley Croup Score (Stridor, Intercostal retractions, Air entry, Cyanosis, Level of consciousness). Must rule out life-threatening Acute Epiglottitis, foreign body aspiration, and bacterial tracheitis.", "investigations": "Clinical diagnosis. Soft tissue neck X-ray ('steeple sign' subglottic narrowing) only if atypical or suspected alternative diagnosis.", "management": "Mild Croup (barking cough, no stridor at rest): Single dose oral Dexamethasone 0.15-0.6 mg/kg. Moderate-to-Severe Croup (stridor at rest, retractions): Oral/IM Dexamethasone 0.6 mg/kg + Nebulized Racemic Epinephrine (or L-epinephrine 1:1000, 0.5 mL/kg up to 5 mL). Observe for >= 2-4 hours post-nebulization for rebound.", "references": ["NICE Clinical Knowledge Summaries: Croup", "AAP Clinical Management of Croup"]},
         "Priority: Triage Orange/Red if stridor at rest or chest indrawing. Keep child calm on parent's lap; avoid distressing procedures like tongue depressors.",
         ["Stridor audible at rest without crying", "Severe chest wall retractions, tracheal tug, or nostril flaring", "Cyanosis (blue lips) or lethargy", "Drooling saliva with high fever and inability to swallow (Epiglottitis Alert - DO NOT examine throat)"],
         ["Do NOT force a tongue depressor into the throat of a child with severe stridor and drooling (can trigger fatal laryngospasm in epiglottitis)", "Do NOT agitate the child"],
         "NICE Guidelines & American Academy of Pediatrics", "draft", None),

        ("ch_acute_otitis_media_child_008", "Ear Infection in Children (Acute Otitis Media)", ["ear infection child", "child earache", "toddler tugging ear", "ear discharge baby", "acute otitis media child"],
         [
             "Acute middle ear infection is very common in infants and toddlers, often developing a few days after a common cold.",
             "Key signs in babies: Tugging or rubbing the ear, excessive crying, unexplained irritability, waking up crying at night, fever, or fluid/pus draining from the ear canal.",
             "Pain relief is the most important first step: give pediatric Paracetamol or Ibuprofen (if child > 6 months) to ease ear pain.",
             "Place a warm, damp cloth against the outside of the ear for 10 minutes to soothe discomfort.",
             "Consult a pediatrician for an ear exam with an otoscope to check if the eardrum is red and bulging; antibiotics may be prescribed if both ears are infected or if the baby is under 2 years old."
         ],
         {"assessment": "Acute Otitis Media (AOM: acute onset of middle ear effusion with tympanic membrane erythema and bulging, most commonly S. pneumoniae, H. influenzae, M. catarrhalis).", "investigations": "Pneumatic Otoscopy (erythematous, opaque, bulging tympanic membrane with decreased mobility).", "management": "Analgesia first-line (Paracetamol / Ibuprofen). Immediate antibiotics (High-dose oral Amoxicillin 80-90 mg/kg/day divided BID for 10 days) indicated for: age < 6 months, severe illness (moderate-severe otalgia, fever >=39°C), bilateral AOM in children < 2 years, or otorrhea. Watchful waiting for 48 hours is acceptable for mild unilateral AOM in children >= 2 years.", "references": ["AAP Clinical Practice Guideline: The Diagnosis and Management of Acute Otitis Media", "IAP Pediatric Guidelines"]},
         "Examine both ears with otoscope. Check for tenderness or swelling behind the ear (mastoid).",
         ["Swelling, redness, and tenderness on the bone directly behind the ear (Acute Mastoiditis Emergency)", "Lethargy with stiff neck (Meningitis complication)", "Facial nerve palsy (drooping corner of mouth on same side)"],
         ["Do NOT put warm oil, garlic juice, or cotton buds into a child's ear canal", "Do NOT instill eardrops if there is fluid draining (suggests eardrum perforation)"],
         "American Academy of Pediatrics (AAP) & Indian Academy of Pediatrics", "draft", None),

        ("ch_colic_crying_baby_009", "Infant Colic & Excessive Crying (The Wessel Rule)", ["infant colic", "baby crying constantly", "evening crying baby", "pet me gas baby", "colic relief"],
         [
             "Infant colic is defined by the 'Rule of Threes': crying for more than 3 hours a day, more than 3 days a week, for at least 3 weeks in an otherwise completely healthy, well-fed baby.",
             "Typically peaks around 6 weeks of age and improves dramatically on its own by 3 to 4 months.",
             "Common signs: Crying intensifies in the late afternoon or evening; the baby clenches their fists, arches their back, and draws their knees up to their abdomen.",
             "Soothing techniques ('The 5 S's'):",
             "  - Swaddling snugly in a light blanket.",
             "  - Side or stomach holding across your forearm (while awake).",
             "  - Shushing white noise (fan, white noise sound, gentle shh in ear).",
             "  - Swinging or gentle rhythmic rocking.",
             "  - Sucking on a clean pacifier or breast.",
             "Burp your baby thoroughly after every feed to release trapped swallowed air."
         ],
         {"assessment": "Infant Colic (benign, self-limiting behavioral phenomenon). Exclude organic causes: corneal abrasion (fluorescein stain), hair tourniquet on digits/penis, incarcerated inguinal hernia, cow's milk protein allergy (CMPA), otitis media, non-accidental trauma.", "investigations": "Comprehensive undressed physical exam (inspect fingers, toes, genitalia, abdomen). Laboratory tests NOT indicated in a thriving baby with normal exam.", "management": "Parental reassurance and education on self-limiting nature. Soothing techniques (swaddling, white noise, motion). Ensure burping. Maternal trial of dairy elimination for 2 weeks if CMPA suspected in breastfed infants. Simethicone drops may be trialed. Assess caregiver exhaustion (counsel on Shaken Baby Syndrome prevention: place baby safely in crib and step away if feeling overwhelmed).", "references": ["AAP Guidance on Infant Colic and Excessive Crying", "NICE Clinical Knowledge Summaries: Colic - infantile"]},
         "Perform full undressed examination: inspect all 10 fingers, toes, and genitalia for hair tourniquets. Check hernias.",
         ["Incarcerated inguinal hernia (hard, tender swelling in the groin)", "Vomiting green bile or passing blood in stool", "Caregiver expressing extreme frustration, rage, or impulse to shake the baby"],
         ["NEVER SHAKE A BABY (violently shaking a crying infant causes fatal brain bleeds and blindness / Shaken Baby Syndrome)", "Do NOT give unverified gripe waters containing alcohol or high sugar"],
         "American Academy of Pediatrics (AAP) & National Health Service (NHS)", "draft", None),

        ("ch_hand_foot_mouth_010", "Hand, Foot, and Mouth Disease (HFMD)", ["hfmd", "hand foot mouth disease", "blisters hands feet baby", "mouth ulcers child", "coxsackievirus child"],
         [
             "Hand, Foot, and Mouth Disease (HFMD) is a common, contagious viral illness caused by Coxsackievirus, mostly affecting children under 5 years.",
             "Key signs: Painful tiny red spots or blisters inside the mouth and on the tongue, accompanied by a non-itchy red rash with small oval blisters on the palms of the hands, soles of the feet, and buttocks.",
             "Children often refuse to eat or drink due to painful mouth ulcers; preventing dehydration is the primary goal.",
             "Offer cold, soothing, non-acidic liquids: cold water, cold milk, curd, fruit purees, or ice cream. Avoid citrus juices and spicy foods that sting.",
             "Give Paracetamol for mouth pain and fever.",
             "Keep the child home from daycare or school until all blisters have dried and fever is gone (usually 7 to 10 days)."
         ],
         {"assessment": "Hand, Foot, and Mouth Disease (Enterovirus genus, predominantly Coxsackievirus A16 and Enterovirus 71 [EV-A71]). Characterized by vesicular stomatitis and papulovesicular exanthem on palms, soles, and buttocks.", "investigations": "Clinical diagnosis. RT-PCR for enterovirus only in atypical or outbreak settings.", "management": "Supportive therapy: Hydration maintenance. Analgesia: Oral Paracetamol or Ibuprofen. Topical oral lidocaine is NOT recommended in young children (aspiration/toxicity risk). Monitor for rare EV-A71 complications (brainstem encephalitis, neurogenic pulmonary edema).", "references": ["CDC Clinical Guidance: Hand, Foot, and Mouth Disease", "WHO A Guide to Clinical Management and Public Health Response for HFMD"]},
         "Check hydration: examine mucous membranes and wet diaper frequency. Inspect throat and palms.",
         ["Signs of dehydration: dry tongue, no tears when crying, no urine for 6 hours", "Neurological red flags (Enterovirus 71): myoclonic jerks, stumbling gait, extreme drowsiness, or rapid breathing"],
         ["Do NOT pop or squeeze the skin blisters (the fluid inside is loaded with virus and spreads infection)", "Do NOT give citrus juices or salty foods that cause severe mouth stinging"],
         "Centers for Disease Control and Prevention (CDC) & World Health Organization", "draft", None),

        ("ch_teething_baby_011", "Teething Symptoms & Safe Soothing in Babies", ["teething", "baby teeth coming", "teething fever", "drooling baby", "teething toys", "baby biting everything"],
         [
             "First teeth (usually the two lower central incisors) typically appear between 4 and 7 months of age.",
             "Normal teething signs: Increased drooling, chewing or gnawing on hard objects, swollen tender gums, mild fussiness, and disturbed sleep.",
             "Safe soothing techniques:",
             "  - Give a firm rubber teething ring or clean chilled (not frozen) washcloth to chew on.",
             "  - Gently massage baby's gums with a clean finger for 1 to 2 minutes.",
             "  - Wipe drool frequently from the chin and neck with a soft cloth to prevent a red drool rash.",
             "TEETHING DOES NOT CAUSE HIGH FEVER OR DIARRHEA: If your baby has a temperature of 38°C (100.4°F) or higher, or persistent watery diarrhea, it is caused by an infection, NOT teething. Consult a doctor."
         ],
         {"assessment": "Deciduous tooth eruption. Characterized by localized gingival swelling, mild localized discomfort, and minor low-grade temperature fluctuations (< 38.0°C).", "investigations": "Oral cavity inspection. If temperature >= 38.0°C or diarrhea: investigate for concurrent viral infection.", "management": "Non-pharmacological soothing: Chilled rubber teething rings, clean finger gum massage. Oral Paracetamol (15 mg/kg) if significant distress. Topical teething gels containing Benzocaine or Lidocaine are STRICTLY CONTRAINDICATED (risk of fatal methemoglobinemia). Homeopathic teething tablets containing belladonna are dangerous and warned against by FDA.", "references": ["AAP Guidelines on Teething and Dental Health", "FDA Drug Safety: Teething Gels and Methemoglobinemia"]},
         "Inspect gingiva for emerging tooth buds. Warn parents against dangerous benzocaine gels.",
         ["Fever >= 38.0°C (100.4°F) - investigate for viral/bacterial infection", "Pale, gray, or blue-colored skin/lips following application of teething gel (Methemoglobinemia Emergency)"],
         ["NEVER use teething gels containing Benzocaine or Lidocaine (causes fatal methemoglobinemia)", "Do NOT use amber teething necklaces (severe strangulation and choking hazard)"],
         "American Academy of Pediatrics (AAP) & FDA Safety Alerts", "draft", None),

        ("ch_choking_pediatric_heimlich_012", "Pediatric Choking First Aid (Infant vs Child Heimlich)", ["choking child", "baby choking", "infant choking first aid", "heimlich baby", "choking first aid toddler"],
         [
             "ACT IMMEDIATELY IF A CHILD IS CHOKING (cannot cough, cannot breathe, cannot cry, or turns blue):",
             "FOR AN INFANT (UNDER 1 YEAR OLD):",
             "  1. Lay the baby face down along your forearm, supporting their jaw with your hand, with the head tilted lower than their chest.",
             "  2. Deliver 5 firm, distinct BACK SLAPS between the shoulder blades using the heel of your hand.",
             "  3. Turn the baby face up along your opposite forearm (supporting head) and deliver 5 QUICK CHEST THRUSTS in the center of the chest using 2 fingers.",
             "  4. Repeat cycle of 5 back slaps and 5 chest thrusts until the object pops out or the baby starts breathing.",
             "FOR A CHILD OVER 1 YEAR (HEIMLICH MANEUVER):",
             "  - Stand or kneel behind the child. Wrap arms around their waist.",
             "  - Make a fist with one hand, place thumb-side just above their belly button.",
             "  - Grasp your fist with other hand and pull sharply inward and upward with quick abdominal thrusts.",
             "If the child becomes unconscious: Call 112 immediately and begin CPR (30 chest compressions, check mouth, 2 rescue breaths)."
         ],
         {"assessment": "Foreign body airway obstruction (FBAO) in pediatric population. Acute airway emergency.", "investigations": "Clinical recognition. Avoid imaging if acute complete obstruction.", "management": "Infant (<1y): Alternating 5 back blows and 5 chest thrusts. Child (>1y): Subdiaphragmatic abdominal thrusts (Heimlich maneuver). If unresponsiveness supervenes: immediately commence pediatric cardiopulmonary resuscitation (CPR); look in oropharynx before rescue breaths and remove object ONLY if clearly visualized (no blind finger sweeps).", "references": ["AHA Guidelines for CPR and ECC: Pediatric Basic Life Support", "Resuscitation Council UK Pediatric FBAO Guidelines"]},
         "Immediate Code Red / Airway Emergency. Demonstrate 5 back slaps / 5 chest thrusts for infants.",
         ["Complete airway obstruction: inability to make any sound, silent coughing, blue cyanosis around lips", "Loss of consciousness / cardiac arrest"],
         ["NEVER perform blind finger sweeps in a child's throat (pushes object deeper into the airway)", "NEVER perform abdominal Heimlich thrusts on an infant under 1 year old (damages liver/spleen)"],
         "American Heart Association (AHA) & Resuscitation Council UK", "draft", None),

        ("ch_diaper_rash_013", "Diaper Rash Prevention & Treatment (Napkin Dermatitis)", ["diaper rash", "nappy rash", "rash in diaper area", "red bottom baby", "potty rash baby"],
         [
             "Change wet or soiled diapers immediately; prolonged contact with acidic urine and stool enzymes is the main cause of diaper dermatitis.",
             "At every diaper change, gently clean the area using warm water and a soft cotton cloth or fragrance-free, alcohol-free wipes.",
             "Pat the skin gently dry; never rub or scrub irritated baby skin.",
             "Allow plenty of 'diaper-free time' every day: let your baby lie on an open mat without a diaper for 15 to 30 minutes to let fresh air heal the skin naturally.",
             "Apply a thick protective barrier cream containing Zinc Oxide or plain petroleum jelly (Vaseline) with every diaper change to seal moisture away from the skin.",
             "If the rash is bright fiery red with small red dots (satellite lesions) in the skin folds, it is likely a fungal yeast infection requiring an antifungal cream (like Clotrimazole) prescribed by a doctor."
         ],
         {"assessment": "Diaper Dermatitis: Irritant Contact Dermatitis (spares inguinal creases) vs Candidal Diaper Dermatitis (involves inguinal folds with bright red erythema and satellite pustules/papules).", "investigations": "Clinical inspection. KOH mount if refractory.", "management": "ABCDE protocol: Air (diaper-free time), Barrier (thick Zinc Oxide paste or white petrolatum with every change), Cleansing (gentle water, pat dry), Diaper (frequent changes Q2-3H, superabsorbent gel diapers), Education. If Candidal infection: Topical Antifungal (Clotrimazole 1% or Miconazole 2% cream BID under barrier paste for 7-10 days). Hydrocortisone 1% short-term (max 2-3 days) only for severe inflammation.", "references": ["AAP Guidelines on Diaper Dermatitis", "NICE Clinical Knowledge Summaries: Diaper Rash"]},
         "Inspect inguinal skin creases to distinguish irritant dermatitis (creases spared) from Candida (creases involved).",
         ["Skin blistering, open oozing sores, or yellow pus crusts (Secondary bacterial Impetigo)", "Diaper rash accompanied by fever"],
         ["Do NOT use scented wipes, alcohol wipes, or harsh soaps", "Do NOT use potent topical steroid creams (Betamethasone, Clobetasol) on diaper skin (causes severe adrenal suppression and skin thinning)"],
         "American Academy of Pediatrics (AAP) & British Association of Dermatologists", "draft", None),

        ("ch_pediatric_asthma_wheezing_014", "Wheezing & Asthma in Young Children", ["child wheezing", "baby wheezing", "child asthma", "toddler wheezing cold", "whistling chest baby"],
         [
             "Wheezing is a high-pitched musical whistling sound produced when narrowed, inflamed bronchial airways vibrate during exhalation.",
             "In young children under 3 years, wheezing is most frequently triggered by viral respiratory colds (such as RSV or rhinovirus).",
             "If your child has prescribed rescue inhaler (Salbutamol / Asthalin): ALWAYS administer it using a child-sized spacer with a tight-fitting silicone face mask.",
             "Administer 2 to 4 puffs (one puff at a time into the spacer, allowing the child to breathe 5 to 6 times into the mask after each puff).",
             "SEEK EMERGENCY HOSPITAL CARE IMMEDIATELY if: Your child's chest draws in deeply under the ribs (retractions), nostrils flare with each breath, child is too breathless to speak or drink, or lips turn blue."
         ],
         {"assessment": "Viral-Induced Wheeze (episodic) vs Multi-Trigger Wheeze / Pediatric Bronchial Asthma. Score respiratory distress (Pediatric Respiratory Assessment Measure / PRAM score).", "investigations": "Pulse oximetry, CXR only if suspected foreign body aspiration, focal consolidation, or pneumothorax.", "management": "Short-acting beta-2 agonist (Salbutamol 100 mcg MDI via spacer with mask: 2-6 puffs Q20 min for 1 hour depending on severity). Systemic corticosteroids (Oral Prednisolone 1-2 mg/kg for 3 days) for moderate-severe exacerbations. If recurrent: daily low-dose Inhaled Corticosteroid (ICS Budesonide/Fluticasone) or Montelukast.", "references": ["Global Initiative for Asthma (GINA) - Children 5 Years and Younger", "British Thoracic Society (BTS) Pediatric Asthma Guideline"]},
         "Priority: Triage Orange/Red if chest indrawing, tachypnea, or SpO2 < 92%. Check spacer technique.",
         ["Silent chest (breath sounds absent due to extreme airway closure - Imminent Respiratory Arrest)", "SpO2 < 90% on room air", "Inability to speak, cry, or feed due to extreme breathlessness", "Exhaustion, drowsiness, or cyanosis"],
         ["NEVER administer inhaler puffs directly into a young child's mouth without a spacer and mask (almost zero medicine reaches lungs)", "Do NOT give over-the-counter cough syrups to young children"],
         "Global Initiative for Asthma (GINA) & British Thoracic Society", "draft", None),

        ("ch_bedwetting_enuresis_015", "Bedwetting in Children (Nocturnal Enuresis)", ["bedwetting", "nocturnal enuresis", "child peeing in bed", "bistar gila karna", "bedwetting 6 years"],
         [
             "Bedwetting (Nocturnal Enuresis) is completely involuntary; children do NOT wet the bed out of laziness, spite, or bad behavior.",
             "It is very common: about 15% of 5-year-olds and 5% of 10-year-olds regularly wet the bed, often because their bladder capacity is developing slowly or their brain does not yet wake them up from deep sleep.",
             "Helpful home steps:",
             "  - Encourage regular water drinking throughout the day, but limit large fluid drinks in the 2 hours before bedtime.",
             "  - Avoid caffeine-containing drinks (chocolate milk, sodas, iced teas) in the evening.",
             "  - Make sure your child empties their bladder right before climbing into bed.",
             "  - Place a waterproof mattress protector on the bed and keep a nightlight on so the child can reach the bathroom easily.",
             "NEVER punish, tease, shame, or scold a child for wetting the bed; frustration and shame only worsen anxiety and delay bladder maturation."
         ],
         {"assessment": "Monosymptomatic Enuresis (nighttime bedwetting only in a child >= 5 years without daytime symptoms) vs Non-Monosymptomatic (associated daytime incontinence, urgency, frequency, constipation).", "investigations": "Urinalysis with dipstick (rule out UTI, glycosuria for diabetes mellitus, proteinuria). Bowel history (chronic constipation is a leading treatable cause).", "management": "Behavioral interventions and motivational therapy. Enuresis Alarm (most effective long-term conditioning therapy; 60-80% success). Pharmacotherapy (Desmopressin / DDAVP melt/tablets at bedtime) for rapid short-term control (camps, sleepovers) or alarm failures. Treat coexisting constipation aggressively with laxatives.", "references": ["ICCS (International Children's Continence Society) Standardization and Guidelines", "NICE Guideline CG111: Bedwetting in under 19s"]},
         "Check for daytime urinary accidents, frequency, and chronic constipation. Reassure family.",
         ["New-onset secondary bedwetting after being dry for > 6 months accompanied by excessive thirst and weight loss (Screen for Type 1 Diabetes Mellitus)", "Daytime incontinence with painful burning urination (UTI)"],
         ["NEVER punish or shame a child for bedwetting (it is an involuntary maturation delay)", "Do NOT restrict water severely during the day"],
         "International Children's Continence Society (ICCS) & NICE CG111", "draft", None),

        ("ch_pediatric_constipation_016", "Constipation & Soiling in Children (Encopresis)", ["child constipation", "toddler hard stool", "bachhe ko kabz", "pain pooping child", "holding stool child", "encopresis"],
         [
             "Childhood constipation often starts after a single painful hard bowel movement: the child becomes scared of pain and actively holds their stool in, creating a vicious cycle of larger, harder stools.",
             "Increase daily fiber: give whole fruits with skins, oats, lentils, prunes, papayas, and vegetables.",
             "Ensure adequate water and clear fluids throughout the day.",
             "Establish a regular toilet sitting routine: have your child sit comfortably on the toilet for 5 to 10 minutes after morning and evening meals.",
             "Provide a footstool under their feet so their knees are bent higher than their hips (squatting posture facilitates smooth bowel passage).",
             "Consult a pediatrician: gentle osmotic stool softeners (like Polyethylene Glycol / PEG powder or Lactulose) are safe, non-habit forming, and needed for several months to allow the stretched rectum to heal."
         ],
         {"assessment": "Functional Constipation (Rome IV Criteria). Differentiate functional stool withholding from organic etiologies (Hirschsprung disease, celiac disease, cystic fibrosis, spinal dysraphism).", "investigations": "Digital rectal exam only if red flags. Abdominal X-ray NOT routinely recommended. Screen for Hirschsprung if delayed passage of meconium (>48 hours of birth) or severe failure to thrive.", "management": "Two-phase therapy: 1. Disimpaction: High-dose oral Polyethylene Glycol (PEG 3350 with electrolytes 1-1.5 g/kg/day for 3-6 days). 2. Maintenance: PEG 0.4-0.8 g/kg/day for a minimum of 2-6 months to prevent relapse. Toilet training postprandial routine with foot support.", "references": ["ESPGHAN/NASPGHAN Guidelines for the Evaluation and Treatment of Functional Constipation in Children", "NICE Guideline CG99"]},
         "Review meconium passage history (>48h red flag for Hirschsprung). Emphasize long-term stool softener compliance.",
         ["History of delayed meconium passage (> 48 hours after birth) with abdominal distension and bilious vomiting (Hirschsprung Disease)", "Blood in stool with weight loss", "Abnormal sacral dimple or hair tuft on lower back (Spina Bifida Occulta)"],
         ["Do NOT stop stool softener medicine as soon as the child passes one soft stool (causes immediate withholding relapse; must continue for months)", "Do NOT use repeated invasive enemas without doctor guidance"],
         "ESPGHAN/NASPGHAN Guidelines & NICE Guideline CG99", "draft", None),

        ("ch_vaccine_schedule_india_uip_017", "Complete Child Vaccination Schedule (India UIP & IAP)", ["child vaccination schedule", "baby vaccine chart india", "uip schedule", "which vaccine when baby", "tika chart", "immunization schedule"],
         [
             "Summary of India's Universal Immunization Programme (UIP) Schedule:",
             "  - At Birth: BCG (left arm), OPV Zero dose (oral drops), and Hepatitis B birth dose (left thigh).",
             "  - 6 Weeks: Pentavalent-1 (left thigh), OPV-1 (oral), Rotavirus-1 (oral), fIPV-1 (right arm), and PCV-1 (right thigh).",
             "  - 10 Weeks: Pentavalent-2 (left thigh), OPV-2 (oral), and Rotavirus-2 (oral).",
             "  - 14 Weeks: Pentavalent-3 (left thigh), OPV-3 (oral), Rotavirus-3 (oral), fIPV-2 (right arm), and PCV-2 (right thigh).",
             "  - 9 Months: MR-1 (Measles-Rubella, right arm), PCV Booster (right thigh), JE-1 (in endemic districts), and Vitamin A oral dose.",
             "  - 16 to 24 Months: MR-2 (right arm), DPT 1st Booster (left thigh), OPV Booster, JE-2, and Vitamin A.",
             "  - 5 to 6 Years: DPT 2nd Booster (left upper arm).",
             "  - 10 & 16 Years: Td Vaccine (upper arm).",
             "Keep your baby's Mother & Child Protection (MCP) card safe; vaccines are available free of charge at all public health centers."
         ],
         {"assessment": "Immunization status verification and surveillance according to Government of India UIP and IAP ACVIP recommendations.", "investigations": "Audit MCP card / digital CoWIN/U-WIN immunization registry records.", "management": "Administer age-appropriate vaccines per schedule. Maintain cold chain (2-8°C). Educate parents on expected mild fever, Paracetamol dosing, and next appointment date.", "references": ["Universal Immunization Programme (UIP), MoHFW India", "IAP Advisory Committee on Vaccines and Immunization Practices (ACVIP)"]},
         "Review U-WIN / MCP card. Verify batch numbers and expiry. Record next appointment clearly.",
         ["Severe anaphylaxis following previous dose of any vaccine", "Progressive untreated neurological disease (defer pertussis)"],
         ["Do NOT skip scheduled vaccines due to a minor runny nose or low-grade sniffles", "Do NOT discard immunization cards"],
         "Ministry of Health and Family Welfare (MoHFW) India & IAP", "draft", None),

        ("ch_rsv_bronchiolitis_infants_018", "Bronchiolitis in Infants (RSV Infection)", ["bronchiolitis", "rsv baby", "infant chest congestion", "rapid breathing baby", "respiratory syncytial virus infant"],
         [
             "Bronchiolitis is a viral chest infection of the tiny breathing tubes (bronchioles) in infants under 2 years old, most commonly caused by Respiratory Syncytial Virus (RSV).",
             "Begins like a common cold (stuffy nose, sneezing, mild fever), followed after 2 to 3 days by rapid breathing, wheezing, and a persistent wet cough.",
             "Symptoms typically peak on days 4 to 5 before gradually improving over 1 to 2 weeks.",
             "Home care: Clear baby's nose with saline nasal drops before feeds, offer frequent smaller feeds, and keep baby upright after feeding.",
             "ANTIBIOTICS AND COUGH MEDICINES DO NOT WORK against viral bronchiolitis and should NOT be given.",
             "SEEK IMMEDIATE EMERGENCY CARE if: Baby breathes very rapidly (>50-60 breaths/min), chest draws in under ribs, baby grunts, stops feeding, or lips turn bluish."
         ],
         {"assessment": "Acute Viral Bronchiolitis (RSV ~75%, rhinovirus, metapneumovirus). Characterized by airway edema, mucus plug formation, and bronchiolar necrosis.", "investigations": "Clinical diagnosis. Nasopharyngeal swab for viral PCR / rapid RSV antigen if hospitalized. CXR indicated only if severe atypical course or suspicion of pneumothorax.", "management": "Mainstay is supportive care: Hydration maintenance (frequent small feeds, NG tube, or IV fluids) and Oxygen therapy targeting SpO2 >= 90-92%. Routine bronchodilators (Salbutamol), systemic corticosteroids, and antibiotics are NOT recommended per AAP guidelines due to lack of efficacy. High-Flow Nasal Cannula (HFNC) or CPAP for respiratory fatigue.", "references": ["AAP Clinical Practice Guideline: The Diagnosis, Management, and Prevention of Bronchiolitis", "NICE Guideline NG9: Bronchiolitis in children"]},
         "Priority: Triage Orange/Red if SpO2 < 92%, RR > 60/min, or chest retractions. Check hydration.",
         ["Apnea episodes (baby pauses breathing for > 15-20 seconds - common in young infants with RSV)", "SpO2 < 90% on room air", "Grunting respirations or central cyanosis", "Unable to feed or retaining less than 50% of fluids"],
         ["Do NOT give oral antibiotics for uncomplicated viral bronchiolitis", "Do NOT give over-the-counter decongestants or cough suppressants"],
         "American Academy of Pediatrics (AAP) & NICE Guidelines NG9", "draft", None),

        ("ch_adenoids_tonsils_snoring_019", "Enlarged Adenoids, Tonsils & Mouth Breathing in Children", ["adenoids", "child snoring", "mouth breathing child", "enlarged tonsils child", "sleep apnea child", "child sleeping with mouth open"],
         [
             "Adenoids are immune gland tissues located high up behind the nose and above the roof of the mouth; when enlarged from recurring colds or allergies, they block nasal airflow.",
             "Key signs: Child sleeps with mouth wide open, snores loudly, breathes noisily during the day, speaks with a nasal voice ('nasal twang'), and has frequent ear infections.",
             "Pediatric Sleep Apnea: If your child snores loudly, gasps for air, tosses and turns restlessly, or pauses breathing for a few seconds during sleep, their airway is significantly obstructed.",
             "Untreated chronic adenoid enlargement can lead to daytime sleepiness, poor school concentration, bedwetting, and long-term facial bone changes ('adenoid facies').",
             "Consult an ENT specialist: treatments range from steroid nasal sprays and allergy management to gentle surgical removal (adenotonsillectomy)."
         ],
         {"assessment": "Adenotonsillar Hypertrophy causing Pediatric Obstructive Sleep Apnea (OSA) / Upper Airway Resistance Syndrome.", "investigations": "Lateral soft tissue neck radiograph (evaluates nasopharyngeal airway column). Overnight Polysomnography (sleep study: gold standard for pediatric OSA; Apnea-Hypopnea Index [AHI] >= 1 is abnormal in children). Audiometry (screen for otitis media with effusion).", "management": "Mild symptoms: Trial of Intranasal Corticosteroid spray (Fluticasone/Mometasone) +/- Montelukast for 6-12 weeks. Moderate-to-severe OSA (AHI >= 5 or tonsillar hypertrophy with failure to thrive/enuresis): Adenotonsillectomy is first-line curative surgery.", "references": ["AAP Clinical Practice Guideline: Diagnosis and Management of Childhood Obstructive Sleep Apnea Syndrome", "AAO-HNS Clinical Practice Guideline: Tonsillectomy in Children"]},
         "Assess for mouth breathing, hyponasal speech, and observe breathing during nap. Inquire about daytime hyperactivity or sleepiness.",
         ["Frequent witnessed breathing pauses (apnea > 10 seconds) during sleep accompanied by gasping or choking", "Pectus excavatum (chest wall caving in from chronic airway obstruction)"],
         ["Do NOT ignore chronic loud snoring in a child (sleep apnea impairs brain growth and school performance)", "Do NOT use adult snoring devices in children"],
         "American Academy of Pediatrics (AAP) & AAO-HNS Guidelines", "draft", None),

        ("ch_cow_milk_protein_allergy_020", "Cow's Milk Protein Allergy (CMPA) in Infants", ["cmpa", "cows milk allergy baby", "milk protein allergy infant", "blood in baby poop cmpa", "formula allergy baby"],
         [
             "Cow's Milk Protein Allergy (CMPA) is an immune reaction to the proteins found in cow's milk, affecting both formula-fed and exclusively breastfed infants (when mother consumes dairy).",
             "Common symptoms:",
             "  - Digestive: Blood or mucus streaks in baby's soft stools, frequent vomiting, severe painful colic, or chronic diarrhea.",
             "  - Skin: Eczema, itchy red patches, or hives.",
             "  - Respiratory: Wheezing, chronic runny nose, or coughing.",
             "For exclusively breastfed babies: The mother completely eliminates all dairy products (milk, curd, ghee, paneer, butter, cheese, whey) from her diet for 2 to 4 weeks.",
             "For formula-fed babies: Switch to a doctor-prescribed Extensively Hydrolyzed Formula (eHCF) or Amino Acid formula where proteins are broken down into tiny, non-allergic pieces.",
             "Most children outgrow cow's milk protein allergy by 1 to 3 years of age."
         ],
         {"assessment": "Cow's Milk Protein Allergy (IgE-mediated vs Non-IgE mediated Food Protein-Induced Allergic Proctocolitis / Enteropathy / FPIES).", "investigations": "Clinical diagnosis based on elimination-challenge trial. Skin Prick Test / serum specific IgE for IgE-mediated reactions. Stool occult blood.", "management": "Strict dietary elimination of all bovine milk proteins. In breastfed infants: maternal dairy elimination with Calcium (1000 mg) and Vitamin D supplementation. In formula-fed: Extensively Hydrolyzed Formula (eHCF) first-line; Amino Acid-based Formula (AAF) for severe anaphylaxis or eHCF failure. Avoid soy formula before 6 months. Re-challenge under pediatric supervision at 12 months to assess tolerance.", "references": ["ESPGHAN Guidelines for the Diagnosis and Management of Cow's Milk Protein Allergy in Infants", "BSACI Guidelines for the Management of Egg and Cow's Milk Allergy"]},
         "Inquire about microscopic or visible blood in stool. Verify weight gain trajectory.",
         ["Severe acute projectile vomiting, lethargy, and hypovolemic shock occurring 2 hours after milk ingestion (Food Protein-Induced Enterocolitis Syndrome / FPIES)", "Anaphylactic respiratory wheezing or facial angioedema"],
         ["Do NOT switch to goat's milk or sheep's milk (over 90% cross-reactivity with cow's milk proteins)", "Do NOT use plain soy milk for young infants under 6 months"],
         "ESPGHAN Guidelines & British Society for Allergy and Clinical Immunology (BSACI)", "draft", None)
    ]

    out_ch = []
    for cid, topic, kw, p_ans, doc_a, staff_m, red_f, avoid_l, src, rev_st, rev_by in ch:
        out_ch.append({
            "id": cid,
            "topic": f"Child Health: {topic}",
            "category": "child_health",
            "keywords": kw,
            "intent": "chronic_condition_guidance",
            "patient_answer": p_ans,
            "doctor_answer": doc_a,
            "staff_answer": staff_m,
            "red_flags": red_f,
            "follow_up_questions": ["What is the child's exact age and weight?", "How long have these symptoms been present?", "Is the child drinking liquids and passing wet diapers normally?"],
            "avoid": avoid_l,
            "source": src,
            "review_status": rev_st,
            "reviewed_by": rev_by
        })

    return out_ch


def get_elderly_care():
    el = [
        ("eld_fall_prevention_001", "Fall Prevention & Home Safety in Older Adults", ["elderly falls", "fall prevention", "senior falling down", "chakkar girna", "elderly balance", "prevent falls seniors"],
         [
             "Falls are the leading cause of hip fractures, head bleeds, and loss of independence in older adults, but most falls are preventable.",
             "Home safety modifications:",
             "  - Remove loose throw rugs, floor mats, and clutter from walking pathways.",
             "  - Install sturdy grab bars beside the toilet and inside the shower/bathing area.",
             "  - Ensure bright lighting in hallways, stairwells, and bedrooms; use nightlights.",
             "  - Wear non-skid, well-fitting footwear with rubber soles; avoid walking in loose socks or smooth-soled slippers.",
             "Have your doctor review all medications: sleeping pills, sedatives, and blood pressure medications frequently cause morning dizziness and sudden drops in blood pressure.",
             "Engage in balance and strength exercises (such as Tai Chi or simple heel-to-toe walking) to maintain leg stability."
         ],
         {"assessment": "Comprehensive Fall Risk Assessment (CDC STEADI protocol: Stopping Elderly Accidents, Deaths, & Injuries). Evaluate intrinsic risk factors (neuropathy, visual impairment, orthostasis, cognitive impairment) and extrinsic factors (environmental hazards).", "investigations": "Timed Up and Go (TUG) test (>12 seconds indicates high fall risk), Orthostatic vital signs (lying/standing 3 min), 30-Second Chair Stand test, 4-Stage Balance Test, Visual acuity testing.", "management": "Multifactorial intervention: Physical therapy for gait and balance training. Medication reconciliation (deprescribe Beers Criteria sedatives, anticholinergics). Environmental safety audit. Vitamin D supplementation (800-1000 IU/day). Cataract surgery referral.", "references": ["CDC STEADI Algorithm for Fall Risk Screening", "AGS/BGS Clinical Practice Guideline for Prevention of Falls in Older Persons"]},
         "Perform Timed Up and Go (TUG) test and check orthostatic blood pressure (lying and 3 min standing).",
         ["Inability to stand or bear weight on hip after a fall with outward rotation of leg (Femoral Neck / Hip Fracture)", "Head trauma on blood thinners (Urgent CT Brain for Subdural Hematoma)"],
         ["Do NOT walk in dark rooms at night without switching on a light", "Do NOT climb on stools or ladders to reach high cupboards"],
         "CDC STEADI Guidelines & American Geriatrics Society (AGS)", "draft", None),

        ("eld_dementia_alzheimers_care_002", "Dementia & Alzheimer's Care & Warning Signs", ["dementia", "alzheimers", "memory loss elderly", "bhulne ki bimari", "senior confusion", "dementia care"],
         [
             "Dementia is NOT a normal part of aging; it is a progressive medical condition caused by brain cell damage (most commonly Alzheimer's disease).",
             "Key warning signs:",
             "  - Memory loss that disrupts daily life (forgetting recently learned info, asking the same question repeatedly).",
             "  - Difficulty completing familiar everyday tasks (getting lost driving to familiar places, forgetting how to cook a routine meal).",
             "  - Confusion with time or location (not knowing what year it is or where they are).",
             "  - Misplacing items in bizarre places (putting a wristwatch in the refrigerator) and unable to retrace steps.",
             "  - Changes in mood, personality, or withdrawal from social conversations.",
             "Caregiver guidance: Maintain a calm, structured daily routine, speak in short simple sentences, avoid arguing or correcting them aggressively, and ensure their living environment is secure to prevent wandering."
         ],
         {"assessment": "Major Neurocognitive Disorder (Dementia: Alzheimer's Disease, Vascular Dementia, Lewy Body Dementia, Frontotemporal Dementia). Differentiate from Delirium (acute, fluctuating, inattention) and Depression (Pseudodementia).", "investigations": "Mini-Mental State Exam (MMSE) or Montreal Cognitive Assessment (MoCA). Reversible dementia workup: Serum TSH, Vitamin B12, Serum Calcium, RPR/VDRL, Renal/Liver function, Brain MRI/CT (cerebral atrophy, hippocampal volume, white matter ischemic changes).", "management": "Cholinesterase inhibitors (Donepezil 5-10 mg daily, Rivastigmine, Galantamine) for mild-to-moderate Alzheimer's. NMDA receptor antagonist (Memantine 10-20 mg daily) for moderate-to-severe. Non-pharmacological behavioral management for agitation (dementia-friendly routines, music, redirection). Avoid typical antipsychotics and anticholinergics.", "references": ["APA Practice Guideline on the Treatment of Patients With Alzheimer's Disease", "NICE Guideline NG97: Dementia: assessment, management and support"]},
         "Administer MoCA or Mini-Cog screening. Check for safety, wandering risk, and caregiver burnout.",
         ["Acute sudden onset of confusion, hallucinations, or agitation over hours/days (Delirium - investigate for acute infection/UTI)", "Wandering away from home and unable to recall identity"],
         ["Do NOT argue, shame, or confront a dementia patient over forgotten memories", "Do NOT use sedatives or chemical restraints without specialist geriatric psychiatric review"],
         "American Psychiatric Association (APA) & NICE Guideline NG97", "draft", None),

        ("eld_polypharmacy_beers_003", "Polypharmacy & Medication Safety in Seniors (Beers Criteria)", ["polypharmacy", "too many medicines elderly", "beers criteria", "medication safety seniors", "drug review elderly"],
         [
             "Polypharmacy (taking 5 or more daily medications) is common in seniors and significantly increases the risk of dangerous drug interactions, dizziness, falls, and kidney impairment.",
             "Physiological aging changes: Older kidneys and livers clear medicines much slower, meaning normal adult doses can easily become toxic in seniors.",
             "The AGS Beers Criteria lists medications that are potentially inappropriate for seniors (such as strong sleeping pills, first-generation antihistamines, muscle relaxants, and daily NSAIDs).",
             "Conduct a 'Brown Bag Medication Review': bring all your prescription bottles, over-the-counter pills, vitamins, and herbal tonics in a bag to your doctor once a year to de-prescribe unnecessary pills.",
             "Use a weekly pill organizer box (pillbox with morning/noon/night compartments) to prevent accidentally taking double doses."
         ],
         {"assessment": "Comprehensive Geriatric Medication Review and Deprescribing Assessment. Screen for adverse drug events (ADEs), drug-drug interactions, and medication non-adherence.", "investigations": "Calculated Creatinine Clearance (Cockcroft-Gault equation reflects geriatric renal dosing better than eGFR). Serum electrolytes, LFTs, therapeutic drug levels (digoxin, lithium, phenytoin).", "management": "Apply AGS Beers Criteria (2023 Update) and STOPP/START criteria. Deprescribe unnecessary or high-risk medications (Benzodiazepines, 'Z-drugs', tricyclic antidepressants, first-generation antihistamines, long-term PPIs without indication, sliding scale insulin). Simplify dosing regimens to once daily when possible.", "references": ["AGS Beers Criteria for Potentially Inappropriate Medication Use in Older Adults (2023 Update)", "STOPP/START Criteria for Potentially Inappropriate Medications in Older People (Version 3)"]},
         "Perform brown-bag medication audit. Check Cockcroft-Gault CrCl for renal dosage adjustments.",
         ["New onset of confusion, falls, or severe urinary retention following a newly prescribed drug", "Co-prescription of multiple sedative or anticholinergic drugs"],
         ["Do NOT take over-the-counter sleep aids (like Diphenhydramine/Cetzine) for insomnia (causes severe confusion, urinary retention, and falls)", "Do NOT share medications with spouses"],
         "American Geriatrics Society (AGS) Beers Criteria & British Geriatrics Society", "draft", None),

        ("eld_pressure_ulcers_bedsores_004", "Pressure Ulcers & Bedsores Prevention (Braden Scale)", ["bedsores", "pressure ulcer", "pressure sore", "lying in bed wounds", "khat ke chhale", "decubitus ulcer"],
         [
             "Pressure ulcers (bedsores) develop when prolonged pressure cuts off blood circulation to skin over bony areas (tailbone, hips, heels, elbows) in bedridden or wheelchair-bound seniors.",
             "CRUCIAL RULE: Reposition and turn the bedridden person at least once every 2 HOURS day and night (use a clock schedule: right side, back, left side).",
             "Use a specialized pressure-relieving air mattress (alternating pressure mattress) or ripple mattress to redistribute body weight.",
             "Keep skin clean and dry: clean immediately after urine or stool leakage using mild no-rinse cleanser, and apply a moisture barrier cream (Zinc Oxide).",
             "Inspect skin daily: look for non-blanching red spots (Stage 1 bedsore: skin stays red when pressed); early intervention prevents deep open wounds.",
             "Ensure high-protein nutrition and adequate hydration to support tissue elasticity and wound healing."
         ],
         {"assessment": "Pressure Injury Staging (National Pressure Injury Advisory Panel - NPIAP: Stage 1 non-blanchable erythema, Stage 2 partial thickness, Stage 3 full thickness, Stage 4 bone/tendon exposed, Unstageable, Deep Tissue Injury). Assess risk using Braden Scale for Predicting Pressure Sore Risk (score <= 12 indicates high risk).", "investigations": "Wound measurement (length, width, depth, undermining, tunneling). Wound tissue biopsy/culture only if spreading cellulitis or systemic signs. Prealbumin / Albumin to evaluate nutritional status.", "management": "Pressure redistribution: Q2H repositioning schedule, 30-degree lateral tilt, pressure-relieving dynamic air mattress, heel suspension boots. Wound dressing based on exudate: Hydrocolloid or foam dressings for Stage 2; Alginates/hydrogels for Stage 3-4. Surgical debridement of necrotic eschar/slough. High-protein nutritional supplementation (1.25-1.5 g/kg/day).", "references": ["NPIAP/EPUAP/PPPIA Prevention and Treatment of Pressure Ulcers/Injuries: Clinical Practice Guideline", "WOCN Clinical Practice Guideline for Pressure Injuries"]},
         "Calculate Braden Scale score upon admission. Ensure Q2H turning schedule and inspect sacrum and heels daily.",
         ["Foul-smelling pus drainage, spreading warmth/redness, or black necrotic tissue around a sore (Sepsis/Osteomyelitis Alert)", "Unstageable deep ulcer exposing bone or tendon"],
         ["Do NOT massage red bony prominences (damages compromised deep capillary beds)", "Do NOT use donut-shaped ring cushions (concentrates pressure and worsens venous congestion)"],
         "National Pressure Injury Advisory Panel (NPIAP) & European Pressure Ulcer Advisory Panel (EPUAP)", "draft", None),

        ("eld_osteoporosis_fragility_005", "Fragility Fractures & Bone Protection in Seniors", ["fragility fracture", "elderly broken hip", "seniors weak bones", "osteoporosis seniors", "elderly bone health"],
         [
             "A fragility fracture is a broken bone that occurs from a minor mechanical force that would not normally break a bone (such as a fall from standing height or even coughing/bending).",
             "The three most common sites are the hip (femoral neck), spine (vertebrae), and wrist (Colles' fracture).",
             "Hip fractures in seniors are a major medical crisis; half of older adults who break a hip never regain their prior mobility.",
             "Ensure daily Calcium (1200 mg total via diet and supplements) and Vitamin D3 (800 to 1000 IU daily) to support bone strength.",
             "Consult a geriatrician or endocrinologist for bone-strengthening medications (Bisphosphonates e.g. Zoledronic Acid injection once yearly, or Teriparatide) to actively rebuild bone density.",
             "Address home fall hazards and take physical therapy for gait stabilization."
         ],
         {"assessment": "Post-Fragility Fracture Evaluation & Secondary Fracture Prevention. Calculate 10-year major osteoporotic fracture probability using FRAX tool. Presence of a fragility fracture confirms osteoporosis regardless of DEXA T-score.", "investigations": "DEXA scan of hip and spine, Thoracolumbar spine X-rays (screen for silent vertebral compression fractures), Serum Calcium, Phosphate, Alkaline Phosphatase, 25-OH Vitamin D, Serum Creatinine, SPEP.", "management": "Initiate anti-resorptive or anabolic therapy: IV Zoledronic acid 5 mg yearly, Denosumab 60 mg SC Q6M, or Teriparatide for high-risk vertebral fractures. Ensure Calcium 1200 mg/day and Vitamin D 800-2000 IU/day. Coordinate orthogeriatric co-management for acute hip fracture repair within 24-48 hours.", "references": ["Fragility Fracture Network (FFN) Clinical Guidelines", "AACE/ACE Postmenopausal Osteoporosis Guidelines"]},
         "Initiate secondary fracture prevention for all patients presenting with low-trauma fractures. Review DEXA.",
         ["Acute inability to bear weight with shortened and externally rotated leg after a fall (Femoral Neck Fracture - STAT Orthopedics)", "Acute severe back pain following minor bend (Vertebral Compression Fracture)"],
         ["Do NOT discharge a senior after a fracture without initiating anti-osteoporosis therapy (the risk of a second fracture is highest within 12 months)", "Do NOT delay hip surgery beyond 48 hours"],
         "Fragility Fracture Network (FFN) & International Osteoporosis Foundation", "draft", None),

        ("eld_urinary_incontinence_006", "Urinary Incontinence in Older Adults", ["elderly urine leakage", "senior incontinence", "peshab nikal jana elderly", "incontinence seniors", "bladder control elderly"],
         [
             "Urinary leakage is NOT an inevitable consequence of aging; it is a treatable medical condition.",
             "Types of incontinence in seniors:",
             "  - Stress Incontinence: Leakage during coughing, sneezing, laughing, or lifting.",
             "  - Urge Incontinence (Overactive Bladder): Sudden, uncontrollable urge to urinate with leakage before reaching the toilet.",
             "  - Overflow Incontinence: Frequent dribbling of urine due to an overfilled bladder that cannot empty completely (common in men with enlarged prostate).",
             "  - Functional Incontinence: Physical mobility issues or arthritis making it difficult to reach the bathroom in time.",
             "Pelvic floor exercises (Kegel exercises) strengthen the muscles supporting the bladder and improve control.",
             "Schedule regular bathroom visits every 2 to 3 hours during the day rather than waiting for an urgent sensation."
         ],
         {"assessment": "Urinary Incontinence in the Elderly. Use DIAPPERS mnemonic for transient treatable causes (Delirium, Infection [UTI], Atrophic vaginitis, Pharmaceuticals, Psychological, Excess urine output, Restricted mobility, Stool impaction).", "investigations": "Urinalysis and culture (rule out UTI), Post-Void Residual (PVR) volume via ultrasound (PVR > 200 mL suggests retention/overflow), Serum Creatinine, PSA in men, Pelvic/Prostate exam.", "management": "Behavioral therapy (timed voiding, bladder training, pelvic floor muscle training). Treat underlying constipation and UTI. Urge incontinence: Beta-3 agonist (Mirabegron 25-50 mg daily; preferred over anticholinergics in elderly due to lower dementia/confusion risk). BPH with overflow: Alpha-blocker (Tamsulosin 0.4 mg) +/- 5-ARI (Finasteride).", "references": ["EAU Guidelines on Urinary Incontinence", "AGS Clinical Practice Guideline on Incontinence in Older Adults"]},
         "Check post-void residual volume before starting bladder relaxants. Screen for reversible causes (UTI, constipation).",
         ["Palpable painful bladder with complete inability to urinate (Acute Urinary Retention Emergency)", "Gross painless blood in urine (Hematuria - requires cystoscopy for bladder cancer rule-out)"],
         ["Do NOT use anticholinergic bladder medications (Oxybutynin) in elderly with cognitive impairment (worsens dementia and causes delirium)", "Do NOT stop drinking water (causes concentrated urine that irritates the bladder)"],
         "European Association of Urology (EAU) & American Geriatrics Society", "draft", None),

        ("eld_delirium_acute_confusion_007", "Acute Delirium vs Chronic Dementia (Sudden Confusion)", ["delirium", "sudden confusion elderly", "acute confusion senior", "overnight confusion senior", "hallucinations elderly sudden"],
         [
             "Delirium is a SUDDEN, severe change in mental function that develops over hours or days, characterized by confusion, fluctuating alertness, disorientation, and hallucinations.",
             "DEMENTIA vs DELIRIUM: Dementia develops slowly over years; Delirium strikes abruptly over hours or days and is a MEDICAL EMERGENCY caused by an underlying physical illness.",
             "Common triggers of sudden delirium in older adults:",
             "  - Silent urinary tract infection (UTI) or chest pneumonia.",
             "  - Severe dehydration or electrolyte imbalance (low sodium).",
             "  - Constipation / severe stool impaction.",
             "  - Starting a new medication or drug interaction.",
             "  - Uncontrolled pain or recent surgery.",
             "Seek immediate medical emergency hospital care for any sudden change in mental status; treating the underlying infection or medical trigger usually reverses the delirium."
         ],
         {"assessment": "Delirium (Acute confusional state with fluctuating course, inattention, disorganized thinking, and altered level of consciousness). Use Confusion Assessment Method (CAM: requires features 1 and 2, plus either 3 or 4). Etiologies: I WATCH DEATH mnemonic (Infection, Withdrawal, Acute metabolic, Trauma, CNS pathology, Hypoxia, Deficiencies, Endocrinopathies, Acute vascular, Toxins/drugs, Heavy metals).", "investigations": "Urgent vitals, fingerstick glucose, CBC, Urinalysis + culture, Serum Electrolytes (Na, K, Ca), BUN, Creatinine, ABG/SpO2, 12-lead ECG, CXR, review medication administration record.", "management": "Identify and aggressively treat underlying medical etiology. Non-pharmacological environmental interventions: frequent reorientation, family presence, visible clocks/calendars, maintain sleep-wake cycle, early mobilization, hydration. Avoid physical restraints (increases agitation and injury). Reserve low-dose Haloperidol (0.5-1 mg) or Quetiapine strictly for severe agitation threatening patient safety.", "references": ["NICE Guideline CG103: Delirium: diagnosis, prevention and management", "AGS Clinical Practice Guideline for Postoperative Delirium"]},
         "Priority: Triage Red/Orange. Administer CAM tool. Check fingerstick glucose, urine dipstick, and oxygen saturation immediately.",
         ["Acute delirium with fever, stiff neck, or focal neurological deficit", "Severe combative agitation risking self-harm or pulling lines"],
         ["Do NOT assume sudden confusion is 'just old age or worsening dementia' (delirium is an acute medical emergency)", "Do NOT physically tie down or restrain a delirious senior"],
         "NICE Clinical Guideline CG103 & American Geriatrics Society (AGS)", "draft", None),

        ("eld_orthostatic_hypotension_008", "Orthostatic (Postural) Hypotension & Dizziness", ["orthostatic hypotension", "dizziness on standing seniors", "postural hypotension", "head spinning standing up", "bp drops standing"],
         [
             "Orthostatic hypotension is a significant drop in blood pressure that occurs when you stand up from sitting or lying down, causing blood to pool in the legs.",
             "Symptoms: Lightheadedness, feeling faint, dizziness, blurry vision, or unsteadiness within 3 minutes of standing up.",
             "Safe standing habits:",
             "  - Take your time: sit on the edge of the bed for 1 to 2 minutes before standing up in the morning.",
             "  - Pump your feet and flex your calf muscles a few times before rising to push pooled blood back up to your heart.",
             "  - Drink a full glass of water before getting out of bed.",
             "  - Sleep with the head of the bed slightly elevated (10 degrees).",
             "  - Wear graduated knee-high or thigh-high compression stockings to keep blood circulating.",
             "Have your doctor review your blood pressure and prostate medications; doses often need reduction in warm weather or with aging."
         ],
         {"assessment": "Orthostatic (Postural) Hypotension (sustained reduction of SBP >= 20 mmHg or DBP >= 10 mmHg within 3 minutes of standing or 60-degree head-up tilt). Differentiate neurogenic (Parkinson's, autonomic failure) from non-neurogenic (hypovolemia, antihypertensives, vasodilators, tricyclics).", "investigations": "Orthostatic vitals (supine for 5 min, then standing at 1 and 3 min). 12-lead ECG, CBC (anemia), Serum Electrolytes and BUN/Creatinine (dehydration).", "management": "Review and de-escalate culprit medications (diuretics, alpha-blockers, vasodilators). Non-pharmacological: fluid intake 2-2.5 L/day, abdominal binders, waist-high compression stockings, physical counter-maneuvers (leg crossing, calf pumping). Pharmacological (for refractory neurogenic OH): Midodrine (alpha-1 agonist 2.5-10 mg TID), Fludrocortisone (0.1-0.2 mg daily), or Droxidopa.", "references": ["AAN/EFNS Consensus Statement on the Definition of Orthostatic Hypotension", "ESC Guidelines for the Diagnosis and Management of Syncope"]},
         "Measure supine BP after 5 min rest, then standing BP at 1 min and 3 min. Record pulse response.",
         ["Syncope (complete loss of consciousness upon standing) with head strike", "Profound orthostatic drop with SBP < 70 mmHg"],
         ["Do NOT leap out of bed abruptly", "Do NOT take hot showers right before standing for long periods (heat dilates veins and worsens pooling)"],
         "American Academy of Neurology (AAN) & European Society of Cardiology", "draft", None),

        ("eld_constipation_fecal_impaction_009", "Chronic Constipation & Fecal Impaction in Seniors", ["elderly constipation", "senior cannot poop", "fecal impaction", "hard stool elderly", "overflow diarrhea elderly"],
         [
             "Chronic constipation is very common in seniors due to slower intestinal motility, reduced fluid intake, low mobility, and medications (iron pills, painkillers, calcium channel blockers).",
             "Ensure adequate daily water intake (at least 6 to 8 glasses); older adults frequently drink too little water out of fear of urinary incontinence.",
             "Eat natural laxative fruits: papayas, prunes, figs (anjeer), and cooked green vegetables.",
             "Take a daily gentle walk to physically stimulate bowel contractions.",
             "CRITICAL WARNING (Fecal Impaction): When hard stool becomes completely stuck in the rectum, watery liquid stool can leak around the blockage, appearing like diarrhea ('overflow diarrhea'). Giving anti-diarrhea pills in this situation is dangerous.",
             "Consult a doctor: gentle daily osmotic laxatives (like Lactulose syrup 15-30 mL or Polyethylene Glycol) are safe and effective for long-term use in seniors."
         ],
         {"assessment": "Chronic Functional Constipation vs Fecal Impaction in the Geriatric Patient. Screen for Medication-Induced Constipation (Opioids, Calcium Channel Blockers, Anticholinergics, Iron) and secondary metabolic disorders (Hypothyroidism, Hypercalcemia).", "investigations": "Digital Rectal Examination (DRE mandatory to evaluate for hard fecal impaction in rectal vault). Plain abdominal radiograph only if bowel obstruction suspected. Serum Calcium, TSH, electrolytes.", "management": "Fecal Impaction: Manual disimpaction or oil-retention enemas followed by clearing enemas. Chronic Maintenance: Osmotic laxatives first-line (Polyethylene Glycol 17 g/day or Lactulose 15-30 mL/day). Bulk-forming agents (psyllium) used with caution in frail elderly (risk of impaction if fluid intake inadequate). Peripheral mu-opioid receptor antagonists (Methylnaltrexone) for opioid-induced constipation.", "references": ["AGA Clinical Practice Guideline on Constipation", "British Geriatrics Society Guidance on Constipation in Older People"]},
         "Perform digital rectal examination before treating mysterious diarrhea in bedbound seniors. Check hydration.",
         ["Complete bowel obstruction: severe abdominal distension, vomiting, and absence of stool and flatus (Surgical Emergency)", "Fecal impaction causing urinary retention by compressing bladder neck"],
         ["Do NOT give Loperamide (Imodium) for watery leakage in a constipated senior (worsens life-threatening fecal impaction)", "Do NOT use stimulant laxatives (Senna/Dulcolax) daily for long periods without medical advice"],
         "American Gastroenterological Association (AGA) & British Geriatrics Society", "draft", None),

        ("eld_insomnia_sleep_hygiene_010", "Sleep Changes & Insomnia in Older Adults", ["elderly insomnia", "senior cannot sleep", "sleep problems in old age", "sleeping pills seniors", "neend na aana elderly"],
         [
             "It is normal for sleep architecture to shift with age: seniors experience lighter sleep, more frequent nighttime awakenings, and earlier evening sleepiness with earlier morning waking.",
             "However, chronic inability to sleep or extreme daytime exhaustion is NOT normal and should be evaluated.",
             "Healthy sleep hygiene for seniors:",
             "  - Get 30 minutes of natural outdoor morning sunlight daily to synchronize your circadian clock.",
             "  - Maintain fixed bedtimes and wake-up times, even on weekends.",
             "  - Limit daytime naps to 20 to 30 minutes in the early afternoon; avoid long evening naps.",
             "  - Stop drinking tea, coffee, and sodas after 3 PM.",
             "  - Keep fluids modest after dinner to minimize waking up for the bathroom at night.",
             "STRICT WARNING ON SLEEPING PILLS: Prescription sleeping pills (like Zolpidem, Alprazolam, Clonazepam) are hazardous for seniors; they double the risk of nighttime falls, hip fractures, memory confusion, and car accidents."
         ],
         {"assessment": "Late-Life Insomnia. Evaluate contributing comorbidities: Obstructive Sleep Apnea, Restless Legs Syndrome (RLS), Nocturia, Chronic Musculoskeletal Pain, GERD, and Dementia (Sundowning).", "investigations": "Sleep diary. Screen for OSA (STOP-BANG questionnaire). Review medication administration timing (diuretics, bronchodilators, corticosteroids).", "management": "First-line: Cognitive Behavioral Therapy for Insomnia (CBT-I: sleep restriction, stimulus control). Address underlying pain and nocturia. Sleep hygiene optimization. Non-pharmacological bright light therapy. Avoid Benzodiazepines and Z-drugs (AGS Beers Criteria - high risk of delirium and fractures). Low-dose Melatonin (1-3 mg 2h before bedtime) can be trialed.", "references": ["American Academy of Sleep Medicine (AASM) Clinical Practice Guideline for Chronic Insomnia", "AGS Beers Criteria for Potentially Inappropriate Medications"]},
         "Screen for nighttime falls and nocturia. Warn strongly against benzodiazepine sleeping pills.",
         ["Loud snoring with witnessed breathing pauses and daytime sleepiness (Obstructive Sleep Apnea - CPAP indicated)", "Severe daytime sleepiness leading to motor vehicle accidents"],
         ["Do NOT take over-the-counter sleep aids containing antihistamines (Diphenhydramine causes acute confusion and urinary retention)", "Do NOT rely on daily benzodiazepines (addictive and doubles hip fracture risk)"],
         "American Academy of Sleep Medicine (AASM) & American Geriatrics Society", "draft", None),

        ("eld_hearing_vision_loss_011", "Age-Related Hearing Loss (Presbycusis) & Vision Changes", ["hearing loss elderly", "presbycusis", "senior hard of hearing", "cataract elderly", "hearing aid seniors"],
         [
             "Age-related hearing loss (Presbycusis) develops gradually in both ears, especially making high-pitched sounds and speech in noisy rooms difficult to understand.",
             "Untreated hearing and vision loss significantly accelerate cognitive decline, social isolation, depression, and fall risk in older adults.",
             "How family members can communicate effectively:",
             "  - Face the person directly at eye level in good lighting before speaking.",
             "  - Speak clearly and at a moderate pace; do NOT shout (shouting distorts words and raises pitch).",
             "  - Reduce background noise: turn off the television or radio during conversations.",
             "Get hearing tested by an audiologist; modern digital hearing aids are discreet, comfortable, and keep the brain socially engaged.",
             "Annual eye checkups: Screen for cataracts (curable with simple outpatient surgery), glaucoma (the silent thief of sight), and age-related macular degeneration."
         ],
         {"assessment": "Sensory Deprivation in Geriatrics: Presbycusis (bilateral symmetric high-frequency sensorineural hearing loss), Age-Related Macular Degeneration (AMD), Cataracts, Glaucoma, Diabetic Retinopathy.", "investigations": "Whisper voice test, Pure Tone Audiometry, Automated refractometry, Slit-lamp biomicroscopy, Tonometry (intraocular pressure), Dilated fundoscopy.", "management": "Presbycusis: Hearing aid evaluation and fitting, assistive listening devices, communication strategy counseling. Vision: Cataract phacoemulsification with intraocular lens (IOL) implantation, anti-VEGF injections for wet AMD, topical IOP-lowering drops for glaucoma.", "references": ["WHO World Report on Hearing", "AAO Preferred Practice Patterns: Vision Rehabilitation"]},
         "Face patient directly when speaking. Speak at lower pitch and moderate pace. Check for impacted cerumen (earwax).",
         ["Sudden unilateral hearing loss over hours (Sudden Sensorineural Hearing Loss - Medical Emergency requiring urgent steroids)", "Sudden loss of vision or severe eye pain with rainbow halos (Acute Angle-Closure Glaucoma Emergency)"],
         ["Do NOT dismiss hearing loss as 'unimportant old age' (treating hearing loss is the single largest modifiable risk factor to prevent dementia)", "Do NOT clean ears with cotton swabs or hairpin instruments"],
         "World Health Organization (WHO) & American Academy of Ophthalmology", "draft", None),

        ("eld_sarcopenia_nutrition_012", "Sarcopenia (Muscle Wasting) & Frailty in Seniors", ["sarcopenia", "muscle loss elderly", "senior weak legs", "frailty syndrome", "muscle wasting old age"],
         [
             "Sarcopenia is the progressive loss of skeletal muscle mass, strength, and physical function that occurs with aging.",
             "Key signs: Walking noticeably slower, difficulty rising from a chair without using armrests, struggling to open jars, or frequent trips and stumbles.",
             "Protein is vital: Older adults require MORE protein per kilogram than younger adults (at least 1.0 to 1.2 grams of protein per kg body weight daily) to maintain muscle.",
             "Include protein at every meal: eggs, paneer, curd, lentils, tofu, chicken, or fish.",
             "Progressive resistance exercises (strength training): Doing chair stands, wall push-ups, light dumbbell lifts, and climbing stairs 2 to 3 times a week directly signals your muscles to rebuild.",
             "Combine protein intake with exercise: having a protein-rich snack (like milk or curd) within 1 hour after strength exercises maximizes muscle protein synthesis."
         ],
         {"assessment": "Sarcopenia (EWGSOP2 consensus: Low muscle strength [confirmed by handgrip <27 kg men, <16 kg women], Low muscle quantity/quality [DEXA appendicular lean mass], Low physical performance [gait speed <= 0.8 m/s]). Fried's Frailty Phenotype (weight loss, exhaustion, low physical activity, slowness, weakness; >=3 confirms frailty).", "investigations": "Handgrip dynamometry, 5-times Sit-to-Stand chair test, 4-meter gait speed, Bioelectrical Impedance Analysis (BIA) or DEXA body composition.", "management": "Structured progressive resistance training (PRT) 2-3 sessions/week. High-protein nutritional prescription: 1.2-1.5 g/kg/day (with >=2.5-3g leucine per meal to stimulate mTOR pathway). Vitamin D supplementation targeting serum levels >= 30 ng/mL. Avoid prolonged bed rest during acute illnesses.", "references": ["European Working Group on Sarcopenia in Older People (EWGSOP2) Consensus", "International Clinical Practice Guidelines for Sarcopenia (ICFSR)"]},
         "Measure handgrip strength and 4-meter gait speed. Assess chair stand ability.",
         ["Severe acute functional decline where senior becomes completely bedbound within days (evaluate for occult infection or stroke)", "Rapid unintentional weight loss > 5%"],
         ["Do NOT advise healthy seniors to 'just rest in bed' (bed rest causes rapid, irreversible muscle wasting in older adults)", "Do NOT restrict protein in older adults without severe end-stage renal failure"],
         "European Working Group on Sarcopenia (EWGSOP2) & ICFSR Guidelines", "draft", None),

        ("eld_dehydration_seniors_013", "Dehydration Risk & Fluid Balance in Elderly", ["elderly dehydration", "senior dehydration", "water intake elderly", "sunken eyes elderly", "dehydration confusion seniors"],
         [
             "Older adults are at exceptionally high risk for dangerous dehydration because aging blunts the brain's thirst sensation: seniors do NOT feel thirsty even when their body is dangerously low on water.",
             "Age-related kidney changes also make it harder for the kidneys to concentrate urine and conserve water.",
             "Warning signs of dehydration in seniors:",
             "  - Sudden confusion, delirium, or drowsiness.",
             "  - Dark amber or strong-smelling urine; reduced urine frequency.",
             "  - Dry mouth, cracked lips, and dry tongue.",
             "  - Low blood pressure upon standing, leading to falls.",
             "Fluid routine: Do NOT wait to feel thirsty. Schedule fluids throughout the day: drink 1 glass of water, buttermilk, clear soup, or herbal tea every 2 hours while awake (aiming for 1.5 to 2 liters daily, unless your heart/kidney doctor has set a fluid restriction)."
         ],
         {"assessment": "Dehydration in the Elderly: Water-Loss Dehydration (hypertonic, intracellular fluid deficit due to inadequate intake) vs Solute/Volume Depletion (hypotonic, extracellular fluid loss from diarrhea/vomiting/diuretics).", "investigations": "Serum Osmolality (calculated or measured; >300 mOsm/kg indicates dehydration), Serum Sodium, BUN-to-Creatinine ratio (>20:1 suggests pre-renal azotemia), Urine specific gravity.", "management": "Mild-to-moderate: Oral rehydration with water, oral rehydration solutions, broths, distributed throughout waking hours. Severe dehydration / hypovolemic shock: IV 0.9% Normal Saline or 5% Dextrose in water (D5W) based on serum sodium. In dementia patients: structured prompted fluid schedules and offering preferred beverages.", "references": ["ESPEN Guideline on Clinical Nutrition and Hydration in Geriatrics", "British Geriatrics Society Guidelines on Hydration"]},
         "Check mucous membranes, axillary moisture (dry axillae is a reliable sign in elderly), and BUN/Creatinine ratio.",
         ["Severe hypernatremia (Sodium > 150 mEq/L) with lethargy or coma", "Systolic BP < 85 mmHg with cold clammy extremities (Hypovolemic Shock)"],
         ["Do NOT rely on skin turgor pinch on the back of the hand in seniors (inaccurate due to natural loss of skin elasticity; check turgor over sternum or clavicle)", "Do NOT wait for the elderly person to ask for water"],
         "European Society for Clinical Nutrition and Metabolism (ESPEN) & BGS", "draft", None),

        ("eld_depression_loneliness_014", "Geriatric Depression, Loneliness & Social Isolation", ["elderly depression", "senior sadness", "depression in old age", "loneliness seniors", "elderly mental health", "senior crying alone"],
         [
             "Depression is NOT a normal part of aging; it is a treatable medical illness.",
             "Depression in older adults often looks different than in young adults: instead of crying or expressing sadness, seniors often present with unexplained physical aches, extreme fatigue, memory complaints ('pseudodementia'), irritability, or loss of interest in hobbies.",
             "Major contributing factors include bereavement (loss of spouse or friends), living alone, loss of physical independence, chronic pain, and retirement.",
             "Supportive steps for families:",
             "  - Maintain regular, meaningful contact: daily phone calls, video calls, and family visits.",
             "  - Encourage participation in community senior centers, walking clubs, or spiritual groups.",
             "  - Assist with gentle daily outdoor morning walks.",
             "Consult a geriatrician or psychiatrist: counseling and modern, safe antidepressant medications (SSRIs like Sertraline or Escitalopram) can dramatically restore energy, joy, and independence."
         ],
         {"assessment": "Late-Life Depression (LLD). Screen using Geriatric Depression Scale (GDS-15; score >= 5 suggests depression). Differentiate from early dementia (Pseudodementia features: patient complains extensively of memory failure, 'I don't know' responses, whereas true dementia patients minimize deficits).", "investigations": "GDS-15 score, PHQ-9, TSH, Vitamin B12, Serum Electrolytes, Brain MRI/CT to evaluate vascular depression / white matter hyperintensities.", "management": "Psychotherapy (CBT, Problem-Solving Therapy). Pharmacotherapy: SSRIs (Sertraline 25-100 mg daily or Escitalopram 5-10 mg daily) preferred due to safety and low anticholinergic burden. Avoid Tricyclic Antidepressants (TCAs) in elderly due to cardiac conduction defects and anticholinergic delirium risk. Social prescribing and community engagement.", "references": ["APA Practice Guideline for the Treatment of Patients With Major Depressive Disorder in Late Life", "WHO Mental Health of Older Adults"]},
         "Administer GDS-15 screening tool. Screen specifically for suicide risk (older men have highest completed suicide rates).",
         ["Expressed desire to die, giving away possessions, or self-neglect (stopping life-saving medications)", "Severe weight loss from refusing food"],
         ["Do NOT dismiss chronic depressive withdrawal as 'normal old age personality'", "Do NOT prescribe Amitriptyline or heavy tricyclic antidepressants to seniors"],
         "American Psychiatric Association (APA) & World Health Organization", "draft", None),

        ("eld_osteoarthritis_mobility_aids_015", "Mobility Aids & Safe Walking (Canes, Walkers & Wheelchairs)", ["walking stick elderly", "walker for seniors", "mobility aids", "how to use a cane", "crutch senior"],
         [
             "Using a walking stick (cane) or walker maintains balance, prevents catastrophic falls, and relieves pressure off painful arthritic hips and knees.",
             "HOW TO USE A WALKING STICK (CANE) CORRECTLY:",
             "  - Hold the cane in the hand OPPOSITE to your painful or weak leg (if your right knee hurts, hold the cane in your LEFT hand).",
             "  - Move the cane forward simultaneously with the bad leg, so the cane bears weight together with the weak leg.",
             "  - Proper height adjustment: Stand tall with arms hanging naturally; the top handle of the cane should reach the crease of your WRIST (elbow should be slightly bent at about 15-20 degrees).",
             "HOW TO USE A WALKER:",
             "  - Push the walker forward a short step, step into it with the weaker leg first, then follow with the stronger leg.",
             "  - Stay inside the walker frame; do not let the walker run too far ahead of your body.",
             "Check rubber tips (ferrules) on the bottom of canes and walkers regularly; replace worn, smooth rubber immediately to prevent slipping."
         ],
         {"assessment": "Mobility and Assistive Device Assessment for Geriatric Gait Instability. Match device to functional deficit (Single-point cane for mild unilateral weakness; Quad cane for broader base; Rolling walker [rollator] for endurance/bilateral weakness; Standard walker for maximal stability).", "investigations": "Gait assessment, functional reach test, environmental home assessment.", "management": "Physical therapy prescription for assistive device measurement and gait training. Cane height sizing (handle at level of greater trochanter / wrist crease with 20-30 degree elbow flexion). Contralateral cane sequencing (cane advances with affected limb). Inspect device integrity and replace non-skid rubber ferrules.", "references": ["American Academy of Orthopaedic Surgeons (AAOS) Guidelines on Mobility Aids", "CDC STEADI Clinical Practice Guidance"]},
         "Verify proper sizing of cane/walker (handle at wrist crease). Inspect bottom rubber tips for wear.",
         ["Using a cane on the wrong side (ipsilateral use increases joint load and destabilizes gait)", "Severe ataxia or bilateral leg weakness using single cane (requires stable walker)"],
         ["Do NOT hold the cane on the same side as the painful leg (drastically destabilizes gait)", "Do NOT lean your entire body weight over the front of a rolling walker"],
         "American Academy of Orthopaedic Surgeons (AAOS) & CDC STEADI", "draft", None),

        ("eld_hypothermia_hyperthermia_016", "Temperature Regulation in Seniors (Hypothermia & Heat Stroke)", ["elderly hypothermia", "senior heat stroke", "temperature regulation seniors", "cold weather elderly danger", "heat wave seniors"],
         [
             "Aging significantly impairs your body's ability to regulate temperature: older adults produce less body heat, have reduced skin blood flow, sweat less efficiently, and do not perceive temperature drops accurately.",
             "WINTER HYPOTHERMIA WARNING: Seniors can develop hypothermia indoors even in rooms at 15°C to 18°C (60°F to 65°F).",
             "  - Dress in warm multiple layers (trapped air insulates better than one thick sweater).",
             "  - Wear warm woolen socks and a warm cap indoors (significant heat is lost from the scalp).",
             "  - Keep living rooms and bedrooms heated to at least 20°C (68°F).",
             "SUMMER HEAT STROKE WARNING: Older adults do not sweat easily, leading to rapid heat illness.",
             "  - Stay indoors during peak afternoon sun in air-conditioned or well-ventilated rooms.",
             "  - Drink plenty of water and cool fluids; do not wait for thirst.",
             "Signs of hypothermia in seniors include confusion, slurred speech, slow breathing, cold pale skin, and sluggish movements (shivering may be absent in frail seniors)."
         ],
         {"assessment": "Thermoregulatory Impairment in Geriatrics. Vulnerability to Accidental Hypothermia (core temp < 35°C / 95°F) and Non-Exertional Classic Heat Stroke (core temp > 40°C / 104°F with CNS dysfunction).", "investigations": "Low-reading core rectal thermometer (standard thermometers miss hypothermia <34°C). 12-lead ECG (Osborn J waves, prolonged intervals in hypothermia; tachycardia/arrhythmias in heat stroke). Electrolytes, BUN, creatinine, CPK.", "management": "Hypothermia: Passive external rewarming (warm blankets, warm room >=24°C) + Active external rewarming (forced-air warming blankets) + Warm humidified oxygen and warmed IV fluids (38-42°C). Heat Stroke: Immediate active evaporative and convective cooling (lukewarm water mist and fans), cold IV crystalloids, discontinue anticholinergics/diuretics.", "references": ["CDC Guidelines on Environmental Hypothermia and Heat Stress in Older Adults", "WHO Health Advice on Cold and Heat Waves"]},
         "Use low-reading core thermometer if hypothermia suspected. Check room temperature and heating.",
         ["Core temperature < 32°C with stupor, bradycardia, or coma (Severe Hypothermia Emergency)", "Core temperature > 40°C with delirium, seizures, or hot dry skin (Heat Stroke Emergency)"],
         ["Do NOT rely on shivering to detect hypothermia in frail seniors (shivering response is often absent)", "Do NOT use electric heating pads directly on bare skin (causes severe thermal burns due to thin skin and reduced sensation)"],
         "Centers for Disease Control and Prevention (CDC) & World Health Organization", "draft", None),

        ("eld_driving_safety_017", "Driving Safety & When to Hang Up the Keys in Seniors", ["elderly driving safety", "senior driving assessment", "when should elderly stop driving", "driving with dementia", "elderly car accidents"],
         [
             "Driving provides independence, but age-related visual changes, slower reaction times, cognitive slowing, and arthritis can make driving hazardous.",
             "Warning signs that it is time to limit or stop driving:",
             "  - Getting lost in familiar, routine neighborhoods.",
             "  - Denting the car, scraping walls while parking, or frequent close calls.",
             "  - Difficulty seeing traffic signals, reading street signs, or judging distance at night.",
             "  - Confusing the accelerator and brake pedals, or slow reaction to sudden stops.",
             "  - Getting honked at frequently or family members feeling unsafe as passengers.",
             "Transition steps: Start by avoiding night driving, driving in heavy rain, or driving on high-speed highways. Explore family carpools, local community transport, and ride-hailing apps to preserve social independence without driving risks."
         ],
         {"assessment": "Medical Fitness to Drive Evaluation in Older Drivers (American Geriatrics Society / NHTSA Clinical Guide). Evaluate vision, cognitive function, and motor/neuromuscular coordination.", "investigations": "Snellen visual acuity and confrontation visual fields. Clock Drawing Test, Trail Making Test Part B (times >180s indicate high crash risk), Rapid Pace Walk test.", "management": "Counsel on driving cessation or self-restriction (daylight driving only, familiar local roads). Mandatory driving cessation in moderate-to-severe dementia or after recent stroke/seizure. Facilitate transition to community-based and family mobility options.", "references": ["NHTSA / AGS Clinician's Guide to Assessing and Counseling Older Drivers", "AAN Practice Guideline on Risk of Driving in Dementia"]},
         "Screen with Trail Making Test B and Clock Drawing Test. Discuss driving safety with patient and family.",
         ["Patient with moderate/severe dementia or active unprovoked seizures continuing to operate a motor vehicle", "History of multiple unexplained motor vehicle collisions"],
         ["Do NOT allow an older adult with diagnosed moderate dementia to continue driving (high risk of fatal crashes)", "Do NOT frame driving cessation as punishment; focus on safety and mobility alternatives"],
         "National Highway Traffic Safety Administration (NHTSA) & AGS", "draft", None),

        ("eld_advance_directives_care_018", "Advance Directives, Living Wills & Palliative Care", ["advance directives", "living will", "dnr elderly", "palliative care", "medical power of attorney", "end of life care"],
         [
             "An Advance Medical Directive (Living Will) is a legal document that allows you to state your medical treatment preferences in advance, before any serious illness takes away your ability to make decisions.",
             "Key components:",
             "  - Healthcare Power of Attorney / Proxy: Appointing a trusted family member or friend to make medical decisions if you become unable to speak for yourself.",
             "  - Treatment Preferences: Stating your wishes regarding life-support interventions such as invasive mechanical ventilators, feeding tubes, and cardiopulmonary resuscitation (CPR / DNR).",
             "Palliative Care is specialized medical care focused on relieving pain, distressing symptoms, and stress for individuals with serious chronic illnesses, improving quality of life for both the patient and their family at any stage of illness.",
             "Discuss your wishes openly with your family and doctor while you are healthy and clear-minded, and ensure copies are placed in your medical record."
         ],
         {"assessment": "Advance Care Planning (ACP) and Palliative Care Integration in Geriatric Practice. Legal framework under Supreme Court of India guidelines on Advance Medical Directives.", "investigations": "Assess decision-making capacity. Review patient values, goals of care, and symptom burden.", "management": "Facilitate structured ACP discussions. Document Advance Medical Directive and Healthcare Power of Attorney. Address pain (WHO analgesic ladder), dyspnea, nausea, and existential distress. Coordinate home-based or inpatient palliative care services.", "references": ["Supreme Court of India Judgment on Advance Medical Directives (2023 Revision)", "National Consensus Project Clinical Practice Guidelines for Quality Palliative Care"]},
         "Inquire if patient has a designated healthcare proxy or advance directive. Record in EHR.",
         ["Severe refractory physical pain or terminal dyspnea requiring specialist palliative symptom intervention", "Conflicting family demands in an incapacitated patient without documented goals of care"],
         ["Do NOT wait for a terminal crisis in the ICU to discuss goals of care", "Do NOT confuse palliative care with hospice alone (palliative care is beneficial at ANY stage of serious chronic illness)"],
         "Supreme Court of India Guidelines & National Consensus Project for Palliative Care", "draft", None),

        ("eld_chronic_pain_management_019", "Chronic Pain Management in Older Adults", ["chronic pain elderly", "senior pain management", "arthritis pain relief old age", "painkillers safe for seniors"],
         [
             "Chronic pain (from osteoarthritis, spinal stenosis, or neuropathy) is very common in seniors, but it should never be dismissed as an inevitable part of aging.",
             "Safe pain relief strategy:",
             "  - First-line: Topical pain relief gels (like Diclofenac gel) applied directly to aching knees or shoulders; topical gels provide local relief with minimal absorption into the blood, protecting your stomach and kidneys.",
             "  - Oral Paracetamol (500 to 650 mg up to 2 to 3 times a day) is generally the safest oral pain reliever for older adults.",
             "  - Non-drug therapies: Warm moist packs for joint stiffness, gentle physical therapy, hydrotherapy, and acupuncture.",
             "DANGER OF DAILY NSAIDs: Over-the-counter NSAID painkillers (like Brufen, Ibuprofen, Diclofenac, Naproxen, Combiflam) are very hazardous for long-term daily use in seniors; they cause bleeding stomach ulcers, high blood pressure surges, and kidney failure.",
             "Consult a pain specialist or geriatrician for nerve pain medications (like Gabapentin) or joint injections."
         ],
         {"assessment": "Chronic Non-Malignant Pain in Older Persons. Multi-dimensional assessment: pain intensity, functional interference, neuropathic components (DN4 score).", "investigations": "Targeted imaging (weight-bearing joint X-rays, lumbar spine MRI if radiculopathy). Baseline Serum Creatinine, eGFR, LFTs, CBC.", "management": "Stepwise multimodal analgesia: Topical NSAIDs (Diclofenac 1% gel) first-line for localized OA. Paracetamol (max 2-3 g/day). For neuropathic pain: Gabapentin (start low 100 mg bedtime, titrate slowly) or Duloxetine (30-60 mg daily). Strictly avoid chronic oral NSAIDs. Avoid Tramadol/Opioids if possible (high fall, constipation, and delirium risk). Physical therapy, gentle aquatic exercise.", "references": ["AGS Panel on the Pharmacological Management of Persistent Pain in Older Persons", "British Geriatrics Society Guidance on Pain Assessment"]},
         "Assess pain scale (0-10 or Wong-Baker faces). Screen for daily over-the-counter NSAID abuse.",
         ["Black tarry stools, vomiting blood, or sudden anemia in a senior taking painkillers (NSAID Gastric Ulcer Bleed)", "Acute worsening of kidney function (creatinine doubling) from NSAID use"],
         ["Do NOT take daily oral NSAIDs (Ibuprofen, Diclofenac) without close medical supervision", "Do NOT use high doses of sedating opioids that cause severe falls and bowel impaction"],
         "American Geriatrics Society (AGS) & British Geriatrics Society", "draft", None),

        ("eld_shingles_prevention_care_020", "Shingles (Herpes Zoster) & Post-Herpetic Neuralgia in Seniors", ["shingles elderly", "herpes zoster senior", "nerve pain shingles old age", "post herpetic neuralgia", "shingrix elderly"],
         [
             "Shingles is caused by the reactivation of the dormant chickenpox virus (Varicella-Zoster) in nerve roots, occurring predominantly in older adults due to age-related decline in immunity.",
             "Key signs: Intense, burning, sharp nerve pain followed by a blistering red rash strictly confined to a single band or strip on ONE side of the body or face.",
             "TIME-SENSITIVE TREATMENT: Antiviral tablets (like Valacyclovir or Acyclovir) must be started within 72 HOURS of the rash appearing to speed healing and reduce nerve complications.",
             "Post-Herpetic Neuralgia (PHN): In seniors, severe burning, shooting nerve pain can persist in the rash area for months or years after the blisters heal.",
             "Prevention: The modern recombinant Shingles vaccine (Shingrix - 2 doses) is over 90% effective at preventing shingles and long-term nerve pain in adults aged 50 and older.",
             "CRITICAL EMERGENCY: If shingles blisters appear near your eye, on your nose tip, or on your forehead, see an eye doctor immediately to prevent permanent blindness."
         ],
         {"assessment": "Herpes Zoster (VZV reactivation) and Post-Herpetic Neuralgia (PHN: neuropathic pain persisting >= 90 days after rash onset). High incidence and severity in elderly.", "investigations": "Clinical diagnosis. Fluorescein slit-lamp examination mandatory if cranial nerve V1 (ophthalmic branch) distribution (Hutchinson's sign: vesicles on tip of nose indicates ocular involvement).", "management": "Acute phase (<72h): Oral Valacyclovir 1000 mg TID or Famciclovir 500 mg TID for 7 days (dose-adjust for renal impairment). PHN treatment: Gabapentin (titrated up to 1800-2400 mg/day), Pregabalin (75-300 mg/day), Topical Lidocaine 5% patches, or low-dose Nortriptyline. Prevention: Recombinant Zoster Vaccine (Shingrix 2 doses at 0 and 2-6 months) for all adults >= 50y.", "references": ["CDC Clinical Guidance: Shingles (Herpes Zoster)", "Infectious Diseases Society of America (IDSA) Guidelines on Varicella-Zoster Virus"]},
         "Inspect rash distribution (unilateral dermatome). Check tip of nose for vesicles (Hutchinson's sign = STAT Ophthalmology).",
         ["Vesicles on the tip or side of the nose, forehead, or near the eye (Herpes Zoster Ophthalmicus - Urgent Eye Risk)", "Severe facial weakness or ear canal blisters with vertigo (Ramsay Hunt Syndrome)"],
         ["Do NOT delay starting antiviral medication beyond 72 hours of rash onset", "Do NOT touch active blisters if you have not had chickenpox (virus can transmit as chickenpox to unvaccinated contacts)"],
         "Centers for Disease Control and Prevention (CDC) & American Academy of Ophthalmology", "draft", None)
    ]

    out_el = []
    for eid, topic, kw, p_ans, doc_a, staff_m, red_f, avoid_l, src, rev_st, rev_by in el:
        out_el.append({
            "id": eid,
            "topic": f"Elderly Care: {topic}",
            "category": "elderly_care",
            "keywords": kw,
            "intent": "chronic_condition_guidance",
            "patient_answer": p_ans,
            "doctor_answer": doc_a,
            "staff_answer": staff_m,
            "red_flags": red_f,
            "follow_up_questions": ["What is the senior's age and can they walk independently?", "Which prescription and over-the-counter medications are they taking?", "Have there been any recent falls, sudden memory changes, or new dizziness?"],
            "avoid": avoid_l,
            "source": src,
            "review_status": rev_st,
            "reviewed_by": rev_by
        })

    return out_el
