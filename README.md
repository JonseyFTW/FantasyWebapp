# Fantasy Football AI Web Application

A comprehensive fantasy football analytics platform powered by AI and the Sleeper API through MCP (Model Context Protocol).

## 🏗️ Architecture Overview

```
fantasyWebapp/
├── frontend/           # Next.js 14 React application
├── backend/           # Node.js/Express API server
├── ai-service/        # AI analysis service (OpenAI/Claude/Gemini)
├── shared/            # Shared types and utilities
└── database/          # Prisma schema and migrations
```

**External Dependencies:**
- **Sleeper MCP Server**: Located at `../SleeperMCP/` - provides fantasy data via MCP protocol
- **PostgreSQL Database**: User data, leagues, analytics
- **Redis**: AI response caching and sessions

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** and **npm 9+**
2. **PostgreSQL 14+** database
3. **Redis 6+** server
4. **API Keys** for at least one AI provider:
   - OpenAI API key
   - Anthropic (Claude) API key  
   - Google (Gemini) API key
5. **OAuth Apps** configured:
   - Google OAuth 2.0 client
   - Discord OAuth application

### 1. Install Dependencies

```bash
cd fantasyWebapp
npm install
```

### 2. Environment Setup

Copy environment files and configure:

```bash
# Copy environment templates
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env

# Generate NextAuth secret
openssl rand -base64 32  # Use this for NEXTAUTH_SECRET
```

### 3. Configure Environment Variables

**Frontend (frontend/.env.local):**
```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-secret"
DATABASE_URL="postgresql://user:pass@localhost:5432/fantasy_football_db"
NEXT_PUBLIC_BACKEND_URL="http://localhost:4000"
NEXT_PUBLIC_AI_SERVICE_URL="http://localhost:5000"
```

**Backend (backend/.env):**
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/fantasy_football_db"
JWT_SECRET="your-jwt-secret"
REDIS_URL="redis://localhost:6379"
MCP_SERVER_URL="http://localhost:3001"
```

**AI Service (ai-service/.env):**
```bash
# AI Providers (configure at least one)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GEMINI_API_KEY="AI..."

# MCP Integration
MCP_SERVER_URL="http://localhost:3001"

# Caching
REDIS_URL="redis://localhost:6379"
DEFAULT_AI_PROVIDER="claude"
```

### 4. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 5. Start Services

**Option A: All services at once**
```bash
npm run dev
```

**Option B: Individual services**
```bash
# Terminal 1 - Frontend
npm run dev:frontend

# Terminal 2 - Backend 
npm run dev:backend

# Terminal 3 - AI Service
npm run dev:ai
```

### 6. Start External Dependencies

**Sleeper MCP Server:**
```bash
cd ../SleeperMCP
npm run dev  # Should run on http://localhost:3001
```

## 🤖 AI Features

### Start/Sit Analyzer
- **Endpoint**: `POST /ai/start-sit`
- **Features**: 
  - Multi-provider AI analysis (OpenAI, Claude, Gemini)
  - Risk tolerance preferences (conservative, moderate, aggressive)
  - Matchup analysis and injury considerations
  - Projected points with floor/ceiling/expected values

### Trade Analyzer  
- **Endpoint**: `POST /ai/trade-analysis`
- **Features**:
  - Comprehensive trade fairness scoring (0-10 scale)
  - Team-specific impact analysis
  - Market value comparison
  - Risk assessment and timing analysis
  - Letter grades (A+ to F) for both teams

### Waiver Wire Recommendations
- **Endpoint**: `POST /ai/waiver-wire` 
- **Features**:
  - Priority pickup recommendations
  - FAAB bidding strategy (for auction waivers)
  - Streaming recommendations (DEF, K, QB)
  - Drop candidate suggestions
  - Trend analysis (usage, opportunity, production)

### Quick Analysis
- **Endpoint**: `POST /ai/quick-analysis`
- **Features**:
  - Single-player quick recommendations
  - Trade value lookups
  - Streaming options by position

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

### Individual Service Tests
```bash
# Frontend tests
npm run test --workspace=frontend

# Backend tests  
npm run test --workspace=backend

# AI service tests
npm run test --workspace=ai-service

# Shared package tests
npm run test --workspace=shared
```

### E2E Tests
```bash
# Frontend E2E tests
npm run test:e2e --workspace=frontend
```

## 📊 API Documentation

### Authentication
All backend APIs use JWT tokens. Frontend uses NextAuth.js sessions.

```typescript
// Get API token from NextAuth session
const token = await getApiToken(session);

// Use token in requests
const response = await fetch('/api/protected-route', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Core Endpoints

**Authentication:**
- `POST /api/auth/token-exchange` - Exchange NextAuth token for API JWT
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/preferences` - Update user preferences

**AI Analysis:**
- `POST /ai/start-sit` - Start/sit analysis
- `POST /ai/trade-analysis` - Trade evaluation
- `POST /ai/waiver-wire` - Waiver wire recommendations
- `GET /ai/status` - Service health check

## 🔧 Development

### Code Structure

**Frontend (Next.js App Router):**
```
src/
├── app/              # App router pages
├── components/       # React components
│   ├── ui/          # Base UI components
│   └── ai/          # AI feature components
├── lib/             # Utilities and clients
├── hooks/           # Custom React hooks
└── types/           # TypeScript type definitions
```

**Backend (Express):**
```
src/
├── controllers/     # Route handlers
├── middleware/      # Express middleware
├── routes/         # API route definitions
├── services/       # Business logic
└── models/         # Database models
```

**AI Service:**
```
src/
├── agents/         # AI analysis agents
├── providers/      # AI provider implementations
├── services/       # Core services (AI manager, MCP client)
└── routes/         # API routes
```

### Adding New AI Features

1. **Create Agent**: Add new analyzer in `ai-service/src/agents/`
2. **Add Route**: Register in `ai-service/src/routes/ai-routes.ts`
3. **Frontend Client**: Add method to `frontend/src/lib/ai-client.ts`
4. **Component**: Create UI in `frontend/src/components/ai/`
5. **Tests**: Add comprehensive tests for all layers

### MCP Integration

The AI service connects to your existing Sleeper MCP server to fetch real-time fantasy data:

```typescript
// MCP tools are automatically available to AI providers
const tools = await mcpClient.getAvailableTools();
// Includes: get_user, get_league, get_players_nfl, get_projections, etc.

// AI can call MCP tools during analysis
const response = await aiManager.chat({
  messages: [...],
  tools: mcpTools,  // Automatically injected
}, 'claude', true);  // enableMCP = true
```

## 🚀 Deployment

### Production Environment

**Environment Variables:**
```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@prod-db:5432/fantasy_football_db"
REDIS_URL="redis://prod-redis:6379"
NEXTAUTH_SECRET="production-secret"
```

**Recommended Stack:**
- **Frontend**: Vercel or Netlify
- **Backend/AI**: Railway, Render, or AWS ECS
- **Database**: Railway PostgreSQL, AWS RDS, or Supabase
- **Redis**: Railway Redis, AWS ElastiCache, or Upstash

### Docker Deployment

```bash
# Build all services
docker-compose build

# Start production stack
docker-compose -f docker-compose.prod.yml up -d
```

## 🔍 Monitoring

### Health Checks
- Frontend: `http://localhost:3000/api/health`
- Backend: `http://localhost:4000/health`
- AI Service: `http://localhost:5000/health`
- MCP Server: `http://localhost:3001/health`

### Metrics
- AI Service: `http://localhost:5000/metrics` (Prometheus format)
- Backend: `http://localhost:4000/metrics`

## 🛠️ Troubleshooting

### Common Issues

**"MCP server not available"**
- Ensure Sleeper MCP server is running on port 3001
- Check `MCP_SERVER_URL` in ai-service environment

**"AI provider failed"**
- Verify API keys are correct and have sufficient credits
- Check provider-specific error messages in logs
- Ensure at least one AI provider is properly configured

**"Database connection failed"**
- Verify PostgreSQL is running and accessible
- Check `DATABASE_URL` format and credentials
- Run `npm run db:generate` after schema changes

**"Redis connection failed"**
- Ensure Redis server is running
- Check `REDIS_URL` format
- Verify Redis server accepts connections

### Debug Mode

```bash
# Enable debug logging
export DEBUG=fantasy-app:*
export LOG_LEVEL=debug

# Run with verbose logging
npm run dev
```

## 📈 Performance

### AI Response Caching
- AI responses cached in Redis (default 1 hour TTL)
- Cache keys based on request content hash
- Automatic cache invalidation on new data

### Database Optimization
- Indexed queries for common lookups
- Connection pooling with Prisma
- Database query optimization for large datasets

### Rate Limiting
- AI service: 100 requests per 15 minutes
- Backend API: Configurable rate limits
- Frontend: Built-in debouncing for AI requests

## 🔐 Security

### Authentication Flow
1. User signs in via NextAuth.js (Google/Discord OAuth)
2. Frontend exchanges NextAuth session for backend JWT
3. Backend validates JWT for protected routes
4. AI service trusts backend authentication

### Data Protection
- All API communications over HTTPS in production
- JWT tokens with expiration and refresh rotation
- Sensitive data encrypted at rest
- CORS properly configured for cross-origin requests

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Write** tests for new functionality
4. **Ensure** all tests pass (`npm test`)
5. **Commit** changes (`git commit -m 'Add amazing feature'`)
6. **Push** to branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Maintain 90%+ test coverage
- Use semantic commit messages
- Update documentation for new features
- Ensure all linting passes (`npm run lint`)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Sleeper API** for fantasy football data
- **OpenAI, Anthropic, Google** for AI capabilities
- **Model Context Protocol (MCP)** for tool integration
- **Fantasy Football Community** for inspiration and feedback