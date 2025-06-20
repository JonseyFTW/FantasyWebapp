# Docker Setup Guide

This guide explains how to run the Fantasy Football Web App using Docker for local development and testing.

## Prerequisites

- Docker Desktop (latest version)
- Docker Compose (included with Docker Desktop)
- Git

## Quick Start

1. **Clone and setup environment**:
   ```bash
   git clone <your-repo>
   cd fantasyWebapp
   cp .env.example .env
   ```

2. **Edit environment variables** in `.env`:
   - Add your AI provider API keys (OpenAI, Anthropic, Gemini)
   - Add OAuth credentials if needed
   - MCP server URL should point to your Sleeper MCP server

3. **Start development environment**:
   ```bash
   make dev
   ```

4. **Initialize database**:
   ```bash
   make db-reset
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - AI Service: http://localhost:5000

## Commands

### Development (Hot Reload)
```bash
# Start development environment
make dev

# Build and start (if you made changes to Dockerfiles)
make dev-build

# Stop development environment
make down-dev

# View logs
make logs

# Follow logs in real-time
make logs-follow
```

### Production Build
```bash
# Start production environment
make prod

# Build and start production
make prod-build

# Stop production environment
make down-prod
```

### Database Management
```bash
# Run migrations
make db-migrate

# Seed test data
make db-seed

# Reset database (migrate + seed)
make db-reset
```

### Service-Specific Logs
```bash
# View specific service logs
make backend-logs
make frontend-logs
make ai-logs
```

### Health Checks
```bash
# Check if all services are running
make health
```

### Cleanup
```bash
# Clean up containers and volumes
make clean
```

## Architecture

The Docker setup includes:

- **PostgreSQL 15**: Database for user data and analytics
- **Redis 7**: Caching for AI responses and sessions
- **Backend**: Express.js API server (port 4000)
- **AI Service**: AI analysis service (port 5000)
- **Frontend**: Next.js application (port 3000)

## Environment Variables

### Required for AI Features
- `OPENAI_API_KEY`: OpenAI GPT-4 API key
- `ANTHROPIC_API_KEY`: Claude API key
- `GEMINI_API_KEY`: Google Gemini API key

### Required for Authentication
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `NEXTAUTH_SECRET`: NextAuth encryption secret

### Required for MCP Integration
- `MCP_SERVER_URL`: URL to your Sleeper MCP server (default: http://localhost:3001)

## Development vs Production

### Development Mode (`docker-compose.dev.yml`)
- **Hot reload**: Code changes are reflected immediately
- **Volume mounts**: Source code is mounted for live editing
- **Debug mode**: Detailed logging and error reporting
- **Node modules**: Cached in Docker volumes for faster rebuilds

### Production Mode (`docker-compose.yml`)
- **Optimized builds**: Multi-stage builds for smaller images
- **Production settings**: Optimized for performance and security
- **Health checks**: Built-in health monitoring
- **Static serving**: Frontend served as static files

## Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using the ports
   lsof -i :3000
   lsof -i :4000
   lsof -i :5000
   ```

2. **Database connection issues**:
   ```bash
   # Check if PostgreSQL is running
   docker-compose -f docker-compose.dev.yml ps postgres
   
   # Check logs
   docker-compose -f docker-compose.dev.yml logs postgres
   ```

3. **Node modules issues**:
   ```bash
   # Clean and rebuild
   make clean
   make dev-build
   ```

4. **MCP server not accessible**:
   - Ensure your Sleeper MCP server is running on port 3001
   - Check MCP_SERVER_URL in your .env file
   - Use `host.docker.internal:3001` for Docker containers to access host services

### Service URLs in Development

When services need to communicate with each other:

- **From Frontend to Backend**: `http://localhost:4000` (browser) or `http://backend:4000` (SSR)
- **From Frontend to AI Service**: `http://localhost:5000` (browser) or `http://ai-service:5000` (SSR)
- **From Backend to AI Service**: `http://ai-service:5000`
- **From AI Service to MCP Server**: `http://host.docker.internal:3001`

### Logs and Debugging

```bash
# View all logs
make logs

# Follow specific service logs
docker-compose -f docker-compose.dev.yml logs -f frontend

# Execute commands in running containers
docker-compose -f docker-compose.dev.yml exec backend sh
docker-compose -f docker-compose.dev.yml exec frontend sh
```

## Data Persistence

- **PostgreSQL data**: Stored in `postgres_dev_data` volume
- **Redis data**: Stored in `redis_dev_data` volume
- **Node modules**: Cached in anonymous volumes for faster rebuilds

To reset all data:
```bash
make clean
```

## Performance Tips

1. **Use development mode** for coding with hot reload
2. **Use production mode** for testing the final build
3. **Clean up regularly** to free disk space: `make clean`
4. **Monitor resource usage** with Docker Desktop dashboard