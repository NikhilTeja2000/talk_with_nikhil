from __future__ import annotations

from pathlib import Path

PERSONA_PATH = Path(__file__).resolve().parent.parent / "prompts" / "persona.md"


def load_persona() -> str:
    if PERSONA_PATH.exists():
        return PERSONA_PATH.read_text(encoding="utf-8")
    return "You are Talk with Nikhil, an AI version of Nikhil Teja Chilakabattina."


def build_instructions(session_context: dict | None = None) -> str:
    persona = load_persona()
    parts = [persona]

    if session_context:
        ctx_lines = ["\n## Current session context\n"]
        if session_context.get("current_topic"):
            ctx_lines.append(f"- Current topic: {session_context['current_topic']}")
        if session_context.get("active_project"):
            ctx_lines.append(f"- Active project: {session_context['active_project']}")
        if session_context.get("recent_questions"):
            recent = "; ".join(session_context["recent_questions"][-3:])
            ctx_lines.append(f"- Recent questions: {recent}")
        parts.append("\n".join(ctx_lines))

    return "\n\n".join(parts)
