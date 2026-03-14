#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

trap 'kill 0' EXIT

echo "→ starting talk-with-nikhil dev servers..."

# Backend
(
  cd "$ROOT_DIR/backend"
  source .venv/bin/activate
  echo "  backend → http://localhost:8000"
  uvicorn main:app --reload --port 8000
) &

# Frontend
(
  cd "$ROOT_DIR/frontend"
  echo "  frontend → http://localhost:3000"
  npm run dev
) &

wait
