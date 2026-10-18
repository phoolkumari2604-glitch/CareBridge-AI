/**
 * Unit Tests for Phase 2 – Internal Organs.
 * 
 * Verifies:
 * - getOrganStatus thresholds & fallbacks
 * - ORGANS_CONFIG completeness
 * - systemRegistry extensibility (Phase 3 single-line registration)
 */

import { getOrganStatus } from "./getOrganStatus.js";
import { ORGANS_CONFIG, getOrganConfig } from "./organs.config.js";
import { getRegisteredSystems, registerSystemGroup, getSystemGroup } from "./systemRegistry.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("=== RUNNING PHASE 2 UNIT TESTS ===");

// TEST 1: Config validity
console.log("Test 1: Validating ORGANS_CONFIG keys and fields...");
const expectedOrgans = ["stomach", "pancreas", "thyroid", "intestines"];
for (const id of expectedOrgans) {
  const cfg = getOrganConfig(id);
  assert(cfg, `Config for ${id} must exist`);
  assert(cfg.name && typeof cfg.name === "string", `${id} must have a name`);
  assert(cfg.description && cfg.description.length > 20, `${id} must have a detailed description`);
  assert(cfg.whatItDoes && cfg.whatItDoes.length > 10, `${id} must have whatItDoes`);
  assert(cfg.defaultCamera && cfg.defaultCamera.position, `${id} must have camera config`);
}
console.log("  PASS: All 4 organs configured with clinical metadata & camera.");

// TEST 2: Pancreas Status & Glucose Thresholds
console.log("Test 2: Validating Pancreas status logic...");
// Critical high (e.g. 310 mg/dL)
const pancreasCritical = getOrganStatus("pancreas", {
  vitals: { blood_sugar: 310 },
});
assert(pancreasCritical.key === "red", `Expected red for 310 mg/dL, got ${pancreasCritical.key}`);
assert(pancreasCritical.label === "Critical", "Label must be Critical");
assert(pancreasCritical.indicators[0].value === "310", "Indicator value should match");

// Watch / elevated (e.g. 165 mg/dL)
const pancreasWatch = getOrganStatus("pancreas", {
  vitals: { blood_sugar: 165 },
});
assert(pancreasWatch.key === "amber", `Expected amber for 165 mg/dL, got ${pancreasWatch.key}`);

// Normal (e.g. 95 mg/dL)
const pancreasNormal = getOrganStatus("pancreas", {
  vitals: { blood_sugar: 95 },
});
assert(pancreasNormal.key === "green", `Expected green for 95 mg/dL, got ${pancreasNormal.key}`);

// No data yet
const pancreasNoData = getOrganStatus("pancreas", {});
assert(pancreasNoData.key === "grey", `Expected grey for missing data, got ${pancreasNoData.key}`);
assert(pancreasNoData.label === "No data yet", "Label must be No data yet");
console.log("  PASS: Pancreas threshold and 'No data yet' states verified.");

// TEST 3: Stomach Alert & Temperature Correlation
console.log("Test 3: Validating Stomach status logic...");
const stomachAlert = getOrganStatus("stomach", {
  alerts: [{ alert_type: "Dyspepsia", message: "Acute gastric reflux detected", severity: "CRITICAL" }],
});
assert(stomachAlert.key === "red", "Stomach should be red when critical gastric alert exists");

const stomachNormal = getOrganStatus("stomach", {
  vitals: { temperature: 36.8 },
});
assert(stomachNormal.key === "green", "Stomach should be green for normal temperature 36.8");

const stomachNoData = getOrganStatus("stomach", {});
assert(stomachNoData.key === "grey", "Stomach should be grey when no data is provided");
console.log("  PASS: Stomach alerts & temperature proxy verified.");

// TEST 4: Thyroid TSH & Heart Rate Proxy
console.log("Test 4: Validating Thyroid status logic...");
const thyroidTsh = getOrganStatus("thyroid", {
  vitals: { tsh: 2.1 },
});
assert(thyroidTsh.key === "green", "Thyroid should be green for TSH 2.1");

const thyroidHrProxy = getOrganStatus("thyroid", {
  vitals: { heart_rate: 135 },
});
assert(thyroidHrProxy.key === "amber", "Thyroid should be amber for tachycardic proxy 135 BPM");

const thyroidNoData = getOrganStatus("thyroid", {});
assert(thyroidNoData.key === "grey", "Thyroid should be grey when neither TSH nor HR is logged");
console.log("  PASS: Thyroid TSH and metabolic proxy verified.");

// TEST 5: Intestines Perfusion & Alert Mapping
console.log("Test 5: Validating Intestines status logic...");
const intestinesAlert = getOrganStatus("intestines", {
  alerts: [{ alert_type: "Motility Alert", message: "Mild irregular bowel transit", severity: "WATCH" }],
});
assert(intestinesAlert.key === "amber", "Intestines should be amber for watch enteric alert");

const intestinesNoData = getOrganStatus("intestines", {});
assert(intestinesNoData.key === "grey", "Intestines should be grey when no enteric data exists");
console.log("  PASS: Intestines mapping verified.");

// TEST 6: System Registry Extensibility (Phase 3 single line plug-in)
console.log("Test 6: Validating System Registry extensibility...");
const systemsBefore = getRegisteredSystems();
assert(systemsBefore.some((s) => s.id === "internal-organs"), "internal-organs must be pre-registered");

// Simulate registering Phase 3 in one line!
registerSystemGroup({
  id: "musculoskeletal",
  name: "Musculoskeletal & Other Systems",
  phase: "Phase 3",
  organIds: ["spine", "vessels", "bones", "muscles", "eyes", "joints"],
});

const p3Group = getSystemGroup("musculoskeletal");
assert(p3Group, "Phase 3 must be successfully registered");
assert(p3Group.organIds.length === 6, "Phase 3 should have 6 organ/system IDs");
console.log("  PASS: System Registry supports one-line Phase 3 expansion.");

console.log("\n>>> ALL PHASE 2 TESTS PASSED SUCCESSFULLY! <<<\n");
