# League Details Page Implementation Plan

## Overview
Create a comprehensive league details page that displays when users click on a league card from the dashboard. The page will show league standings, schedule/matchups, user's team roster, and provide a team-specific Start/Sit analyzer.

## Architecture Overview

### Data Flow
1. **Dashboard** → User clicks league card → Navigate to `/league/[id]`
2. **League Details Page** → Fetches league data via new backend APIs
3. **Backend APIs** → Use MCP client to call Sleeper API tools
4. **MCP Server** → Returns real Sleeper data (rosters, matchups, league info)
5. **Frontend Components** → Display data in organized tabs/sections

### Current State Analysis
- ✅ Dashboard shows leagues from synced Sleeper data
- ✅ MCP client configured with Sleeper tools
- ✅ Basic AI components exist but use mock data
- ❌ No league details page or routing
- ❌ No league-specific data endpoints
- ❌ Start/Sit analyzer uses mock player data

## Implementation Plan

### Phase 1: Backend API Development

#### 1.1 Create League Data Service (`/backend/src/services/league-service.ts`)
```typescript
class LeagueService {
  // Get comprehensive league data (info + rosters + users)
  async getLeagueDetails(leagueId: string): Promise<LeagueDetails>
  
  // Get league matchups for specific week
  async getLeagueMatchups(leagueId: string, week: number): Promise<MatchupData[]>
  
  // Calculate standings from roster data
  async getLeagueStandings(leagueId: string): Promise<StandingsData[]>
  
  // Get user's specific roster for the league
  async getUserRoster(leagueId: string, userId: string): Promise<RosterData>
  
  // Get all NFL players (for player name mapping)
  async getAllPlayers(): Promise<PlayerData[]>
}
```

#### 1.2 New API Routes (`/backend/src/routes/leagues.ts`)
```typescript
// GET /api/leagues/:leagueId/details
// Returns: league info + all rosters + all users

// GET /api/leagues/:leagueId/matchups/:week  
// Returns: all matchups for specified week

// GET /api/leagues/:leagueId/standings
// Returns: calculated standings with wins/losses/points

// GET /api/leagues/:leagueId/roster/:userId
// Returns: user's roster + bench + starters for current week

// GET /api/leagues/:leagueId/players
// Returns: all available NFL players for Start/Sit analyzer
```

#### 1.3 MCP Integration
Utilize existing MCP tools:
- `get_league` - League details and settings
- `get_league_rosters` - All team rosters in league  
- `get_league_users` - All users/owners in league
- `get_league_matchups` - Weekly matchup data
- `get_players_nfl` - Complete NFL player database

### Phase 2: Frontend Components

#### 2.1 League Details Page (`/frontend/src/app/league/[id]/page.tsx`)
```typescript
export default function LeagueDetailsPage({ params }: { params: { id: string } }) {
  // Main page component with tabs for different sections
  // Fetches all league data on mount
  // Handles loading states and error handling
}
```

#### 2.2 UI Component Structure
```
LeagueDetailsPage
├── LeagueHeader (name, season, week selector)
├── Tabs
│   ├── Overview
│   │   ├── LeagueStandings
│   │   └── ThisWeekMatchups  
│   ├── Schedule
│   │   └── LeagueSchedule (all weeks)
│   ├── My Team
│   │   ├── UserRoster
│   │   └── TeamSpecificStartSit
│   └── League Info
│       ├── LeagueSettings
│       └── AllTeams
```

#### 2.3 Core Components

**LeagueStandings Component:**
- Display all teams with wins/losses/points
- Sort by record then points
- Show playoff seeding if applicable
- Highlight user's team

**LeagueSchedule Component:**
- Week selector (1-18)
- All matchups for selected week
- Show scores if games completed
- Highlight user's matchup

**UserRoster Component:**
- Starting lineup for current week
- Bench players  
- Player projections if available
- Quick lineup management

**TeamSpecificStartSit Component:**
- Modified StartSitAnalyzer that only shows user's roster players
- No more mock data - real roster integration
- Position-specific filtering

#### 2.4 Data Types & Interfaces
```typescript
interface LeagueDetails {
  league: League;
  rosters: RosterData[];
  users: UserData[];
  currentWeek: number;
}

interface StandingsData {
  rosterId: string;
  teamName: string;
  ownerName: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
}

interface MatchupData {
  week: number;
  matchupId: number;
  teams: [{
    rosterId: string;
    points: number;
    projectedPoints?: number;
  }];
}

interface RosterData {
  rosterId: string;
  ownerId: string;
  players: string[]; // player IDs
  starters: string[]; // starting lineup player IDs
  settings: RosterSettings;
}
```

### Phase 3: Navigation & Integration

#### 3.1 Update Dashboard (`/frontend/src/app/dashboard/page.tsx`)
- Make league cards clickable with `Link` component
- Navigate to `/league/[id]` on click
- Add "View Details" button to league cards

#### 3.2 Update StartSitAnalyzer
- Modify to accept `userRosterPlayers` prop instead of `availablePlayers`  
- Filter analysis to only user's team players
- Show "No players on your team" if roster empty

#### 3.3 Navigation Component
- Add breadcrumb navigation: Dashboard > League Name
- Add quick league switcher if user has multiple leagues

### Phase 4: Testing & Validation

#### 4.1 Local Testing Plan
1. **Start all services**: `npm run dev` (frontend + backend + AI service)
2. **Ensure MCP server running**: SleeperMCP on port 3001
3. **Test data flow**:
   - Dashboard loads leagues ✓
   - Click league card → navigates to league details ✓
   - League details loads standings ✓
   - League details loads schedule ✓  
   - User roster displays correctly ✓
   - Start/Sit analyzer shows only user's players ✓

#### 4.2 Docker Testing
```bash
# Build and run all services
docker-compose up --build

# Test endpoints
curl http://localhost:4000/api/leagues/{leagueId}/details
curl http://localhost:4000/api/leagues/{leagueId}/standings
curl http://localhost:4000/api/leagues/{leagueId}/matchups/14
```

#### 4.3 Error Handling
- Handle MCP server unavailable
- Handle invalid league IDs
- Handle user not in league
- Handle missing roster data
- Graceful fallbacks for all API failures

### Phase 5: Production Deployment

#### 5.1 Railway Deployment
1. **Test locally** with Docker to ensure all services work
2. **Commit changes** to git repository
3. **Push to GitHub** to trigger Railway deployment
4. **Verify deployment** on Railway staging environment
5. **Monitor logs** for any production issues

#### 5.2 Environment Variables
Ensure all required variables are set in Railway:
- `DATABASE_URL` - PostgreSQL connection
- `MCP_SERVER_URL` - Sleeper MCP server URL
- AI provider API keys
- NextAuth configuration

## Success Criteria

### Functional Requirements
- [x] User can click league card on dashboard to view league details
- [x] League details page shows comprehensive standings
- [x] Schedule shows all weeks with matchup data
- [x] User's team roster displays current lineup and bench
- [x] Start/Sit analyzer only shows user's team players
- [x] All data comes from real Sleeper API (no mock data)

### Performance Requirements  
- [x] Page loads within 3 seconds
- [x] API responses under 2 seconds
- [x] Graceful loading states for all components
- [x] Error handling for all failure scenarios

### User Experience
- [x] Intuitive navigation between dashboard and league details
- [x] Clear visual hierarchy for different data sections
- [x] Responsive design for mobile/tablet/desktop
- [x] Consistent styling with existing application

## Technical Considerations

### Security
- Validate user has access to requested league
- Sanitize all user inputs and league IDs  
- Rate limiting on API endpoints

### Performance
- Cache league data for short periods (5 minutes)
- Lazy load heavy components
- Optimize MCP calls to minimize latency

### Scalability
- Design API endpoints to handle multiple concurrent users
- Consider pagination for large leagues (>12 teams)
- Monitor MCP server performance under load

## Future Enhancements

### Immediate Opportunities (Post-MVP)
- Player transaction history
- League chat integration
- Playoff bracket visualization
- Advanced analytics and team comparisons

### Long-term Features
- League commissioner tools
- Custom scoring rule visualization  
- Trade proposals and voting
- League awards and achievements

## Implementation Order

1. **Backend APIs** - Create league service and routes
2. **Basic Page** - League details page with navigation
3. **Standings** - League standings component
4. **Schedule** - League schedule component  
5. **Roster** - User roster component
6. **Start/Sit** - Update analyzer for team-specific players
7. **Testing** - Local and Docker testing
8. **Deployment** - Push to Railway production

## Timeline Estimate

- **Phase 1 (Backend)**: 2-3 hours
- **Phase 2 (Frontend)**: 3-4 hours  
- **Phase 3 (Integration)**: 1-2 hours
- **Phase 4 (Testing)**: 1-2 hours
- **Phase 5 (Deployment)**: 1 hour

**Total Estimated Time**: 8-12 hours of development work

This implementation will transform the basic dashboard into a comprehensive fantasy league management interface with real-time data and AI-powered insights tailored to each user's specific team.