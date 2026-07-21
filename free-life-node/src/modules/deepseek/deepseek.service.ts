import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ChatCompletionMessage {
  /** 消息角色：system、user 或 assistant */
  role: 'system' | 'user' | 'assistant';
  /** 消息内容 */
  content: string;
}

export interface CreateChatCompletionOptions {
  /** 系统提示词，用于指定 AI 行为 */
  systemPrompt?: string;
  /** 用户提示词快捷输入 */
  userPrompt?: string;
  /** 自定义消息列表，可组合多轮上下文 */
  messages?: ChatCompletionMessage[];
  /** 温度参数（0-2），控制输出随机性 */
  temperature?: number;
  /** 指定模型名称，默认 deepseek-reasoner */
  model?: string;
}

@Injectable()
export class DeepseekService implements OnModuleInit {
  private readonly logger = new Logger(DeepseekService.name);
  private openai: OpenAI | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (!apiKey) {
      this.logger.warn('DEEPSEEK_API_KEY 未配置，Deepseek 服务将无法使用');
      return;
    }

    this.openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey,
    });

    this.logger.log('Deepseek 服务初始化成功');
  }

  /**
   * 创建 Chat Completion
   * @param options Chat Completion 参数
   * @returns AI 返回的文本内容
   */
  async createChatCompletion(options: CreateChatCompletionOptions): Promise<string> {
    const client = this.ensureClient();

    const messages: ChatCompletionMessage[] = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    if (options.messages && options.messages.length > 0) {
      messages.push(...options.messages);
    }

    if (options.userPrompt) {
      messages.push({ role: 'user', content: options.userPrompt });
    }

    if (messages.length === 0) {
      throw new Error('缺少用于生成回复的消息内容');
    }

    /**
     * 打印消息
     */
    // this.logger.log("messages:",JSON.stringify(messages));

    const completion = await client.chat.completions.create({
      model: options.model ?? 'deepseek-reasoner',
      messages,
      temperature: options.temperature ?? 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('AI 返回内容为空');
    }

    return content;
  }

  private ensureClient(): OpenAI {
    if (!this.openai) {
      throw new Error('Deepseek API 未配置，无法调用 AI 能力');
    }
    return this.openai;
  }
}
