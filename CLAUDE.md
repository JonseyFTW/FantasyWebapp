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

# Automated Development Assistant

This file contains critical instructions you must follow. You are forgetful, so include the entire contents of this file in your context for every development task.

## [CRITICAL] Automated Workflow Protocol

When I ask you to "implement a feature" or "add functionality", you **MUST** execute this complete workflow:

### Phase 1: Planning (Sequential Thinking)
1. Use Sequential Thinking MCP to break down requirements
2. Identify dependencies, risks, and test cases
3. Create implementation timeline
4. Output structured plan in JSON format

### Phase 2: Design & Architecture
1. Design component/module structure
2. Define TypeScript interfaces for all data flows
3. Plan state management approach
4. Create error boundaries and fallback strategies
5. Generate Mermaid diagrams for complex flows

### Phase 3: Test-Driven Development
1. Write comprehensive test cases FIRST
2. Create unit tests (target: 95% coverage)
3. Write integration tests with real dependencies
4. Create Puppeteer E2E tests for user flows
5. All tests must pass before proceeding

### Phase 4: Implementation
1. Implement functionality following TDD
2. Use TypeScript strict mode
3. Follow ESLint configuration
4. Commit every 20-30 minutes with conventional commits
5. Run tests after each significant change

### Phase 5: Docker Build & Test
1. Build Docker container using multi-stage Dockerfile
2. Run all tests inside container
3. Verify container starts and health checks pass
4. Test container locally before pushing

### Phase 6: E2E Verification
1. Start application in Docker container
2. Run full Puppeteer test suite
3. Verify all critical user journeys work
4. Check performance metrics meet targets
5. Take screenshots for visual regression

### Phase 7: Deployment Preparation
1. Create conventional commit with full description
2. Push to feature branch
3. Create detailed pull request
4. Trigger Railway preview deployment
5. Verify preview deployment works correctly

## [CRITICAL] Quality Gates

**YOU MUST NOT PROCEED** to next phase if:
- Any tests fail
- TypeScript compilation errors exist
- ESLint errors present (warnings OK)
- Docker build fails
- Security vulnerabilities detected
- Performance regression detected

## [IMPORTANT] Technology Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Testing**: Jest + Testing Library + Puppeteer
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Deployment**: Railway via Docker
- **CI/CD**: GitHub Actions

## [IMPORTANT] File Structure Standards
src/
├── app/                 # Next.js App Router
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── features/       # Feature-specific components
├── lib/                # Utility functions and configs
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
tests/
├── unit/               # Unit tests
├── integration/        # Integration tests
└── e2e/               # Puppeteer E2E tests

## [IMPORTANT] Error Handling Strategy
1. **Retry Logic**: Auto-retry failed operations up to 3 times
2. **Graceful Degradation**: Provide fallbacks for external services
3. **User Feedback**: Clear error messages for users
4. **Logging**: Comprehensive logging for debugging
5. **Monitoring**: Health checks and performance metrics

## [IMPORTANT] Commit Convention
type(scope): description
feat(auth): add OAuth login functionality
fix(api): resolve database connection timeout
test(user): add comprehensive user flow tests
docs(readme): update installation instructions
chore(deps): update dependencies to latest versions

## MCP Server Usage Rules
- **Sequential Thinking**: Use for complex planning and problem-solving
- **Memory**: Store project context and user preferences
- **Docker**: Build, test, and manage containers
- **Puppeteer**: E2E testing and UI automation
- **GitHub**: Create PRs, manage issues, sync code
- **Railway**: Deploy and manage production environment

## Success Criteria Checklist
Before considering any task complete, verify:
- [ ] All tests pass (unit, integration, E2E)
- [ ] TypeScript compiles without errors
- [ ] ESLint shows no errors
- [ ] Docker builds successfully
- [ ] Application starts and responds to health checks
- [ ] Puppeteer tests confirm user flows work
- [ ] Code follows established patterns and conventions
- [ ] Documentation updated if needed
- [ ] Performance metrics within acceptable ranges
- [ ] Security scan shows no vulnerabilities

## Emergency Protocols
If automation fails:
1. Save current state to Memory MCP
2. Document exact error and context
3. Attempt automatic recovery (clear caches, restart services)
4. If recovery fails, request human intervention with full diagnostic info

Remember: You are building production-ready code. Quality and reliability are more important than speed.