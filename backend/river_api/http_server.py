from __future__ import annotations

import json
import logging
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, urlsplit

from .application import Application, error_payload, new_request_id
from .branding import SERVICE_NAME


MAX_BODY_BYTES = 16 * 1024
logger = logging.getLogger("river_api.http")


def _is_json_content_type(value: str | None) -> bool:
    if not value:
        return False
    return value.split(";", 1)[0].strip().lower() == "application/json"


def _query_parameters(path: str) -> dict[str, list[str]]:
    return parse_qs(urlsplit(path).query, keep_blank_values=True)


def create_handler(application: Application, allowed_origins: set[str]):
    class RequestHandler(BaseHTTPRequestHandler):
        server_version = "RiverAPI"
        sys_version = ""

        def log_message(self, _format: str, *_args: Any) -> None:
            # Access logging is emitted by _send without IP, query string or payload.
            return

        def _cors_origin(self) -> str | None:
            origin = self.headers.get("Origin")
            return origin if origin in allowed_origins else None

        def _send(
            self,
            status: int,
            payload: dict[str, Any],
            request_id: str,
            extra_headers: dict[str, str] | None = None,
        ) -> None:
            body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode(
                "utf-8"
            )
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("X-Request-ID", request_id)
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Cache-Control", "no-store")
            origin = self._cors_origin()
            if origin:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Access-Control-Expose-Headers", "X-Request-ID")
                self.send_header("Vary", "Origin")
            if extra_headers:
                for name, value in extra_headers.items():
                    self.send_header(name, value)
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
            logger.info(
                "request_id=%s method=%s path=%s status=%s",
                request_id,
                self.command,
                urlsplit(self.path).path,
                status,
            )

        def _read_json(
            self, request_id: str
        ) -> tuple[dict[str, Any] | None, tuple[int, dict[str, Any]] | None]:
            if not _is_json_content_type(self.headers.get("Content-Type")):
                return None, (
                    415,
                    error_payload(
                        "UNSUPPORTED_MEDIA_TYPE",
                        "Content-Type은 application/json이어야 합니다.",
                        request_id,
                    ),
                )
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                return None, (
                    400,
                    error_payload(
                        "INVALID_LENGTH", "본문 길이가 올바르지 않습니다.", request_id
                    ),
                )
            if length <= 0:
                return None, (
                    400,
                    error_payload("EMPTY_BODY", "JSON 본문이 필요합니다.", request_id),
                )
            if length > MAX_BODY_BYTES:
                return None, (
                    413,
                    error_payload(
                        "PAYLOAD_TOO_LARGE", "요청 본문이 너무 큽니다.", request_id
                    ),
                )
            try:
                return json.loads(self.rfile.read(length)), None
            except (json.JSONDecodeError, UnicodeDecodeError):
                return None, (
                    400,
                    error_payload(
                        "INVALID_JSON", "올바른 JSON을 보내 주세요.", request_id
                    ),
                )

        def do_OPTIONS(self) -> None:  # noqa: N802
            request_id = new_request_id()
            path = urlsplit(self.path).path
            methods = application.allowed_methods(path)
            allow = ", ".join(sorted(methods | {"OPTIONS"})) if methods else "OPTIONS"
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.send_header("X-Request-ID", request_id)
            origin = self._cors_origin()
            if origin:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Access-Control-Expose-Headers", "X-Request-ID")
                self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", allow)
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Max-Age", "600")
            self.end_headers()

        def _dispatch_without_body(self) -> None:
            request_id = new_request_id()
            path = urlsplit(self.path).path
            status, payload = application.dispatch(
                self.command,
                path,
                request_id=request_id,
                query=_query_parameters(self.path),
            )
            headers = None
            if status == 405:
                headers = {"Allow": ", ".join(sorted(application.allowed_methods(path)))}
            self._send(status, payload, request_id, headers)

        def do_GET(self) -> None:  # noqa: N802
            self._dispatch_without_body()

        def do_HEAD(self) -> None:  # noqa: N802
            self._dispatch_without_body()

        def do_POST(self) -> None:  # noqa: N802
            request_id = new_request_id()
            path = urlsplit(self.path).path
            allowed_methods = application.allowed_methods(path)
            if not allowed_methods or "POST" not in allowed_methods:
                status, payload = application.dispatch(
                    "POST", path, request_id=request_id
                )
                headers = (
                    {"Allow": ", ".join(sorted(allowed_methods))}
                    if status == 405
                    else None
                )
                self._send(status, payload, request_id, headers)
                return

            body, error = self._read_json(request_id)
            if error:
                status, payload = error
                self._send(status, payload, request_id)
                return
            status, payload = application.dispatch(
                "POST", path, body, request_id=request_id
            )
            self._send(status, payload, request_id)

        def do_PUT(self) -> None:  # noqa: N802
            self._dispatch_without_body()

        def do_PATCH(self) -> None:  # noqa: N802
            self._dispatch_without_body()

        def do_DELETE(self) -> None:  # noqa: N802
            self._dispatch_without_body()

    return RequestHandler


def run_server(
    application: Application,
    host: str,
    port: int,
    allowed_origins: set[str],
) -> None:
    server = ThreadingHTTPServer((host, port), create_handler(application, allowed_origins))
    print(f"{SERVICE_NAME} API listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
