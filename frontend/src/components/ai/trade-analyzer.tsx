'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Scale, Star } from 'lucide-react';
import { aiClient, TradeRequest } from '@/lib/ai-client';

interface TradeAnalyzerProps {
  leagueId: string;
  userId: string;
  availableTeams: {
    userId: string;
    teamName: string;
    players: {
      id: string;
      name: string;
      position: string;
      team: string;
    }[];
  }[];
}

export function TradeAnalyzer({ leagueId, userId, availableTeams }: TradeAnalyzerProps) {
  const [team1, setTeam1] = useState<string>('');
  const [team2, setTeam2] = useState<string>('');
  const [team1Players, setTeam1Players] = useState<string[]>([]);
  const [team2Players, setTeam2Players] = useState<string[]>([]);
  const [provider, setProvider] = useState<'openai' | 'claude' | 'gemini'>('claude');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const team1Data = availableTeams.find(t => t.userId === team1);
  const team2Data = availableTeams.find(t => t.userId === team2);

  const handleAnalyze = async () => {
    if (!team1 || !team2 || team1Players.length === 0 || team2Players.length === 0) {
      setError('Please select both teams and players for the trade');
      return;
    }

    if (team1 === team2) {
      setError('Please select different teams');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const request: TradeRequest = {
        leagueId,
        team1UserId: team1,
        team2UserId: team2,
        team1Players,
        team2Players,
        requestingUserId: userId,
        preferredProvider: provider,
      };

      const result = await aiClient.analyzeTrade(request);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trade analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getGradeColor = (grade: string) => {
    const gradeLevel = grade.replace(/[+-]/, '');
    switch (gradeLevel) {
      case 'A': return 'bg-green-100 text-green-800 border-green-200';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'D': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'F': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getValueVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'fair': return 'text-green-600';
      case 'team1_wins': return team1 === userId ? 'text-green-600' : 'text-red-600';
      case 'team2_wins': return team2 === userId ? 'text-green-600' : 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trade Analyzer</CardTitle>
          <CardDescription>
            Analyze trade proposals with comprehensive fairness scoring and impact analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Team Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Team 1</label>
              <Select value={team1} onValueChange={(value) => setTeam1(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team 1" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map((team) => (
                    <SelectItem key={team.userId} value={team.userId}>
                      {team.teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Team 2</label>
              <Select value={team2} onValueChange={(value) => setTeam2(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team 2" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map((team) => (
                    <SelectItem key={team.userId} value={team.userId}>
                      {team.teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Player Selection */}
          {team1Data && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                {team1Data.teamName} trades away:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {team1Data.players.map((player) => (
                  <label key={player.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={team1Players.includes(player.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTeam1Players([...team1Players, player.id]);
                        } else {
                          setTeam1Players(team1Players.filter(id => id !== player.id));
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
          )}

          {team2Data && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                {team2Data.teamName} trades away:
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {team2Data.players.map((player) => (
                  <label key={player.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={team2Players.includes(player.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTeam2Players([...team2Players, player.id]);
                        } else {
                          setTeam2Players(team2Players.filter(id => id !== player.id));
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
          )}

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

          {/* Analyze Button */}
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || !team1 || !team2 || team1Players.length === 0 || team2Players.length === 0}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Trade...
              </>
            ) : (
              <>
                <Scale className="mr-2 h-4 w-4" />
                Analyze Trade
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

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Trade Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Trade Analysis Summary</CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Fairness Score:</span>
                  <Badge variant="outline" className="text-lg">
                    {analysis.fairnessScore}/10
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{analysis.summary}</p>
              
              {/* Market Value */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2">Market Value Analysis</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium">{team1Data?.teamName}</div>
                    <div className="text-gray-600">${analysis.marketValue.team1Total}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Difference</div>
                    <div className={getValueVerdictColor(analysis.marketValue.valueVerdict)}>
                      ${Math.abs(analysis.marketValue.difference)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{team2Data?.teamName}</div>
                    <div className="text-gray-600">${analysis.marketValue.team2Total}</div>
                  </div>
                </div>
              </div>

              {/* Key Insights */}
              {analysis.keyInsights?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Key Insights:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.keyInsights.map((insight: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600">{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Analysis */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Team 1 Analysis */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{team1Data?.teamName} Analysis</CardTitle>
                  <Badge className={getGradeColor(analysis.team1Analysis.grade)}>
                    {analysis.team1Analysis.grade}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Recommendation</h4>
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant={analysis.team1Analysis.recommendation.decision === 'accept' ? 'default' : 'secondary'}>
                      {analysis.team1Analysis.recommendation.decision.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {Math.round(analysis.team1Analysis.recommendation.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{analysis.team1Analysis.recommendation.reasoning}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Impact Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Starting Lineup Impact:</span>
                      <span className={analysis.team1Analysis.impact.startingLineupImpact > 0 ? 'text-green-600' : 'text-red-600'}>
                        {analysis.team1Analysis.impact.startingLineupImpact > 0 ? '+' : ''}{analysis.team1Analysis.impact.startingLineupImpact}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Depth Chart Impact:</span>
                      <span className={analysis.team1Analysis.impact.depthChartImpact > 0 ? 'text-green-600' : 'text-red-600'}>
                        {analysis.team1Analysis.impact.depthChartImpact > 0 ? '+' : ''}{analysis.team1Analysis.impact.depthChartImpact}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Bye Week Help:</span>
                      <span className={analysis.team1Analysis.impact.byeWeekHelp ? 'text-green-600' : 'text-gray-600'}>
                        {analysis.team1Analysis.impact.byeWeekHelp ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {analysis.team1Analysis.recommendation.pros?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-green-600">Pros:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.team1Analysis.recommendation.pros.map((pro: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600">{pro}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.team1Analysis.recommendation.cons?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Cons:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.team1Analysis.recommendation.cons.map((con: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600">{con}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team 2 Analysis */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{team2Data?.teamName} Analysis</CardTitle>
                  <Badge className={getGradeColor(analysis.team2Analysis.grade)}>
                    {analysis.team2Analysis.grade}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Recommendation</h4>
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant={analysis.team2Analysis.recommendation.decision === 'accept' ? 'default' : 'secondary'}>
                      {analysis.team2Analysis.recommendation.decision.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {Math.round(analysis.team2Analysis.recommendation.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{analysis.team2Analysis.recommendation.reasoning}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Impact Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Starting Lineup Impact:</span>
                      <span className={analysis.team2Analysis.impact.startingLineupImpact > 0 ? 'text-green-600' : 'text-red-600'}>
                        {analysis.team2Analysis.impact.startingLineupImpact > 0 ? '+' : ''}{analysis.team2Analysis.impact.startingLineupImpact}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Depth Chart Impact:</span>
                      <span className={analysis.team2Analysis.impact.depthChartImpact > 0 ? 'text-green-600' : 'text-red-600'}>
                        {analysis.team2Analysis.impact.depthChartImpact > 0 ? '+' : ''}{analysis.team2Analysis.impact.depthChartImpact}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Bye Week Help:</span>
                      <span className={analysis.team2Analysis.impact.byeWeekHelp ? 'text-green-600' : 'text-gray-600'}>
                        {analysis.team2Analysis.impact.byeWeekHelp ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {analysis.team2Analysis.recommendation.pros?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-green-600">Pros:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.team2Analysis.recommendation.pros.map((pro: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600">{pro}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.team2Analysis.recommendation.cons?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Cons:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.team2Analysis.recommendation.cons.map((con: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600">{con}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium">{team1Data?.teamName} Risk:</span>
                    <Badge variant={
                      analysis.riskAssessment.team1Risk === 'low' ? 'default' :
                      analysis.riskAssessment.team1Risk === 'medium' ? 'secondary' : 'destructive'
                    }>
                      {analysis.riskAssessment.team1Risk.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium">{team2Data?.teamName} Risk:</span>
                    <Badge variant={
                      analysis.riskAssessment.team2Risk === 'low' ? 'default' :
                      analysis.riskAssessment.team2Risk === 'medium' ? 'secondary' : 'destructive'
                    }>
                      {analysis.riskAssessment.team2Risk.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              {analysis.riskAssessment.riskFactors?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Risk Factors:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.riskAssessment.riskFactors.map((factor: string, index: number) => (
                      <li key={index} className="text-sm text-gray-600">{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timing Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Timing Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="font-medium mb-1">Optimal Timing</div>
                  <div className={analysis.timing.optimalTiming ? 'text-green-600' : 'text-red-600'}>
                    {analysis.timing.optimalTiming ? 'Yes' : 'No'}
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-1">Season Context</div>
                  <div className="text-gray-600">{analysis.timing.seasonContext}</div>
                </div>
                <div>
                  <div className="font-medium mb-1">Urgency</div>
                  <Badge variant={
                    analysis.timing.urgency === 'low' ? 'secondary' :
                    analysis.timing.urgency === 'medium' ? 'default' : 'destructive'
                  }>
                    {analysis.timing.urgency.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}