/**
 * System Registry for CareBridge Body Explorer.
 * 
 * Supports extensible registration of body systems.
 * Phase 2 registers "Internal Organs" by default.
 * Future phases (e.g. Phase 3: Spine, Blood Vessels, Bones, Muscles, Eyes, Joints)
 * can register with a single call to `registerSystemGroup(...)`.
 */

const registry = new Map();

// Register Phase 2 Internal Organs
registry.set("internal-organs", {
  id: "internal-organs",
  name: "Internal Organs",
  phase: "Phase 2",
  description: "Visceral digestive, endocrine, and metabolic organ systems",
  organIds: ["brain", "stomach", "pancreas", "thyroid", "intestines"],
});

/**
 * Allows future phases or external modules to register a new system group with a single line.
 * @param {Object} group - { id, name, phase, description, organIds }
 */
export function registerSystemGroup(group) {
  if (!group || !group.id) {
    console.error("Invalid system group registration:", group);
    return;
  }
  registry.set(group.id, {
    ...group,
    organIds: group.organIds || [],
  });
}

/**
 * Returns all registered system groups.
 * @returns {Array} List of system groups
 */
export function getRegisteredSystems() {
  return Array.from(registry.values());
}

/**
 * Retrieves a specific system group by id.
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getSystemGroup(id) {
  return registry.get(id);
}

export default {
  registerSystemGroup,
  getRegisteredSystems,
  getSystemGroup,
};
