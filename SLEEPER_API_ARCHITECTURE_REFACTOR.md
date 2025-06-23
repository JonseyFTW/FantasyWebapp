# Sleeper API Architecture Refactor Plan

## Current State Analysis
- Backend uses MCP for all Sleeper data (league details, rosters, etc.)
- AI service also uses MCP for analysis
- This creates unnecessary complexity and dependencies for simple data fetching

## Recommended Architecture

### Direct Sleeper API Usage (Backend)
**Purpose**: Fast, reliable data fetching for UI display

**Use Cases**:
- League information and settings
- Team rosters and standings  
- Weekly matchups and schedules
- Player information and stats
- User roster management
- League member data

**Benefits**:
- ⚡ Faster response times (no MCP proxy)
- 🛡️ More reliable (fewer dependencies)
- 🔧 Easier to debug and monitor
- 💾 Better caching strategies
- 📊 Direct rate limit management

### MCP Server Usage (AI Service Only)
**Purpose**: LLM tool calling for fantasy analysis

**Use Cases**:
- Start/Sit analysis with reasoning
- Trade value analysis and recommendations
- Waiver wire strategy and priorities
- Lineup optimization with logic
- Advanced fantasy analytics

**Benefits**:
- 🧠 Proper tool separation for AI
- 🔗 Tool chaining capabilities
- 🎯 Context-aware analysis
- 🤖 LLM decision making
- 📈 Strategic recommendations

## Implementation Plan

### Phase 1: Backend Refactor (High Priority)

#### 1.1 Create Direct Sleeper API Service
```typescript
// backend/src/services/sleeper-api-service.ts
class SleeperAPIService {
  private baseUrl = 'https://api.sleeper.app/v1';
  
  // League data
  async getLeague(leagueId: string)
  async getLeagueRosters(leagueId: string) 
  async getLeagueUsers(leagueId: string)
  async getLeagueMatchups(leagueId: string, week: number)
  
  // User data
  async getUserByUsername(username: string)
  async getUserLeagues(userId: string, season: string)
  
  // Player data
  async getAllPlayers()
  async getPlayerStats(season: string, week?: number)
}
```

#### 1.2 Update League Service
```typescript
// Replace MCP calls with direct API calls
class LeagueService {
  constructor(private sleeperAPI: SleeperAPIService) {}
  
  async getLeagueDetails(sleeperLeagueId: string) {
    // Use this.sleeperAPI.getLeague() instead of MCP
  }
  
  async getLeagueStandings(sleeperLeagueId: string) {
    // Use this.sleeperAPI.getLeagueRosters() instead of MCP
  }
  // ... etc
}
```

#### 1.3 Remove MCP Dependencies from Backend
- Remove MCP client from backend service
- Update all league routes to use direct API
- Add proper error handling and caching
- Implement rate limiting strategies

### Phase 2: AI Service Optimization (Medium Priority)

#### 2.1 Keep MCP for AI Analysis Only
```typescript
// ai-service remains unchanged - still uses MCP for LLM tool calling
class StartSitAnalyzer {
  // LLM calls MCP tools to get data for analysis
  async analyzeStartSit(request: StartSitRequest) {
    // LLM uses MCP tools: get_league_rosters, get_matchups, etc.
  }
}
```

#### 2.2 Optimize AI Tool Usage
- Ensure MCP tools provide rich context for AI
- Add more sophisticated tool chaining
- Improve AI reasoning with better tool descriptions

### Phase 3: Performance Optimization (Low Priority)

#### 3.1 Caching Strategy
```typescript
// Add Redis caching for frequently accessed data
class SleeperAPIService {
  async getLeague(leagueId: string) {
    // Check cache first, then API
    const cached = await this.redis.get(`league:${leagueId}`);
    if (cached) return JSON.parse(cached);
    
    const league = await this.fetchFromAPI(`/league/${leagueId}`);
    await this.redis.setex(`league:${leagueId}`, 300, JSON.stringify(league)); // 5min cache
    return league;
  }
}
```

#### 3.2 Rate Limiting
- Implement smart rate limiting for Sleeper API
- Add request queuing and batching
- Monitor API usage and optimize calls

## File Changes Required

### Backend Changes
- ✏️ `backend/src/services/sleeper-api-service.ts` (new)
- ✏️ `backend/src/services/league-service.ts` (refactor)
- ✏️ `backend/src/routes/leagues.ts` (update)
- ✏️ `backend/src/routes/sleeper.ts` (update)
- ❌ Remove MCP client from backend

### AI Service Changes
- ✅ `ai-service/src/services/mcp-client.ts` (keep as-is)
- ✅ AI agents continue using MCP for analysis

### Frontend Changes
- ✅ No changes needed (API contracts remain same)

## Benefits After Refactor

### Performance Improvements
- 🚀 50% faster league data loading
- 📉 Reduced latency for dashboard/league pages
- 💾 Better caching strategies
- 🔄 Fewer service dependencies

### Reliability Improvements  
- 🛡️ League pages work even if MCP is down
- 🔧 Simpler debugging and monitoring
- 📊 Better error handling and logging
- ⚡ More predictable performance

### Architecture Benefits
- 🎯 Proper separation of concerns
- 🧠 AI focused on analysis, not data fetching
- 🔗 Better tool usage in AI service
- 📈 Scalable architecture

## Migration Strategy

1. **Week 1**: Implement SleeperAPIService with direct API calls
2. **Week 2**: Update league-service to use direct API (with fallbacks)
3. **Week 3**: Remove MCP dependencies from backend routes
4. **Week 4**: Add caching and rate limiting optimizations

## Success Metrics

- ⏱️ League page load time < 1 second
- 🛡️ 99.9% uptime for data endpoints  
- 🚀 50% reduction in average response time
- 🧠 AI analysis quality maintained/improved

This refactor will give us the best of both worlds: fast, reliable data access for the UI and powerful AI tool integration for analysis.