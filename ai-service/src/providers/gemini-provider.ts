import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { BaseAIProvider, AIProvider, AIRequest, AIResponse, AIProviderConfig } from '../types/ai-providers';

export class GeminiProvider extends BaseAIProvider {
  private client: GoogleGenerativeAI;

  constructor(config: AIProviderConfig) {
    super(config, AIProvider.GEMINI);
    
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.config.model,
        generationConfig: {
          maxOutputTokens: request.maxTokens || 4000,
          temperature: request.temperature || 0.1,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      // Convert messages to Gemini format
      const systemMessages = request.messages.filter(msg => msg.role === 'system');
      const conversationMessages = request.messages.filter(msg => msg.role !== 'system');

      let prompt = '';
      if (systemMessages.length > 0) {
        prompt += systemMessages.map(msg => msg.content).join('\n') + '\n\n';
      }

      // Build conversation history
      const history: any[] = [];
      for (let i = 0; i < conversationMessages.length - 1; i += 2) {
        const userMsg = conversationMessages[i];
        const assistantMsg = conversationMessages[i + 1];
        
        if (userMsg && userMsg.role === 'user') {
          history.push({
            role: 'user',
            parts: [{ text: userMsg.content }],
          });
        }
        
        if (assistantMsg && assistantMsg.role === 'assistant') {
          history.push({
            role: 'model',
            parts: [{ text: assistantMsg.content }],
          });
        }
      }

      const lastMessage = conversationMessages[conversationMessages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new Error('Last message must be from user');
      }

      // Handle function calling if tools are provided
      if (request.tools && request.tools.length > 0) {
        const tools = request.tools.map(tool => ({
          function_declarations: [{
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          }],
        }));

        const modelWithTools = this.client.getGenerativeModel({
          model: this.config.model,
          tools,
        });

        const chat = modelWithTools.startChat({ history });
        const result = await chat.sendMessage(lastMessage.content);
        
        const response = await result.response;
        const text = response.text();
        
        // Parse function calls from response
        const toolCalls: any[] = [];
        if (response.functionCalls) {
          for (const functionCall of response.functionCalls()) {
            toolCalls.push({
              name: functionCall.name,
              parameters: functionCall.args,
            });
          }
        }

        return {
          content: text,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          usage: response.usageMetadata ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          } : undefined,
          finishReason: response.candidates?.[0]?.finishReason || undefined,
          provider: this.provider,
          model: this.config.model,
        };
      } else {
        // Simple text generation without tools
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastMessage.content);
        
        const response = await result.response;
        const text = response.text();

        return {
          content: text,
          usage: response.usageMetadata ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          } : undefined,
          finishReason: response.candidates?.[0]?.finishReason || undefined,
          provider: this.provider,
          model: this.config.model,
        };
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: this.config.model });
      const result = await model.generateContent('test');
      const response = await result.response;
      return !!response.text();
    } catch {
      return false;
    }
  }
}