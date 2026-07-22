import { Kline } from '@/types/trading';
import { buildEmaSignalContext, isKeyLevelBreakUp } from './ema-swing.engine';

function kline(args: {
  timestamp: number;
  open: number;
  close: number;
}): Kline {
  return {
    timestamp: String(args.timestamp),
    open: args.open,
    high: Math.max(args.open, args.close),
    low: Math.min(args.open, args.close),
    close: args.close,
    volume: 1,
  };
}

describe('ema-swing.engine', () => {
  it('排除倒序数组第0根未收盘K线并识别EMA上穿', () => {
    const context = buildEmaSignalContext(
      [
        kline({ timestamp: 4, open: 999, close: 999 }),
        kline({ timestamp: 3, open: 11, close: 12 }),
        kline({ timestamp: 2, open: 9, close: 8 }),
        kline({ timestamp: 1, open: 10, close: 10 }),
      ],
      2,
    );

    expect(context).not.toBeNull();
    expect(context.currentKlineTime).toBe(3);
    expect(context.currentEma).toBeCloseTo(11);
    expect(context.isEntrySignal).toBe(true);
    expect(context.isExitSignal).toBe(false);
  });

  it('识别EMA下穿退出信号', () => {
    const context = buildEmaSignalContext(
      [
        kline({ timestamp: 4, open: 1, close: 1 }),
        kline({ timestamp: 3, open: 9.5, close: 8 }),
        kline({ timestamp: 2, open: 11, close: 12 }),
        kline({ timestamp: 1, open: 10, close: 10 }),
      ],
      2,
    );

    expect(context).not.toBeNull();
    expect(context.currentEma).toBeCloseTo(9);
    expect(context.isEntrySignal).toBe(false);
    expect(context.isExitSignal).toBe(true);
  });

  it('K线不足时不生成信号', () => {
    const context = buildEmaSignalContext(
      [
        kline({ timestamp: 2, open: 10, close: 10 }),
        kline({ timestamp: 1, open: 10, close: 10 }),
      ],
      2,
    );
    expect(context).toBeNull();
  });

  it('使用实体中点确认人工关键位向上突破', () => {
    const context = buildEmaSignalContext(
      [
        kline({ timestamp: 4, open: 999, close: 999 }),
        kline({ timestamp: 3, open: 11, close: 12 }),
        kline({ timestamp: 2, open: 9, close: 8 }),
        kline({ timestamp: 1, open: 10, close: 10 }),
      ],
      2,
    );

    expect(isKeyLevelBreakUp(context, 10)).toBe(true);
    expect(isKeyLevelBreakUp(context, 12)).toBe(false);
  });
});
