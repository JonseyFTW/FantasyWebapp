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
  AlertCircle
} from 'lucide-react';
import { StartSitAnalyzer } from '@/components/ai/start-sit-analyzer';
import { TradeAnalyzer } from '@/components/ai/trade-analyzer';
import { LineupOptimizer } from '@/components/ai/lineup-optimizer';
import Link from 'next/link';

// Mock data for demonstration - would come from API calls to Sleeper MCP server
const mockUserData = {
  leagues: [
    {
      id: 'league_1',
      name: 'Championship League',
      totalTeams: 12,
      currentWeek: 14,
      userRank: 3,
      wins: 9,
      losses: 4,
      pointsFor: 1624.5,
      pointsAgainst: 1456.2,
    },
    {
      id: 'league_2', 
      name: 'Friends & Family',
      totalTeams: 10,
      currentWeek: 14,
      userRank: 1,
      wins: 11,
      losses: 2,
      pointsFor: 1789.3,
      pointsAgainst: 1345.1,
    },
  ],
  recentActivity: [
    { type: 'trade', description: 'Traded CMC for Tyreek Hill + Josh Jacobs', league: 'Championship League', timestamp: '2 hours ago' },
    { type: 'waiver', description: 'Picked up Gus Edwards', league: 'Friends & Family', timestamp: '1 day ago' },
    { type: 'lineup', description: 'Optimized Week 14 lineup', league: 'Championship League', timestamp: '2 days ago' },
  ],
};

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
  const [selectedLeague, setSelectedLeague] = useState(mockUserData.leagues[0].id);
  const [currentWeek, setCurrentWeek] = useState(14);

  useEffect(() => {
    requireAuth();
  }, [requireAuth]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedLeagueData = mockUserData.leagues.find(l => l.id === selectedLeague);

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
        {mockUserData.leagues.map((league) => (
          <Card key={league.id} className="card-hover cursor-pointer" onClick={() => setSelectedLeague(league.id)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{league.name}</CardTitle>
                <Badge variant={league.id === selectedLeague ? 'default' : 'outline'}>
                  #{league.userRank}
                </Badge>
              </div>
              <CardDescription>
                {league.wins}-{league.losses} • {league.totalTeams} teams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-900">{league.pointsFor}</div>
                  <div className="text-gray-600">Points For</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{league.pointsAgainst}</div>
                  <div className="text-gray-600">Points Against</div>
                </div>
              </div>
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
              <StartSitAnalyzer
                userId={user.id}
                leagueId={selectedLeague}
                week={currentWeek}
                availablePlayers={mockPlayerData.availablePlayers}
                rosterSlots={mockPlayerData.rosterSlots}
              />
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
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>
              {selectedLeagueData?.name} performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedLeagueData?.userRank}
                </div>
                <div className="text-sm text-blue-600">Current Rank</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {selectedLeagueData ? 
                    ((selectedLeagueData.wins / (selectedLeagueData.wins + selectedLeagueData.losses)) * 100).toFixed(0) : 0}%
                </div>
                <div className="text-sm text-green-600">Win Rate</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {selectedLeagueData?.pointsFor ? 
                    (selectedLeagueData.pointsFor / (selectedLeagueData.wins + selectedLeagueData.losses)).toFixed(1) : 0}
                </div>
                <div className="text-sm text-purple-600">Avg PPG</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {selectedLeagueData?.pointsFor && selectedLeagueData?.pointsAgainst ? 
                    (selectedLeagueData.pointsFor - selectedLeagueData.pointsAgainst).toFixed(1) : 0}
                </div>
                <div className="text-sm text-orange-600">Point Diff</div>
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
              {mockUserData.recentActivity.map((activity, index) => (
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