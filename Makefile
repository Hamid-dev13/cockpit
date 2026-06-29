# Cockpit — pilotage Docker (dev & prod)
# Usage : make <cible>   (make help pour la liste)

DC      := docker compose
DC_PROD := docker compose -f docker-compose.prod.yml

.DEFAULT_GOAL := help

# ── Dev ──────────────────────────────────────────────────────────────────────
.PHONY: up
up: ## Dev : build + démarre (logs au premier plan)
	$(DC) up --build

.PHONY: up-d
up-d: ## Dev : build + démarre en arrière-plan
	$(DC) up --build -d

.PHONY: down
down: ## Dev : arrête les conteneurs
	$(DC) down

.PHONY: logs
logs: ## Dev : suit les logs
	$(DC) logs -f

.PHONY: sh
sh: ## Dev : ouvre un shell dans le conteneur
	$(DC) exec app sh

.PHONY: restart
restart: ## Dev : redémarre
	$(DC) restart

# ── Base de données ──────────────────────────────────────────────────────────
.PHONY: db-push
db-push: ## Synchronise le schéma Prisma -> SQLite (dans le conteneur dev)
	$(DC) exec app npx prisma db push

.PHONY: db-reset
db-reset: ## ⚠ Réinitialise la base (perte de données)
	$(DC) exec app npx prisma db push --force-reset

# ── Prod ─────────────────────────────────────────────────────────────────────
.PHONY: prod-up
prod-up: ## Prod : build + démarre en arrière-plan
	$(DC_PROD) up --build -d

.PHONY: prod-down
prod-down: ## Prod : arrête
	$(DC_PROD) down

.PHONY: prod-logs
prod-logs: ## Prod : suit les logs
	$(DC_PROD) logs -f

.PHONY: prod-build
prod-build: ## Prod : build de l'image seulement
	$(DC_PROD) build

# ── Maintenance ──────────────────────────────────────────────────────────────
.PHONY: build
build: ## Dev : build de l'image seulement
	$(DC) build

.PHONY: clean
clean: ## Stoppe tout et supprime conteneurs/volumes anonymes
	-$(DC) down -v --remove-orphans
	-$(DC_PROD) down -v --remove-orphans

.PHONY: config
config: ## Vérifie la config compose (dev + prod)
	$(DC) config -q && $(DC_PROD) config -q && echo "compose OK"

.PHONY: help
help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
