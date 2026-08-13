from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from .branding import SERVICE_ID, SERVICE_NAME
from .domain import DomainValidationError
from .repository import RepositoryUnavailableError
from .service import RiverService


logger = logging.getLogger("river_api")

ROUTE_METHODS: dict[str, frozenset[str]] = {
    "/health": frozenset({"GET"}),
    "/api/game/config": frozenset({"GET"}),
    "/api/simulations": frozenset({"POST"}),
    "/api/responses": frozenset({"POST"}),
    "/api/stats": frozenset({"GET"}),
    "/api/candidate/report": frozenset({"GET"}),
    "/api/candidate/comments": frozenset({"GET"}),
}


def new_request_id() -> str:
    return uuid4().hex


def error_payload(
    code: str,
    message: str,
    request_id: str,
    details: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or [],
            "requestId": request_id,
        }
    }


class Application:
    def __init__(self, service: RiverService):
        self.service = service

    @staticmethod
    def allowed_methods(path: str) -> frozenset[str]:
        return ROUTE_METHODS.get(path, frozenset())

    def dispatch(
        self,
        method: str,
        path: str,
        payload: Any | None = None,
        request_id: str | None = None,
        query: dict[str, Any] | None = None,
    ) -> tuple[int, dict[str, Any]]:
        request_id = request_id or new_request_id()
        method = method.upper()

        allowed_methods = self.allowed_methods(path)
        if not allowed_methods:
            return 404, error_payload(
                "NOT_FOUND", "요청한 API를 찾을 수 없습니다.", request_id
            )
        if method not in allowed_methods:
            return 405, error_payload(
                "METHOD_NOT_ALLOWED",
                "이 API에서 지원하지 않는 HTTP 메서드입니다.",
                request_id,
                [{"field": "method", "reason": "not_allowed", "allowed": sorted(allowed_methods)}],
            )

        try:
            if method == "GET" and path == "/health":
                return 200, {
                    "status": "ok",
                    "service": SERVICE_ID,
                    "name": SERVICE_NAME,
                }
            if method == "GET" and path == "/api/game/config":
                return 200, self.service.config()
            if method == "POST" and path == "/api/simulations":
                return 200, self.service.calculate(payload)
            if method == "POST" and path == "/api/responses":
                return 201, self.service.submit(payload)
            if method == "GET" and path == "/api/stats":
                return 200, self.service.statistics()
            if method == "GET" and path == "/api/candidate/report":
                return 200, self.service.candidate_report(query)
            if method == "GET" and path == "/api/candidate/comments":
                return 200, self.service.candidate_comments(query)
            raise AssertionError("Registered route has no handler")
        except DomainValidationError as error:
            return 400, error_payload(
                error.code, str(error), request_id, error.details
            )
        except RepositoryUnavailableError:
            logger.warning(
                "request_id=%s event=database_unavailable method=%s path=%s",
                request_id,
                method,
                path,
            )
            return 503, error_payload(
                "DATABASE_UNAVAILABLE",
                "공유 데이터베이스를 일시적으로 사용할 수 없습니다.",
                request_id,
            )
        except Exception as error:  # Last-resort boundary; never expose exception text.
            logger.error(
                "request_id=%s event=unhandled_exception method=%s path=%s type=%s",
                request_id,
                method,
                path,
                type(error).__name__,
            )
            return 500, error_payload(
                "INTERNAL_SERVER_ERROR",
                "서버 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
                request_id,
            )
