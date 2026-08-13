from __future__ import annotations

import json
import re
import tempfile
import unittest
from datetime import date, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

import yaml

from river_api.application import Application
from river_api.repository import SQLiteResponseRepository
from river_api.service import RiverService


OPENAPI_PATH = Path(__file__).resolve().parents[1] / "openapi.yaml"


class OpenApiContractValidator:
    """Validate the response subset used by this API against its OpenAPI schemas."""

    def __init__(self, document: dict[str, Any]):
        self.document = document

    def response_schema(self, method: str, path: str, status: int) -> dict[str, Any]:
        response = self.document["paths"][path][method.lower()]["responses"][str(status)]
        response = self._resolve(response)
        return response["content"]["application/json"]["schema"]

    def validate(self, value: Any, schema: dict[str, Any], location: str = "response") -> None:
        if value is None and schema.get("nullable") is True:
            return

        if "$ref" in schema:
            self.validate(value, self._resolve(schema), location)
            return

        for part in schema.get("allOf", []):
            self.validate(value, part, location)

        if "oneOf" in schema:
            matches = 0
            for option in schema["oneOf"]:
                try:
                    self.validate(value, option, location)
                except AssertionError:
                    continue
                matches += 1
            if matches != 1:
                raise AssertionError(f"{location}: expected exactly one oneOf match, got {matches}")
            return

        expected_type = schema.get("type")
        if expected_type == "object":
            self._validate_object(value, schema, location)
        elif expected_type == "array":
            self._validate_array(value, schema, location)
        elif expected_type == "string":
            if not isinstance(value, str):
                raise AssertionError(f"{location}: expected string, got {type(value).__name__}")
            self._validate_string(value, schema, location)
        elif expected_type == "integer":
            if isinstance(value, bool) or not isinstance(value, int):
                raise AssertionError(f"{location}: expected integer, got {type(value).__name__}")
            self._validate_number(value, schema, location)
        elif expected_type == "number":
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise AssertionError(f"{location}: expected number, got {type(value).__name__}")
            self._validate_number(value, schema, location)
        elif expected_type == "boolean" and not isinstance(value, bool):
            raise AssertionError(f"{location}: expected boolean, got {type(value).__name__}")

        if "enum" in schema and value not in schema["enum"]:
            raise AssertionError(f"{location}: {value!r} is not in {schema['enum']!r}")

    def _resolve(self, value: dict[str, Any]) -> dict[str, Any]:
        reference = value.get("$ref")
        if not reference:
            return value
        target: Any = self.document
        for part in reference.removeprefix("#/").split("/"):
            target = target[part]
        return target

    def _validate_object(self, value: Any, schema: dict[str, Any], location: str) -> None:
        if not isinstance(value, dict):
            raise AssertionError(f"{location}: expected object, got {type(value).__name__}")
        required = set(schema.get("required", []))
        missing = required - value.keys()
        if missing:
            raise AssertionError(f"{location}: missing fields {sorted(missing)!r}")
        properties = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            extra = value.keys() - properties.keys()
            if extra:
                raise AssertionError(f"{location}: unexpected fields {sorted(extra)!r}")
        for key, item in value.items():
            if key in properties:
                self.validate(item, properties[key], f"{location}.{key}")

    def _validate_array(self, value: Any, schema: dict[str, Any], location: str) -> None:
        if not isinstance(value, list):
            raise AssertionError(f"{location}: expected array, got {type(value).__name__}")
        if len(value) < schema.get("minItems", 0):
            raise AssertionError(f"{location}: fewer than minItems")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            raise AssertionError(f"{location}: more than maxItems")
        if schema.get("uniqueItems"):
            serialized = [json.dumps(item, sort_keys=True, ensure_ascii=False) for item in value]
            if len(serialized) != len(set(serialized)):
                raise AssertionError(f"{location}: duplicate array items")
        item_schema = schema.get("items")
        if item_schema:
            for index, item in enumerate(value):
                self.validate(item, item_schema, f"{location}[{index}]")

    @staticmethod
    def _validate_number(value: int | float, schema: dict[str, Any], location: str) -> None:
        if "minimum" in schema and value < schema["minimum"]:
            raise AssertionError(f"{location}: below minimum")
        if "maximum" in schema and value > schema["maximum"]:
            raise AssertionError(f"{location}: above maximum")

    @staticmethod
    def _validate_string(value: str, schema: dict[str, Any], location: str) -> None:
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            raise AssertionError(f"{location}: longer than maxLength")
        if "pattern" in schema and re.fullmatch(schema["pattern"], value) is None:
            raise AssertionError(f"{location}: does not match pattern")
        try:
            if schema.get("format") == "uuid":
                UUID(value)
            elif schema.get("format") == "date":
                date.fromisoformat(value)
            elif schema.get("format") == "date-time":
                datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as error:
            raise AssertionError(f"{location}: invalid {schema['format']}") from error


class OpenApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        document = yaml.safe_load(OPENAPI_PATH.read_text(encoding="utf-8"))
        cls.validator = OpenApiContractValidator(document)

    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        repository = SQLiteResponseRepository(Path(self.temp_directory.name) / "responses.sqlite3")
        repository.initialize()
        self.application = Application(RiverService(repository))

    def tearDown(self) -> None:
        self.temp_directory.cleanup()

    def assert_response_contract(
        self,
        method: str,
        path: str,
        expected_status: int,
        payload: dict[str, Any] | None = None,
        query: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        status, response = self.application.dispatch(method, path, payload, query=query)
        self.assertEqual(status, expected_status)
        schema = self.validator.response_schema(method, path, status)
        self.validator.validate(response, schema)
        return response

    def test_all_seven_success_responses_match_openapi(self) -> None:
        self.assert_response_contract("GET", "/health", 200)
        self.assert_response_contract("GET", "/api/game/config", 200)
        self.assert_response_contract(
            "POST",
            "/api/simulations",
            200,
            {"riverId": "oncheoncheon", "policyIds": ["walking"]},
        )
        self.assert_response_contract(
            "POST",
            "/api/responses",
            201,
            {
                "riverId": "oncheoncheon",
                "policyIds": ["sewer", "treatment"],
                "eventChoice": "INVESTIGATE",
                "topPriority": "source_control",
                "district": "dongnae",
                "comment": "수질 개선을 먼저 추진해 주세요.",
                "consentToAggregate": True,
            },
        )
        self.assert_response_contract("GET", "/api/stats", 200)
        self.assert_response_contract(
            "GET",
            "/api/candidate/report",
            200,
            query={"riverId": ["oncheoncheon"]},
        )
        self.assert_response_contract(
            "GET",
            "/api/candidate/comments",
            200,
            query={"page": ["1"], "pageSize": ["10"], "sort": ["latest"]},
        )

    def test_validation_and_method_errors_match_openapi(self) -> None:
        self.assert_response_contract(
            "POST",
            "/api/simulations",
            400,
            {"riverId": "unknown", "policyIds": ["walking"]},
        )
        status, response = self.application.dispatch("POST", "/health")
        self.assertEqual(status, 405)
        schema = self.validator.response_schema("GET", "/health", status)
        self.validator.validate(response, schema)


if __name__ == "__main__":
    unittest.main()
