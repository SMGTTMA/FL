import {
  bullishhammerstick,
  bearishhammerstick,
  bullishinvertedhammerstick,
  bearishinvertedhammerstick,
  hangingman,
  shootingstar,
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
 * 看涨锤子线形态检测器
 */
export const bullishHammerDetector: PatternDetector = {
  type: SignalType.BULLISH_HAMMER,
  name: '看涨锤子线',
  direction: SignalDirection.BULLISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 1) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = bullishhammerstick(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现看涨锤子线形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 看跌锤子线（吊颈线）形态检测器
 */
export const bearishHammerDetector: PatternDetector = {
  type: SignalType.BEARISH_HAMMER,
  name: '看跌锤子线（吊颈线）',
  direction: SignalDirection.BEARISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 5) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = hangingman(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现吊颈线形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 看涨倒锤子线形态检测器
 */
export const bullishInvertedHammerDetector: PatternDetector = {
  type: SignalType.BULLISH_INVERTED_HAMMER,
  name: '看涨倒锤子线',
  direction: SignalDirection.BULLISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 1) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = bullishinvertedhammerstick(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现看涨倒锤子线形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 看跌倒锤子线（流星线）形态检测器
 */
export const bearishInvertedHammerDetector: PatternDetector = {
  type: SignalType.BEARISH_INVERTED_HAMMER,
  name: '看跌倒锤子线（流星线）',
  direction: SignalDirection.BEARISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 5) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = shootingstar(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现流星线形态`,
        ),
      };
    }

    return { detected: false };
  },
};
