'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';

export default function AnalyticsPage() {
  const { user, requireAuth } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">
            Detailed performance insights and league analytics
          </p>
        </div>
        <Badge variant="secondary">Coming Soon</Badge>
      </div>

      {/* Analytics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance
            </CardTitle>
            <CardDescription>Weekly performance tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Track your weekly scores, rankings, and consistency metrics across all leagues.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trends
            </CardTitle>
            <CardDescription>Season-long trends</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Analyze your performance trends, player usage, and strategic decisions over time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Breakdowns
            </CardTitle>
            <CardDescription>Detailed breakdowns</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Position-by-position analysis and scoring breakdowns for optimal lineup decisions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Stats
            </CardTitle>
            <CardDescription>Real-time analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Live game tracking and real-time performance monitoring during NFL games.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Message */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Advanced Analytics Coming Soon</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We're building comprehensive analytics to help you understand your fantasy performance, 
              identify trends, and make data-driven decisions. Features will include performance tracking, 
              opponent analysis, and AI-powered insights.
            </p>
            <div className="mt-6">
              <Badge variant="outline">In Development</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}