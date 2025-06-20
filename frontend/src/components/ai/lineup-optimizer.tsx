'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, TrendingUp, TrendingDown, AlertTriangle, Star, Target } from 'lucide-react';
import { aiClient, LineupOptimizerRequest } from '@/lib/ai-client';

interface LineupOptimizerProps {
  userId: string;
  leagueId: string;
  week: number;
  availablePlayers: {
    id: string;
    name: string;
    position: string;
    team: string;
  }[];
  rosterSlots: string[];
}

export function LineupOptimizer({
  userId,
  leagueId, 
  week,
  availablePlayers,
  rosterSlots,
}: LineupOptimizerProps) {
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [prioritizeFloor, setPriorizeFloor] = useState(false);
  const [stackPreference, setStackPreference] = useState<'qb_wr' | 'qb_te' | 'none'>('none');
  const [avoidOpponents, setAvoidOpponents] = useState(false);
  const [weatherConcerns, setWeatherConcerns] = useState(true);
  const [mustStart, setMustStart] = useState<string[]>([]);
  const [cannotStart, setCannotStart] = useState<string[]>([]);
  const [provider, setProvider] = useState<'openai' | 'claude' | 'gemini'>('claude');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<'optimal' | 'floor' | 'ceiling'>('optimal');

  const handleOptimize = async () => {
    if (availablePlayers.length === 0) {
      setError('No players available for lineup optimization');
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      const request: LineupOptimizerRequest = {
        userId,
        leagueId,
        week,
        availablePlayers: availablePlayers.map(p => p.id),
        rosterSlots,
        userPreferences: {
          riskTolerance,
          prioritizeFloor,
          stackPreference,
          avoidOpponents,
          weatherConcerns,
        },
        constraints: {
          mustStart: mustStart.length > 0 ? mustStart : undefined,
          cannotStart: cannotStart.length > 0 ? cannotStart : undefined,
        },
        preferredProvider: provider,
      };

      const result = await aiClient.optimizeLineup(request);
      setOptimization(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lineup optimization failed');
    } finally {
      setIsOptimizing(false);
    }
  };

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMatchupRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'average': return 'text-gray-600';
      case 'poor': return 'text-orange-600';
      case 'terrible': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPlayerByName = (playerId: string) => {
    return availablePlayers.find(p => p.id === playerId);
  };

  const getCurrentScenario = () => {
    if (!optimization) return null;
    
    switch (selectedScenario) {
      case 'optimal':
        return optimization.optimalLineup;
      case 'floor':
        return optimization.alternativeLineups?.find((lineup: any) => 
          lineup.scenarioName.toLowerCase().includes('floor')
        ) || optimization.optimalLineup;
      case 'ceiling':
        return optimization.alternativeLineups?.find((lineup: any) => 
          lineup.scenarioName.toLowerCase().includes('ceiling')
        ) || optimization.optimalLineup;
      default:
        return optimization.optimalLineup;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lineup Optimizer</CardTitle>
          <CardDescription>
            AI-powered lineup optimization for maximum expected points
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Risk Tolerance</label>
              <Select value={riskTolerance} onValueChange={(value) => setRiskTolerance(value as 'conservative' | 'moderate' | 'aggressive')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative (High Floor)</SelectItem>
                  <SelectItem value="moderate">Moderate (Balanced)</SelectItem>
                  <SelectItem value="aggressive">Aggressive (High Ceiling)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Strategy Focus</label>
              <Select value={prioritizeFloor ? 'floor' : 'ceiling'} onValueChange={(value) => setPriorizeFloor(value === 'floor')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="floor">Prioritize Floor</SelectItem>
                  <SelectItem value="ceiling">Prioritize Ceiling</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Stacking Preference</label>
              <Select value={stackPreference} onValueChange={(value) => setStackPreference(value as 'none' | 'qb_wr' | 'qb_te')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Stacking</SelectItem>
                  <SelectItem value="qb_wr">QB + WR Stack</SelectItem>
                  <SelectItem value="qb_te">QB + TE Stack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="avoidOpponents"
                checked={avoidOpponents}
                onChange={(e) => setAvoidOpponents(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="avoidOpponents" className="text-sm font-medium">
                Avoid players facing each other
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="weatherConcerns"
                checked={weatherConcerns}
                onChange={(e) => setWeatherConcerns(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="weatherConcerns" className="text-sm font-medium">
                Factor in weather conditions
              </label>
            </div>
          </div>

          {/* Player Constraints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Must Start Players</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {availablePlayers.map((player) => (
                  <label key={player.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={mustStart.includes(player.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMustStart([...mustStart, player.id]);
                          setCannotStart(cannotStart.filter(id => id !== player.id));
                        } else {
                          setMustStart(mustStart.filter(id => id !== player.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">
                      {player.name} ({player.position})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Cannot Start Players</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {availablePlayers.map((player) => (
                  <label key={player.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={cannotStart.includes(player.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCannotStart([...cannotStart, player.id]);
                          setMustStart(mustStart.filter(id => id !== player.id));
                        } else {
                          setCannotStart(cannotStart.filter(id => id !== player.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">
                      {player.name} ({player.position})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* AI Provider */}
          <div>
            <label className="text-sm font-medium mb-2 block">AI Provider</label>
            <Select value={provider} onValueChange={(value) => setProvider(value as 'openai' | 'claude' | 'gemini')}>
              <SelectTrigger className="w-full md:w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude">Claude (Recommended)</SelectItem>
                <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Optimize Button */}
          <Button 
            onClick={handleOptimize} 
            disabled={isOptimizing || availablePlayers.length === 0}
            className="w-full"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing Lineup...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Optimize Lineup
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optimization Results */}
      {optimization && (
        <div className="space-y-4">
          {/* Scenario Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Lineup Scenarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2 mb-4">
                <Button
                  variant={selectedScenario === 'optimal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedScenario('optimal')}
                >
                  <Target className="mr-1 h-3 w-3" />
                  Optimal
                </Button>
                <Button
                  variant={selectedScenario === 'floor' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedScenario('floor')}
                >
                  <TrendingDown className="mr-1 h-3 w-3" />
                  High Floor
                </Button>
                <Button
                  variant={selectedScenario === 'ceiling' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedScenario('ceiling')}
                >
                  <TrendingUp className="mr-1 h-3 w-3" />
                  High Ceiling
                </Button>
              </div>

              {getCurrentScenario() && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {getCurrentScenario().projectedTotal.floor?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Floor</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {getCurrentScenario().projectedTotal.expected?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Expected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {getCurrentScenario().projectedTotal.ceiling?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Ceiling</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Optimal Lineup */}
          {getCurrentScenario() && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{getCurrentScenario().scenarioName}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge className={getRiskLevelColor(getCurrentScenario().riskLevel)}>
                      {getCurrentScenario().riskLevel} risk
                    </Badge>
                    <Badge variant="outline">
                      {Math.round(getCurrentScenario().confidence * 100)}% confidence
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(getCurrentScenario().lineup).map(([position, playerId]) => {
                    const player = getPlayerByName(playerId as string);
                    const projection = optimization.playerProjections?.find((p: any) => p.playerId === playerId);
                    
                    return (
                      <div key={position} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="font-medium text-sm w-12">{position}</div>
                          <div>
                            <div className="font-medium">
                              {player?.name || 'Unknown Player'}
                            </div>
                            <div className="text-sm text-gray-600">
                              {player?.team} vs {projection?.opponent || 'TBD'}
                            </div>
                          </div>
                        </div>
                        {projection && (
                          <div className="text-right">
                            <div className="font-medium text-blue-600">
                              {projection.projectedPoints.expected?.toFixed(1) || 'N/A'} pts
                            </div>
                            <div className={`text-xs ${getMatchupRatingColor(projection.matchupRating)}`}>
                              {projection.matchupRating} matchup
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">{getCurrentScenario().reasoning}</p>
                </div>

                {getCurrentScenario().advantages?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2 text-green-600">Advantages:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {getCurrentScenario().advantages.map((advantage: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600">{advantage}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {getCurrentScenario().concerns?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2 text-orange-600">Concerns:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {getCurrentScenario().concerns.map((concern: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600">{concern}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Key Decisions */}
          {optimization.keyDecisions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Key Lineup Decisions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {optimization.keyDecisions.map((decision: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">{decision.position} Decision</h4>
                      <div className="space-y-2">
                        {decision.options.map((option: any, optIndex: number) => {
                          const player = getPlayerByName(option.playerId);
                          return (
                            <div key={optIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <div className="font-medium text-sm">
                                  {player?.name || option.playerName}
                                </div>
                                <div className="text-xs text-gray-600">
                                  Pros: {option.pros.join(', ')}
                                </div>
                                {option.cons.length > 0 && (
                                  <div className="text-xs text-gray-600">
                                    Cons: {option.cons.join(', ')}
                                  </div>
                                )}
                              </div>
                              <Badge variant={
                                option.recommendation === 'start' ? 'default' :
                                option.recommendation === 'consider' ? 'secondary' : 'outline'
                              }>
                                {option.recommendation}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 p-2 bg-blue-50 rounded text-sm text-gray-700">
                        <strong>Recommendation:</strong> {decision.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bench Analysis */}
          {optimization.benchAnalysis?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bench Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {optimization.benchAnalysis.map((player: any, index: number) => {
                    const playerInfo = getPlayerByName(player.playerId);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            {playerInfo?.name || player.playerName}
                          </div>
                          <div className="text-sm text-gray-600">{player.benchReason}</div>
                          {player.alternativeScenarios?.length > 0 && (
                            <div className="text-xs text-blue-600">
                              Consider if: {player.alternativeScenarios.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            player.keepOrDrop === 'keep' ? 'default' :
                            player.keepOrDrop === 'consider_dropping' ? 'secondary' : 'destructive'
                          }>
                            {player.keepOrDrop.replace('_', ' ')}
                          </Badge>
                          <div className="text-xs text-gray-600 mt-1">
                            Value: {player.upcomingValue?.restOfSeason || 'N/A'}/10
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stacking Opportunities */}
          {optimization.stackingOpportunities?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Stacking Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {optimization.stackingOpportunities.map((stack: any, index: number) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {stack.players.map((playerId: string) => 
                            getPlayerByName(playerId)?.name || playerId
                          ).join(' + ')}
                        </div>
                        <Badge variant="outline">
                          {Math.round(stack.correlation * 100)}% correlation
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        <strong>Upside:</strong> {stack.upside}
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Risk:</strong> {stack.risk}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}