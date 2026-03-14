#!/usr/bin/env python3
"""Rebuilds the knowledge_chunks table from all source tables in Supabase.

Usage:
    python scripts/rebuild_chunks.py
    python scripts/rebuild_chunks.py --dry-run
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings
from supabase import create_client
from retrieval.chunk_builder import build_chunks_from_db, rebuild_all


def main():
    parser = argparse.ArgumentParser(description="Rebuild knowledge_chunks from source tables")
    parser.add_argument("--dry-run", action="store_true", help="Print chunks without writing")
    args = parser.parse_args()

    if not settings.supabase_url or not settings.supabase_service_role_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        sys.exit(1)

    db = create_client(settings.supabase_url, settings.supabase_service_role_key)

    if args.dry_run:
        chunks = build_chunks_from_db(db)
        print(f"Generated {len(chunks)} chunks:")
        for c in chunks:
            print(f"  [{c['chunk_type']}] {c['title']}")
        print("\n--dry-run: no changes written.")
        return

    count = rebuild_all(db)
    print(f"Rebuilt {count} knowledge chunks successfully.")


if __name__ == "__main__":
    main()
