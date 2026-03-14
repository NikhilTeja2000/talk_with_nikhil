.PHONY: install install-backend install-frontend dev dev-backend dev-frontend build clean

# ─── Install everything ───────────────────────────────────────────────

install: install-backend install-frontend
	@echo "\n✓ all dependencies installed"

install-backend:
	@echo "→ setting up python venv + deps..."
	cd backend && python3 -m venv .venv && \
		. .venv/bin/activate && \
		pip install --upgrade pip && \
		pip install -r requirements.txt
	@echo "✓ backend ready"

install-frontend:
	@echo "→ installing frontend deps..."
	cd frontend && npm install
	@echo "✓ frontend ready"

# ─── Development ──────────────────────────────────────────────────────

dev:
	@echo "→ starting backend + frontend..."
	@make -j2 dev-backend dev-frontend

dev-backend:
	cd backend && . .venv/bin/activate && \
		uvicorn main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

# ─── Build ────────────────────────────────────────────────────────────

build: build-frontend
	@echo "\n✓ build complete"

build-frontend:
	cd frontend && npm run build

# ─── Cleanup ──────────────────────────────────────────────────────────

clean:
	rm -rf backend/.venv backend/__pycache__ backend/**/__pycache__
	rm -rf frontend/node_modules frontend/.next
	@echo "✓ cleaned"
