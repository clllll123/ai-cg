import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Interface for AI Service response
 */
export interface AIResponse {
  content: string;
  usage?: {
    totalTokens: number;
  };
}

/**
 * Abstract AI Service class to support multiple providers
 */
export abstract class AIService {
  abstract generateText(prompt: string, systemPrompt?: string): Promise<AIResponse>;
}

/**
 * DeepSeek AI Service Implementation (OpenAI Compatible)
 */
export class DeepSeekService extends AIService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    super();
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  }

  async generateText(prompt: string, systemPrompt: string = 'You are a helpful assistant.'): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API Key is missing');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        content: response.data.choices[0].message.content,
        usage: {
          totalTokens: response.data.usage.total_tokens
        }
      };
    } catch (error: any) {
      console.error('DeepSeek API Error:', error.response?.data || error.message);
      throw new Error('Failed to generate text from DeepSeek');
    }
  }
}

/**
 * Aliyun DashScope (Qwen) Service Implementation
 */
export class DashScopeService extends AIService {
  private apiKey: string;
  private model: string;

  constructor() {
    super();
    this.apiKey = process.env.DASHSCOPE_API_KEY || '';
    this.model = process.env.DASHSCOPE_MODEL || 'qwen-turbo';
  }

  async generateText(prompt: string, systemPrompt: string = ''): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('DashScope API Key is missing');
    }

    try {
      const response = await axios.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          model: this.model,
          input: {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ]
          },
          parameters: {
            result_format: 'message'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.output && response.data.output.choices) {
        return {
          content: response.data.output.choices[0].message.content,
          usage: {
            totalTokens: response.data.usage?.total_tokens || 0
          }
        };
      } else {
        throw new Error('Invalid response from DashScope');
      }
    } catch (error: any) {
      console.error('DashScope API Error:', error.response?.data || error.message);
      throw new Error('Failed to generate text from DashScope');
    }
  }
}

// Factory to get the configured service
export const getAIService = (): AIService => {
  const provider = process.env.AI_PROVIDER || 'deepseek';
  if (provider === 'dashscope') {
    return new DashScopeService();
  }
  return new DeepSeekService();
};
