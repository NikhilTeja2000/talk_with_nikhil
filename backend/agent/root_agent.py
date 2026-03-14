from __future__ import annotations

from google.adk.agents import Agent

from .instructions import build_instructions
from .tools import (
    search_about_nikhil,
    get_project_details,
    get_experience_details,
    get_timeline_event,
    get_links,
)
from config import settings


def create_agent(session_context: dict | None = None) -> Agent:
    instructions = build_instructions(session_context)

    agent = Agent(
        name="talk_with_nikhil",
        model=settings.gemini_live_model,
        description="AI version of Nikhil Teja Chilakabattina for live portfolio conversations.",
        instruction=instructions,
        tools=[
            search_about_nikhil,
            get_project_details,
            get_experience_details,
            get_timeline_event,
            get_links,
        ],
    )

    return agent
