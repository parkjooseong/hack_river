from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlsplit

from .application import Application


MAX_BODY_BYTES = 16 * 1024


def create_handler(application: Application, allowed_origins: set[str]):
    class RequestHandler(BaseHTTPRequestHandler):
        def _cors_origin(self) -> str | None:
            origin = self.headers.get("Origin")
            return origin if origin in allowed_origins else None

        def _send(self, status: int, payload: dict[str, Any]) -> None:
            body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode(
                "utf-8"
            )
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Cache-Control", "no-store")
            origin = self._cors_origin()
            if origin:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.end_headers()
            self.wfile.write(body)

        def _read_json(self) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                return None, {
                    "error": {"code": "INVALID_LENGTH", "message": "본문 길이가 올바르지 않습니다."}
                }
            if length <= 0:
                return None, {
                    "error": {"code": "EMPTY_BODY", "message": "JSON 본문이 필요합니다."}
                }
            if length > MAX_BODY_BYTES:
                return None, {
                    "error": {"code": "PAYLOAD_TOO_LARGE", "message": "요청 본문이 너무 큽니다."}
                }
            try:
                return json.loads(self.rfile.read(length)), None
            except (json.JSONDecodeError, UnicodeDecodeError):
                return None, {
                    "error": {"code": "INVALID_JSON", "message": "올바른 JSON을 보내 주세요."}
                }

        def do_OPTIONS(self) -> None:  # noqa: N802
            self.send_response(204)
            origin = self._cors_origin()
            if origin:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Max-Age", "600")
            self.end_headers()

        def do_GET(self) -> None:  # noqa: N802
            status, payload = application.dispatch("GET", urlsplit(self.path).path)
            self._send(status, payload)

        def do_POST(self) -> None:  # noqa: N802
            body, error = self._read_json()
            if error:
                code = error["error"]["code"]
                self._send(413 if code == "PAYLOAD_TOO_LARGE" else 400, error)
                return
            status, payload = application.dispatch(
                "POST", urlsplit(self.path).path, body
            )
            self._send(status, payload)

    return RequestHandler


def run_server(
    application: Application,
    host: str,
    port: int,
    allowed_origins: set[str],
) -> None:
    server = ThreadingHTTPServer((host, port), create_handler(application, allowed_origins))
    print(f"1mg Challenge API listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
