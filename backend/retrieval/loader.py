from __future__ import annotations

import json
from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class Document:
    source: str
    doc_type: str
    title: str
    content: str
    tags: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


class KnowledgeLoader:
    def __init__(self, data_dir: Path = DATA_DIR):
        self.data_dir = data_dir
        self._documents: list[Document] = []

    def load_all(self) -> list[Document]:
        self._documents = []
        self._load_profile()
        self._load_experience()
        self._load_projects()
        self._load_timeline()
        self._load_faq()
        self._load_links()
        self._load_stories()
        return self._documents

    def _load_json(self, filename: str) -> dict | list:
        path = self.data_dir / filename
        if not path.exists():
            return {}
        with open(path, "r") as f:
            return json.load(f)

    def _load_profile(self):
        data = self._load_json("profile.json")
        if not data:
            return
        content_parts = [
            f"Name: {data.get('name', '')}",
            f"Headline: {data.get('headline', '')}",
            f"Location: {data.get('location', '')}",
            f"Current focus: {', '.join(data.get('current_focus', []))}",
            f"Core skills: {', '.join(data.get('core_skills', []))}",
            f"Interests: {', '.join(data.get('interests', []))}",
        ]
        self._documents.append(Document(
            source="profile.json",
            doc_type="profile",
            title="Nikhil's Profile",
            content="\n".join(content_parts),
            tags=data.get("core_skills", []) + data.get("current_focus", []),
        ))

    def _load_experience(self):
        data = self._load_json("experience.json")
        if not data:
            return
        for role in data:
            content_parts = [
                f"Company: {role.get('company', '')}",
                f"Role: {role.get('role', '')}",
                f"Period: {role.get('period', '')}",
                f"Location: {role.get('location', '')}",
                f"Summary: {role.get('summary', '')}",
            ]
            highlights = role.get("highlights", [])
            if highlights:
                content_parts.append("Highlights:")
                content_parts.extend(f"- {h}" for h in highlights)
            stack = role.get("stack", [])
            if stack:
                content_parts.append(f"Tech stack: {', '.join(stack)}")

            self._documents.append(Document(
                source="experience.json",
                doc_type="experience",
                title=f"{role.get('role', '')} at {role.get('company', '')}",
                content="\n".join(content_parts),
                tags=stack + [role.get("company", "")],
                metadata={"id": role.get("id", "")},
            ))

    def _load_projects(self):
        data = self._load_json("projects.json")
        if not data:
            return
        for project in data:
            content_parts = [
                f"Project: {project.get('name', '')}",
                f"Summary: {project.get('summary', '')}",
                f"Problem: {project.get('problem', '')}",
                f"Solution: {project.get('solution', '')}",
            ]
            stack = project.get("stack", [])
            if stack:
                content_parts.append(f"Tech stack: {', '.join(stack)}")
            features = project.get("features", [])
            if features:
                content_parts.append("Features:")
                content_parts.extend(f"- {f}" for f in features)
            lessons = project.get("lessons", "")
            if lessons:
                content_parts.append(f"Lessons learned: {lessons}")

            self._documents.append(Document(
                source="projects.json",
                doc_type="project",
                title=project.get("name", ""),
                content="\n".join(content_parts),
                tags=stack + [project.get("name", "")],
                metadata={
                    "id": project.get("id", ""),
                    "links": project.get("links", {}),
                },
            ))

    def _load_timeline(self):
        data = self._load_json("timeline.json")
        if not data:
            return
        for event in data:
            content = (
                f"Event: {event.get('event', '')}\n"
                f"Period: {event.get('period', '')}\n"
                f"Description: {event.get('description', '')}"
            )
            self._documents.append(Document(
                source="timeline.json",
                doc_type="timeline",
                title=event.get("event", ""),
                content=content,
                tags=[],
                metadata={"id": event.get("id", "")},
            ))

    def _load_faq(self):
        data = self._load_json("faq.json")
        if not data:
            return
        for item in data:
            content = (
                f"Question: {item.get('question', '')}\n"
                f"Answer: {item.get('answer', '')}"
            )
            self._documents.append(Document(
                source="faq.json",
                doc_type="faq",
                title=item.get("question", ""),
                content=content,
                tags=[],
                metadata={"id": item.get("id", "")},
            ))

    def _load_links(self):
        data = self._load_json("links.json")
        if not data:
            return
        content_parts = []
        for key, value in data.items():
            if isinstance(value, str) and value:
                content_parts.append(f"{key}: {value}")
            elif isinstance(value, dict):
                for sub_key, sub_val in value.items():
                    if isinstance(sub_val, str) and sub_val:
                        content_parts.append(f"{key} - {sub_key}: {sub_val}")
                    elif isinstance(sub_val, dict):
                        for k, v in sub_val.items():
                            if v:
                                content_parts.append(f"{sub_key} {k}: {v}")
        if content_parts:
            self._documents.append(Document(
                source="links.json",
                doc_type="links",
                title="Nikhil's Links",
                content="\n".join(content_parts),
                tags=[],
            ))

    def _load_stories(self):
        stories_dir = self.data_dir / "stories"
        if not stories_dir.exists():
            return
        for md_file in sorted(stories_dir.glob("*.md")):
            content = md_file.read_text(encoding="utf-8")
            title = md_file.stem.replace("-", " ").title()
            first_line = content.strip().split("\n")[0]
            if first_line.startswith("#"):
                title = first_line.lstrip("#").strip()
            self._documents.append(Document(
                source=f"stories/{md_file.name}",
                doc_type="story",
                title=title,
                content=content,
                tags=[],
            ))
