/**
 * 交易对基础类型
 */
type TradingPairBase = {
  id: number;
};

/**
 * 创建交易对参数
 * @description 必须包含所有必填字段
 */
export type CreateTradingPairDto = {
  /** 交易对符号（必填） */
  symbol: string;
  /** 基础资产（必填） */
  baseAsset: string;
  /** 计价资产（必填） */
  quoteAsset: string;
  /** 交易类型（必填，只能是 spot 或 contract） */
  type: "spot" | "contract";
  /** 交易所名称（必填） */
  exchangeName: string;
};

/**
 * 更新交易对参数
 */
export type UpdateTradingPairDto = TradingPairBase & CreateTradingPairDto;

/**
 * 查询交易对参数
 */
export type QueryTradingPairDto = {
  /** 交易对符号（可选） */
  symbol?: string;
  /** 基础资产（可选） */
  baseAsset?: string;
  /** 计价资产（可选） */
  quoteAsset?: string;
  /** 交易类型（可选） */
  type?: "spot" | "contract";
  /** 交易所名称（可选） */
  exchangeName?: string;
  /** 是否激活（可选） */
  isActive?: number;
};

/**
 * 禁用交易对参数
 */
export type DisableTradingPairDto = TradingPairBase;

export type TradingPair = CreateTradingPairDto & {
  id: number;
  isActive: number;
};
