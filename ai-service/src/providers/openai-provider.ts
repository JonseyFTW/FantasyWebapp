import OpenAI from 'openai';
import { BaseAIProvider, AIProvider, AIRequest, AIResponse, AIProviderConfig } from '../types/ai-providers';

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;

  constructor(config: AIProviderConfig) {
    super(config, AIProvider.OPENAI);
    
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
    });
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = request.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const tools: OpenAI.Chat.Completions.ChatCompletionTool[] | undefined = request.tools?.map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));

      const completion = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        tools: tools?.length ? tools : undefined,
        tool_choice: tools?.length ? 'auto' : undefined,
        max_tokens: request.maxTokens || 4000,
        temperature: request.temperature || 0.1,
        stream: false,
      });

      const choice = completion.choices[0];
      if (!choice) {
        throw new Error('No completion choice returned from OpenAI');
      }

      const toolCalls = choice.message.tool_calls?.map(toolCall => ({
        name: toolCall.function.name,
        parameters: JSON.parse(toolCall.function.arguments),
      }));

      return {
        content: choice.message.content || '',
        toolCalls,
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        } : undefined,
        finishReason: choice.finish_reason || undefined,
        provider: this.provider,
        model: this.config.model,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });
      return !!response.choices[0];
    } catch (error) {
      console.error('OpenAI health check error:', error instanceof Error ? error.message : error);
      return false;
    }
  }
}