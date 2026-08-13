from __future__ import annotations

import json
import re
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .repository import RepositoryUnavailableError


TABLE_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
DEFAULT_PAGE_SIZE = 1000


class SupabaseResponseRepository:
    """Response repository backed by Supabase's PostgREST Data API."""

    def __init__(
        self,
        project_url: str,
        secret_key: str,
        table: str = "responses",
        timeout_seconds: int = 10,
        opener: Callable[..., Any] = urlopen,
    ):
        normalized_url = project_url.strip().rstrip("/")
        if not normalized_url.startswith("https://"):
            raise ValueError("SUPABASE_URL은 https:// 주소여야 합니다.")
        if not secret_key.strip():
            raise ValueError("Supabase Secret key가 필요합니다.")
        if not TABLE_NAME_PATTERN.fullmatch(table):
            raise ValueError("SUPABASE_TABLE 이름이 올바르지 않습니다.")
        if timeout_seconds <= 0:
            raise ValueError("Supabase timeout은 1초 이상이어야 합니다.")

        self.base_url = f"{normalized_url}/rest/v1/{table}"
        self._secret_key = secret_key.strip()
        self.timeout_seconds = timeout_seconds
        self._opener = opener

    def _headers(self) -> dict[str, str]:
        headers = {
            "apikey": self._secret_key,
            "Accept": "application/json",
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "1mg-challenge-backend/0.1",
        }
        # Legacy service_role JWTs need Bearer auth. New sb_secret keys must not be
        # sent as Bearer tokens, so they use only the apikey header.
        if not self._secret_key.startswith("sb_secret_"):
            headers["Authorization"] = f"Bearer {self._secret_key}"
        return headers

    def _request(
        self,
        method: str,
        query: dict[str, str | int] | None = None,
        payload: dict[str, Any] | None = None,
        extra_headers: dict[str, str] | None = None,
    ) -> Any:
        url = self.base_url
        if query:
            url = f"{url}?{urlencode(query)}"
        body = None
        if payload is not None:
            body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode(
                "utf-8"
            )
        headers = self._headers()
        if extra_headers:
            headers.update(extra_headers)

        request = Request(url, data=body, headers=headers, method=method)
        try:
            with self._opener(request, timeout=self.timeout_seconds) as response:
                raw_body = response.read()
        except HTTPError as error:
            raise RepositoryUnavailableError(
                f"Supabase 요청에 실패했습니다. (HTTP {error.code})"
            ) from None
        except (URLError, TimeoutError, OSError):
            raise RepositoryUnavailableError("Supabase에 연결할 수 없습니다.") from None

        if not raw_body:
            return None
        try:
            return json.loads(raw_body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise RepositoryUnavailableError(
                "Supabase 응답 형식이 올바르지 않습니다."
            ) from None

    def initialize(self) -> None:
        result = self._request("GET", {"select": "id", "limit": 1})
        if not isinstance(result, list):
            raise RepositoryUnavailableError("Supabase responses 테이블을 확인할 수 없습니다.")

    def create(self, response: dict[str, Any]) -> dict[str, Any]:
        result = self._request(
            "POST",
            payload=self._to_database_row(response),
            extra_headers={"Prefer": "return=representation"},
        )
        if not isinstance(result, list) or len(result) != 1:
            raise RepositoryUnavailableError("Supabase 응답 저장 결과를 확인할 수 없습니다.")
        return response

    def list_all(self) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        offset = 0
        while True:
            page = self._request(
                "GET",
                {
                    "select": "*",
                    "order": "created_at.desc,id.desc",
                    "offset": offset,
                    "limit": DEFAULT_PAGE_SIZE,
                },
            )
            if not isinstance(page, list):
                raise RepositoryUnavailableError("Supabase 조회 결과를 확인할 수 없습니다.")
            rows.extend(self._from_database_row(row) for row in page)
            if len(page) < DEFAULT_PAGE_SIZE:
                break
            offset += DEFAULT_PAGE_SIZE
        return rows

    @staticmethod
    def _to_database_row(response: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": response["id"],
            "river_id": response["riverId"],
            "character_name": response["character"],
            "initial_bod": response["initialBod"],
            "final_bod": response["finalBod"],
            "initial_grade": response["initialGrade"],
            "final_grade": response["finalGrade"],
            "grade_improvement": response["gradeImprovement"],
            "mission_success": response["missionSuccess"],
            "perfect_clear": response["perfectClear"],
            "selected_policy_ids": response["policyOrder"],
            "top_priority": response["topPriority"],
            "budget_used": response["budgetUsed"],
            "ecology_score": response["scores"]["ecology"],
            "citizen_score": response["scores"]["citizen"],
            "monitoring_score": response["scores"]["monitoring"],
            "pledge_match_rate": response["pledgeMatchRate"],
            "district": response["district"],
            "comment": response["comment"],
            "consent_to_aggregate": True,
            "created_at": response["createdAt"],
        }

    @staticmethod
    def _from_database_row(row: dict[str, Any]) -> dict[str, Any]:
        policy_order = row["selected_policy_ids"]
        if isinstance(policy_order, str):
            try:
                policy_order = json.loads(policy_order)
            except json.JSONDecodeError:
                raise RepositoryUnavailableError(
                    "Supabase 정책 데이터 형식이 올바르지 않습니다."
                ) from None
        if not isinstance(policy_order, list):
            raise RepositoryUnavailableError("Supabase 정책 데이터 형식이 올바르지 않습니다.")

        return {
            "id": str(row["id"]),
            "riverId": row["river_id"],
            "character": row["character_name"],
            "initialBod": float(row["initial_bod"]),
            "finalBod": float(row["final_bod"]),
            "initialGrade": row["initial_grade"],
            "finalGrade": row["final_grade"],
            "gradeImprovement": int(row["grade_improvement"]),
            "missionSuccess": bool(row["mission_success"]),
            "perfectClear": bool(row["perfect_clear"]),
            "policyOrder": policy_order,
            "topPriority": row["top_priority"],
            "budgetUsed": int(row["budget_used"]),
            "scores": {
                "ecology": int(row["ecology_score"]),
                "citizen": int(row["citizen_score"]),
                "monitoring": int(row["monitoring_score"]),
            },
            "pledgeMatchRate": int(row["pledge_match_rate"]),
            "district": row["district"],
            "comment": row["comment"],
            "consentToAggregate": bool(row["consent_to_aggregate"]),
            "createdAt": row["created_at"],
        }
