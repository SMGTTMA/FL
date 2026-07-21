/**
 * 技术指标信号类型定义
 */

/**
 * 指标信号类型枚举
 */
export enum SignalType {
  // 吞没形态
  BEARISH_ENGULFING = 'bearish_engulfing', // 看跌吞没
  BULLISH_ENGULFING = 'bullish_engulfing', // 看涨吞没

  // 十字星形态
  DOJI = 'doji', // 十字星
  DRAGONFLY_DOJI = 'dragonfly_doji', // 蜻蜓十字星
  GRAVESTONE_DOJI = 'gravestone_doji', // 墓碑十字星

  // 星形态
  MORNING_STAR = 'morning_star', // 早晨之星
  EVENING_STAR = 'evening_star', // 黄昏之星
  MORNING_DOJI_STAR = 'morning_doji_star', // 早晨十字星
  EVENING_DOJI_STAR = 'evening_doji_star', // 黄昏十字星
  ABANDONED_BABY = 'abandoned_baby', // 弃婴形态

  // 孕线形态
  BULLISH_HARAMI = 'bullish_harami', // 看涨孕线
  BEARISH_HARAMI = 'bearish_harami', // 看跌孕线
  BULLISH_HARAMI_CROSS = 'bullish_harami_cross', // 看涨十字孕线
  BEARISH_HARAMI_CROSS = 'bearish_harami_cross', // 看跌十字孕线

  // 锤子线形态
  BULLISH_HAMMER = 'bullish_hammer', // 看涨锤子线
  BEARISH_HAMMER = 'bearish_hammer', // 看跌锤子线（吊颈线）
  BULLISH_INVERTED_HAMMER = 'bullish_inverted_hammer', // 看涨倒锤子线
  BEARISH_INVERTED_HAMMER = 'bearish_inverted_hammer', // 看跌倒锤子线（流星线）

  // 光头光脚形态
  BULLISH_MARUBOZU = 'bullish_marubozu', // 看涨光头光脚
  BEARISH_MARUBOZU = 'bearish_marubozu', // 看跌光头光脚

  // 陀螺形态
  BULLISH_SPINNING_TOP = 'bullish_spinning_top', // 看涨陀螺
  BEARISH_SPINNING_TOP = 'bearish_spinning_top', // 看跌陀螺

  // 乌云盖顶和刺透形态
  DARK_CLOUD_COVER = 'dark_cloud_cover', // 乌云盖顶
  PIERCING_LINE = 'piercing_line', // 刺透形态

  // 缺口形态
  DOWNSIDE_TASUKI_GAP = 'downside_tasuki_gap', // 向下跳空并列阴阳线

  // 三根K线形态
  THREE_BLACK_CROWS = 'three_black_crows', // 三只乌鸦
  THREE_WHITE_SOLDIERS = 'three_white_soldiers', // 三白兵
}

/**
 * 信号方向
 */
export enum SignalDirection {
  BULLISH = 'bullish', // 看涨
  BEARISH = 'bearish', // 看跌
  NEUTRAL = 'neutral', // 中性
}

/**
 * 检测到的信号
 */
export interface DetectedSignal {
  type: SignalType;
  direction: SignalDirection;
  symbol: string;
  timeframe: string;
  timestamp: string;
  price: number;
  description: string;
}

/**
 * Webhook 消息类型（企业微信）
 */
export interface WxWebhookMessage {
  msgtype: 'text' | 'markdown';
  text?: {
    content: string;
    mentioned_list?: string[];
    mentioned_mobile_list?: string[];
  };
  markdown?: {
    content: string;
  };
}
