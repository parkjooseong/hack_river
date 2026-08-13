from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from river_api.application import Application
from river_api.repository import RepositoryUnavailableError, SQLiteResponseRepository
from river_api.service import RiverService


class ApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        repository = SQLiteResponseRepository(
            Path(self.temp_directory.name) / "responses.sqlite3"
        )
        repository.initialize()
        self.repository = repository
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
        comments = (
            "연락처는 010-1234-5678입니다.",
            "전화는 051-123-4567입니다.",
            "메일은 person@example.com입니다.",
            "메일은 person\u200b@example.com입니다.",
            "주민번호는 900101-1234567입니다.",
            "제 이름은 홍길동입니다.",
            "주소는 부산광역시 부산진구 중앙대로 123입니다.",
            "해운대 아파트 101동 1203호입니다.",
        )
        for comment in comments:
            with self.subTest(comment=comment):
                status, response = self.application.dispatch(
                    "POST", "/api/responses", self.submission(comment=comment)
                )
                self.assertEqual(status, 400)
                self.assertEqual(
                    response["error"]["code"],
                    "PERSONAL_INFORMATION_NOT_ALLOWED",
                )
                self.assertEqual(
                    response["error"]["details"][0]["reason"],
                    "personal_information_not_allowed",
                )
                self.assertRegex(response["error"]["requestId"], r"^[0-9a-f]{32}$")

    def test_comment_is_normalized_before_storage(self) -> None:
        status, _ = self.application.dispatch(
            "POST",
            "/api/responses",
            self.submission(comment="  수질\t개선\n의견\u200b입니다.  "),
        )
        stored = self.repository.list_all()[0]

        self.assertEqual(status, 201)
        self.assertEqual(stored["comment"], "수질 개선 의견입니다.")

    def test_html_markup_in_comment_is_rejected(self) -> None:
        status, response = self.application.dispatch(
            "POST",
            "/api/responses",
            self.submission(comment="<script>alert('x')</script> 수질 개선"),
        )
        self.assertEqual(status, 400)
        self.assertEqual(response["error"]["code"], "VALIDATION_ERROR")
        self.assertEqual(response["error"]["details"][0]["reason"], "html_not_allowed")

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

    def test_database_failure_returns_safe_503_response(self) -> None:
        class UnavailableRepository:
            def create(self, response):
                raise RepositoryUnavailableError("secret database details")

            def list_all(self):
                raise RepositoryUnavailableError("secret database details")

        application = Application(RiverService(UnavailableRepository()))
        status, response = application.dispatch(
            "GET", "/api/stats", request_id="database-request-id"
        )

        self.assertEqual(status, 503)
        self.assertEqual(response["error"]["code"], "DATABASE_UNAVAILABLE")
        self.assertEqual(response["error"]["requestId"], "database-request-id")
        self.assertNotIn("secret", response["error"]["message"])

    def test_sqlite_failure_is_converted_to_safe_503_response(self) -> None:
        with patch.object(
            self.repository,
            "_connect",
            side_effect=sqlite3.OperationalError("private database path"),
        ):
            status, response = self.application.dispatch(
                "GET", "/api/stats", request_id="sqlite-request-id"
            )

        self.assertEqual(status, 503)
        self.assertEqual(response["error"]["code"], "DATABASE_UNAVAILABLE")
        self.assertNotIn("private", str(response))

    def test_method_not_allowed_and_not_found_are_consistent_errors(self) -> None:
        method_status, method_response = self.application.dispatch(
            "POST", "/health", request_id="method-request-id"
        )
        missing_status, missing_response = self.application.dispatch(
            "GET", "/missing", request_id="missing-request-id"
        )

        self.assertEqual(method_status, 405)
        self.assertEqual(method_response["error"]["code"], "METHOD_NOT_ALLOWED")
        self.assertEqual(method_response["error"]["requestId"], "method-request-id")
        self.assertEqual(
            method_response["error"]["details"][0]["allowed"], ["GET"]
        )
        self.assertEqual(missing_status, 404)
        self.assertEqual(missing_response["error"]["code"], "NOT_FOUND")
        self.assertEqual(missing_response["error"]["details"], [])
        self.assertEqual(missing_response["error"]["requestId"], "missing-request-id")

    def test_unexpected_error_returns_generic_500_and_safe_log(self) -> None:
        class ExplodingRepository:
            def list_all(self):
                raise RuntimeError("SUPABASE_SECRET_KEY=must-not-leak")

        application = Application(RiverService(ExplodingRepository()))
        with self.assertLogs("river_api", level="ERROR") as logs:
            status, response = application.dispatch(
                "GET", "/api/stats", request_id="internal-request-id"
            )

        self.assertEqual(status, 500)
        self.assertEqual(response["error"]["code"], "INTERNAL_SERVER_ERROR")
        self.assertEqual(response["error"]["requestId"], "internal-request-id")
        self.assertNotIn("must-not-leak", str(response))
        self.assertNotIn("must-not-leak", "\n".join(logs.output))
        self.assertIn("request_id=internal-request-id", "\n".join(logs.output))

    def test_game_config_contains_comment_privacy_notice(self) -> None:
        status, config = self.application.dispatch("GET", "/api/game/config")
        self.assertEqual(status, 200)
        self.assertEqual(config["commentRules"]["maxLength"], 200)
        self.assertFalse(config["commentRules"]["collectsPersonalInformation"])
        self.assertIn("정확한 주소", config["commentRules"]["privacyNotice"])


if __name__ == "__main__":
    unittest.main()
