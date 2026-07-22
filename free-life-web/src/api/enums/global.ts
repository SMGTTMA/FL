export enum StrategyTypeEnum {
  GRID_CASH = "grid_cash",
  PRICE_ACTION_SPOT = "price_action_spot",
  STRUCTURE_EMA_SPOT = "structure_ema_spot",
}

export enum StrategyNameEnum {
  "grid_cash" = "网格现货策略",
  "price_action_spot" = "价格行为现货策略",
  "structure_ema_spot" = "EMA结构现货策略",
}

export enum StrategyStatusEnum {
  RUNNING = 1,
  STOPPED = 0,
}

/**
 * 订单方向枚举
 */
export enum OrderSideEnum {
  BUY = "buy",
  SELL = "sell",
}

export enum TradingPairType {
  SPOT = "spot",
  CONTRACT = "contract",
}

export enum TradingPairIsActive {
  ACTIVE = 1,
  INACTIVE = 0,
}
