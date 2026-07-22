import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import {
  aggregateEmaTrades,
  calculateStructureSnapshotHash,
  getProfileKey,
  normalizeStructureEmaSpotConfig,
  parseStructureEmaRuntimeState,
  shouldProcessKline,
  truncateDownByStep,
} from './structure-ema-spot.utils';

describe('structure-ema-spot.utils', () => {
  it('配置中的字符串数值会被标准化为number', () => {
    const config = normalizeStructureEmaSpotConfig({
      profitPoint: '0.02',
      up: {
        timeframe: '1h',
        emaPeriod: '30',
        positionParts: '4',
        entrySpacingRate: '0.01',
        keyLevelAvoidanceRate: '0.02',
        entryOrderExpireBars: '2',
      },
      range: {
        timeframe: '15m',
        emaPeriod: '10',
        positionParts: '20',
        entrySpacingRate: '0.003',
        entryOrderExpireBars: '3',
      },
    });

    expect(config.profitPoint).toBe(0.02);
    expect(config.up.emaPeriod).toBe(30);
    expect(config.up.positionParts).toBe(4);
    expect(config.range.timeframe).toBe(TimeFrame.M15);
    expect(config.range.entryOrderExpireBars).toBe(3);
  });

  it('拒绝模式不支持的K线周期', () => {
    expect(() =>
      normalizeStructureEmaSpotConfig({
        up: { timeframe: '5m' },
      }),
    ).toThrow('UP.timeframe');
  });

  it('结构哈希与关键位输入顺序无关，但能识别删除', () => {
    const a = calculateStructureSnapshotHash({
      direction: 'UP',
      keyLevels: [
        { id: 2, price: 200 },
        { id: 1, price: 100 },
      ],
    });
    const b = calculateStructureSnapshotHash({
      direction: 'UP',
      keyLevels: [
        { id: 1, price: 100 },
        { id: 2, price: 200 },
      ],
    });
    const afterDelete = calculateStructureSnapshotHash({
      direction: 'UP',
      keyLevels: [{ id: 2, price: 200 }],
    });

    expect(a).toBe(b);
    expect(afterDelete).not.toBe(a);
  });

  it('卖出数量严格按照步长向下截断', () => {
    expect(truncateDownByStep('1.239', '0.01')).toBe(1.23);
    expect(truncateDownByStep('0.123456789', '0.00000001')).toBe(0.12345678);
    expect(truncateDownByStep('0.3', '0.1')).toBe(0.3);
  });

  it('运行状态过滤无效数值并保留合法K线时间', () => {
    const runtime = parseStructureEmaRuntimeState({
      structureSnapshotHash: 'hash',
      lastDirection: 'RANGE',
      lastProcessedKlineTime: {
        [getProfileKey({ mode: 'RANGE', timeframe: '5m', emaPeriod: 20 })]:
          '123',
        invalid: 'abc',
      },
      brokenKeyLevelIds: ['1', 2, 'bad'],
    });

    expect(runtime.lastDirection).toBe('RANGE');
    expect(Object.values(runtime.lastProcessedKlineTime)).toEqual([123]);
    expect(runtime.brokenKeyLevelIds).toEqual([1, 2]);
  });

  it('同一根K线只处理一次', () => {
    expect(
      shouldProcessKline({
        lastProcessedKlineTime: { key: 100 },
        profileKey: 'key',
        currentKlineTime: 100,
      }),
    ).toBe(false);
    expect(
      shouldProcessKline({
        lastProcessedKlineTime: { key: 100 },
        profileKey: 'key',
        currentKlineTime: 101,
      }),
    ).toBe(true);
  });

  it('相同止盈价的批次聚合数量、资金和加权入场价', () => {
    const aggregate = aggregateEmaTrades(
      [
        { tradeAmount: '1', positionCost: '100' },
        { tradeAmount: '2', positionCost: '240' },
      ],
      '0.01',
    );

    expect(aggregate.tradeAmount).toBe(3);
    expect(aggregate.positionCost).toBe(340);
    expect(aggregate.entryPrice).toBeCloseTo(340 / 3);
  });
});
