from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from .branding import SERVICE_NAME


MAX_BUDGET = 100
MIN_BOD = Decimal("0.8")
BASE_SCORE = 30
BADGE_SCORE_THRESHOLD = 70
FRUGAL_REMAINING_BUDGET = 20
MAX_RECOMMENDATIONS = 3
EVENT_ID = "DOWNSTREAM_ODOR_SURGE"
EVENT_TRIGGER_POLICY_COUNT = 2
EVENT_CHOICES = {
    "INVESTIGATE": "추가 수질조사",
    "WAIT": "일단 지켜보기",
}

RESULT_PRESENTATIONS = {
    "TRY_AGAIN": {
        "title": "TRY AGAIN",
        "message": "수질은 개선되었지만 아직 좋음 등급에는 도달하지 못했습니다.",
    },
    "MISSION_COMPLETE": {
        "title": "MISSION COMPLETE",
        "message": "하천이 좋음(Ib) 등급으로 회복되었습니다!",
    },
    "PERFECT_CLEAR": {
        "title": "PERFECT CLEAR",
        "message": "BOD 1mg/L 이하, 매우좋음(Ia) 등급을 달성했습니다!",
    },
}

SIMULATION_DISCLAIMER = (
    "본 게임의 BOD 변화는 정책 이해를 돕기 위한 체험용 시뮬레이션이며 "
    "실제 정책 시행 후의 수질을 예측하거나 보장하지 않습니다."
)
DEMO_DATA_NOTICE = "DEMO DATA — 기능 시연을 위한 가상 데이터입니다."
COMMENT_PRIVACY_NOTICE = (
    "한 줄 의견에는 이름, 전화번호, 이메일, 주민등록번호, 정확한 주소를 입력하지 마세요."
)


class DomainValidationError(ValueError):
    def __init__(
        self,
        message: str,
        details: list[dict[str, str]] | None = None,
        code: str = "VALIDATION_ERROR",
    ):
        super().__init__(message)
        self.details = details or []
        self.code = code


@dataclass(frozen=True)
class Grade:
    symbol: str
    name: str
    max_bod: Decimal | None
    level: int

    @property
    def label(self) -> str:
        return f"{self.name}({self.symbol})"

    def to_dict(self) -> dict[str, Any]:
        return {
            "symbol": self.symbol,
            "name": self.name,
            "label": self.label,
            "maxBod": float(self.max_bod) if self.max_bod is not None else None,
            "level": self.level,
        }


GRADES = (
    Grade("Ia", "매우좋음", Decimal("1.0"), 6),
    Grade("Ib", "좋음", Decimal("2.0"), 5),
    Grade("II", "약간좋음", Decimal("3.0"), 4),
    Grade("III", "보통", Decimal("5.0"), 3),
    Grade("IV", "약간나쁨", Decimal("8.0"), 2),
    Grade("V", "나쁨", Decimal("10.0"), 1),
    Grade("VI", "매우나쁨", None, 0),
)


@dataclass(frozen=True)
class Policy:
    id: str
    name: str
    cost: int
    ecology: int
    citizen: int
    monitoring: int
    pledge_area: str
    directly_reduces_bod: bool

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "cost": self.cost,
            "scoreEffects": {
                "ecology": self.ecology,
                "citizen": self.citizen,
                "monitoring": self.monitoring,
            },
            "pledgeArea": self.pledge_area,
            "directlyReducesBod": self.directly_reduces_bod,
        }


@dataclass(frozen=True)
class Badge:
    id: str
    name: str
    description: str

    def to_dict(self) -> dict[str, str]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
        }


POLICIES = (
    Policy("sewer", "노후 하수관 정비", 25, 8, 5, 0, "CLEAN UP", True),
    Policy("treatment", "하천 정화시설 확대", 30, 10, 0, 0, "CLEAN UP", True),
    Policy("sourceBlock", "오염원 유입 긴급 차단", 20, 0, 0, 15, "CLEAN UP", True),
    Policy("ecology", "생태하천 복원", 20, 25, 10, 0, "CLEAN UP", True),
    Policy("sensor", "스마트 수질센서 확대", 10, 0, 0, 30, "SMART UP", False),
    Policy("monitoring", "주민 참여 모니터링", 10, 0, 15, 15, "SMART UP", False),
    Policy("walking", "블루 워킹 로드 조성", 15, 3, 30, 0, "WALK UP", False),
)
POLICY_BY_ID = {policy.id: policy for policy in POLICIES}

POLICY_STRENGTHS = {
    "sewer": "노후 하수관을 정비해 생활하수 유입을 줄였습니다.",
    "treatment": "정화시설을 확대해 하천의 오염물질을 직접 줄였습니다.",
    "sourceBlock": "오염원 유입을 차단해 BOD를 빠르게 낮췄습니다.",
    "ecology": "수질을 개선하고 생태 회복 기반을 함께 마련했습니다.",
    "sensor": "수질 변화를 빠르게 발견할 수 있는 관리 능력을 높였습니다.",
    "monitoring": "주민 참여를 늘려 시민 공감과 관리 역량을 함께 높였습니다.",
    "walking": "수변 이용 환경을 개선해 시민 만족도를 높였습니다.",
}

BADGES = (
    Badge("GOOD_ACHIEVED", "좋음 달성", "최종 BOD 2.0mg/L 이하를 달성했습니다."),
    Badge("ONE_MG_PERFECT", "1mg 퍼펙트", "최종 BOD 1.0mg/L 이하를 달성했습니다."),
    Badge("ECOLOGY_RECOVERY", "생태 회복", "생태 점수 70점 이상을 달성했습니다."),
    Badge("CITIZEN_EMPATHY", "시민 공감", "시민 만족도 70점 이상을 달성했습니다."),
    Badge("SMART_MANAGEMENT", "스마트 관리", "관리 능력 70점 이상을 달성했습니다."),
    Badge(
        "BUDGET_SAVER",
        "알뜰 정책",
        "미션에 성공하고 예산을 20억원 이상 남겼습니다.",
    ),
)
BADGE_BY_ID = {badge.id: badge for badge in BADGES}


@dataclass(frozen=True)
class River:
    id: str
    name: str
    character: str
    initial_bod: Decimal
    difficulty: str
    policy_effects: dict[str, Decimal]

    def to_dict(self) -> dict[str, Any]:
        grade = classify_bod(self.initial_bod)
        return {
            "id": self.id,
            "name": self.name,
            "character": self.character,
            "initialBod": float(self.initial_bod),
            "initialGrade": grade.to_dict(),
            "difficulty": self.difficulty,
            "policyEffects": {
                policy_id: float(value) for policy_id, value in self.policy_effects.items()
            },
            "isDemoData": True,
        }


# 기획안의 밸런싱 원칙에 맞춘 게임용 값입니다. 실제 환경 개선 예측값이 아닙니다.
RIVERS = (
    River(
        "dongcheon",
        "동천",
        "동이",
        Decimal("12.0"),
        "hard",
        {
            "sewer": Decimal("3.7"),
            "treatment": Decimal("3.5"),
            "sourceBlock": Decimal("2.9"),
            "ecology": Decimal("1.4"),
        },
    ),
    River(
        "goejeongcheon",
        "괴정천",
        "정이",
        Decimal("8.0"),
        "normal",
        {
            "sewer": Decimal("2.3"),
            "treatment": Decimal("2.4"),
            "sourceBlock": Decimal("1.8"),
            "ecology": Decimal("1.2"),
        },
    ),
    River(
        "oncheoncheon",
        "온천천",
        "온이",
        Decimal("3.0"),
        "easy",
        {
            "sewer": Decimal("0.8"),
            "treatment": Decimal("0.9"),
            "sourceBlock": Decimal("0.6"),
            "ecology": Decimal("0.5"),
        },
    ),
)
RIVER_BY_ID = {river.id: river for river in RIVERS}


PRIORITIES = (
    ("source_control", "생활하수와 오염원 차단"),
    ("treatment", "정화시설 확대"),
    ("sensor", "실시간 수질센서 설치"),
    ("ecology", "생태하천 복원"),
    ("walking", "산책로·조명·벤치 조성"),
    ("citizen_monitoring", "시민 신고와 모니터링 강화"),
)
PRIORITY_BY_ID = dict(PRIORITIES)

DISTRICTS = (
    ("geumjeong", "금정구"),
    ("dongnae", "동래구"),
    ("busanjin", "부산진구"),
    ("saha", "사하구"),
    ("other", "기타"),
    ("prefer_not", "응답하지 않음"),
)
DISTRICT_BY_ID = dict(DISTRICTS)


def classify_bod(bod: Decimal | float | str) -> Grade:
    value = Decimal(str(bod))
    for grade in GRADES:
        if grade.max_bod is None or value <= grade.max_bod:
            return grade
    raise AssertionError("Unreachable grade classification")


def _validate_policy_ids(policy_ids: Any) -> list[str]:
    if not isinstance(policy_ids, list):
        raise DomainValidationError(
            "policyIds는 배열이어야 합니다.",
            [{"field": "policyIds", "reason": "array_required"}],
        )
    if not policy_ids:
        raise DomainValidationError(
            "정책을 한 개 이상 선택해 주세요.",
            [{"field": "policyIds", "reason": "at_least_one_required"}],
        )
    if any(not isinstance(policy_id, str) for policy_id in policy_ids):
        raise DomainValidationError(
            "정책 ID는 문자열이어야 합니다.",
            [{"field": "policyIds", "reason": "string_items_required"}],
        )
    if len(policy_ids) != len(set(policy_ids)):
        raise DomainValidationError(
            "같은 정책을 중복 선택할 수 없습니다.",
            [{"field": "policyIds", "reason": "duplicate_policy"}],
        )
    unknown = [policy_id for policy_id in policy_ids if policy_id not in POLICY_BY_ID]
    if unknown:
        raise DomainValidationError(
            "알 수 없는 정책이 포함되어 있습니다.",
            [{"field": "policyIds", "reason": f"unknown:{','.join(unknown)}"}],
        )
    return policy_ids


def _result_status(final_bod: Decimal) -> str:
    if final_bod <= Decimal("1.0"):
        return "PERFECT_CLEAR"
    if final_bod <= Decimal("2.0"):
        return "MISSION_COMPLETE"
    return "TRY_AGAIN"


def _calculate_simulation(river: River, selected_ids: list[str]) -> dict[str, Any]:
    selected = [POLICY_BY_ID[policy_id] for policy_id in selected_ids]
    budget_used = sum(policy.cost for policy in selected)
    reduction = sum(
        (river.policy_effects.get(policy.id, Decimal("0")) for policy in selected),
        Decimal("0"),
    )
    final_bod = max(MIN_BOD, river.initial_bod - reduction).quantize(Decimal("0.1"))
    initial_grade = classify_bod(river.initial_bod)
    final_grade = classify_bod(final_bod)
    areas = list(dict.fromkeys(policy.pledge_area for policy in selected))
    result_status = _result_status(final_bod)

    return {
        "river": {"id": river.id, "name": river.name},
        "character": river.character,
        "initialBod": float(river.initial_bod),
        "finalBod": float(final_bod),
        "bodReduction": float((river.initial_bod - final_bod).quantize(Decimal("0.1"))),
        "initialGrade": initial_grade.to_dict(),
        "finalGrade": final_grade.to_dict(),
        "gradeImprovement": final_grade.level - initial_grade.level,
        "resultStatus": result_status,
        "missionSuccess": result_status != "TRY_AGAIN",
        "perfectClear": result_status == "PERFECT_CLEAR",
        "remainingBodToMission": float(max(Decimal("0"), final_bod - Decimal("2.0"))),
        "selectedPolicies": [policy.to_dict() for policy in selected],
        "policyOrder": selected_ids,
        "budgetUsed": budget_used,
        "remainingBudget": MAX_BUDGET - budget_used,
        "scores": {
            "ecology": min(100, BASE_SCORE + sum(policy.ecology for policy in selected)),
            "citizen": min(100, BASE_SCORE + sum(policy.citizen for policy in selected)),
            "monitoring": min(100, BASE_SCORE + sum(policy.monitoring for policy in selected)),
        },
        "selectedPledgeAreas": areas,
        "pledgeMatchRate": round(len(areas) / 3 * 100),
        "isDemoData": True,
        "disclaimer": SIMULATION_DISCLAIMER,
    }


def _validate_event_choice(event_choice: Any, selected_ids: list[str]) -> str | None:
    if event_choice is not None and not isinstance(event_choice, str):
        raise DomainValidationError(
            "돌발상황 선택지는 문자열이어야 합니다.",
            [{"field": "eventChoice", "reason": "string_required"}],
        )
    if len(selected_ids) < EVENT_TRIGGER_POLICY_COUNT:
        if event_choice is not None:
            raise DomainValidationError(
                "정책을 두 개 이상 선택해야 돌발상황에 대응할 수 있습니다.",
                [{"field": "eventChoice", "reason": "event_not_triggered"}],
            )
        return None
    if event_choice is not None and event_choice not in EVENT_CHOICES:
        raise DomainValidationError(
            "알 수 없는 돌발상황 선택지입니다.",
            [{"field": "eventChoice", "reason": "unknown_event_choice"}],
        )
    return event_choice


def _event_result(selected_ids: list[str], event_choice: str | None) -> dict[str, Any]:
    event = {
        "id": EVENT_ID,
        "name": "하류 악취 신고 급증",
        "triggerPolicyCount": EVENT_TRIGGER_POLICY_COUNT,
        "choice": event_choice,
        "cost": 0,
        "scoreEffects": {"ecology": 0, "citizen": 0, "monitoring": 0},
        "sensorAssisted": False,
        "message": None,
        "temporaryCharacterMood": None,
    }
    if len(selected_ids) < EVENT_TRIGGER_POLICY_COUNT:
        event["status"] = "NOT_TRIGGERED"
        return event
    if event_choice is None:
        event["status"] = "PENDING"
        event["message"] = (
            "최근 하류 지역에서 악취 신고가 빠르게 늘고 있습니다. "
            "대응 방법을 선택해 주세요."
        )
        return event

    event["status"] = "RESOLVED"
    if event_choice == "INVESTIGATE":
        sensor_assisted = "sensor" in selected_ids
        event.update(
            {
                "cost": 0 if sensor_assisted else 5,
                "scoreEffects": {
                    "ecology": 0,
                    "citizen": 5,
                    "monitoring": 15 if sensor_assisted else 10,
                },
                "sensorAssisted": sensor_assisted,
                "message": (
                    "설치한 센서로 이상 시간대를 빠르게 발견했습니다."
                    if sensor_assisted
                    else "추가 수질조사로 악취 원인을 확인하고 시민에게 대응 상황을 알렸습니다."
                ),
            }
        )
    else:
        event.update(
            {
                "scoreEffects": {"ecology": 0, "citizen": -10, "monitoring": 0},
                "message": "상황을 지켜보는 동안 시민의 불안이 커졌습니다.",
                "temporaryCharacterMood": "WORRIED",
            }
        )
    return event


def _apply_event(result: dict[str, Any], event: dict[str, Any]) -> None:
    event_cost = event["cost"]
    final_budget = result["budgetUsed"] + event_cost
    if final_budget > MAX_BUDGET:
        raise DomainValidationError(
            f"돌발상황 대응 비용을 포함해 예산 {MAX_BUDGET}억원을 초과했습니다.",
            [{"field": "eventChoice", "reason": "budget_exceeded"}],
        )
    for score, effect in event["scoreEffects"].items():
        result["scores"][score] = max(0, min(100, result["scores"][score] + effect))
    result["budgetUsed"] = final_budget
    result["remainingBudget"] = MAX_BUDGET - final_budget
    result["event"] = event


def _award_badges(result: dict[str, Any]) -> list[dict[str, str]]:
    scores = result["scores"]
    awarded_ids = []
    if result["missionSuccess"]:
        awarded_ids.append("GOOD_ACHIEVED")
    if result["perfectClear"]:
        awarded_ids.append("ONE_MG_PERFECT")
    if scores["ecology"] >= BADGE_SCORE_THRESHOLD:
        awarded_ids.append("ECOLOGY_RECOVERY")
    if scores["citizen"] >= BADGE_SCORE_THRESHOLD:
        awarded_ids.append("CITIZEN_EMPATHY")
    if scores["monitoring"] >= BADGE_SCORE_THRESHOLD:
        awarded_ids.append("SMART_MANAGEMENT")
    if result["missionSuccess"] and result["remainingBudget"] >= FRUGAL_REMAINING_BUDGET:
        awarded_ids.append("BUDGET_SAVER")
    return [BADGE_BY_ID[badge_id].to_dict() for badge_id in awarded_ids]


def _result_message(result: dict[str, Any]) -> str:
    if result["resultStatus"] != "TRY_AGAIN":
        return RESULT_PRESENTATIONS[result["resultStatus"]]["message"]
    if result["bodReduction"] == 0:
        return "시민 만족도나 관리 능력은 높아졌지만, 수질은 아직 개선되지 않았습니다."
    if result["finalGrade"]["symbol"] == "II":
        return "목표까지 한 단계 남았습니다. 오염원 차단 정책을 하나 더 검토해 보세요."
    return RESULT_PRESENTATIONS["TRY_AGAIN"]["message"]


def _recommendation_reason(
    policy: Policy, current: dict[str, Any], expected: dict[str, Any]
) -> str:
    if expected["perfectClear"]:
        return f"{policy.name} 추가 시 매우좋음(Ia) 등급까지 회복할 수 있습니다."
    if expected["missionSuccess"]:
        return f"{policy.name} 추가 시 좋음(Ib) 등급에 도달할 수 있습니다."

    added_reduction = round(current["finalBod"] - expected["finalBod"], 1)
    if expected["finalGrade"]["level"] > current["finalGrade"]["level"]:
        return (
            f"{policy.name} 추가 시 BOD를 {added_reduction:.1f}mg/L 낮춰 "
            f"{expected['finalGrade']['label']} 등급까지 개선할 수 있습니다."
        )
    return (
        f"{policy.name} 추가 시 BOD를 {added_reduction:.1f}mg/L 낮춰 "
        "좋음 등급 목표에 가까워집니다."
    )


def _build_recommendations(
    river: River,
    selected_ids: list[str],
    current: dict[str, Any],
    event_choice: str | None,
) -> list[dict[str, Any]]:
    if current["missionSuccess"]:
        return []

    selected_set = set(selected_ids)
    status_rank = {"PERFECT_CLEAR": 0, "MISSION_COMPLETE": 1, "TRY_AGAIN": 2}
    ranked: list[tuple[tuple[Any, ...], dict[str, Any]]] = []
    for catalog_index, policy in enumerate(POLICIES):
        if (
            policy.id in selected_set
            or not policy.directly_reduces_bod
            or policy.cost > current["remainingBudget"]
        ):
            continue

        expected_ids = [*selected_ids, policy.id]
        expected = _calculate_simulation(river, expected_ids)
        _apply_event(expected, _event_result(expected_ids, event_choice))
        recommendation = {
            "policyId": policy.id,
            "policyName": policy.name,
            "cost": policy.cost,
            "reason": _recommendation_reason(policy, current, expected),
            "expectedFinalBod": expected["finalBod"],
            "expectedFinalGrade": expected["finalGrade"]["symbol"],
            "expectedFinalGradeLabel": expected["finalGrade"]["label"],
            "expectedResultStatus": expected["resultStatus"],
            "expectedMissionSuccess": expected["missionSuccess"],
            "expectedPerfectClear": expected["perfectClear"],
            "expectedRemainingBudget": expected["remainingBudget"],
        }
        rank = (
            status_rank[expected["resultStatus"]],
            -expected["finalGrade"]["level"],
            expected["finalBod"],
            policy.cost,
            catalog_index,
        )
        ranked.append((rank, recommendation))

    ranked.sort(key=lambda item: item[0])
    return [item[1] for item in ranked[:MAX_RECOMMENDATIONS]]


def simulate(
    river_id: str, policy_ids: Any, event_choice: Any = None
) -> dict[str, Any]:
    if not isinstance(river_id, str):
        raise DomainValidationError(
            "하천 ID는 문자열이어야 합니다.",
            [{"field": "riverId", "reason": "string_required"}],
        )
    river = RIVER_BY_ID.get(river_id)
    if river is None:
        raise DomainValidationError(
            "알 수 없는 하천입니다.",
            [{"field": "riverId", "reason": "unknown_river"}],
        )
    selected_ids = _validate_policy_ids(policy_ids)
    validated_event_choice = _validate_event_choice(event_choice, selected_ids)
    budget_used = sum(POLICY_BY_ID[policy_id].cost for policy_id in selected_ids)
    if budget_used > MAX_BUDGET:
        raise DomainValidationError(
            f"예산 {MAX_BUDGET}억원을 초과했습니다.",
            [{"field": "policyIds", "reason": "budget_exceeded"}],
        )

    result = _calculate_simulation(river, selected_ids)
    _apply_event(result, _event_result(selected_ids, validated_event_choice))
    presentation = RESULT_PRESENTATIONS[result["resultStatus"]]
    result.update(
        {
            "resultTitle": presentation["title"],
            "resultMessage": _result_message(result),
            "badges": _award_badges(result),
            "strengths": [POLICY_STRENGTHS[policy_id] for policy_id in selected_ids],
            "recommendations": _build_recommendations(
                river, selected_ids, result, validated_event_choice
            ),
        }
    )
    return result


def game_config() -> dict[str, Any]:
    return {
        "serviceName": SERVICE_NAME,
        "version": "2026-08-demo-v4",
        "maxBudget": MAX_BUDGET,
        "minimumBod": float(MIN_BOD),
        "baseScore": BASE_SCORE,
        "successThresholdBod": 2.0,
        "perfectThresholdBod": 1.0,
        "grades": [grade.to_dict() for grade in GRADES],
        "rivers": [river.to_dict() for river in RIVERS],
        "policies": [policy.to_dict() for policy in POLICIES],
        "events": [
            {
                "id": EVENT_ID,
                "name": "하류 악취 신고 급증",
                "description": (
                    "최근 하류 지역에서 악취 신고가 빠르게 늘고 있습니다. "
                    "어떻게 대응하시겠습니까?"
                ),
                "triggerPolicyCount": EVENT_TRIGGER_POLICY_COUNT,
                "choices": [
                    {
                        "id": "INVESTIGATE",
                        "name": EVENT_CHOICES["INVESTIGATE"],
                        "baseCost": 5,
                        "baseScoreEffects": {
                            "ecology": 0,
                            "citizen": 5,
                            "monitoring": 10,
                        },
                        "sensorVariant": {
                            "requiredPolicyId": "sensor",
                            "cost": 0,
                            "scoreEffects": {
                                "ecology": 0,
                                "citizen": 5,
                                "monitoring": 15,
                            },
                        },
                    },
                    {
                        "id": "WAIT",
                        "name": EVENT_CHOICES["WAIT"],
                        "baseCost": 0,
                        "baseScoreEffects": {
                            "ecology": 0,
                            "citizen": -10,
                            "monitoring": 0,
                        },
                        "temporaryCharacterMood": "WORRIED",
                    },
                ],
            }
        ],
        "badgeDefinitions": [badge.to_dict() for badge in BADGES],
        "resultStatuses": [
            {"id": status, **presentation}
            for status, presentation in RESULT_PRESENTATIONS.items()
        ],
        "priorities": [{"id": key, "name": value} for key, value in PRIORITIES],
        "districts": [{"id": key, "name": value} for key, value in DISTRICTS],
        "commentRules": {
            "maxLength": 200,
            "privacyNotice": COMMENT_PRIVACY_NOTICE,
            "collectsPersonalInformation": False,
        },
        "isDemoData": True,
        "demoDataNotice": DEMO_DATA_NOTICE,
        "disclaimer": SIMULATION_DISCLAIMER,
    }
