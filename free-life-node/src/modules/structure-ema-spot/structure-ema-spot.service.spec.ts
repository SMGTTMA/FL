import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import {
  ActiveSpotEmaSourceMode,
  ActiveSpotEmaTrade,
  ActiveSpotEmaTradeStatus,
} from '@/modules/active-spot-ema-trades/entities/active-spot-ema-trade.entity';
import { StrategyRecord } from '@/modules/strategy-records/entities/strategy-record.entity';
import { STRUCTURE_EMA_SPOT_DEFAULT_CONFIG } from './constants/structure-ema-spot.constants';
import { StructureEmaSpotService } from './structure-ema-spot.service';

describe('StructureEmaSpotService 批量订单处理', () => {
  const strategy = {
    id: 11,
    userId: 22,
    exchangeConfigId: 33,
    symbol: 'BTC/USDT',
    totalPositionSize: 300,
  } as StrategyRecord;
  const marketInfo = {
    minSz: 0.001,
    stepLength: '0.001',
    precisionPrice: 2,
  };

  let exchangeService: Record<string, jest.Mock>;
  let activeTradesService: Record<string, jest.Mock>;
  let rejectedOrdersService: Record<string, jest.Mock>;
  let service: StructureEmaSpotService;

  const holding = (id: number, takeProfitPrice: number): ActiveSpotEmaTrade =>
    ({
      id,
      strategyRecordId: strategy.id,
      userId: strategy.userId,
      exchangeConfigId: strategy.exchangeConfigId,
      symbol: strategy.symbol,
      sourceMode: ActiveSpotEmaSourceMode.UP,
      signalTimeframe: TimeFrame.H1,
      emaPeriod: 20,
      signalKlineTime: id * 1000,
      entryPrice: 100,
      takeProfitPrice,
      tradeAmount: 1,
      positionCost: 100,
      tradeStatus: ActiveSpotEmaTradeStatus.HOLDING,
      orderId: null,
    }) as ActiveSpotEmaTrade;

  const pendingSell = (
    id: number,
    takeProfitPrice: number,
    orderId: string,
  ): ActiveSpotEmaTrade =>
    ({
      ...holding(id, takeProfitPrice),
      sourceMode: null,
      signalTimeframe: null,
      emaPeriod: null,
      signalKlineTime: null,
      tradeStatus: ActiveSpotEmaTradeStatus.PENDING_SELL,
      orderId,
    }) as ActiveSpotEmaTrade;

  beforeEach(() => {
    exchangeService = {
      createOrders: jest.fn(),
      batchEditOrders: jest.fn(),
      getBalance: jest.fn(),
    };
    activeTradesService = {
      findByStrategyRecordId: jest.fn(),
      createBatch: jest.fn(),
      replaceHoldingsWithPendingSells: jest.fn(),
      mergeHoldingsIntoPendingSells: jest.fn(),
    };
    rejectedOrdersService = {
      createBatch: jest.fn(),
    };

    service = new StructureEmaSpotService(
      {} as never,
      exchangeService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      activeTradesService as never,
      rejectedOrdersService as never,
      {} as never,
    );
  });

  it('一次创建多个不同止盈价的卖单并批量写库', async () => {
    const first = holding(1, 110);
    const second = holding(2, 120);
    activeTradesService.findByStrategyRecordId.mockResolvedValue([
      first,
      second,
    ]);
    exchangeService.createOrders.mockResolvedValue({
      data: [
        { id: 'sell-1', status: 'open' },
        { id: 'sell-2', status: 'open' },
      ],
    });

    const count = await (service as any).executeExitOrderGroups(
      strategy,
      [
        { takeProfitPrice: 110, holdings: [first] },
        { takeProfitPrice: 120, holdings: [second] },
      ],
      marketInfo,
    );

    expect(count).toBe(2);
    expect(exchangeService.createOrders).toHaveBeenCalledTimes(1);
    expect(exchangeService.createOrders.mock.calls[0][1]).toHaveLength(2);
    expect(
      activeTradesService.replaceHoldingsWithPendingSells,
    ).toHaveBeenCalledTimes(1);
    expect(
      activeTradesService.replaceHoldingsWithPendingSells.mock.calls[0][0]
        .groups,
    ).toHaveLength(2);
    expect(rejectedOrdersService.createBatch).not.toHaveBeenCalled();
  });

  it('批量创建部分失败时只保存成功订单并记录拒单', async () => {
    const first = holding(1, 110);
    const second = holding(2, 120);
    activeTradesService.findByStrategyRecordId.mockResolvedValue([
      first,
      second,
    ]);
    exchangeService.createOrders.mockResolvedValue({
      data: [{ id: 'sell-1', status: 'open' }, { status: 'rejected' }],
    });

    const count = await (service as any).executeExitOrderGroups(
      strategy,
      [
        { takeProfitPrice: 110, holdings: [first] },
        { takeProfitPrice: 120, holdings: [second] },
      ],
      marketInfo,
    );

    expect(count).toBe(1);
    expect(
      activeTradesService.replaceHoldingsWithPendingSells.mock.calls[0][0]
        .groups,
    ).toHaveLength(1);
    expect(rejectedOrdersService.createBatch).toHaveBeenCalledTimes(1);
    expect(rejectedOrdersService.createBatch.mock.calls[0][0]).toHaveLength(1);
  });

  it('已有止盈卖单时一次批量扩大数量并只合并编辑成功项', async () => {
    const first = holding(1, 110);
    const second = holding(2, 120);
    const firstSell = pendingSell(10, 110, 'sell-10');
    const secondSell = pendingSell(20, 120, 'sell-20');
    activeTradesService.findByStrategyRecordId.mockResolvedValue([
      first,
      second,
      firstSell,
      secondSell,
    ]);
    exchangeService.batchEditOrders.mockResolvedValue({
      data: {
        successResults: [{ orderId: 'sell-10', amount: 2 }],
        failedResults: [{ error: 'rejected' }],
        failedOrderIds: ['sell-20'],
      },
    });

    const count = await (service as any).executeExitOrderGroups(
      strategy,
      [
        { takeProfitPrice: 110, holdings: [first] },
        { takeProfitPrice: 120, holdings: [second] },
      ],
      marketInfo,
    );

    expect(count).toBe(1);
    expect(exchangeService.createOrders).not.toHaveBeenCalled();
    expect(exchangeService.batchEditOrders).toHaveBeenCalledTimes(1);
    expect(
      exchangeService.batchEditOrders.mock.calls[0][0].editOrderList,
    ).toHaveLength(2);
    expect(
      activeTradesService.mergeHoldingsIntoPendingSells.mock.calls[0][0].groups,
    ).toHaveLength(1);
    expect(rejectedOrdersService.createBatch.mock.calls[0][0]).toHaveLength(1);
  });

  it('入场订单成功后使用批量方法记录本地订单', async () => {
    activeTradesService.findByStrategyRecordId.mockResolvedValue([]);
    exchangeService.getBalance.mockResolvedValue({
      data: { USDT: { free: 1000 } },
    });
    exchangeService.createOrders.mockResolvedValue({
      data: [{ id: 'buy-1', status: 'open' }],
    });

    await (service as any).placeEntryOrder({
      strategy,
      config: STRUCTURE_EMA_SPOT_DEFAULT_CONFIG,
      mode: 'UP',
      context: {
        currentClose: 100,
        currentKlineTime: 1000,
      },
      keyLevels: [],
      marketInfo,
    });

    expect(activeTradesService.createBatch).toHaveBeenCalledTimes(1);
    expect(activeTradesService.createBatch.mock.calls[0][0]).toHaveLength(1);
    expect(activeTradesService.createBatch.mock.calls[0][0][0]).toMatchObject({
      orderId: 'buy-1',
      tradeStatus: ActiveSpotEmaTradeStatus.PENDING_BUY,
    });
  });
});
