import { downsidetasukigap } from 'technicalindicators';
import { SignalType, SignalDirection } from '../types/indicator-signal.types';
import {
  PatternDetector,
  PatternContext,
  PatternResult,
  klinesToOHLC,
  createSignal,
} from './base.pattern';

/**
 * 向下跳空并列阴阳线形态检测器
 */
export const downsideTasukiGapDetector: PatternDetector = {
  type: SignalType.DOWNSIDE_TASUKI_GAP,
  name: '向下跳空并列阴阳线',
  direction: SignalDirection.BEARISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 3) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = downsidetasukigap(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现向下跳空并列阴阳线形态`,
        ),
      };
    }

    return { detected: false };
  },
};

