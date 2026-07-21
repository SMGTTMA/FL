import { roundFractional } from '@/utils/base/baseUtils';

// 现货吃单手续费率 0.1%
export const SPOT_TAKER_FEE = 0.001;
export const SPOT_ENTRY_EXIT_FEE = SPOT_TAKER_FEE * 2;
// 合约吃单手续费率 0.05%
export const FUTURES_TAKER_FEE = 0.0005;
export const FUTURES_ENTRY_EXIT_FEE = FUTURES_TAKER_FEE * 2;

/** 滑点 0.1% */
export const SLIPPAGE = 0.001;

/** 资金费率 每8小时 0.03%  */
export const FUTURES_FUNDING_FEE = 0.0003;

/** 现货目标最低收益点 1% */
export const SPOT_MIN_PROFIT_POINT = 0.01;
/** 合约目标最低收益点 1% */
export const FUTURES_MIN_PROFIT_POINT = 0.01;
/** 小时级别 合约目标最低收益点 2% */
export const FUTURES_MIN_PROFIT_POINT_FOR_ONE_HOUR = 0.03;

/** 现货平仓收益点：入场手续费 + 出场手续费 + 滑点 + 最低收益点 */
export const SPOT_CLOSE_PROFIT_POINT: number = roundFractional(
  SPOT_ENTRY_EXIT_FEE + SLIPPAGE + SPOT_MIN_PROFIT_POINT,
) as number;

/** 合约平仓收益点：入场手续费 + 出场手续费 + 滑点 + 最低收益点 + 资金费率 */
export const FUTURES_CLOSE_PROFIT_POINT: number = roundFractional(
  FUTURES_ENTRY_EXIT_FEE +
    SLIPPAGE +
    FUTURES_MIN_PROFIT_POINT +
    FUTURES_FUNDING_FEE,
) as number;

/** 小时级别 合约平仓收益点：入场手续费 + 出场手续费 + 滑点 + 最低收益点 + 资金费率 */
export const FUTURES_CLOSE_PROFIT_POINT_FOR_ONE_HOUR: number = roundFractional(
  FUTURES_ENTRY_EXIT_FEE +
    SLIPPAGE +
    FUTURES_MIN_PROFIT_POINT_FOR_ONE_HOUR +
    FUTURES_FUNDING_FEE,
) as number;
