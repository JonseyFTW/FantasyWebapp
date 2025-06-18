import axios, { AxiosInstance } from 'axios';

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
  team1UserId: string;
  team2UserId: string;
  team1Players: string[];
  team2Players: string[];
  requestingUserId: string;
  tradeContext?: {
    deadline?: string;
    keepers?: boolean;
    dynastyLeague?: boolean;
    needAnalysis?: string;
  };
  preferredProvider?: 'openai' | 'claude' | 'gemini';
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

  constructor(baseURL: string = process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:5000') {
    this.client = axios.create({
      baseURL: `${baseURL}/ai`,
      timeout: 60000, // 60 seconds for AI operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`AI Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`AI Response: ${response.status} - ${response.data?.metadata?.processingTime}ms`);
        return response;
      },
      (error) => {
        console.error('AI Request failed:', error.message);
        if (error.response?.data) {
          return Promise.reject(new Error(error.response.data.error?.message || 'AI service error'));
        }
        return Promise.reject(error);
      }
    );
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