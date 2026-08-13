from __future__ import annotations

import os
import re
from pathlib import Path


ENV_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


class ConfigurationError(RuntimeError):
    """Raised when required server configuration is missing or invalid."""


def load_env_file(path: str | Path) -> None:
    """Load a small .env file without overriding values provided by the host."""

    env_path = Path(path)
    if not env_path.is_file():
        return

    for line_number, raw_line in enumerate(
        env_path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            raise ConfigurationError(f".env {line_number}번째 줄 형식이 올바르지 않습니다.")

        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip()
        if not ENV_NAME_PATTERN.fullmatch(name):
            raise ConfigurationError(f".env {line_number}번째 줄의 변수명이 올바르지 않습니다.")
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        os.environ.setdefault(name, value)


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ConfigurationError(f"{name} 환경변수가 필요합니다.")
    return value


def positive_int_env(name: str, default: int) -> int:
    raw_value = os.getenv(name, str(default)).strip()
    try:
        value = int(raw_value)
    except ValueError as error:
        raise ConfigurationError(f"{name}은 정수여야 합니다.") from error
    if value <= 0:
        raise ConfigurationError(f"{name}은 1 이상이어야 합니다.")
    return value
