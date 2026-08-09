from __future__ import annotations

import time
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from evaluation.trace_models import (
    GapTrace,
    RetrievalTrace,
    ToolTraceItem,
    TurnTrace,
    sanitize_value,
)
from evaluation.tracer import TurnContext, TraceCollector, get_prompt_version
from routes.admin import get_session_traces


class TestTracer(unittest.IsolatedAsyncioTestCase):

    def test_sanitize_value_sensitive_keys(self):
        """Verify recursive masking of sensitive keys."""
        payload = {
            "user_id": "usr_123",
            "api_key": "sk_live_secret123",
            "nested": {
                "token": "bearer_abc",
                "password": "mypassword",
                "service_role_key": "supabase_secret",
                "safe_field": "hello world",
            },
            "items": [
                {"auth_token": "token_xyz", "name": "Item A"},
                {"safe_val": 42},
            ],
        }

        sanitized = sanitize_value(payload)

        self.assertEqual(sanitized["user_id"], "usr_123")
        self.assertEqual(sanitized["api_key"], "[REDACTED]")
        self.assertEqual(sanitized["nested"]["token"], "[REDACTED]")
        self.assertEqual(sanitized["nested"]["password"], "[REDACTED]")
        self.assertEqual(sanitized["nested"]["service_role_key"], "[REDACTED]")
        self.assertEqual(sanitized["nested"]["safe_field"], "hello world")
        self.assertEqual(sanitized["items"][0]["auth_token"], "[REDACTED]")
        self.assertEqual(sanitized["items"][0]["name"], "Item A")
        self.assertEqual(sanitized["items"][1]["safe_val"], 42)

    def test_sanitize_value_bounds(self):
        """Verify string and list length bounding."""
        long_str = "x" * 2000
        sanitized_str = sanitize_value(long_str)
        self.assertLess(len(sanitized_str), 1200)
        self.assertIn("...[truncated", sanitized_str)

        long_list = list(range(50))
        sanitized_list = sanitize_value(long_list)
        self.assertEqual(len(sanitized_list), 21)  # 20 items + 1 truncation note
        self.assertIn("...[30 more items truncated]", sanitized_list[-1])

    def test_turn_context_normal_lifecycle(self):
        """Verify full turn timing, multiple tools, multiple retrievals, and dual TTFA."""
        ctx = TurnContext(session_id="sess-abc", turn_id=1, model="gemini-live-2.5-flash-native-audio")

        # 1. User speaks
        time.sleep(0.01)
        ctx.end_user_turn("What did Nikhil build at the Amazon Nova Hackathon?")

        # 2. Model begins processing
        time.sleep(0.01)
        ctx.start_model_turn()

        # 3. Multiple tools and retrievals
        ctx.record_tool_call(
            tool_name="search_about_nikhil",
            args={"query": "Amazon Nova Hackathon"},
            result_summary={"chunks": ["chk_1", "chk_2"]},
            duration_ms=45,
            status="success",
        )
        ctx.record_retrieval(
            query="Amazon Nova Hackathon",
            hit_count=2,
            top_score=0.92,
            duration_ms=45,
        )

        ctx.record_tool_call(
            tool_name="get_project_details",
            args={"project_name": "medicaid-analytics-agent"},
            result_summary={"description": "Medicaid Agent"},
            duration_ms=30,
            status="success",
        )
        ctx.record_retrieval(
            query="medicaid-analytics-agent",
            hit_count=1,
            top_score=0.98,
            duration_ms=30,
        )

        # 4. First audio chunk received
        time.sleep(0.01)
        ctx.record_first_audio()

        # 5. Turn completed
        gap = GapTrace(gap_flag=False, confidence_score=0.95, retrieval_hits=3, retrieval_score=0.98)
        trace = ctx.build_trace(
            assistant_output="Nikhil built the Medicaid Analytics Agent which won a top prize.",
            gap_result=gap,
            status="success",
        )

        # Verify metrics
        self.assertEqual(trace.turn_id, 1)
        self.assertEqual(trace.status, "success")
        self.assertFalse(trace.interrupted)
        self.assertEqual(trace.tool_latency_ms, 75)  # 45 + 30
        self.assertEqual(trace.retrieval_latency_ms, 75)
        self.assertEqual(len(trace.tool_calls), 2)
        self.assertEqual(len(trace.retrieval_events), 2)
        self.assertIsNotNone(trace.end_to_end_ttfa_ms)
        self.assertGreaterEqual(trace.end_to_end_ttfa_ms, 5)
        self.assertIsNotNone(trace.model_ttfa_ms)
        self.assertGreaterEqual(trace.model_ttfa_ms, 5)
        self.assertTrue(trace.prompt_version.startswith("persona_"))

        # Verify Supabase serializability
        supabase_dict = trace.to_supabase_dict()
        self.assertEqual(supabase_dict["trace_id"], trace.trace_id)
        self.assertEqual(supabase_dict["tool_latency_ms"], 75)
        self.assertEqual(len(supabase_dict["retrieval_events"]), 2)
        self.assertEqual(len(supabase_dict["tool_calls"]), 2)

    def test_turn_context_interrupted_lifecycle(self):
        """Verify barge-in / interrupted turn captures partial output and interrupted status."""
        ctx = TurnContext(session_id="sess-xyz", turn_id=2, model="gemini-live-2.5-flash-native-audio")
        ctx.end_user_turn("Tell me about your experience at SOTI")
        ctx.start_model_turn()
        ctx.record_first_audio()

        trace = ctx.build_trace(
            assistant_output="At SOTI, Nikhil worked on...",
            status="interrupted",
            interrupted=True,
        )

        self.assertEqual(trace.status, "interrupted")
        self.assertTrue(trace.interrupted)
        self.assertEqual(trace.assistant_output, "At SOTI, Nikhil worked on...")
        self.assertIsNotNone(trace.end_to_end_ttfa_ms)

        db_dict = trace.to_supabase_dict()
        self.assertEqual(db_dict["status"], "interrupted")
        self.assertTrue(db_dict["interrupted"])

    async def test_trace_collector_bounded_queue_and_drop_policy(self):
        """Verify that TraceCollector never blocks and accurately counts dropped items when full."""
        collector = TraceCollector(maxsize=3)

        ctx = TurnContext(session_id="sess-1", turn_id=1, model="gemini-live-2.5-flash-native-audio")
        t1 = ctx.build_trace("ans 1")
        t2 = ctx.build_trace("ans 2")
        t3 = ctx.build_trace("ans 3")
        t4 = ctx.build_trace("ans 4 (overflow)")

        self.assertTrue(collector.enqueue_trace(t1))
        self.assertTrue(collector.enqueue_trace(t2))
        self.assertTrue(collector.enqueue_trace(t3))

        # 4th item overflows queue
        self.assertFalse(collector.enqueue_trace(t4))
        self.assertEqual(collector.metrics["enqueued"], 3)
        self.assertEqual(collector.metrics["dropped"], 1)

    def test_prompt_version_consistency(self):
        """Verify prompt version hash is deterministic and cached."""
        v1 = get_prompt_version()
        v2 = get_prompt_version()
        self.assertEqual(v1, v2)
        self.assertTrue(v1.startswith("persona_"))

    @patch("routes.admin.get_supabase")
    async def test_admin_get_session_traces_endpoint(self, mock_get_supabase):
        """Verify GET /api/admin/sessions/{session_id}/traces calls Supabase correctly."""
        mock_db = MagicMock()
        mock_table = MagicMock()
        mock_select = MagicMock()
        mock_eq = MagicMock()
        mock_order = MagicMock()

        mock_get_supabase.return_value = mock_db
        mock_db.table.return_value = mock_table
        mock_table.select.return_value = mock_select
        mock_select.eq.return_value = mock_eq
        mock_eq.order.return_value = mock_order
        mock_order.execute.return_value = MagicMock(data=[
            {"trace_id": "tr_1", "turn_id": 1, "status": "success"},
            {"trace_id": "tr_2", "turn_id": 2, "status": "interrupted"},
        ])

        response = await get_session_traces(
            session_id="test-session-123",
            _user={"email": "admin@example.com"},
        )

        self.assertEqual(response["count"], 2)
        self.assertEqual(response["traces"][0]["trace_id"], "tr_1")
        mock_db.table.assert_called_with("turn_traces")
        mock_select.eq.assert_called_with("session_id", "test-session-123")


if __name__ == "__main__":
    unittest.main()
