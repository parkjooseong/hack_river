from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from river_api.application import Application
from river_api.candidate_auth import CandidateAuthorizationError
from river_api.domain import simulate
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
        self.application = Application(RiverService(repository), lambda _token: None)

    def tearDown(self) -> None:
        self.temp_directory.cleanup()

    @staticmethod
    def submission(**changes):
        payload = {
            "riverId": "oncheoncheon",
            "policyIds": ["sewer", "treatment"],
            "eventChoice": "INVESTIGATE",
            "topPriority": "source_control",
            "district": "dongnae",
            "comment": "수질 개선을 먼저 추진해 주세요.",
            "consentToAggregate": True,
        }
        payload.update(changes)
        return payload

    def store_response(
        self,
        index: int,
        *,
        river_id: str = "oncheoncheon",
        district: str = "dongnae",
        policy_ids: list[str] | None = None,
        top_priority: str = "source_control",
        comment: str = "수질 개선 의견입니다.",
        created_at: str = "2026-08-13T00:00:00Z",
    ) -> None:
        simulation = simulate(river_id, policy_ids or ["walking"])
        self.repository.create(
            {
                "id": f"00000000-0000-0000-0000-{index:012d}",
                "riverId": river_id,
                "character": simulation["character"],
                "initialBod": simulation["initialBod"],
                "finalBod": simulation["finalBod"],
                "initialGrade": simulation["initialGrade"]["symbol"],
                "finalGrade": simulation["finalGrade"]["symbol"],
                "gradeImprovement": simulation["gradeImprovement"],
                "missionSuccess": simulation["missionSuccess"],
                "perfectClear": simulation["perfectClear"],
                "policyOrder": simulation["policyOrder"],
                "topPriority": top_priority,
                "budgetUsed": simulation["budgetUsed"],
                "scores": simulation["scores"],
                "pledgeMatchRate": simulation["pledgeMatchRate"],
                "district": district,
                "comment": comment,
                "consentToAggregate": True,
                "createdAt": created_at,
            }
        )

    def test_server_calculates_result_before_saving(self) -> None:
        status, response = self.application.dispatch(
            "POST", "/api/responses", self.submission()
        )
        self.assertEqual(status, 201)
        self.assertEqual(response["result"]["finalBod"], 1.3)
        self.assertTrue(response["result"]["missionSuccess"])

    def test_event_flow_requires_resolution_and_persists_result(self) -> None:
        pending_status, pending = self.application.dispatch(
            "POST",
            "/api/simulations",
            {"riverId": "oncheoncheon", "policyIds": ["sensor", "walking"]},
        )
        resolved_status, resolved = self.application.dispatch(
            "POST",
            "/api/simulations",
            {
                "riverId": "oncheoncheon",
                "policyIds": ["sensor", "walking"],
                "eventChoice": "INVESTIGATE",
            },
        )
        missing_choice = self.submission()
        missing_choice.pop("eventChoice")
        rejected_status, rejected = self.application.dispatch(
            "POST", "/api/responses", missing_choice
        )
        saved_status, saved = self.application.dispatch(
            "POST",
            "/api/responses",
            self.submission(
                policyIds=["sensor", "walking"],
                eventChoice="INVESTIGATE",
            ),
        )
        stored = self.repository.list_all()[0]

        self.assertEqual(pending_status, 200)
        self.assertEqual(pending["event"]["status"], "PENDING")
        self.assertEqual(resolved_status, 200)
        self.assertEqual(resolved["event"]["status"], "RESOLVED")
        self.assertTrue(resolved["event"]["sensorAssisted"])
        self.assertEqual(resolved["event"]["cost"], 0)
        self.assertEqual(rejected_status, 400)
        self.assertEqual(
            rejected["error"]["details"][0]["reason"],
            "required_when_event_triggered",
        )
        self.assertEqual(saved_status, 201)
        self.assertEqual(saved["result"]["event"]["choice"], "INVESTIGATE")
        self.assertEqual(stored["eventId"], "DOWNSTREAM_ODOR_SURGE")
        self.assertEqual(stored["eventChoice"], "INVESTIGATE")
        self.assertEqual(stored["eventCost"], 0)
        self.assertEqual(
            stored["eventScoreEffects"],
            {"ecology": 0, "citizen": 5, "monitoring": 15},
        )
        self.application.dispatch(
            "POST",
            "/api/responses",
            self.submission(policyIds=["sensor", "walking"], eventChoice="WAIT"),
        )
        _, stats = self.application.dispatch("GET", "/api/stats")
        choices = {item["id"]: item for item in stats["eventStatistics"]["choices"]}
        self.assertEqual(choices["INVESTIGATE"]["count"], 1)
        self.assertEqual(choices["INVESTIGATE"]["rate"], 50)
        self.assertEqual(choices["WAIT"]["count"], 1)
        self.assertEqual(choices["WAIT"]["rate"], 50)
        self.assertEqual(
            stats["eventStatistics"]["sensorAssistedInvestigations"],
            {"count": 1, "rate": 100},
        )

    def test_one_policy_submission_does_not_require_event_choice(self) -> None:
        payload = self.submission(policyIds=["walking"])
        payload.pop("eventChoice")
        status, response = self.application.dispatch(
            "POST", "/api/responses", payload
        )

        self.assertEqual(status, 201)
        self.assertEqual(response["result"]["event"]["status"], "NOT_TRIGGERED")
        self.assertIsNone(self.repository.list_all()[0]["eventId"])

    def test_health_uses_gang_saeroi_service_identifier(self) -> None:
        status, response = self.application.dispatch("GET", "/health")
        self.assertEqual(status, 200)
        self.assertEqual(response["service"], "gang-saeroi-api")
        self.assertEqual(response["name"], "강 새로이")

    def test_candidate_endpoints_require_and_forward_access_token(self) -> None:
        received_tokens: list[str | None] = []

        def authorize(token: str | None) -> None:
            received_tokens.append(token)
            if token != "candidate-token":
                raise CandidateAuthorizationError(
                    401,
                    "CANDIDATE_AUTH_REQUIRED",
                    "후보자 로그인이 필요합니다.",
                )

        application = Application(self.application.service, authorize)
        rejected_status, rejected = application.dispatch(
            "GET", "/api/candidate/report"
        )
        accepted_status, _ = application.dispatch(
            "GET", "/api/candidate/report", access_token="candidate-token"
        )

        self.assertEqual(rejected_status, 401)
        self.assertEqual(rejected["error"]["code"], "CANDIDATE_AUTH_REQUIRED")
        self.assertEqual(accepted_status, 200)
        self.assertEqual(received_tokens, [None, "candidate-token"])

    def test_result_guidance_is_available_from_calculation_and_submission(self) -> None:
        calculation_status, calculation = self.application.dispatch(
            "POST",
            "/api/simulations",
            {"riverId": "oncheoncheon", "policyIds": ["walking"]},
        )
        submission_status, submission = self.application.dispatch(
            "POST", "/api/responses", self.submission()
        )

        self.assertEqual(calculation_status, 200)
        self.assertEqual(calculation["resultStatus"], "TRY_AGAIN")
        self.assertTrue(calculation["strengths"])
        self.assertTrue(calculation["recommendations"])
        self.assertIn("expectedFinalBod", calculation["recommendations"][0])

        self.assertEqual(submission_status, 201)
        self.assertEqual(submission["result"]["resultStatus"], "MISSION_COMPLETE")
        self.assertTrue(submission["result"]["badges"])
        self.assertEqual(submission["result"]["recommendations"], [])

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
                eventChoice="WAIT",
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
        self.assertEqual(stats["eventStatistics"]["eligibleParticipants"], 2)
        self.assertEqual(stats["eventStatistics"]["responseRate"], 100)
        self.assertEqual(
            {item["id"]: item["count"] for item in stats["eventStatistics"]["choices"]},
            {"INVESTIGATE": 1, "WAIT": 1},
        )
        self.assertEqual(stats["commentKeywordAnalysis"]["totalComments"], 2)
        self.assertEqual(
            sum(
                item["count"]
                for item in stats["commentKeywordAnalysis"]["categories"]
            ),
            2,
        )
        self.assertEqual(
            sum(item["count"] for item in stats["gradeDistribution"]["final"]), 2
        )
        self.assertEqual(report_status, 200)
        self.assertEqual(report["summary"]["totalParticipants"], 2)
        self.assertEqual(len(report["prioritiesByDistrict"]), 2)
        self.assertEqual(report["eventStatistics"], stats["eventStatistics"])
        self.assertEqual(
            report["commentKeywordAnalysis"], stats["commentKeywordAnalysis"]
        )

    def test_candidate_report_filters_and_inclusive_utc_dates(self) -> None:
        self.store_response(
            1,
            river_id="dongcheon",
            district="busanjin",
            created_at="2026-08-01T00:00:00Z",
        )
        self.store_response(
            2,
            river_id="dongcheon",
            district="dongnae",
            policy_ids=["sewer", "treatment", "sourceBlock"],
            top_priority="treatment",
            created_at="2026-08-15T12:00:00Z",
        )
        self.store_response(
            3,
            river_id="oncheoncheon",
            district="busanjin",
            policy_ids=["sewer", "treatment"],
            top_priority="ecology",
            created_at="2026-08-31T23:59:59Z",
        )
        self.store_response(
            4,
            river_id="dongcheon",
            district="busanjin",
            policy_ids=["sewer", "treatment", "sourceBlock"],
            created_at="2026-09-01T00:00:00Z",
        )

        _, river_report = self.application.dispatch(
            "GET", "/api/candidate/report", query={"riverId": ["dongcheon"]}
        )
        _, district_report = self.application.dispatch(
            "GET", "/api/candidate/report", query={"district": ["busanjin"]}
        )
        _, august_report = self.application.dispatch(
            "GET",
            "/api/candidate/report",
            query={"from": ["2026-08-01"], "to": ["2026-08-31"]},
        )
        status, combined = self.application.dispatch(
            "GET",
            "/api/candidate/report",
            query={
                "riverId": ["dongcheon"],
                "district": ["busanjin"],
                "from": ["2026-08-01"],
                "to": ["2026-08-31"],
            },
        )

        self.assertEqual(river_report["summary"]["totalParticipants"], 3)
        self.assertEqual(district_report["summary"]["totalParticipants"], 3)
        self.assertEqual(august_report["summary"]["totalParticipants"], 3)
        self.assertEqual(august_report["summary"]["missionSuccessRate"], 67)
        dongcheon_group = next(
            item
            for item in august_report["prioritiesByRiver"]
            if item["riverId"] == "dongcheon"
        )
        busanjin_group = next(
            item
            for item in august_report["prioritiesByDistrict"]
            if item["district"] == "busanjin"
        )
        river_priorities = {
            item["id"]: item for item in dongcheon_group["priorities"]
        }
        district_priorities = {
            item["id"]: item for item in busanjin_group["priorities"]
        }
        self.assertEqual(river_priorities["source_control"]["rate"], 50)
        self.assertEqual(river_priorities["treatment"]["rate"], 50)
        self.assertEqual(district_priorities["source_control"]["rate"], 50)
        self.assertEqual(district_priorities["ecology"]["rate"], 50)
        self.assertEqual(status, 200)
        self.assertEqual(combined["summary"]["totalParticipants"], 1)
        self.assertEqual(combined["commentKeywordAnalysis"]["totalComments"], 1)
        self.assertEqual(combined["filters"]["to"], "2026-08-31")
        self.assertEqual(combined["period"]["from"], "2026-08-01T00:00:00Z")
        self.assertEqual(len(combined["prioritiesByRiver"]), 1)
        self.assertEqual(len(combined["prioritiesByDistrict"]), 1)

    def test_candidate_report_returns_normal_empty_result(self) -> None:
        status, report = self.application.dispatch(
            "GET",
            "/api/candidate/report",
            query={"riverId": ["goejeongcheon"]},
        )
        self.assertEqual(status, 200)
        self.assertEqual(report["summary"]["totalParticipants"], 0)
        self.assertIsNone(report["summary"]["mostSelectedPolicy"])
        self.assertEqual(report["period"], {"from": None, "to": None})
        self.assertEqual(report["prioritiesByRiver"], [])
        self.assertEqual(report["prioritiesByDistrict"], [])

    def test_candidate_comments_support_pagination_filter_and_sort(self) -> None:
        for index in range(55):
            self.store_response(
                index,
                river_id="dongcheon" if index % 2 == 0 else "oncheoncheon",
                district="busanjin" if index % 3 == 0 else "dongnae",
                comment=f"의견 {index}",
                created_at=f"2026-08-01T00:00:{index:02d}Z",
            )
        self.store_response(
            100,
            comment="",
            created_at="2026-08-01T00:01:00Z",
        )

        status, third_page = self.application.dispatch(
            "GET",
            "/api/candidate/comments",
            query={"page": ["3"], "pageSize": ["20"], "sort": ["latest"]},
        )
        _, oldest = self.application.dispatch(
            "GET",
            "/api/candidate/comments",
            query={"pageSize": ["10"], "sort": ["oldest"]},
        )
        _, filtered = self.application.dispatch(
            "GET",
            "/api/candidate/comments",
            query={"riverId": ["dongcheon"], "pageSize": ["10"]},
        )

        self.assertEqual(status, 200)
        self.assertEqual(third_page["pagination"]["totalItems"], 55)
        self.assertEqual(third_page["pagination"]["totalPages"], 3)
        self.assertEqual(len(third_page["items"]), 15)
        self.assertEqual(third_page["items"][0]["comment"], "의견 14")
        self.assertFalse(third_page["pagination"]["hasNext"])
        self.assertTrue(third_page["pagination"]["hasPrevious"])
        self.assertEqual(oldest["items"][0]["comment"], "의견 0")
        self.assertEqual(filtered["pagination"]["totalItems"], 28)
        self.assertTrue(filtered["pagination"]["hasNext"])
        self.assertTrue(
            all(item["riverId"] == "dongcheon" for item in filtered["items"])
        )

    def test_candidate_query_validation(self) -> None:
        cases = (
            ("/api/candidate/report", {"riverId": ["unknown"]}, "riverId"),
            ("/api/candidate/report", {"district": ["unknown"]}, "district"),
            ("/api/candidate/report", {"from": ["2026-02-30"]}, "from"),
            (
                "/api/candidate/report",
                {"from": ["2026-09-01"], "to": ["2026-08-01"]},
                "from",
            ),
            ("/api/candidate/report", {"page": ["1"]}, "page"),
            ("/api/candidate/comments", {"page": ["0"]}, "page"),
            ("/api/candidate/comments", {"pageSize": ["101"]}, "pageSize"),
            ("/api/candidate/comments", {"sort": ["newest"]}, "sort"),
            (
                "/api/candidate/comments",
                {"riverId": ["dongcheon", "oncheoncheon"]},
                "riverId",
            ),
            ("/api/candidate/comments", {"district": [""]}, "district"),
        )
        for path, query, expected_field in cases:
            with self.subTest(path=path, query=query):
                status, response = self.application.dispatch(
                    "GET", path, query=query
                )
                self.assertEqual(status, 400)
                self.assertEqual(response["error"]["code"], "VALIDATION_ERROR")
                self.assertEqual(
                    response["error"]["details"][0]["field"], expected_field
                )

    def test_database_failure_returns_safe_503_response(self) -> None:
        class UnavailableRepository:
            def create(self, response):
                raise RepositoryUnavailableError("secret database details")

            def list_all(self):
                raise RepositoryUnavailableError("secret database details")

        application = Application(RiverService(UnavailableRepository()), lambda _token: None)
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

        application = Application(RiverService(ExplodingRepository()), lambda _token: None)
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
        self.assertEqual(config["serviceName"], "강 새로이")
        self.assertEqual(config["commentRules"]["maxLength"], 200)
        self.assertFalse(config["commentRules"]["collectsPersonalInformation"])
        self.assertIn("정확한 주소", config["commentRules"]["privacyNotice"])


if __name__ == "__main__":
    unittest.main()
