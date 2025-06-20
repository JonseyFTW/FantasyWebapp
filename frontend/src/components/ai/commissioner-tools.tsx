'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Trophy, 
  BarChart3, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Calendar,
  DollarSign,
  Settings
} from 'lucide-react';

interface CommissionerToolsProps {
  leagueId: string;
  isCommissioner: boolean;
  leagueData: {
    name: string;
    season: string;
    totalTeams: number;
    currentWeek: number;
    playoffWeek: number;
    championshipWeek: number;
    payouts: {
      first: number;
      second: number;
      third: number;
    };
  };
  standings: {
    teamId: string;
    teamName: string;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    playoffSeed?: number;
  }[];
}

export function CommissionerTools({ 
  leagueId, 
  isCommissioner, 
  leagueData, 
  standings 
}: CommissionerToolsProps) {
  const [selectedTab, setSelectedTab] = useState('playoffs');

  // Calculate playoff scenarios
  const playoffTeams = standings
    .filter(team => team.playoffSeed && team.playoffSeed <= 6)
    .sort((a, b) => (a.playoffSeed || 0) - (b.playoffSeed || 0));

  const bubbleTeams = standings
    .filter(team => !team.playoffSeed)
    .sort((a, b) => b.pointsFor - a.pointsFor)
    .slice(0, 4);

  if (!isCommissioner) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Commissioner Tools
            </h3>
            <p className="text-gray-600">
              You need commissioner privileges to access these tools.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <CardTitle>Commissioner Tools</CardTitle>
          </div>
          <CardDescription>
            Advanced league management and analytics for {leagueData.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="playoffs">
                <Trophy className="h-4 w-4 mr-2" />
                Playoffs
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="payouts">
                <DollarSign className="h-4 w-4 mr-2" />
                Payouts
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="playoffs" className="mt-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Playoff Bracket */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Playoff Bracket</CardTitle>
                    <CardDescription>
                      Current playoff seeding and matchups
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {playoffTeams.map((team, index) => (
                        <div key={team.teamId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant="default">#{team.playoffSeed}</Badge>
                            <div>
                              <div className="font-medium">{team.teamName}</div>
                              <div className="text-sm text-gray-600">
                                {team.wins}-{team.losses} • {team.pointsFor.toFixed(1)} pts
                              </div>
                            </div>
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Bubble Teams */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Bubble Teams</CardTitle>
                    <CardDescription>
                      Teams fighting for playoff spots
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {bubbleTeams.map((team, index) => (
                        <div key={team.teamId} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant="secondary">#{standings.findIndex(s => s.teamId === team.teamId) + 1}</Badge>
                            <div>
                              <div className="font-medium">{team.teamName}</div>
                              <div className="text-sm text-gray-600">
                                {team.wins}-{team.losses} • {team.pointsFor.toFixed(1)} pts
                              </div>
                            </div>
                          </div>
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Playoff Scenarios */}
              <Card>
                <CardHeader>
                  <CardTitle>Playoff Scenarios</CardTitle>
                  <CardDescription>
                    What each team needs to make or improve their playoff position
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bubbleTeams.slice(0, 2).map((team) => (
                      <div key={team.teamId} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{team.teamName}</h4>
                          <Badge variant="outline">
                            {((team.wins / (team.wins + team.losses)) * 100).toFixed(0)}% to make playoffs
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>• Must win remaining {leagueData.playoffWeek - leagueData.currentWeek} games</div>
                          <div>• Needs {playoffTeams[5]?.teamName || 'current 6th seed'} to lose at least 1 game</div>
                          <div>• Would clinch with 120+ points and a win in Week {leagueData.currentWeek + 1}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6 space-y-4">
              {/* League Power Rankings */}
              <Card>
                <CardHeader>
                  <CardTitle>AI-Powered Power Rankings</CardTitle>
                  <CardDescription>
                    Rankings based on roster strength, recent performance, and schedule
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {standings.slice(0, 6).map((team, index) => {
                      const powerScore = 85 - (index * 8) + Math.random() * 10; // Mock power score
                      const trend = index < 2 ? 'up' : index > 4 ? 'down' : 'stable';
                      
                      return (
                        <div key={team.teamId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <div>
                              <div className="font-medium">{team.teamName}</div>
                              <div className="text-sm text-gray-600">
                                Power Score: {powerScore.toFixed(1)}/100
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                            {trend === 'down' && <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />}
                            {trend === 'stable' && <div className="h-4 w-4 rounded bg-gray-400"></div>}
                            <span className="text-sm text-gray-600">
                              {trend === 'up' ? '+2' : trend === 'down' ? '-1' : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* League Insights */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">League Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Competitive Balance:</span>
                        <Badge variant="default">Very High</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Points Spread:</span>
                        <span className="text-sm text-gray-600">±156 pts</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Playoff Race:</span>
                        <Badge variant="secondary">Tight</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Trade Activity:</span>
                        <span className="text-sm text-gray-600">18 trades</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Season Awards</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="font-medium text-sm">Highest Scorer</div>
                        <div className="text-sm text-gray-600">Team Dynasty (1,856 pts)</div>
                      </div>
                      <div>
                        <div className="font-medium text-sm">Most Consistent</div>
                        <div className="text-sm text-gray-600">The Champs (±12.3 pts)</div>
                      </div>
                      <div>
                        <div className="font-medium text-sm">Best Trade</div>
                        <div className="text-sm text-gray-600">CMC for Hill + Jacobs</div>
                      </div>
                      <div>
                        <div className="font-medium text-sm">Unluckiest</div>
                        <div className="text-sm text-gray-600">Team Struggle (1,654 PA)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="payouts" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Prize Distribution</CardTitle>
                  <CardDescription>
                    Current payout structure and championship implications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-yellow-600">
                        ${leagueData.payouts.first}
                      </div>
                      <div className="text-sm text-yellow-600">1st Place</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-600">
                        ${leagueData.payouts.second}
                      </div>
                      <div className="text-sm text-gray-600">2nd Place</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        ${leagueData.payouts.third}
                      </div>
                      <div className="text-sm text-orange-600">3rd Place</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Championship Odds</h4>
                    {playoffTeams.slice(0, 3).map((team, index) => {
                      const odds = [35, 25, 18][index] || 10; // Mock championship odds
                      return (
                        <div key={team.teamId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline">#{team.playoffSeed}</Badge>
                            <span className="font-medium">{team.teamName}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{odds}%</div>
                            <div className="text-sm text-gray-600">
                              Expected: ${(leagueData.payouts.first * odds / 100).toFixed(0)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>League Management</CardTitle>
                  <CardDescription>
                    Administrative tools and league settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Quick Actions</h4>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                          <Users className="h-4 w-4 mr-2" />
                          Send League Message
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Calendar className="h-4 w-4 mr-2" />
                          Update Schedule
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Settings className="h-4 w-4 mr-2" />
                          Modify Settings
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Export Data
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">League Health</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Active Teams:</span>
                          <Badge variant="default">{leagueData.totalTeams}/12</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Trade Activity:</span>
                          <Badge variant="default">High</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Waiver Activity:</span>
                          <Badge variant="default">Normal</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">League Engagement:</span>
                          <Badge variant="default">Excellent</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}