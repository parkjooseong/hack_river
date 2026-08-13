from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path

from .application import Application
from .branding import SERVICE_NAME
from .candidate_auth import SupabaseCandidateAuthorizer, UnavailableCandidateAuthorizer
from .config import ConfigurationError, load_env_file, positive_int_env, require_env
from .http_server import run_server
from .repository import (
    RepositoryUnavailableError,
    ResponseRepository,
    SQLiteResponseRepository,
)
from .service import RiverService
from .supabase_repository import SupabaseResponseRepository


BACKEND_ROOT = Path(__file__).resolve().parent.parent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=f"{SERVICE_NAME} backend API")
    parser.add_argument(
        "--storage",
        choices=("sqlite", "supabase"),
        default=os.getenv("STORAGE_BACKEND", "sqlite").strip().lower(),
    )
    parser.add_argument("--host", default=os.getenv("API_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("API_PORT", "8000")))
    parser.add_argument(
        "--db",
        default=os.getenv(
            "DATABASE_PATH", str(Path(__file__).resolve().parent.parent / "data" / "river_api.db")
        ),
    )
    return parser.parse_args()


def build_repository(storage: str, database_path: str) -> ResponseRepository:
    if storage == "sqlite":
        return SQLiteResponseRepository(database_path)
    if storage == "supabase":
        secret_key = os.getenv("SUPABASE_SECRET_KEY", "").strip()
        if not secret_key:
            # 기존 프로젝트를 위한 호환 경로입니다. 새 프로젝트는 Secret key를 사용합니다.
            secret_key = require_env("SUPABASE_SERVICE_ROLE_KEY")
        return SupabaseResponseRepository(
            project_url=require_env("SUPABASE_URL"),
            secret_key=secret_key,
            table=os.getenv("SUPABASE_TABLE", "responses").strip() or "responses",
            timeout_seconds=positive_int_env("SUPABASE_TIMEOUT_SECONDS", 10),
        )
    raise ConfigurationError("STORAGE_BACKEND는 sqlite 또는 supabase여야 합니다.")


def build_candidate_authorizer():
    project_url = os.getenv("SUPABASE_URL", "").strip()
    publishable_key = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    candidate_email = os.getenv("CANDIDATE_AUTH_EMAIL", "").strip()
    if not project_url or not publishable_key or not candidate_email:
        return UnavailableCandidateAuthorizer()
    return SupabaseCandidateAuthorizer(
        project_url=project_url,
        publishable_key=publishable_key,
        candidate_email=candidate_email,
        timeout_seconds=positive_int_env("SUPABASE_AUTH_TIMEOUT_SECONDS", 10),
    )


def main() -> None:
    try:
        load_env_file(BACKEND_ROOT / ".env")
        args = parse_args()
        origins = {
            origin.strip()
            for origin in os.getenv(
                "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
            ).split(",")
            if origin.strip()
        }
        repository = build_repository(args.storage, args.db)
        repository.initialize()
    except (ConfigurationError, RepositoryUnavailableError, ValueError) as error:
        raise SystemExit(f"서버 설정 오류: {error}") from None
    logging.basicConfig(
        level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
        format="%(asctime)s level=%(levelname)s logger=%(name)s %(message)s",
    )
    candidate_authorizer = build_candidate_authorizer()
    application = Application(RiverService(repository), candidate_authorizer.require_authorized)
    run_server(application, args.host, args.port, origins)


if __name__ == "__main__":
    main()
