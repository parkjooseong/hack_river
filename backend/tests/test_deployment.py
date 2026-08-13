from __future__ import annotations

import unittest

from scripts.predeploy_check import _production_origins, _repository_checks


class DeploymentCheckTests(unittest.TestCase):
    def test_production_origins_require_explicit_https_hosts(self) -> None:
        self.assertTrue(_production_origins("https://gang-saeroi.example")[0])
        self.assertTrue(
            _production_origins(
                "https://www.gang-saeroi.example,https://admin.gang-saeroi.example"
            )[0]
        )
        for origin in (
            "",
            "*",
            "http://gang-saeroi.example",
            "http://localhost:5173",
            "https://gang-saeroi.example/app",
        ):
            with self.subTest(origin=origin):
                self.assertFalse(_production_origins(origin)[0])

    def test_repository_contains_migrations_contract_and_required_notices(self) -> None:
        checks = {name: passed for name, passed, _ in _repository_checks()}

        self.assertTrue(checks["migrations"])
        self.assertTrue(checks["required_notices"])
        self.assertTrue(checks["openapi"])


if __name__ == "__main__":
    unittest.main()
