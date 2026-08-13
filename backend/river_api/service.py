from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from uuid import uuid4

from .domain import (
    DISTRICT_BY_ID,
    PRIORITY_BY_ID,
    RIVER_BY_ID,
    DomainValidationError,
    game_config,
    simulate,
)
from .repository import ResponseFilters, ResponseRepository
from .statistics import (
    build_candidate_comments,
    build_candidate_report,
    build_statistics,
)


SUBMISSION_FIELDS = {
    "riverId",
    "policyIds",
    "eventChoice",
    "topPriority",
    "district",
    "comment",
    "consentToAggregate",
}
SIMULATION_FIELDS = {"riverId", "policyIds", "eventChoice"}
CANDIDATE_FILTER_FIELDS = {"riverId", "district", "from", "to"}
CANDIDATE_COMMENT_FIELDS = CANDIDATE_FILTER_FIELDS | {
    "page",
    "pageSize",
    "sort",
}
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
DEFAULT_COMMENT_PAGE_SIZE = 20
MAX_COMMENT_PAGE_SIZE = 100

EMAIL_PATTERN = re.compile(
    r"(?<![A-Z0-9._%+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![A-Z0-9.-])",
    re.IGNORECASE,
)
PHONE_PATTERN = re.compile(r"(?<!\d)01[016789][ -]?\d{3,4}[ -]?\d{4}(?!\d)")
LANDLINE_PATTERN = re.compile(
    r"(?<!\d)0(?:2|[3-6][1-5])[ -]?\d{3,4}[ -]?\d{4}(?!\d)"
)
RESIDENT_REGISTRATION_NUMBER_PATTERN = re.compile(
    r"(?<!\d)\d{6}[ -]?[1-8]\d{6}(?!\d)"
)
EXPLICIT_NAME_PATTERN = re.compile(
    r"(?:제\s*)?(?:이름|성명|실명)\s*(?:은|는|:)?\s*[가-힣]{2,5}(?:\s|$|입니다|이에요|예요)"
)
ROAD_ADDRESS_PATTERN = re.compile(
    r"(?:[가-힣]{2,}(?:특별시|광역시|특별자치시|도|시|구|군)\s+){1,3}"
    r"[가-힣0-9·.-]+(?:로|길)\s*\d{1,4}(?:-\d{1,4})?"
)
LOT_ADDRESS_PATTERN = re.compile(
    r"(?:[가-힣]{2,}(?:특별시|광역시|특별자치시|도|시|구|군)\s+){1,3}"
    r"[가-힣0-9·.-]+(?:읍|면|동|가)\s*(?:산\s*)?\d{1,4}(?:-\d{1,4})?"
)
UNIT_ADDRESS_PATTERN = re.compile(
    r"(?:아파트|오피스텔|빌라)\s*\d{1,4}\s*동\s*\d{1,4}\s*호"
)
HTML_TAG_PATTERN = re.compile(
    r"<!--|-->|<\s*/?\s*(?:script|style|iframe|object|embed|svg|math|[A-Za-z][A-Za-z0-9:-]*)\b[^>]*>",
    re.IGNORECASE,
)

PERSONAL_INFORMATION_PATTERNS = (
    EMAIL_PATTERN,
    PHONE_PATTERN,
    LANDLINE_PATTERN,
    RESIDENT_REGISTRATION_NUMBER_PATTERN,
    EXPLICIT_NAME_PATTERN,
    ROAD_ADDRESS_PATTERN,
    LOT_ADDRESS_PATTERN,
    UNIT_ADDRESS_PATTERN,
)


def _normalize_comment(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    safe_characters = []
    for character in normalized:
        category = unicodedata.category(character)
        if category == "Cf":
            continue
        if category.startswith("C"):
            safe_characters.append(" ")
        else:
            safe_characters.append(character)
    return re.sub(r"\s+", " ", "".join(safe_characters)).strip()


def _validate_comment(value: Any) -> str:
    if not isinstance(value, str):
        raise DomainValidationError(
            "한 줄 의견은 문자열이어야 합니다.",
            [{"field": "comment", "reason": "string_required"}],
        )

    comment = _normalize_comment(value)
    if len(comment) > 200:
        raise DomainValidationError(
            "한 줄 의견은 200자 이하로 작성해 주세요.",
            [{"field": "comment", "reason": "max_length_200"}],
        )
    if HTML_TAG_PATTERN.search(comment):
        raise DomainValidationError(
            "한 줄 의견에는 HTML 태그를 사용할 수 없습니다.",
            [{"field": "comment", "reason": "html_not_allowed"}],
        )
    if any(pattern.search(comment) for pattern in PERSONAL_INFORMATION_PATTERNS):
        raise DomainValidationError(
            "한 줄 의견에 개인정보를 입력하지 말아 주세요.",
            [{"field": "comment", "reason": "personal_information_not_allowed"}],
            code="PERSONAL_INFORMATION_NOT_ALLOWED",
        )
    return comment


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


def _query_value(query: dict[str, Any], field: str) -> str | None:
    raw_value = query.get(field)
    if raw_value is None:
        return None
    values = [raw_value] if isinstance(raw_value, str) else raw_value
    if (
        not isinstance(values, list)
        or len(values) != 1
        or not isinstance(values[0], str)
    ):
        raise DomainValidationError(
            "조회 조건은 한 번씩만 입력해 주세요.",
            [{"field": field, "reason": "single_value_required"}],
        )
    if not values[0]:
        raise DomainValidationError(
            "조회 조건에 빈 값을 사용할 수 없습니다.",
            [{"field": field, "reason": "blank_not_allowed"}],
        )
    return values[0]


def _query_date(query: dict[str, Any], field: str) -> date | None:
    value = _query_value(query, field)
    if value is None:
        return None
    if not DATE_PATTERN.fullmatch(value):
        raise DomainValidationError(
            "날짜는 YYYY-MM-DD 형식이어야 합니다.",
            [{"field": field, "reason": "invalid_date"}],
        )
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise DomainValidationError(
            "존재하는 날짜를 입력해 주세요.",
            [{"field": field, "reason": "invalid_date"}],
        ) from None


def _utc_boundary(value: date) -> str:
    return datetime.combine(value, time.min, timezone.utc).isoformat().replace(
        "+00:00", "Z"
    )


def _candidate_filters(
    query: dict[str, Any] | None, allowed_fields: set[str]
) -> tuple[ResponseFilters, dict[str, str | None]]:
    query = query or {}
    unknown = sorted(set(query) - allowed_fields)
    if unknown:
        raise DomainValidationError(
            "알 수 없는 조회 조건이 포함되어 있습니다.",
            [
                {"field": field, "reason": "unknown_query_parameter"}
                for field in unknown
            ],
        )

    river_id = _query_value(query, "riverId")
    if river_id is not None and river_id not in RIVER_BY_ID:
        raise DomainValidationError(
            "알 수 없는 하천입니다.",
            [{"field": "riverId", "reason": "unknown_river"}],
        )
    district = _query_value(query, "district")
    if district is not None and district not in DISTRICT_BY_ID:
        raise DomainValidationError(
            "알 수 없는 지역입니다.",
            [{"field": "district", "reason": "unknown_district"}],
        )

    from_date = _query_date(query, "from")
    to_date = _query_date(query, "to")
    if from_date is not None and to_date is not None and from_date > to_date:
        raise DomainValidationError(
            "시작 날짜는 종료 날짜보다 늦을 수 없습니다.",
            [{"field": "from", "reason": "after_to"}],
        )
    try:
        created_before = _utc_boundary(to_date + timedelta(days=1)) if to_date else None
    except OverflowError:
        raise DomainValidationError(
            "종료 날짜가 너무 큽니다.",
            [{"field": "to", "reason": "invalid_date"}],
        ) from None

    filters = ResponseFilters(
        river_id=river_id,
        district=district,
        created_from=_utc_boundary(from_date) if from_date else None,
        created_before=created_before,
    )
    return filters, {
        "riverId": river_id,
        "district": district,
        "from": from_date.isoformat() if from_date else None,
        "to": to_date.isoformat() if to_date else None,
    }


def _positive_query_int(
    query: dict[str, Any], field: str, default: int, maximum: int | None = None
) -> int:
    value = _query_value(query, field)
    if value is None:
        return default
    if not value.isdecimal():
        raise DomainValidationError(
            "페이지 값은 양의 정수여야 합니다.",
            [{"field": field, "reason": "positive_integer_required"}],
        )
    number = int(value)
    if number < 1 or (maximum is not None and number > maximum):
        reason = "out_of_range" if maximum is not None else "positive_integer_required"
        raise DomainValidationError(
            "페이지 값을 허용 범위 안에서 입력해 주세요.",
            [{"field": field, "reason": reason}],
        )
    return number


class RiverService:
    def __init__(self, repository: ResponseRepository):
        self.repository = repository

    def config(self) -> dict[str, Any]:
        return game_config()

    def calculate(self, payload: Any) -> dict[str, Any]:
        body = _require_object(payload)
        _validate_exact_fields(body, SIMULATION_FIELDS, {"riverId", "policyIds"})
        return simulate(
            body["riverId"], body["policyIds"], body.get("eventChoice")
        )

    def submit(self, payload: Any) -> dict[str, Any]:
        body = _require_object(payload)
        required = SUBMISSION_FIELDS - {"comment", "eventChoice"}
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

        comment = _validate_comment(body.get("comment", ""))

        simulation = simulate(
            body["riverId"], body["policyIds"], body.get("eventChoice")
        )
        if simulation["event"]["status"] == "PENDING":
            raise DomainValidationError(
                "돌발상황 대응 방법을 선택해 주세요.",
                [{"field": "eventChoice", "reason": "required_when_event_triggered"}],
            )
        event = simulation["event"]
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
            "eventId": event["id"] if event["status"] == "RESOLVED" else None,
            "eventChoice": event["choice"],
            "eventCost": event["cost"],
            "eventScoreEffects": event["scoreEffects"],
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

    def candidate_report(self, query: dict[str, Any] | None = None) -> dict[str, Any]:
        filters, applied_filters = _candidate_filters(
            query, CANDIDATE_FILTER_FIELDS
        )
        report = build_candidate_report(self.repository.list_filtered(filters))
        report["filters"] = applied_filters
        return report

    def candidate_comments(self, query: dict[str, Any] | None = None) -> dict[str, Any]:
        query = query or {}
        filters, applied_filters = _candidate_filters(
            query, CANDIDATE_COMMENT_FIELDS
        )
        page = _positive_query_int(query, "page", 1)
        page_size = _positive_query_int(
            query, "pageSize", DEFAULT_COMMENT_PAGE_SIZE, MAX_COMMENT_PAGE_SIZE
        )
        sort = _query_value(query, "sort") or "latest"
        if sort not in {"latest", "oldest"}:
            raise DomainValidationError(
                "정렬 기준은 latest 또는 oldest여야 합니다.",
                [{"field": "sort", "reason": "unknown_sort"}],
            )

        total_items = self.repository.count_filtered(filters, comments_only=True)
        records = self.repository.list_filtered(
            filters,
            offset=(page - 1) * page_size,
            limit=page_size,
            descending=sort == "latest",
            comments_only=True,
        )
        total_pages = (total_items + page_size - 1) // page_size
        return {
            "items": build_candidate_comments(records),
            "pagination": {
                "page": page,
                "pageSize": page_size,
                "totalItems": total_items,
                "totalPages": total_pages,
                "hasNext": page < total_pages,
                "hasPrevious": page > 1,
            },
            "sort": sort,
            "filters": applied_filters,
            "isDemoData": True,
        }
