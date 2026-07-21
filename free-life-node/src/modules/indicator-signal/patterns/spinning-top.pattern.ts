import { bullishspinningtop, bearishspinningtop } from 'technicalindicators';
import { SignalType, SignalDirection } from '../types/indicator-signal.types';
import {
  PatternDetector,
  PatternContext,
  PatternResult,
  klinesToOHLC,
  createSignal,
} from './base.pattern';

/**
 * 看涨陀螺形态检测器
 */
export const bullishSpinningTopDetector: PatternDetector = {
  type: SignalType.BULLISH_SPINNING_TOP,
  name: '看涨陀螺',
  direction: SignalDirection.BULLISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 1) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = bullishspinningtop(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现看涨陀螺形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 看跌陀螺形态检测器
 */
export const bearishSpinningTopDetector: PatternDetector = {
  type: SignalType.BEARISH_SPINNING_TOP,
  name: '看跌陀螺',
  direction: SignalDirection.BEARISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 1) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = bearishspinningtop(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现看跌陀螺形态`,
        ),
      };
    }

    return { detected: false };
  },
};

