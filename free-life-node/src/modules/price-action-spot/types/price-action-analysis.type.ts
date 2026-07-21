import { Kline } from '@/types/trading';
import { OrderSide } from '@/modules/exchange/dto/place-order.dto';

export type PriceActionOrderSuggestion = {
  entryPrice: number;
  takeProfitPrice: number;
  amount: number;
  side: OrderSide;
};

export type PriceActionAnalyzeInput = {
  symbol: string;
  shortKlines: Kline[];
  longKlines: Kline[];
  currentPrice: number;
  singleOrderAmount: number;
  profitPoint: number;
};

export type PriceActionAnalyzeResult = {
  /** 是否开单 */
  shouldOpen: boolean;
  /** 开单价（无开单时为 null） */
  entryPrice: number | null;
  /** 止盈价（无开单时为 null） */
  takeProfitPrice: number | null;
  /** 分析原因 */
  reason: string;
  /** 信心指数 0-100 */
  confidence: number;
  /** 订单建议列表（支持未来扩展为多单） */
  orders: PriceActionOrderSuggestion[];
  /** 调试信息（便于后续调参与回测） */
  debug: {
    shortKlineCount: number;
    longKlineCount: number;
    currentPrice: number;
    message: string;
    [key: string]: unknown;
  };
};

