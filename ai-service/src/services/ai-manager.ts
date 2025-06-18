import { Redis } from 'ioredis';
import { BaseAIProvider, AIProvider, AIRequest, AIResponse, ProviderConfigs, AITool } from '../types/ai-providers';
import { OpenAIProvider } from '../providers/openai-provider';
import { ClaudeProvider } from '../providers/claude-provider';
import { GeminiProvider } from '../providers/gemini-provider';
import { MCPClient } from './mcp-client';

export interface AIManagerConfig {
  providers: ProviderConfigs;
  defaultProvider: AIProvider;
  fallbackProviders: AIProvider[];
  mcpConfig: {
    baseURL: string;
    timeout?: number;
    retries?: number;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  caching?: {
    enabled: boolean;
    defaultTTL: number;
  };
}

export class AIManager {
  private providers: Map<AIProvider, BaseAIProvider> = new Map();
  private mcpClient: MCPClient;
  private redis?: Redis;
  private config: AIManagerConfig;

  constructor(config: AIManagerConfig) {
    this.config = config;
    this.initializeProviders();
    this.mcpClient = new MCPClient(config.mcpConfig);
    
    if (config.redis && config.caching?.enabled) {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      });
    }
  }

  private initializeProviders(): void {
    // Initialize OpenAI provider
    if (this.config.providers[AIProvider.OPENAI]) {
      this.providers.set(
        AIProvider.OPENAI,
        new OpenAIProvider(this.config.providers[AIProvider.OPENAI])
      );
    }

    // Initialize Claude provider
    if (this.config.providers[AIProvider.CLAUDE]) {
      this.providers.set(
        AIProvider.CLAUDE,
        new ClaudeProvider(this.config.providers[AIProvider.CLAUDE])
      );
    }

    // Initialize Gemini provider
    if (this.config.providers[AIProvider.GEMINI]) {
      this.providers.set(
        AIProvider.GEMINI,
        new GeminiProvider(this.config.providers[AIProvider.GEMINI])
      );
    }
  }

  async initialize(): Promise<void> {
    console.log('Initializing AI Manager...');
    
    // Initialize MCP client
    await this.mcpClient.initialize();
    
    // Test provider connectivity
    const providerHealthChecks = Array.from(this.providers.entries()).map(
      async ([providerType, provider]) => {
        try {
          const isHealthy = await provider.isHealthy();
          console.log(`${providerType} provider health check: ${isHealthy ? 'PASS' : 'FAIL'}`);
          return { provider: providerType, healthy: isHealthy };
        } catch (error) {
          console.error(`${providerType} provider health check failed:`, error);
          return { provider: providerType, healthy: false };
        }
      }
    );

    const healthResults = await Promise.all(providerHealthChecks);
    const healthyProviders = healthResults.filter(result => result.healthy);

    if (healthyProviders.length === 0) {
      throw new Error('No healthy AI providers available');
    }

    console.log(`AI Manager initialized with ${healthyProviders.length} healthy providers`);
  }

  async chat(
    request: AIRequest,
    preferredProvider?: AIProvider,
    enableMCP: boolean = true
  ): Promise<AIResponse> {
    const cacheKey = this.generateCacheKey(request, preferredProvider);
    
    // Try to get cached response
    if (this.redis && this.config.caching?.enabled) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          console.log('Returning cached AI response');
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Cache read failed:', error);
      }
    }

    // Add MCP tools if enabled
    if (enableMCP) {
      const mcpTools = this.mcpClient.getAvailableTools();
      const aiTools: AITool[] = mcpTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      }));
      
      request.tools = [...(request.tools || []), ...aiTools];
    }

    const providersToTry = this.getProvidersInOrder(preferredProvider);
    let lastError: Error | null = null;

    for (const providerType of providersToTry) {
      const provider = this.providers.get(providerType);
      if (!provider) continue;

      try {
        console.log(`Attempting AI request with ${providerType} provider`);
        let response = await provider.chat(request);

        // Handle tool calls if present
        if (response.toolCalls && response.toolCalls.length > 0 && enableMCP) {
          response = await this.handleToolCalls(response, request, provider);
        }

        // Cache successful response
        if (this.redis && this.config.caching?.enabled) {
          try {
            await this.redis.setex(
              cacheKey,
              this.config.caching.defaultTTL,
              JSON.stringify(response)
            );
          } catch (error) {
            console.warn('Cache write failed:', error);
          }
        }

        console.log(`AI request successful with ${providerType} provider`);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`${providerType} provider failed:`, lastError.message);
        continue;
      }
    }

    throw lastError || new Error('All AI providers failed');
  }

  private async handleToolCalls(
    response: AIResponse,
    originalRequest: AIRequest,
    provider: BaseAIProvider
  ): Promise<AIResponse> {
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return response;
    }

    console.log(`Executing ${response.toolCalls.length} tool calls`);
    
    // Execute MCP tool calls
    const toolResults = await this.mcpClient.callMultipleTools(
      response.toolCalls.map(tc => ({ name: tc.name, arguments: tc.parameters }))
    );

    // Create follow-up request with tool results
    const toolResultsMessage = {
      role: 'user' as const,
      content: `Tool execution results:\n${toolResults.map((result, i) => {
        const toolCall = response.toolCalls![i];
        if (result.isError) {
          return `${toolCall.name}: Error - ${result.errorMessage}`;
        }
        return `${toolCall.name}: ${JSON.stringify(result.content, null, 2)}`;
      }).join('\n\n')}\n\nPlease analyze these results and provide insights.`,
    };

    const followUpRequest: AIRequest = {
      messages: [...originalRequest.messages, 
        { role: 'assistant', content: response.content },
        toolResultsMessage
      ],
      maxTokens: originalRequest.maxTokens,
      temperature: originalRequest.temperature,
    };

    // Get final response with tool results analyzed
    const finalResponse = await provider.chat(followUpRequest);
    
    return {
      ...finalResponse,
      toolCalls: response.toolCalls, // Keep original tool calls for reference
    };
  }

  private getProvidersInOrder(preferredProvider?: AIProvider): AIProvider[] {
    const providers: AIProvider[] = [];
    
    // Add preferred provider first if specified and available
    if (preferredProvider && this.providers.has(preferredProvider)) {
      providers.push(preferredProvider);
    }
    
    // Add default provider if not already included
    if (!providers.includes(this.config.defaultProvider) && 
        this.providers.has(this.config.defaultProvider)) {
      providers.push(this.config.defaultProvider);
    }
    
    // Add fallback providers
    for (const provider of this.config.fallbackProviders) {
      if (!providers.includes(provider) && this.providers.has(provider)) {
        providers.push(provider);
      }
    }
    
    return providers;
  }

  private generateCacheKey(request: AIRequest, preferredProvider?: AIProvider): string {
    const keyData = {
      messages: request.messages,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      provider: preferredProvider || this.config.defaultProvider,
    };
    
    const hash = require('crypto')
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
    
    return `ai_response:${hash.substring(0, 16)}`;
  }

  async getProviderStatus(): Promise<Record<AIProvider, boolean>> {
    const status: Record<string, boolean> = {};
    
    for (const [providerType, provider] of this.providers.entries()) {
      try {
        status[providerType] = await provider.isHealthy();
      } catch {
        status[providerType] = false;
      }
    }
    
    return status as Record<AIProvider, boolean>;
  }

  async getMCPStatus(): Promise<boolean> {
    return this.mcpClient.healthCheck();
  }

  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  getAvailableTools(): string[] {
    return this.mcpClient.getAvailableTools().map(tool => tool.name);
  }

  async destroy(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}