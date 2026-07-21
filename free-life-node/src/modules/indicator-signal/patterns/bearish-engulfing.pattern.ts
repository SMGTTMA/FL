import { bearishengulfingpattern } from 'technicalindicators';
import { SignalType, SignalDirection } from '../types/indicator-signal.types';
import {
  PatternDetector,
  PatternContext,
  PatternResult,
  klinesToOHLC,
  createSignal,
} from './base.pattern';

/**
 * 看跌吞没形态检测器
 */
export const bearishEngulfingDetector: PatternDetector = {
  type: SignalType.BEARISH_ENGULFING,
  name: '看跌吞没',
  direction: SignalDirection.BEARISH,

  detect(ctx: PatternContext): PatternResult {
    // 取最近10根K线进行检测
    const recentKlines = ctx.klines.slice(-10);
    if (recentKlines.length < 2) {
      return { detected: false };
    }

    // 转换为 OHLC 格式
    const input = klinesToOHLC(recentKlines);

    // 使用 technicalindicators 检测
    const result = bearishengulfingpattern(input);

    // 检查最后一个结果是否为 true
    if (result === true) {
      const envName = ctx.env === 'prod' ? '主网' : '测试网';
      const description = `${ctx.symbol} 在${envName} ${ctx.timeframe} 周期出现看跌吞没形态`;

      return {
        detected: true,
        signal: createSignal(
          { ...ctx, klines: recentKlines },
          this.type,
          this.direction,
          description,
        ),
      };
    }

    return { detected: false };
  },
};

