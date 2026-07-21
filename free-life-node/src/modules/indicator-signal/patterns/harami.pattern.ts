import {
  bullishharami,
  bearishharami,
  bullishharamicross,
  bearishharamicross,
} from 'technicalindicators';
import { SignalType, SignalDirection } from '../types/indicator-signal.types';
import {
  PatternDetector,
  PatternContext,
  PatternResult,
  klinesToOHLC,
  createSignal,
} from './base.pattern';

/**
 * 看涨孕线形态检测器
 */
export const bullishHaramiDetector: PatternDetector = {
  type: SignalType.BULLISH_HARAMI,
  name: '看涨孕线',
  direction: SignalDirection.BULLISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 2) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = bullishharami(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现看涨孕线形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 看跌孕线形态检测器
 */
export const bearishHaramiDetector: PatternDetector = {
  type: SignalType.BEARISH_HARAMI,
  name: '看跌孕线',
  direction: SignalDirection.BEARISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 2) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = bearishharami(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现看跌孕线形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 看涨十字孕线形态检测器
 */
export const bullishHaramiCrossDetector: PatternDetector = {
  type: SignalType.BULLISH_HARAMI_CROSS,
  name: '看涨十字孕线',
  direction: SignalDirection.BULLISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 2) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = bullishharamicross(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现看涨十字孕线形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 看跌十字孕线形态检测器
 */
export const bearishHaramiCrossDetector: PatternDetector = {
  type: SignalType.BEARISH_HARAMI_CROSS,
  name: '看跌十字孕线',
  direction: SignalDirection.BEARISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 2) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = bearishharamicross(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现看跌十字孕线形态`,
        ),
      };
    }

    return { detected: false };
  },
};

