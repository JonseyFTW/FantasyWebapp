import { PrismaClient } from '@prisma/client';
import { sleeperAPIService as defaultSleeperAPI, SleeperAPIService } from './sleeper-api-service';

const prisma = new PrismaClient();

export interface LeagueDetails {
  league: any;
  rosters: any[];
  users: any[];
  currentWeek: number;
}

export interface StandingsData {
  rosterId: string;
  teamName: string;
  ownerName: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
}

export interface MatchupData {
  week: number;
  matchupId: number;
  teams: Array<{
    rosterId: string;
    points: number;
    projectedPoints?: number;
  }>;
}

export interface RosterData {
  rosterId: string;
  ownerId: string;
  players: string[];
  starters: string[];
  settings: any;
}

export class LeagueService {
  private mcpServerUrl: string;
  private sleeperAPI: SleeperAPIService;
  private prisma: PrismaClient;

  constructor(sleeperAPIService?: SleeperAPIService, prismaClient?: PrismaClient) {
    this.mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';
    this.sleeperAPI = sleeperAPIService || defaultSleeperAPI;
    this.prisma = prismaClient || prisma;
  }

  private async callMCPTool(toolName: string, params: any): Promise<any> {
    try {
      console.log(`Calling MCP tool: ${toolName} with params:`, params);
      
      const response = await fetch(`${this.mcpServerUrl}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: toolName,
          params: params,
          id: Date.now(),
        }),
      });

      if (!response.ok) {
        console.error(`MCP call failed: ${response.status} - ${response.statusText}`);
        throw new Error(`MCP call failed: ${response.status}`);
      }

      const result = await response.json() as any;
      
      if (result.error) {
        console.error(`MCP error:`, result.error);
        throw new Error(`MCP error: ${result.error.message}`);
      }

      console.log(`MCP tool ${toolName} successful`);
      return result.result;
    } catch (error) {
      console.error(`MCP tool call failed for ${toolName}:`, error);
      
      // Check if it's a connection error
      if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed'))) {
        throw new Error(`MCP Server unavailable. Please ensure the Sleeper MCP server is running on ${this.mcpServerUrl}`);
      }
      
      throw new Error(`Failed to call ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getLeagueDetails(sleeperLeagueId: string): Promise<LeagueDetails> {
    try {
      console.log(`Getting league details for: ${sleeperLeagueId}`);
      
      // Try direct Sleeper API first (Phase 1: Primary method)
      try {
        return await this.getLeagueDetailsDirectAPI(sleeperLeagueId);
      } catch (directAPIError) {
        console.warn('Direct Sleeper API failed, falling back to MCP:', directAPIError);
        return await this.getLeagueDetailsMCP(sleeperLeagueId);
      }
    } catch (error) {
      console.error('Error getting league details:', error);
      throw new Error(`Failed to get league details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getLeagueDetailsMCP(sleeperLeagueId: string): Promise<LeagueDetails> {
    try {
      console.log('Using MCP for league details');
      
      // Get league info
      const league = await this.callMCPTool('sleeper.getLeague', {
        leagueId: sleeperLeagueId
      });

      // Get all rosters
      const rosters = await this.callMCPTool('sleeper.getRosters', {
        leagueId: sleeperLeagueId
      });

      // Get all users
      const users = await this.callMCPTool('sleeper.getUsers', {
        leagueId: sleeperLeagueId
      });

      // Get current NFL state for week info
      const nflState = await this.callMCPTool('sleeper.getNFLState', {});

      return {
        league,
        rosters: rosters || [],
        users: users || [],
        currentWeek: (nflState as any)?.week || 14,
      };
    } catch (error) {
      console.error('MCP league details failed:', error);
      throw new Error(`MCP league details failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getLeagueDetailsDirectAPI(sleeperLeagueId: string): Promise<LeagueDetails> {
    try {
      console.log('Using direct Sleeper API service for league details');
      
      // Use the new SleeperAPIService with batch operation for efficiency
      const { league, rosters, users } = await this.sleeperAPI.getLeagueDetailsBatch(sleeperLeagueId);
      
      // Get current NFL week
      const nflState = await this.sleeperAPI.getNFLState();

      return {
        league,
        rosters: rosters || [],
        users: users || [],
        currentWeek: nflState?.week || 14,
      };
    } catch (error) {
      console.error('Direct Sleeper API service failed:', error);
      throw new Error(`Direct Sleeper API service failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getLeagueMatchups(sleeperLeagueId: string, week: number): Promise<MatchupData[]> {
    try {
      try {
        const matchups = await this.callMCPTool('sleeper.getMatchups', {
          leagueId: sleeperLeagueId,
          week: week
        });

        if (!matchups || !Array.isArray(matchups)) {
          return [];
        }

        // Group matchups by matchup_id
        const matchupGroups: { [key: string]: any[] } = {};
        
        matchups.forEach((matchup: any) => {
          const matchupId = matchup.matchup_id;
          if (!matchupGroups[matchupId]) {
            matchupGroups[matchupId] = [];
          }
          matchupGroups[matchupId].push(matchup);
        });

        // Convert to MatchupData format
        return Object.entries(matchupGroups).map(([matchupId, teams]) => ({
          week,
          matchupId: parseInt(matchupId),
          teams: teams.map(team => ({
            rosterId: team.roster_id,
            points: team.points || 0,
            projectedPoints: team.projected_points
          }))
        }));
      } catch (mcpError) {
        console.warn('MCP unavailable for matchups, using direct API');
        return await this.getLeagueMatchupsDirectAPI(sleeperLeagueId, week);
      }
    } catch (error) {
      console.error('Error getting league matchups:', error);
      throw new Error(`Failed to get league matchups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getLeagueMatchupsDirectAPI(sleeperLeagueId: string, week: number): Promise<MatchupData[]> {
    try {
      const response = await fetch(`https://api.sleeper.app/v1/league/${sleeperLeagueId}/matchups/${week}`);
      
      if (!response.ok) {
        return [];
      }

      const matchups = await response.json();
      
      if (!matchups || !Array.isArray(matchups)) {
        return [];
      }

      // Group matchups by matchup_id
      const matchupGroups: { [key: string]: any[] } = {};
      
      matchups.forEach((matchup: any) => {
        const matchupId = matchup.matchup_id;
        if (!matchupGroups[matchupId]) {
          matchupGroups[matchupId] = [];
        }
        matchupGroups[matchupId].push(matchup);
      });

      // Convert to MatchupData format
      return Object.entries(matchupGroups).map(([matchupId, teams]) => ({
        week,
        matchupId: parseInt(matchupId),
        teams: teams.map(team => ({
          rosterId: team.roster_id,
          points: team.points || 0,
          projectedPoints: team.projected_points
        }))
      }));
    } catch (error) {
      console.error('Direct matchups API failed:', error);
      return [];
    }
  }

  async getLeagueStandings(sleeperLeagueId: string): Promise<StandingsData[]> {
    try {
      // Try direct API first, fallback to MCP
      let rosters, users;
      try {
        const leagueData = await this.sleeperAPI.getLeagueDetailsBatch(sleeperLeagueId);
        rosters = leagueData.rosters;
        users = leagueData.users;
      } catch (directAPIError) {
        console.warn('Direct API failed for standings, using MCP fallback:', directAPIError);
        // Fallback to MCP
        rosters = await this.callMCPTool('sleeper.getRosters', {
          leagueId: sleeperLeagueId
        });
        users = await this.callMCPTool('sleeper.getUsers', {
          leagueId: sleeperLeagueId
        });
      }

      if (!rosters || !Array.isArray(rosters)) {
        return [];
      }

      // Create user lookup
      const userLookup: { [key: string]: any } = {};
      if (users && Array.isArray(users)) {
        users.forEach((user: any) => {
          userLookup[user.user_id] = user;
        });
      }

      // Convert rosters to standings format
      const standings: StandingsData[] = rosters.map((roster: any) => {
        const owner = userLookup[roster.owner_id];
        return {
          rosterId: roster.roster_id.toString(),
          teamName: owner?.metadata?.team_name || owner?.display_name || `Team ${roster.roster_id}`,
          ownerName: owner?.display_name || 'Unknown Owner',
          wins: roster.settings?.wins || 0,
          losses: roster.settings?.losses || 0,
          pointsFor: roster.settings?.fpts || 0,
          pointsAgainst: roster.settings?.fpts_against || 0,
          rank: 0, // Will be calculated after sorting
        };
      });

      // Sort by wins (desc), then by points for (desc)
      standings.sort((a, b) => {
        if (b.wins !== a.wins) {
          return b.wins - a.wins;
        }
        return b.pointsFor - a.pointsFor;
      });

      // Assign ranks
      standings.forEach((team, index) => {
        team.rank = index + 1;
      });

      return standings;
    } catch (error) {
      console.error('Error getting league standings:', error);
      throw new Error(`Failed to get league standings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserRoster(sleeperLeagueId: string, userId: string): Promise<RosterData | null> {
    try {
      // First, find the user's roster ID from the database
      const userLeague = await this.prisma.userLeague.findFirst({
        where: {
          userId: userId,
          league: {
            sleeperLeagueId: sleeperLeagueId
          }
        },
        include: {
          league: true
        }
      });

      // If no UserLeague record exists, try to find the user by their Sleeper user ID
      if (!userLeague || !userLeague.sleeperRosterId) {
        console.log(`No UserLeague record for user ${userId}, attempting fallback using Sleeper user ID`);
        
        // Get the user's Sleeper user ID from the database
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { sleeperUserId: true }
        });
        
        if (!user || !user.sleeperUserId) {
          throw new Error('User not found in this league and no Sleeper user ID available');
        }
        
        // Get all rosters and users for this league to find the matching roster
        let leagueData;
        try {
          leagueData = await this.sleeperAPI.getLeagueDetailsBatch(sleeperLeagueId);
        } catch (directAPIError) {
          console.warn('Direct API failed for user roster fallback, using MCP fallback:', directAPIError);
          const [rosters, users] = await Promise.all([
            this.callMCPTool('sleeper.getRosters', { leagueId: sleeperLeagueId }),
            this.callMCPTool('sleeper.getUsers', { leagueId: sleeperLeagueId })
          ]);
          leagueData = { rosters, users };
        }
        
        // Find the roster that belongs to this user
        const userRoster = leagueData.rosters?.find((roster: any) => 
          roster.owner_id === user.sleeperUserId
        );
        
        if (!userRoster) {
          throw new Error('User roster not found in this league');
        }
        
        return {
          rosterId: userRoster.roster_id,
          ownerId: userRoster.owner_id,
          players: userRoster.players || [],
          starters: userRoster.starters || [],
          settings: userRoster.settings || {},
        };
      }

      // Get all rosters using direct API first, fallback to MCP
      let rosters;
      try {
        const leagueData = await this.sleeperAPI.getLeagueDetailsBatch(sleeperLeagueId);
        rosters = leagueData.rosters;
      } catch (directAPIError) {
        console.warn('Direct API failed for user roster, using MCP fallback:', directAPIError);
        rosters = await this.callMCPTool('sleeper.getRosters', {
          leagueId: sleeperLeagueId
        });
      }

      if (!rosters || !Array.isArray(rosters)) {
        return null;
      }

      // Find the user's specific roster
      const userRoster = rosters.find((roster: any) => 
        roster.roster_id === parseInt(userLeague.sleeperRosterId)
      );

      if (!userRoster) {
        return null;
      }

      return {
        rosterId: userRoster.roster_id,
        ownerId: userRoster.owner_id,
        players: userRoster.players || [],
        starters: userRoster.starters || [],
        settings: userRoster.settings || {},
      };
    } catch (error) {
      console.error('Error getting user roster:', error);
      throw new Error(`Failed to get user roster: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllPlayers(): Promise<{ [playerId: string]: any }> {
    try {
      console.log('Getting all NFL players');
      
      // Try direct API first
      try {
        console.log('Using direct Sleeper API service for all players');
        const players = await this.sleeperAPI.getAllPlayers();
        return players || {};
      } catch (directAPIError) {
        console.error('Direct Sleeper API service failed for all players:', directAPIError);
        console.log('Falling back to MCP for all players');
        
        // Fallback to MCP
        const players = await this.callMCPTool('sleeper.getAllPlayers', {});
        return players || {};
      }
    } catch (error) {
      console.error('Error getting all players:', error);
      throw new Error(`Failed to get players: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserRosterPlayers(sleeperLeagueId: string, userId: string): Promise<any[]> {
    try {
      console.log(`Getting roster players for user ${userId} in league ${sleeperLeagueId}`);
      
      // Get user's roster
      const roster = await this.getUserRoster(sleeperLeagueId, userId);
      if (!roster || !roster.players.length) {
        console.log('No roster or players found for user');
        return [];
      }

      // Get all NFL players using direct API first
      let allPlayers;
      try {
        allPlayers = await this.sleeperAPI.getAllPlayers();
      } catch (directAPIError) {
        console.warn('Direct API failed for players, trying MCP:', directAPIError);
        allPlayers = await this.callMCPTool('sleeper.getAllPlayers', {});
      }

      if (!allPlayers || typeof allPlayers !== 'object') {
        console.log('No players data available');
        return [];
      }

      // Filter to only user's players and format for frontend
      const userPlayers = roster.players
        .map(playerId => {
          const player = (allPlayers as any)[playerId];
          if (!player) return null;

          return {
            id: playerId,
            name: `${player.first_name || ''} ${player.last_name || ''}`.trim() || player.full_name || 'Unknown Player',
            position: player.position || 'N/A',
            team: player.team || 'FA',
            isStarter: roster.starters.includes(playerId)
          };
        })
        .filter(player => player !== null);

      console.log(`Found ${userPlayers.length} players for user roster`);
      return userPlayers;
    } catch (error) {
      console.error('Error getting user roster players:', error);
      return [];
    }
  }
}

export const leagueService = new LeagueService();