import axios, { AxiosInstance } from 'axios';
import { getSession } from 'next-auth/react';

export interface StartSitRequest {
  userId: string;
  leagueId: string;
  week: number;
  playerIds: string[];
  rosterSlots: string[];
  userPreferences?: {
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
    prioritizeUpside?: boolean;
    avoidInjuredPlayers?: boolean;
  };
  preferredProvider?: 'openai' | 'claude' | 'gemini';
}

export interface TradeRequest {
  leagueId: string;
  week: number;
  team1Players: {
    give: string[];
    receive: string[];
  };
  team2Players: {
    give: string[];
    receive: string[];
  };
  userPreferences?: {
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
    favorLongTerm?: boolean;
    prioritizePosition?: string;
  };
}

export interface WaiverWireRequest {
  userId: string;
  leagueId: string;
  week: number;
  budget?: number;
  currentRoster: string[];
  rosterNeeds?: string[];
  userPreferences?: {
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
    focusOnUpside?: boolean;
    prioritizeImmediateHelp?: boolean;
    maxBidPercentage?: number;
  };
  preferredProvider?: 'openai' | 'claude' | 'gemini';
}

export interface LineupOptimizerRequest {
  userId: string;
  leagueId: string;
  week: number;
  availablePlayers: string[];
  rosterSlots: string[];
  userPreferences?: {
    riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
    prioritizeFloor?: boolean;
    stackPreference?: 'qb_wr' | 'qb_te' | 'none';
    avoidOpponents?: boolean;
    weatherConcerns?: boolean;
  };
  constraints?: {
    mustStart?: string[];
    cannotStart?: string[];
    maxPlayersPerTeam?: number;
    minProjectedPoints?: number;
  };
  preferredProvider?: 'openai' | 'claude' | 'gemini';
}

export interface QuickAnalysisRequest {
  playerId: string;
  leagueId: string;
  week: number;
  analysisType: 'start_sit' | 'waiver_pickup' | 'trade_value';
  preferredProvider?: 'openai' | 'claude' | 'gemini';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    requestId: string;
    version: string;
    processingTime?: number;
  };
}

export class AIClient {
  private client: AxiosInstance;
  private tokenCache: { token: string; expires: number; userId: string } | null = null;
  private baseUrl: string;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000') {
    this.baseUrl = baseURL;
    this.client = axios.create({
      baseURL: `${baseURL}/api/ai`,
      timeout: 60000, // 60 seconds for AI operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use(
      async (config) => {
        console.log(`AI Request: ${config.method?.toUpperCase()} ${config.url}`);
        try {
          const token = await this.getBackendJWT();
          config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
          console.error('Failed to get authentication token:', error);
          throw error;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor with authentication retry
    this.client.interceptors.response.use(
      (response) => {
        console.log(`AI Response: ${response.status} - ${response.data?.metadata?.processingTime}ms`);
        return response;
      },
      async (error) => {
        console.error('AI Request failed:', error.message);
        
        // If we get a 401, clear the token cache and retry once
        if (error.response?.status === 401 && this.tokenCache) {
          console.log('Got 401, clearing token cache and retrying...');
          this.tokenCache = null;
          
          try {
            const token = await this.getBackendJWT();
            error.config.headers.Authorization = `Bearer ${token}`;
            return this.client.request(error.config);
          } catch (authError) {
            console.error('Authentication retry failed:', authError);
            return Promise.reject(new Error('Authentication failed'));
          }
        }
        
        if (error.response?.data) {
          return Promise.reject(new Error(error.response.data.error?.message || 'AI service error'));
        }
        return Promise.reject(error);
      }
    );
  }

  private async getBackendJWT(): Promise<string> {
    // Check if we have a valid cached token
    if (this.tokenCache && this.tokenCache.expires > Date.now()) {
      return this.tokenCache.token;
    }

    // Get NextAuth session
    const session = await getSession();
    if (!session?.user?.email) {
      throw new Error('No valid session found');
    }

    // Exchange NextAuth session for backend JWT
    const response = await fetch(`${this.baseUrl}/api/auth/token-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail: session.user.email,
        userId: (session.user as any).id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get backend JWT: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.data?.token) {
      throw new Error('Invalid token response from backend');
    }

    // Cache the token (assuming 1 hour expiry for safety)
    this.tokenCache = {
      token: data.data.token,
      userId: data.data.user.id,
      expires: Date.now() + (60 * 60 * 1000), // 1 hour
    };

    return data.data.token;
  }

  async analyzeStartSit(request: StartSitRequest): Promise<any> {
    const response = await this.client.post<ApiResponse>('/start-sit', request);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Start/Sit analysis failed');
    }
    return response.data.data;
  }

  async analyzeTrade(request: TradeRequest): Promise<any> {
    const response = await this.client.post<ApiResponse>('/trade-analysis', request);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Trade analysis failed');
    }
    return response.data.data;
  }

  async analyzeWaiverWire(request: WaiverWireRequest): Promise<any> {
    const response = await this.client.post<ApiResponse>('/waiver-wire', request);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Waiver wire analysis failed');
    }
    return response.data.data;
  }

  async optimizeLineup(request: LineupOptimizerRequest): Promise<any> {
    const response = await this.client.post<ApiResponse>('/lineup-optimizer', request);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Lineup optimization failed');
    }
    return response.data.data;
  }

  async getQuickAnalysis(request: QuickAnalysisRequest): Promise<any> {
    const response = await this.client.post<ApiResponse>('/quick-analysis', request);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Quick analysis failed');
    }
    return response.data.data;
  }

  async getStreamingRecommendations(
    position: 'DEF' | 'K' | 'QB',
    leagueId: string,
    week: number,
    preferredProvider?: 'openai' | 'claude' | 'gemini'
  ): Promise<any> {
    const params = preferredProvider ? { provider: preferredProvider } : {};
    const response = await this.client.get<ApiResponse>(
      `/streaming/${position}/${leagueId}/${week}`,
      { params }
    );
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Streaming recommendations failed');
    }
    return response.data.data;
  }

  async getServiceStatus(): Promise<any> {
    const response = await this.client.get<ApiResponse>('/status');
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Status check failed');
    }
    return response.data.data;
  }
}

// Singleton instance
export const aiClient = new AIClient();