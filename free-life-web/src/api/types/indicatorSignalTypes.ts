/**
 * 指标信号模块类型定义
 */

/**
 * 信号类型枚举
 */
export enum SignalType {
  // 吞没形态
  BEARISH_ENGULFING = "bearish_engulfing",
  BULLISH_ENGULFING = "bullish_engulfing",

  // 十字星形态
  DOJI = "doji",
  DRAGONFLY_DOJI = "dragonfly_doji",
  GRAVESTONE_DOJI = "gravestone_doji",

  // 星形态
  MORNING_STAR = "morning_star",
  EVENING_STAR = "evening_star",
  MORNING_DOJI_STAR = "morning_doji_star",
  EVENING_DOJI_STAR = "evening_doji_star",
  ABANDONED_BABY = "abandoned_baby",

  // 孕线形态
  BULLISH_HARAMI = "bullish_harami",
  BEARISH_HARAMI = "bearish_harami",
  BULLISH_HARAMI_CROSS = "bullish_harami_cross",
  BEARISH_HARAMI_CROSS = "bearish_harami_cross",

  // 锤子线形态
  BULLISH_HAMMER = "bullish_hammer",
  BEARISH_HAMMER = "bearish_hammer",
  BULLISH_INVERTED_HAMMER = "bullish_inverted_hammer",
  BEARISH_INVERTED_HAMMER = "bearish_inverted_hammer",

  // 光头光脚形态
  BULLISH_MARUBOZU = "bullish_marubozu",
  BEARISH_MARUBOZU = "bearish_marubozu",

  // 陀螺形态
  BULLISH_SPINNING_TOP = "bullish_spinning_top",
  BEARISH_SPINNING_TOP = "bearish_spinning_top",

  // 乌云盖顶和刺透形态
  DARK_CLOUD_COVER = "dark_cloud_cover",
  PIERCING_LINE = "piercing_line",

  // 缺口形态
  DOWNSIDE_TASUKI_GAP = "downside_tasuki_gap",

  // 三根K线形态
  THREE_BLACK_CROWS = "three_black_crows",
  THREE_WHITE_SOLDIERS = "three_white_soldiers",
}

/**
 * 信号方向
 */
export enum SignalDirection {
  BULLISH = "bullish",
  BEARISH = "bearish",
  NEUTRAL = "neutral",
}

/**
 * 启动信号监听参数
 */
export type StartSignalWatchParams = {
  /** 交易对 */
  symbol: string;
  /** 交易所配置ID */
  exchangeConfigId: number;
};

/**
 * 停止信号监听参数
 */
export type StopSignalWatchParams = {
  /** 监听ID */
  watchId: number;
};

/**
 * 监听列表项
 */
export type SignalWatchListItem = {
  /** 监听ID */
  watchId: number;
  /** 交易对 */
  symbol: string;
  /** 交易所配置ID */
  exchangeConfigId: number;
  /** 用户ID */
  userId: number;
  /** 状态 */
  status: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
};
