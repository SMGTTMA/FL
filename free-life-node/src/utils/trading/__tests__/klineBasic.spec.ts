import {
  getBodyLength,
  getUpperShadow,
  getLowerShadow,
  getTotalLength,
  isBullish,
  isBearish,
  getAverageVolume,
  isHighVolume,
} from '../klinePattern';
import { Kline } from '@/types/trading';

/**
 * 创建测试用K线数据
 */
function createKline(
  open: number,
  high: number,
  low: number,
  close: number,
): Kline {
  return {
    timestamp: '2024-01-01T00:00:00Z',
    open,
    high,
    low,
    close,
    volume: 1000,
  };
}

describe('getBodyLength', () => {
  it('阳线：收盘价高于开盘价', () => {
    const kline = createKline(100, 120, 95, 115);
    expect(getBodyLength(kline)).toBe(15);
  });

  it('阴线：收盘价低于开盘价', () => {
    const kline = createKline(100, 105, 85, 90);
    expect(getBodyLength(kline)).toBe(10);
  });

  it('十字星：开盘价等于收盘价', () => {
    const kline = createKline(100, 110, 90, 100);
    expect(getBodyLength(kline)).toBe(0);
  });

  it('小数精度：验证精度计算', () => {
    const kline = createKline(100.55, 101.2, 99.8, 100.75);
    expect(getBodyLength(kline)).toBeCloseTo(0.2, 10);
  });
});

describe('getUpperShadow', () => {
  it('阳线：上影线 = 最高价 - 收盘价', () => {
    const kline = createKline(100, 120, 95, 115);
    expect(getUpperShadow(kline)).toBe(5);
  });

  it('阴线：上影线 = 最高价 - 开盘价', () => {
    const kline = createKline(100, 105, 85, 90);
    expect(getUpperShadow(kline)).toBe(5);
  });

  it('无上影线：最高价等于较高价', () => {
    const kline = createKline(100, 115, 95, 115);
    expect(getUpperShadow(kline)).toBe(0);
  });

  it('长上影线：流星线形态', () => {
    const kline = createKline(100, 130, 98, 102);
    expect(getUpperShadow(kline)).toBe(28);
  });
});

describe('getLowerShadow', () => {
  it('阳线：下影线 = 开盘价 - 最低价', () => {
    const kline = createKline(100, 120, 95, 115);
    expect(getLowerShadow(kline)).toBe(5);
  });

  it('阴线：下影线 = 收盘价 - 最低价', () => {
    const kline = createKline(100, 105, 85, 90);
    expect(getLowerShadow(kline)).toBe(5);
  });

  it('无下影线：最低价等于较低价', () => {
    const kline = createKline(100, 115, 100, 115);
    expect(getLowerShadow(kline)).toBe(0);
  });

  it('长下影线：锤子线形态', () => {
    const kline = createKline(100, 102, 70, 98);
    expect(getLowerShadow(kline)).toBe(28);
  });
});

describe('getTotalLength', () => {
  it('常规K线：最高价 - 最低价', () => {
    const kline = createKline(100, 120, 90, 110);
    expect(getTotalLength(kline)).toBe(30);
  });

  it('一字板：最高价等于最低价', () => {
    const kline = createKline(100, 100, 100, 100);
    expect(getTotalLength(kline)).toBe(0);
  });

  it('小数精度：验证精度计算', () => {
    const kline = createKline(100.5, 101.25, 99.75, 100.8);
    expect(getTotalLength(kline)).toBeCloseTo(1.5, 10);
  });
});

describe('isBullish', () => {
  it('阳线：收盘价高于开盘价', () => {
    const kline = createKline(100, 120, 95, 115);
    expect(isBullish(kline)).toBe(true);
  });

  it('阴线：收盘价低于开盘价', () => {
    const kline = createKline(100, 105, 85, 90);
    expect(isBullish(kline)).toBe(false);
  });

  it('十字星：收盘价等于开盘价', () => {
    const kline = createKline(100, 110, 90, 100);
    expect(isBullish(kline)).toBe(false);
  });

  it('微涨：收盘价略高于开盘价', () => {
    const kline = createKline(100, 101, 99, 100.01);
    expect(isBullish(kline)).toBe(true);
  });
});

describe('isBearish', () => {
  it('阴线：收盘价低于开盘价', () => {
    const kline = createKline(100, 105, 85, 90);
    expect(isBearish(kline)).toBe(true);
  });

  it('阳线：收盘价高于开盘价', () => {
    const kline = createKline(100, 120, 95, 115);
    expect(isBearish(kline)).toBe(false);
  });

  it('十字星：收盘价等于开盘价', () => {
    const kline = createKline(100, 110, 90, 100);
    expect(isBearish(kline)).toBe(false);
  });

  it('微跌：收盘价略低于开盘价', () => {
    const kline = createKline(100, 101, 99, 99.99);
    expect(isBearish(kline)).toBe(true);
  });
});

describe('getAverageVolume', () => {
  /**
   * 创建带成交量的K线数据
   */
  function createKlineWithVolume(volume: number): Kline {
    return {
      timestamp: '2024-01-01T00:00:00Z',
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume,
    };
  }

  it('常规：计算多根K线的平均成交量', () => {
    const klines = [
      createKlineWithVolume(1000),
      createKlineWithVolume(2000),
      createKlineWithVolume(3000),
    ];
    expect(getAverageVolume(klines)).toBe(2000);
  });

  it('单根K线：返回该K线的成交量', () => {
    const klines = [createKlineWithVolume(5000)];
    expect(getAverageVolume(klines)).toBe(5000);
  });

  it('空数组：返回0', () => {
    expect(getAverageVolume([])).toBe(0);
  });

  it('null或undefined：返回0', () => {
    expect(getAverageVolume(null as unknown as Kline[])).toBe(0);
    expect(getAverageVolume(undefined as unknown as Kline[])).toBe(0);
  });

  it('成交量为0的K线：正确计算平均值', () => {
    const klines = [
      createKlineWithVolume(0),
      createKlineWithVolume(1000),
      createKlineWithVolume(2000),
    ];
    expect(getAverageVolume(klines)).toBe(1000);
  });

  it('小数成交量：保持精度', () => {
    const klines = [
      createKlineWithVolume(100.5),
      createKlineWithVolume(200.5),
      createKlineWithVolume(300.5),
    ];
    expect(getAverageVolume(klines)).toBeCloseTo(200.5, 10);
  });
});

describe('isHighVolume', () => {
  it('放量：成交量超过平均值1.5倍', () => {
    // 1600 >= 1000 * 1.5 = 1500
    expect(isHighVolume(1600, 1000)).toBe(true);
  });

  it('临界值：成交量刚好等于平均值1.5倍', () => {
    // 1500 >= 1000 * 1.5 = 1500
    expect(isHighVolume(1500, 1000)).toBe(true);
  });

  it('非放量：成交量低于平均值1.5倍', () => {
    // 1400 < 1000 * 1.5 = 1500
    expect(isHighVolume(1400, 1000)).toBe(false);
  });

  it('平均成交量为0：返回false', () => {
    expect(isHighVolume(1000, 0)).toBe(false);
  });

  it('当前成交量为0：返回false', () => {
    expect(isHighVolume(0, 1000)).toBe(false);
  });

  it('自定义阈值：2倍放量', () => {
    // 2000 >= 1000 * 2 = 2000
    expect(isHighVolume(2000, 1000, 2)).toBe(true);
    expect(isHighVolume(1999, 1000, 2)).toBe(false);
  });

  it('自定义阈值：1.2倍放量', () => {
    // 1200 >= 1000 * 1.2 = 1200
    expect(isHighVolume(1200, 1000, 1.2)).toBe(true);
    expect(isHighVolume(1199, 1000, 1.2)).toBe(false);
  });

  it('小数精度：验证小数计算', () => {
    // 150.5 >= 100.5 * 1.5 = 150.75
    expect(isHighVolume(150.5, 100.5, 1.5)).toBe(false);
    expect(isHighVolume(151, 100.5, 1.5)).toBe(true);
  });
});
