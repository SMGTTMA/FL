import {
  isDoji,
  isPinbar,
  isStrongBullish,
  isStrongBearish,
  isBullishEngulfing,
  isBearishEngulfing,
  isDarkCloudCover,
  isPiercingPattern,
  isEveningStar,
  isMorningStar,
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

describe('isDoji', () => {
  it('标准十字星：开盘价等于收盘价', () => {
    // 总长度 20，实体长度 0
    const kline = createKline(100, 110, 90, 100);
    expect(isDoji(kline)).toBe(true);
  });

  it('小实体十字星：实体占比小于10%', () => {
    // 总长度 20，实体长度 1 (5%)
    const kline = createKline(100, 110, 90, 101);
    expect(isDoji(kline)).toBe(true);
  });

  it('临界值：实体占比刚好等于10%', () => {
    // 总长度 20，实体长度 2 (10%)
    const kline = createKline(100, 110, 90, 102);
    expect(isDoji(kline)).toBe(true);
  });

  it('非十字星：实体占比超过10%', () => {
    // 总长度 20，实体长度 3 (15%)
    const kline = createKline(100, 110, 90, 103);
    expect(isDoji(kline)).toBe(false);
  });

  it('一字板：总长度为0时返回true', () => {
    const kline = createKline(100, 100, 100, 100);
    expect(isDoji(kline)).toBe(true);
  });

  it('大阳线：实体占比高', () => {
    // 总长度 20，实体长度 15 (75%)
    const kline = createKline(95, 110, 90, 110);
    expect(isDoji(kline)).toBe(false);
  });

  it('自定义阈值：20%阈值', () => {
    // 总长度 20，实体长度 3 (15%)
    const kline = createKline(100, 110, 90, 103);
    expect(isDoji(kline, 0.2)).toBe(true);
  });

  it('自定义阈值：5%阈值', () => {
    // 总长度 20，实体长度 1 (5%)
    const kline = createKline(100, 110, 90, 101);
    expect(isDoji(kline, 0.05)).toBe(true);
  });
});

describe('isPinbar', () => {
  describe('锤子线（hammer）', () => {
    it('标准锤子线：下影线占比超过2/3', () => {
      // 总长度 30，下影线 22，上影线 5，实体 3
      const kline = createKline(100, 103, 78, 98);
      const result = isPinbar(kline);
      expect(result.isPinbar).toBe(true);
      expect(result.type).toBe('hammer');
    });

    it('锤子线临界值：下影线刚好占2/3', () => {
      // 总长度 30，下影线 20 (2/3)
      const kline = createKline(100, 110, 80, 105);
      const result = isPinbar(kline);
      expect(result.isPinbar).toBe(true);
      expect(result.type).toBe('hammer');
    });

    it('下影线不够长：不是锤子线', () => {
      // 总长度 30，下影线 10 (1/3)
      const kline = createKline(100, 110, 90, 105);
      const result = isPinbar(kline);
      expect(result.isPinbar).toBe(false);
      expect(result.type).toBe(null);
    });
  });

  describe('流星线（shooting_star）', () => {
    it('标准流星线：上影线占比超过2/3', () => {
      // 总长度 30，上影线 22，下影线 5，实体 3
      const kline = createKline(100, 122, 97, 102);
      const result = isPinbar(kline);
      expect(result.isPinbar).toBe(true);
      expect(result.type).toBe('shooting_star');
    });

    it('流星线临界值：上影线刚好占2/3', () => {
      // 总长度 30，上影线 20 (2/3)
      const kline = createKline(100, 120, 90, 95);
      const result = isPinbar(kline);
      expect(result.isPinbar).toBe(true);
      expect(result.type).toBe('shooting_star');
    });

    it('上影线不够长：不是流星线', () => {
      // 总长度 30，上影线 10 (1/3)
      const kline = createKline(100, 110, 90, 95);
      const result = isPinbar(kline);
      expect(result.isPinbar).toBe(false);
      expect(result.type).toBe(null);
    });
  });

  describe('边界情况', () => {
    it('一字板：总长度为0', () => {
      const kline = createKline(100, 100, 100, 100);
      const result = isPinbar(kline);
      expect(result.isPinbar).toBe(false);
      expect(result.type).toBe(null);
    });

    it('自定义阈值：50%', () => {
      // 总长度 20，下影线 12 (60%)
      const kline = createKline(100, 102, 90, 98);
      const result = isPinbar(kline, { shadowRatio: 0.5 });
      expect(result.isPinbar).toBe(true);
      expect(result.type).toBe('hammer');
    });

    it('自定义阈值：80%', () => {
      // 总长度 30，下影线 20 (2/3 ≈ 66%)
      const kline = createKline(100, 110, 80, 105);
      const result = isPinbar(kline, { shadowRatio: 0.8 });
      expect(result.isPinbar).toBe(false);
      expect(result.type).toBe(null);
    });
  });
});

describe('isStrongBullish', () => {
  /**
   * 创建带成交量的K线数据
   */
  function createKlineWithVolume(
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number,
  ): Kline {
    return {
      timestamp: '2024-01-01T00:00:00Z',
      open,
      high,
      low,
      close,
      volume,
    };
  }

  describe('只判断实体（不传成交量）', () => {
    it('大阳线：实体占比超过70%', () => {
      // 总长度 20，实体 16 (80%)，阳线
      const kline = createKline(92, 110, 90, 108);
      expect(isStrongBullish(kline)).toBe(true);
    });

    it('临界值：实体占比刚好等于70%', () => {
      // 总长度 20，实体 14 (70%)，阳线
      const kline = createKline(93, 110, 90, 107);
      expect(isStrongBullish(kline)).toBe(true);
    });

    it('非大阳线：实体占比不足70%', () => {
      // 总长度 20，实体 10 (50%)，阳线
      const kline = createKline(95, 110, 90, 105);
      expect(isStrongBullish(kline)).toBe(false);
    });

    it('阴线不是大阳线', () => {
      // 总长度 20，实体 16 (80%)，阴线
      const kline = createKline(108, 110, 90, 92);
      expect(isStrongBullish(kline)).toBe(false);
    });

    it('一字板：总长度为0返回false', () => {
      const kline = createKline(100, 100, 100, 100);
      expect(isStrongBullish(kline)).toBe(false);
    });

    it('自定义实体占比阈值', () => {
      // 总长度 20，实体 12 (60%)
      const kline = createKline(94, 110, 90, 106);
      expect(isStrongBullish(kline, { bodyRatio: 0.5 })).toBe(true);
      expect(isStrongBullish(kline, { bodyRatio: 0.7 })).toBe(false);
    });
  });

  describe('配合成交量判断', () => {
    it('放量大阳线', () => {
      // 总长度 20，实体 16 (80%)，成交量 2000，平均成交量 1000
      const kline = createKlineWithVolume(92, 110, 90, 108, 2000);
      expect(isStrongBullish(kline, { averageVolume: 1000 })).toBe(true);
    });

    it('缩量大阳线：成交量不足', () => {
      // 总长度 20，实体 16 (80%)，成交量 1000，平均成交量 1000
      const kline = createKlineWithVolume(92, 110, 90, 108, 1000);
      expect(isStrongBullish(kline, { averageVolume: 1000 })).toBe(false);
    });

    it('放量但实体不够大', () => {
      // 总长度 20，实体 10 (50%)，成交量 2000
      const kline = createKlineWithVolume(95, 110, 90, 105, 2000);
      expect(isStrongBullish(kline, { averageVolume: 1000 })).toBe(false);
    });

    it('自定义放量倍数', () => {
      // 成交量 1800，平均成交量 1000
      const kline = createKlineWithVolume(92, 110, 90, 108, 1800);
      expect(isStrongBullish(kline, { averageVolume: 1000, volumeThreshold: 1.5 })).toBe(true);
      expect(isStrongBullish(kline, { averageVolume: 1000, volumeThreshold: 2 })).toBe(false);
    });
  });
});

describe('isStrongBearish', () => {
  /**
   * 创建带成交量的K线数据
   */
  function createKlineWithVolume(
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number,
  ): Kline {
    return {
      timestamp: '2024-01-01T00:00:00Z',
      open,
      high,
      low,
      close,
      volume,
    };
  }

  describe('只判断实体（不传成交量）', () => {
    it('大阴线：实体占比超过70%', () => {
      // 总长度 20，实体 16 (80%)，阴线
      const kline = createKline(108, 110, 90, 92);
      expect(isStrongBearish(kline)).toBe(true);
    });

    it('临界值：实体占比刚好等于70%', () => {
      // 总长度 20，实体 14 (70%)，阴线
      const kline = createKline(107, 110, 90, 93);
      expect(isStrongBearish(kline)).toBe(true);
    });

    it('非大阴线：实体占比不足70%', () => {
      // 总长度 20，实体 10 (50%)，阴线
      const kline = createKline(105, 110, 90, 95);
      expect(isStrongBearish(kline)).toBe(false);
    });

    it('阳线不是大阴线', () => {
      // 总长度 20，实体 16 (80%)，阳线
      const kline = createKline(92, 110, 90, 108);
      expect(isStrongBearish(kline)).toBe(false);
    });

    it('一字板：总长度为0返回false', () => {
      const kline = createKline(100, 100, 100, 100);
      expect(isStrongBearish(kline)).toBe(false);
    });

    it('自定义实体占比阈值', () => {
      // 总长度 20，实体 12 (60%)
      const kline = createKline(106, 110, 90, 94);
      expect(isStrongBearish(kline, { bodyRatio: 0.5 })).toBe(true);
      expect(isStrongBearish(kline, { bodyRatio: 0.7 })).toBe(false);
    });
  });

  describe('配合成交量判断', () => {
    it('放量大阴线', () => {
      // 总长度 20，实体 16 (80%)，成交量 2000，平均成交量 1000
      const kline = createKlineWithVolume(108, 110, 90, 92, 2000);
      expect(isStrongBearish(kline, { averageVolume: 1000 })).toBe(true);
    });

    it('缩量大阴线：成交量不足', () => {
      // 总长度 20，实体 16 (80%)，成交量 1000，平均成交量 1000
      const kline = createKlineWithVolume(108, 110, 90, 92, 1000);
      expect(isStrongBearish(kline, { averageVolume: 1000 })).toBe(false);
    });

    it('放量但实体不够大', () => {
      // 总长度 20，实体 10 (50%)，成交量 2000
      const kline = createKlineWithVolume(105, 110, 90, 95, 2000);
      expect(isStrongBearish(kline, { averageVolume: 1000 })).toBe(false);
    });

    it('自定义放量倍数', () => {
      // 成交量 1800，平均成交量 1000
      const kline = createKlineWithVolume(108, 110, 90, 92, 1800);
      expect(isStrongBearish(kline, { averageVolume: 1000, volumeThreshold: 1.5 })).toBe(true);
      expect(isStrongBearish(kline, { averageVolume: 1000, volumeThreshold: 2 })).toBe(false);
    });
  });
});

describe('isBullishEngulfing', () => {
  /**
   * 创建带成交量的K线数据
   */
  function createKlineWithVolume(
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number,
  ): Kline {
    return {
      timestamp: '2024-01-01T00:00:00Z',
      open,
      high,
      low,
      close,
      volume,
    };
  }

  describe('只判断形态（不传成交量）', () => {
    it('标准看涨吞没：阳线完全吞没阴线', () => {
      // 前一根阴线：开100，收95
      // 当前阳线：开94，收101（完全吞没）
      const prevKline = createKline(100, 102, 94, 95);
      const currKline = createKline(94, 102, 93, 101);
      expect(isBullishEngulfing(prevKline, currKline)).toBe(true);
    });

    it('临界值：阳线刚好吞没阴线', () => {
      // 前一根阴线：开100，收95
      // 当前阳线：开95，收100（刚好吞没）
      const prevKline = createKline(100, 102, 94, 95);
      const currKline = createKline(95, 101, 94, 100);
      expect(isBullishEngulfing(prevKline, currKline)).toBe(true);
    });

    it('未完全吞没：阳线收盘低于阴线开盘', () => {
      // 前一根阴线：开100，收95
      // 当前阳线：开94，收99（未完全吞没）
      const prevKline = createKline(100, 102, 94, 95);
      const currKline = createKline(94, 100, 93, 99);
      expect(isBullishEngulfing(prevKline, currKline)).toBe(false);
    });

    it('未完全吞没：阳线开盘高于阴线收盘', () => {
      // 前一根阴线：开100，收95
      // 当前阳线：开96，收101（未完全吞没）
      const prevKline = createKline(100, 102, 94, 95);
      const currKline = createKline(96, 102, 95, 101);
      expect(isBullishEngulfing(prevKline, currKline)).toBe(false);
    });

    it('前一根不是阴线', () => {
      const prevKline = createKline(95, 102, 94, 100); // 阳线
      const currKline = createKline(94, 102, 93, 101);
      expect(isBullishEngulfing(prevKline, currKline)).toBe(false);
    });

    it('当前不是阳线', () => {
      const prevKline = createKline(100, 102, 94, 95); // 阴线
      const currKline = createKline(101, 102, 93, 94); // 阴线
      expect(isBullishEngulfing(prevKline, currKline)).toBe(false);
    });
  });

  describe('配合成交量判断', () => {
    it('放量看涨吞没', () => {
      const prevKline = createKlineWithVolume(100, 102, 94, 95, 1000);
      const currKline = createKlineWithVolume(94, 102, 93, 101, 2000);
      expect(isBullishEngulfing(prevKline, currKline, { averageVolume: 1000 })).toBe(true);
    });

    it('缩量看涨吞没：成交量不足', () => {
      const prevKline = createKlineWithVolume(100, 102, 94, 95, 1000);
      const currKline = createKlineWithVolume(94, 102, 93, 101, 1000);
      expect(isBullishEngulfing(prevKline, currKline, { averageVolume: 1000 })).toBe(false);
    });

    it('自定义放量倍数', () => {
      const prevKline = createKlineWithVolume(100, 102, 94, 95, 1000);
      const currKline = createKlineWithVolume(94, 102, 93, 101, 1800);
      expect(isBullishEngulfing(prevKline, currKline, { averageVolume: 1000, volumeThreshold: 1.5 })).toBe(true);
      expect(isBullishEngulfing(prevKline, currKline, { averageVolume: 1000, volumeThreshold: 2 })).toBe(false);
    });
  });
});

describe('isBearishEngulfing', () => {
  /**
   * 创建带成交量的K线数据
   */
  function createKlineWithVolume(
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number,
  ): Kline {
    return {
      timestamp: '2024-01-01T00:00:00Z',
      open,
      high,
      low,
      close,
      volume,
    };
  }

  describe('只判断形态（不传成交量）', () => {
    it('标准看跌吞没：阴线完全吞没阳线', () => {
      // 前一根阳线：开95，收100
      // 当前阴线：开101，收94（完全吞没）
      const prevKline = createKline(95, 101, 94, 100);
      const currKline = createKline(101, 102, 93, 94);
      expect(isBearishEngulfing(prevKline, currKline)).toBe(true);
    });

    it('临界值：阴线刚好吞没阳线', () => {
      // 前一根阳线：开95，收100
      // 当前阴线：开100，收95（刚好吞没）
      const prevKline = createKline(95, 101, 94, 100);
      const currKline = createKline(100, 101, 94, 95);
      expect(isBearishEngulfing(prevKline, currKline)).toBe(true);
    });

    it('未完全吞没：阴线收盘高于阳线开盘', () => {
      // 前一根阳线：开95，收100
      // 当前阴线：开101，收96（未完全吞没）
      const prevKline = createKline(95, 101, 94, 100);
      const currKline = createKline(101, 102, 95, 96);
      expect(isBearishEngulfing(prevKline, currKline)).toBe(false);
    });

    it('未完全吞没：阴线开盘低于阳线收盘', () => {
      // 前一根阳线：开95，收100
      // 当前阴线：开99，收94（未完全吞没）
      const prevKline = createKline(95, 101, 94, 100);
      const currKline = createKline(99, 100, 93, 94);
      expect(isBearishEngulfing(prevKline, currKline)).toBe(false);
    });

    it('前一根不是阳线', () => {
      const prevKline = createKline(100, 101, 94, 95); // 阴线
      const currKline = createKline(101, 102, 93, 94);
      expect(isBearishEngulfing(prevKline, currKline)).toBe(false);
    });

    it('当前不是阴线', () => {
      const prevKline = createKline(95, 101, 94, 100); // 阳线
      const currKline = createKline(94, 102, 93, 101); // 阳线
      expect(isBearishEngulfing(prevKline, currKline)).toBe(false);
    });
  });

  describe('配合成交量判断', () => {
    it('放量看跌吞没', () => {
      const prevKline = createKlineWithVolume(95, 101, 94, 100, 1000);
      const currKline = createKlineWithVolume(101, 102, 93, 94, 2000);
      expect(isBearishEngulfing(prevKline, currKline, { averageVolume: 1000 })).toBe(true);
    });

    it('缩量看跌吞没：成交量不足', () => {
      const prevKline = createKlineWithVolume(95, 101, 94, 100, 1000);
      const currKline = createKlineWithVolume(101, 102, 93, 94, 1000);
      expect(isBearishEngulfing(prevKline, currKline, { averageVolume: 1000 })).toBe(false);
    });

    it('自定义放量倍数', () => {
      const prevKline = createKlineWithVolume(95, 101, 94, 100, 1000);
      const currKline = createKlineWithVolume(101, 102, 93, 94, 1800);
      expect(isBearishEngulfing(prevKline, currKline, { averageVolume: 1000, volumeThreshold: 1.5 })).toBe(true);
      expect(isBearishEngulfing(prevKline, currKline, { averageVolume: 1000, volumeThreshold: 2 })).toBe(false);
    });
  });
});

describe('isDarkCloudCover', () => {
  /**
   * 创建带成交量的K线数据
   */
  function createKlineWithVolume(
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number,
  ): Kline {
    return {
      timestamp: '2024-01-01T00:00:00Z',
      open,
      high,
      low,
      close,
      volume,
    };
  }

  describe('只判断形态（不传成交量）', () => {
    it('标准乌云盖顶：阴线刺入阳线实体超过50%', () => {
      // 前一根阳线：开90，收100（实体10）
      // 当前阴线：开102，收94（刺入6，超过50%）
      // 阳线中点 = 90 + 10 * 0.5 = 95
      const prevKline = createKline(90, 101, 89, 100);
      const currKline = createKline(102, 103, 93, 94);
      expect(isDarkCloudCover(prevKline, currKline)).toBe(true);
    });

    it('临界值：阴线刚好刺入阳线实体50%', () => {
      // 前一根阳线：开90，收100（实体10）
      // 阳线中点 = 90 + 10 * 0.5 = 95
      // 当前阴线收盘价需要 < 95
      const prevKline = createKline(90, 101, 89, 100);
      const currKline = createKline(102, 103, 94, 94.9);
      expect(isDarkCloudCover(prevKline, currKline)).toBe(true);
    });

    it('刺入不足：阴线刺入阳线实体不足50%', () => {
      // 前一根阳线：开90，收100（实体10）
      // 阳线中点 = 95
      // 当前阴线收盘价 96 >= 95，不满足
      const prevKline = createKline(90, 101, 89, 100);
      const currKline = createKline(102, 103, 95, 96);
      expect(isDarkCloudCover(prevKline, currKline)).toBe(false);
    });

    it('开盘价不够高：阴线开盘低于阳线收盘', () => {
      const prevKline = createKline(90, 101, 89, 100);
      const currKline = createKline(99, 100, 93, 94); // 开盘99 <= 收盘100
      expect(isDarkCloudCover(prevKline, currKline)).toBe(false);
    });

    it('前一根不是阳线', () => {
      const prevKline = createKline(100, 101, 89, 90); // 阴线
      const currKline = createKline(102, 103, 93, 94);
      expect(isDarkCloudCover(prevKline, currKline)).toBe(false);
    });

    it('当前不是阴线', () => {
      const prevKline = createKline(90, 101, 89, 100); // 阳线
      const currKline = createKline(94, 103, 93, 102); // 阳线
      expect(isDarkCloudCover(prevKline, currKline)).toBe(false);
    });

    it('自定义刺入比例：60%', () => {
      // 前一根阳线：开90，收100（实体10）
      // 60%刺入点 = 90 + 10 * 0.6 = 96，收盘95<96满足
      // 70%刺入点 = 90 + 10 * 0.7 = 97，收盘97>=97不满足
      const prevKline = createKline(90, 101, 89, 100);
      const currKline1 = createKline(102, 103, 94, 95);
      const currKline2 = createKline(102, 103, 96, 97);
      expect(isDarkCloudCover(prevKline, currKline1, { penetrationRatio: 0.6 })).toBe(true);
      expect(isDarkCloudCover(prevKline, currKline2, { penetrationRatio: 0.7 })).toBe(false);
    });
  });

  describe('配合成交量判断', () => {
    it('放量乌云盖顶', () => {
      const prevKline = createKlineWithVolume(90, 101, 89, 100, 1000);
      const currKline = createKlineWithVolume(102, 103, 93, 94, 2000);
      expect(isDarkCloudCover(prevKline, currKline, { averageVolume: 1000 })).toBe(true);
    });

    it('缩量乌云盖顶：成交量不足', () => {
      const prevKline = createKlineWithVolume(90, 101, 89, 100, 1000);
      const currKline = createKlineWithVolume(102, 103, 93, 94, 1000);
      expect(isDarkCloudCover(prevKline, currKline, { averageVolume: 1000 })).toBe(false);
    });

    it('自定义放量倍数', () => {
      const prevKline = createKlineWithVolume(90, 101, 89, 100, 1000);
      const currKline = createKlineWithVolume(102, 103, 93, 94, 1800);
      expect(isDarkCloudCover(prevKline, currKline, { averageVolume: 1000, volumeThreshold: 1.5 })).toBe(true);
      expect(isDarkCloudCover(prevKline, currKline, { averageVolume: 1000, volumeThreshold: 2 })).toBe(false);
    });
  });
});

describe('isPiercingPattern', () => {
  /**
   * 创建带成交量的K线数据
   */
  function createKlineWithVolume(
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number,
  ): Kline {
    return {
      timestamp: '2024-01-01T00:00:00Z',
      open,
      high,
      low,
      close,
      volume,
    };
  }

  describe('只判断形态（不传成交量）', () => {
    it('标准刺透形态：阳线刺入阴线实体超过50%', () => {
      // 前一根阴线：开100，收90（实体10）
      // 当前阳线：开88，收96（刺入6，超过50%）
      // 阴线中点 = 90 + 10 * 0.5 = 95
      const prevKline = createKline(100, 101, 89, 90);
      const currKline = createKline(88, 97, 87, 96);
      expect(isPiercingPattern(prevKline, currKline)).toBe(true);
    });

    it('临界值：阳线刚好刺入阴线实体50%', () => {
      // 前一根阴线：开100，收90（实体10）
      // 阴线中点 = 90 + 10 * 0.5 = 95
      // 当前阳线收盘价需要 > 95
      const prevKline = createKline(100, 101, 89, 90);
      const currKline = createKline(88, 96, 87, 95.1);
      expect(isPiercingPattern(prevKline, currKline)).toBe(true);
    });

    it('刺入不足：阳线刺入阴线实体不足50%', () => {
      // 前一根阴线：开100，收90（实体10）
      // 阴线中点 = 95
      // 当前阳线收盘价 94 <= 95，不满足
      const prevKline = createKline(100, 101, 89, 90);
      const currKline = createKline(88, 95, 87, 94);
      expect(isPiercingPattern(prevKline, currKline)).toBe(false);
    });

    it('开盘价不够低：阳线开盘高于阴线收盘', () => {
      const prevKline = createKline(100, 101, 89, 90);
      const currKline = createKline(91, 97, 90, 96); // 开盘91 >= 收盘90
      expect(isPiercingPattern(prevKline, currKline)).toBe(false);
    });

    it('前一根不是阴线', () => {
      const prevKline = createKline(90, 101, 89, 100); // 阳线
      const currKline = createKline(88, 97, 87, 96);
      expect(isPiercingPattern(prevKline, currKline)).toBe(false);
    });

    it('当前不是阳线', () => {
      const prevKline = createKline(100, 101, 89, 90); // 阴线
      const currKline = createKline(96, 97, 87, 88); // 阴线
      expect(isPiercingPattern(prevKline, currKline)).toBe(false);
    });

    it('自定义刺入比例：60%', () => {
      // 前一根阴线：开100，收90（实体10）
      // 60%中点 = 90 + 10 * 0.6 = 96
      const prevKline = createKline(100, 101, 89, 90);
      const currKline = createKline(88, 98, 87, 97);
      expect(isPiercingPattern(prevKline, currKline, { penetrationRatio: 0.6 })).toBe(true);
      expect(isPiercingPattern(prevKline, currKline, { penetrationRatio: 0.8 })).toBe(false);
    });
  });

  describe('配合成交量判断', () => {
    it('放量刺透形态', () => {
      const prevKline = createKlineWithVolume(100, 101, 89, 90, 1000);
      const currKline = createKlineWithVolume(88, 97, 87, 96, 2000);
      expect(isPiercingPattern(prevKline, currKline, { averageVolume: 1000 })).toBe(true);
    });

    it('缩量刺透形态：成交量不足', () => {
      const prevKline = createKlineWithVolume(100, 101, 89, 90, 1000);
      const currKline = createKlineWithVolume(88, 97, 87, 96, 1000);
      expect(isPiercingPattern(prevKline, currKline, { averageVolume: 1000 })).toBe(false);
    });

    it('自定义放量倍数', () => {
      const prevKline = createKlineWithVolume(100, 101, 89, 90, 1000);
      const currKline = createKlineWithVolume(88, 97, 87, 96, 1800);
      expect(isPiercingPattern(prevKline, currKline, { averageVolume: 1000, volumeThreshold: 1.5 })).toBe(true);
      expect(isPiercingPattern(prevKline, currKline, { averageVolume: 1000, volumeThreshold: 2 })).toBe(false);
    });
  });
});

describe('isEveningStar', () => {
  /**
   * 创建带成交量的K线数据
   */
  function createKlineWithVolume(
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number,
  ): Kline {
    return {
      timestamp: '2024-01-01T00:00:00Z',
      open,
      high,
      low,
      close,
      volume,
    };
  }

  describe('只判断形态（不传成交量）', () => {
    it('标准黄昏星：第3根刺入第1根实体超过50%', () => {
      // 第1根阳线：开90，收100（实体10）
      // 第2根小实体：开101，收102（实体1，小于10*0.5=5）
      // 第3根阴线：开99，收94（刺入点=90+10*0.5=95，收盘94<95）
      const kline1 = createKline(90, 101, 89, 100);
      const kline2 = createKline(101, 103, 100, 102);
      const kline3 = createKline(99, 100, 93, 94);
      expect(isEveningStar(kline1, kline2, kline3)).toBe(true);
    });

    it('临界值：第3根刚好刺入第1根实体50%', () => {
      // 第1根阳线：开90，收100（实体10）
      // 刺入点 = 90 + 10 * 0.5 = 95
      // 第3根阴线收盘价需要 < 95
      const kline1 = createKline(90, 101, 89, 100);
      const kline2 = createKline(101, 103, 100, 102);
      const kline3 = createKline(99, 100, 94, 94.9);
      expect(isEveningStar(kline1, kline2, kline3)).toBe(true);
    });

    it('刺入不足：第3根刺入第1根实体不足50%', () => {
      // 第3根阴线收盘价 96 >= 95，不满足
      const kline1 = createKline(90, 101, 89, 100);
      const kline2 = createKline(101, 103, 100, 102);
      const kline3 = createKline(99, 100, 95, 96);
      expect(isEveningStar(kline1, kline2, kline3)).toBe(false);
    });

    it('第2根实体过大：超过第1根实体的50%', () => {
      // 第1根实体10，第2根实体6 > 10*0.5=5
      const kline1 = createKline(90, 101, 89, 100);
      const kline2 = createKline(100, 107, 99, 106); // 实体6
      const kline3 = createKline(99, 100, 93, 94);
      expect(isEveningStar(kline1, kline2, kline3)).toBe(false);
    });

    it('第1根不是阳线', () => {
      const kline1 = createKline(100, 101, 89, 90); // 阴线
      const kline2 = createKline(91, 93, 90, 92);
      const kline3 = createKline(99, 100, 93, 94);
      expect(isEveningStar(kline1, kline2, kline3)).toBe(false);
    });

    it('第3根不是阴线', () => {
      const kline1 = createKline(90, 101, 89, 100);
      const kline2 = createKline(101, 103, 100, 102);
      const kline3 = createKline(94, 100, 93, 99); // 阳线
      expect(isEveningStar(kline1, kline2, kline3)).toBe(false);
    });

    it('第1根实体为0', () => {
      const kline1 = createKline(100, 101, 99, 100); // 实体为0
      const kline2 = createKline(101, 103, 100, 102);
      const kline3 = createKline(99, 100, 93, 94);
      expect(isEveningStar(kline1, kline2, kline3)).toBe(false);
    });

    it('自定义刺入比例和第2根实体比例', () => {
      // 第1根阳线：开90，收100，实体10
      // 第2根实体2（占比20%）
      // 50%刺入点 = 90 + 10 * 0.5 = 95，收盘96>=95不满足
      // 70%刺入点 = 90 + 10 * 0.7 = 97，收盘96<97满足
      const kline1 = createKline(90, 101, 89, 100);
      const kline2 = createKline(101, 103, 100, 103);
      const kline3 = createKline(99, 100, 95, 96);
      // 刺入50%需要收盘<95，但收盘96>=95，不满足
      expect(isEveningStar(kline1, kline2, kline3, { penetrationRatio: 0.5, middleBodyRatio: 0.3 })).toBe(false);
      // 刺入70%需要收盘<97，收盘96<97，满足
      expect(isEveningStar(kline1, kline2, kline3, { penetrationRatio: 0.7, middleBodyRatio: 0.3 })).toBe(true);
    });
  });

  describe('配合成交量判断', () => {
    it('放量黄昏星', () => {
      const kline1 = createKlineWithVolume(90, 101, 89, 100, 1000);
      const kline2 = createKlineWithVolume(101, 103, 100, 102, 500);
      const kline3 = createKlineWithVolume(99, 100, 93, 94, 2000);
      expect(isEveningStar(kline1, kline2, kline3, { averageVolume: 1000 })).toBe(true);
    });

    it('缩量黄昏星：成交量不足', () => {
      const kline1 = createKlineWithVolume(90, 101, 89, 100, 1000);
      const kline2 = createKlineWithVolume(101, 103, 100, 102, 500);
      const kline3 = createKlineWithVolume(99, 100, 93, 94, 1000);
      expect(isEveningStar(kline1, kline2, kline3, { averageVolume: 1000 })).toBe(false);
    });

    it('自定义放量倍数', () => {
      const kline1 = createKlineWithVolume(90, 101, 89, 100, 1000);
      const kline2 = createKlineWithVolume(101, 103, 100, 102, 500);
      const kline3 = createKlineWithVolume(99, 100, 93, 94, 1800);
      expect(isEveningStar(kline1, kline2, kline3, { averageVolume: 1000, volumeThreshold: 1.5 })).toBe(true);
      expect(isEveningStar(kline1, kline2, kline3, { averageVolume: 1000, volumeThreshold: 2 })).toBe(false);
    });
  });
});

describe('isMorningStar', () => {
  /**
   * 创建带成交量的K线数据
   */
  function createKlineWithVolume(
    open: number,
    high: number,
    low: number,
    close: number,
    volume: number,
  ): Kline {
    return {
      timestamp: '2024-01-01T00:00:00Z',
      open,
      high,
      low,
      close,
      volume,
    };
  }

  describe('只判断形态（不传成交量）', () => {
    it('标准启明星：第3根刺入第1根实体超过50%', () => {
      // 第1根阴线：开100，收90（实体10）
      // 第2根小实体：开89，收88（实体1，小于10*0.5=5）
      // 第3根阳线：开91，收96（刺入点=90+10*0.5=95，收盘96>95）
      const kline1 = createKline(100, 101, 89, 90);
      const kline2 = createKline(89, 90, 87, 88);
      const kline3 = createKline(91, 97, 90, 96);
      expect(isMorningStar(kline1, kline2, kline3)).toBe(true);
    });

    it('临界值：第3根刚好刺入第1根实体50%', () => {
      // 第1根阴线：开100，收90（实体10）
      // 刺入点 = 90 + 10 * 0.5 = 95
      // 第3根阳线收盘价需要 > 95
      const kline1 = createKline(100, 101, 89, 90);
      const kline2 = createKline(89, 90, 87, 88);
      const kline3 = createKline(91, 96, 90, 95.1);
      expect(isMorningStar(kline1, kline2, kline3)).toBe(true);
    });

    it('刺入不足：第3根刺入第1根实体不足50%', () => {
      // 第3根阳线收盘价 94 <= 95，不满足
      const kline1 = createKline(100, 101, 89, 90);
      const kline2 = createKline(89, 90, 87, 88);
      const kline3 = createKline(91, 95, 90, 94);
      expect(isMorningStar(kline1, kline2, kline3)).toBe(false);
    });

    it('第2根实体过大：超过第1根实体的50%', () => {
      // 第1根实体10，第2根实体6 > 10*0.5=5
      const kline1 = createKline(100, 101, 89, 90);
      const kline2 = createKline(90, 91, 83, 84); // 实体6
      const kline3 = createKline(91, 97, 90, 96);
      expect(isMorningStar(kline1, kline2, kline3)).toBe(false);
    });

    it('第1根不是阴线', () => {
      const kline1 = createKline(90, 101, 89, 100); // 阳线
      const kline2 = createKline(101, 103, 100, 102);
      const kline3 = createKline(91, 97, 90, 96);
      expect(isMorningStar(kline1, kline2, kline3)).toBe(false);
    });

    it('第3根不是阳线', () => {
      const kline1 = createKline(100, 101, 89, 90);
      const kline2 = createKline(89, 90, 87, 88);
      const kline3 = createKline(96, 97, 90, 91); // 阴线
      expect(isMorningStar(kline1, kline2, kline3)).toBe(false);
    });

    it('第1根实体为0', () => {
      const kline1 = createKline(100, 101, 99, 100); // 实体为0
      const kline2 = createKline(99, 100, 98, 99);
      const kline3 = createKline(91, 97, 90, 96);
      expect(isMorningStar(kline1, kline2, kline3)).toBe(false);
    });

    it('自定义刺入比例和第2根实体比例', () => {
      // 第1根实体10
      // 第2根实体2（占比20%）
      const kline1 = createKline(100, 101, 89, 90);
      const kline2 = createKline(89, 90, 87, 87);
      const kline3 = createKline(91, 98, 90, 97);
      // 刺入70%需要收盘>97，收盘97，不满足
      expect(isMorningStar(kline1, kline2, kline3, { penetrationRatio: 0.7, middleBodyRatio: 0.3 })).toBe(false);
      // 刺入60%需要收盘>96，收盘97>96，满足
      expect(isMorningStar(kline1, kline2, kline3, { penetrationRatio: 0.6, middleBodyRatio: 0.3 })).toBe(true);
    });
  });

  describe('配合成交量判断', () => {
    it('放量启明星', () => {
      const kline1 = createKlineWithVolume(100, 101, 89, 90, 1000);
      const kline2 = createKlineWithVolume(89, 90, 87, 88, 500);
      const kline3 = createKlineWithVolume(91, 97, 90, 96, 2000);
      expect(isMorningStar(kline1, kline2, kline3, { averageVolume: 1000 })).toBe(true);
    });

    it('缩量启明星：成交量不足', () => {
      const kline1 = createKlineWithVolume(100, 101, 89, 90, 1000);
      const kline2 = createKlineWithVolume(89, 90, 87, 88, 500);
      const kline3 = createKlineWithVolume(91, 97, 90, 96, 1000);
      expect(isMorningStar(kline1, kline2, kline3, { averageVolume: 1000 })).toBe(false);
    });

    it('自定义放量倍数', () => {
      const kline1 = createKlineWithVolume(100, 101, 89, 90, 1000);
      const kline2 = createKlineWithVolume(89, 90, 87, 88, 500);
      const kline3 = createKlineWithVolume(91, 97, 90, 96, 1800);
      expect(isMorningStar(kline1, kline2, kline3, { averageVolume: 1000, volumeThreshold: 1.5 })).toBe(true);
      expect(isMorningStar(kline1, kline2, kline3, { averageVolume: 1000, volumeThreshold: 2 })).toBe(false);
    });
  });
});
