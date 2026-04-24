from __future__ import annotations

"""
Sync selected local data files into Supabase source tables.

This script is safe to run multiple times. It:
- Upserts projects from data/projects.json into the `projects` table (by name)
- Upserts links from data/links.json into the `links` table (by label)
- Upserts a couple of FAQ entries (main personal projects, LeetCode summary)

Usage:
  cd backend
  source .venv/bin/activate
  python scripts/sync_data_to_supabase.py

Then rebuild chunks:
  python scripts/rebuild_chunks.py
"""

import json
from pathlib import Path

from storage.supabase_client import get_supabase


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT.parent / "data"


def load_json(path: Path):
    if not path.exists():
        print(f"[warn] {path} does not exist, skipping.")
        return None
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def sync_projects(db):
    path = DATA_DIR / "projects.json"
    data = load_json(path)
    if not data:
        return

    print(f"[info] Syncing projects from {path} ...")

    for proj in data:
        name = proj.get("name")
        if not name:
            continue

        # Fetch existing row by name (assuming name is unique)
        existing = (
            db.table("projects")
            .select("*")
            .eq("name", name)
            .limit(1)
            .execute()
        )
        base = {
            "name": name,
            "category": proj.get("category"),
            "status": proj.get("status"),
            "one_liner": proj.get("one_liner"),
            "problem": proj.get("problem"),
            "solution": proj.get("solution"),
            "stack": proj.get("stack"),
            "why_it_matters": proj.get("why_it_matters"),
            "focus_areas": proj.get("focus_areas"),
            # We don't write is_favorite because the current Supabase schema
            # doesn't include that column. Favorite projects are expressed
            # via FAQ text instead.
            "is_active": True,
        }

        if existing.data:
            row_id = existing.data[0]["id"]
            db.table("projects").update(base).eq("id", row_id).execute()
            print(f"  [update] project: {name}")
        else:
            db.table("projects").insert(base).execute()
            print(f"  [insert] project: {name}")


def sync_links(db):
    path = DATA_DIR / "links.json"
    data = load_json(path)
    if not data:
        return

    print(f"[info] Syncing links from {path} ...")

    # Map simple keys to labels/categories
    mappings = {
        "github": ("GitHub", "profile"),
        "linkedin": ("LinkedIn", "profile"),
        "leetcode": ("LeetCode", "profile"),
        "portfolio": ("Portfolio", "profile"),
        "resume": ("Resume", "profile"),
        "email": ("Email", "contact"),
    }

    for key, (label, category) in mappings.items():
        url = data.get(key)
        if not url:
            continue

        existing = (
            db.table("links")
            .select("*")
            .eq("label", label)
            .limit(1)
            .execute()
        )

        base = {
            "label": label,
            "url": url,
            "category": category,
            "is_active": True,
        }

        if existing.data:
            row_id = existing.data[0]["id"]
            db.table("links").update(base).eq("id", row_id).execute()
            print(f"  [update] link: {label}")
        else:
            db.table("links").insert(base).execute()
            print(f"  [insert] link: {label}")


def sync_faqs(db):
    """
    Seed a few high-value FAQs that help the agent answer meta questions
    like 'what are your main projects?' and 'how active are you on LeetCode?'
    """
    print("[info] Syncing core FAQs ...")

    faqs = [
      {
        "slug": "main-personal-projects",
        "question": "What are your main personal projects?",
        "answer": (
          "My main personal projects right now are:\n"
          "- Talk with Nikhil — a real-time, interruptible voice-first AI portfolio where you can talk to an AI version of me.\n"
          "- Self-Interview AI — a practice interview platform with real-time AI feedback. This is one of my favorite projects.\n"
          "- ReminoVerse — talk to your past self through AI voice memories.\n"
          "- VeriAssess — verified in-person assessment rooms for fair hiring.\n"
          "- Inbox of Broken Dreams — AI that tags your Gmail job applications as ghosted / interview / rejected.\n"
          "- IsThisRealJob — scam detection for job posts via a trust score.\n"
          "- AI YouTube Agent — Sheet → prompt → Gemini → YouTube upload automation.\n"
          "I treat these as my core portfolio projects outside of my job experience like Clinivise or SOTI."
        ),
        "topic": "projects"
      },
      {
        "slug": "leetcode-summary",
        "question": "How active are you on LeetCode?",
        "answer": (
          "My LeetCode handle is chnt0002. I had a strong streak in 2024 — I solved hundreds of problems in Python and earned badges for 50/100/200/365 days of activity that year. "
          "My contest rating is around 1400 based on a couple of contests, and my strongest areas are dynamic programming, arrays, strings, hash tables and greedy problems. "
          "After 2024 I slowed down a lot on LeetCode and focused more on building full projects, so I treat LeetCode as a tool rather than something I grind every day now."
        ),
        "topic": "leetcode"
      }
    ]

    for faq in faqs:
        existing = (
            db.table("faqs")
            .select("*")
            .eq("slug", faq["slug"])
            .limit(1)
            .execute()
        )

        base = {
            "slug": faq["slug"],
            "question": faq["question"],
            "answer": faq["answer"],
            "topic": faq["topic"],
            "is_active": True,
        }

        if existing.data:
            row_id = existing.data[0]["id"]
            db.table("faqs").update(base).eq("id", row_id).execute()
            print(f"  [update] faq: {faq['slug']}")
        else:
            db.table("faqs").insert(base).execute()
            print(f"  [insert] faq: {faq['slug']}")


def main():
    db = get_supabase()
    sync_projects(db)
    sync_links(db)
    sync_faqs(db)
    print("[done] Sync complete. Now run: python scripts/rebuild_chunks.py")


if __name__ == "__main__":
    main()

