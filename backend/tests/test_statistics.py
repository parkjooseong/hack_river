from __future__ import annotations

import copy
import unittest

from river_api.statistics import (
    build_comment_keyword_analysis,
    classify_comment,
)


class CommentKeywordAnalysisTests(unittest.TestCase):
    def test_classification_is_deterministic_and_uses_one_primary_category(self) -> None:
        comment = "생활하수 유입 때문에 악취와 냄새가 심합니다."
        first = classify_comment(comment)

        self.assertEqual(first["id"], "POLLUTION_SOURCE")
        self.assertEqual(first, classify_comment(comment))
        self.assertTrue(first["matchedKeywords"])

    def test_ties_use_first_appearance_then_fixed_priority(self) -> None:
        odor_first = classify_comment("악취와 생태 문제를 해결해 주세요.")
        ecology_first = classify_comment("생태 문제와 악취를 해결해 주세요.")
        same_position = classify_comment("하수 냄새를 없애 주세요.")

        self.assertEqual(odor_first["id"], "ODOR")
        self.assertEqual(ecology_first["id"], "ECOLOGY_RESTORATION")
        self.assertEqual(same_position["id"], "ODOR")

    def test_unknown_comment_safely_falls_back_to_other(self) -> None:
        result = classify_comment("더 나은 부산을 만들어 주세요.")

        self.assertEqual(result["id"], "OTHER")
        self.assertEqual(result["matchedKeywords"], [])

    def test_analysis_counts_each_non_empty_comment_exactly_once(self) -> None:
        records = [
            {"comment": "악취가 심합니다."},
            {"comment": "생활하수와 폐수를 막아 주세요."},
            {"comment": "실시간 측정값과 데이터를 공개해 주세요."},
            {"comment": "물고기 서식지를 복원해 주세요."},
            {"comment": "산책로에 조명과 벤치가 필요합니다."},
            {"comment": "깨끗하게 관리해 주세요."},
            {"comment": ""},
        ]
        original = copy.deepcopy(records)

        analysis = build_comment_keyword_analysis(records)
        counts = {item["id"]: item["count"] for item in analysis["categories"]}

        self.assertEqual(analysis["totalComments"], 6)
        self.assertEqual(sum(counts.values()), 6)
        self.assertEqual(set(counts.values()), {1})
        self.assertEqual(
            [item["id"] for item in analysis["topCategories"]],
            ["ODOR", "POLLUTION_SOURCE", "DATA_DISCLOSURE"],
        )
        self.assertEqual(records, original)

    def test_empty_analysis_has_all_categories_and_zero_rates(self) -> None:
        analysis = build_comment_keyword_analysis([{"comment": ""}])

        self.assertEqual(analysis["totalComments"], 0)
        self.assertEqual(analysis["topCategories"], [])
        self.assertTrue(
            all(item["count"] == 0 and item["rate"] == 0 for item in analysis["categories"])
        )


if __name__ == "__main__":
    unittest.main()
