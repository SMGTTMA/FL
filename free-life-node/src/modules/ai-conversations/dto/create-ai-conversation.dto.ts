/**
 * 创建AI对话记录DTO
 */
export class CreateAiConversationDto {
  /** AI 功能类型 */
  strategyType: string;

  /** 关联的策略ID */
  strategyId: number;

  /** 关联的用户ID */
  userId: number;

  /** 交易对 */
  symbol: string;

  /** 发送给AI的完整prompt */
  prompt: string;

  /** AI返回的原始内容 */
  aiResponse: string;

  /** 解析后的决策JSON（可选） */
  decision?: object;

  /** 执行结果：success/failed/skipped/no_action（可选） */
  executionResult?: string;

  /** 错误信息（可选） */
  errorMessage?: string;
}
