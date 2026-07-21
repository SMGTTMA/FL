import { Kline } from 'src/types/trading';
import { detectTrendByEmaAdx } from '../trading';

function buildKlinesOldToNew(
  count: number,
  startPrice: number,
  step: number,
  noiseAmp: number,
): Kline[] {
  const klines: Kline[] = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    const noise = Math.sin(i / 3) * noiseAmp;
    const open = price;
    const close = price + step + noise;
    const high = Math.max(open, close) + 0.6;
    const low = Math.min(open, close) - 0.6;

    klines.push({
      timestamp: new Date(Date.UTC(2024, 0, 1, i)).toISOString(),
      open,
      high,
      low,
      close,
      volume: 1000 + i,
    });

    price = close;
  }

  return klines;
}

describe('detectTrendByEmaAdx', () => {
  it('默认参数下可识别上涨趋势', () => {
    const oldToNew = buildKlinesOldToNew(120, 100, 0.5, 0.08);
    const newestToOldest = oldToNew.toReversed();

    const result = detectTrendByEmaAdx(newestToOldest);

    expect(result.trend).toBe('uptrend');
    expect(result.adx).not.toBeNull();
    expect(result.emaShort).not.toBeNull();
    expect(result.emaLong).not.toBeNull();
  });

  it('默认参数下可识别下跌趋势', () => {
    const oldToNew = buildKlinesOldToNew(120, 200, -0.5, 0.08);
    const newestToOldest = oldToNew.toReversed();

    const result = detectTrendByEmaAdx(newestToOldest);

    expect(result.trend).toBe('downtrend');
    expect(result.adx).not.toBeNull();
  });

  it('默认参数下可识别震荡（ADX 不达阈值）', () => {
    const oldToNew = buildKlinesOldToNew(120, 100, 0, 0.2);
    const newestToOldest = oldToNew.toReversed();

    const result = detectTrendByEmaAdx(newestToOldest);

    expect(result.trend).toBe('sideways');
    expect(result.adx).not.toBeNull();
    expect(result.adx!).toBeLessThan(23);
  });

  it('K线不足时返回震荡和空指标', () => {
    const oldToNew = buildKlinesOldToNew(30, 100, 0.3, 0.05);
    const newestToOldest = oldToNew.toReversed();

    const result = detectTrendByEmaAdx(newestToOldest);

    expect(result.trend).toBe('sideways');
    expect(result.emaShort).toBeNull();
    expect(result.emaLong).toBeNull();
    expect(result.adx).toBeNull();
  });
});
