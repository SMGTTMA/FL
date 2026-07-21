import { Kline } from '@/types/trading';
import { DetectedSignal, SignalType, SignalDirection } from '../types/indicator-signal.types';

/**
 * OHLC 数据格式（technicalindicators 库需要的格式）
 */
export interface OHLCData {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
}

/**
 * 形态检测上下文
 */
export interface PatternContext {
  symbol: string;
  timeframe: string;
  env: 'prod' | 'test';
  klines: Kline[];
}

/**
 * 形态检测结果
 */
export interface PatternResult {
  detected: boolean;
  signal?: DetectedSignal;
}

/**
 * 形态检测器接口
 */
export interface PatternDetector {
  /** 形态类型 */
  type: SignalType;
  /** 形态名称 */
  name: string;
  /** 信号方向 */
  direction: SignalDirection;
  /** 检测形态 */
  detect(ctx: PatternContext): PatternResult;
}

/**
 * 将 K线数组转换为 OHLC 数据格式（一次遍历）
 */
export function klinesToOHLC(klines: Kline[]): OHLCData {
  return klines.reduce<OHLCData>(
    (acc, k) => {
      acc.open.push(k.open);
      acc.high.push(k.high);
      acc.low.push(k.low);
      acc.close.push(k.close);
      return acc;
    },
    {
      open: [],
      high: [],
      low: [],
      close: [],
    },
  );
}

/**
 * 创建检测到的信号
 */
export function createSignal(
  ctx: PatternContext,
  type: SignalType,
  direction: SignalDirection,
  description: string,
): DetectedSignal {
  const lastKline = ctx.klines[ctx.klines.length - 1];
  return {
    type,
    direction,
    symbol: ctx.symbol,
    timeframe: ctx.timeframe,
    timestamp: lastKline.timestamp,
    price: lastKline.close,
    description,
  };
}

