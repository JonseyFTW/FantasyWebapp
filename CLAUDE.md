# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Start Development Servers
```bash
# Start all services concurrently
npm run dev

# Start individual services
npm run dev:frontend    # Next.js frontend on :3000
npm run dev:backend     # Express backend on :4000  
npm run dev:ai          # AI service on :5000
```

### Database Operations
```bash
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to database
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed database with initial data
```

### Testing & Quality
```bash
npm test                # Run all tests across workspaces
npm run test:coverage   # Generate coverage reports
npm run test:watch      # Watch mode for development
npm run lint            # Lint all code
npm run lint:fix        # Auto-fix linting issues
npm run type-check      # TypeScript type checking
```

### Build & Production
```bash
npm run build           # Build all services for production
```

## Architecture Overview

This is a monorepo fantasy football web application with AI-powered analytics using npm workspaces:

### Core Services
- **frontend/**: Next.js 14 with App Router, NextAuth.js, TailwindCSS, Radix UI
- **backend/**: Express.js API server with JWT authentication, Prisma ORM 
- **ai-service/**: Multi-provider AI service (OpenAI, Claude, Gemini) with MCP integration
- **shared/**: Common TypeScript types and utilities shared across services

### Key Integrations
- **Sleeper MCP Server**: External dependency at `../SleeperMCP/` providing fantasy data via Model Context Protocol
- **PostgreSQL**: User data, leagues, player stats, AI analyses (see backend/prisma/schema.prisma)
- **Redis**: AI response caching and session storage
- **OAuth**: Google and Discord authentication via NextAuth.js

### Data Flow
1. Frontend authenticates users via NextAuth.js OAuth providers
2. Backend validates JWT tokens and manages league/user data via Prisma
3. AI service processes analysis requests using MCP tools for real-time fantasy data
4. All services communicate via HTTP APIs with shared TypeScript types

## AI Analysis Features

The AI service provides four main analysis types through `/ai/*` endpoints:

1. **Start/Sit Analysis** (`/ai/start-sit`): Player lineup recommendations with risk tolerance
2. **Trade Analysis** (`/ai/trade-analysis`): Trade fairness scoring and impact analysis  
3. **Waiver Wire** (`/ai/waiver-wire`): Priority pickups and FAAB bidding strategy
4. **Lineup Optimizer** (`/ai/lineup-optimizer`): Optimal lineup generation

All AI requests support multiple providers (OpenAI, Claude, Gemini) with MCP tool integration for live fantasy data.

## Database Schema Highlights

Key models in backend/prisma/schema.prisma:
- **User**: NextAuth.js integration with Sleeper user mapping
- **League/UserLeague**: Multi-league support with role-based access
- **Player/PlayerStats**: NFL player data and performance tracking
- **AIAnalysis**: Historical AI analysis storage and caching
- **TradeAnalysis**: Trade evaluation results and recommendations

## External Dependencies

### Required Services
- **PostgreSQL 14+**: Primary database
- **Redis 6+**: Caching and sessions  
- **Sleeper MCP Server**: Must run on port 3001 (from `../SleeperMCP/`)

### API Keys Needed
At least one AI provider is required:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY` 
- `GEMINI_API_KEY`

OAuth credentials:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- Discord OAuth app (optional)

## Development Workflow

1. **Environment Setup**: Copy `.env.example` files in each workspace and configure
2. **Database**: Run `npm run db:generate && npm run db:migrate && npm run db:seed`
3. **Start Dependencies**: Ensure PostgreSQL, Redis, and Sleeper MCP server are running
4. **Development**: Use `npm run dev` to start all services or individual workspace commands
5. **Testing**: Run `npm test` before committing changes