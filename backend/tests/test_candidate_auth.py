from __future__ import annotations

import json
import unittest
from io import BytesIO
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from river_api.candidate_auth import (
    CandidateAuthorizationError,
    SupabaseCandidateAuthorizer,
)


class FakeResponse:
    def __init__(self, payload: dict):
        self.body = json.dumps(payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self, limit: int) -> bytes:
        return self.body[:limit]


class CandidateAuthTests(unittest.TestCase):
    def setUp(self) -> None:
        self.authorizer = SupabaseCandidateAuthorizer(
            "https://project.supabase.co",
            "sb_publishable_test",
            "candidate@example.com",
        )

    def test_valid_supabase_user_is_authorized(self) -> None:
        response = FakeResponse(
            {"id": "11111111-1111-4111-8111-111111111111", "email": "Candidate@Example.com"}
        )
        with patch("river_api.candidate_auth.urlopen", return_value=response) as request:
            self.authorizer.require_authorized("valid-token")

        sent_request = request.call_args.args[0]
        self.assertEqual(sent_request.full_url, "https://project.supabase.co/auth/v1/user")
        self.assertEqual(sent_request.get_header("Authorization"), "Bearer valid-token")
        self.assertEqual(sent_request.get_header("Apikey"), "sb_publishable_test")

    def test_missing_or_invalid_token_requires_login(self) -> None:
        with self.assertRaises(CandidateAuthorizationError) as missing:
            self.authorizer.require_authorized(None)
        self.assertEqual(missing.exception.status, 401)
        self.assertEqual(missing.exception.code, "CANDIDATE_AUTH_REQUIRED")

        http_error = HTTPError(
            self.authorizer.user_url,
            401,
            "Unauthorized",
            {},
            BytesIO(b"{}"),
        )
        with patch("river_api.candidate_auth.urlopen", side_effect=http_error):
            with self.assertRaises(CandidateAuthorizationError) as invalid:
                self.authorizer.require_authorized("invalid-token")
        self.assertEqual(invalid.exception.status, 401)

    def test_authenticated_non_candidate_account_is_denied(self) -> None:
        response = FakeResponse(
            {"id": "22222222-2222-4222-8222-222222222222", "email": "other@example.com"}
        )
        with patch("river_api.candidate_auth.urlopen", return_value=response):
            with self.assertRaises(CandidateAuthorizationError) as denied:
                self.authorizer.require_authorized("other-user-token")

        self.assertEqual(denied.exception.status, 403)
        self.assertEqual(denied.exception.code, "CANDIDATE_ACCESS_DENIED")

    def test_supabase_auth_outage_returns_safe_unavailable_error(self) -> None:
        with patch(
            "river_api.candidate_auth.urlopen",
            side_effect=URLError("secret connection detail"),
        ):
            with self.assertRaises(CandidateAuthorizationError) as unavailable:
                self.authorizer.require_authorized("valid-token")

        self.assertEqual(unavailable.exception.status, 503)
        self.assertEqual(unavailable.exception.code, "CANDIDATE_AUTH_UNAVAILABLE")
        self.assertNotIn("secret", str(unavailable.exception))


if __name__ == "__main__":
    unittest.main()
