// Use global fetch (available in Node.js 18+) or fall back to require
declare const global: any;
const fetch = global.fetch || require('node-fetch');

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string;
  sport: string;
  settings: any;
  scoring_settings: any;
  roster_positions: string[];
  total_rosters: number;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  user_id: string;
  league_id: string;
  players: string[];
  starters: string[];
  reserve: string[];
  taxi: string[];
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_against: number;
    fpts_decimal: number;
    fpts_against_decimal: number;
  };
  metadata: any;
}

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
  metadata: {
    team_name?: string;
    [key: string]: any;
  };
}

export interface SleeperMatchup {
  roster_id: number;
  matchup_id: number;
  points: number;
  players: string[];
  starters: string[];
  players_points: { [playerId: string]: number };
  starters_points: { [playerId: string]: number };
  custom_points?: number;
}

export interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  team: string;
  position: string;
  age: number;
  years_exp: number;
  status: string;
  sport: string;
  fantasy_positions: string[];
  injury_status?: string;
  injury_body_part?: string;
  injury_start_date?: string;
  news_updated?: number;
}

export class SleeperAPIService {
  private readonly baseUrl = 'https://api.sleeper.app/v1';
  private readonly requestTimeout = 10000; // 10 seconds
  private readonly maxRetries = 3;

  constructor() {
    console.log('SleeperAPIService initialized');
  }

  private async makeRequest<T>(endpoint: string, retryCount = 0): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      console.log(`Making Sleeper API request: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FantasyFootballApp/1.0',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Sleeper API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as T;
      console.log(`Sleeper API request successful: ${url}`);
      return data;
      
    } catch (error) {
      console.error(`Sleeper API request failed: ${url}`, error);
      
      // Retry logic for temporary failures
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        console.log(`Retrying request (${retryCount + 1}/${this.maxRetries}): ${url}`);
        await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        return this.makeRequest<T>(endpoint, retryCount + 1);
      }
      
      throw new Error(`Sleeper API request failed after ${retryCount + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private shouldRetry(error: any): boolean {
    // Retry on network errors, timeouts, or 5xx server errors
    if (error.name === 'AbortError') return true;
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) return true;
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // League endpoints
  async getLeague(leagueId: string): Promise<SleeperLeague> {
    return this.makeRequest<SleeperLeague>(`/league/${leagueId}`);
  }

  async getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
    return this.makeRequest<SleeperRoster[]>(`/league/${leagueId}/rosters`);
  }

  async getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
    return this.makeRequest<SleeperUser[]>(`/league/${leagueId}/users`);
  }

  async getLeagueMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
    return this.makeRequest<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`);
  }

  // User endpoints
  async getUserByUsername(username: string): Promise<SleeperUser> {
    return this.makeRequest<SleeperUser>(`/user/${username}`);
  }

  async getUserLeagues(userId: string, sport: string, season: string): Promise<SleeperLeague[]> {
    return this.makeRequest<SleeperLeague[]>(`/user/${userId}/leagues/${sport}/${season}`);
  }

  // Player endpoints
  async getAllPlayers(): Promise<{ [playerId: string]: SleeperPlayer }> {
    return this.makeRequest<{ [playerId: string]: SleeperPlayer }>('/players/nfl');
  }

  async getPlayerStats(sport: string, season: string, seasonType = 'regular', week?: number): Promise<any> {
    let endpoint = `/stats/${sport}/${season}`;
    if (seasonType) endpoint += `/${seasonType}`;
    if (week) endpoint += `/${week}`;
    
    return this.makeRequest<any>(endpoint);
  }

  // NFL state
  async getNFLState(): Promise<{ week: number; season: string; season_type: string; [key: string]: any }> {
    return this.makeRequest<{ week: number; season: string; season_type: string; [key: string]: any }>('/state/nfl');
  }

  // Utility methods
  async healthCheck(): Promise<boolean> {
    try {
      await this.getNFLState();
      return true;
    } catch (error) {
      console.error('Sleeper API health check failed:', error);
      return false;
    }
  }

  // Batch operations for efficiency
  async getLeagueDetailsBatch(leagueId: string): Promise<{
    league: SleeperLeague;
    rosters: SleeperRoster[];
    users: SleeperUser[];
  }> {
    try {
      console.log(`Fetching league details batch for: ${leagueId}`);
      
      const [league, rosters, users] = await Promise.all([
        this.getLeague(leagueId),
        this.getLeagueRosters(leagueId),
        this.getLeagueUsers(leagueId),
      ]);

      return { league, rosters, users };
    } catch (error) {
      console.error(`Failed to fetch league details batch for ${leagueId}:`, error);
      throw error;
    }
  }

  async getUserLeaguesBatch(userId: string, seasons: string[] = ['2024', '2025']): Promise<SleeperLeague[]> {
    try {
      console.log(`Fetching user leagues batch for: ${userId}`);
      
      const leaguePromises = seasons.map(season => 
        this.getUserLeagues(userId, 'nfl', season).catch(error => {
          console.warn(`Failed to fetch leagues for season ${season}:`, error);
          return [];
        })
      );

      const leagueArrays = await Promise.all(leaguePromises);
      const allLeagues = leagueArrays.flat();
      
      // Remove duplicates by league_id
      const uniqueLeagues = allLeagues.filter((league, index, self) => 
        index === self.findIndex(l => l.league_id === league.league_id)
      );

      return uniqueLeagues;
    } catch (error) {
      console.error(`Failed to fetch user leagues batch for ${userId}:`, error);
      throw error;
    }
  }

  async getAllPlayers(): Promise<Record<string, any>> {
    try {
      console.log('Fetching all NFL players from Sleeper API');
      const players = await this.makeRequest<Record<string, any>>('/players/nfl');
      return players || {};
    } catch (error) {
      console.error('Failed to fetch all players:', error);
      throw error;
    }
  }
}

export const sleeperAPIService = new SleeperAPIService();