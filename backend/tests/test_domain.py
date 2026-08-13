from __future__ import annotations

import unittest
from decimal import Decimal

from river_api.domain import DomainValidationError, classify_bod, simulate


class GradeTests(unittest.TestCase):
    def test_all_grade_boundaries(self) -> None:
        cases = (
            ("1.0", "Ia"),
            ("1.1", "Ib"),
            ("2.0", "Ib"),
            ("2.1", "II"),
            ("3.0", "II"),
            ("3.1", "III"),
            ("5.0", "III"),
            ("5.1", "IV"),
            ("8.0", "IV"),
            ("8.1", "V"),
            ("10.0", "V"),
            ("10.1", "VI"),
        )
        for bod, expected in cases:
            with self.subTest(bod=bod):
                self.assertEqual(classify_bod(Decimal(bod)).symbol, expected)


class SimulationTests(unittest.TestCase):
    def test_non_direct_policies_do_not_reduce_bod(self) -> None:
        result = simulate("oncheoncheon", ["sensor", "monitoring", "walking"])
        self.assertEqual(result["finalBod"], 3.0)
        self.assertFalse(result["missionSuccess"])
        self.assertEqual(result["scores"]["monitoring"], 75)
        self.assertEqual(result["scores"]["citizen"], 75)

    def test_each_river_has_success_and_perfect_combinations(self) -> None:
        combos = {
            "dongcheon": (["sewer", "treatment", "sourceBlock"], ["sewer", "treatment", "sourceBlock", "ecology"]),
            "goejeongcheon": (["sewer", "treatment", "sourceBlock"], ["sewer", "treatment", "sourceBlock", "ecology"]),
            "oncheoncheon": (["sewer", "treatment"], ["sewer", "treatment", "sourceBlock"]),
        }
        for river_id, (success_ids, perfect_ids) in combos.items():
            with self.subTest(river=river_id, outcome="success"):
                success = simulate(river_id, success_ids)
                self.assertTrue(success["missionSuccess"])
                self.assertFalse(success["perfectClear"])
            with self.subTest(river=river_id, outcome="perfect"):
                perfect = simulate(river_id, perfect_ids)
                self.assertTrue(perfect["perfectClear"])
                self.assertGreaterEqual(perfect["finalBod"], 0.8)

    def test_budget_overrun_is_rejected(self) -> None:
        with self.assertRaises(DomainValidationError) as context:
            simulate(
                "dongcheon",
                ["sewer", "treatment", "sourceBlock", "ecology", "sensor"],
            )
        self.assertEqual(context.exception.details[0]["reason"], "budget_exceeded")

    def test_duplicate_policy_is_rejected(self) -> None:
        with self.assertRaises(DomainValidationError):
            simulate("dongcheon", ["sewer", "sewer"])


if __name__ == "__main__":
    unittest.main()
