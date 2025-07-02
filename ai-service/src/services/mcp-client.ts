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
  private toolNameMapping: Map<string, string> = new Map(); // AI provider name -> MCP name
  private reverseToolNameMapping: Map<string, string> = new Map(); // MCP name -> AI provider name

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

      this.availableTools = openRpcDoc.methods?.map((method: any) => {
        const mcpToolName = method.name;
        const aiProviderToolName = this.convertToAIProviderName(mcpToolName);
        
        // Store mapping for later conversion
        this.toolNameMapping.set(aiProviderToolName, mcpToolName);
        this.reverseToolNameMapping.set(mcpToolName, aiProviderToolName);
        
        return {
          name: aiProviderToolName, // Use AI provider compatible name
          description: method.summary || method.description || `Execute ${method.name}`,
          inputSchema: {
            type: 'object' as const,
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
        };
      }) || [];

      console.log('Available MCP tools (AI provider names):', this.availableTools.map(t => t.name));
      console.log('Tool name mappings:', Object.fromEntries(this.toolNameMapping));
    } catch (error) {
      console.error('Failed to load MCP tools:', error);
      // Fallback to hardcoded tools based on your MCP server
      this.availableTools = this.getDefaultSleeperTools();
    }
  }

  /**
   * Convert MCP tool name to AI provider compatible name
   * Replace dots with underscores to match pattern ^[a-zA-Z0-9_-]+$
   */
  private convertToAIProviderName(mcpToolName: string): string {
    return mcpToolName.replace(/\./g, '_');
  }

  /**
   * Convert AI provider tool name back to MCP tool name
   */
  private convertToMCPName(aiProviderToolName: string): string {
    return this.toolNameMapping.get(aiProviderToolName) || aiProviderToolName;
  }

  private getDefaultSleeperTools(): MCPTool[] {
    const defaultTools = [
      {
        name: 'sleeper.getNFLState',
        description: 'Get current NFL state including week and season information',
        inputSchema: {
          type: 'object' as const,
          properties: {},
          required: [],
        },
      },
      {
        name: 'sleeper.getUserByUsername',
        description: 'Get user information by username',
        inputSchema: {
          type: 'object' as const,
          properties: {
            username: { type: 'string', description: 'Sleeper username' },
          },
          required: ['username'],
        },
      },
      {
        name: 'sleeper.getUserById',
        description: 'Get user information by user ID',
        inputSchema: {
          type: 'object' as const,
          properties: {
            userId: { type: 'string', description: 'Sleeper user ID' },
          },
          required: ['userId'],
        },
      },
      {
        name: 'sleeper.getLeaguesForUser',
        description: 'Get all leagues for a specific user and season',
        inputSchema: {
          type: 'object' as const,
          properties: {
            userId: { type: 'string', description: 'Sleeper user ID' },
            sport: { type: 'string', description: 'Sport (nfl, nba, etc.)', enum: ['nfl'] },
            season: { type: 'string', description: 'Season year (e.g., "2024")' },
          },
          required: ['userId', 'sport', 'season'],
        },
      },
      {
        name: 'sleeper.getLeague',
        description: 'Get detailed league information',
        inputSchema: {
          type: 'object' as const,
          properties: {
            leagueId: { type: 'string', description: 'Sleeper league ID' },
          },
          required: ['leagueId'],
        },
      },
      {
        name: 'sleeper.getRosters',
        description: 'Get all rosters in a league',
        inputSchema: {
          type: 'object' as const,
          properties: {
            leagueId: { type: 'string', description: 'Sleeper league ID' },
          },
          required: ['leagueId'],
        },
      },
      {
        name: 'sleeper.getUsers',
        description: 'Get all users in a league',
        inputSchema: {
          type: 'object' as const,
          properties: {
            leagueId: { type: 'string', description: 'Sleeper league ID' },
          },
          required: ['leagueId'],
        },
      },
      {
        name: 'sleeper.getMatchups',
        description: 'Get matchups for a specific week in a league',
        inputSchema: {
          type: 'object' as const,
          properties: {
            leagueId: { type: 'string', description: 'Sleeper league ID' },
            week: { type: 'number', description: 'Week number (1-18)' },
          },
          required: ['leagueId', 'week'],
        },
      },
      {
        name: 'sleeper.getAllPlayers',
        description: 'Get all NFL players data',
        inputSchema: {
          type: 'object' as const,
          properties: {
            sport: { type: 'string', description: 'Sport (default: nfl)', enum: ['nfl'] },
          },
          required: [],
        },
      },
      {
        name: 'sleeper.getTrendingPlayers',
        description: 'Get trending players (adds/drops)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            sport: { type: 'string', description: 'Sport (default: nfl)', enum: ['nfl'] },
            type: { type: 'string', description: 'Trending type: add or drop', enum: ['add', 'drop'] },
            lookback: { type: 'number', description: 'Lookback hours (1-48)' },
            limit: { type: 'number', description: 'Result limit (1-200)' },
          },
          required: [],
        },
      },
    ];

    // Create mappings for default tools
    return defaultTools.map(tool => {
      const aiProviderToolName = this.convertToAIProviderName(tool.name);
      this.toolNameMapping.set(aiProviderToolName, tool.name);
      this.reverseToolNameMapping.set(tool.name, aiProviderToolName);
      
      return {
        ...tool,
        name: aiProviderToolName, // Use AI provider compatible name
      };
    });
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPResponse> {
    try {
      // Convert AI provider tool name back to MCP tool name
      const mcpToolName = this.convertToMCPName(toolCall.name);
      console.log(`Calling MCP tool: ${mcpToolName} (from AI provider name: ${toolCall.name}) with args:`, toolCall.arguments);
      
      const response = await this.client.post('/rpc', {
        jsonrpc: '2.0',
        id: Date.now(),
        method: mcpToolName, // Use original MCP tool name
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
        // Fallback: try calling sleeper_getNFLState as a health check
        const result = await this.callTool({ name: 'sleeper_getNFLState', arguments: {} });
        return !result.isError;
      } catch {
        return false;
      }
    }
  }
}