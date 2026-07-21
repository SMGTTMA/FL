import { Kline } from 'src/types/trading';
import { TimeFrame } from '../dto/history.dto';

export interface Market {
  symbol: string; // 交易对
  type: 'spot' | 'future'; // 市场类型：现货/合约
  baseAsset: string; // 基础货币
  quoteAsset: string; // 计价货币
  minOrderSize: number; // 最小下单数量
  minOrderValue: number; // 最小下单金额
}

export interface GetKlinesRes {
  symbol: string;
  timeframe: TimeFrame;
  klines: Kline[];
}

export interface MarketMinOrderInfo {
  /** 最小开单数量 */
  minSz: number;
  /** 步长 */
  stepLength: string;
  /** 交易对 */
  symbol: string;
  /** 最小精度单位 */
  precisionPrice: number;
  /** 最小精度数量 */
  precisionAmount: number;
  /** 杠杆 */
  lever: number;
  /** 合约最小开单数量 */
  minSzForContract: number;
}
