import { z } from 'zod';

export enum AIProvider {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  GEMINI = 'gemini'
}

export const AIProviderSchema = z.nativeEnum(AIProvider);

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIToolCall {
  name: string;
  parameters: Record<string, any>;
}

export interface AIResponse {
  content: string;
  toolCalls?: AIToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  provider: AIProvider;
  model: string;
}

export interface AITool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface AIRequest {
  messages: AIMessage[];
  tools?: AITool[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface ProviderConfigs {
  [AIProvider.OPENAI]: AIProviderConfig;
  [AIProvider.CLAUDE]: AIProviderConfig;
  [AIProvider.GEMINI]: AIProviderConfig;
}

export abstract class BaseAIProvider {
  protected config: AIProviderConfig;
  public readonly provider: AIProvider;

  constructor(config: AIProviderConfig, provider: AIProvider) {
    this.config = config;
    this.provider = provider;
  }

  abstract chat(request: AIRequest): Promise<AIResponse>;
  abstract isHealthy(): Promise<boolean>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPResponse {
  content: any;
  isError?: boolean;
  errorMessage?: string;
}