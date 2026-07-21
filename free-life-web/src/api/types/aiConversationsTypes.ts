import { BasePageRequest } from "#/entity";

/**
 * AI 对话记录
 */
export type AiConversationItem = {
  /** ID */
  id: number;
  /** 策略类型 */
  strategyType: string;
  /** 策略ID */
  strategyId: number;
  /** 用户ID */
  userId: number;
  /** 交易对 */
  symbol: string;
  /** 发送给AI的完整prompt */
  prompt: string;
  /** AI返回的原始内容 */
  aiResponse: string;
  /** 解析后的决策JSON */
  decision: any;
  /** 执行结果 */
  executionResult: string;
  /** 错误信息 */
  errorMessage: string | null;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
};

/**
 * 查询 AI 对话参数
 */
export type QueryAiConversationsParams = {
  /** 策略类型（可选） */
  strategyType?: string;
  /** 策略ID（可选） */
  strategyId?: number;
  /** 用户ID（可选，管理员使用） */
  userId?: number;
  /** 交易对（可选） */
  symbol?: string;
  /** 执行结果（可选） */
  executionResult?: string;
} & BasePageRequest;
