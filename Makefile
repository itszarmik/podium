.PHONY: dev start stop build test migrate seed clean logs shell-api shell-db help

# ─── Development ──────────────────────────────────────────────────────────────

dev: ## Start API + Web in dev mode (requires Postgres + Redis running)
	npm run dev

dev-docker: ## Start everything in Docker with hot-reload
	docker compose up -d postgres redis
	@echo "Waiting for databases..."
	@sleep 3
	npm run dev

# ─── Docker ───────────────────────────────────────────────────────────────────

start: ## Start all services via Docker Compose
	docker compose up -d
	@echo ""
	@echo "✅  Podium running:"
	@echo "    Web:  http://localhost:3000"
	@echo "    API:  http://localhost:3001"
	@echo "    WS:   ws://localhost:3001/api/v1/ws"

stop: ## Stop all Docker services
	docker compose down

build: ## Build Docker images
	docker compose build

logs: ## Tail logs from all services
	docker compose logs -f

logs-api: ## Tail API logs only
	docker compose logs -f api

logs-web: ## Tail web logs only
	docker compose logs -f web

# ─── Database ─────────────────────────────────────────────────────────────────

migrate: ## Run database migrations
	npm run db:migrate

seed: ## Seed database with demo data
	npm run db:seed

migrate-docker: ## Run migrations inside Docker
	docker compose exec api npm run db:migrate

seed-docker: ## Seed database inside Docker
	docker compose exec api npm run db:seed

shell-db: ## Open psql shell
	docker compose exec postgres psql -U podium -d podium

# ─── Testing ──────────────────────────────────────────────────────────────────

test: ## Run API test suite
	npm run test --workspace=apps/api

test-watch: ## Run tests in watch mode
	npm run test:watch --workspace=apps/api

# ─── Utilities ────────────────────────────────────────────────────────────────

shell-api: ## Open shell in API container
	docker compose exec api sh

clean: ## Remove containers, volumes, and node_modules
	docker compose down -v
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	rm -rf apps/*/dist apps/web/.next

setup: ## First-time setup (install + migrate + seed)
	npm install
	cp -n apps/api/.env.example apps/api/.env || true
	$(MAKE) migrate
	$(MAKE) seed
	@echo ""
	@echo "✅  Setup complete. Run 'make dev' to start."

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
