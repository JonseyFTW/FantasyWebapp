'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Scale, 
  TrendingUp, 
  Zap,
  Users,
  Trophy,
  BarChart3,
  Calendar,
  Star,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { StartSitAnalyzer } from '@/components/ai/start-sit-analyzer';
import { TradeAnalyzer } from '@/components/ai/trade-analyzer';
import { LineupOptimizer } from '@/components/ai/lineup-optimizer';
import Link from 'next/link';

// Types for real league data
interface League {
  id: string;
  name: string;
  season: number;
  totalRosters: number;
  status: string;
  sleeperLeagueId: string;
}

interface UserLeague {
  league: League;
  role: string;
  sleeperRosterId: string;
}

interface UserData {
  leagues: UserLeague[];
  recentActivity: Array<{
    type: string;
    description: string;
    league: string;
    timestamp: string;
  }>;
}

const mockPlayerData = {
  availablePlayers: [
    { id: 'player_1', name: 'Josh Allen', position: 'QB', team: 'BUF' },
    { id: 'player_2', name: 'Christian McCaffrey', position: 'RB', team: 'SF' },
    { id: 'player_3', name: 'Tyreek Hill', position: 'WR', team: 'MIA' },
    { id: 'player_4', name: 'Travis Kelce', position: 'TE', team: 'KC' },
    { id: 'player_5', name: 'Justin Jefferson', position: 'WR', team: 'MIN' },
    { id: 'player_6', name: 'Saquon Barkley', position: 'RB', team: 'NYG' },
    { id: 'player_7', name: 'Stefon Diggs', position: 'WR', team: 'BUF' },
    { id: 'player_8', name: 'Josh Jacobs', position: 'RB', team: 'LV' },
  ],
  rosterSlots: ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'DST', 'K'],
};

const mockTeamData = [
  {
    userId: 'user_1',
    teamName: 'The Champions',
    players: mockPlayerData.availablePlayers.slice(0, 4),
  },
  {
    userId: 'user_2', 
    teamName: 'Fantasy Gurus',
    players: mockPlayerData.availablePlayers.slice(4, 8),
  },
];

export default function DashboardPage() {
  const { user, requireAuth } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [currentWeek, setCurrentWeek] = useState(14);
  const [selectedLeagueRosterPlayers, setSelectedLeagueRosterPlayers] = useState<any[]>([]);
  const [fetchingRoster, setFetchingRoster] = useState(false);

  const fetchUserLeagues = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${user.email}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }
      
      const userData = await response.json();
      
      if (userData.success && userData.data.user) {
        const userWithLeagues = userData.data.user;
        
        // Transform the data to match our interface
        const transformedData: UserData = {
          leagues: userWithLeagues.userLeagues || [],
          recentActivity: [
            { type: 'sync', description: 'Synced leagues from Sleeper', league: 'All Leagues', timestamp: 'Recently' }
          ]
        };
        
        setUserData(transformedData);
        
        // Set first league as selected if available
        if (transformedData.leagues.length > 0) {
          setSelectedLeague(transformedData.leagues[0].league.id);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching user leagues:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leagues');
    } finally {
      setLoading(false);
    }
  };

  const fetchRosterPlayers = async (leagueId: string) => {
    if (!user?.id || !leagueId) return;
    
    try {
      setFetchingRoster(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/leagues/${leagueId}/players/${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedLeagueRosterPlayers(data.data || []);
        } else {
          console.error('Failed to fetch roster players:', data.error);
          setSelectedLeagueRosterPlayers([]);
        }
      } else {
        console.error('Failed to fetch roster players:', response.status);
        setSelectedLeagueRosterPlayers([]);
      }
    } catch (err) {
      console.error('Error fetching roster players:', err);
      setSelectedLeagueRosterPlayers([]);
    } finally {
      setFetchingRoster(false);
    }
  };

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  useEffect(() => {
    if (user) {
      fetchUserLeagues();
    }
  }, [user]);

  useEffect(() => {
    if (selectedLeague && user) {
      fetchRosterPlayers(selectedLeague);
    }
  }, [selectedLeague, user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your leagues...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchUserLeagues} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <div className="mt-4">
            <Link href="/settings">
              <Button variant="link">Go to Settings to sync Sleeper data</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!userData || userData.leagues.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Users className="h-8 w-8 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No leagues found</h2>
          <p className="text-gray-600 mb-4">You haven't synced any Sleeper leagues yet.</p>
          <Link href="/settings">
            <Button>
              <Star className="h-4 w-4 mr-2" />
              Sync Your Sleeper Leagues
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedLeagueData = userData.leagues.find(ul => ul.league.id === selectedLeague);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.displayName || user.email}!
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your fantasy teams with AI-powered insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">Week {currentWeek}</Badge>
          <Badge variant="secondary">Playoffs</Badge>
        </div>
      </div>

      {/* League Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userData.leagues.map((userLeague) => (
          <Card 
            key={userLeague.league.id} 
            className={`card-hover cursor-pointer transition-all duration-200 ${
              userLeague.league.id === selectedLeague 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:shadow-md'
            }`}
            onClick={() => setSelectedLeague(userLeague.league.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{userLeague.league.name}</CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge variant={userLeague.league.id === selectedLeague ? 'default' : 'outline'}>
                    {userLeague.league.season}
                  </Badge>
                  {userLeague.league.id === selectedLeague && (
                    <Badge variant="secondary" className="text-xs">
                      Selected
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription>
                {userLeague.league.totalRosters} teams • {userLeague.league.status}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <div className="font-medium text-gray-900">{userLeague.role}</div>
                  <div className="text-gray-600">Role</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{userLeague.league.season}</div>
                  <div className="text-gray-600">Season</div>
                </div>
              </div>
              <Link href={`/league/${userLeague.league.id}`} onClick={(e) => e.stopPropagation()}>
                <Button size="sm" className="w-full">
                  View Details
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Tools */}
      <Card>
        <CardHeader>
          <CardTitle>AI Fantasy Assistant</CardTitle>
          <CardDescription>
            Use advanced AI tools to optimize your lineup and make better decisions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="start-sit" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="start-sit" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Start/Sit
              </TabsTrigger>
              <TabsTrigger value="trade-analyzer" className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Trade Analyzer
              </TabsTrigger>
              <TabsTrigger value="lineup-optimizer" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Lineup Optimizer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="start-sit" className="mt-6">
              {fetchingRoster ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading your roster...</span>
                </div>
              ) : selectedLeagueRosterPlayers.length > 0 ? (
                <StartSitAnalyzer
                  userId={user.id}
                  leagueId={selectedLeague}
                  week={currentWeek}
                  availablePlayers={selectedLeagueRosterPlayers}
                  rosterSlots={mockPlayerData.rosterSlots}
                />
              ) : selectedLeague ? (
                <div className="text-center py-8">
                  <Users className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No roster found</h3>
                  <p className="text-gray-600">
                    We couldn't load your roster for this league. Make sure you have players in your league roster.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a league</h3>
                  <p className="text-gray-600">
                    Click on a league above to use the Start/Sit analyzer with your roster players.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="trade-analyzer" className="mt-6">
              <TradeAnalyzer
                leagueId={selectedLeague}
                userId={user.id}
                availableTeams={mockTeamData}
              />
            </TabsContent>

            <TabsContent value="lineup-optimizer" className="mt-6">
              <LineupOptimizer
                userId={user.id}
                leagueId={selectedLeague}
                week={currentWeek}
                availablePlayers={mockPlayerData.availablePlayers}
                rosterSlots={mockPlayerData.rosterSlots}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Stats & Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>League Info</CardTitle>
            <CardDescription>
              {selectedLeagueData?.league.name} details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedLeagueData?.league.totalRosters || 0}
                </div>
                <div className="text-sm text-blue-600">Total Teams</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {selectedLeagueData?.league.season || 2024}
                </div>
                <div className="text-sm text-green-600">Season</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {selectedLeagueData?.role || 'Member'}
                </div>
                <div className="text-sm text-purple-600">Your Role</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {selectedLeagueData?.league.status || 'Active'}
                </div>
                <div className="text-sm text-orange-600">Status</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest fantasy moves
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userData.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {activity.type === 'trade' && <Scale className="h-5 w-5 text-blue-600" />}
                    {activity.type === 'waiver' && <TrendingUp className="h-5 w-5 text-green-600" />}
                    {activity.type === 'lineup' && <Zap className="h-5 w-5 text-purple-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-600">
                      {activity.league} • {activity.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and league management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <BarChart3 className="h-6 w-6 mb-2" />
              <span className="text-sm">View Analytics</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Calendar className="h-6 w-6 mb-2" />
              <span className="text-sm">Schedule</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Users className="h-6 w-6 mb-2" />
              <span className="text-sm">League Chat</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Trophy className="h-6 w-6 mb-2" />
              <span className="text-sm">Standings</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Playoff Alert */}
      {currentWeek >= 14 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <h4 className="font-medium text-orange-800">Playoff Time!</h4>
                <p className="text-sm text-orange-700">
                  The fantasy playoffs have begun. Every decision matters now - use AI tools to optimize your lineup and make championship-winning moves.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}