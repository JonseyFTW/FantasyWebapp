import axios, { AxiosInstance } from 'axios';
import { MCPTool, MCPToolCall, MCPResponse } from '../types/ai-providers';

export interface MCPClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
}

export class MCPClient {
  private client: AxiosInstance;
  private config: MCPClientConfig;
  private availableTools: MCPTool[] = [];

  constructor(config: MCPClientConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`MCP Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling and logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`MCP Response: ${response.status} for ${response.config.url}`);
        return response;
      },
      async (error) => {
        const { config: requestConfig } = error;
        
        // Retry logic for failed requests
        if (requestConfig && !requestConfig._retry && this.config.retries && this.config.retries > 0) {
          requestConfig._retry = true;
          requestConfig._retryCount = (requestConfig._retryCount || 0) + 1;
          
          if (requestConfig._retryCount <= this.config.retries) {
            console.log(`Retrying MCP request (${requestConfig._retryCount}/${this.config.retries})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * requestConfig._retryCount));
            return this.client(requestConfig);
          }
        }
        
        console.error('MCP Request failed:', error.message);
        return Promise.reject(error);
      }
    );
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing MCP client...');
      await this.loadAvailableTools();
      console.log(`MCP client initialized with ${this.availableTools.length} tools`);
    } catch (error) {
      console.error('Failed to initialize MCP client:', error);
      throw new Error('MCP client initialization failed');
    }
  }

  private async loadAvailableTools(): Promise<void> {
    try {
      // Get OpenRPC document to discover available methods
      const response = await this.client.get('/openrpc.json');
      const openRpcDoc = response.data;

      this.availableTools = openRpcDoc.methods?.map((method: any) => ({
        name: method.name,
        description: method.summary || method.description || `Execute ${method.name}`,
        inputSchema: {
          type: 'object',
          properties: method.params?.reduce((props: any, param: any) => {
            props[param.name] = {
              type: param.schema?.type || 'string',
              description: param.description || '',
              ...(param.schema?.enum && { enum: param.schema.enum }),
            };
            return props;
          }, {}) || {},
          required: method.params?.filter((p: any) => p.required).map((p: any) => p.name) || [],
        },
      })) || [];

      console.log('Available MCP tools:', this.availableTools.map(t => t.name));
    } catch (error) {
      console.error('Failed to load MCP tools:', error);
      // Fallback to hardcoded tools based on your MCP server
      this.availableTools = this.getDefaultSleeperTools();
    }
  }

  private getDefaultSleeperTools(): MCPTool[] {
    return [
      {
        name: 'get_nfl_state',
        description: 'Get current NFL state including week and season information',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_user',
        description: 'Get user information by username or user ID',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Sleeper username' },
          },
          required: ['username'],
        },
      },
      {
        name: 'get_user_leagues',
        description: 'Get all leagues for a specific user and season',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Sleeper user ID' },
            sport: { type: 'string', description: 'Sport (nfl, nba, etc.)', enum: ['nfl'] },
            season: { type: 'string', description: 'Season year (e.g., "2024")' },
          },
          required: ['user_id', 'sport', 'season'],
        },
      },
      {
        name: 'get_league',
        description: 'Get detailed league information',
        inputSchema: {
          type: 'object',
          properties: {
            league_id: { type: 'string', description: 'Sleeper league ID' },
          },
          required: ['league_id'],
        },
      },
      {
        name: 'get_league_rosters',
        description: 'Get all rosters in a league',
        inputSchema: {
          type: 'object',
          properties: {
            league_id: { type: 'string', description: 'Sleeper league ID' },
          },
          required: ['league_id'],
        },
      },
      {
        name: 'get_league_users',
        description: 'Get all users in a league',
        inputSchema: {
          type: 'object',
          properties: {
            league_id: { type: 'string', description: 'Sleeper league ID' },
          },
          required: ['league_id'],
        },
      },
      {
        name: 'get_league_matchups',
        description: 'Get matchups for a specific week in a league',
        inputSchema: {
          type: 'object',
          properties: {
            league_id: { type: 'string', description: 'Sleeper league ID' },
            week: { type: 'number', description: 'Week number (1-18)' },
          },
          required: ['league_id', 'week'],
        },
      },
      {
        name: 'get_players_nfl',
        description: 'Get all NFL players data',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_player_stats',
        description: 'Get player statistics for a specific season and week',
        inputSchema: {
          type: 'object',
          properties: {
            sport: { type: 'string', description: 'Sport (nfl)', enum: ['nfl'] },
            season: { type: 'string', description: 'Season year' },
            season_type: { type: 'string', description: 'regular or post', enum: ['regular', 'post'] },
            week: { type: 'number', description: 'Week number (optional for season stats)' },
            position: { type: 'string', description: 'Player position filter (optional)' },
          },
          required: ['sport', 'season', 'season_type'],
        },
      },
      {
        name: 'get_projections',
        description: 'Get player projections for a specific season and week',
        inputSchema: {
          type: 'object',
          properties: {
            sport: { type: 'string', description: 'Sport (nfl)', enum: ['nfl'] },
            season: { type: 'string', description: 'Season year' },
            week: { type: 'number', description: 'Week number' },
          },
          required: ['sport', 'season', 'week'],
        },
      },
    ];
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPResponse> {
    try {
      console.log(`Calling MCP tool: ${toolCall.name} with args:`, toolCall.arguments);
      
      const response = await this.client.post('/', {
        jsonrpc: '2.0',
        id: Date.now(),
        method: toolCall.name,
        params: toolCall.arguments,
      });

      if (response.data.error) {
        return {
          content: null,
          isError: true,
          errorMessage: response.data.error.message || 'Unknown MCP error',
        };
      }

      return {
        content: response.data.result,
        isError: false,
      };
    } catch (error) {
      console.error(`MCP tool call failed for ${toolCall.name}:`, error);
      return {
        content: null,
        isError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async callMultipleTools(toolCalls: MCPToolCall[]): Promise<MCPResponse[]> {
    const promises = toolCalls.map(toolCall => this.callTool(toolCall));
    return Promise.all(promises);
  }

  getAvailableTools(): MCPTool[] {
    return this.availableTools;
  }

  isToolAvailable(toolName: string): boolean {
    return this.availableTools.some(tool => tool.name === toolName);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch {
      try {
        // Fallback: try calling get_nfl_state as a health check
        const result = await this.callTool({ name: 'get_nfl_state', arguments: {} });
        return !result.isError;
      } catch {
        return false;
      }
    }
  }
}