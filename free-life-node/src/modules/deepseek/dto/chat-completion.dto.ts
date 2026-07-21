import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * AI 对话消息 DTO
 */
class ChatMessageDto {
  /**
   * 消息角色：system/user/assistant
   */
  @IsIn(['system', 'user', 'assistant'])
  role: 'system' | 'user' | 'assistant';

  /**
   * 消息内容
   */
  @IsString()
  @IsNotEmpty()
  content: string;
}

/**
 * 通用 Chat Completion 请求 DTO
 */
export class ChatCompletionDto {
  /**
   * 系统提示词，用于指定 AI 行为
   */
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  /**
   * 用户提示词（与 messages 二选一即可）
   */
  @IsOptional()
  @IsString()
  userPrompt?: string;

  /**
   * 自定义消息列表，可实现多轮对话
   */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  @IsArray()
  messages?: ChatMessageDto[];

  /**
   * 温度参数（0-2），越大越发散
   */
  @IsOptional()
  @IsNumber()
  temperature?: number;

  /**
   * 使用的模型名称，默认 deepseek-reasoner
   * deepseek-reasoner 对应 DeepSeek-V3.2-Exp 的思考模式
   */
  @IsOptional()
  @IsString()
  model?: string;
}
