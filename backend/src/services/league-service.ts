import { PrismaClient } from '@prisma/client';

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

  constructor() {
    this.mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';
  }

  private async callMCPTool(toolName: string, params: any): Promise<any> {
    try {
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
        throw new Error(`MCP call failed: ${response.status}`);
      }

      const result = await response.json() as any;
      
      if (result.error) {
        throw new Error(`MCP error: ${result.error.message}`);
      }

      return result.result;
    } catch (error) {
      console.error(`MCP tool call failed for ${toolName}:`, error);
      throw new Error(`Failed to call ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getLeagueDetails(sleeperLeagueId: string): Promise<LeagueDetails> {
    try {
      // Get league info
      const league = await this.callMCPTool('get_league', {
        league_id: sleeperLeagueId
      });

      // Get all rosters
      const rosters = await this.callMCPTool('get_league_rosters', {
        league_id: sleeperLeagueId
      });

      // Get all users
      const users = await this.callMCPTool('get_league_users', {
        league_id: sleeperLeagueId
      });

      // Get current NFL state for week info
      const nflState = await this.callMCPTool('get_nfl_state', {});

      return {
        league,
        rosters: rosters || [],
        users: users || [],
        currentWeek: nflState?.week || 14,
      };
    } catch (error) {
      console.error('Error getting league details:', error);
      throw new Error(`Failed to get league details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getLeagueMatchups(sleeperLeagueId: string, week: number): Promise<MatchupData[]> {
    try {
      const matchups = await this.callMCPTool('get_league_matchups', {
        league_id: sleeperLeagueId,
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
    } catch (error) {
      console.error('Error getting league matchups:', error);
      throw new Error(`Failed to get league matchups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getLeagueStandings(sleeperLeagueId: string): Promise<StandingsData[]> {
    try {
      // Get rosters with win/loss records
      const rosters = await this.callMCPTool('get_league_rosters', {
        league_id: sleeperLeagueId
      });

      // Get users for team names
      const users = await this.callMCPTool('get_league_users', {
        league_id: sleeperLeagueId
      });

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
          rosterId: roster.roster_id,
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
      const userLeague = await prisma.userLeague.findFirst({
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

      if (!userLeague || !userLeague.sleeperRosterId) {
        throw new Error('User not found in this league');
      }

      // Get all rosters
      const rosters = await this.callMCPTool('get_league_rosters', {
        league_id: sleeperLeagueId
      });

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

  async getAllPlayers(): Promise<any[]> {
    try {
      const players = await this.callMCPTool('get_players_nfl', {});
      return players || [];
    } catch (error) {
      console.error('Error getting all players:', error);
      throw new Error(`Failed to get players: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserRosterPlayers(sleeperLeagueId: string, userId: string): Promise<any[]> {
    try {
      // Get user's roster
      const roster = await this.getUserRoster(sleeperLeagueId, userId);
      if (!roster || !roster.players.length) {
        return [];
      }

      // Get all NFL players
      const allPlayers = await this.getAllPlayers();
      if (!allPlayers || typeof allPlayers !== 'object') {
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

      return userPlayers;
    } catch (error) {
      console.error('Error getting user roster players:', error);
      return [];
    }
  }
}

export const leagueService = new LeagueService();