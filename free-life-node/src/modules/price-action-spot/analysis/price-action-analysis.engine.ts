import { OrderSide } from '@/modules/exchange/dto/place-order.dto';
import {
  PriceActionAnalyzeInput,
  PriceActionAnalyzeResult,
  PriceActionOrderSuggestion,
} from '../types/price-action-analysis.type';

/**
 * 价格行为分析引擎（纯函数）
 *
 * 当前版本先提供统一输入输出骨架，便于后续逐步扩展：
 * 1. 大周期方向过滤
 * 2. 小周期入场形态识别
 * 3. 入场/止盈价格计算
 * 4. 多订单建议与风控过滤
 */
export function analyzePriceAction(
  input: PriceActionAnalyzeInput,
): PriceActionAnalyzeResult {
  const {
    symbol,
    shortKlines,
    longKlines,
    currentPrice,
    singleOrderAmount,
    profitPoint,
  } = input;

  if (!shortKlines?.length || !longKlines?.length) {
    return {
      shouldOpen: false,
      entryPrice: null,
      takeProfitPrice: null,
      reason: 'K线数据不足，无法分析',
      confidence: 0,
      orders: [],
      debug: {
        shortKlineCount: shortKlines?.length || 0,
        longKlineCount: longKlines?.length || 0,
        currentPrice,
        message: 'shortKlines 或 longKlines 为空',
      },
    };
  }

  if (currentPrice <= 0 || singleOrderAmount <= 0 || profitPoint <= 0) {
    return {
      shouldOpen: false,
      entryPrice: null,
      takeProfitPrice: null,
      reason: '输入参数非法（价格/金额/收益点必须大于0）',
      confidence: 0,
      orders: [],
      debug: {
        shortKlineCount: shortKlines.length,
        longKlineCount: longKlines.length,
        currentPrice,
        message: 'currentPrice 或 singleOrderAmount 或 profitPoint 非法',
      },
    };
  }

  // TODO: 在这里实现真实的价格行为分析逻辑
  // 示例思路：
  // 1、确定市场结构（在大周期上）

  const entryPrice = currentPrice;
  const takeProfitPrice = currentPrice * (1 + profitPoint);
  const defaultOrder: PriceActionOrderSuggestion = {
    entryPrice,
    takeProfitPrice,
    amount: singleOrderAmount,
    side: OrderSide.BUY,
  };

  return {
    shouldOpen: false,
    entryPrice: null,
    takeProfitPrice: null,
    reason: `${symbol} 分析引擎已接入，等待补充具体价格行为规则`,
    confidence: 0,
    orders: [defaultOrder],
    debug: {
      shortKlineCount: shortKlines.length,
      longKlineCount: longKlines.length,
      currentPrice,
      message: '占位实现：返回 shouldOpen=false',
      preview: {
        entryPrice,
        takeProfitPrice,
      },
    },
  };
}

