from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any


MAX_BUDGET = 100
MIN_BOD = Decimal("0.8")
BASE_SCORE = 30

SIMULATION_DISCLAIMER = (
    "본 게임의 BOD 변화는 정책 이해를 돕기 위한 체험용 시뮬레이션이며 "
    "실제 정책 시행 후의 수질을 예측하거나 보장하지 않습니다."
)
DEMO_DATA_NOTICE = "DEMO DATA — 기능 시연을 위한 가상 데이터입니다."


class DomainValidationError(ValueError):
    def __init__(self, message: str, details: list[dict[str, str]] | None = None):
        super().__init__(message)
        self.details = details or []


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


def simulate(river_id: str, policy_ids: Any) -> dict[str, Any]:
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
    selected = [POLICY_BY_ID[policy_id] for policy_id in selected_ids]
    budget_used = sum(policy.cost for policy in selected)
    if budget_used > MAX_BUDGET:
        raise DomainValidationError(
            f"예산 {MAX_BUDGET}억원을 초과했습니다.",
            [{"field": "policyIds", "reason": "budget_exceeded"}],
        )

    reduction = sum(
        (river.policy_effects.get(policy.id, Decimal("0")) for policy in selected),
        Decimal("0"),
    )
    final_bod = max(MIN_BOD, river.initial_bod - reduction).quantize(Decimal("0.1"))
    initial_grade = classify_bod(river.initial_bod)
    final_grade = classify_bod(final_bod)
    areas = list(dict.fromkeys(policy.pledge_area for policy in selected))

    return {
        "river": {"id": river.id, "name": river.name},
        "character": river.character,
        "initialBod": float(river.initial_bod),
        "finalBod": float(final_bod),
        "bodReduction": float((river.initial_bod - final_bod).quantize(Decimal("0.1"))),
        "initialGrade": initial_grade.to_dict(),
        "finalGrade": final_grade.to_dict(),
        "gradeImprovement": final_grade.level - initial_grade.level,
        "missionSuccess": final_bod <= Decimal("2.0"),
        "perfectClear": final_bod <= Decimal("1.0"),
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


def game_config() -> dict[str, Any]:
    return {
        "version": "2026-08-demo-v1",
        "maxBudget": MAX_BUDGET,
        "minimumBod": float(MIN_BOD),
        "baseScore": BASE_SCORE,
        "successThresholdBod": 2.0,
        "perfectThresholdBod": 1.0,
        "grades": [grade.to_dict() for grade in GRADES],
        "rivers": [river.to_dict() for river in RIVERS],
        "policies": [policy.to_dict() for policy in POLICIES],
        "priorities": [{"id": key, "name": value} for key, value in PRIORITIES],
        "districts": [{"id": key, "name": value} for key, value in DISTRICTS],
        "isDemoData": True,
        "demoDataNotice": DEMO_DATA_NOTICE,
        "disclaimer": SIMULATION_DISCLAIMER,
    }
