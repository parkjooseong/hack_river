from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from urllib.parse import urlsplit


BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from river_api.__main__ import build_repository  # noqa: E402
from river_api.config import ConfigurationError, load_env_file  # noqa: E402
from river_api.domain import game_config  # noqa: E402
from river_api.repository import RepositoryUnavailableError  # noqa: E402
from river_api.statistics import build_candidate_report  # noqa: E402


EXPECTED_MIGRATIONS = (
    "001_postgresql_responses.sql",
    "002_candidate_query_indexes.sql",
    "003_add_event_result.sql",
)


def _production_origins(raw_value: str) -> tuple[bool, str]:
    origins = [origin.strip() for origin in raw_value.split(",") if origin.strip()]
    if not origins:
        return False, "ALLOWED_ORIGINS가 비어 있습니다."
    for origin in origins:
        parsed = urlsplit(origin)
        if origin == "*" or parsed.scheme != "https" or not parsed.netloc:
            return False, "모든 ALLOWED_ORIGINS는 명시적인 HTTPS 주소여야 합니다."
        if parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
            return False, "운영 ALLOWED_ORIGINS에 localhost를 사용할 수 없습니다."
        if parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
            return False, "ALLOWED_ORIGINS에는 경로·쿼리·프래그먼트를 넣지 마세요."
    return True, f"HTTPS Origin {len(origins)}개가 명시되어 있습니다."


def _environment_checks() -> list[tuple[str, bool, str]]:
    project_url = os.getenv("SUPABASE_URL", "").strip()
    secret_key = os.getenv("SUPABASE_SECRET_KEY", "").strip()
    publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    candidate_email = os.getenv("CANDIDATE_AUTH_EMAIL", "").strip()
    storage_ok = os.getenv("STORAGE_BACKEND", "").strip().lower() == "supabase"
    url_ok = project_url.startswith("https://") and "YOUR_PROJECT_REF" not in project_url
    secret_ok = bool(secret_key) and "REPLACE_ME" not in secret_key
    publishable_ok = bool(publishable_key) and "REPLACE_ME" not in publishable_key
    candidate_email_ok = "@" in candidate_email and "example.com" not in candidate_email
    backup_ok = os.getenv("BACKUP_POLICY_CONFIRMED", "").strip().lower() == "true"
    origins_ok, origins_message = _production_origins(
        os.getenv("ALLOWED_ORIGINS", "")
    )
    return [
        (
            "storage",
            storage_ok,
            "Supabase 저장소를 사용합니다."
            if storage_ok
            else "STORAGE_BACKEND가 supabase여야 합니다.",
        ),
        (
            "supabase_url",
            url_ok,
            "Supabase HTTPS URL이 설정되어 있습니다."
            if url_ok
            else "실제 HTTPS SUPABASE_URL이 필요합니다.",
        ),
        (
            "supabase_secret",
            secret_ok,
            "서버 전용 Supabase Secret key가 설정되어 있습니다."
            if secret_ok
            else "실제 서버 전용 SUPABASE_SECRET_KEY가 필요합니다.",
        ),
        (
            "supabase_publishable",
            publishable_ok,
            "Supabase Publishable key가 설정되어 있습니다."
            if publishable_ok
            else "실제 SUPABASE_PUBLISHABLE_KEY가 필요합니다.",
        ),
        (
            "candidate_auth_email",
            candidate_email_ok,
            "후보자 전용 Supabase Auth 계정 이메일이 설정되어 있습니다."
            if candidate_email_ok
            else "실제 CANDIDATE_AUTH_EMAIL이 필요합니다.",
        ),
        ("allowed_origins", origins_ok, origins_message),
        (
            "backup_policy",
            backup_ok,
            "Supabase 백업 정책 확인이 기록되어 있습니다."
            if backup_ok
            else "Supabase 백업 정책을 확인한 뒤 BACKUP_POLICY_CONFIRMED=true로 설정하세요.",
        ),
    ]


def _repository_checks() -> list[tuple[str, bool, str]]:
    missing = [
        name for name in EXPECTED_MIGRATIONS if not (BACKEND_ROOT / "migrations" / name).is_file()
    ]
    config = game_config()
    report = build_candidate_report([])
    notices_ok = (
        config.get("isDemoData") is True
        and bool(config.get("disclaimer"))
        and config.get("commentRules", {}).get("collectsPersonalInformation") is False
        and "대표하지 않습니다"
        in report.get("methodology", {}).get("representativeness", "")
    )
    return [
        (
            "migrations",
            not missing,
            "필수 마이그레이션이 모두 있습니다."
            if not missing
            else f"누락된 마이그레이션 수: {len(missing)}",
        ),
        (
            "required_notices",
            notices_ok,
            "데모·비예측·개인정보 비수집·비대표성 안내가 API에 포함되어야 합니다.",
        ),
        (
            "openapi",
            (BACKEND_ROOT / "openapi.yaml").is_file(),
            "openapi.yaml이 필요합니다.",
        ),
    ]


def _database_check() -> tuple[str, bool, str]:
    try:
        repository = build_repository("supabase", "")
        repository.initialize()
    except (ConfigurationError, RepositoryUnavailableError, ValueError):
        return "database_read", False, "Supabase responses 테이블을 읽을 수 없습니다."
    return "database_read", True, "Supabase responses 테이블 읽기가 정상입니다."


def main() -> int:
    parser = argparse.ArgumentParser(
        description="강 새로이 운영 배포 전 설정을 비밀값 출력 없이 점검합니다."
    )
    parser.add_argument(
        "--env",
        default=str(BACKEND_ROOT / ".env"),
        help="점검할 환경변수 파일 경로",
    )
    parser.add_argument(
        "--check-database",
        action="store_true",
        help="Supabase 테이블을 읽기 전용으로 확인",
    )
    args = parser.parse_args()

    try:
        load_env_file(args.env)
    except ConfigurationError as error:
        print(f"[FAIL] env_file: {error}")
        return 1

    checks = [*_environment_checks(), *_repository_checks()]
    if args.check_database:
        checks.append(_database_check())

    for name, passed, message in checks:
        print(f"[{'PASS' if passed else 'FAIL'}] {name}: {message}")
    failed = sum(not passed for _, passed, _ in checks)
    print(f"result={'PASS' if failed == 0 else 'FAIL'} failed={failed}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
