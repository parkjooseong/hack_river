from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


MAX_USER_RESPONSE_BYTES = 64 * 1024


@dataclass(frozen=True)
class CandidateAuthorizationError(RuntimeError):
    status: int
    code: str
    message: str

    def __str__(self) -> str:
        return self.message


class UnavailableCandidateAuthorizer:
    def require_authorized(self, _access_token: str | None) -> None:
        raise CandidateAuthorizationError(
            503,
            "CANDIDATE_AUTH_UNAVAILABLE",
            "후보자 인증 설정이 준비되지 않았습니다.",
        )


class SupabaseCandidateAuthorizer:
    def __init__(
        self,
        project_url: str,
        publishable_key: str,
        candidate_email: str,
        timeout_seconds: int = 10,
    ):
        self.user_url = f"{project_url.rstrip('/')}/auth/v1/user"
        self.publishable_key = publishable_key
        self.candidate_email = candidate_email.strip().casefold()
        self.timeout_seconds = timeout_seconds

    @staticmethod
    def _authentication_required() -> CandidateAuthorizationError:
        return CandidateAuthorizationError(
            401,
            "CANDIDATE_AUTH_REQUIRED",
            "후보자 대시보드 로그인이 필요합니다.",
        )

    @staticmethod
    def _authentication_unavailable() -> CandidateAuthorizationError:
        return CandidateAuthorizationError(
            503,
            "CANDIDATE_AUTH_UNAVAILABLE",
            "후보자 인증 서비스를 일시적으로 사용할 수 없습니다.",
        )

    def require_authorized(self, access_token: str | None) -> None:
        if not access_token or len(access_token) > 8192:
            raise self._authentication_required()

        request = Request(
            self.user_url,
            headers={
                "Accept": "application/json",
                "apikey": self.publishable_key,
                "Authorization": f"Bearer {access_token}",
            },
            method="GET",
        )
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                body = response.read(MAX_USER_RESPONSE_BYTES + 1)
        except HTTPError as error:
            if error.code in {400, 401, 403}:
                raise self._authentication_required() from None
            raise self._authentication_unavailable() from None
        except (URLError, TimeoutError, OSError):
            raise self._authentication_unavailable() from None

        if len(body) > MAX_USER_RESPONSE_BYTES:
            raise self._authentication_unavailable()
        try:
            user: Any = json.loads(body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            raise self._authentication_unavailable() from None

        if not isinstance(user, dict) or not isinstance(user.get("id"), str):
            raise self._authentication_required()
        email = user.get("email")
        if not isinstance(email, str) or email.strip().casefold() != self.candidate_email:
            raise CandidateAuthorizationError(
                403,
                "CANDIDATE_ACCESS_DENIED",
                "이 계정은 후보자 대시보드에 접근할 수 없습니다.",
            )
