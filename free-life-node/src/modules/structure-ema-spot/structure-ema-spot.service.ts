import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from 'ccxt';
import { ResponseDto } from '@/common/dto/response.dto';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import {
  OrderSide,
  OrderType,
  PlaceOrderDto,
} from '@/modules/exchange/dto/place-order.dto';
import { ExchangeService } from '@/modules/exchange/exchange.service';
import {
  KlineCacheService,
  KlineEnv,
} from '@/modules/kline-cache/kline-cache.service';
import { StrategyRecord } from '@/modules/strategy-records/entities/strategy-record.entity';
import { StrategyRecordsService } from '@/modules/strategy-records/strategy-records.service';
import { StrategyEnvService } from '@/modules/strategy-utils/strategy-env.service';
import { ExceptionLogService } from '@/modules/exception-log/exception-log.service';
import { StrategyStructuresService } from '@/modules/strategy-structures/strategy-structures.service';
import { StrategyKeyLevel } from '@/modules/strategy-structures/entities/strategy-key-level.entity';
import { StrategyMarketDirectionType } from '@/modules/strategy-structures/constants/strategy-structure.constants';
import {
  ActiveSpotEmaSourceMode,
  ActiveSpotEmaTrade,
  ActiveSpotEmaTradeStatus,
} from '@/modules/active-spot-ema-trades/entities/active-spot-ema-trade.entity';
import { ActiveSpotEmaTradesService } from '@/modules/active-spot-ema-trades/active-spot-ema-trades.service';
import { RejectedOrdersService } from '@/modules/rejected-orders/rejected-orders.service';
import { OperationOrderType } from '@/modules/rejected-orders/entities/rejected-order.entity';
import { roundUpPrice } from '@/utils/trading/trading';
import {
  buildEmaSignalContext,
  isKeyLevelBreakUp,
} from './analysis/ema-swing.engine';
import {
  STRUCTURE_EMA_SPOT_CONFIG_LIMITS,
  STRUCTURE_EMA_SPOT_DEFAULT_CONFIG,
  STRUCTURE_EMA_SPOT_RANGE_TIMEFRAMES,
  STRUCTURE_EMA_SPOT_STRATEGY_NAME,
  STRUCTURE_EMA_SPOT_UP_TIMEFRAMES,
} from './constants/structure-ema-spot.constants';
import { EditStructureEmaSpotDto } from './dto/edit-structure-ema-spot.dto';
import { StartStructureEmaSpotDto } from './dto/start-structure-ema-spot.dto';
import {
  EmaSignalContext,
  StructureEmaMode,
  StructureEmaProfileConfig,
  StructureEmaRuntimeState,
  StructureEmaSpotConfig,
} from './types/structure-ema-spot.types';
import {
  aggregateEmaTrades,
  calculateStructureSnapshotHash,
  getProfileKey,
  normalizeStructureEmaSpotConfig,
  parseStructureEmaRuntimeState,
  resolveModeByDirection,
  shouldProcessKline,
  timeframeToMilliseconds,
  toFinitePositiveNumber,
  truncateDownByStep,
} from './structure-ema-spot.utils';

type MarketOrderInfo = {
  minSz: number;
  stepLength: string;
  precisionPrice: number;
};

type SignalGroup = {
  mode: StructureEmaMode;
  timeframe: TimeFrame;
  emaPeriod: number;
};

@Injectable()
export class StructureEmaSpotService {
  private readonly logger = new Logger(StructureEmaSpotService.name);
  private readonly strategyName = STRUCTURE_EMA_SPOT_STRATEGY_NAME;
  private readonly quoteAsset = 'USDT';

  constructor(
    @InjectRepository(StrategyRecord)
    private readonly strategyRecordRepository: Repository<StrategyRecord>,
    private readonly exchangeService: ExchangeService,
    private readonly klineCacheService: KlineCacheService,
    private readonly strategyEnvService: StrategyEnvService,
    private readonly strategyRecordsService: StrategyRecordsService,
    private readonly strategyStructuresService: StrategyStructuresService,
    private readonly activeSpotEmaTradesService: ActiveSpotEmaTradesService,
    private readonly rejectedOrdersService: RejectedOrdersService,
    private readonly exceptionLogService: ExceptionLogService,
  ) {}

  /** K线缓存整5分钟第0秒更新，策略延迟到第6秒执行。 */
  @Cron('6 */5 * * * *')
  async executeStrategies(): Promise<void> {
    const now = new Date();
    try {
      const strategies = await this.strategyRecordRepository.find({
        where: {
          strategyName: this.strategyName,
          status: 1,
        },
      });
      if (!strategies.length) return;

      const { exchangeConfigEnvMap } =
        await this.strategyEnvService.groupSymbolsByEnv(strategies);

      await Promise.all(
        strategies.map(async (strategy) => {
          try {
            const env = exchangeConfigEnvMap.get(
              strategy.exchangeConfigId,
            ) as KlineEnv;
            if (!env) throw new Error('无法确定策略运行环境');

            await this.executeStrategy(strategy, env, now);
          } catch (error) {
            await this.recordException(
              'cronjob/executeStructureEmaSpotStrategies/single',
              error,
              strategy.userId,
            );
            this.logger.error(
              `EMA结构策略执行失败 strategyId=${strategy.id}, symbol=${strategy.symbol}`,
              error,
            );
          }
        }),
      );
    } catch (error) {
      await this.recordException(
        'cronjob/executeStructureEmaSpotStrategies',
        error,
        null,
      );
      this.logger.error('EMA结构策略批量执行失败', error);
    }
  }

  private async executeStrategy(
    strategy: StrategyRecord,
    env: KlineEnv,
    now: Date,
  ): Promise<void> {
    const config = this.parseConfigJson(strategy.configJson);
    strategy.stopReason = null;
    const [openOrdersRes, marketInfoRes] = await Promise.all([
      this.exchangeService.fetchOpenOrders(
        strategy.exchangeConfigId,
        strategy.symbol,
      ),
      this.exchangeService.fetchMarketMinOrderInfo(
        strategy.exchangeConfigId,
        strategy.symbol,
      ),
    ]);
    const openOrders = openOrdersRes?.data || [];
    const marketInfo = this.normalizeMarketInfo(marketInfoRes?.data);

    await this.syncOrderStates(strategy, config, openOrders, now.getTime());

    const snapshot = await this.getStructureSnapshot(strategy);
    const runtime = parseStructureEmaRuntimeState(strategy.parameters);
    const snapshotHash = calculateStructureSnapshotHash(snapshot);
    const structureChanged = runtime.structureSnapshotHash !== snapshotHash;

    if (structureChanged) {
      await this.handleStructureChange({
        strategy,
        config,
        env,
        runtime,
        nextDirection: snapshot.direction,
        marketInfo,
      });
      runtime.structureSnapshotHash = snapshotHash;
      runtime.lastDirection = snapshot.direction;
      runtime.brokenKeyLevelIds = [];
    }

    await this.processSignalGroups({
      strategy,
      config,
      env,
      runtime,
      direction: snapshot.direction,
      keyLevels: snapshot.keyLevels,
      marketInfo,
      allowEntry: !structureChanged,
    });

    strategy.parameters = runtime;
    strategy.lastExecutionTime = now;
    await this.strategyRecordRepository.save(strategy);
  }

  private async syncOrderStates(
    strategy: StrategyRecord,
    config: StructureEmaSpotConfig,
    openOrders: Order[],
    now: number,
  ): Promise<void> {
    const trades = await this.activeSpotEmaTradesService.findByStrategyRecordId(
      strategy.id,
    );
    const openOrderIds = new Set(
      openOrders.map((item) => String(item.id)).filter(Boolean),
    );
    const filledBuyIds: number[] = [];
    const completedSellIds: number[] = [];
    const expiredBuyTrades: ActiveSpotEmaTrade[] = [];

    for (const trade of trades) {
      const orderId = trade.orderId ? String(trade.orderId) : '';
      if (trade.tradeStatus === ActiveSpotEmaTradeStatus.PENDING_BUY) {
        if (!orderId || !openOrderIds.has(orderId)) {
          filledBuyIds.push(trade.id);
          continue;
        }
        if (this.isPendingBuyExpired(trade, config, now)) {
          expiredBuyTrades.push(trade);
        }
      }

      if (
        trade.tradeStatus === ActiveSpotEmaTradeStatus.PENDING_SELL &&
        (!orderId || !openOrderIds.has(orderId))
      ) {
        completedSellIds.push(trade.id);
      }
    }

    if (filledBuyIds.length) {
      await this.activeSpotEmaTradesService.updateBatch(filledBuyIds, {
        tradeStatus: ActiveSpotEmaTradeStatus.HOLDING,
        orderId: null,
      });
    }

    if (completedSellIds.length) {
      await this.activeSpotEmaTradesService.removeByIds(completedSellIds);
    }

    await this.cancelPendingBuyTrades(strategy, expiredBuyTrades);
  }

  private isPendingBuyExpired(
    trade: ActiveSpotEmaTrade,
    config: StructureEmaSpotConfig,
    now: number,
  ): boolean {
    if (!trade.sourceMode || !trade.signalTimeframe || !trade.signalKlineTime) {
      return false;
    }
    const mode = trade.sourceMode as StructureEmaMode;
    const profile = this.getProfile(config, mode);
    const signalKlineTime = toFinitePositiveNumber(
      trade.signalKlineTime,
      '信号K线时间',
    );
    const expiresAt =
      signalKlineTime +
      timeframeToMilliseconds(trade.signalTimeframe) *
        (profile.entryOrderExpireBars + 1);
    return now >= expiresAt;
  }

  private async cancelPendingBuyTrades(
    strategy: StrategyRecord,
    trades: ActiveSpotEmaTrade[],
  ): Promise<void> {
    if (!trades.length) return;
    const cancellable = trades.filter((item) => item.orderId);
    if (!cancellable.length) return;

    await this.exchangeService.batchCancelOrders(
      strategy.exchangeConfigId,
      cancellable.map((item) => String(item.orderId)),
      strategy.symbol,
    );
    await this.activeSpotEmaTradesService.removeByIds(
      cancellable.map((item) => item.id),
    );
  }

  private async getStructureSnapshot(strategy: StrategyRecord): Promise<{
    direction: StrategyMarketDirectionType | null;
    keyLevels: StrategyKeyLevel[];
  }> {
    const [directionRes, keyLevelRes] = await Promise.all([
      this.strategyStructuresService.getDirection(
        { symbol: strategy.symbol, timeframe: TimeFrame.D1 },
        strategy.userId,
      ),
      this.strategyStructuresService.list(
        {
          symbol: strategy.symbol,
          timeframe: TimeFrame.D1,
          levelGroup: 'NORMAL',
        },
        strategy.userId,
      ),
    ]);

    return {
      direction: directionRes.data?.direction || null,
      keyLevels: keyLevelRes.data || [],
    };
  }

  private async handleStructureChange(args: {
    strategy: StrategyRecord;
    config: StructureEmaSpotConfig;
    env: KlineEnv;
    runtime: StructureEmaRuntimeState;
    nextDirection: StrategyMarketDirectionType | null;
    marketInfo: MarketOrderInfo;
  }): Promise<void> {
    const trades = await this.activeSpotEmaTradesService.findByStrategyRecordId(
      args.strategy.id,
    );
    await this.cancelPendingBuyTrades(
      args.strategy,
      trades.filter(
        (item) => item.tradeStatus === ActiveSpotEmaTradeStatus.PENDING_BUY,
      ),
    );

    const previousMode = resolveModeByDirection(args.runtime.lastDirection);
    const nextMode = resolveModeByDirection(args.nextDirection);
    if (!previousMode || previousMode === nextMode) return;

    const currentClose = this.getLatestClosedPrice(
      args.strategy.symbol,
      args.env,
    );
    if (!currentClose) return;

    const refreshed =
      await this.activeSpotEmaTradesService.findByStrategyRecordId(
        args.strategy.id,
      );
    const profitableHoldings = refreshed.filter(
      (item) =>
        item.tradeStatus === ActiveSpotEmaTradeStatus.HOLDING &&
        item.sourceMode === previousMode &&
        currentClose >=
          toFinitePositiveNumber(item.takeProfitPrice, '最低止盈价'),
    );
    await this.placeExitOrders(
      args.strategy,
      profitableHoldings,
      args.marketInfo,
    );
  }

  private getLatestClosedPrice(symbol: string, env: KlineEnv): number | null {
    const klines = this.klineCacheService.getKlines(symbol, TimeFrame.M5, env, {
      needReverse: true,
      klinesSliceNum: 2,
    });
    const price = Number(klines[1]?.close);
    return Number.isFinite(price) && price > 0 ? price : null;
  }

  private async processSignalGroups(args: {
    strategy: StrategyRecord;
    config: StructureEmaSpotConfig;
    env: KlineEnv;
    runtime: StructureEmaRuntimeState;
    direction: StrategyMarketDirectionType | null;
    keyLevels: StrategyKeyLevel[];
    marketInfo: MarketOrderInfo;
    allowEntry: boolean;
  }): Promise<void> {
    const activeMode = resolveModeByDirection(args.direction);
    const trades = await this.activeSpotEmaTradesService.findByStrategyRecordId(
      args.strategy.id,
    );
    const groups = this.buildSignalGroups(trades, args.config, activeMode);

    for (const group of groups) {
      const context = this.getSignalContext(
        args.strategy.symbol,
        args.env,
        group,
      );
      if (!context) continue;

      const profileKey = getProfileKey(group);
      if (
        !shouldProcessKline({
          lastProcessedKlineTime: args.runtime.lastProcessedKlineTime,
          profileKey,
          currentKlineTime: context.currentKlineTime,
        })
      ) {
        continue;
      }

      let keyLevelBreakOccurred = false;
      if (group.mode === 'UP') {
        keyLevelBreakOccurred = await this.handleKeyLevelBreak({
          strategy: args.strategy,
          context,
          keyLevels: args.keyLevels,
          runtime: args.runtime,
          marketInfo: args.marketInfo,
        });
      }

      if (!keyLevelBreakOccurred && context.isExitSignal) {
        const refreshed =
          await this.activeSpotEmaTradesService.findByStrategyRecordId(
            args.strategy.id,
          );
        const holdings = refreshed.filter(
          (item) =>
            item.tradeStatus === ActiveSpotEmaTradeStatus.HOLDING &&
            item.sourceMode === group.mode &&
            item.signalTimeframe === group.timeframe &&
            Number(item.emaPeriod) === group.emaPeriod &&
            context.currentClose >=
              toFinitePositiveNumber(item.takeProfitPrice, '最低止盈价'),
        );
        await this.placeExitOrders(args.strategy, holdings, args.marketInfo);
      }

      if (
        args.allowEntry &&
        !keyLevelBreakOccurred &&
        activeMode === group.mode &&
        this.isCurrentConfigGroup(group, args.config) &&
        context.isEntrySignal
      ) {
        await this.placeEntryOrder({
          strategy: args.strategy,
          config: args.config,
          mode: group.mode,
          context,
          keyLevels: args.keyLevels,
          marketInfo: args.marketInfo,
        });
      }

      args.runtime.lastProcessedKlineTime[profileKey] =
        context.currentKlineTime;
    }
  }

  private buildSignalGroups(
    trades: ActiveSpotEmaTrade[],
    config: StructureEmaSpotConfig,
    activeMode: StructureEmaMode | null,
  ): SignalGroup[] {
    const groups = new Map<string, SignalGroup>();
    for (const trade of trades) {
      if (
        trade.tradeStatus !== ActiveSpotEmaTradeStatus.HOLDING ||
        !trade.sourceMode ||
        !trade.signalTimeframe ||
        !trade.emaPeriod
      ) {
        continue;
      }
      const group: SignalGroup = {
        mode: trade.sourceMode as StructureEmaMode,
        timeframe: trade.signalTimeframe as TimeFrame,
        emaPeriod: Number(trade.emaPeriod),
      };
      if (!Number.isInteger(group.emaPeriod) || group.emaPeriod < 2) continue;
      groups.set(getProfileKey(group), group);
    }

    if (activeMode) {
      const profile = this.getProfile(config, activeMode);
      const group: SignalGroup = {
        mode: activeMode,
        timeframe: profile.timeframe,
        emaPeriod: profile.emaPeriod,
      };
      groups.set(getProfileKey(group), group);
    }
    return [...groups.values()];
  }

  private getSignalContext(
    symbol: string,
    env: KlineEnv,
    group: SignalGroup,
  ): EmaSignalContext | null {
    const klines = this.klineCacheService.getKlines(
      symbol,
      group.timeframe,
      env,
      {
        needReverse: true,
        klinesSliceNum: group.emaPeriod + 2,
      },
    );
    return buildEmaSignalContext(klines, group.emaPeriod);
  }

  private async handleKeyLevelBreak(args: {
    strategy: StrategyRecord;
    context: EmaSignalContext;
    keyLevels: StrategyKeyLevel[];
    runtime: StructureEmaRuntimeState;
    marketInfo: MarketOrderInfo;
  }): Promise<boolean> {
    const brokenSet = new Set(args.runtime.brokenKeyLevelIds);
    const crossed = args.keyLevels.filter(
      (item) =>
        !brokenSet.has(Number(item.id)) &&
        isKeyLevelBreakUp(args.context, Number(item.price)),
    );
    if (!crossed.length) return false;

    for (const item of crossed) brokenSet.add(Number(item.id));
    args.runtime.brokenKeyLevelIds = [...brokenSet];

    const trades = await this.activeSpotEmaTradesService.findByStrategyRecordId(
      args.strategy.id,
    );
    await this.cancelPendingBuyTrades(
      args.strategy,
      trades.filter(
        (item) =>
          item.tradeStatus === ActiveSpotEmaTradeStatus.PENDING_BUY &&
          item.sourceMode === ActiveSpotEmaSourceMode.UP,
      ),
    );

    const refreshed =
      await this.activeSpotEmaTradesService.findByStrategyRecordId(
        args.strategy.id,
      );
    const profitable = refreshed.filter(
      (item) =>
        item.tradeStatus === ActiveSpotEmaTradeStatus.HOLDING &&
        item.sourceMode === ActiveSpotEmaSourceMode.UP &&
        args.context.currentClose >=
          toFinitePositiveNumber(item.takeProfitPrice, '最低止盈价'),
    );
    await this.placeExitOrders(args.strategy, profitable, args.marketInfo);
    return true;
  }

  private async placeEntryOrder(args: {
    strategy: StrategyRecord;
    config: StructureEmaSpotConfig;
    mode: StructureEmaMode;
    context: EmaSignalContext;
    keyLevels: StrategyKeyLevel[];
    marketInfo: MarketOrderInfo;
  }): Promise<void> {
    const profile = this.getProfile(args.config, args.mode);
    const trades = await this.activeSpotEmaTradesService.findByStrategyRecordId(
      args.strategy.id,
    );
    const slotCapital =
      toFinitePositiveNumber(args.strategy.totalPositionSize, '策略总资金') /
      profile.positionParts;
    const occupiedCapital = trades.reduce(
      (sum, item) =>
        sum + toFinitePositiveNumber(item.positionCost, '持仓占用资金'),
      0,
    );
    const availableCapital = Math.max(
      toFinitePositiveNumber(args.strategy.totalPositionSize, '策略总资金') -
        occupiedCapital,
      0,
    );
    if (availableCapital + Number.EPSILON < slotCapital) return;

    const entryPrice = roundUpPrice({
      price: args.context.currentClose,
      precision: args.marketInfo.precisionPrice,
    });
    if (!this.isEntrySpacingAllowed(args.mode, entryPrice, trades, profile)) {
      return;
    }
    if (
      args.mode === 'UP' &&
      !this.isKeyLevelDistanceAllowed(entryPrice, args.keyLevels, profile)
    ) {
      return;
    }

    const tradeAmount = truncateDownByStep(
      slotCapital / entryPrice,
      args.marketInfo.stepLength,
    );
    if (tradeAmount < args.marketInfo.minSz) return;

    const positionCost = entryPrice * tradeAmount;
    const balanceRes = await this.exchangeService.getBalance(
      args.strategy.exchangeConfigId,
    );
    const freeQuote = Number(balanceRes?.data?.[this.quoteAsset]?.free);
    if (!Number.isFinite(freeQuote) || freeQuote < positionCost) {
      args.strategy.stopReason = `账户可用${this.quoteAsset}不足，需要 ${positionCost} ${this.quoteAsset}`;
      return;
    }

    const takeProfitPrice = roundUpPrice({
      price: entryPrice * (1 + args.config.profitPoint),
      precision: args.marketInfo.precisionPrice,
    });
    const order: PlaceOrderDto = {
      symbol: args.strategy.symbol,
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      amount: toFinitePositiveNumber(tradeAmount, '买入数量'),
      price: toFinitePositiveNumber(entryPrice, '买入价格'),
    };
    const response = await this.exchangeService.createOrders(
      args.strategy.exchangeConfigId,
      [order],
    );
    const created = response?.data?.[0];
    if (!created?.id || created.status === 'rejected') {
      await this.recordRejectedOrder(
        args.strategy,
        OperationOrderType.CREATE,
        order,
        '入场买单创建失败',
      );
      return;
    }

    try {
      await this.activeSpotEmaTradesService.create({
        strategyRecordId: args.strategy.id,
        userId: args.strategy.userId,
        exchangeConfigId: args.strategy.exchangeConfigId,
        symbol: args.strategy.symbol,
        sourceMode:
          args.mode === 'UP'
            ? ActiveSpotEmaSourceMode.UP
            : ActiveSpotEmaSourceMode.RANGE,
        signalTimeframe: profile.timeframe,
        emaPeriod: profile.emaPeriod,
        signalKlineTime: args.context.currentKlineTime,
        entryPrice,
        takeProfitPrice,
        tradeAmount,
        positionCost,
        tradeStatus: ActiveSpotEmaTradeStatus.PENDING_BUY,
        orderId: String(created.id),
      });
    } catch (error) {
      await this.exchangeService.batchCancelOrders(
        args.strategy.exchangeConfigId,
        [String(created.id)],
        args.strategy.symbol,
      );
      throw error;
    }
  }

  private isEntrySpacingAllowed(
    mode: StructureEmaMode,
    entryPrice: number,
    trades: ActiveSpotEmaTrade[],
    profile: StructureEmaProfileConfig,
  ): boolean {
    return !trades.some((item) => {
      if (item.sourceMode !== mode) return false;
      const shouldCheck =
        item.tradeStatus === ActiveSpotEmaTradeStatus.PENDING_BUY ||
        (mode === 'RANGE' &&
          item.tradeStatus === ActiveSpotEmaTradeStatus.HOLDING);
      if (!shouldCheck) return false;

      const existedPrice = Number(item.entryPrice);
      return (
        Number.isFinite(existedPrice) &&
        Math.abs(entryPrice - existedPrice) / existedPrice <=
          profile.entrySpacingRate
      );
    });
  }

  private isKeyLevelDistanceAllowed(
    entryPrice: number,
    keyLevels: StrategyKeyLevel[],
    profile: StructureEmaProfileConfig,
  ): boolean {
    const nearestUpper = keyLevels
      .map((item) => Number(item.price))
      .filter((price) => Number.isFinite(price) && price > entryPrice)
      .sort((a, b) => a - b)[0];
    if (!nearestUpper) return true;
    return (
      (nearestUpper - entryPrice) / entryPrice >
      Number(profile.keyLevelAvoidanceRate || 0)
    );
  }

  private async placeExitOrders(
    strategy: StrategyRecord,
    holdings: ActiveSpotEmaTrade[],
    marketInfo: MarketOrderInfo,
  ): Promise<void> {
    if (!holdings.length) return;

    const groups = holdings.reduce<Map<string, ActiveSpotEmaTrade[]>>(
      (map, item) => {
        const takeProfitPrice = roundUpPrice({
          price: item.takeProfitPrice,
          precision: marketInfo.precisionPrice,
        });
        const key = String(takeProfitPrice);
        map.set(key, [...(map.get(key) || []), item]);
        return map;
      },
      new Map(),
    );

    for (const [priceKey, groupedHoldings] of groups) {
      const takeProfitPrice = Number(priceKey);
      const existingSell =
        await this.activeSpotEmaTradesService.findPendingSellByTakeProfitPrice({
          strategyRecordId: strategy.id,
          takeProfitPrice,
        });
      if (existingSell) {
        await this.editAggregatedSellOrder(
          strategy,
          existingSell,
          groupedHoldings,
          marketInfo,
        );
      } else {
        await this.createAggregatedSellOrder(
          strategy,
          groupedHoldings,
          takeProfitPrice,
          marketInfo,
        );
      }
    }
  }

  private async createAggregatedSellOrder(
    strategy: StrategyRecord,
    holdings: ActiveSpotEmaTrade[],
    takeProfitPrice: number,
    marketInfo: MarketOrderInfo,
  ): Promise<void> {
    const aggregate = aggregateEmaTrades(holdings, marketInfo.stepLength);
    const order: PlaceOrderDto = {
      symbol: strategy.symbol,
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      amount: toFinitePositiveNumber(aggregate.tradeAmount, '卖出数量'),
      price: toFinitePositiveNumber(takeProfitPrice, '止盈价格'),
    };
    const response = await this.exchangeService.createOrders(
      strategy.exchangeConfigId,
      [order],
    );
    const created = response?.data?.[0];
    if (!created?.id || created.status === 'rejected') {
      await this.recordRejectedOrder(
        strategy,
        OperationOrderType.CREATE,
        order,
        '止盈卖单创建失败',
      );
      return;
    }

    try {
      await this.activeSpotEmaTradesService.replaceHoldingsWithPendingSell({
        strategyRecordId: strategy.id,
        holdingIds: holdings.map((item) => item.id),
        pendingSell: {
          userId: strategy.userId,
          exchangeConfigId: strategy.exchangeConfigId,
          symbol: strategy.symbol,
          sourceMode: null,
          signalTimeframe: null,
          emaPeriod: null,
          signalKlineTime: null,
          entryPrice: aggregate.entryPrice,
          takeProfitPrice,
          tradeAmount: aggregate.tradeAmount,
          positionCost: aggregate.positionCost,
          orderId: String(created.id),
        },
      });
    } catch (error) {
      await this.exchangeService.batchCancelOrders(
        strategy.exchangeConfigId,
        [String(created.id)],
        strategy.symbol,
      );
      throw error;
    }
  }

  private async editAggregatedSellOrder(
    strategy: StrategyRecord,
    existingSell: ActiveSpotEmaTrade,
    holdings: ActiveSpotEmaTrade[],
    marketInfo: MarketOrderInfo,
  ): Promise<void> {
    if (!existingSell.orderId) throw new Error('聚合止盈单缺少订单ID');

    const aggregate = aggregateEmaTrades(
      [existingSell, ...holdings],
      marketInfo.stepLength,
    );
    const response = await this.exchangeService.batchEditOrders({
      exchangeConfigId: strategy.exchangeConfigId,
      editOrderList: [
        {
          orderId: String(existingSell.orderId),
          symbol: strategy.symbol,
          amount: toFinitePositiveNumber(aggregate.tradeAmount, '卖出数量'),
          side: OrderSide.SELL,
          type: OrderType.LIMIT,
        },
      ],
    });
    const success = response?.data?.successResults?.some(
      (item) => String(item.orderId) === String(existingSell.orderId),
    );
    if (!success) {
      await this.recordRejectedOrder(
        strategy,
        OperationOrderType.EDIT,
        {
          orderId: existingSell.orderId,
          amount: aggregate.tradeAmount,
        },
        '止盈卖单编辑失败',
      );
      return;
    }

    await this.activeSpotEmaTradesService.mergeHoldingsIntoPendingSell({
      strategyRecordId: strategy.id,
      holdingIds: holdings.map((item) => item.id),
      pendingSellId: existingSell.id,
      entryPrice: aggregate.entryPrice,
      tradeAmount: aggregate.tradeAmount,
      positionCost: aggregate.positionCost,
    });
  }

  private getProfile(
    config: StructureEmaSpotConfig,
    mode: StructureEmaMode,
  ): StructureEmaProfileConfig {
    return mode === 'UP' ? config.up : config.range;
  }

  private isCurrentConfigGroup(
    group: SignalGroup,
    config: StructureEmaSpotConfig,
  ): boolean {
    const profile = this.getProfile(config, group.mode);
    return (
      profile.timeframe === group.timeframe &&
      profile.emaPeriod === group.emaPeriod
    );
  }

  private normalizeMarketInfo(value: unknown): MarketOrderInfo {
    const info = (value || {}) as Record<string, unknown>;
    return {
      minSz: toFinitePositiveNumber(info.minSz, '最小下单数量'),
      stepLength: String(info.stepLength),
      precisionPrice: toFinitePositiveNumber(info.precisionPrice, '价格精度'),
    };
  }

  private parseConfigJson(configJson?: string): StructureEmaSpotConfig {
    try {
      const parsed = configJson ? JSON.parse(configJson) : {};
      return normalizeStructureEmaSpotConfig(parsed);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('配置JSON格式错误');
    }
  }

  private async recordRejectedOrder(
    strategy: StrategyRecord,
    orderType: OperationOrderType,
    params: unknown,
    rejectReason: string,
  ): Promise<void> {
    await this.rejectedOrdersService.create({
      strategyName: this.strategyName,
      symbol: strategy.symbol,
      orderType,
      params: { order: JSON.stringify(params) },
      rejectReason,
      userId: strategy.userId,
      exchangeConfigId: strategy.exchangeConfigId,
      exchangeName: 'OKX',
    });
  }

  private async recordException(
    url: string,
    error: unknown,
    userId: number | null,
  ): Promise<void> {
    const current = error as { message?: string; stack?: string };
    await this.exceptionLogService.create({
      url,
      method: 'CRON',
      statusCode: 500,
      message: current?.message || String(error),
      stack: current?.stack || '',
      userId,
    });
  }

  async start(
    dto: StartStructureEmaSpotDto,
    userId: number,
  ): Promise<ResponseDto<string>> {
    const config = this.parseConfigJson(dto.configJson);
    if (
      !Number.isFinite(Number(dto.totalPositionSize)) ||
      dto.totalPositionSize <= 0
    ) {
      throw new BadRequestException('策略总资金必须大于0');
    }

    const { exchangeConfig } =
      await this.strategyEnvService.baseStrategyValidate({
        symbol: dto.symbol,
        totalPositionSize: dto.totalPositionSize,
        exchangeConfigId: dto.exchangeConfigId,
        userId,
        strategyName: this.strategyName,
        quoteAsset: this.quoteAsset,
        pairType: 'spot',
      });
    const maxPositionParts = Math.max(
      config.up.positionParts,
      config.range.positionParts,
    );
    const minPositionSize =
      await this.strategyRecordsService.calculateMinPositionSize({
        symbol: dto.symbol,
        exchangeConfigId: dto.exchangeConfigId,
        env: exchangeConfig.isTestNet === 1 ? 'test' : 'prod',
        maxOrderCount: maxPositionParts,
        pairType: 'spot',
      });
    if (dto.totalPositionSize < minPositionSize) {
      throw new BadRequestException(
        `总资金不能低于最小仓位 ${minPositionSize} USDT`,
      );
    }

    const strategy = new StrategyRecord();
    strategy.strategyName = this.strategyName;
    strategy.symbol = dto.symbol;
    strategy.totalPositionSize = dto.totalPositionSize;
    strategy.side = OrderSide.BUY;
    strategy.status = 1;
    strategy.userId = userId;
    strategy.exchangeConfigId = dto.exchangeConfigId;
    strategy.parameters = parseStructureEmaRuntimeState(null);
    strategy.miniPositionSize = minPositionSize;
    strategy.configJson = JSON.stringify(config);
    strategy.isTradingStrategy = 1;
    await this.strategyRecordRepository.save(strategy);

    return ResponseDto.success('EMA结构现货策略启动成功');
  }

  async stop(strategyId: number, userId: number): Promise<ResponseDto<string>> {
    const strategy = await this.strategyRecordRepository.findOne({
      where: {
        id: strategyId,
        userId,
        status: 1,
        strategyName: this.strategyName,
      },
    });
    if (!strategy) throw new BadRequestException('未找到运行中的策略');

    await this.activeSpotEmaTradesService.removeByStrategyRecordId(strategy.id);
    strategy.status = 0;
    strategy.stopReason = '用户手动停止';
    await this.strategyRecordRepository.save(strategy);
    return ResponseDto.success('EMA结构现货策略已停止');
  }

  async edit(
    dto: EditStructureEmaSpotDto,
    userId: number,
  ): Promise<ResponseDto<string>> {
    const strategy = await this.strategyRecordRepository.findOne({
      where: {
        id: dto.strategyId,
        userId,
        status: 1,
        strategyName: this.strategyName,
      },
    });
    if (!strategy) throw new BadRequestException('未找到运行中的策略');

    if (dto.configJson !== undefined) {
      strategy.configJson = JSON.stringify(
        this.parseConfigJson(dto.configJson),
      );
    }
    if (dto.totalPositionSize !== undefined) {
      const totalPositionSize = Number(dto.totalPositionSize);
      if (!Number.isFinite(totalPositionSize) || totalPositionSize <= 0) {
        throw new BadRequestException('策略总资金必须大于0');
      }
      strategy.totalPositionSize = totalPositionSize;
    }
    await this.strategyRecordRepository.save(strategy);
    return ResponseDto.success('EMA结构现货策略配置已更新');
  }

  getStrategyConfig() {
    return {
      default: STRUCTURE_EMA_SPOT_DEFAULT_CONFIG,
      limits: STRUCTURE_EMA_SPOT_CONFIG_LIMITS,
      timeframes: {
        up: STRUCTURE_EMA_SPOT_UP_TIMEFRAMES,
        range: STRUCTURE_EMA_SPOT_RANGE_TIMEFRAMES,
      },
    };
  }
}
