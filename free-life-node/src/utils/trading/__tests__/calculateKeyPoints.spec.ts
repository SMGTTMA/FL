import { Kline } from 'src/types/trading';
import { calculateKeyPoints } from '../trading';

describe('calculateKeyPoints', () => {
  const createKlines = (
    length: number,
    prices: { high: number; low: number; open: number; close: number } = {
      high: 104,
      low: 100,
      open: 102,
      close: 102,
    },
  ): Kline[] => {
    const newestTimestamp = new Date('2026-01-01T12:00:00.000Z').getTime();
    return Array.from({ length }, (_, index) => ({
      timestamp: new Date(
        newestTimestamp - index * 5 * 60 * 1000,
      ).toISOString(),
      ...prices,
      volume: 1000,
    }));
  };

  const setKline = (
    klines: Kline[],
    index: number,
    prices: Partial<Pick<Kline, 'open' | 'high' | 'low' | 'close'>>,
  ) => {
    klines[index] = { ...klines[index], ...prices };
  };

  it('K线不足时应该返回空数组', () => {
    const result = calculateKeyPoints(createKlines(10), {
      testCount: 2,
      priceTolerance: 0.003,
    });

    expect(result).toEqual([]);
  });

  it('应该合并两次有效反转，并始终使用最早触碰价格作为锚点', () => {
    const klines = createKlines(60);
    // 数组为新 -> 旧，index 35 比 index 15 更早发生。
    setKline(klines, 35, { open: 100, high: 101, low: 95.2, close: 99 });
    setKline(klines, 15, { open: 100, high: 101, low: 95, close: 99 });

    const result = calculateKeyPoints(klines, {
      testCount: 2,
      priceTolerance: 0.003,
    });

    expect(result).toEqual([
      {
        price: 95.2,
        strength: 2,
        timestamps: [klines[35].timestamp, klines[15].timestamp],
      },
    ]);
  });

  it('新增K线后应该保持已确认关键位的价格不变', () => {
    const klines = createKlines(60);
    setKline(klines, 35, { open: 100, high: 101, low: 95.2, close: 99 });
    setKline(klines, 15, { open: 100, high: 101, low: 95, close: 99 });

    const before = calculateKeyPoints(klines, {
      testCount: 2,
      priceTolerance: 0.003,
    });
    const nextCurrentKline: Kline = {
      timestamp: '2026-01-01T12:05:00.000Z',
      open: 102,
      high: 104,
      low: 100,
      close: 102,
      volume: 1000,
    };
    // 模拟缓存滚动：头部加入最新K线，尾部移除最旧K线。
    const updatedKlines = [nextCurrentKline, ...klines.slice(0, -1)];
    const after = calculateKeyPoints(updatedKlines, {
      testCount: 2,
      priceTolerance: 0.003,
    });

    expect(before.map((point) => point.price)).toEqual([95.2]);
    expect(after.map((point) => point.price)).toEqual([95.2]);
  });

  it('局部低点没有产生足够ATR反转时不应该成为关键位', () => {
    const klines = createKlines(60);
    for (const pivotIndex of [15, 35]) {
      setKline(klines, pivotIndex, {
        open: 100,
        high: 100.1,
        low: 99.5,
        close: 100,
      });
      for (let i = pivotIndex - 3; i < pivotIndex; i++) {
        setKline(klines, i, {
          open: 100.1,
          high: 100.2,
          low: 100,
          close: 100.1,
        });
      }
    }

    const result = calculateKeyPoints(klines, {
      testCount: 2,
      priceTolerance: 0.003,
    });

    expect(result).toEqual([]);
  });

  it('应该识别重复测试形成的阻力位', () => {
    const klines = createKlines(60, {
      high: 105,
      low: 101,
      open: 103,
      close: 103,
    });
    setKline(klines, 35, { open: 106, high: 110, low: 104, close: 106 });
    setKline(klines, 15, { open: 106, high: 109.8, low: 104, close: 106 });

    const result = calculateKeyPoints(klines, {
      testCount: 2,
      priceTolerance: 0.003,
    });

    expect(result).toEqual([
      {
        price: 110,
        strength: 2,
        timestamps: [klines[35].timestamp, klines[15].timestamp],
      },
    ]);
  });

  it('同一段短周期震荡不应该被重复计为多次触碰', () => {
    const klines = createKlines(30);
    setKline(klines, 17, { open: 100, high: 101, low: 95.2, close: 99 });
    setKline(klines, 15, { open: 100, high: 101, low: 95, close: 99 });

    const result = calculateKeyPoints(klines, {
      testCount: 2,
      priceTolerance: 0.003,
      atrPeriod: 3,
      pivotWindow: 1,
      reactionBars: 1,
      minReactionAtr: 0.5,
      minTouchGap: 4,
    });

    expect(result).toEqual([]);
  });
});
