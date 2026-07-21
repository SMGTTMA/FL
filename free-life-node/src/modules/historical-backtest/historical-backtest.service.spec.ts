import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import { KlineCacheService } from '@/modules/kline-cache/kline-cache.service';
import { Kline } from '@/types/trading';
import { HistoricalBacktestService } from './historical-backtest.service';

describe('HistoricalBacktestService.getGridCashKeyPoints', () => {
  const createKlines = (length: number): Kline[] => {
    const newestTimestamp = new Date('2026-01-01T12:00:00.000Z').getTime();
    return Array.from({ length }, (_, index) => ({
      timestamp: new Date(
        newestTimestamp - index * 5 * 60 * 1000,
      ).toISOString(),
      open: 102,
      high: 104,
      low: 100,
      close: 102,
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

  it('应该使用生产方法计算关键位并排除返回K线中的未收盘K线', async () => {
    const rawKlines = createKlines(60);
    setKline(rawKlines, 35, {
      open: 100,
      high: 101,
      low: 95.2,
      close: 99,
    });
    setKline(rawKlines, 15, {
      open: 100,
      high: 101,
      low: 95,
      close: 99,
    });
    const getKlines = jest.fn().mockReturnValue(rawKlines);
    const service = new HistoricalBacktestService({
      getKlines,
    } as unknown as KlineCacheService);

    const response = await service.getGridCashKeyPoints({
      symbol: 'BTC/USDT',
      timeframe: TimeFrame.M5,
      env: 'test',
      klineNum: 60,
    });

    expect(getKlines).toHaveBeenCalledWith('BTC/USDT', TimeFrame.M5, 'test', {
      klinesSliceNum: 60,
      needReverse: true,
    });
    expect(response.data.latestClose).toBe(102);
    expect(response.data.keyPoints).toEqual([
      {
        price: 95.2,
        strength: 2,
        timestamps: [rawKlines[35].timestamp, rawKlines[15].timestamp],
      },
    ]);
    expect(response.data.supports).toEqual(response.data.keyPoints);
    expect(response.data.resistances).toEqual([]);
    expect(response.data.klines).toEqual(rawKlines.slice(1));
    expect(response.data.meta.options).toMatchObject({
      testCount: 2,
      priceTolerance: 0.003,
      atrPeriod: 14,
      pivotWindow: 2,
      reactionBars: 3,
      minReactionAtr: 0.8,
      minTouchGap: 4,
    });
  });

  it('H1回测应该默认使用现金网格长周期配置', async () => {
    const currentKline = createKlines(1);
    const getKlines = jest.fn().mockReturnValue(currentKline);
    const service = new HistoricalBacktestService({
      getKlines,
    } as unknown as KlineCacheService);

    const response = await service.getGridCashKeyPoints({
      symbol: 'BTC/USDT',
      timeframe: TimeFrame.H1,
      env: 'prod',
      includeKlines: false,
    });

    expect(response.data.keyPoints).toEqual([]);
    expect(response.data.meta.options.testCount).toBe(2);
    expect(response.data.meta.options.priceTolerance).toBe(0.01);
    expect(response.data.meta.analyzedClosedKlineNum).toBe(0);
  });
});
