'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Users, 
  Trophy, 
  Calendar,
  BarChart3,
  Brain,
  Loader2,
  AlertCircle,
  RefreshCw,
  Star
} from 'lucide-react';
import Link from 'next/link';
import { StartSitAnalyzer } from '@/components/ai/start-sit-analyzer';

// Types
interface LeagueDetails {
  league: any;
  rosters: any[];
  users: any[];
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
  teams: Array<{
    rosterId: string;
    points: number;
    projectedPoints?: number;
  }>;
}

interface RosterData {
  rosterId: string;
  ownerId: string;
  players: string[];
  starters: string[];
  settings: any;
}

// Standings Component
function LeagueStandings({ standings }: { standings: StandingsData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          League Standings
        </CardTitle>
        <CardDescription>Current season standings and records</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {standings.map((team) => (
            <div 
              key={team.rosterId}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">#{team.rank}</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{team.teamName}</h4>
                  <p className="text-sm text-gray-600">{team.ownerName}</p>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="font-medium text-gray-900">{team.wins}-{team.losses}</div>
                  <div className="text-gray-600">Record</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">{team.pointsFor.toFixed(1)}</div>
                  <div className="text-gray-600">Points For</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">{team.pointsAgainst.toFixed(1)}</div>
                  <div className="text-gray-600">Points Against</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Schedule Component
function LeagueSchedule({ 
  matchups, 
  selectedWeek, 
  onWeekChange,
  users,
  rosters 
}: { 
  matchups: MatchupData[];
  selectedWeek: number;
  onWeekChange: (week: number) => void;
  users: any[];
  rosters: any[];
}) {
  // Create lookup tables
  const userLookup = users.reduce((acc, user) => {
    acc[user.user_id] = user;
    return acc;
  }, {});

  const rosterLookup = rosters.reduce((acc, roster) => {
    acc[roster.roster_id] = roster;
    return acc;
  }, {});

  const getTeamName = (rosterId: string) => {
    const roster = rosterLookup[rosterId];
    if (!roster) return `Team ${rosterId}`;
    
    const user = userLookup[roster.owner_id];
    return user?.metadata?.team_name || user?.display_name || `Team ${rosterId}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              League Schedule
            </CardTitle>
            <CardDescription>Matchups and results</CardDescription>
          </div>
          <Select value={selectedWeek.toString()} onValueChange={(value) => onWeekChange(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => (
                <SelectItem key={week} value={week.toString()}>
                  Week {week}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {matchups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No matchups found for Week {selectedWeek}
            </div>
          ) : (
            matchups.map((matchup) => (
              <div key={matchup.matchupId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  {matchup.teams.map((team, index) => (
                    <div key={team.rosterId} className="flex-1">
                      <div className="text-center">
                        <h4 className="font-medium text-gray-900">
                          {getTeamName(team.rosterId)}
                        </h4>
                        <div className="text-2xl font-bold text-blue-600 mt-1">
                          {team.points > 0 ? team.points.toFixed(1) : '-'}
                        </div>
                        {team.projectedPoints && (
                          <div className="text-sm text-gray-500">
                            Proj: {team.projectedPoints.toFixed(1)}
                          </div>
                        )}
                      </div>
                      {index === 0 && matchup.teams.length > 1 && (
                        <div className="flex items-center justify-center mx-4">
                          <span className="text-gray-400 font-medium">vs</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// User Roster Component
function UserRoster({ roster, users, allPlayers }: { roster: RosterData | null; users: any[]; allPlayers: any }) {
  if (!roster) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Team Roster
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Unable to load your roster
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPlayerName = (playerId: string) => {
    if (!allPlayers || typeof allPlayers !== 'object') return playerId;
    const player = allPlayers[playerId];
    if (!player) return `Player ${playerId}`;
    return `${player.first_name || ''} ${player.last_name || ''}`.trim() || player.full_name || 'Unknown Player';
  };

  const getPlayerPosition = (playerId: string) => {
    if (!allPlayers || typeof allPlayers !== 'object') return 'N/A';
    const player = allPlayers[playerId];
    return player?.position || 'N/A';
  };

  const getPlayerTeam = (playerId: string) => {
    if (!allPlayers || typeof allPlayers !== 'object') return 'FA';
    const player = allPlayers[playerId];
    return player?.team || 'FA';
  };

  const starters = roster.starters || [];
  const bench = (roster.players || []).filter(playerId => !starters.includes(playerId));

  return (
    <div className="space-y-6">
      {/* Starting Lineup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Starting Lineup
          </CardTitle>
          <CardDescription>Your active players for this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {starters.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No starters set</div>
            ) : (
              starters.map((playerId) => (
                <div key={playerId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <h4 className="font-medium text-gray-900">{getPlayerName(playerId)}</h4>
                    <p className="text-sm text-gray-600">{getPlayerPosition(playerId)} - {getPlayerTeam(playerId)}</p>
                  </div>
                  <Badge variant="default">Starting</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bench */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bench
          </CardTitle>
          <CardDescription>Your bench players</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bench.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No bench players</div>
            ) : (
              bench.map((playerId) => (
                <div key={playerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{getPlayerName(playerId)}</h4>
                    <p className="text-sm text-gray-600">{getPlayerPosition(playerId)} - {getPlayerTeam(playerId)}</p>
                  </div>
                  <Badge variant="outline">Bench</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main League Details Page
export default function LeagueDetailsPage() {
  const { user, requireAuth } = useAuth();
  const params = useParams();
  const router = useRouter();
  const leagueId = params.id as string;

  const [leagueDetails, setLeagueDetails] = useState<LeagueDetails | null>(null);
  const [standings, setStandings] = useState<StandingsData[]>([]);
  const [matchups, setMatchups] = useState<MatchupData[]>([]);
  const [userRoster, setUserRoster] = useState<RosterData | null>(null);
  const [userRosterPlayers, setUserRosterPlayers] = useState<any[]>([]);
  const [allPlayers, setAllPlayers] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(14);

  const fetchLeagueData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch league details
      const detailsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/leagues/${leagueId}/details`);
      if (!detailsResponse.ok) {
        throw new Error(`Failed to fetch league details: ${detailsResponse.status}`);
      }
      const detailsData = await detailsResponse.json();
      
      if (!detailsData.success) {
        throw new Error(detailsData.error?.message || 'Failed to fetch league details');
      }

      setLeagueDetails(detailsData.data);
      setSelectedWeek(detailsData.data.currentWeek || 14);

      // Fetch standings
      const standingsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/leagues/${leagueId}/standings`);
      if (standingsResponse.ok) {
        const standingsData = await standingsResponse.json();
        if (standingsData.success) {
          setStandings(standingsData.data);
        }
      }

      // Fetch user's roster
      const rosterResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/leagues/${leagueId}/roster/${user.id}`);
      if (rosterResponse.ok) {
        const rosterData = await rosterResponse.json();
        if (rosterData.success) {
          setUserRoster(rosterData.data);
        }
      }

      // Fetch user's roster players for Start/Sit
      const playersResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/leagues/${leagueId}/players/${user.id}`);
      if (playersResponse.ok) {
        const playersData = await playersResponse.json();
        if (playersData.success) {
          setUserRosterPlayers(playersData.data);
        }
      }

    } catch (err) {
      console.error('Error fetching league data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load league data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchups = async (week: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/leagues/${leagueId}/matchups/${week}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setMatchups(data.data.matchups);
        }
      }
    } catch (err) {
      console.error('Error fetching matchups:', err);
    }
  };

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  useEffect(() => {
    if (user && leagueId) {
      fetchLeagueData();
    }
  }, [user, leagueId]);

  useEffect(() => {
    if (leagueId && selectedWeek) {
      fetchMatchups(selectedWeek);
    }
  }, [leagueId, selectedWeek]);

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
          <p className="text-gray-600">Loading league details...</p>
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
          <Button onClick={fetchLeagueData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!leagueDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">League not found</h2>
          <p className="text-gray-600 mb-4">The requested league could not be found.</p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {leagueDetails.league.name}
            </h1>
            <p className="text-gray-600 mt-1">
              {leagueDetails.league.season} Season • {leagueDetails.rosters.length} Teams
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">Week {selectedWeek}</Badge>
          <Badge variant="secondary">{leagueDetails.league.status || 'Active'}</Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="my-team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            My Team
          </TabsTrigger>
          <TabsTrigger value="ai-tools" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <LeagueStandings standings={standings} />
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <LeagueSchedule 
            matchups={matchups}
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
            users={leagueDetails.users}
            rosters={leagueDetails.rosters}
          />
        </TabsContent>

        <TabsContent value="my-team" className="mt-6">
          <UserRoster 
            roster={userRoster}
            users={leagueDetails.users}
            allPlayers={allPlayers}
          />
        </TabsContent>

        <TabsContent value="ai-tools" className="mt-6">
          <StartSitAnalyzer
            userId={user.id}
            leagueId={leagueId}
            week={selectedWeek}
            availablePlayers={userRosterPlayers}
            rosterSlots={['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'DST', 'K']}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}