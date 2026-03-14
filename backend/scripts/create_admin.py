#!/usr/bin/env python3
"""One-time script to create the admin user in Supabase Auth.

Usage:
    python scripts/create_admin.py --email admin@example.com --password YourSecurePassword
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings
from supabase import create_client


def main():
    parser = argparse.ArgumentParser(description="Create admin user in Supabase Auth")
    parser.add_argument("--email", required=True, help="Admin email address")
    parser.add_argument("--password", required=True, help="Admin password")
    args = parser.parse_args()

    if not settings.supabase_url or not settings.supabase_service_role_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        sys.exit(1)

    client = create_client(settings.supabase_url, settings.supabase_service_role_key)

    try:
        result = client.auth.admin.create_user({
            "email": args.email,
            "password": args.password,
            "email_confirm": True,
        })

        if result.user:
            print(f"Admin user created successfully!")
            print(f"  ID:    {result.user.id}")
            print(f"  Email: {result.user.email}")
        else:
            print("ERROR: Could not create user — no user returned")
            sys.exit(1)

    except Exception as e:
        if "already been registered" in str(e).lower() or "already exists" in str(e).lower():
            print(f"User {args.email} already exists — you can log in with your credentials.")
        else:
            print(f"ERROR: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
