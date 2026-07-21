import { bullishmarubozu, bearishmarubozu } from 'technicalindicators';
import { SignalType, SignalDirection } from '../types/indicator-signal.types';
import {
  PatternDetector,
  PatternContext,
  PatternResult,
  klinesToOHLC,
  createSignal,
} from './base.pattern';

/**
 * 看涨光头光脚形态检测器
 */
export const bullishMarubozuDetector: PatternDetector = {
  type: SignalType.BULLISH_MARUBOZU,
  name: '看涨光头光脚',
  direction: SignalDirection.BULLISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 1) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = bullishmarubozu(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现看涨光头光脚形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 看跌光头光脚形态检测器
 */
export const bearishMarubozuDetector: PatternDetector = {
  type: SignalType.BEARISH_MARUBOZU,
  name: '看跌光头光脚',
  direction: SignalDirection.BEARISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 1) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = bearishmarubozu(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现看跌光头光脚形态`,
        ),
      };
    }

    return { detected: false };
  },
};

