from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from river_api.application import Application
from river_api.repository import SQLiteResponseRepository
from river_api.service import RiverService


class ApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        repository = SQLiteResponseRepository(
            Path(self.temp_directory.name) / "responses.sqlite3"
        )
        repository.initialize()
        self.application = Application(RiverService(repository))

    def tearDown(self) -> None:
        self.temp_directory.cleanup()

    @staticmethod
    def submission(**changes):
        payload = {
            "riverId": "oncheoncheon",
            "policyIds": ["sewer", "treatment"],
            "topPriority": "source_control",
            "district": "dongnae",
            "comment": "수질 개선을 먼저 추진해 주세요.",
            "consentToAggregate": True,
        }
        payload.update(changes)
        return payload

    def test_server_calculates_result_before_saving(self) -> None:
        status, response = self.application.dispatch(
            "POST", "/api/responses", self.submission()
        )
        self.assertEqual(status, 201)
        self.assertEqual(response["result"]["finalBod"], 1.3)
        self.assertTrue(response["result"]["missionSuccess"])

    def test_unknown_personal_information_field_is_rejected(self) -> None:
        status, response = self.application.dispatch(
            "POST",
            "/api/responses",
            self.submission(email="person@example.com"),
        )
        self.assertEqual(status, 400)
        self.assertIn(
            {"field": "email", "reason": "unknown_field"},
            response["error"]["details"],
        )

    def test_client_cannot_submit_tampered_final_bod(self) -> None:
        status, response = self.application.dispatch(
            "POST", "/api/responses", self.submission(finalBod=0.8)
        )
        self.assertEqual(status, 400)
        self.assertEqual(response["error"]["code"], "VALIDATION_ERROR")

    def test_consent_is_required(self) -> None:
        status, _ = self.application.dispatch(
            "POST", "/api/responses", self.submission(consentToAggregate=False)
        )
        self.assertEqual(status, 400)

    def test_personal_information_in_comment_is_rejected(self) -> None:
        for comment in ("연락처는 010-1234-5678입니다.", "메일은 person@example.com입니다."):
            with self.subTest(comment=comment):
                status, response = self.application.dispatch(
                    "POST", "/api/responses", self.submission(comment=comment)
                )
                self.assertEqual(status, 400)
                self.assertEqual(
                    response["error"]["details"][0]["reason"],
                    "personal_information_not_allowed",
                )

    def test_invalid_scalar_types_return_validation_error(self) -> None:
        status, _ = self.application.dispatch(
            "POST", "/api/simulations", {"riverId": [], "policyIds": ["sewer"]}
        )
        self.assertEqual(status, 400)

        status, _ = self.application.dispatch(
            "POST", "/api/responses", self.submission(topPriority=[])
        )
        self.assertEqual(status, 400)

    def test_statistics_and_candidate_report(self) -> None:
        self.application.dispatch("POST", "/api/responses", self.submission())
        self.application.dispatch(
            "POST",
            "/api/responses",
            self.submission(
                riverId="dongcheon",
                policyIds=["sewer", "treatment", "sourceBlock", "ecology"],
                district="busanjin",
                topPriority="ecology",
            ),
        )

        stats_status, stats = self.application.dispatch("GET", "/api/stats")
        report_status, report = self.application.dispatch(
            "GET", "/api/candidate/report"
        )

        self.assertEqual(stats_status, 200)
        self.assertEqual(stats["totalParticipants"], 2)
        self.assertEqual(stats["missionSuccessRate"], 100)
        self.assertEqual(stats["perfectClearRate"], 50)
        self.assertEqual(stats["mostSelectedPolicy"]["id"], "sewer")
        self.assertEqual(
            sum(item["count"] for item in stats["gradeDistribution"]["final"]), 2
        )
        self.assertEqual(report_status, 200)
        self.assertEqual(report["summary"]["totalParticipants"], 2)
        self.assertEqual(len(report["prioritiesByDistrict"]), 2)


if __name__ == "__main__":
    unittest.main()
