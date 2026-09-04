"""Tests for the DB-backed company policies + guardrail.

Runs WITHOUT a live Supabase database: exercises the local fallback path
and the policy-engine guardrail, which is the critical failure behavior.

Run:  python test_policies.py
"""
import unittest

from app import policy_repository
from app.policy import apply_policy


class TestPolicyRepositoryFallback(unittest.TestCase):
    def test_search_falls_back_without_db(self):
        # No SUPABASE env / no DB => must fall back to local knowledge
        docs = policy_repository.search_policies("refund policy", top_k=3)
        self.assertIsInstance(docs, list)
        if docs:
            self.assertTrue(any(d.get("source") == "fallback" for d in docs))
            for d in docs:
                self.assertIn("title", d)
                self.assertIn("content", d)
                self.assertIn("slug", d)

    def test_search_empty_query(self):
        self.assertEqual(policy_repository.search_policies("  "), [])

    def test_list_falls_back_to_defaults(self):
        rows = policy_repository.list_policies(active_only=True)
        self.assertIsInstance(rows, list)
        self.assertGreaterEqual(len(rows), 1)
        for r in rows:
            self.assertIn("title", r)
            self.assertIn("content", r)

    def test_get_policy_falls_back_by_slug(self):
        row = policy_repository.get_policy("refund_policy")
        self.assertTrue(row)
        self.assertEqual(row.get("slug"), "refund_policy")
        self.assertIn("content", row)

    def test_get_policy_unknown_returns_empty(self):
        self.assertEqual(policy_repository.get_policy("definitely_not_a_policy"), {})


class TestZeroHallucinationGuardrail(unittest.TestCase):
    def test_auto_reply_without_knowledge_forces_review(self):
        analysis = {
            "category": "BILLING",
            "priority": "HIGH",
            "confidence": 0.9,
            "recommended_action": "AUTOMATIC_RESPONSE",
        }
        verdict = apply_policy(analysis, knowledge_found=False)
        self.assertEqual(verdict["decision"], "HUMAN_REVIEW")
        self.assertTrue(any("No company policy" in r for r in verdict["policy_reasons"]))

    def test_auto_reply_with_knowledge_allowed(self):
        analysis = {
            "category": "GENERAL",
            "priority": "LOW",
            "confidence": 0.9,
            "recommended_action": "AUTOMATIC_RESPONSE",
        }
        verdict = apply_policy(analysis, knowledge_found=True)
        self.assertEqual(verdict["decision"], "AUTO_RESPONSE")

    def test_auto_reply_other_category_without_knowledge_forces_review(self):
        analysis = {
            "category": "OTHER",
            "priority": "LOW",
            "confidence": 0.85,
            "recommended_action": "AUTOMATIC_RESPONSE",
        }
        verdict = apply_policy(analysis, knowledge_found=False)
        self.assertEqual(verdict["decision"], "HUMAN_REVIEW")
        self.assertTrue(any("No company policy" in r for r in verdict["policy_reasons"]))

    def test_security_always_reviewed_even_with_knowledge(self):
        analysis = {
            "category": "SECURITY",
            "priority": "CRITICAL",
            "confidence": 0.95,
            "recommended_action": "AUTOMATIC_RESPONSE",
        }
        verdict = apply_policy(analysis, knowledge_found=True)
        self.assertEqual(verdict["decision"], "HUMAN_REVIEW")


if __name__ == "__main__":
    unittest.main()