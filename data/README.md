# CareBridge AI — Medicine Assistant Data Layer

This directory contains the database schema, data sources registry, curated pharmaceutical datasets, and ingestion pipelines for the non-commercial CareBridge AI Medicine Assistant.

---

## 1. Approved Datasets and Provenance Registry

Every record stored in `medicines.db` carries data provenance fields (`source_dataset`, `source_url`, `license`, `load_date`).

| Dataset ID | Name | Source URL | License | Load Date | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `kaggle_india_medicines` | A-Z Medicine Dataset of India & Medicine Details | https://www.kaggle.com/datasets | CC0 1.0 Universal / ODbL | 2026-10-19 | APPROVED |
| `nlem_india_2022` | National List of Essential Medicines (NLEM 2022) | https://cdsco.gov.in/opencms/opencms/en/Drugs/Essential-Medicines/ | GODL-India | 2026-10-19 | APPROVED |
| `ddinter` | DDInter: Drug-Drug Interaction Database | http://ddinter.scbdd.com/ | CC BY-NC-SA 4.0 | 2026-10-19 | APPROVED |
| `rxnorm` | RxNorm Standardized Clinical Drugs | https://www.nlm.nih.gov/research/umls/rxnorm/ | NLM Public Domain | 2026-10-19 | APPROVED |
| `openfda_dailymed` | openFDA & DailyMed Drug Labeling Database | https://open.fda.gov/apis/drug/label/ | US Public Domain | 2026-10-19 | APPROVED |
| `medlineplus_connect` | MedlinePlus Connect Clinical & Patient Info | https://medlineplus.gov/connect/ | US Public Domain | 2026-10-19 | APPROVED |
| `who_eml_23` | WHO Model List of Essential Medicines (23rd) | https://www.who.int/groups/expert-committee-on-selection-and-use-of-essential-medicines/essential-medicines-lists | CC BY-NC-SA 3.0 IGO | 2026-10-19 | APPROVED |
| `sider_adverse_effects`| SIDER 4.1 Side Effects & OFFSIDES | http://sideeffects.embl.de/ | CC BY-NC-SA 4.0 | 2026-10-19 | APPROVED |
| `cdsco_banned_fdc` | CDSCO Banned Fixed-Dose Combinations | https://cdsco.gov.in/opencms/opencms/en/Drugs/Banned-Drugs/ | Gazette of India | 2026-10-19 | APPROVED |
| `icd10_cm_cdc` | ICD-10-CM Clinical Modification | https://www.cdc.gov/nchs/icd/icd-10-cm.htm | US Public Domain | 2026-10-19 | APPROVED |
| `kaggle_symptom_disease`| Symptom-Disease Description Dataset | https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset | CC0 1.0 Universal | 2026-10-19 | APPROVED |
| `drugbank` | DrugBank Proprietary Database | https://go.drugbank.com/ | Proprietary Commercial | 2026-10-19 | BLOCKED |
| `who_icd10_proprietary` | WHO ICD-10 (Direct Edition) | https://icd.who.int/ | WHO Copyright Tier | 2026-10-19 | BLOCKED |

---

## 2. Programmatic License Gate

The ingestion script `ingest_medicines.py` reads `/data/sources.json` before performing any database transactions.
* If any attempted source is marked `BLOCKED` (such as DrugBank or WHO ICD-10) or `NEEDS-REVIEW`, ingestion halts immediately with a `LicenseGateViolationError`.
* Only sources marked `APPROVED` are permitted to write to `medicines.db`.

---

## 3. Curated OTC / First-Line Allowlist

Because Indian commercial pharmaceutical datasets do not reliably differentiate between Over-The-Counter (OTC) and prescription schedules (Schedule H, H1, X), CareBridge AI enforces an **exclusive whitelist**.

A medicine record will ONLY have `approved_for_suggestion = 1` if:
1. Every active pharmaceutical ingredient in its composition is present on the **Curated OTC Allowlist**.
2. It is **not** on the CDSCO Banned / Restricted FDC list.
3. It does **not** contain antibiotics, steroids, narcotics, or habit-forming psychoactive substances.

### Allowed First-Line OTC Compounds:
* **Analgesics / Antipyretics**: Paracetamol (Acetaminophen), Ibuprofen (Adults only)
* **Antihistamines / Allergy**: Cetirizine, Loratadine, Chlorpheniramine maleate
* **Cough / Expectorants**: Dextromethorphan (dry cough), Guaifenesin (wet/mucus cough)
* **Rehydration**: Oral Rehydration Salts (WHO-ORS formula)
* **Gastrointestinal**: Aluminium Hydroxide, Magnesium Hydroxide, Simethicone, Calcium Carbonate, Famotidine, Loperamide (acute adult diarrhea with warnings)
* **Sore Throat / ENT**: Amylmetacresol + Dichlorobenzyl Alcohol lozenges, Saline Nasal Spray
* **Topicals**: Clotrimazole 1%, Povidone Iodine 5%

All other medications remain indexed for information and interaction checking but are **never suggested** to users.

---

## 4. Database Setup & Reproduction

```bash
# Ingest approved data sources and build medicines.db
python data/ingest_medicines.py
```
