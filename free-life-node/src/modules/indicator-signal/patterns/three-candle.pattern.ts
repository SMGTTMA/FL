import { threeblackcrows, threewhitesoldiers } from 'technicalindicators';
import { SignalType, SignalDirection } from '../types/indicator-signal.types';
import {
  PatternDetector,
  PatternContext,
  PatternResult,
  klinesToOHLC,
  createSignal,
} from './base.pattern';

/**
 * 三只乌鸦形态检测器
 */
export const threeBlackCrowsDetector: PatternDetector = {
  type: SignalType.THREE_BLACK_CROWS,
  name: '三只乌鸦',
  direction: SignalDirection.BEARISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 3) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = threeblackcrows(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现三只乌鸦形态`,
        ),
      };
    }

    return { detected: false };
  },
};

/**
 * 三白兵形态检测器
 */
export const threeWhiteSoldiersDetector: PatternDetector = {
  type: SignalType.THREE_WHITE_SOLDIERS,
  name: '三白兵',
  direction: SignalDirection.BULLISH,

  detect(ctx: PatternContext): PatternResult {
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 3) {
      return { detected: false };
    }

    const input = klinesToOHLC(recentKlines);
    const result = threewhitesoldiers(input);

    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现三白兵形态`,
        ),
      };
    }

    return { detected: false };
  },
};

