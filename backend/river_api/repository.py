from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Protocol


class RepositoryUnavailableError(RuntimeError):
    """A safe, credential-free error for storage failures."""


class ResponseRepository(Protocol):
    def initialize(self) -> None: ...

    def create(self, response: dict[str, Any]) -> dict[str, Any]: ...

    def list_all(self) -> list[dict[str, Any]]: ...


SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS responses (
    id TEXT PRIMARY KEY,
    river_id TEXT NOT NULL,
    character_name TEXT NOT NULL,
    initial_bod REAL NOT NULL,
    final_bod REAL NOT NULL,
    initial_grade TEXT NOT NULL,
    final_grade TEXT NOT NULL,
    grade_improvement INTEGER NOT NULL,
    mission_success INTEGER NOT NULL CHECK (mission_success IN (0, 1)),
    perfect_clear INTEGER NOT NULL CHECK (perfect_clear IN (0, 1)),
    selected_policy_ids TEXT NOT NULL,
    top_priority TEXT NOT NULL,
    budget_used INTEGER NOT NULL CHECK (budget_used BETWEEN 0 AND 100),
    ecology_score INTEGER NOT NULL CHECK (ecology_score BETWEEN 0 AND 100),
    citizen_score INTEGER NOT NULL CHECK (citizen_score BETWEEN 0 AND 100),
    monitoring_score INTEGER NOT NULL CHECK (monitoring_score BETWEEN 0 AND 100),
    pledge_match_rate INTEGER NOT NULL CHECK (pledge_match_rate BETWEEN 0 AND 100),
    district TEXT NOT NULL,
    comment TEXT NOT NULL DEFAULT '' CHECK (length(comment) <= 200),
    consent_to_aggregate INTEGER NOT NULL CHECK (consent_to_aggregate = 1),
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_river_id ON responses(river_id);
CREATE INDEX IF NOT EXISTS idx_responses_top_priority ON responses(top_priority);
"""


class SQLiteResponseRepository:
    def __init__(self, database_path: str | Path):
        self.database_path = str(database_path)

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, timeout=5)
        connection.row_factory = sqlite3.Row
        return connection

    def initialize(self) -> None:
        try:
            if self.database_path != ":memory:":
                Path(self.database_path).parent.mkdir(parents=True, exist_ok=True)
            with self._connect() as connection:
                connection.executescript(SQLITE_SCHEMA)
        except (OSError, sqlite3.Error):
            raise RepositoryUnavailableError(
                "SQLite 데이터베이스를 초기화할 수 없습니다."
            ) from None

    def create(self, response: dict[str, Any]) -> dict[str, Any]:
        try:
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO responses (
                        id, river_id, character_name, initial_bod, final_bod,
                        initial_grade, final_grade, grade_improvement,
                        mission_success, perfect_clear, selected_policy_ids,
                        top_priority, budget_used, ecology_score, citizen_score,
                        monitoring_score, pledge_match_rate, district, comment,
                        consent_to_aggregate, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        response["id"],
                        response["riverId"],
                        response["character"],
                        response["initialBod"],
                        response["finalBod"],
                        response["initialGrade"],
                        response["finalGrade"],
                        response["gradeImprovement"],
                        int(response["missionSuccess"]),
                        int(response["perfectClear"]),
                        json.dumps(response["policyOrder"], ensure_ascii=False),
                        response["topPriority"],
                        response["budgetUsed"],
                        response["scores"]["ecology"],
                        response["scores"]["citizen"],
                        response["scores"]["monitoring"],
                        response["pledgeMatchRate"],
                        response["district"],
                        response["comment"],
                        1,
                        response["createdAt"],
                    ),
                )
        except (OSError, sqlite3.Error):
            raise RepositoryUnavailableError(
                "SQLite 응답을 저장할 수 없습니다."
            ) from None
        return response

    def list_all(self) -> list[dict[str, Any]]:
        try:
            with self._connect() as connection:
                rows = connection.execute(
                    "SELECT * FROM responses ORDER BY created_at DESC"
                ).fetchall()
            return [self._row_to_response(row) for row in rows]
        except (OSError, sqlite3.Error, json.JSONDecodeError, KeyError, TypeError):
            raise RepositoryUnavailableError(
                "SQLite 응답을 조회할 수 없습니다."
            ) from None

    @staticmethod
    def _row_to_response(row: sqlite3.Row) -> dict[str, Any]:
        return {
            "id": row["id"],
            "riverId": row["river_id"],
            "character": row["character_name"],
            "initialBod": row["initial_bod"],
            "finalBod": row["final_bod"],
            "initialGrade": row["initial_grade"],
            "finalGrade": row["final_grade"],
            "gradeImprovement": row["grade_improvement"],
            "missionSuccess": bool(row["mission_success"]),
            "perfectClear": bool(row["perfect_clear"]),
            "policyOrder": json.loads(row["selected_policy_ids"]),
            "topPriority": row["top_priority"],
            "budgetUsed": row["budget_used"],
            "scores": {
                "ecology": row["ecology_score"],
                "citizen": row["citizen_score"],
                "monitoring": row["monitoring_score"],
            },
            "pledgeMatchRate": row["pledge_match_rate"],
            "district": row["district"],
            "comment": row["comment"],
            "consentToAggregate": bool(row["consent_to_aggregate"]),
            "createdAt": row["created_at"],
        }
