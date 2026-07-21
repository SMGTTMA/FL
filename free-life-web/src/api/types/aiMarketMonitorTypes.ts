import type { BasePageDTO } from "#/entity";

/**
 * AI 市场监控模块类型定义
 */

/**
 * 监控周期
 */
export type AiMarketMonitorCheckInterval =
  | "5m"
  | "30m"
  | "1h"
  | "4h"
  | "1d"
  | "1w";

/**
 * 创建规则参数
 */
export type CreateAiMarketMonitorRuleParams = {
  /** 交易对 */
  symbol: string;
  /** 交易所配置ID */
  exchangeConfigId: number;
  /** 监控指令 */
  instruction: string;
  /** 监控周期 */
  checkInterval: AiMarketMonitorCheckInterval;
  /** K线窗口 */
  klineWindow?: number;
  /** 是否重复监听 */
  repeatMonitor?: boolean;
};

/**
 * 规则列表项
 */
export type AiMarketMonitorRuleItem = {
  /** 规则ID */
  ruleId: number;
  /** 交易对 */
  symbol: string;
  /** 监控指令 */
  instruction: string;
  /** 监控周期 */
  checkInterval: AiMarketMonitorCheckInterval;
  /** K线窗口 */
  klineWindow: number | null;
  /** 是否重复监听 */
  repeatMonitor: boolean;
  /** 交易所配置ID */
  exchangeConfigId: number;
  /** 状态：1-运行中，0-已停止 */
  status: number;
  /** 最后检查时间 */
  lastCheckAt: string | null;
  /** 最后命中时间 */
  lastTriggerAt: string | null;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
};

/**
 * 通知状态
 */
export type AiMarketMonitorNotifyStatus =
  | "not_needed"
  | "success"
  | "failed"
  | "data_insufficient"
  | "config_invalid"
  | "skipped_not_due";

/**
 * 日志列表查询参数
 */
export type AiMarketMonitorLogListParams = {
  /** 页码，最小 1 */
  page?: number;
  /** 每页条数，最小 1 */
  pageSize?: number;
  /** 规则 ID */
  ruleId?: number;
  /** 交易对，如 BTC/USDT */
  symbol?: string;
  /** 监控周期 */
  checkInterval?: AiMarketMonitorCheckInterval;
  /** 是否命中：0 未命中，1 命中 */
  isTriggered?: 0 | 1;
  /** 通知状态 */
  notifyStatus?: AiMarketMonitorNotifyStatus;
};

/**
 * AI 决策信息
 */
export type AiMarketMonitorDecision = {
  /** 是否命中 */
  matched?: boolean;
  /** 置信度 */
  confidence?: number;
  /** 原因 */
  reason?: string;
  /** 扩展字段 */
  [key: string]: unknown;
};

/**
 * 监控日志列表项
 */
export type AiMarketMonitorLogItem = {
  /** 日志 ID */
  id: number;
  /** 规则 ID */
  ruleId: number;
  /** 交易对 */
  symbol: string;
  /** 监控周期 */
  checkInterval: AiMarketMonitorCheckInterval;
  /** 检查时间 */
  checkTime: string;
  /** Prompt */
  prompt: string;
  /** AI 响应 */
  aiResponse: string;
  /** 决策 */
  decision: AiMarketMonitorDecision | null;
  /** 是否命中 */
  isTriggered: 0 | 1;
  /** 命中原因 */
  triggerReason: string | null;
  /** 通知状态 */
  notifyStatus: AiMarketMonitorNotifyStatus;
  /** 通知错误 */
  notifyError: string | null;
  /** 创建时间 */
  createdAt: string;
};

/**
 * 监控日志分页结果
 */
export type AiMarketMonitorLogListResult = BasePageDTO<AiMarketMonitorLogItem>;

/**
 * 停止规则参数
 */
export type StopAiMarketMonitorRuleParams = {
  /** 规则ID */
  ruleId: number;
};

/**
 * 测试规则参数
 */
export type TestAiMarketMonitorRuleParams = {
  /** 规则ID */
  ruleId: number;
};

/**
 * 测试规则结果
 */
export type TestAiMarketMonitorRuleResult = {
  /** 规则ID */
  ruleId: number;
  /** 交易对 */
  symbol: string;
  /** 监控周期 */
  checkInterval: AiMarketMonitorCheckInterval;
  /** 是否命中 */
  triggered: boolean;
  /** 通知状态 */
  notifyStatus: AiMarketMonitorNotifyStatus;
  /** 置信度 */
  confidence: number;
  /** 原因 */
  reason: string;
  /** 是否自动停止 */
  autoStopped: boolean;
};
