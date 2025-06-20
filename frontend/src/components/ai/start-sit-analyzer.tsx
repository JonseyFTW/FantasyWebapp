'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { aiClient, StartSitRequest } from '@/lib/ai-client';

interface StartSitAnalyzerProps {
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

export function StartSitAnalyzer({
  userId,
  leagueId,
  week,
  availablePlayers,
  rosterSlots,
}: StartSitAnalyzerProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [provider, setProvider] = useState<'openai' | 'claude' | 'gemini'>('claude');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (selectedPlayers.length === 0) {
      setError('Please select at least one player to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const request: StartSitRequest = {
        userId,
        leagueId,
        week,
        playerIds: selectedPlayers,
        rosterSlots,
        userPreferences: {
          riskTolerance,
          prioritizeUpside: riskTolerance === 'aggressive',
          avoidInjuredPlayers: riskTolerance === 'conservative',
        },
        preferredProvider: provider,
      };

      const result = await aiClient.analyzeStartSit(request);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'start':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'sit':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'flex':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (confidence >= 0.6) return <TrendingUp className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Start/Sit Analyzer</CardTitle>
          <CardDescription>
            Get AI-powered recommendations for your lineup decisions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Player Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Players to Analyze
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {availablePlayers.map((player) => (
                <label key={player.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(player.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlayers([...selectedPlayers, player.id]);
                      } else {
                        setSelectedPlayers(selectedPlayers.filter(id => id !== player.id));
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

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Risk Tolerance
              </label>
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
              <label className="text-sm font-medium mb-2 block">
                AI Provider
              </label>
              <Select value={provider} onValueChange={(value) => setProvider(value as 'openai' | 'claude' | 'gemini')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude (Recommended)</SelectItem>
                  <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Analyze Button */}
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || selectedPlayers.length === 0}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Start/Sit Decisions'
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

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Weekly Outlook */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Outlook</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 mb-4">{analysis.weeklyOutlook}</p>
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-sm font-medium">Confidence Score:</span>
                <Badge variant="outline">
                  {Math.round(analysis.confidenceScore * 100)}%
                </Badge>
              </div>
              {analysis.keyInsights && analysis.keyInsights.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Key Insights:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.keyInsights.map((insight: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600">{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Player Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Player Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.recommendations?.map((rec: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{rec.playerName}</h4>
                        <p className="text-sm text-gray-600">{rec.position}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getConfidenceIcon(rec.confidence)}
                        <Badge className={getRecommendationColor(rec.recommendation)}>
                          {rec.recommendation.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{rec.reasoning}</p>

                    {/* Projected Points */}
                    <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-medium text-gray-900">
                          {rec.projectedPoints?.floor?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="text-gray-600">Floor</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="font-medium text-blue-900">
                          {rec.projectedPoints?.expected?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="text-blue-600">Expected</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="font-medium text-green-900">
                          {rec.projectedPoints?.ceiling?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="text-green-600">Ceiling</div>
                      </div>
                    </div>

                    {/* Matchup Analysis */}
                    {rec.matchupAnalysis && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm">
                          <span>vs {rec.matchupAnalysis.opponent}</span>
                          <Badge 
                            variant={rec.matchupAnalysis.difficulty === 'easy' ? 'default' : 
                                    rec.matchupAnalysis.difficulty === 'medium' ? 'secondary' : 'destructive'}
                          >
                            {rec.matchupAnalysis.difficulty} matchup
                          </Badge>
                        </div>
                        {rec.matchupAnalysis.keyFactors?.length > 0 && (
                          <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
                            {rec.matchupAnalysis.keyFactors.map((factor: string, i: number) => (
                              <li key={i}>{factor}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Risk Factors */}
                    {rec.riskFactors?.length > 0 && (
                      <div className="text-xs">
                        <span className="font-medium text-orange-700">Risk Factors: </span>
                        <span className="text-orange-600">{rec.riskFactors.join(', ')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Optimal Lineup */}
          {analysis.optimalLineup && Object.keys(analysis.optimalLineup).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Optimal Lineup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {Object.entries(analysis.optimalLineup).map(([position, playerId]) => (
                    <div key={position} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">{position}:</span>
                      <span className="text-sm">
                        {(availablePlayers.find(p => p.id === playerId)?.name || playerId) as string}
                      </span>
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