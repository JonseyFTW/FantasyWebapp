'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  Trophy, 
  BarChart3,
  ArrowRight,
  Zap,
  Brain,
  Target
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState({
    totalAnalyses: 1247,
    activeUsers: 523,
    winRate: 68.5,
    avgImprovement: 15.3
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold gradient-text mb-6">
            Fantasy Football AI
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Dominate your league with AI-powered analytics, start/sit recommendations, 
            trade analysis, and championship-winning insights.
          </p>
          {!user ? (
            <div className="flex gap-4 justify-center">
              <Link href="/auth/signin">
                <Button size="lg" className="btn-primary">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          ) : (
            <Link href="/dashboard">
              <Button size="lg" className="btn-primary">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="stats-card text-center">
          <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{stats.totalAnalyses.toLocaleString()}</div>
          <div className="text-sm text-gray-600">AI Analyses</div>
        </div>
        <div className="stats-card text-center">
          <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{stats.activeUsers}</div>
          <div className="text-sm text-gray-600">Active Users</div>
        </div>
        <div className="stats-card text-center">
          <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{stats.winRate}%</div>
          <div className="text-sm text-gray-600">Win Rate</div>
        </div>
        <div className="stats-card text-center">
          <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">+{stats.avgImprovement}%</div>
          <div className="text-sm text-gray-600">Avg Improvement</div>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Powerful AI Features
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our advanced AI analyzes millions of data points to give you the edge 
            you need to win your fantasy league.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-blue-600" />
                <CardTitle>Start/Sit Analyzer</CardTitle>
              </div>
              <CardDescription>
                AI-powered player recommendations based on matchups, injuries, and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li>• Weekly lineup optimization</li>
                <li>• Risk tolerance settings</li>
                <li>• Projected points with floor/ceiling</li>
                <li>• Matchup difficulty analysis</li>
              </ul>
              <Badge variant="secondary">Available Now</Badge>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-green-600" />
                <CardTitle>Trade Analyzer</CardTitle>
              </div>
              <CardDescription>
                Evaluate trade proposals with comprehensive fairness scoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li>• Trade fairness scoring (0-10)</li>
                <li>• Team impact analysis</li>
                <li>• Market value comparison</li>
                <li>• Letter grades for both sides</li>
              </ul>
              <Badge variant="secondary">Coming Soon</Badge>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-6 w-6 text-purple-600" />
                <CardTitle>Waiver Wire Assistant</CardTitle>
              </div>
              <CardDescription>
                Never miss a valuable pickup with AI-powered waiver recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li>• Priority pickup rankings</li>
                <li>• FAAB bidding strategy</li>
                <li>• Streaming recommendations</li>
                <li>• Drop candidate analysis</li>
              </ul>
              <Badge variant="secondary">Coming Soon</Badge>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Dominate Your League?
          </h2>
          <p className="text-xl mb-6 opacity-90">
            Join thousands of fantasy managers already using AI to win championships
          </p>
          <Link href="/auth/signin">
            <Button size="lg" variant="secondary">
              Start Your Free Trial
            </Button>
          </Link>
        </section>
      )}
    </div>
  );
}