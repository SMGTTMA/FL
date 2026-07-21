import {
  morningstar,
  eveningstar,
  morningdojistar,
  eveningdojistar,
  abandonedbaby,
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
 * 早晨之星形态检测器
 */
export const morningStarDetector: PatternDetector = {
  type: SignalType.MORNING_STAR,
  name: '早晨之星',
  direction: SignalDirection.BULLISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 3) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = morningstar(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现早晨之星形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 黄昏之星形态检测器
 */
export const eveningStarDetector: PatternDetector = {
  type: SignalType.EVENING_STAR,
  name: '黄昏之星',
  direction: SignalDirection.BEARISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 3) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = eveningstar(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现黄昏之星形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 早晨十字星形态检测器
 */
export const morningDojiStarDetector: PatternDetector = {
  type: SignalType.MORNING_DOJI_STAR,
  name: '早晨十字星',
  direction: SignalDirection.BULLISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 3) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = morningdojistar(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现早晨十字星形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 黄昏十字星形态检测器
 */
export const eveningDojiStarDetector: PatternDetector = {
  type: SignalType.EVENING_DOJI_STAR,
  name: '黄昏十字星',
  direction: SignalDirection.BEARISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 3) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = eveningdojistar(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现黄昏十字星形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 弃婴形态检测器
 */
export const abandonedBabyDetector: PatternDetector = {
  type: SignalType.ABANDONED_BABY,
  name: '弃婴形态',
  direction: SignalDirection.BULLISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 3) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = abandonedbaby(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现弃婴形态`,
        ),
      };
    }

    return { detected: false };
  },
};

