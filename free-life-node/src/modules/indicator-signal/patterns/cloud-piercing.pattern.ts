import { darkcloudcover, piercingline } from 'technicalindicators';
import { SignalType, SignalDirection } from '../types/indicator-signal.types';
import {
  PatternDetector,
  PatternContext,
  PatternResult,
  klinesToOHLC,
  createSignal,
} from './base.pattern';

/**
 * 乌云盖顶形态检测器
 */
export const darkCloudCoverDetector: PatternDetector = {
  type: SignalType.DARK_CLOUD_COVER,
  name: '乌云盖顶',
  direction: SignalDirection.BEARISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 2) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = darkcloudcover(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现乌云盖顶形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 刺透形态检测器
 */
export const piercingLineDetector: PatternDetector = {
  type: SignalType.PIERCING_LINE,
  name: '刺透形态',
  direction: SignalDirection.BULLISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 2) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = piercingline(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现刺透形态`,
        ),
      };
    }

    return { detected: false };
  },
};

