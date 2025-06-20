# Fantasy Football Web App - Docker Commands

.PHONY: help install build up down logs clean dev prod test

# Default target
help:
	@echo "Fantasy Football Web App - Docker Commands"
	@echo ""
	@echo "Development:"
	@echo "  dev          - Start development environment"
	@echo "  dev-build    - Build and start development environment"
	@echo "  logs         - Show development logs"
	@echo "  down-dev     - Stop development environment"
	@echo ""
	@echo "Production:"
	@echo "  prod         - Start production environment"
	@echo "  prod-build   - Build and start production environment"
	@echo "  down-prod    - Stop production environment"
	@echo ""
	@echo "Database:"
	@echo "  db-migrate   - Run database migrations"
	@echo "  db-seed      - Seed database with test data"
	@echo "  db-reset     - Reset database (migrate + seed)"
	@echo ""
	@echo "Utilities:"
	@echo "  install      - Install dependencies locally"
	@echo "  test         - Run tests"
	@echo "  clean        - Clean up containers and volumes"
	@echo "  logs-follow  - Follow logs in real-time"

# Local development (with hot reload)
dev:
	@echo "Starting development environment..."
	@docker-compose -f docker-compose.dev.yml up -d

dev-build:
	@echo "Building and starting development environment..."
	@docker-compose -f docker-compose.dev.yml up -d --build

down-dev:
	@echo "Stopping development environment..."
	@docker-compose -f docker-compose.dev.yml down

# Production build
prod:
	@echo "Starting production environment..."
	@docker-compose up -d

prod-build:
	@echo "Building and starting production environment..."
	@docker-compose up -d --build

down-prod:
	@echo "Stopping production environment..."
	@docker-compose down

# Database management
db-migrate:
	@echo "Running database migrations..."
	@docker-compose -f docker-compose.dev.yml exec backend npm run db:migrate

db-seed:
	@echo "Seeding database..."
	@docker-compose -f docker-compose.dev.yml exec backend npm run db:seed

db-reset: db-migrate db-seed
	@echo "Database reset complete!"

# Local installation
install:
	@echo "Installing dependencies locally..."
	@npm install
	@npm run build --workspace=shared

# Testing
test:
	@echo "Running tests..."
	@npm run test

# Logging
logs:
	@docker-compose -f docker-compose.dev.yml logs

logs-follow:
	@docker-compose -f docker-compose.dev.yml logs -f

# Cleanup
clean:
	@echo "Cleaning up containers and volumes..."
	@docker-compose -f docker-compose.dev.yml down -v
	@docker-compose down -v
	@docker system prune -f

# Service-specific commands
backend-logs:
	@docker-compose -f docker-compose.dev.yml logs -f backend

frontend-logs:
	@docker-compose -f docker-compose.dev.yml logs -f frontend

ai-logs:
	@docker-compose -f docker-compose.dev.yml logs -f ai-service

# Health checks
health:
	@echo "Checking service health..."
	@curl -f http://localhost:3000/api/health || echo "Frontend: DOWN"
	@curl -f http://localhost:4000/health || echo "Backend: DOWN"
	@curl -f http://localhost:5000/health || echo "AI Service: DOWN"