from __future__ import annotations

import json
import unittest
from urllib.error import URLError
from urllib.parse import parse_qs, urlsplit

from river_api.repository import RepositoryUnavailableError
from river_api.supabase_repository import SupabaseResponseRepository


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


def application_record() -> dict:
    return {
        "id": "4aa1f558-8607-4c89-82ef-8fbb5be73d1d",
        "riverId": "dongcheon",
        "character": "동이",
        "initialBod": 12.0,
        "finalBod": 1.9,
        "initialGrade": "VI",
        "finalGrade": "Ib",
        "gradeImprovement": 5,
        "missionSuccess": True,
        "perfectClear": False,
        "policyOrder": ["sewer", "treatment", "sourceBlock"],
        "topPriority": "source_control",
        "budgetUsed": 75,
        "scores": {"ecology": 48, "citizen": 35, "monitoring": 45},
        "pledgeMatchRate": 33,
        "district": "busanjin",
        "comment": "생활하수 문제를 먼저 해결해 주세요.",
        "consentToAggregate": True,
        "createdAt": "2026-08-13T09:39:15Z",
    }


def database_row(index: int = 0) -> dict:
    record = application_record()
    return {
        "id": f"00000000-0000-0000-0000-{index:012d}",
        "river_id": record["riverId"],
        "character_name": record["character"],
        "initial_bod": record["initialBod"],
        "final_bod": record["finalBod"],
        "initial_grade": record["initialGrade"],
        "final_grade": record["finalGrade"],
        "grade_improvement": record["gradeImprovement"],
        "mission_success": record["missionSuccess"],
        "perfect_clear": record["perfectClear"],
        "selected_policy_ids": record["policyOrder"],
        "top_priority": record["topPriority"],
        "budget_used": record["budgetUsed"],
        "ecology_score": record["scores"]["ecology"],
        "citizen_score": record["scores"]["citizen"],
        "monitoring_score": record["scores"]["monitoring"],
        "pledge_match_rate": record["pledgeMatchRate"],
        "district": record["district"],
        "comment": record["comment"],
        "consent_to_aggregate": True,
        "created_at": record["createdAt"],
    }


class SupabaseRepositoryTests(unittest.TestCase):
    def test_initialize_checks_responses_table_with_secret_key(self) -> None:
        calls = []

        def opener(request, timeout):
            calls.append((request, timeout))
            return FakeResponse([])

        repository = SupabaseResponseRepository(
            "https://example.supabase.co",
            "sb_secret_test-key",
            opener=opener,
        )
        repository.initialize()

        request, timeout = calls[0]
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(request.get_header("Apikey"), "sb_secret_test-key")
        self.assertIsNone(request.get_header("Authorization"))
        self.assertEqual(timeout, 10)
        self.assertEqual(parse_qs(urlsplit(request.full_url).query)["select"], ["id"])

    def test_create_maps_application_record_to_database_columns(self) -> None:
        calls = []

        def opener(request, timeout):
            calls.append(request)
            return FakeResponse([{"id": application_record()["id"]}])

        repository = SupabaseResponseRepository(
            "https://example.supabase.co", "sb_secret_test-key", opener=opener
        )
        result = repository.create(application_record())

        request = calls[0]
        body = json.loads(request.data.decode("utf-8"))
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.get_header("Prefer"), "return=representation")
        self.assertEqual(body["river_id"], "dongcheon")
        self.assertEqual(
            body["selected_policy_ids"], ["sewer", "treatment", "sourceBlock"]
        )
        self.assertEqual(result["finalBod"], 1.9)

    def test_list_all_paginates_beyond_supabase_default_limit(self) -> None:
        offsets = []

        def opener(request, timeout):
            query = parse_qs(urlsplit(request.full_url).query)
            offset = int(query["offset"][0])
            offsets.append(offset)
            if offset == 0:
                return FakeResponse([database_row(index) for index in range(1000)])
            return FakeResponse([database_row(1000)])

        repository = SupabaseResponseRepository(
            "https://example.supabase.co", "sb_secret_test-key", opener=opener
        )
        records = repository.list_all()

        self.assertEqual(offsets, [0, 1000])
        self.assertEqual(len(records), 1001)
        self.assertEqual(records[0]["riverId"], "dongcheon")
        self.assertEqual(records[-1]["policyOrder"], ["sewer", "treatment", "sourceBlock"])

    def test_legacy_service_role_key_uses_bearer_header(self) -> None:
        calls = []

        def opener(request, timeout):
            calls.append(request)
            return FakeResponse([])

        repository = SupabaseResponseRepository(
            "https://example.supabase.co", "legacy.jwt.value", opener=opener
        )
        repository.initialize()
        self.assertEqual(
            calls[0].get_header("Authorization"), "Bearer legacy.jwt.value"
        )

    def test_connection_error_never_exposes_secret_key(self) -> None:
        def opener(request, timeout):
            raise URLError("network unavailable")

        secret = "sb_secret_do-not-leak"
        repository = SupabaseResponseRepository(
            "https://example.supabase.co", secret, opener=opener
        )
        with self.assertRaises(RepositoryUnavailableError) as context:
            repository.initialize()
        self.assertNotIn(secret, str(context.exception))


if __name__ == "__main__":
    unittest.main()
