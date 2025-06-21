import { AIProvider } from '../types/ai-providers';
import { AIManagerConfig } from '../services/ai-manager';

export function createAIConfig(): AIManagerConfig {
  // MCP server is optional - service can work without it
  const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';
  
  if (!process.env.MCP_SERVER_URL) {
    console.log('⚠️  MCP_SERVER_URL not set, using default: http://localhost:3001');
    console.log('⚠️  For Railway deployment, set MCP_SERVER_URL to your deployed MCP service URL');
    console.log('⚠️  MCP features will be limited without a proper MCP server connection');
  }

  // Provider configurations
  const providers: any = {};

  // OpenAI configuration
  if (process.env.OPENAI_API_KEY) {
    providers[AIProvider.OPENAI] = {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000'),
    };
  }

  // Claude configuration
  if (process.env.ANTHROPIC_API_KEY) {
    providers[AIProvider.CLAUDE] = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      maxRetries: parseInt(process.env.ANTHROPIC_MAX_RETRIES || '3'),
      timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || '30000'),
    };
  }

  // Gemini configuration
  if (process.env.GEMINI_API_KEY) {
    providers[AIProvider.GEMINI] = {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3'),
      timeout: parseInt(process.env.GEMINI_TIMEOUT || '30000'),
    };
  }

  // Ensure at least one provider is configured
  const availableProviders = Object.keys(providers);
  if (availableProviders.length === 0) {
    throw new Error('At least one AI provider must be configured (OpenAI, Claude, or Gemini)');
  }

  // Determine default and fallback providers
  const defaultProvider = getDefaultProvider(availableProviders);
  const fallbackProviders = availableProviders
    .filter(p => p !== defaultProvider)
    .map(p => p as AIProvider);

  console.log(`AI Config: Default provider: ${defaultProvider}, Fallbacks: ${fallbackProviders.join(', ')}`);

  return {
    providers,
    defaultProvider,
    fallbackProviders,
    mcpConfig: {
      baseURL: mcpServerUrl,
      timeout: parseInt(process.env.MCP_SERVER_TIMEOUT || '30000'),
      retries: parseInt(process.env.MCP_SERVER_RETRIES || '3'),
    },
    redis: process.env.REDIS_URL ? {
      host: getRedisHost(),
      port: getRedisPort(),
      password: getRedisPassword(),
    } : undefined,
    caching: {
      enabled: process.env.CACHE_ENABLED !== 'false',
      defaultTTL: parseInt(process.env.CACHE_TTL_SECONDS || '3600'),
    },
  };
}

function getDefaultProvider(availableProviders: string[]): AIProvider {
  const preferred = process.env.DEFAULT_AI_PROVIDER as AIProvider;
  
  if (preferred && availableProviders.includes(preferred)) {
    return preferred;
  }

  // Default priority: Claude > OpenAI > Gemini
  if (availableProviders.includes(AIProvider.CLAUDE)) {
    return AIProvider.CLAUDE;
  }
  if (availableProviders.includes(AIProvider.OPENAI)) {
    return AIProvider.OPENAI;
  }
  return availableProviders[0] as AIProvider;
}

function getRedisHost(): string {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return url.hostname;
    } catch {
      // Fallback to simple parsing
      const match = redisUrl.match(/redis:\/\/[^:]*:?[^@]*@?([^:]+)/);
      return match ? match[1] : 'localhost';
    }
  }
  return process.env.REDIS_HOST || 'localhost';
}

function getRedisPort(): number {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return parseInt(url.port) || 6379;
    } catch {
      // Fallback to simple parsing
      const match = redisUrl.match(/:(\d+)/);
      return match ? parseInt(match[1]) : 6379;
    }
  }
  return parseInt(process.env.REDIS_PORT || '6379');
}

function getRedisPassword(): string | undefined {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return url.password || undefined;
    } catch {
      // Fallback to simple parsing
      const match = redisUrl.match(/redis:\/\/[^:]*:([^@]+)@/);
      return match ? match[1] : undefined;
    }
  }
  return process.env.REDIS_PASSWORD;
}

export const AI_MODELS = {
  [AIProvider.OPENAI]: {
    'gpt-4o': { contextWindow: 128000, costPer1kTokens: 0.0025 },
    'gpt-4o-mini': { contextWindow: 128000, costPer1kTokens: 0.00015 },
    'gpt-4-turbo': { contextWindow: 128000, costPer1kTokens: 0.01 },
    'gpt-3.5-turbo': { contextWindow: 16384, costPer1kTokens: 0.001 },
  },
  [AIProvider.CLAUDE]: {
    'claude-3-5-sonnet-20241022': { contextWindow: 200000, costPer1kTokens: 0.003 },
    'claude-3-5-haiku-20241022': { contextWindow: 200000, costPer1kTokens: 0.00025 },
    'claude-3-opus-20240229': { contextWindow: 200000, costPer1kTokens: 0.015 },
  },
  [AIProvider.GEMINI]: {
    'gemini-1.5-flash': { contextWindow: 1048576, costPer1kTokens: 0.000075 },
    'gemini-1.5-pro': { contextWindow: 2097152, costPer1kTokens: 0.00125 },
    'gemini-pro': { contextWindow: 32768, costPer1kTokens: 0.0005 },
  },
} as const;