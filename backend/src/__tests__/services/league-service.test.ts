import { LeagueService } from '../../services/league-service';
import { SleeperAPIService } from '../../services/sleeper-api-service';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../services/sleeper-api-service');

// Mock fetch for MCP calls
global.fetch = jest.fn();

describe('LeagueService', () => {
  let leagueService: LeagueService;
  let mockSleeperAPI: jest.Mocked<SleeperAPIService>;
  let mockPrisma: jest.Mocked<PrismaClient>;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Create mock instances
    mockSleeperAPI = {
      getLeagueDetailsBatch: jest.fn(),
      getNFLState: jest.fn(),
      getLeagueMatchups: jest.fn(),
      getAllPlayers: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    mockPrisma = {
      userLeague: {
        findFirst: jest.fn(),
      },
      league: {
        findUnique: jest.fn(),
      },
    } as any;

    // Create service with mocked dependencies
    leagueService = new LeagueService(mockSleeperAPI);
    
    // Clear all mocks
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('getLeagueDetails', () => {
    const mockLeagueId = '123456789';
    const mockLeagueData = {
      league: {
        league_id: mockLeagueId,
        name: 'Test League',
        season: '2024',
        status: 'in_season',
        sport: 'nfl',
        settings: {},
        scoring_settings: {},
        roster_positions: ['QB', 'RB', 'WR'],
        total_rosters: 12,
      },
      rosters: [
        {
          roster_id: 1,
          owner_id: 'user1',
          user_id: 'user1',
          league_id: mockLeagueId,
          players: ['player1', 'player2'],
          starters: ['player1'],
          reserve: [],
          taxi: [],
          settings: { 
            wins: 5, 
            losses: 2, 
            ties: 0,
            fpts: 1234.5, 
            fpts_against: 1000.0,
            fpts_decimal: 0.5,
            fpts_against_decimal: 0.0
          },
          metadata: {},
        },
      ],
      users: [
        {
          user_id: 'user1',
          username: 'testuser',
          display_name: 'Test User',
          avatar: 'avatar123',
          metadata: { team_name: 'Test Team' },
        },
      ],
    };

    const mockNFLState = { week: 14, season: '2024', season_type: 'regular' };

    it('should use direct API first and succeed', async () => {
      mockSleeperAPI.getLeagueDetailsBatch.mockResolvedValue(mockLeagueData);
      mockSleeperAPI.getNFLState.mockResolvedValue(mockNFLState);

      const result = await leagueService.getLeagueDetails(mockLeagueId);

      expect(mockSleeperAPI.getLeagueDetailsBatch).toHaveBeenCalledWith(mockLeagueId);
      expect(mockSleeperAPI.getNFLState).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled(); // MCP should not be called
      expect(result).toEqual({
        league: mockLeagueData.league,
        rosters: mockLeagueData.rosters,
        users: mockLeagueData.users,
        currentWeek: 14,
      });
    });

    it('should fallback to MCP when direct API fails', async () => {
      // Direct API fails
      mockSleeperAPI.getLeagueDetailsBatch.mockRejectedValue(new Error('Direct API failed'));

      // MCP succeeds
      const mockMCPResponse = { result: mockLeagueData.league };
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMCPResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: mockLeagueData.rosters }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: mockLeagueData.users }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: mockNFLState }),
        } as Response);

      const result = await leagueService.getLeagueDetails(mockLeagueId);

      expect(mockSleeperAPI.getLeagueDetailsBatch).toHaveBeenCalledWith(mockLeagueId);
      expect(mockFetch).toHaveBeenCalledTimes(4); // MCP fallback calls
      expect(result.league).toEqual(mockLeagueData.league);
      expect(result.currentWeek).toBe(14);
    });

    it('should throw error when both direct API and MCP fail', async () => {
      // Direct API fails
      mockSleeperAPI.getLeagueDetailsBatch.mockRejectedValue(new Error('Direct API failed'));

      // MCP also fails
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(leagueService.getLeagueDetails(mockLeagueId)).rejects.toThrow(
        'Failed to get league details'
      );

      expect(mockSleeperAPI.getLeagueDetailsBatch).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('getLeagueStandings', () => {
    const mockLeagueId = '123456789';
    const mockRosters = [
      {
        roster_id: 1,
        owner_id: 'user1',
        user_id: 'user1',
        league_id: mockLeagueId,
        players: [],
        starters: [],
        reserve: [],
        taxi: [],
        settings: { 
          wins: 8, 
          losses: 4, 
          ties: 0,
          fpts: 1500.5, 
          fpts_against: 1200.0,
          fpts_decimal: 0.5,
          fpts_against_decimal: 0.0
        },
        metadata: {},
      },
      {
        roster_id: 2,
        owner_id: 'user2',
        user_id: 'user2',
        league_id: mockLeagueId,
        players: [],
        starters: [],
        reserve: [],
        taxi: [],
        settings: { 
          wins: 6, 
          losses: 6, 
          ties: 0,
          fpts: 1400.0, 
          fpts_against: 1350.0,
          fpts_decimal: 0.0,
          fpts_against_decimal: 0.0
        },
        metadata: {},
      },
    ];

    const mockUsers = [
      {
        user_id: 'user1',
        username: 'topteam',
        display_name: 'Top Team',
        avatar: 'avatar1',
        metadata: { team_name: 'Winners' },
      },
      {
        user_id: 'user2',
        username: 'middleteam',
        display_name: 'Middle Team',
        avatar: 'avatar2',
        metadata: { team_name: 'Average' },
      },
    ];

    it('should calculate standings correctly using direct API', async () => {
      mockSleeperAPI.getLeagueDetailsBatch.mockResolvedValue({
        league: {
          league_id: mockLeagueId,
          name: 'Test League',
          season: '2024',
          status: 'in_season',
          sport: 'nfl',
          settings: {},
          scoring_settings: {},
          roster_positions: ['QB'],
          total_rosters: 2,
        },
        rosters: mockRosters,
        users: mockUsers,
      });

      const result = await leagueService.getLeagueStandings(mockLeagueId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        rosterId: '1',
        teamName: 'Winners',
        ownerName: 'Top Team',
        wins: 8,
        losses: 4,
        pointsFor: 1500.5,
        pointsAgainst: 1200.0,
        rank: 1,
      });
      expect(result[1]).toEqual({
        rosterId: '2',
        teamName: 'Average',
        ownerName: 'Middle Team',
        wins: 6,
        losses: 6,
        pointsFor: 1400.0,
        pointsAgainst: 1350.0,
        rank: 2,
      });
    });

    it('should handle missing user metadata gracefully', async () => {
      const rostersWithoutMetadata = [mockRosters[0]];
      const usersWithoutMetadata = [
        {
          user_id: 'user1',
          username: 'testuser',
          display_name: 'Test User',
          avatar: 'avatar123',
          metadata: {}, // No team_name
        },
      ];

      mockSleeperAPI.getLeagueDetailsBatch.mockResolvedValue({
        league: {
          league_id: mockLeagueId,
          name: 'Test League',
          season: '2024',
          status: 'in_season',
          sport: 'nfl',
          settings: {},
          scoring_settings: {},
          roster_positions: ['QB'],
          total_rosters: 1,
        },
        rosters: rostersWithoutMetadata,
        users: usersWithoutMetadata,
      });

      const result = await leagueService.getLeagueStandings(mockLeagueId);

      expect(result[0].teamName).toBe('Test User'); // Falls back to display_name
      expect(result[0].ownerName).toBe('Test User');
    });
  });

  describe('getUserRoster', () => {
    const mockLeagueId = '123456789';
    const mockUserId = 'user123';

    beforeEach(() => {
      // Mock Prisma calls
      (mockPrisma.userLeague.findFirst as jest.Mock).mockResolvedValue({
        userId: mockUserId,
        sleeperRosterId: '1',
        league: { sleeperLeagueId: mockLeagueId },
      });
    });

    it('should get user roster successfully using direct API', async () => {
      const mockRosters = [
        {
          roster_id: 1,
          owner_id: 'sleeper_user_1',
          user_id: 'sleeper_user_1',
          league_id: mockLeagueId,
          players: ['player1', 'player2', 'player3'],
          starters: ['player1', 'player2'],
          reserve: [],
          taxi: [],
          settings: { 
            wins: 5, 
            losses: 2,
            ties: 0,
            fpts: 1000.0,
            fpts_against: 900.0,
            fpts_decimal: 0.0,
            fpts_against_decimal: 0.0
          },
          metadata: {},
        },
        {
          roster_id: 2,
          owner_id: 'sleeper_user_2',
          user_id: 'sleeper_user_2',
          league_id: mockLeagueId,
          players: ['player4', 'player5'],
          starters: ['player4'],
          reserve: [],
          taxi: [],
          settings: { 
            wins: 3, 
            losses: 4,
            ties: 0,
            fpts: 800.0,
            fpts_against: 850.0,
            fpts_decimal: 0.0,
            fpts_against_decimal: 0.0
          },
          metadata: {},
        },
      ];

      mockSleeperAPI.getLeagueDetailsBatch.mockResolvedValue({
        league: {
          league_id: mockLeagueId,
          name: 'Test League',
          season: '2024',
          status: 'in_season',
          sport: 'nfl',
          settings: {},
          scoring_settings: {},
          roster_positions: ['QB'],
          total_rosters: 2,
        },
        rosters: mockRosters,
        users: [],
      });

      const result = await leagueService.getUserRoster(mockLeagueId, mockUserId);

      expect(result).toEqual({
        rosterId: 1,
        ownerId: 'sleeper_user_1',
        players: ['player1', 'player2', 'player3'],
        starters: ['player1', 'player2'],
        settings: { 
          wins: 5, 
          losses: 2,
          ties: 0,
          fpts: 1000.0,
          fpts_against: 900.0,
          fpts_decimal: 0.0,
          fpts_against_decimal: 0.0
        },
      });
    });

    it('should return null when user not found in league', async () => {
      (mockPrisma.userLeague.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(leagueService.getUserRoster(mockLeagueId, mockUserId)).rejects.toThrow(
        'User not found in this league'
      );
    });

    it('should return null when user roster not found in rosters data', async () => {
      const mockRosters = [
        {
          roster_id: 999, // Different roster ID
          owner_id: 'other_user',
          user_id: 'other_user',
          league_id: mockLeagueId,
          players: [],
          starters: [],
          reserve: [],
          taxi: [],
          settings: {
            wins: 0,
            losses: 0,
            ties: 0,
            fpts: 0,
            fpts_against: 0,
            fpts_decimal: 0,
            fpts_against_decimal: 0
          },
          metadata: {},
        },
      ];

      mockSleeperAPI.getLeagueDetailsBatch.mockResolvedValue({
        league: {
          league_id: mockLeagueId,
          name: 'Test League',
          season: '2024',
          status: 'in_season',
          sport: 'nfl',
          settings: {},
          scoring_settings: {},
          roster_positions: ['QB'],
          total_rosters: 1,
        },
        rosters: mockRosters,
        users: [],
      });

      const result = await leagueService.getUserRoster(mockLeagueId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('getUserRosterPlayers', () => {
    const mockLeagueId = '123456789';
    const mockUserId = 'user123';

    const mockRoster = {
      rosterId: '1',
      ownerId: 'sleeper_user_1',
      players: ['player1', 'player2', 'player3'],
      starters: ['player1', 'player2'],
      settings: {},
    };

    const mockPlayers = {
      player1: {
        player_id: 'player1',
        first_name: 'Josh',
        last_name: 'Allen',
        full_name: 'Josh Allen',
        position: 'QB',
        team: 'BUF',
        age: 27,
        years_exp: 6,
        status: 'Active',
        sport: 'nfl',
        fantasy_positions: ['QB'],
      },
      player2: {
        player_id: 'player2',
        first_name: 'Christian',
        last_name: 'McCaffrey',
        full_name: 'Christian McCaffrey',
        position: 'RB',
        team: 'SF',
        age: 27,
        years_exp: 7,
        status: 'Active',
        sport: 'nfl',
        fantasy_positions: ['RB'],
      },
      player3: {
        player_id: 'player3',
        first_name: 'Tyreek',
        last_name: 'Hill',
        full_name: 'Tyreek Hill',
        position: 'WR',
        team: 'MIA',
        age: 29,
        years_exp: 8,
        status: 'Active',
        sport: 'nfl',
        fantasy_positions: ['WR'],
      },
    };

    beforeEach(() => {
      // Mock getUserRoster
      jest.spyOn(leagueService, 'getUserRoster').mockResolvedValue(mockRoster);
    });

    it('should get formatted roster players using direct API', async () => {
      mockSleeperAPI.getAllPlayers.mockResolvedValue(mockPlayers);

      const result = await leagueService.getUserRosterPlayers(mockLeagueId, mockUserId);

      expect(mockSleeperAPI.getAllPlayers).toHaveBeenCalled();
      expect(result).toEqual([
        {
          id: 'player1',
          name: 'Josh Allen',
          position: 'QB',
          team: 'BUF',
          isStarter: true,
        },
        {
          id: 'player2',
          name: 'Christian McCaffrey',
          position: 'RB',
          team: 'SF',
          isStarter: true,
        },
        {
          id: 'player3',
          name: 'Tyreek Hill',
          position: 'WR',
          team: 'MIA',
          isStarter: false,
        },
      ]);
    });

    it('should fallback to MCP when direct API fails for players', async () => {
      mockSleeperAPI.getAllPlayers.mockRejectedValue(new Error('Direct API failed'));

      // Mock MCP success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: mockPlayers }),
      } as Response);

      const result = await leagueService.getUserRosterPlayers(mockLeagueId, mockUserId);

      expect(mockSleeperAPI.getAllPlayers).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Josh Allen');
    });

    it('should return empty array when no roster found', async () => {
      jest.spyOn(leagueService, 'getUserRoster').mockResolvedValue(null);

      const result = await leagueService.getUserRosterPlayers(mockLeagueId, mockUserId);

      expect(result).toEqual([]);
    });

    it('should return empty array when no players found', async () => {
      mockSleeperAPI.getAllPlayers.mockResolvedValue({});

      const result = await leagueService.getUserRosterPlayers(mockLeagueId, mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle missing player data gracefully', async () => {
      const incompletePlayersData = {
        player1: mockPlayers.player1,
        // player2 and player3 missing
      };

      mockSleeperAPI.getAllPlayers.mockResolvedValue(incompletePlayersData as any);

      const result = await leagueService.getUserRosterPlayers(mockLeagueId, mockUserId);

      expect(result).toHaveLength(1); // Only player1 should be returned
      expect(result[0].id).toBe('player1');
    });
  });

  describe('error handling', () => {
    it('should handle Prisma database errors gracefully', async () => {
      (mockPrisma.userLeague.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database connection error')
      );

      await expect(leagueService.getUserRoster('123', 'user1')).rejects.toThrow(
        'Failed to get user roster'
      );
    });

    it('should log errors appropriately', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockSleeperAPI.getLeagueDetailsBatch.mockRejectedValue(new Error('API Error'));
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(leagueService.getLeagueDetails('123')).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});