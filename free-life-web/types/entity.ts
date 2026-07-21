/**
 * 用户令牌信息
 */
export type UserToken = {
  /** 访问令牌 */
  accessToken?: string;
  /** 令牌类型 */
  tokenType?: string;
};

/**
 * 用户信息
 */
export type UserInfo = {
  /** 用户ID */
  id: string;
  /** 用户名 */
  username: string;
  /** 创建时间 */
  createdAt: string;
};

/**
 * 策略信息
 */
export type StrategyInfo = {
  /** 策略ID */
  strategyId: string;
  /** 策略名称 */
  strategyName: string;
  /** 策略描述 */
  description: string;
  /** 策略参数配置 */
  parameters: Record<string, unknown>;
};

/**
 * 策略参数配置
 */
export type StrategyParameters = {
  /** 交易对列表，例如：["BTC/USDT", "ETH/USDT"] */
  symbols: string[];
  /** 时间周期列表，例如：["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "12h", "1d"] */
  timeframes: string[];
};

/**
 * 基础分页信息
 */
export type BasePageDTO<T> = {
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 总条数 */
  total: number;
  /** 数据 */
  list: T[];
};

/** 基础分页请求 */
export type BasePageRequest = {
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  pageSize: number;
};
