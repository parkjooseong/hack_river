from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any
import unicodedata
from zoneinfo import ZoneInfo

from .domain import (
    DISTRICT_BY_ID,
    EVENT_CHOICES,
    EVENT_ID,
    EVENT_TRIGGER_POLICY_COUNT,
    POLICIES,
    POLICY_BY_ID,
    PRIORITIES,
    PRIORITY_BY_ID,
    RIVERS,
    RIVER_BY_ID,
    SIMULATION_DISCLAIMER,
)


COMMENT_KEYWORD_CATEGORIES = (
    {
        "id": "ODOR",
        "name": "악취",
        "keywords": ("악취", "냄새", "썩은내", "하수 냄새"),
    },
    {
        "id": "POLLUTION_SOURCE",
        "name": "오염원·생활하수",
        "keywords": (
            "오염원",
            "생활하수",
            "수질오염",
            "하수관",
            "정화시설",
            "폐수",
            "오수",
            "하수",
            "배출",
            "유입",
        ),
    },
    {
        "id": "DATA_DISCLOSURE",
        "name": "데이터 공개",
        "keywords": (
            "데이터",
            "정보 공개",
            "결과 공개",
            "수질정보",
            "수질 정보",
            "측정값",
            "실시간",
            "투명",
            "알림",
        ),
    },
    {
        "id": "ECOLOGY_RESTORATION",
        "name": "생태 복원",
        "keywords": (
            "생태",
            "복원",
            "물고기",
            "어류",
            "수생태",
            "서식지",
            "자연형",
            "녹지",
        ),
    },
    {
        "id": "WALKING_AMENITIES",
        "name": "산책로·편의시설",
        "keywords": (
            "산책로",
            "워킹로드",
            "워킹 로드",
            "편의시설",
            "편의 시설",
            "보행",
            "조명",
            "벤치",
            "자전거",
            "데크",
        ),
    },
    {"id": "OTHER", "name": "기타", "keywords": ()},
)
COMMENT_KEYWORD_CATEGORY_BY_ID = {
    category["id"]: category for category in COMMENT_KEYWORD_CATEGORIES
}


def _rate(count: int, total: int) -> int:
    return round(count / total * 100) if total else 0


def _counts(items: list[str]) -> Counter[str]:
    return Counter(items)


def classify_comment(comment: Any) -> dict[str, Any]:
    """Return one deterministic primary category without changing the original text."""

    normalized = (
        unicodedata.normalize("NFKC", comment).casefold()
        if isinstance(comment, str)
        else ""
    )
    candidates: list[tuple[int, int, int, dict[str, Any], list[str]]] = []
    for priority, category in enumerate(COMMENT_KEYWORD_CATEGORIES[:-1]):
        matched = [
            keyword for keyword in category["keywords"] if keyword in normalized
        ]
        if matched:
            first_position = min(normalized.find(keyword) for keyword in matched)
            candidates.append(
                (-len(matched), first_position, priority, category, matched)
            )

    if not candidates:
        other = COMMENT_KEYWORD_CATEGORY_BY_ID["OTHER"]
        return {"id": other["id"], "name": other["name"], "matchedKeywords": []}

    _, _, _, category, matched = min(candidates)
    return {
        "id": category["id"],
        "name": category["name"],
        "matchedKeywords": matched,
    }


def build_comment_keyword_analysis(
    records: list[dict[str, Any]],
) -> dict[str, Any]:
    comments = [
        record["comment"]
        for record in records
        if isinstance(record.get("comment"), str) and record["comment"].strip()
    ]
    category_counts = Counter(classify_comment(comment)["id"] for comment in comments)
    total_comments = len(comments)
    categories = [
        {
            "id": category["id"],
            "name": category["name"],
            "count": category_counts[category["id"]],
            "rate": _rate(category_counts[category["id"]], total_comments),
        }
        for category in COMMENT_KEYWORD_CATEGORIES
    ]
    top_categories = sorted(
        (category for category in categories if category["count"] > 0),
        key=lambda category: (
            -category["count"],
            next(
                index
                for index, definition in enumerate(COMMENT_KEYWORD_CATEGORIES)
                if definition["id"] == category["id"]
            ),
        ),
    )[:3]
    return {
        "totalComments": total_comments,
        "classificationMode": "SINGLE_PRIMARY",
        "dictionaryVersion": "2026-08-v1",
        "categories": categories,
        "topCategories": top_categories,
    }


def _policy_stats(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counts = Counter(
        policy_id for record in records for policy_id in record["policyOrder"]
    )
    total = len(records)
    return [
        {
            "id": policy.id,
            "name": policy.name,
            "count": counts[policy.id],
            "rate": _rate(counts[policy.id], total),
        }
        for policy in POLICIES
    ]


def _priority_stats(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counts = _counts([record["topPriority"] for record in records])
    total = len(records)
    return [
        {
            "id": priority_id,
            "name": name,
            "count": counts[priority_id],
            "rate": _rate(counts[priority_id], total),
        }
        for priority_id, name in PRIORITIES
    ]


def _event_statistics(records: list[dict[str, Any]]) -> dict[str, Any]:
    eligible = [
        record
        for record in records
        if len(record.get("policyOrder", [])) >= EVENT_TRIGGER_POLICY_COUNT
    ]
    resolved = [
        record for record in eligible if record.get("eventChoice") in EVENT_CHOICES
    ]
    counts = Counter(record["eventChoice"] for record in resolved)
    investigate = [
        record for record in resolved if record["eventChoice"] == "INVESTIGATE"
    ]
    sensor_assisted_count = sum(
        "sensor" in record.get("policyOrder", []) for record in investigate
    )
    return {
        "eventId": EVENT_ID,
        "eligibleParticipants": len(eligible),
        "respondedParticipants": len(resolved),
        "responseRate": _rate(len(resolved), len(eligible)),
        "choices": [
            {
                "id": choice_id,
                "name": choice_name,
                "count": counts[choice_id],
                "rate": _rate(counts[choice_id], len(resolved)),
            }
            for choice_id, choice_name in EVENT_CHOICES.items()
        ],
        "sensorAssistedInvestigations": {
            "count": sensor_assisted_count,
            "rate": _rate(sensor_assisted_count, len(investigate)),
        },
    }


def _river_stats(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counts = _counts([record["riverId"] for record in records])
    total = len(records)
    result = []
    for river in RIVERS:
        river_records = [record for record in records if record["riverId"] == river.id]
        count = len(river_records)
        result.append(
            {
                "id": river.id,
                "name": river.name,
                "count": counts[river.id],
                "rate": _rate(counts[river.id], total),
                "missionSuccessRate": _rate(
                    sum(record["missionSuccess"] for record in river_records), count
                ),
                "perfectClearRate": _rate(
                    sum(record["perfectClear"] for record in river_records), count
                ),
                "averageGradeImprovement": round(
                    sum(record["gradeImprovement"] for record in river_records) / count, 1
                )
                if count
                else 0,
                "gradeDistribution": _grade_distribution(river_records),
                "policySelection": _policy_stats(river_records),
            }
        )
    return result


def _grade_distribution(records: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    symbols = ("Ia", "Ib", "II", "III", "IV", "V", "VI")
    total = len(records)
    initial = Counter(record["initialGrade"] for record in records)
    final = Counter(record["finalGrade"] for record in records)
    return {
        "initial": [
            {"grade": symbol, "count": initial[symbol], "rate": _rate(initial[symbol], total)}
            for symbol in symbols
        ],
        "final": [
            {"grade": symbol, "count": final[symbol], "rate": _rate(final[symbol], total)}
            for symbol in symbols
        ],
    }


def _candidate_comment(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": record["id"],
        "riverId": record["riverId"],
        "riverName": RIVER_BY_ID[record["riverId"]].name,
        "district": record["district"],
        "districtName": DISTRICT_BY_ID[record["district"]],
        "topPriority": record["topPriority"],
        "topPriorityName": PRIORITY_BY_ID[record["topPriority"]],
        "comment": record["comment"],
        "createdAt": record["createdAt"],
    }


def build_candidate_comments(
    records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    return [_candidate_comment(record) for record in records if record["comment"]]


def build_statistics(records: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(records)
    seoul_today = datetime.now(timezone.utc).astimezone(ZoneInfo("Asia/Seoul")).date()
    today_count = 0
    for record in records:
        try:
            created = datetime.fromisoformat(record["createdAt"].replace("Z", "+00:00"))
            if created.astimezone(ZoneInfo("Asia/Seoul")).date() == seoul_today:
                today_count += 1
        except (TypeError, ValueError):
            continue

    area_counts: Counter[str] = Counter()
    for record in records:
        areas = {POLICY_BY_ID[policy_id].pledge_area for policy_id in record["policyOrder"]}
        area_counts.update(areas)

    comments = build_candidate_comments(records)[:50]

    policy_selection = _policy_stats(records)
    most_selected = max(policy_selection, key=lambda item: item["count"]) if total else None

    return {
        "totalParticipants": total,
        "todayParticipants": today_count,
        "missionSuccessRate": _rate(
            sum(record["missionSuccess"] for record in records), total
        ),
        "perfectClearRate": _rate(
            sum(record["perfectClear"] for record in records), total
        ),
        "averageGradeImprovement": round(
            sum(record["gradeImprovement"] for record in records) / total, 1
        )
        if total
        else 0,
        "gradeDistribution": _grade_distribution(records),
        "riverParticipation": _river_stats(records),
        "policySelection": policy_selection,
        "mostSelectedPolicy": most_selected,
        "topPriorities": _priority_stats(records),
        "pledgeAreaSelection": [
            {
                "area": area,
                "count": area_counts[area],
                "rate": _rate(area_counts[area], total),
            }
            for area in ("CLEAN UP", "SMART UP", "WALK UP")
        ],
        "eventStatistics": _event_statistics(records),
        "commentKeywordAnalysis": build_comment_keyword_analysis(records),
        "comments": comments,
        "isDemoData": True,
        "disclaimer": SIMULATION_DISCLAIMER,
    }


def build_candidate_report(records: list[dict[str, Any]]) -> dict[str, Any]:
    stats = build_statistics(records)
    district_priorities = []
    for district_id, district_name in DISTRICT_BY_ID.items():
        district_records = [
            record for record in records if record["district"] == district_id
        ]
        if district_records:
            district_priorities.append(
                {
                    "district": district_id,
                    "districtName": district_name,
                    "totalParticipants": len(district_records),
                    "priorities": _priority_stats(district_records),
                }
            )

    river_priorities = []
    for river in RIVERS:
        river_records = [record for record in records if record["riverId"] == river.id]
        if river_records:
            river_priorities.append(
                {
                    "riverId": river.id,
                    "riverName": river.name,
                    "totalParticipants": len(river_records),
                    "priorities": _priority_stats(river_records),
                }
            )

    created_values = sorted(record["createdAt"] for record in records)
    return {
        "title": "강 새로이 시민 정책 리포트",
        "period": {
            "from": created_values[0] if created_values else None,
            "to": created_values[-1] if created_values else None,
        },
        "summary": {
            key: stats[key]
            for key in (
                "totalParticipants",
                "todayParticipants",
                "missionSuccessRate",
                "perfectClearRate",
                "averageGradeImprovement",
                "mostSelectedPolicy",
            )
        },
        "policySelection": stats["policySelection"],
        "topPriorities": stats["topPriorities"],
        "pledgeAreaSelection": stats["pledgeAreaSelection"],
        "eventStatistics": stats["eventStatistics"],
        "commentKeywordAnalysis": stats["commentKeywordAnalysis"],
        "perRiver": stats["riverParticipation"],
        "prioritiesByRiver": river_priorities,
        "prioritiesByDistrict": district_priorities,
        "comments": stats["comments"],
        "methodology": {
            "participation": "정책 시뮬레이션 완료 후 익명 집계에 동의한 응답만 포함합니다.",
            "rates": "각 비율은 해당 집단의 응답 수를 분모로 반올림한 값입니다.",
            "representativeness": "본 통계는 전체 부산 시민의 의견을 대표하지 않습니다.",
            "commentKeywords": (
                "내용이 있는 의견을 한국어 키워드 사전으로 분석해 의견당 대표 범주 하나를 집계합니다."
            ),
            "prediction": SIMULATION_DISCLAIMER,
        },
        "isDemoData": True,
    }
