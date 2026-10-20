# CareBridge AI — Data Licenses, Attribution & Usage Policy

**Project Nature**: CareBridge AI is an **educational, non-commercial student research project** developed for clinical decision support study, healthcare system design, and AI safety evaluation.

---

## 1. Commercial Conversion Warning & Protocol

> [!WARNING]
> **MANDATORY COMMERCIAL CONVERSION PROTOCOL**:
> If this project is ever converted into a commercial platform, production service, or commercial product, **all non-commercial datasets must be completely purged from the codebase, database, and cache** prior to any commercial use.
> 
> Specifically, the following datasets are licensed under Non-Commercial terms (CC BY-NC-SA / Academic):
> 1. **DDInter** (Drug-Drug Interactions, CC BY-NC-SA 4.0)
> 2. **WHO Model List of Essential Medicines** (WHO EML 23rd List, CC BY-NC-SA 3.0 IGO)
> 3. **SIDER 4.1 & OFFSIDES/TWOSIDES** (Adverse Drug Effects, CC BY-NC-SA 4.0)
> 
> Replacement commercial data must be sourced under permissible licenses (e.g., standard openFDA, public domain DailyMed, NLM RxNorm, or commercially purchased clinical drug compendia).

---

## 2. Ingestion Gate & License Audit Matrix

The CareBridge AI ingestion script enforces a hard programmatic gate: **any source dataset not explicitly marked `APPROVED` in `/data/sources.json` is rejected and will halt the ingestion pipeline**.

| Dataset | Official URL | License | Commercial Allowed? | Attribution Required? | Share-Alike? | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **A-Z Medicine Dataset of India** | [Kaggle](https://www.kaggle.com) | CC0 1.0 Universal / ODbL | Yes | Yes | No | **APPROVED** |
| **NLEM 2022 (India)** | [CDSCO](https://cdsco.gov.in) | GODL-India (Open Govt Data) | Yes | Yes | No | **APPROVED** |
| **DDInter (Drug-Drug Interactions)** | [Zhejiang Univ.](http://ddinter.scbdd.com) | CC BY-NC-SA 4.0 | **No** | **Yes** | **Yes** | **APPROVED** |
| **RxNorm Standardized Nomenclature** | [US NLM](https://www.nlm.nih.gov/research/umls/rxnorm/) | NLM Public Domain (Core) | Yes | Yes | No | **APPROVED** |
| **openFDA & DailyMed Drug Labels** | [openFDA / NLM](https://open.fda.gov) | US Public Domain | Yes | Yes | No | **APPROVED** |
| **MedlinePlus Connect** | [US NLM](https://medlineplus.gov/connect/) | US Public Domain | Yes | Yes | No | **APPROVED** |
| **WHO Model EML (23rd List, 2023)** | [WHO](https://www.who.int) | CC BY-NC-SA 3.0 IGO | **No** | **Yes** | **Yes** | **APPROVED** |
| **SIDER 4.1 & OFFSIDES** | [EMBL / Tatonetti](http://sideeffects.embl.de) | CC BY-NC-SA 4.0 | **No** | **Yes** | **Yes** | **APPROVED** |
| **CDSCO Banned FDC Gazettes** | [CDSCO India](https://cdsco.gov.in) | Gazette of India (Public Domain) | Yes | Yes | No | **APPROVED** |
| **ICD-10-CM (Clinical Modification)** | [CDC / NCHS](https://www.cdc.gov/nchs/icd/icd-10-cm.htm) | US Public Domain | Yes | Yes | No | **APPROVED** |
| **Kaggle Symptom-Disease Dataset** | [Kaggle](https://www.kaggle.com) | CC0 1.0 Universal | Yes | Yes | No | **APPROVED** |
| **DrugBank** | [DrugBank](https://go.drugbank.com) | Proprietary Commercial Tier | **No** | N/A | N/A | **BLOCKED** |
| **WHO ICD-10 (Direct Edition)** | [WHO](https://icd.who.int) | Proprietary WHO License | **No** | N/A | N/A | **BLOCKED** |

---

## 3. Explicit Prohibitions & Blocked Datasets

1. **DrugBank**: Strictly prohibited. DrugBank requires a paid commercial license and places stringent limitations on derivative distribution. The ingestion pipeline actively checks against DrugBank URLs, identifiers, and schemas; loading is programmatically blocked.
2. **WHO ICD-10 (Direct International Edition)**: Blocked due to licensing barriers and commercial fees. CareBridge AI uses the US Public Domain **ICD-10-CM** (CDC/NCHS) which provides royalty-free clinical classification.
3. **Unlicensed Kaggle Datasets**: Any dataset with an unclear, missing, or contradictory license is blocked under the `NEEDS-REVIEW` gate until explicitly cleared.

---

## 4. Attribution Notices

In compliance with CC BY-NC-SA 4.0, CC BY-NC-SA 3.0 IGO, GODL-India, and US Public Domain guidelines, CareBridge AI credits the following institutions:

1. **DDInter**: *DDInter drug-drug interaction database provided by the College of Pharmaceutical Sciences, Zhejiang University under CC BY-NC-SA 4.0 (http://ddinter.scbdd.com).*
2. **WHO Model EML**: *World Health Organization Model List of Essential Medicines (23rd List, 2023), Geneva: World Health Organization. Licensed under CC BY-NC-SA 3.0 IGO.*
3. **SIDER 4.1**: *SIDER 4.1 Side Effect Resource provided by the European Molecular Biology Laboratory (EMBL), Heidelberg, Germany.*
4. **NLEM 2022 & CDSCO**: *National List of Essential Medicines (NLEM 2022) and Banned FDC Gazettes, Central Drugs Standard Control Organisation (CDSCO), Ministry of Health & Family Welfare, Government of India.*
5. **NLM RxNorm & MedlinePlus**: *RxNorm and MedlinePlus datasets courtesy of the U.S. National Library of Medicine (NLM), National Institutes of Health.*
6. **openFDA & DailyMed**: *openFDA and DailyMed public datasets courtesy of the U.S. Food and Drug Administration (FDA).*
