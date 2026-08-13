from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from .domain import (
    DISTRICT_BY_ID,
    PRIORITY_BY_ID,
    DomainValidationError,
    game_config,
    simulate,
)
from .repository import ResponseRepository
from .statistics import build_candidate_report, build_statistics


SUBMISSION_FIELDS = {
    "riverId",
    "policyIds",
    "topPriority",
    "district",
    "comment",
    "consentToAggregate",
}
SIMULATION_FIELDS = {"riverId", "policyIds"}

EMAIL_PATTERN = re.compile(
    r"(?<![A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![A-Z0-9.-])",
    re.IGNORECASE,
)
PHONE_PATTERN = re.compile(r"(?<!\d)01[016789][ -]?\d{3,4}[ -]?\d{4}(?!\d)")


def _require_object(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise DomainValidationError(
            "요청 본문은 JSON 객체여야 합니다.",
            [{"field": "$", "reason": "object_required"}],
        )
    return payload


def _validate_exact_fields(
    payload: dict[str, Any], allowed: set[str], required: set[str]
) -> None:
    unknown = sorted(set(payload) - allowed)
    missing = sorted(required - set(payload))
    details = [
        {"field": field, "reason": "unknown_field"} for field in unknown
    ] + [{"field": field, "reason": "required"} for field in missing]
    if details:
        raise DomainValidationError("요청 항목을 확인해 주세요.", details)


class RiverService:
    def __init__(self, repository: ResponseRepository):
        self.repository = repository

    def config(self) -> dict[str, Any]:
        return game_config()

    def calculate(self, payload: Any) -> dict[str, Any]:
        body = _require_object(payload)
        _validate_exact_fields(body, SIMULATION_FIELDS, SIMULATION_FIELDS)
        return simulate(body["riverId"], body["policyIds"])

    def submit(self, payload: Any) -> dict[str, Any]:
        body = _require_object(payload)
        required = SUBMISSION_FIELDS - {"comment"}
        _validate_exact_fields(body, SUBMISSION_FIELDS, required)

        if body["consentToAggregate"] is not True:
            raise DomainValidationError(
                "익명 집계 동의가 있어야 응답을 저장할 수 있습니다.",
                [{"field": "consentToAggregate", "reason": "consent_required"}],
            )
        if not isinstance(body["topPriority"], str) or body["topPriority"] not in PRIORITY_BY_ID:
            raise DomainValidationError(
                "알 수 없는 최우선 정책입니다.",
                [{"field": "topPriority", "reason": "unknown_priority"}],
            )
        if not isinstance(body["district"], str) or body["district"] not in DISTRICT_BY_ID:
            raise DomainValidationError(
                "알 수 없는 지역입니다.",
                [{"field": "district", "reason": "unknown_district"}],
            )

        comment = body.get("comment", "")
        if not isinstance(comment, str):
            raise DomainValidationError(
                "한 줄 의견은 문자열이어야 합니다.",
                [{"field": "comment", "reason": "string_required"}],
            )
        comment = comment.strip()
        if len(comment) > 200:
            raise DomainValidationError(
                "한 줄 의견은 200자 이하로 작성해 주세요.",
                [{"field": "comment", "reason": "max_length_200"}],
            )
        if EMAIL_PATTERN.search(comment) or PHONE_PATTERN.search(comment):
            raise DomainValidationError(
                "한 줄 의견에 이메일이나 전화번호를 입력하지 말아 주세요.",
                [{"field": "comment", "reason": "personal_information_not_allowed"}],
            )

        simulation = simulate(body["riverId"], body["policyIds"])
        record = {
            "id": str(uuid4()),
            "riverId": simulation["river"]["id"],
            "character": simulation["character"],
            "initialBod": simulation["initialBod"],
            "finalBod": simulation["finalBod"],
            "initialGrade": simulation["initialGrade"]["symbol"],
            "finalGrade": simulation["finalGrade"]["symbol"],
            "gradeImprovement": simulation["gradeImprovement"],
            "missionSuccess": simulation["missionSuccess"],
            "perfectClear": simulation["perfectClear"],
            "policyOrder": simulation["policyOrder"],
            "topPriority": body["topPriority"],
            "budgetUsed": simulation["budgetUsed"],
            "scores": simulation["scores"],
            "pledgeMatchRate": simulation["pledgeMatchRate"],
            "district": body["district"],
            "comment": comment,
            "consentToAggregate": True,
            "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        self.repository.create(record)
        return {"id": record["id"], "createdAt": record["createdAt"], "result": simulation}

    def statistics(self) -> dict[str, Any]:
        return build_statistics(self.repository.list_all())

    def candidate_report(self) -> dict[str, Any]:
        return build_candidate_report(self.repository.list_all())
