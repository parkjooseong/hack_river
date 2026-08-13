from __future__ import annotations

import json
import unittest
from urllib.error import URLError
from urllib.parse import parse_qs, urlsplit

from river_api.repository import RepositoryUnavailableError, ResponseFilters
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
        "eventId": "DOWNSTREAM_ODOR_SURGE",
        "eventChoice": "INVESTIGATE",
        "eventCost": 5,
        "eventScoreEffects": {"ecology": 0, "citizen": 5, "monitoring": 10},
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
        "event_id": record["eventId"],
        "event_choice": record["eventChoice"],
        "event_cost": record["eventCost"],
        "event_score_effects": record["eventScoreEffects"],
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
        self.assertEqual(request.get_header("User-agent"), "gang-saeroi-backend/0.2")
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
        self.assertEqual(body["event_choice"], "INVESTIGATE")
        self.assertEqual(
            body["event_score_effects"],
            {"ecology": 0, "citizen": 5, "monitoring": 10},
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
        self.assertEqual(records[0]["eventChoice"], "INVESTIGATE")
        self.assertEqual(
            records[0]["eventScoreEffects"],
            {"ecology": 0, "citizen": 5, "monitoring": 10},
        )
        self.assertEqual(records[-1]["policyOrder"], ["sewer", "treatment", "sourceBlock"])

    def test_filtered_comment_page_maps_filters_sort_and_pagination(self) -> None:
        calls = []

        def opener(request, timeout):
            calls.append(request)
            return FakeResponse([database_row(1)])

        repository = SupabaseResponseRepository(
            "https://example.supabase.co", "sb_secret_test-key", opener=opener
        )
        records = repository.list_filtered(
            ResponseFilters(
                river_id="dongcheon",
                district="busanjin",
                created_from="2026-08-01T00:00:00Z",
                created_before="2026-09-01T00:00:00Z",
            ),
            offset=20,
            limit=10,
            descending=False,
            comments_only=True,
        )

        query = parse_qs(urlsplit(calls[0].full_url).query)
        self.assertEqual(query["river_id"], ["eq.dongcheon"])
        self.assertEqual(query["district"], ["eq.busanjin"])
        self.assertEqual(
            query["created_at"],
            ["gte.2026-08-01T00:00:00Z", "lt.2026-09-01T00:00:00Z"],
        )
        self.assertEqual(query["comment"], ["neq."])
        self.assertEqual(query["order"], ["created_at.asc,id.asc"])
        self.assertEqual(query["offset"], ["20"])
        self.assertEqual(query["limit"], ["10"])
        self.assertEqual(records[0]["id"], database_row(1)["id"])

    def test_count_filtered_fetches_only_ids(self) -> None:
        calls = []

        def opener(request, timeout):
            calls.append(request)
            return FakeResponse([{"id": "1"}, {"id": "2"}, {"id": "3"}])

        repository = SupabaseResponseRepository(
            "https://example.supabase.co", "sb_secret_test-key", opener=opener
        )
        count = repository.count_filtered(
            ResponseFilters(district="dongnae"), comments_only=True
        )

        query = parse_qs(urlsplit(calls[0].full_url).query)
        self.assertEqual(count, 3)
        self.assertEqual(query["select"], ["id"])
        self.assertEqual(query["district"], ["eq.dongnae"])
        self.assertEqual(query["comment"], ["neq."])

    def test_count_filtered_paginates_beyond_supabase_limit(self) -> None:
        offsets = []

        def opener(request, timeout):
            query = parse_qs(urlsplit(request.full_url).query)
            offset = int(query["offset"][0])
            offsets.append(offset)
            count = 1000 if offset == 0 else 25
            return FakeResponse([{"id": str(index)} for index in range(count)])

        repository = SupabaseResponseRepository(
            "https://example.supabase.co", "sb_secret_test-key", opener=opener
        )
        count = repository.count_filtered(ResponseFilters(), comments_only=True)

        self.assertEqual(count, 1025)
        self.assertEqual(offsets, [0, 1000])

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
