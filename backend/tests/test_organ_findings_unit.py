import unittest
from backend.app.routes.health_records import get_default_organ_data, VALID_ORGAN_KEYS

class TestOrganFindingsAPI(unittest.TestCase):
    def test_valid_organ_keys(self):
        expected_organs = {"kidneys", "brain", "stomach", "pancreas", "thyroid", "intestines", "lungs"}
        self.assertEqual(VALID_ORGAN_KEYS, expected_organs)

    def test_default_organ_data_all_present(self):
        for organ in ["kidneys", "brain", "stomach", "pancreas", "thyroid", "intestines", "lungs"]:
            data = get_default_organ_data(organ)
            self.assertTrue(len(data["what_happened"]) > 10, f"Missing what_happened for {organ}")
            self.assertTrue(len(data["how_to_reduce"]) > 10, f"Missing how_to_reduce for {organ}")
            self.assertTrue(isinstance(data["medicines"], list), f"Medicines must be list for {organ}")
            self.assertTrue(isinstance(data["findings"], list), f"Findings must be list for {organ}")

            # Verify NO dosage figures in medicines (e.g. \d+\s*(?:mg|mcg|ml|g|tablets?))
            import re
            for med in data["medicines"]:
                self.assertIn("name", med)
                self.assertIn("purpose", med)
                combined = f"{med['name']} {med['purpose']}".lower()
                self.assertFalse(bool(re.search(r"\d+\s*(?:mg|mcg|ml|g\b|tablets?)", combined)),
                                 f"Medicine {med} contains forbidden dosage numbers")

            # Verify findings structure: x, y, label, severity, note
            for finding in data["findings"]:
                self.assertIn("x", finding)
                self.assertIn("y", finding)
                self.assertIn("label", finding)
                self.assertIn("severity", finding)
                self.assertIn("note", finding)
                self.assertIn(finding["severity"], ["critical", "watch", "normal"])
                self.assertTrue(0 <= finding["x"] <= 100)
                self.assertTrue(0 <= finding["y"] <= 100)

if __name__ == "__main__":
    unittest.main()
