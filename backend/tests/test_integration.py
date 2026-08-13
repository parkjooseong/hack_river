from __future__ import annotations

import json
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from river_api.application import Application
from river_api.http_server import create_handler
from river_api.repository import SQLiteResponseRepository
from river_api.service import RiverService


class HttpIntegrationTests(unittest.TestCase):
    ALLOWED_ORIGIN = "https://gang-saeroi.example"

    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        self.database_path = Path(self.temp_directory.name) / "integration.sqlite3"
        try:
            self._start_server()
        except PermissionError:
            self.temp_directory.cleanup()
            self.skipTest("현재 실행 환경에서 localhost 소켓 생성을 허용하지 않습니다.")

    def tearDown(self) -> None:
        self._stop_server()
        self.temp_directory.cleanup()

    def _start_server(self) -> None:
        repository = SQLiteResponseRepository(self.database_path)
        repository.initialize()
        application = Application(RiverService(repository), lambda _token: None)
        handler = create_handler(application, {self.ALLOWED_ORIGIN})
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"

    def _stop_server(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)

    def _request(
        self,
        method: str,
        path: str,
        payload: dict | None = None,
        origin: str | None = None,
    ) -> tuple[int, dict, dict[str, str]]:
        body = None
        headers = {}
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if origin is not None:
            headers["Origin"] = origin
        request = Request(
            f"{self.base_url}{path}", data=body, headers=headers, method=method
        )
        try:
            response = urlopen(request, timeout=5)
        except HTTPError as error:
            response = error
        with response:
            status = response.status
            response_headers = dict(response.headers.items())
            response_body = json.loads(response.read().decode("utf-8"))
        return status, response_body, response_headers

    def test_full_http_flow_and_restart_persistence(self) -> None:
        health_status, health, health_headers = self._request(
            "GET", "/health", origin=self.ALLOWED_ORIGIN
        )
        config_status, config, _ = self._request("GET", "/api/game/config")
        calculation_status, calculation, _ = self._request(
            "POST",
            "/api/simulations",
            {
                "riverId": "dongcheon",
                "policyIds": ["sewer", "treatment", "sourceBlock"],
                "eventChoice": "WAIT",
            },
        )
        submission_status, submission, _ = self._request(
            "POST",
            "/api/responses",
            {
                "riverId": "dongcheon",
                "policyIds": ["sewer", "treatment", "sourceBlock"],
                "eventChoice": "WAIT",
                "topPriority": "source_control",
                "district": "busanjin",
                "comment": "하류 악취를 빠르게 해결해 주세요.",
                "consentToAggregate": True,
            },
        )
        stats_status, stats, _ = self._request("GET", "/api/stats")
        report_status, report, _ = self._request(
            "GET",
            "/api/candidate/report?riverId=dongcheon&district=busanjin",
        )
        comments_status, comments, _ = self._request(
            "GET", "/api/candidate/comments?page=1&pageSize=20&sort=latest"
        )

        self.assertEqual(health_status, 200)
        self.assertEqual(health["service"], "gang-saeroi-api")
        self.assertEqual(health_headers["Access-Control-Allow-Origin"], self.ALLOWED_ORIGIN)
        self.assertEqual(health_headers["Cache-Control"], "no-store")
        self.assertTrue(health_headers["X-Request-ID"])
        self.assertEqual(config_status, 200)
        self.assertTrue(config["isDemoData"])
        self.assertTrue(config["disclaimer"])
        self.assertFalse(config["commentRules"]["collectsPersonalInformation"])
        self.assertEqual(calculation_status, 200)
        self.assertEqual(calculation["finalBod"], 1.9)
        self.assertEqual(calculation["finalGrade"]["symbol"], "Ib")
        self.assertEqual(calculation["budgetUsed"], 75)
        self.assertEqual(calculation["event"]["status"], "RESOLVED")
        self.assertEqual(submission_status, 201)
        self.assertEqual(submission["result"]["finalBod"], calculation["finalBod"])
        self.assertEqual(stats_status, 200)
        self.assertEqual(stats["totalParticipants"], 1)
        self.assertEqual(stats["commentKeywordAnalysis"]["topCategories"][0]["id"], "ODOR")
        self.assertEqual(report_status, 200)
        self.assertEqual(report["summary"]["totalParticipants"], 1)
        self.assertIn("대표하지 않습니다", report["methodology"]["representativeness"])
        self.assertEqual(comments_status, 200)
        self.assertEqual(comments["pagination"]["totalItems"], 1)
        self.assertEqual(comments["items"][0]["comment"], "하류 악취를 빠르게 해결해 주세요.")

        self._stop_server()
        self._start_server()
        restart_status, restart_stats, _ = self._request("GET", "/api/stats")
        self.assertEqual(restart_status, 200)
        self.assertEqual(restart_stats["totalParticipants"], 1)
        self.assertEqual(
            restart_stats["commentKeywordAnalysis"], stats["commentKeywordAnalysis"]
        )

    def test_http_rejects_tampering_consent_privacy_budget_and_unknown_origin(self) -> None:
        base_submission = {
            "riverId": "dongcheon",
            "policyIds": ["sewer", "treatment", "sourceBlock"],
            "eventChoice": "WAIT",
            "topPriority": "source_control",
            "district": "busanjin",
            "comment": "수질 개선이 필요합니다.",
            "consentToAggregate": True,
        }
        cases = (
            ({**base_submission, "finalBod": 0.8}, "unknown_field"),
            ({**base_submission, "consentToAggregate": False}, "consent_required"),
            (
                {**base_submission, "comment": "연락처는 010-1234-5678입니다."},
                "personal_information_not_allowed",
            ),
        )
        for payload, reason in cases:
            with self.subTest(reason=reason):
                status, response, _ = self._request(
                    "POST", "/api/responses", payload
                )
                self.assertEqual(status, 400)
                self.assertIn(reason, {item["reason"] for item in response["error"]["details"]})

        budget_status, budget_error, _ = self._request(
            "POST",
            "/api/simulations",
            {
                "riverId": "dongcheon",
                "policyIds": [
                    "sewer",
                    "treatment",
                    "sourceBlock",
                    "ecology",
                    "sensor",
                ],
            },
        )
        origin_status, _, origin_headers = self._request(
            "GET", "/health", origin="https://untrusted.example"
        )
        stats_status, stats, _ = self._request("GET", "/api/stats")

        self.assertEqual(budget_status, 400)
        self.assertEqual(budget_error["error"]["details"][0]["reason"], "budget_exceeded")
        self.assertEqual(origin_status, 200)
        self.assertNotIn("Access-Control-Allow-Origin", origin_headers)
        self.assertEqual(stats_status, 200)
        self.assertEqual(stats["totalParticipants"], 0)


if __name__ == "__main__":
    unittest.main()
