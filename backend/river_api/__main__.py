from __future__ import annotations

import argparse
import os
from pathlib import Path

from .application import Application
from .http_server import run_server
from .repository import SQLiteResponseRepository
from .service import RiverService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="1mg Challenge backend API")
    parser.add_argument("--host", default=os.getenv("API_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("API_PORT", "8000")))
    parser.add_argument(
        "--db",
        default=os.getenv(
            "DATABASE_PATH", str(Path(__file__).resolve().parent.parent / "data" / "river_api.db")
        ),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    origins = {
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    }
    repository = SQLiteResponseRepository(args.db)
    repository.initialize()
    application = Application(RiverService(repository))
    run_server(application, args.host, args.port, origins)


if __name__ == "__main__":
    main()
