from __future__ import annotations

import unittest
from unittest.mock import patch

from scripts.predeploy_check import _environment_checks, _production_origins, _repository_checks


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

    def test_candidate_auth_environment_is_required_for_deployment(self) -> None:
        environment = {
            "STORAGE_BACKEND": "supabase",
            "SUPABASE_URL": "https://project.supabase.co",
            "SUPABASE_SECRET_KEY": "sb_secret_test",
            "SUPABASE_PUBLISHABLE_KEY": "sb_publishable_test",
            "CANDIDATE_AUTH_EMAIL": "candidate@gang-saeroi.test",
            "ALLOWED_ORIGINS": "https://gang-saeroi.example",
            "BACKUP_POLICY_CONFIRMED": "true",
        }
        with patch.dict("os.environ", environment, clear=True):
            checks = {name: passed for name, passed, _ in _environment_checks()}

        self.assertTrue(checks["supabase_publishable"])
        self.assertTrue(checks["candidate_auth_email"])


if __name__ == "__main__":
    unittest.main()
