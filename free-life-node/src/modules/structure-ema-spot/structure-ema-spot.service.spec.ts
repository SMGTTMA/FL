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
      fetchOrder: jest.fn(),
      fetchMarketMinOrderInfo: jest.fn().mockResolvedValue({
        data: marketInfo,
      }),
      getBalance: jest.fn().mockResolvedValue({
        data: { BTC: { free: 10 }, USDT: { free: 1000 } },
      }),
    };
    activeTradesService = {
      findByStrategyRecordId: jest.fn(),
      createBatch: jest.fn(),
      updateBatchById: jest.fn(),
      removeByIds: jest.fn(),
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

  it('买单离开 openOrders 后使用交易所实际成交数据更新持仓', async () => {
    const pendingBuy = {
      ...holding(1, 110),
      tradeStatus: ActiveSpotEmaTradeStatus.PENDING_BUY,
      orderId: 'buy-1',
    } as ActiveSpotEmaTrade;
    activeTradesService.findByStrategyRecordId.mockResolvedValue([pendingBuy]);
    exchangeService.fetchOrder.mockResolvedValue({
      data: {
        id: 'buy-1',
        status: 'closed',
        filled: 1,
        average: 100,
        cost: 100,
        fee: { currency: 'BTC', cost: 0.001 },
      },
    });

    await (service as any).syncOrderStates(
      strategy,
      STRUCTURE_EMA_SPOT_DEFAULT_CONFIG,
      [],
      Date.now(),
      marketInfo,
    );

    const update = activeTradesService.updateBatchById.mock.calls[0][0][0];
    expect(update.id).toBe(1);
    expect(update.patch).toMatchObject({
      tradeStatus: ActiveSpotEmaTradeStatus.HOLDING,
      orderId: null,
      tradeAmount: 0.999,
      positionCost: 100,
    });
    expect(update.patch.entryPrice).toBeCloseTo(100 / 0.999);
  });

  it('买单被取消且没有成交时删除本地记录', async () => {
    const pendingBuy = {
      ...holding(1, 110),
      tradeStatus: ActiveSpotEmaTradeStatus.PENDING_BUY,
      orderId: 'buy-1',
    } as ActiveSpotEmaTrade;
    activeTradesService.findByStrategyRecordId.mockResolvedValue([pendingBuy]);
    exchangeService.fetchOrder.mockResolvedValue({
      data: { id: 'buy-1', status: 'canceled', filled: 0 },
    });

    await (service as any).syncOrderStates(
      strategy,
      STRUCTURE_EMA_SPOT_DEFAULT_CONFIG,
      [],
      Date.now(),
      marketInfo,
    );

    expect(activeTradesService.removeByIds).toHaveBeenCalledWith([1]);
    expect(activeTradesService.updateBatchById).not.toHaveBeenCalled();
  });

  it('卖单取消后按交易所剩余数量恢复为持仓', async () => {
    const currentPendingSell = pendingSell(3, 110, 'sell-1');
    activeTradesService.findByStrategyRecordId.mockResolvedValue([
      currentPendingSell,
    ]);
    exchangeService.fetchOrder.mockResolvedValue({
      data: {
        id: 'sell-1',
        status: 'canceled',
        filled: 0.4,
        remaining: 0.6,
      },
    });

    await (service as any).syncOrderStates(
      strategy,
      STRUCTURE_EMA_SPOT_DEFAULT_CONFIG,
      [],
      Date.now(),
      marketInfo,
    );

    expect(activeTradesService.updateBatchById).toHaveBeenCalledWith([
      {
        id: 3,
        patch: expect.objectContaining({
          tradeStatus: ActiveSpotEmaTradeStatus.HOLDING,
          orderId: null,
          tradeAmount: 0.6,
          positionCost: 60,
        }),
      },
    ]);
    expect(activeTradesService.removeByIds).not.toHaveBeenCalled();
  });

  it('卖单在交易所已完全成交时删除本地活跃记录', async () => {
    const currentPendingSell = pendingSell(3, 110, 'sell-1');
    activeTradesService.findByStrategyRecordId.mockResolvedValue([
      currentPendingSell,
    ]);
    exchangeService.fetchOrder.mockResolvedValue({
      data: {
        id: 'sell-1',
        status: 'closed',
        filled: 1,
        remaining: 0,
      },
    });

    await (service as any).syncOrderStates(
      strategy,
      STRUCTURE_EMA_SPOT_DEFAULT_CONFIG,
      [],
      Date.now(),
      marketInfo,
    );

    expect(activeTradesService.removeByIds).toHaveBeenCalledWith([3]);
  });

  it('卖出数量超过交易所可用余额时按可用余额向下截断', async () => {
    const currentHolding = holding(1, 110);
    activeTradesService.findByStrategyRecordId.mockResolvedValue([
      currentHolding,
    ]);
    exchangeService.getBalance.mockResolvedValue({
      data: { BTC: { free: 0.999 } },
    });
    exchangeService.createOrders.mockResolvedValue({
      data: [{ id: 'sell-1', status: 'open', amount: 0.999, price: 110 }],
    });

    await (service as any).executeExitOrderGroups(
      strategy,
      [{ takeProfitPrice: 110, holdings: [currentHolding] }],
      marketInfo,
    );

    expect(exchangeService.createOrders.mock.calls[0][1][0].amount).toBe(0.999);
    const pendingSell =
      activeTradesService.replaceHoldingsWithPendingSells.mock.calls[0][0]
        .groups[0].pendingSell;
    expect(pendingSell.tradeAmount).toBe(0.999);
  });

  it('手动入场只使用用户传入的价格，其余参数由上涨模式计算', async () => {
    const runningStrategy = {
      ...strategy,
      configJson: JSON.stringify(STRUCTURE_EMA_SPOT_DEFAULT_CONFIG),
      parameters: { entryPaused: false },
    } as StrategyRecord;
    (service as any).findRunningStrategy = jest
      .fn()
      .mockResolvedValue(runningStrategy);
    (service as any).getStructureSnapshot = jest.fn().mockResolvedValue({
      direction: 'UP',
      keyLevels: [],
    });
    const placeEntryOrder = jest.fn().mockResolvedValue({
      orderId: 'buy-1',
      entryPrice: 99,
      takeProfitPrice: 100,
      tradeAmount: 1,
      positionCost: 99,
    });
    (service as any).placeEntryOrder = placeEntryOrder;

    const response = await service.manualEntry(
      { strategyId: strategy.id, entryPrice: 99 },
      strategy.userId,
    );

    expect(response.data).toContain('订单ID buy-1');
    expect(placeEntryOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: runningStrategy,
        mode: 'UP',
        context: expect.objectContaining({ currentClose: 99 }),
        keyLevels: [],
        marketInfo,
      }),
    );
  });

  it('手动入场在日线下跌方向时拒绝创建买单', async () => {
    (service as any).findRunningStrategy = jest.fn().mockResolvedValue({
      ...strategy,
      configJson: JSON.stringify(STRUCTURE_EMA_SPOT_DEFAULT_CONFIG),
      parameters: { entryPaused: false },
    });
    (service as any).getStructureSnapshot = jest.fn().mockResolvedValue({
      direction: 'DOWN',
      keyLevels: [],
    });

    await expect(
      service.manualEntry(
        { strategyId: strategy.id, entryPrice: 99 },
        strategy.userId,
      ),
    ).rejects.toThrow('当前日线方向不允许创建买单');
  });

  it('策略暂停开仓时拒绝手动入场', async () => {
    (service as any).findRunningStrategy = jest.fn().mockResolvedValue({
      ...strategy,
      configJson: JSON.stringify(STRUCTURE_EMA_SPOT_DEFAULT_CONFIG),
      parameters: { entryPaused: true },
    });

    await expect(
      service.manualEntry(
        { strategyId: strategy.id, entryPrice: 99 },
        strategy.userId,
      ),
    ).rejects.toThrow('策略已暂停开仓');
  });
});
