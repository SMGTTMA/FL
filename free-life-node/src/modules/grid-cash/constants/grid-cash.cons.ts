import { GridCashConfig } from '../types/grid-cash-config.type';
import { SPOT_CLOSE_PROFIT_POINT } from '@/common/constants/trading.constants';

type BaseConfigType = Required<Omit<GridCashConfig, 'historyHighPrice'>> &
  Pick<GridCashConfig, 'historyHighPrice'>;

export const gridCashDefaultConfig: BaseConfigType = {
  maxOrderCount: 300,
  shortTestCount: 2,
  shortPriceTolerance: 0.003,
  longTestCount: 2,
  longPriceTolerance: 0.01,
  priceOffsetPercent: 0.05,
  fiveMinuteKlineNum: 144,
  oneHourKlineNum: 168,
  historyHighPrice: undefined,
  profitPoint: SPOT_CLOSE_PROFIT_POINT,
};

/** 最小值配置 */
export const gridCashMinConfig: BaseConfigType = {
  maxOrderCount: 1,
  shortTestCount: 1,
  shortPriceTolerance: 0.001,
  longTestCount: 1,
  longPriceTolerance: 0.01,
  priceOffsetPercent: 0.01,
  fiveMinuteKlineNum: 1,
  oneHourKlineNum: 1,
  historyHighPrice: 0,
  profitPoint: SPOT_CLOSE_PROFIT_POINT,
};

/** 最大值配置 */
export const gridCashMaxConfig: BaseConfigType = {
  maxOrderCount: 300,
  shortTestCount: 3,
  shortPriceTolerance: 0.004,
  longTestCount: 3,
  longPriceTolerance: 1,
  priceOffsetPercent: 1,
  fiveMinuteKlineNum: 300,
  oneHourKlineNum: 300,
  historyHighPrice: undefined,
  /** 盈利 10倍 */
  profitPoint: 10,
};
