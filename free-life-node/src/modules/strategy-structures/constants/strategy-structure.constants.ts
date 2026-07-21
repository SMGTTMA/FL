export const STRATEGY_LEVEL_GROUPS = ['NORMAL', 'RANGE'] as const;
export type StrategyLevelGroup = (typeof STRATEGY_LEVEL_GROUPS)[number];

export const STRATEGY_LINE_GROUPS = ['TREND', 'CHANNEL'] as const;
export type StrategyLineGroup = (typeof STRATEGY_LINE_GROUPS)[number];

export const STRATEGY_BOUNDARIES = ['UPPER', 'LOWER'] as const;
export type StrategyBoundary = (typeof STRATEGY_BOUNDARIES)[number];

export const STRATEGY_MARKET_DIRECTIONS = [
  'UP',
  'DOWN',
  'RANGE',
  'UP_CHANNEL',
  'DOWN_CHANNEL',
] as const;
export type StrategyMarketDirectionType =
  (typeof STRATEGY_MARKET_DIRECTIONS)[number];
