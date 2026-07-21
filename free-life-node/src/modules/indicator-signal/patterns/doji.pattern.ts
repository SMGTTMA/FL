import { doji, dragonflydoji, gravestonedoji } from 'technicalindicators';
import { SignalType, SignalDirection } from '../types/indicator-signal.types';
import {
  PatternDetector,
  PatternContext,
  PatternResult,
  klinesToOHLC,
  createSignal,
} from './base.pattern';

/**
 * 十字星形态检测器
 */
export const dojiDetector: PatternDetector = {
  type: SignalType.DOJI,
  name: '十字星',
  direction: SignalDirection.NEUTRAL,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 1) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = doji(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现十字星形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 蜻蜓十字星形态检测器
 */
export const dragonflyDojiDetector: PatternDetector = {
  type: SignalType.DRAGONFLY_DOJI,
  name: '蜻蜓十字星',
  direction: SignalDirection.BULLISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 1) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = dragonflydoji(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现蜻蜓十字星形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 墓碑十字星形态检测器
 */
export const gravestoneDojiDetector: PatternDetector = {
  type: SignalType.GRAVESTONE_DOJI,
  name: '墓碑十字星',
  direction: SignalDirection.BEARISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 1) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = gravestonedoji(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现墓碑十字星形态`,
        ),
      };
    }

    return { detected: false };
  },
};

