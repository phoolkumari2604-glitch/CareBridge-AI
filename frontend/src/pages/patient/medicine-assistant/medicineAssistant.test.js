import test from 'node:test';
import assert from 'node:assert';
import { checkRedFlagEmergency } from './redFlagChecker.js';
import { BRAND_TO_GENERIC_MAP, searchMedicationDirectory, getLabelDosingGuidelines } from './brandGenericMap.js';
import { I18N } from './i18n.js';

test('RedFlagChecker triggers emergency for life-threatening symptoms', () => {
  const chestPainResult = checkRedFlagEmergency({
    symptoms: ['Chest Pain or Pressure'],
    symptomDetails: { 'Chest Pain or Pressure': { duration: '<1 day', severity: 'moderate' } },
    age: 30
  });
  assert.strictEqual(chestPainResult.triggered, true);
  assert.strictEqual(chestPainResult.code, 'CHEST_PAIN');

  const fever3DaysResult = checkRedFlagEmergency({
    symptoms: ['Fever'],
    symptomDetails: { 'Fever': { duration: '>3 days', severity: 'severe' } },
    age: 25
  });
  assert.strictEqual(fever3DaysResult.triggered, true);
  assert.strictEqual(fever3DaysResult.code, 'PROLONGED_FEVER');

  const infantFeverResult = checkRedFlagEmergency({
    symptoms: ['Fever / Pyrexia'],
    symptomDetails: { 'Fever / Pyrexia': { duration: '1-3 days', severity: 'mild' } },
    age: 0.2
  });
  assert.strictEqual(infantFeverResult.triggered, true);
  assert.strictEqual(infantFeverResult.code, 'INFANT_FEVER');

  const pregnantSevereResult = checkRedFlagEmergency({
    symptoms: ['Headache'],
    symptomDetails: { 'Headache': { duration: '1-3 days', severity: 'severe' } },
    age: 28,
    pregnant: true
  });
  assert.strictEqual(pregnantSevereResult.triggered, true);
  assert.strictEqual(pregnantSevereResult.code, 'PREGNANCY_SEVERE');

  const mildColdResult = checkRedFlagEmergency({
    symptoms: ['Frequent Sneezing / Allergic Rhinitis'],
    symptomDetails: { 'Frequent Sneezing / Allergic Rhinitis': { duration: '1-3 days', severity: 'mild' } },
    age: 25,
    pregnant: false
  });
  assert.strictEqual(mildColdResult.triggered, false);
});

test('Brand-to-generic directory search finds popular Indian brands', () => {
  const doloResults = searchMedicationDirectory('Dolo');
  assert.ok(doloResults.length > 0);
  assert.strictEqual(doloResults[0].generic, 'Paracetamol');

  const allegraResults = searchMedicationDirectory('Allegra');
  assert.ok(allegraResults.length > 0);
  assert.strictEqual(allegraResults[0].generic, 'Fexofenadine');

  const combiflamResults = searchMedicationDirectory('Combiflam');
  assert.ok(combiflamResults.length > 0);
  assert.strictEqual(combiflamResults[0].generic, 'Ibuprofen + Paracetamol');
});

test('Label dosing guidelines handle pediatric and adult bands', () => {
  const adultDose = getLabelDosingGuidelines('Paracetamol', 30, 70);
  assert.ok(adultDose.dosing.includes('500 mg'));
  assert.ok(adultDose.maxDaily.includes('4,000 mg'));

  const pediatricWithoutWeight = getLabelDosingGuidelines('Paracetamol', 8, null);
  assert.ok(pediatricWithoutWeight.dosing.toLowerCase().includes('pediatric'));
});

test('i18n dictionary supports en, hi, and te with wizard translations', () => {
  assert.ok(I18N.en);
  assert.ok(I18N.hi);
  assert.ok(I18N.te);
  assert.strictEqual(I18N.en.step1Title, '1. Symptoms');
  assert.ok(I18N.hi.step1Title);
  assert.ok(I18N.te.step1Title);
});
