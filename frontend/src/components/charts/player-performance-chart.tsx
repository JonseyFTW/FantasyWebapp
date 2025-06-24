'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface WeeklyPerformance {
  week: number;
  season: number;
  fantasy_points: number;
  passing_yards?: number;
  rushing_yards?: number;
  receiving_yards?: number;
  passing_tds?: number;
  rushing_tds?: number;
  receiving_tds?: number;
}

interface WeeklyProjection {
  week: number;
  projected_points: number;
  confidence: number;
}

interface PlayerData {
  player_id: string;
  player_name: string;
  position: string;
  team: string;
  avg_fantasy_points_per_game: number;
  consistency_score: number;
  trends: WeeklyPerformance[];
  weekly_projections: WeeklyProjection[];
  metrics?: {
    upward_trend: 'up' | 'down' | 'steady';
    position_rank: number;
    projection_confidence: number;
  };
}

interface PlayerPerformanceChartProps {
  players: PlayerData[];
  showProjections?: boolean;
  showComparison?: boolean;
  height?: number;
}

export function PlayerPerformanceChart({ 
  players, 
  showProjections = true, 
  showComparison = false,
  height = 400 
}: PlayerPerformanceChartProps) {
  const chartData = useMemo(() => {
    if (!players || players.length === 0) return [];

    // Get all unique weeks from all players
    const allWeeks = new Set<number>();
    players.forEach(player => {
      player.trends.forEach(trend => allWeeks.add(trend.week));
      if (showProjections) {
        player.weekly_projections.forEach(proj => allWeeks.add(proj.week));
      }
    });

    const sortedWeeks = Array.from(allWeeks).sort((a, b) => a - b);

    return sortedWeeks.map(week => {
      const weekData: any = { week };

      players.forEach((player, index) => {
        const trend = player.trends.find(t => t.week === week);
        const projection = showProjections ? player.weekly_projections.find(p => p.week === week) : null;

        // Historical data
        if (trend) {
          weekData[`${player.player_name}_actual`] = trend.fantasy_points;
        }

        // Projection data
        if (projection) {
          weekData[`${player.player_name}_projected`] = projection.projected_points;
          weekData[`${player.player_name}_confidence`] = projection.confidence;
        }
      });

      return weekData;
    });
  }, [players, showProjections]);

  const getPlayerColor = (index: number) => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];
    return colors[index % colors.length];
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'steady') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (!players || players.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Player Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No player data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Player Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {players.map((player, index) => (
          <Card key={player.player_id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{player.player_name}</CardTitle>
                  <p className="text-sm text-gray-600">{player.position} - {player.team}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1">
                    {player.metrics?.upward_trend && getTrendIcon(player.metrics.upward_trend)}
                    <span className="text-sm font-medium">#{player.metrics?.position_rank || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Avg PPG</div>
                  <div className="text-lg">{player.avg_fantasy_points_per_game.toFixed(1)}</div>
                </div>
                <div>
                  <div className="font-medium">Consistency</div>
                  <Badge className={getConsistencyColor(player.consistency_score)}>
                    {player.consistency_score.toFixed(0)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {showComparison ? 'Player Performance Comparison' : 'Performance Trends'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="week" 
                label={{ value: 'Week', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: 'Fantasy Points', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  typeof value === 'number' ? value.toFixed(1) : value,
                  name.replace(/_/g, ' ').replace(' actual', ' (Actual)').replace(' projected', ' (Projected)')
                ]}
                labelFormatter={(week) => `Week ${week}`}
              />
              <Legend />

              {/* Current week reference line */}
              <ReferenceLine x={14} stroke="#666" strokeDasharray="5 5" label="Current Week" />

              {players.map((player, index) => (
                <div key={player.player_id}>
                  {/* Actual performance line */}
                  <Line
                    type="monotone"
                    dataKey={`${player.player_name}_actual`}
                    stroke={getPlayerColor(index)}
                    strokeWidth={2}
                    dot={{ fill: getPlayerColor(index), strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                  
                  {/* Projected performance line (dashed) */}
                  {showProjections && (
                    <Line
                      type="monotone"
                      dataKey={`${player.player_name}_projected`}
                      stroke={getPlayerColor(index)}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: getPlayerColor(index), strokeWidth: 1, r: 3 }}
                      connectNulls={false}
                    />
                  )}
                </div>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Projections Summary */}
      {showProjections && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Projections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {players.map((player, index) => (
                <div key={player.player_id} className="border-l-4 pl-4" style={{ borderColor: getPlayerColor(index) }}>
                  <div className="font-medium">{player.player_name}</div>
                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                    {player.weekly_projections.slice(0, 3).map(proj => (
                      <div key={proj.week} className="text-center">
                        <div className="font-medium">Week {proj.week}</div>
                        <div className="text-lg">{proj.projected_points.toFixed(1)}</div>
                        <div className="text-xs text-gray-500">{proj.confidence}% confidence</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}