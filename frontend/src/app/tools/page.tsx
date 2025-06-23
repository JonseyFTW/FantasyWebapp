'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Scale, 
  TrendingUp, 
  Zap,
  Calculator,
  Target,
  Users,
  Trophy,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

export default function ToolsPage() {
  const { user, requireAuth } = useAuth();

  const tools = [
    {
      icon: Brain,
      title: 'Start/Sit Analyzer',
      description: 'AI-powered lineup decisions with confidence scoring',
      status: 'Available',
      href: '/dashboard',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Scale,
      title: 'Trade Analyzer',
      description: 'Evaluate trade fairness and impact analysis',
      status: 'Available',
      href: '/dashboard',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Zap,
      title: 'Lineup Optimizer',
      description: 'Optimize lineups for maximum expected points',
      status: 'Available',
      href: '/dashboard',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: TrendingUp,
      title: 'Waiver Wire Assistant',
      description: 'Find breakout candidates and FAAB bidding strategy',
      status: 'Coming Soon',
      href: '#',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      icon: Calculator,
      title: 'Trade Calculator',
      description: 'Quick trade value comparisons and recommendations',
      status: 'Coming Soon',
      href: '#',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      icon: Target,
      title: 'Player Projections',
      description: 'Custom projections with AI-enhanced analysis',
      status: 'Coming Soon',
      href: '#',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      icon: Users,
      title: 'League Analyzer',
      description: 'Opponent tendencies and league-specific insights',
      status: 'Coming Soon',
      href: '#',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      icon: Trophy,
      title: 'Playoff Simulator',
      description: 'Simulate playoff scenarios and championship odds',
      status: 'Coming Soon',
      href: '#',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Tools</h1>
          <p className="text-gray-600 mt-1">
            Powerful AI-driven tools to dominate your fantasy leagues
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <span className="text-sm font-medium">AI Powered</span>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, index) => {
          const IconComponent = tool.icon;
          return (
            <Card key={index} className="relative hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${tool.bgColor}`}>
                    <IconComponent className={`h-6 w-6 ${tool.color}`} />
                  </div>
                  <Badge 
                    variant={tool.status === 'Available' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {tool.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {tool.status === 'Available' ? (
                  <Link href={tool.href}>
                    <Button className="w-full">
                      Use Tool
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Coming Soon
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Access to Dashboard */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to optimize your lineup?</h3>
            <p className="text-gray-600 mb-4">
              Access all available AI tools directly from your dashboard.
            </p>
            <Link href="/dashboard">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}