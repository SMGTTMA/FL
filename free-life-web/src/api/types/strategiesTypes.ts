import { BasePageRequest } from "#/entity";
import { OrderSideEnum, StrategyTypeEnum } from "../enums/global";

export type StartMartinGridCashV1StrategyParams = {
  /** 交易所配置ID */
  exchangeConfigId: number;
  symbol: string;
  /** 总仓位大小 */
  totalPositionSize: number;
};

/**
 * 策略列表项 DTO
 */
export type StrategiesListItem = {
  /** 策略ID */
  id: number;
  /** 策略名称 */
  strategyName: string;
  /** 交易对 */
  symbol: string;
  /** 总仓位大小（字符串格式） */
  totalPositionSize: string;
  /** 状态 */
  status: number;
  /** 停止原因，可能为 null */
  stopReason: string | null;
  /** 用户ID */
  userId: number;
  /** 策略参数 */
  parameters: {
    /** 交易对 */
    symbol: string;
    /** 交易所配置ID */
    exchangeConfigId: number;
    /** 总仓位大小 */
    totalPositionSize: number;
    /** EMA结构策略最后一次读取到的日线方向 */
    lastDirection?: string | null;
    /** EMA结构策略是否暂停创建新买单 */
    entryPaused?: boolean;
  };
  /** 最后执行时间 */
  lastExecutionTime: string | null;
  /** 交易所配置ID */
  exchangeConfigId: number;
  /** 订单方向 */
  side?: string;
  /** 杠杆 */
  leverage?: number;
  /** 边界价格 */
  boundaryPrice?: string | null;
  /** 最小仓位大小 */
  miniPositionSize?: string;
  /** 高级配置JSON */
  configJson?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
};

export type AdjustPositionSizeParams = {
  /** 策略ID */
  id: number;
  /** 仓位大小 */
  totalPositionSize: number;
};

export type StartOneWayMartinContractStrategyParams = {
  /** 交易所配置ID */
  exchangeConfigId: number;
  /** 交易对 */
  symbol: string;
  /** 策略总仓位大小（USDT） */
  totalPositionSize: number;
  /** 订单方向 */
  side: OrderSideEnum;
  /** 杠杆 */
  leverage: number;
  /** 边界价格 非必传 */
  boundaryPrice?: number;
};

export type GetStrategiesListParams = {
  strategyName?: StrategyTypeEnum;
} & BasePageRequest;

export type StartGridCashStrategyParams = {
  /** 交易对 例如：BTC/USDT */
  symbol: string;
  /** 策略总仓位大小（USDT） */
  totalPositionSize: number;
  /** 交易所配置ID */
  exchangeConfigId: number | string;
  /** 配置JSON */
  configJson?: string;
};

export type EditGridCashStrategyParams = {
  strategyId: number;
} & Pick<StartGridCashStrategyParams, "configJson" | "totalPositionSize">;

export type ParseGridCashConfigJson = {
  /** 最大开单数量 */
  maxOrderCount: number;
  /** 短周期测试次数 */
  shortTestCount: number;
  /** 短周期价格容忍度 */
  shortPriceTolerance: number;
  /** 长周期测试次数 */
  longTestCount: number;
  /** 长周期价格容忍度 */
  longPriceTolerance: number;
  /** 价格偏移百分比 */
  priceOffsetPercent: number;
  /** 5分钟k线 */
  fiveMinuteKlineNum: number;
  /** 1小时k线 */
  oneHourKlineNum: number;
  /**
   * 历史最高价
   * 若没有设置 则以交易所数据为准
   */
  historyHighPrice?: number;
  /** 盈利收益点 */
  profitPoint: number;
};

export type GetGridCashStrategyConfigResponse = {
  default: ParseGridCashConfigJson;
  min: ParseGridCashConfigJson;
  max: ParseGridCashConfigJson;
};

/**
 * 价格行为现货策略开启参数
 */
export type StartPriceActionSpotParams = {
  /** 交易对 例如：BTC/USDT */
  symbol: string;
  /** 交易所配置ID */
  exchangeConfigId: number | string;
  /** 每单投入资金（USDT） */
  singleOrderAmount: number;
  /** 最多投入单数 */
  maxOrderCount: number;
  /** 小周期 */
  shortTimeframe: string;
  /** 大周期 */
  longTimeframe: string;
  /** 盈利收益点 */
  profitPoint: number;
};

/**
 * 价格行为现货策略编辑参数
 */
export type EditPriceActionSpotParams = {
  strategyId: number;
} & Partial<
  Pick<
    StartPriceActionSpotParams,
    | "singleOrderAmount"
    | "maxOrderCount"
    | "shortTimeframe"
    | "longTimeframe"
    | "profitPoint"
  >
>;

/**
 * 价格行为现货策略配置
 */
export type ParsePriceActionSpotConfigJson = {
  /** 每单投入资金（USDT） */
  singleOrderAmount: number;
  /** 最多投入单数 */
  maxOrderCount: number;
  /** 小周期 */
  shortTimeframe: string;
  /** 大周期 */
  longTimeframe: string;
  /** 盈利收益点 */
  profitPoint: number;
};

export type GetPriceActionSpotStrategyConfigResponse = {
  default: ParsePriceActionSpotConfigJson;
  min: ParsePriceActionSpotConfigJson;
  max: ParsePriceActionSpotConfigJson;
  timeframeOptions: string[];
};

/** EMA结构策略单个交易模式的配置。 */
export type StructureEmaProfileConfig = {
  /** 交易周期 */
  timeframe: string;
  /** EMA周期 */
  emaPeriod: number;
  /** 总资金拆分份数 */
  positionParts: number;
  /** 与已有订单的最小价格间距，小数形式 */
  entrySpacingRate: number;
  /** 买单保留的完整K线数量 */
  entryOrderExpireBars: number;
};

/** EMA结构现货策略配置。 */
export type StructureEmaSpotConfig = {
  /** 最低盈利点，小数形式 */
  profitPoint: number;
  /** 上涨模式配置 */
  up: StructureEmaProfileConfig & {
    /** 距离上方关键位的最小距离，小数形式 */
    keyLevelAvoidanceRate: number;
  };
  /** 震荡模式配置 */
  range: StructureEmaProfileConfig;
};

export type StartStructureEmaSpotParams = {
  symbol: string;
  totalPositionSize: number;
  exchangeConfigId: number | string;
  configJson?: string;
};

export type EditStructureEmaSpotParams = {
  strategyId: number;
  totalPositionSize?: number;
  configJson?: string;
};

type NumberLimit = {
  min: number;
  max: number;
};

export type GetStructureEmaSpotConfigResponse = {
  default: StructureEmaSpotConfig;
  limits: {
    profitPoint: NumberLimit;
    emaPeriod: NumberLimit;
    positionParts: NumberLimit;
    entrySpacingRate: NumberLimit;
    keyLevelAvoidanceRate: NumberLimit;
    entryOrderExpireBars: NumberLimit;
  };
  timeframes: {
    up: string[];
    range: string[];
  };
};

export type ActiveSpotEmaTradeStatus =
  | "PENDING_BUY"
  | "HOLDING"
  | "PENDING_SELL";

export type ActiveSpotEmaTrade = {
  id: number;
  strategyRecordId: number;
  sourceMode: "UP" | "RANGE" | null;
  signalTimeframe: string | null;
  emaPeriod: number | null;
  signalKlineTime: string | number | null;
  entryPrice: string | number;
  takeProfitPrice: string | number;
  tradeAmount: string | number;
  positionCost: string | number;
  tradeStatus: ActiveSpotEmaTradeStatus;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ManualExitStructureEmaSpotParams = {
  strategyId: number;
  tradeIds: number[];
  exitPrice: number;
  pauseEntry?: boolean;
};
