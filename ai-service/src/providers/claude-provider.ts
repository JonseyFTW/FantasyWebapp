import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider, AIProvider, AIRequest, AIResponse, AIProviderConfig } from '../types/ai-providers';

export class ClaudeProvider extends BaseAIProvider {
  private client: Anthropic;

  constructor(config: AIProviderConfig) {
    super(config, AIProvider.CLAUDE);
    
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
    });
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    try {
      // Separate system messages from user/assistant messages
      const systemMessages = request.messages.filter(msg => msg.role === 'system');
      const conversationMessages = request.messages.filter(msg => msg.role !== 'system');

      const systemPrompt = systemMessages.map(msg => msg.content).join('\n');

      const messages: Anthropic.Messages.MessageParam[] = conversationMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

      const tools: Anthropic.Tool[] | undefined = request.tools?.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      }));

      const response = await this.client.messages.create({
        model: this.config.model,
        system: systemPrompt || undefined,
        messages,
        tools: tools?.length ? tools : undefined,
        max_tokens: request.maxTokens || 4000,
        temperature: request.temperature || 0.1,
      });

      let content = '';
      const toolCalls: any[] = [];

      for (const block of response.content) {
        if (block.type === 'text') {
          content += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            name: block.name,
            parameters: block.input,
          });
        }
      }

      return {
        content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: response.usage ? {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        } : undefined,
        finishReason: response.stop_reason || undefined,
        provider: this.provider,
        model: this.config.model,
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });
      return !!response.content[0];
    } catch (error) {
      console.error('Claude health check error:', error instanceof Error ? error.message : error);
      return false;
    }
  }
}