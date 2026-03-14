from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ConversationTurn:
    speaker: str
    content: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class SessionMemory:
    session_id: str
    turns: list[ConversationTurn] = field(default_factory=list)
    current_topic: str = ""
    active_project: str = ""
    mentioned_skills: list[str] = field(default_factory=list)

    def add_turn(self, speaker: str, content: str):
        self.turns.append(ConversationTurn(speaker=speaker, content=content))

    def get_recent_turns(self, n: int = 5) -> list[ConversationTurn]:
        return self.turns[-n:]

    def to_context(self) -> dict:
        return {
            "current_topic": self.current_topic,
            "active_project": self.active_project,
            "recent_questions": [
                t.content for t in self.turns if t.speaker == "user"
            ][-5:],
        }


class SessionStore:
    def __init__(self):
        self._sessions: dict[str, SessionMemory] = {}

    def create(self, session_id: str) -> SessionMemory:
        mem = SessionMemory(session_id=session_id)
        self._sessions[session_id] = mem
        return mem

    def get(self, session_id: str) -> SessionMemory | None:
        return self._sessions.get(session_id)

    def remove(self, session_id: str):
        self._sessions.pop(session_id, None)


session_store = SessionStore()
