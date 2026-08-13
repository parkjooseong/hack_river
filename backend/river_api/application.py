from __future__ import annotations

from typing import Any

from .domain import DomainValidationError
from .service import RiverService


class Application:
    def __init__(self, service: RiverService):
        self.service = service

    def dispatch(
        self, method: str, path: str, payload: Any | None = None
    ) -> tuple[int, dict[str, Any]]:
        try:
            if method == "GET" and path == "/health":
                return 200, {"status": "ok", "service": "1mg-challenge-api"}
            if method == "GET" and path == "/api/game/config":
                return 200, self.service.config()
            if method == "POST" and path == "/api/simulations":
                return 200, self.service.calculate(payload)
            if method == "POST" and path == "/api/responses":
                return 201, self.service.submit(payload)
            if method == "GET" and path == "/api/stats":
                return 200, self.service.statistics()
            if method == "GET" and path == "/api/candidate/report":
                return 200, self.service.candidate_report()
            return 404, {
                "error": {"code": "NOT_FOUND", "message": "요청한 API를 찾을 수 없습니다."}
            }
        except DomainValidationError as error:
            return 400, {
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": str(error),
                    "details": error.details,
                }
            }
