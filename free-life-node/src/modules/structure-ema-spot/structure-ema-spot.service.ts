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
import { ManualExitStructureEmaSpotDto } from './dto/operate-structure-ema-spot.dto';
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

/**
 * 日线结构驱动的现货 EMA 波段策略。
 *
 * 日线结构只负责决定当前允许使用的交易模式：上涨使用较大的 EMA 周期，
 * 震荡使用较小的 EMA 周期，下跌则停止开仓。实际入场、出场都由小周期
 * 已收盘 K 线完成，持仓和挂单状态记录在 active_spot_ema_trades 中。
 *
 * 本策略不设置止损；卖出前必须达到每笔交易记录的最低止盈价。
 */
@Injectable()
export class StructureEmaSpotService {
  private readonly logger = new Logger(StructureEmaSpotService.name);
  private readonly strategyName = STRUCTURE_EMA_SPOT_STRATEGY_NAME;
  private readonly quoteAsset = 'USDT';
  private readonly strategyOperationChains = new Map<number, Promise<void>>();

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

  /**
   * 扫描全部运行中的策略。
   * K 线缓存整 5 分钟第 0 秒更新，策略延迟到第 6 秒执行，避免读取更新中的缓存。
   */
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

            await this.withStrategyLock(strategy.id, async () => {
              // 策略列表在加锁前读取，等待人工操作期间 parameters 可能已经变化，
              // 因此进入锁后必须重新读取，避免旧状态覆盖暂停开仓等人工设置。
              const latestStrategy =
                await this.strategyRecordRepository.findOne({
                  where: {
                    id: strategy.id,
                    strategyName: this.strategyName,
                    status: 1,
                  },
                });
              if (!latestStrategy) return;
              await this.executeStrategy(latestStrategy, env, now);
            });
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

  /**
   * 同一策略的定时任务和人工操作按调用顺序串行执行，防止双方同时覆盖 parameters
   * 或同时处理同一批 HOLDING。当前系统为单实例运行，因此进程内按策略 ID 加锁即可。
   */
  private async withStrategyLock<T>(
    strategyId: number,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous =
      this.strategyOperationChains.get(strategyId) || Promise.resolve();
    const running = previous.catch(() => undefined).then(operation);
    const marker = running.then(
      () => undefined,
      () => undefined,
    );
    this.strategyOperationChains.set(strategyId, marker);

    try {
      return await running;
    } finally {
      if (this.strategyOperationChains.get(strategyId) === marker) {
        this.strategyOperationChains.delete(strategyId);
      }
    }
  }

  /**
   * 执行单个策略的一轮完整流程：
   * 1. 同步交易所挂单与本地交易状态；
   * 2. 读取日线方向、关键位并处理剧本变化；
   * 3. 计算各持仓对应的 EMA 信号；
   * 4. 处理关键位突破、退出信号和当前模式的新入场；
   * 5. 保存本轮已处理 K 线及剧本快照。
   */
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

    // 必须先同步订单状态，后续资金占用、入场间距和退出判断才会使用最新数据。
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
      // 剧本变化当轮只处理旧订单和运行状态，从下一根新收盘 K 线开始入场。
      allowEntry: !structureChanged && !runtime.entryPaused,
    });

    strategy.parameters = runtime;
    strategy.lastExecutionTime = now;
    await this.strategyRecordRepository.save(strategy);
  }

  /**
   * 根据交易所当前挂单同步本地状态。
   * 按本策略约定：本地订单不在 openOrders 中，就直接认为买入或卖出已经完成。
   * 这是有意采用的简化模型，用户在交易所手动操作时也遵循同一规则。
   */
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

  /** 买单最多保留配置指定的完整 K 线数量，超时仍未成交就取消。 */
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

  /** 先取消交易所买单，再删除相应的本地待买记录。 */
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

  /** 读取人工维护的 D1 方向和普通关键位，组成当前日线剧本快照。 */
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

  /**
   * 响应日线剧本变化：所有未成交买单立即取消；如果交易模式已经切换，
   * 旧模式中达到最低利润要求的持仓会挂出止盈单，未盈利仓位继续等待后续退出信号。
   */
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

  /**
   * 获取最新已收盘的 M5 收盘价。
   * needReverse=true 时索引 0 是形成中的 K 线，所以必须读取索引 1。
   */
  private getLatestClosedPrice(symbol: string, env: KlineEnv): number | null {
    const klines = this.klineCacheService.getKlines(symbol, TimeFrame.M5, env, {
      needReverse: true,
      klinesSliceNum: 2,
    });
    const price = Number(klines[1]?.close);
    return Number.isFinite(price) && price > 0 ? price : null;
  }

  /**
   * 逐个 EMA 信号组处理关键位突破、EMA 出场和新入场。
   * runtime 中记录每组最后处理的 K 线时间，保证同一根收盘 K 线只处理一次。
   */
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

      // 上涨模式额外响应人工关键位突破；震荡模式完全由 EMA 信号驱动。
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

      // 无论本根 K 线是否实际下单，都标记为已处理，防止定时任务重复触发同一信号。
      args.runtime.lastProcessedKlineTime[profileKey] =
        context.currentKlineTime;
    }
  }

  /**
   * 构造本轮需要计算的 EMA 组。
   * 除当前配置外，还要保留已有持仓最初使用的周期和 EMA 参数；这样修改配置后，
   * 老持仓仍能等待自己的 EMA 退出信号，新配置只影响后续入场。
   */
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

  /** 获取形成中 K 线之外的历史数据，并计算最近两根已收盘 K 线的 EMA 信号。 */
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

  /**
   * 处理上涨模式的关键位向上突破。
   * 同一个关键位在当前日线剧本中只处理一次；突破后取消上涨买单，并退出已盈利持仓。
   */
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

  /**
   * 根据信号创建一份限价买单。
   * 单份资金 = 策略总资金 / 当前模式的 positionParts；已有买单、持仓和待卖仓位
   * 都会计入占用资金，避免总体资金超过策略预算。
   */
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

    // 使用信号 K 线收盘价挂限价买单，并按交易所价格精度规范化。
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

    // 数量必须按交易所 stepLength 向下截断，避免实际占用资金超过单份预算。
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

    // 最低止盈价在入场时固定记录，之后所有出场信号都必须先满足该价格。
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

  /**
   * 限制新买单和现有订单的价格距离。
   * 上涨模式只避让未成交买单，允许盈利退出后再次参与趋势；震荡模式同时避让已有持仓，
   * 防止在相近价格反复堆积小仓位。
   */
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

  /** 上涨入场距离最近上方日线关键位过近时不追买，给波段留出利润空间。 */
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

  /**
   * 为满足退出条件的持仓挂限价卖单。
   * 先按交易所价格精度归一化最低止盈价，再把同一价格的多个批次合并处理。
   */
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

  /**
   * 按用户指定价格退出选中的持仓，不校验自动策略的最低盈利条件。
   * 相同价格已经存在卖单时继续合并到原卖单，否则创建新的聚合卖单。
   */
  private async placeManualExitOrder(
    strategy: StrategyRecord,
    holdings: ActiveSpotEmaTrade[],
    exitPrice: number,
    marketInfo: MarketOrderInfo,
  ): Promise<boolean> {
    const normalizedExitPrice = roundUpPrice({
      price: toFinitePositiveNumber(exitPrice, '手动出场价格'),
      precision: marketInfo.precisionPrice,
    });
    const aggregate = aggregateEmaTrades(holdings, marketInfo.stepLength);
    if (aggregate.tradeAmount < marketInfo.minSz) {
      throw new BadRequestException(
        `卖出数量不能低于交易所最小数量 ${marketInfo.minSz}`,
      );
    }

    const existingSell =
      await this.activeSpotEmaTradesService.findPendingSellByTakeProfitPrice({
        strategyRecordId: strategy.id,
        takeProfitPrice: normalizedExitPrice,
      });
    if (existingSell) {
      return await this.editAggregatedSellOrder(
        strategy,
        existingSell,
        holdings,
        marketInfo,
      );
    }

    return await this.createAggregatedSellOrder(
      strategy,
      holdings,
      normalizedExitPrice,
      marketInfo,
    );
  }

  /**
   * 相同止盈价尚无卖单时，创建一个聚合卖单。
   * 交易所创建成功后，再用事务把原 HOLDING 记录替换成一条 PENDING_SELL 记录；
   * 如果数据库处理失败，则取消刚创建的交易所订单，避免两边失去对应关系。
   */
  private async createAggregatedSellOrder(
    strategy: StrategyRecord,
    holdings: ActiveSpotEmaTrade[],
    takeProfitPrice: number,
    marketInfo: MarketOrderInfo,
  ): Promise<boolean> {
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
      return false;
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
      return true;
    } catch (error) {
      await this.exchangeService.batchCancelOrders(
        strategy.exchangeConfigId,
        [String(created.id)],
        strategy.symbol,
      );
      throw error;
    }
  }

  /**
   * 相同止盈价已有卖单时，参考 grid-cash 直接扩大原交易所卖单数量。
   * 交易所编辑成功后，再用事务把新持仓并入原 PENDING_SELL 记录，整个卖单只保留一个 orderId。
   */
  private async editAggregatedSellOrder(
    strategy: StrategyRecord,
    existingSell: ActiveSpotEmaTrade,
    holdings: ActiveSpotEmaTrade[],
    marketInfo: MarketOrderInfo,
  ): Promise<boolean> {
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
      return false;
    }

    await this.activeSpotEmaTradesService.mergeHoldingsIntoPendingSell({
      strategyRecordId: strategy.id,
      holdingIds: holdings.map((item) => item.id),
      pendingSellId: existingSell.id,
      entryPrice: aggregate.entryPrice,
      tradeAmount: aggregate.tradeAmount,
      positionCost: aggregate.positionCost,
    });
    return true;
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

  /** 把交易所返回的字符串/数字字段统一校验并转换成策略内部使用的数值。 */
  private normalizeMarketInfo(value: unknown): MarketOrderInfo {
    const info = (value || {}) as Record<string, unknown>;
    return {
      minSz: toFinitePositiveNumber(info.minSz, '最小下单数量'),
      stepLength: String(info.stepLength),
      precisionPrice: toFinitePositiveNumber(info.precisionPrice, '价格精度'),
    };
  }

  /** 解析并补全策略配置，同时执行周期、份数和比例等范围校验。 */
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

  private async findRunningStrategy(
    strategyId: number,
    userId: number,
  ): Promise<StrategyRecord> {
    const strategy = await this.strategyRecordRepository.findOne({
      where: {
        id: strategyId,
        userId,
        status: 1,
        strategyName: this.strategyName,
      },
    });
    if (!strategy) throw new BadRequestException('未找到运行中的策略');
    return strategy;
  }

  /** 同步交易所订单后返回策略当前全部交易记录。 */
  async listTrades(
    strategyId: number,
    userId: number,
  ): Promise<ResponseDto<ActiveSpotEmaTrade[]>> {
    return await this.withStrategyLock(strategyId, async () => {
      const strategy = await this.findRunningStrategy(strategyId, userId);
      const config = this.parseConfigJson(strategy.configJson);
      const openOrdersRes = await this.exchangeService.fetchOpenOrders(
        strategy.exchangeConfigId,
        strategy.symbol,
      );
      await this.syncOrderStates(
        strategy,
        config,
        openOrdersRes?.data || [],
        Date.now(),
      );

      const trades =
        await this.activeSpotEmaTradesService.findByStrategyRecordId(
          strategy.id,
        );
      return ResponseDto.success(trades);
    });
  }

  /** 暂停新入场并立即取消所有仍在交易所挂着的买单。 */
  async pauseEntry(
    strategyId: number,
    userId: number,
  ): Promise<ResponseDto<string>> {
    return await this.withStrategyLock(strategyId, async () => {
      const strategy = await this.findRunningStrategy(strategyId, userId);
      const runtime = parseStructureEmaRuntimeState(strategy.parameters);
      runtime.entryPaused = true;
      strategy.parameters = runtime;
      await this.strategyRecordRepository.save(strategy);

      const config = this.parseConfigJson(strategy.configJson);
      const openOrdersRes = await this.exchangeService.fetchOpenOrders(
        strategy.exchangeConfigId,
        strategy.symbol,
      );
      await this.syncOrderStates(
        strategy,
        config,
        openOrdersRes?.data || [],
        Date.now(),
      );
      const trades =
        await this.activeSpotEmaTradesService.findByStrategyRecordId(
          strategy.id,
        );
      await this.cancelPendingBuyTrades(
        strategy,
        trades.filter(
          (item) => item.tradeStatus === ActiveSpotEmaTradeStatus.PENDING_BUY,
        ),
      );

      return ResponseDto.success('已暂停创建新买单');
    });
  }

  /** 恢复新入场；暂停期间的旧 K 线不会被补做。 */
  async resumeEntry(
    strategyId: number,
    userId: number,
  ): Promise<ResponseDto<string>> {
    return await this.withStrategyLock(strategyId, async () => {
      const strategy = await this.findRunningStrategy(strategyId, userId);
      const runtime = parseStructureEmaRuntimeState(strategy.parameters);
      runtime.entryPaused = false;
      strategy.parameters = runtime;
      await this.strategyRecordRepository.save(strategy);
      return ResponseDto.success('已恢复创建新买单');
    });
  }

  /**
   * 将用户选择的 HOLDING 按指定价格合并挂出卖单。
   * 手动出场允许亏损卖出，并会取消当前全部待买单，避免旧信号随后成交。
   */
  async manualExit(
    dto: ManualExitStructureEmaSpotDto,
    userId: number,
  ): Promise<ResponseDto<string>> {
    return await this.withStrategyLock(dto.strategyId, async () => {
      const strategy = await this.findRunningStrategy(dto.strategyId, userId);
      const config = this.parseConfigJson(strategy.configJson);
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
      const marketInfo = this.normalizeMarketInfo(marketInfoRes?.data);
      await this.syncOrderStates(
        strategy,
        config,
        openOrdersRes?.data || [],
        Date.now(),
      );

      const trades =
        await this.activeSpotEmaTradesService.findByStrategyRecordId(
          strategy.id,
        );
      const selectedIds = new Set(dto.tradeIds.map(Number));
      const holdings = trades.filter((item) => selectedIds.has(item.id));
      if (
        holdings.length !== selectedIds.size ||
        holdings.some(
          (item) => item.tradeStatus !== ActiveSpotEmaTradeStatus.HOLDING,
        )
      ) {
        throw new BadRequestException('选择的持仓已发生变化，请刷新后重试');
      }

      const success = await this.placeManualExitOrder(
        strategy,
        holdings,
        dto.exitPrice,
        marketInfo,
      );
      if (!success) throw new BadRequestException('手动出场卖单创建失败');

      const refreshed =
        await this.activeSpotEmaTradesService.findByStrategyRecordId(
          strategy.id,
        );
      await this.cancelPendingBuyTrades(
        strategy,
        refreshed.filter(
          (item) => item.tradeStatus === ActiveSpotEmaTradeStatus.PENDING_BUY,
        ),
      );

      if (dto.pauseEntry === true) {
        const runtime = parseStructureEmaRuntimeState(strategy.parameters);
        runtime.entryPaused = true;
        strategy.parameters = runtime;
        await this.strategyRecordRepository.save(strategy);
      }

      return ResponseDto.success('手动出场卖单已创建');
    });
  }

  /**
   * 创建策略前校验账户、交易对、配置和最小资金要求。
   * 最小资金按上涨与震荡模式中更大的资金份数计算，保证最小的一份也能满足交易所限制。
   */
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

  /**
   * 停止策略并清除本地交易记录。
   * 按当前产品约定，这里不取消交易所挂单，也不卖出现货，由用户自行处理交易所资产。
   */
  async stop(strategyId: number, userId: number): Promise<ResponseDto<string>> {
    return await this.withStrategyLock(strategyId, async () => {
      const strategy = await this.findRunningStrategy(strategyId, userId);
      await this.activeSpotEmaTradesService.removeByStrategyRecordId(
        strategy.id,
      );
      strategy.status = 0;
      strategy.stopReason = '用户手动停止';
      await this.strategyRecordRepository.save(strategy);
      return ResponseDto.success('EMA结构现货策略已停止');
    });
  }

  /** 更新总资金或策略配置；原持仓仍使用入场时保存的 EMA 参数等待退出。 */
  async edit(
    dto: EditStructureEmaSpotDto,
    userId: number,
  ): Promise<ResponseDto<string>> {
    return await this.withStrategyLock(dto.strategyId, async () => {
      const strategy = await this.findRunningStrategy(dto.strategyId, userId);

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
    });
  }

  /** 返回前端可编辑的默认值、参数范围和允许选择的 K 线周期。 */
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
