import { SleeperAPIService } from '../../services/sleeper-api-service';

// Mock fetch globally
global.fetch = jest.fn();

describe('SleeperAPIService', () => {
  let sleeperAPI: SleeperAPIService;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    sleeperAPI = new SleeperAPIService();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLeague', () => {
    it('should successfully fetch league data', async () => {
      const mockLeague = {
        league_id: '123456789',
        name: 'Test League',
        season: '2024',
        status: 'in_season',
        sport: 'nfl',
        total_rosters: 12,
        settings: {},
        scoring_settings: {},
        roster_positions: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeague,
      } as Response);

      const result = await sleeperAPI.getLeague('123456789');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/league/123456789',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'FantasyFootballApp/1.0',
          }),
        })
      );
      expect(result).toEqual(mockLeague);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(sleeperAPI.getLeague('invalid-id')).rejects.toThrow(
        'Sleeper API request failed after 1 attempts: Sleeper API error: 404 Not Found'
      );
    });

    it('should retry on temporary failures', async () => {
      // First call fails with 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      // Second call succeeds
      const mockLeague = { league_id: '123', name: 'Test League' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeague,
      } as Response);

      const result = await sleeperAPI.getLeague('123');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockLeague);
    });
  });

  describe('getLeagueRosters', () => {
    it('should fetch league rosters successfully', async () => {
      const mockRosters = [
        {
          roster_id: 1,
          owner_id: 'user1',
          user_id: 'user1',
          league_id: '123',
          players: ['player1', 'player2'],
          starters: ['player1'],
          reserve: [],
          taxi: [],
          settings: { wins: 5, losses: 2, fpts: 1234.5 },
          metadata: {}
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRosters,
      } as Response);

      const result = await sleeperAPI.getLeagueRosters('123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/league/123/rosters',
        expect.any(Object)
      );
      expect(result).toEqual(mockRosters);
    });
  });

  describe('getLeagueUsers', () => {
    it('should fetch league users successfully', async () => {
      const mockUsers = [
        {
          user_id: 'user1',
          username: 'testuser',
          display_name: 'Test User',
          avatar: 'avatar_id',
          metadata: { team_name: 'Test Team' }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers,
      } as Response);

      const result = await sleeperAPI.getLeagueUsers('123');

      expect(result).toEqual(mockUsers);
    });
  });

  describe('getLeagueMatchups', () => {
    it('should fetch league matchups for a specific week', async () => {
      const mockMatchups = [
        {
          roster_id: 1,
          matchup_id: 1,
          points: 125.5,
          players: ['player1', 'player2'],
          starters: ['player1'],
          players_points: { player1: 15.5, player2: 8.2 },
          starters_points: { player1: 15.5 }
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMatchups,
      } as Response);

      const result = await sleeperAPI.getLeagueMatchups('123', 14);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/league/123/matchups/14',
        expect.any(Object)
      );
      expect(result).toEqual(mockMatchups);
    });
  });

  describe('getNFLState', () => {
    it('should fetch current NFL state', async () => {
      const mockState = {
        week: 14,
        season: '2024',
        season_type: 'regular',
        leg: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockState,
      } as Response);

      const result = await sleeperAPI.getNFLState();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/state/nfl',
        expect.any(Object)
      );
      expect(result).toEqual(mockState);
    });
  });

  describe('getAllPlayers', () => {
    it('should fetch all NFL players', async () => {
      const mockPlayers = {
        'player1': {
          player_id: 'player1',
          first_name: 'Josh',
          last_name: 'Allen',
          full_name: 'Josh Allen',
          team: 'BUF',
          position: 'QB',
          age: 27,
          years_exp: 6,
          status: 'Active',
          sport: 'nfl',
          fantasy_positions: ['QB']
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlayers,
      } as Response);

      const result = await sleeperAPI.getAllPlayers();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.sleeper.app/v1/players/nfl',
        expect.any(Object)
      );
      expect(result).toEqual(mockPlayers);
    });
  });

  describe('getLeagueDetailsBatch', () => {
    it('should fetch league, rosters, and users in parallel', async () => {
      const mockLeague = { league_id: '123', name: 'Test League' };
      const mockRosters = [{ roster_id: 1, owner_id: 'user1' }];
      const mockUsers = [{ user_id: 'user1', display_name: 'Test User' }];

      // Mock three successful API calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLeague,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRosters,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUsers,
        } as Response);

      const result = await sleeperAPI.getLeagueDetailsBatch('123');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        league: mockLeague,
        rosters: mockRosters,
        users: mockUsers,
      });
    });

    it('should handle partial failures in batch operation', async () => {
      const mockLeague = { league_id: '123', name: 'Test League' };

      // League call succeeds, rosters fails, users succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLeague,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as Response);

      await expect(sleeperAPI.getLeagueDetailsBatch('123')).rejects.toThrow();
    });
  });

  describe('getUserLeaguesBatch', () => {
    it('should fetch user leagues for multiple seasons', async () => {
      const mockLeagues2024 = [{ league_id: '123', season: '2024' }];
      const mockLeagues2025 = [{ league_id: '456', season: '2025' }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLeagues2024,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLeagues2025,
        } as Response);

      const result = await sleeperAPI.getUserLeaguesBatch('user123');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual([...mockLeagues2024, ...mockLeagues2025]);
    });

    it('should handle missing seasons gracefully', async () => {
      const mockLeagues2024 = [{ league_id: '123', season: '2024' }];

      // 2024 succeeds, 2025 fails
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLeagues2024,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response);

      const result = await sleeperAPI.getUserLeaguesBatch('user123');

      expect(result).toEqual(mockLeagues2024);
    });

    it('should remove duplicate leagues by league_id', async () => {
      const duplicateLeague = { league_id: '123', season: '2024' };
      const mockLeagues2024 = [duplicateLeague];
      const mockLeagues2025 = [duplicateLeague]; // Same league in both seasons

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLeagues2024,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockLeagues2025,
        } as Response);

      const result = await sleeperAPI.getUserLeaguesBatch('user123');

      expect(result).toHaveLength(1);
      expect(result[0].league_id).toBe('123');
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ week: 14, season: '2024' }),
      } as Response);

      const result = await sleeperAPI.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await sleeperAPI.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('error handling and retries', () => {
    it('should respect max retries limit', async () => {
      // Mock 4 failures (initial + 3 retries)
      mockFetch
        .mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response);

      await expect(sleeperAPI.getLeague('123')).rejects.toThrow(
        'Sleeper API request failed after 4 attempts'
      );

      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(sleeperAPI.getLeague('123')).rejects.toThrow(
        'Sleeper API request failed after 1 attempts: Network error'
      );
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(timeoutError);

      // Should retry on timeout
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ league_id: '123' }),
      } as Response);

      const result = await sleeperAPI.getLeague('123');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ league_id: '123' });
    });
  });
});