from __future__ import annotations

import unittest
from decimal import Decimal
from itertools import combinations

from river_api.domain import (
    MAX_BUDGET,
    POLICIES,
    RIVERS,
    DomainValidationError,
    classify_bod,
    game_config,
    simulate,
)


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
        self.assertIn("수질은 아직 개선되지 않았습니다", result["resultMessage"])

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

    def test_event_status_changes_at_second_policy(self) -> None:
        not_triggered = simulate("oncheoncheon", ["walking"])
        pending = simulate("oncheoncheon", ["walking", "monitoring"])

        self.assertEqual(not_triggered["event"]["status"], "NOT_TRIGGERED")
        self.assertEqual(pending["event"]["status"], "PENDING")
        self.assertIsNone(pending["event"]["choice"])

    def test_investigation_uses_sensor_cost_and_score_variant_once(self) -> None:
        without_sensor = simulate(
            "oncheoncheon", ["sewer", "treatment"], "INVESTIGATE"
        )
        with_sensor = simulate(
            "oncheoncheon", ["sensor", "walking"], "INVESTIGATE"
        )

        self.assertEqual(without_sensor["event"]["cost"], 5)
        self.assertEqual(without_sensor["budgetUsed"], 60)
        self.assertEqual(without_sensor["scores"]["citizen"], 40)
        self.assertEqual(without_sensor["scores"]["monitoring"], 40)
        self.assertEqual(with_sensor["event"]["cost"], 0)
        self.assertTrue(with_sensor["event"]["sensorAssisted"])
        self.assertEqual(with_sensor["scores"]["citizen"], 65)
        self.assertEqual(with_sensor["scores"]["monitoring"], 75)

    def test_wait_reduces_citizen_score_and_sets_temporary_mood(self) -> None:
        result = simulate("oncheoncheon", ["sensor", "walking"], "WAIT")

        self.assertEqual(result["event"]["cost"], 0)
        self.assertEqual(result["scores"]["citizen"], 50)
        self.assertEqual(result["event"]["temporaryCharacterMood"], "WORRIED")

    def test_event_cost_is_included_in_budget_validation(self) -> None:
        policy_ids = ["sewer", "treatment", "sourceBlock", "monitoring", "walking"]
        with self.assertRaises(DomainValidationError) as context:
            simulate("dongcheon", policy_ids, "INVESTIGATE")

        self.assertEqual(context.exception.details[0]["field"], "eventChoice")
        self.assertEqual(context.exception.details[0]["reason"], "budget_exceeded")

    def test_invalid_or_early_event_choice_is_rejected(self) -> None:
        with self.assertRaises(DomainValidationError) as early:
            simulate("oncheoncheon", ["walking"], "WAIT")
        with self.assertRaises(DomainValidationError) as unknown:
            simulate("oncheoncheon", ["walking", "monitoring"], "UNKNOWN")

        self.assertEqual(early.exception.details[0]["reason"], "event_not_triggered")
        self.assertEqual(
            unknown.exception.details[0]["reason"], "unknown_event_choice"
        )

    def test_duplicate_policy_is_rejected(self) -> None:
        with self.assertRaises(DomainValidationError):
            simulate("dongcheon", ["sewer", "sewer"])

    def test_result_status_and_presentation_match_outcome(self) -> None:
        cases = (
            ("oncheoncheon", ["walking"], "TRY_AGAIN", "TRY AGAIN"),
            (
                "dongcheon",
                ["sewer", "treatment", "sourceBlock"],
                "MISSION_COMPLETE",
                "MISSION COMPLETE",
            ),
            (
                "dongcheon",
                ["sewer", "treatment", "sourceBlock", "ecology"],
                "PERFECT_CLEAR",
                "PERFECT CLEAR",
            ),
        )
        for river_id, policy_ids, expected_status, expected_title in cases:
            with self.subTest(status=expected_status):
                result = simulate(river_id, policy_ids)
                self.assertEqual(result["resultStatus"], expected_status)
                self.assertEqual(result["resultTitle"], expected_title)
                self.assertTrue(result["resultMessage"])

    def test_confirmed_badge_criteria_are_applied(self) -> None:
        mission = simulate(
            "dongcheon", ["sewer", "treatment", "sourceBlock"]
        )
        self.assertEqual(
            {badge["id"] for badge in mission["badges"]},
            {"GOOD_ACHIEVED", "BUDGET_SAVER"},
        )

        perfect_and_ecology = simulate(
            "dongcheon", ["sewer", "treatment", "sourceBlock", "ecology"]
        )
        self.assertEqual(
            {badge["id"] for badge in perfect_and_ecology["badges"]},
            {"GOOD_ACHIEVED", "ONE_MG_PERFECT", "ECOLOGY_RECOVERY"},
        )

        citizen_and_monitoring = simulate(
            "oncheoncheon", ["sensor", "monitoring", "walking"]
        )
        self.assertEqual(
            {badge["id"] for badge in citizen_and_monitoring["badges"]},
            {"CITIZEN_EMPATHY", "SMART_MANAGEMENT"},
        )

    def test_strengths_explain_each_selected_policy_in_order(self) -> None:
        result = simulate("oncheoncheon", ["sensor", "walking"])
        self.assertEqual(len(result["strengths"]), 2)
        self.assertIn("관리 능력", result["strengths"][0])
        self.assertIn("시민 만족도", result["strengths"][1])

    def test_recommendations_prioritize_best_affordable_water_policy(self) -> None:
        result = simulate("oncheoncheon", ["walking"])
        self.assertEqual(result["resultStatus"], "TRY_AGAIN")
        self.assertEqual(result["recommendations"][0]["policyId"], "treatment")
        self.assertEqual(result["recommendations"][0]["expectedFinalBod"], 2.1)
        self.assertEqual(result["recommendations"][0]["expectedFinalGrade"], "II")

    def test_try_again_message_recognizes_one_step_remaining(self) -> None:
        result = simulate("oncheoncheon", ["treatment"])
        self.assertEqual(result["finalGrade"]["symbol"], "II")
        self.assertIn("목표까지 한 단계", result["resultMessage"])

    def test_all_recommendations_match_real_simulation_and_constraints(self) -> None:
        for river in RIVERS:
            for count in range(1, len(POLICIES) + 1):
                for selected in combinations(POLICIES, count):
                    if sum(policy.cost for policy in selected) > MAX_BUDGET:
                        continue
                    selected_ids = [policy.id for policy in selected]
                    result = simulate(river.id, selected_ids)
                    recommendations = result["recommendations"]
                    self.assertLessEqual(len(recommendations), 3)
                    self.assertEqual(
                        len({item["policyId"] for item in recommendations}),
                        len(recommendations),
                    )
                    if result["missionSuccess"]:
                        self.assertEqual(recommendations, [])

                    for recommendation in recommendations:
                        policy_id = recommendation["policyId"]
                        policy = next(policy for policy in POLICIES if policy.id == policy_id)
                        self.assertNotIn(policy_id, selected_ids)
                        self.assertTrue(policy.directly_reduces_bod)
                        self.assertLessEqual(policy.cost, result["remainingBudget"])

                        actual = simulate(river.id, [*selected_ids, policy_id])
                        self.assertEqual(
                            recommendation["expectedFinalBod"], actual["finalBod"]
                        )
                        self.assertEqual(
                            recommendation["expectedFinalGrade"],
                            actual["finalGrade"]["symbol"],
                        )
                        self.assertEqual(
                            recommendation["expectedResultStatus"],
                            actual["resultStatus"],
                        )
                        self.assertEqual(
                            recommendation["expectedRemainingBudget"],
                            actual["remainingBudget"],
                        )

    def test_game_config_exposes_result_and_badge_definitions(self) -> None:
        config = game_config()
        self.assertEqual(config["version"], "2026-08-demo-v4")
        self.assertEqual(len(config["badgeDefinitions"]), 6)
        self.assertEqual(
            {item["id"] for item in config["resultStatuses"]},
            {"TRY_AGAIN", "MISSION_COMPLETE", "PERFECT_CLEAR"},
        )
        self.assertEqual(config["events"][0]["id"], "DOWNSTREAM_ODOR_SURGE")
        self.assertEqual(config["events"][0]["triggerPolicyCount"], 2)


if __name__ == "__main__":
    unittest.main()
