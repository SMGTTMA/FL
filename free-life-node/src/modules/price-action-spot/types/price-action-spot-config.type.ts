import { TimeFrame } from '@/modules/exchange/dto/history.dto';

export enum PriceActionCheckInterval {
  H1 = TimeFrame.H1,
  H4 = TimeFrame.H4,
  D1 = TimeFrame.D1,
}

/** 价格行为现货策略配置 */
export type PriceActionSpotConfig = {
  /** 每单投入资金（USDT） */
  singleOrderAmount: number;
  /** 最多投入单数 */
  maxOrderCount: number;
  /** 小周期 */
  shortTimeframe: PriceActionCheckInterval;
  /** 大周期 */
  longTimeframe: PriceActionCheckInterval;
  /** 盈利收益点 */
  profitPoint: number;
};
