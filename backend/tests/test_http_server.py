from __future__ import annotations

import unittest

from river_api.application import error_payload
from river_api.http_server import _is_json_content_type, _query_parameters


class HttpBoundaryTests(unittest.TestCase):
    def test_content_type_accepts_only_json_with_optional_parameters(self) -> None:
        self.assertTrue(_is_json_content_type("application/json"))
        self.assertTrue(_is_json_content_type("Application/JSON; charset=utf-8"))
        self.assertFalse(_is_json_content_type(None))
        self.assertFalse(_is_json_content_type("text/plain"))
        self.assertFalse(_is_json_content_type("application/x-www-form-urlencoded"))

    def test_error_payload_always_has_same_shape(self) -> None:
        payload = error_payload("TEST_ERROR", "테스트 오류", "request-1")
        self.assertEqual(
            set(payload["error"]), {"code", "message", "details", "requestId"}
        )
        self.assertEqual(payload["error"]["details"], [])

    def test_query_parameters_preserve_repeated_and_blank_values(self) -> None:
        query = _query_parameters(
            "/api/candidate/comments?riverId=dongcheon&riverId=oncheoncheon&sort="
        )
        self.assertEqual(query["riverId"], ["dongcheon", "oncheoncheon"])
        self.assertEqual(query["sort"], [""])


if __name__ == "__main__":
    unittest.main()
