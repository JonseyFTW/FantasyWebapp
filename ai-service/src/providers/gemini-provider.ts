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
        // Note: Current Gemini SDK version (0.2.1) has limited function calling support
        // Fall back to text-based instruction for tool usage
        const toolDescriptions = request.tools.map(tool => 
          `- ${tool.name}: ${tool.description}`
        ).join('\n');
        
        const enhancedPrompt = `${lastMessage.content}

AVAILABLE TOOLS:
${toolDescriptions}

If you need to use any tools, please respond with clear instructions about which tool to call and with what parameters. Format any tool calls as JSON objects with the tool name and parameters.`;

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(enhancedPrompt);
        
        const response = await result.response;
        const text = response.text();
        
        // Attempt to parse tool calls from text response
        const toolCalls: any[] = [];
        try {
          // Look for JSON-like patterns that might indicate tool calls
          const jsonPattern = /\{[^}]*"(name|tool|function)"\s*:\s*"([^"]+)"[^}]*\}/gi;
          const matches = text.match(jsonPattern);
          
          if (matches) {
            matches.forEach(match => {
              try {
                const parsed = JSON.parse(match);
                if (parsed.name || parsed.tool || parsed.function) {
                  toolCalls.push({
                    type: 'function',
                    function: {
                      name: parsed.name || parsed.tool || parsed.function,
                      arguments: JSON.stringify(parsed.parameters || parsed.args || {}),
                    },
                  });
                }
              } catch (e) {
                // Ignore parsing errors for individual matches
              }
            });
          }
        } catch (error) {
          // Tool call parsing failed, continue without tool calls
        }

        // Estimate token usage based on text length
        const estimatedPromptTokens = Math.ceil((enhancedPrompt.length + prompt.length) / 4);
        const estimatedCompletionTokens = Math.ceil(text.length / 4);
        const usage = {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
        };

        return {
          content: text,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          usage,
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

        // Estimate token usage based on text length (approximate: 1 token ≈ 4 characters)
        const estimatedPromptTokens = Math.ceil((lastMessage.content.length + prompt.length) / 4);
        const estimatedCompletionTokens = Math.ceil(text.length / 4);
        const usage = {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
        };

        return {
          content: text,
          usage,
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
    } catch (error) {
      console.error('Gemini health check error:', error instanceof Error ? error.message : error);
      return false;
    }
  }
}