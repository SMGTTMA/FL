import { bullishengulfingpattern } from 'technicalindicators';
import { SignalType, SignalDirection } from '../types/indicator-signal.types';
import {
  PatternDetector,
  PatternContext,
  PatternResult,
  klinesToOHLC,
  createSignal,
} from './base.pattern';

/**
 * 看涨吞没形态检测器
 */
export const bullishEngulfingDetector: PatternDetector = {
  type: SignalType.BULLISH_ENGULFING,
  name: '看涨吞没',
  direction: SignalDirection.BULLISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 2) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = bullishengulfingpattern(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现看涨吞没形态`,
        ),
      };
    }

    return { detected: false };
  },
};

