from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from typing import Any
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


def _rate(count: int, total: int) -> int:
    return round(count / total * 100) if total else 0


def _counts(items: list[str]) -> Counter[str]:
    return Counter(items)


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
        "perRiver": stats["riverParticipation"],
        "prioritiesByRiver": river_priorities,
        "prioritiesByDistrict": district_priorities,
        "comments": stats["comments"],
        "methodology": {
            "participation": "정책 시뮬레이션 완료 후 익명 집계에 동의한 응답만 포함합니다.",
            "rates": "각 비율은 해당 집단의 응답 수를 분모로 반올림한 값입니다.",
            "representativeness": "본 통계는 전체 부산 시민의 의견을 대표하지 않습니다.",
            "prediction": SIMULATION_DISCLAIMER,
        },
        "isDemoData": True,
    }
