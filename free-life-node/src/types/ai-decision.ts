/**
 * AI 市场分析决策类型
 * AI 只分析市场，不关注个人持仓
 */
export interface AIDecision {
  /** 操作类型 */
  action: 'buy' | 'sell' | 'hold';
  /** 信心指数（0-100） */
  confidence: number;
  /** 决策理由 */
  reason: string;
  /** 建议买入价（仅action=buy时） */
  buyPrice?: number;
  /** 建议止盈涨幅百分比（仅action=buy时） */
  takeProfitPercent?: number;
}

/**
 * 技术指标数据
 */
export interface TechnicalIndicators {
  /** RSI指标值 */
  rsi?: number;
  /** MACD指标 */
  macd?: {
    /** DIF线 */
    dif: number;
    /** DEA线 */
    dea: number;
    /** 柱状图 */
    histogram: number;
  };
  /** EMA20 */
  ema20?: number;
  /** EMA50 */
  ema50?: number;
  /** 成交量变化百分比 */
  volumeChange?: string;
}
