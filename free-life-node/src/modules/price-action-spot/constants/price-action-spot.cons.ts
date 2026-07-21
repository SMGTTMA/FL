import { SPOT_CLOSE_PROFIT_POINT } from '@/common/constants/trading.constants';
import { PriceActionCheckInterval, PriceActionSpotConfig } from '../types/price-action-spot-config.type';

type BaseConfigType = PriceActionSpotConfig;

export const priceActionSpotDefaultConfig: BaseConfigType = {
  singleOrderAmount: 20,
  maxOrderCount: 50,
  shortTimeframe: PriceActionCheckInterval.H1,
  longTimeframe: PriceActionCheckInterval.H4,
  profitPoint: SPOT_CLOSE_PROFIT_POINT,
};

/** 最小值配置 */
export const priceActionSpotMinConfig: BaseConfigType = {
  singleOrderAmount: 1,
  maxOrderCount: 1,
  shortTimeframe: PriceActionCheckInterval.H1,
  longTimeframe: PriceActionCheckInterval.H4,
  profitPoint: SPOT_CLOSE_PROFIT_POINT,
};

/** 最大值配置 */
export const priceActionSpotMaxConfig: BaseConfigType = {
  singleOrderAmount: 10000000,
  maxOrderCount: 300,
  shortTimeframe: PriceActionCheckInterval.H1,
  longTimeframe: PriceActionCheckInterval.D1,
  profitPoint: 10,
};

export const PRICE_ACTION_TIMEFRAME_RANK: Record<PriceActionCheckInterval, number> = {
  [PriceActionCheckInterval.H1]: 1,
  [PriceActionCheckInterval.H4]: 2,
  [PriceActionCheckInterval.D1]: 3,
};
