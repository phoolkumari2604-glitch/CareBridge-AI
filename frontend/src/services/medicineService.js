import client from "../api/client";

/**
 * CareBridge AI - Medicine Assistant API Service
 * Interacts with Phase 2 & Phase 3 Flask endpoints:
 * - POST /assistant/suggest
 * - POST /assistant/chat
 * - GET /medicine/search
 * - GET /medicine/:id/interactions
 * - GET /api/sources-attribution
 */

export const medicineService = {
  /**
   * Suggests OTC medicines based on structured symptom intake and 5-layer clinical safety filter
   * @param {Object} intake - { symptoms, age, gender, pregnant, allergies, current_medicines, conditions }
   */
  suggestMedicines: async (intake) => {
    const response = await client.post("/assistant/suggest", intake);
    return response.data;
  },

  /**
   * Conversational RAG assistant query with grounded retrieval and clinical guardrails
   * @param {Object} payload - { message, intake, history }
   */
  chatAssistant: async (payload) => {
    const response = await client.post("/assistant/chat", payload);
    return response.data;
  },

  /**
   * Fuzzy search Indian brand or generic medicines
   * @param {string} query
   * @param {number} limit
   */
  searchMedicines: async (query, limit = 20) => {
    const response = await client.get("/medicine/search", {
      params: { q: query, limit },
    });
    return response.data;
  },

  /**
   * Check drug-drug interactions with specific partner drugs
   * @param {string} medicineIdOrName
   * @param {Array<string>} withList
   */
  checkInteractions: async (medicineIdOrName, withList = []) => {
    const params = new URLSearchParams();
    withList.forEach((item) => params.append("with", item));
    const response = await client.get(
      `/medicine/${encodeURIComponent(medicineIdOrName)}/interactions`,
      { params }
    );
    return response.data;
  },

  /**
   * Retrieve all datasets, licenses, commercial allowances, and attribution notices
   */
  getDataSources: async () => {
    const response = await client.get("/sources-attribution");
    return response.data;
  },
};

export default medicineService;
