import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponseDto } from '@/common/dto/response.dto';
import {
  parseJSON,
  roundFractional,
} from '@/utils/base/baseUtils';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import {
  KlineCacheService,
  KlineEnv,
} from '@/modules/kline-cache/kline-cache.service';
import { StrategyEnvService } from '@/modules/strategy-utils/strategy-env.service';
import { ExceptionLogService } from '@/modules/exception-log/exception-log.service';
import { StrategyRecordsService } from '@/modules/strategy-records/strategy-records.service';
import { StrategyRecord } from '@/modules/strategy-records/entities/strategy-record.entity';
import {
  OrderSide,
  OrderType,
  PlaceOrderDto,
} from '@/modules/exchange/dto/place-order.dto';
import { ExchangeService } from '@/modules/exchange/exchange.service';
import { ActiveSpotMartinTradesService } from '@/modules/active-spot-martin-trades/active-spot-martin-trades.service';
import { ActiveSpotMartinTrade } from '@/modules/active-spot-martin-trades/entities/active-spot-martin-trade.entity';
import { CreateActiveSpotMartinTradeDto } from '@/modules/active-spot-martin-trades/dto/create-active-spot-martin-trade.dto';
import {
  analyzeUnifiedTrendStrength,
  UnifiedTrendStrengthResult,
} from '@/utils/trading/trendStrengthAnalyzer';
import { Kline } from '@/types/trading';
import { SPOT_CLOSE_PROFIT_POINT } from '@/common/constants/trading.constants';
import { StrategyMarketDirection } from '@/modules/strategy-structures/entities/strategy-market-direction.entity';
import { StrategyKeyLevel } from '@/modules/strategy-structures/entities/strategy-key-level.entity';
import { StrategyStructureLine } from '@/modules/strategy-structures/entities/strategy-structure-line.entity';
import { StartPriceActionSpotDto } from './dto/start-price-action-spot.dto';
import { EditPriceActionSpotDto } from './dto/edit-price-action-spot.dto';
import {
  PriceActionCheckInterval,
  PriceActionSpotConfig,
} from './types/price-action-spot-config.type';
import {
  PRICE_ACTION_TIMEFRAME_RANK,
  priceActionSpotDefaultConfig,
  priceActionSpotMaxConfig,
  priceActionSpotMinConfig,
} from './constants/price-action-spot.cons';

@Injectable()
export class PriceActionSpotService {
  private readonly logger = new Logger(PriceActionSpotService.name);
  private readonly STRATEGY_NAME = 'price_action_spot';
  private readonly QUOTE_ASSET = 'USDT';
  private readonly DEFAULT_KLINE_NUM = 120;
  private readonly LAST_KLINE_INDEX = 0;
  private readonly PRICE_TOLERANCE = 1e-8;

  constructor(
    @InjectRepository(StrategyRecord)
    private readonly strategyRecordRepository: Repository<StrategyRecord>,
    @InjectRepository(StrategyMarketDirection)
    private readonly strategyMarketDirectionRepository: Repository<StrategyMarketDirection>,
    @InjectRepository(StrategyKeyLevel)
    private readonly strategyKeyLevelRepository: Repository<StrategyKeyLevel>,
    @InjectRepository(StrategyStructureLine)
    private readonly strategyStructureLineRepository: Repository<StrategyStructureLine>,
    private readonly exchangeService: ExchangeService,
    private readonly activeSpotMartinTradesService: ActiveSpotMartinTradesService,
    private readonly klineCacheService: KlineCacheService,
    private readonly strategyEnvService: StrategyEnvService,
    private readonly exceptionLogService: ExceptionLogService,
    private readonly strategyRecordsService: StrategyRecordsService,
  ) {}

  /**
   * 每5分钟轮询一次：
   * 1) 永远做状态同步（是否已入场、是否已出场、是否触及关键位要取消入场挂单）；
   * 2) 仅在策略执行槽位到达时做趋势信号分析（新入场/弱势止盈）。
   */
  @Cron('15 */5 * * * *')
  async executeStrategies() {
    try {
      const now = new Date();
      this.logger.log(`[价格行为现货] 开始轮询策略... 当前时间: ${now.toISOString()}`);

      const activeStrategies = await this.strategyRecordRepository.find({
        where: {
          strategyName: this.STRATEGY_NAME,
          status: 1,
        },
      });

      if (!activeStrategies.length) {
        this.logger.log('[价格行为现货] 无运行中的策略，跳过执行');
        return;
      }

      const { exchangeConfigEnvMap } =
        await this.strategyEnvService.groupSymbolsByEnv(activeStrategies);

      for (const strategy of activeStrategies) {
        try {
          const config = parseJSON<PriceActionSpotConfig>(
            strategy.configJson,
            'object',
          );

          if (!config) {
            this.logger.warn(
              `[价格行为现货] 配置为空，跳过 strategyId=${strategy.id}, symbol=${strategy.symbol}`,
            );
            continue;
          }

          const shouldAnalyzeSignal = this.isStrategyDue(
            config.shortTimeframe,
            strategy,
            now,
          );

          const envType = exchangeConfigEnvMap.get(
            strategy.exchangeConfigId,
          ) as KlineEnv;

          await this.executeStrategy(
            strategy,
            config,
            envType,
            shouldAnalyzeSignal,
          );

          if (shouldAnalyzeSignal) {
            strategy.lastExecutionTime = now;
            await this.strategyRecordRepository.save(strategy);
          }
        } catch (error) {
          await this.exceptionLogService.create({
            url: 'cronjob/price-action-spot/execute-single',
            method: 'CRON',
            statusCode: 500,
            message: error?.message || String(error),
            stack: error?.stack || '',
            userId: strategy.userId,
          });
          this.logger.error(
            `[价格行为现货] 执行失败 - strategyId=${strategy.id}, symbol=${strategy.symbol}`,
            error,
          );
        }
      }
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/price-action-spot/scan',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] 价格行为现货策略轮询失败', error);
    }
  }

  private async executeStrategy(
    strategy: StrategyRecord,
    config: PriceActionSpotConfig,
    envType: KlineEnv,
    shouldAnalyzeSignal: boolean,
  ) {
    const symbol = strategy.symbol;
    const userId = strategy.userId;
    const exchangeConfigId = this.toNumber(strategy.exchangeConfigId);

    // 5分钟状态同步使用的最新价格
    const latestFiveMinuteKlines = this.klineCacheService.getKlines(
      symbol,
      TimeFrame.M5,
      envType,
      {
        needReverse: true,
        klinesSliceNum: 2,
      },
    );

    const currentClose = this.toNumber(
      latestFiveMinuteKlines[this.LAST_KLINE_INDEX]?.close,
    );
    if (currentClose <= 0) {
      this.logger.warn(
        `[价格行为现货] 最新5分钟价格无效，跳过 strategyId=${strategy.id}, symbol=${symbol}`,
      );
      return;
    }
    const latestHigh = this.toNumber(
      latestFiveMinuteKlines[this.LAST_KLINE_INDEX]?.high,
      currentClose,
    );

    const currentTimestampMs =
      this.toTimestampMs(latestFiveMinuteKlines[this.LAST_KLINE_INDEX]?.timestamp) ??
      Date.now();

    const [openOrdersRes, allActiveTradesRes, keyLevels, channelUpperLines] =
      await Promise.all([
        this.exchangeService.fetchOpenOrders(exchangeConfigId, symbol),
        this.activeSpotMartinTradesService.findByStrategyName(
          this.STRATEGY_NAME,
          userId,
        ),
        this.strategyKeyLevelRepository.find({
          where: {
            userId,
            symbol,
            timeframe: config.longTimeframe,
          },
        }),
        this.strategyStructureLineRepository.find({
          where: {
            userId,
            symbol,
            timeframe: config.longTimeframe,
            lineGroup: 'CHANNEL',
            boundary: 'UPPER',
          },
        }),
      ]);

    const openOrders = openOrdersRes?.data || [];
    const strategyTrades = this.filterStrategyTrades(
      allActiveTradesRes?.data || [],
      symbol,
      exchangeConfigId,
    );

    const { openBuyOrderIds, openSellOrderIds } = this.extractOpenOrderSets(
      openOrders,
    );

    // 同步已出场：止盈单不在openOrders里，视为已成交出场，清理记录
    const exitedTradeOrderIds = strategyTrades
      .filter((trade) => {
        const orderId = this.normalizeOrderId(trade.orderId);
        if (!orderId) return false;
        return trade.side === OrderSide.SELL && !openSellOrderIds.has(orderId);
      })
      .map((trade) => this.normalizeOrderId(trade.orderId));

    if (exitedTradeOrderIds.length) {
      await this.activeSpotMartinTradesService.batchRemove(exitedTradeOrderIds, userId);
    }

    const exitedSet = new Set(exitedTradeOrderIds);
    let currentTrades = strategyTrades.filter((trade) => {
      const orderId = this.normalizeOrderId(trade.orderId);
      return orderId ? !exitedSet.has(orderId) : true;
    });

    const allResistancePrices = this.resolveResistancePrices(
      keyLevels,
      channelUpperLines,
      currentTimestampMs,
    );

    // 取消入场挂单：最新价达到最近关键阻力位/通道上沿
    let pendingEntryTrades = currentTrades.filter((trade) => {
      const orderId = this.normalizeOrderId(trade.orderId);
      return (
        trade.side === OrderSide.BUY &&
        orderId &&
        openBuyOrderIds.has(orderId)
      );
    });

    const shouldCancelByResistance = pendingEntryTrades.some((trade) => {
      const entryPrice = this.toNumber(trade.entryPrice);
      const nearestResistance = this.findNearestResistancePrice(
        allResistancePrices,
        entryPrice,
      );
      return (
        nearestResistance !== null &&
        latestHigh + this.PRICE_TOLERANCE >= nearestResistance
      );
    });

    if (shouldCancelByResistance) {
      const pendingEntryOrderIds = pendingEntryTrades
        .map((trade) => this.normalizeOrderId(trade.orderId))
        .filter((id) => !!id);

      if (pendingEntryOrderIds.length) {
        await this.exchangeService.batchCancelOrders(
          exchangeConfigId,
          pendingEntryOrderIds,
          symbol,
        );
        await this.activeSpotMartinTradesService.batchRemove(
          pendingEntryOrderIds,
          userId,
        );

        const cancelledSet = new Set(pendingEntryOrderIds);
        currentTrades = currentTrades.filter((trade) => {
          const orderId = this.normalizeOrderId(trade.orderId);
          return orderId ? !cancelledSet.has(orderId) : true;
        });
      }

      this.logger.log(
        `[价格行为现货] 取消入场挂单(触及关键阻力位)，strategyId=${strategy.id}, symbol=${symbol}, count=${pendingEntryOrderIds.length}`,
      );
    }

    // 非分析槽位：只做5分钟状态同步，不做新信号入场/止盈
    if (!shouldAnalyzeSignal) {
      this.logger.log(
        `[价格行为现货] 5分钟状态同步完成，strategyId=${strategy.id}, symbol=${symbol}`,
      );
      return;
    }

    const shortKlines = this.klineCacheService.getKlines(
      symbol,
      this.toTimeFrame(config.shortTimeframe),
      envType,
      {
        needReverse: true,
        klinesSliceNum: this.DEFAULT_KLINE_NUM + 1,
      },
    );
    if (shortKlines.length < 2) {
      this.logger.warn(
        `[价格行为现货] 趋势分析K线不足，跳过 strategyId=${strategy.id}, symbol=${symbol}`,
      );
      return;
    }

    const analysis = analyzeUnifiedTrendStrength(shortKlines);

    this.logger.log(
      `[价格行为现货] 信号分析完成，strategyId=${strategy.id}, symbol=${symbol}, direction=${analysis.direction}, follow=${analysis.followThrough.status}`,
    );

    // 出现新的入场信号，取消历史未入场挂单
    pendingEntryTrades = currentTrades.filter((trade) => {
      const orderId = this.normalizeOrderId(trade.orderId);
      return (
        trade.side === OrderSide.BUY &&
        orderId &&
        openBuyOrderIds.has(orderId)
      );
    });

    const shouldCancelByNewSignal = this.shouldCancelPendingByNewSignal(
      pendingEntryTrades,
      analysis,
    );

    if (shouldCancelByNewSignal && pendingEntryTrades.length) {
      const orderIds = pendingEntryTrades
        .map((trade) => this.normalizeOrderId(trade.orderId))
        .filter((id) => !!id);

      if (orderIds.length) {
        await this.exchangeService.batchCancelOrders(exchangeConfigId, orderIds, symbol);
        await this.activeSpotMartinTradesService.batchRemove(orderIds, userId);
        const cancelledSet = new Set(orderIds);
        currentTrades = currentTrades.filter((trade) => {
          const orderId = this.normalizeOrderId(trade.orderId);
          return orderId ? !cancelledSet.has(orderId) : true;
        });
      }

      this.logger.log(
        `[价格行为现货] 取消入场挂单(新入场信号)，strategyId=${strategy.id}, symbol=${symbol}, count=${orderIds.length}`,
      );
    }

    // 弱势出场信号：对已入场且未挂止盈的仓位挂止盈单
    if (this.isWeakUpExitSignal(analysis)) {
      const enteredTradesWithoutTp = currentTrades.filter((trade) => {
        if (trade.side !== OrderSide.BUY) return false;
        const orderId = this.normalizeOrderId(trade.orderId);
        return orderId ? !openBuyOrderIds.has(orderId) : true;
      });

      if (enteredTradesWithoutTp.length) {
        const takeProfitPrice = currentClose;
        const sellOrderList: PlaceOrderDto[] = [];
        const sellTradeSource: ActiveSpotMartinTrade[] = [];

        for (const trade of enteredTradesWithoutTp) {
          const entryPrice = this.toNumber(trade.entryPrice);
          const tradeAmount = this.toNumber(trade.tradeAmount);
          if (entryPrice <= 0 || tradeAmount <= 0) continue;

          const profitRate = (takeProfitPrice - entryPrice) / entryPrice;
          if (profitRate + this.PRICE_TOLERANCE < SPOT_CLOSE_PROFIT_POINT) {
            continue;
          }

          sellOrderList.push({
            symbol,
            side: OrderSide.SELL,
            type: OrderType.LIMIT,
            amount: tradeAmount,
            price: takeProfitPrice,
          });
          sellTradeSource.push(trade);
        }

        if (sellOrderList.length) {
          const createSellRes = await this.exchangeService.createOrders(
            exchangeConfigId,
            sellOrderList,
          );

          const updateDtoList: Array<{
            oldOrderId: string;
            orderId: string;
            side: OrderSide;
            takeProfitPrice: number;
          }> = [];

          (createSellRes?.data || []).forEach((createdOrder, index) => {
            const sourceTrade = sellTradeSource[index];
            if (!sourceTrade) return;

            const oldOrderId = this.normalizeOrderId(sourceTrade.orderId);
            const newOrderId = this.normalizeOrderId(createdOrder?.id);
            const isRejected = createdOrder?.status === 'rejected';
            if (!oldOrderId || !newOrderId || isRejected) {
              return;
            }

            updateDtoList.push({
              oldOrderId,
              orderId: newOrderId,
              side: OrderSide.SELL,
              takeProfitPrice,
            });
          });

          if (updateDtoList.length) {
            await this.activeSpotMartinTradesService.batchUpdateAndChangeId(
              updateDtoList,
              this.STRATEGY_NAME,
              userId,
            );

            this.logger.log(
              `[价格行为现货] 弱势出场挂止盈成功，strategyId=${strategy.id}, symbol=${symbol}, count=${updateDtoList.length}`,
            );
          }
        }
      }
    }

    const directionRecord = await this.strategyMarketDirectionRepository.findOne({
      where: {
        userId,
        symbol,
        timeframe: config.longTimeframe,
      },
    });

    // 只有震荡/上升趋势才允许新开单
    if (!this.isDirectionAllowedForOpen(directionRecord?.direction || null)) {
      this.logger.log(
        `[价格行为现货] 市场方向不允许开单，strategyId=${strategy.id}, symbol=${symbol}, direction=${directionRecord?.direction || 'NONE'}`,
      );
      return;
    }

    // 入场信号：统一强弱上升 + 跟随触发
    if (!this.isLongEntrySignal(analysis)) {
      return;
    }

    const latestPendingEntryTrades = currentTrades.filter((trade) => {
      const orderId = this.normalizeOrderId(trade.orderId);
      return (
        trade.side === OrderSide.BUY &&
        orderId &&
        openBuyOrderIds.has(orderId)
      );
    });
    if (latestPendingEntryTrades.length) {
      return;
    }

    // 最大开单数量限制（未成交入场单 + 已入场未出场）
    const occupiedOrderCount = currentTrades.length;
    if (occupiedOrderCount >= config.maxOrderCount) {
      this.logger.log(
        `[价格行为现货] 达到最大开单数，strategyId=${strategy.id}, symbol=${symbol}, occupied=${occupiedOrderCount}, max=${config.maxOrderCount}`,
      );
      return;
    }

    const entryPrice = this.resolveSignalEntryPrice(shortKlines, analysis, currentClose);
    if (entryPrice <= 0) {
      return;
    }

    const nearestResistance = this.findNearestResistancePrice(
      allResistancePrices,
      entryPrice,
    );

    if (!nearestResistance) {
      this.logger.log(
        `[价格行为现货] 无可用阻力位，跳过入场，strategyId=${strategy.id}, symbol=${symbol}`,
      );
      return;
    }

    const profitSpaceRate = (nearestResistance - entryPrice) / entryPrice;
    if (profitSpaceRate + this.PRICE_TOLERANCE < SPOT_CLOSE_PROFIT_POINT) {
      this.logger.log(
        `[价格行为现货] 盈利空间不足，跳过入场，strategyId=${strategy.id}, symbol=${symbol}, entry=${entryPrice}, resistance=${nearestResistance}`,
      );
      return;
    }

    const balanceRes = await this.exchangeService.getBalance(exchangeConfigId);
    const usdtFree = this.toNumber(balanceRes?.data?.[this.QUOTE_ASSET]?.free);
    if (usdtFree + this.PRICE_TOLERANCE < config.singleOrderAmount) {
      this.logger.warn(
        `[价格行为现货] ${this.QUOTE_ASSET}可用余额不足，strategyId=${strategy.id}, symbol=${symbol}, need=${config.singleOrderAmount}, free=${usdtFree}`,
      );
      return;
    }

    const amount = this.toOrderAmount(config.singleOrderAmount / entryPrice);
    if (amount <= 0) {
      return;
    }

    const order: PlaceOrderDto = {
      symbol,
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      amount,
      price: entryPrice,
    };

    const createOrderRes = await this.exchangeService.createOrders(exchangeConfigId, [order]);
    const createdOrder = createOrderRes?.data?.[0];
    const createdOrderId = this.normalizeOrderId(createdOrder?.id);
    if (!createdOrderId || createdOrder?.status === 'rejected') {
      this.logger.warn(
        `[价格行为现货] 入场下单失败(被拒绝)，strategyId=${strategy.id}, symbol=${symbol}`,
      );
      return;
    }

    const tradeRecord: CreateActiveSpotMartinTradeDto = {
      strategyName: this.STRATEGY_NAME,
      symbol,
      entryPrice,
      takeProfitPrice: entryPrice * (1 + config.profitPoint),
      tradeAmount: amount,
      side: OrderSide.BUY,
      exchangeConfigId,
      orderId: createdOrderId,
    };

    await this.activeSpotMartinTradesService.batchCreate([tradeRecord], userId);

    this.logger.log(
      `[价格行为现货] 入场挂单成功，strategyId=${strategy.id}, symbol=${symbol}, entry=${entryPrice}, amount=${amount}, orderId=${createdOrderId}`,
    );
  }

  validateConfig(config: Partial<PriceActionSpotConfig>): PriceActionSpotConfig {
    const {
      singleOrderAmount = priceActionSpotDefaultConfig.singleOrderAmount,
      maxOrderCount = priceActionSpotDefaultConfig.maxOrderCount,
      shortTimeframe = priceActionSpotDefaultConfig.shortTimeframe,
      longTimeframe = priceActionSpotDefaultConfig.longTimeframe,
      profitPoint = priceActionSpotDefaultConfig.profitPoint,
    } = config;

    if (!Number.isFinite(singleOrderAmount) || singleOrderAmount <= 0) {
      throw new BadRequestException('singleOrderAmount 必须大于 0');
    }
    if (!Number.isInteger(maxOrderCount) || maxOrderCount <= 0) {
      throw new BadRequestException('maxOrderCount 必须是大于 0 的整数');
    }

    if (singleOrderAmount < priceActionSpotMinConfig.singleOrderAmount) {
      throw new BadRequestException(
        `每单投入资金不能小于 ${priceActionSpotMinConfig.singleOrderAmount} USDT`,
      );
    }
    if (singleOrderAmount > priceActionSpotMaxConfig.singleOrderAmount) {
      throw new BadRequestException(
        `每单投入资金不能大于 ${priceActionSpotMaxConfig.singleOrderAmount} USDT`,
      );
    }

    if (maxOrderCount < priceActionSpotMinConfig.maxOrderCount) {
      throw new BadRequestException(
        `最多投入单数不能小于 ${priceActionSpotMinConfig.maxOrderCount}`,
      );
    }
    if (maxOrderCount > priceActionSpotMaxConfig.maxOrderCount) {
      throw new BadRequestException(
        `最多投入单数不能大于 ${priceActionSpotMaxConfig.maxOrderCount}`,
      );
    }

    if (profitPoint < priceActionSpotMinConfig.profitPoint) {
      throw new BadRequestException(
        `盈利收益点不能小于 ${priceActionSpotMinConfig.profitPoint}`,
      );
    }
    if (profitPoint > priceActionSpotMaxConfig.profitPoint) {
      throw new BadRequestException(
        `盈利收益点不能大于 ${priceActionSpotMaxConfig.profitPoint}`,
      );
    }

    const shortRank = PRICE_ACTION_TIMEFRAME_RANK[shortTimeframe];
    const longRank = PRICE_ACTION_TIMEFRAME_RANK[longTimeframe];
    if (!shortRank || !longRank) {
      throw new BadRequestException('周期参数不合法，仅支持 1h、4h、1d');
    }
    if (longRank <= shortRank) {
      throw new BadRequestException('longTimeframe 必须大于 shortTimeframe');
    }

    return {
      singleOrderAmount,
      maxOrderCount,
      shortTimeframe,
      longTimeframe,
      profitPoint,
    };
  }

  async start(dto: StartPriceActionSpotDto, userId: number) {
    const config = this.validateConfig({
      singleOrderAmount: dto.singleOrderAmount,
      maxOrderCount: dto.maxOrderCount,
      shortTimeframe: dto.shortTimeframe,
      longTimeframe: dto.longTimeframe,
      profitPoint: dto.profitPoint,
    });

    const totalPositionSize = config.singleOrderAmount * config.maxOrderCount;

    try {
      const { exchangeConfig } =
        await this.strategyEnvService.baseStrategyValidate({
          symbol: dto.symbol,
          totalPositionSize,
          exchangeConfigId: dto.exchangeConfigId,
          userId,
          strategyName: this.STRATEGY_NAME,
          quoteAsset: this.QUOTE_ASSET,
          pairType: 'spot',
        });

      const minPositionSize =
        await this.strategyRecordsService.calculateMinPositionSize({
          symbol: dto.symbol,
          exchangeConfigId: dto.exchangeConfigId,
          env: exchangeConfig.isTestNet === 1 ? 'test' : 'prod',
          maxOrderCount: config.maxOrderCount,
          pairType: 'spot',
        });

      if (totalPositionSize < minPositionSize) {
        throw new BadRequestException(
          `总投入资金不能低于最小仓位 ${minPositionSize} USDT，当前设置: ${totalPositionSize} USDT`,
        );
      }

      const strategyRecord = new StrategyRecord();
      strategyRecord.strategyName = this.STRATEGY_NAME;
      strategyRecord.symbol = dto.symbol;
      strategyRecord.totalPositionSize = totalPositionSize;
      strategyRecord.status = 1;
      strategyRecord.side = OrderSide.BUY;
      strategyRecord.userId = userId;
      strategyRecord.exchangeConfigId = dto.exchangeConfigId;
      strategyRecord.parameters = dto;
      strategyRecord.miniPositionSize = minPositionSize;
      strategyRecord.configJson = JSON.stringify(config);

      await this.strategyRecordRepository.save(strategyRecord);
      return ResponseDto.success('价格行为现货策略启动成功');
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async stop(strategyId: number, userId: number) {
    try {
      const strategy = await this.strategyRecordRepository.findOne({
        where: {
          id: strategyId,
          userId,
          status: 1,
          strategyName: this.STRATEGY_NAME,
        },
      });

      if (!strategy) {
        throw new BadRequestException('未找到运行中的价格行为现货策略');
      }

      const [openOrdersRes, allActiveTradesRes] = await Promise.all([
        this.exchangeService.fetchOpenOrders(
          this.toNumber(strategy.exchangeConfigId),
          strategy.symbol,
        ),
        this.activeSpotMartinTradesService.findByStrategyName(
          this.STRATEGY_NAME,
          userId,
        ),
      ]);

      const strategyTrades = this.filterStrategyTrades(
        allActiveTradesRes?.data || [],
        strategy.symbol,
        this.toNumber(strategy.exchangeConfigId),
      );

      const { openBuyOrderIds } = this.extractOpenOrderSets(openOrdersRes?.data || []);

      // 按你要求：stop只取消未成交入场单，不取消止盈挂单
      const pendingEntryOrderIds = strategyTrades
        .filter((trade) => {
          const orderId = this.normalizeOrderId(trade.orderId);
          return (
            trade.side === OrderSide.BUY &&
            orderId &&
            openBuyOrderIds.has(orderId)
          );
        })
        .map((trade) => this.normalizeOrderId(trade.orderId));

      if (pendingEntryOrderIds.length) {
        await this.exchangeService.batchCancelOrders(
          this.toNumber(strategy.exchangeConfigId),
          pendingEntryOrderIds,
          strategy.symbol,
        );
      }

      // 记录全部清理（即使止盈单继续在交易所挂着）
      const allOrderIds = Array.from(
        new Set(
          strategyTrades
            .map((trade) => this.normalizeOrderId(trade.orderId))
            .filter((id) => !!id),
        ),
      );
      if (allOrderIds.length) {
        await this.activeSpotMartinTradesService.batchRemove(allOrderIds, userId);
      }

      strategy.status = 0;
      strategy.stopReason = '用户手动停止';
      await this.strategyRecordRepository.save(strategy);

      return ResponseDto.success('价格行为现货策略停止成功');
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async edit(dto: EditPriceActionSpotDto, userId: number) {
    try {
      const strategy = await this.strategyRecordRepository.findOne({
        where: {
          id: dto.strategyId,
          status: 1,
          userId,
          strategyName: this.STRATEGY_NAME,
        },
      });
      if (!strategy) {
        throw new BadRequestException('未找到运行中的价格行为现货策略');
      }

      const currentConfig = parseJSON<PriceActionSpotConfig>(
        strategy.configJson,
        'object',
      );

      const newConfig = this.validateConfig({
        singleOrderAmount:
          dto.singleOrderAmount ?? currentConfig?.singleOrderAmount,
        maxOrderCount: dto.maxOrderCount ?? currentConfig?.maxOrderCount,
        shortTimeframe: dto.shortTimeframe ?? currentConfig?.shortTimeframe,
        longTimeframe: dto.longTimeframe ?? currentConfig?.longTimeframe,
        profitPoint: dto.profitPoint ?? currentConfig?.profitPoint,
      });

      strategy.configJson = JSON.stringify(newConfig);
      strategy.totalPositionSize =
        newConfig.singleOrderAmount * newConfig.maxOrderCount;
      await this.strategyRecordRepository.save(strategy);

      return ResponseDto.success('价格行为现货策略配置编辑成功');
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  getStrategyConfig() {
    return ResponseDto.success({
      default: priceActionSpotDefaultConfig,
      min: priceActionSpotMinConfig,
      max: priceActionSpotMaxConfig,
      timeframeOptions: Object.values(PriceActionCheckInterval),
    });
  }

  private toTimeFrame(interval: PriceActionCheckInterval): TimeFrame {
    return interval as unknown as TimeFrame;
  }

  private isStrategyDue(
    shortTimeframe: PriceActionCheckInterval,
    strategy: StrategyRecord,
    now: Date,
  ): boolean {
    if (!strategy.lastExecutionTime) return true;
    const currentSlot = this.getCheckSlot(now, shortTimeframe);
    const lastSlot = this.getCheckSlot(
      new Date(strategy.lastExecutionTime),
      shortTimeframe,
    );
    return currentSlot.getTime() > lastSlot.getTime();
  }

  private getCheckSlot(time: Date, interval: PriceActionCheckInterval): Date {
    const slot = new Date(time);
    slot.setUTCMilliseconds(0);
    slot.setUTCSeconds(0);

    switch (interval) {
      case PriceActionCheckInterval.H1: {
        slot.setUTCMinutes(0, 0, 0);
        return slot;
      }
      case PriceActionCheckInterval.H4: {
        const hour = slot.getUTCHours();
        slot.setUTCHours(Math.floor(hour / 4) * 4, 0, 0, 0);
        return slot;
      }
      case PriceActionCheckInterval.D1: {
        slot.setUTCHours(0, 0, 0, 0);
        return slot;
      }
      default: {
        return slot;
      }
    }
  }

  private isDirectionAllowedForOpen(direction: string | null): boolean {
    return direction === 'RANGE' || direction === 'UP';
  }

  private isLongEntrySignal(analysis: UnifiedTrendStrengthResult): boolean {
    return (
      analysis.direction === 'up' &&
      analysis.followThrough.direction === 'up' &&
      analysis.followThrough.status === 'triggered'
    );
  }

  private isWeakUpExitSignal(analysis: UnifiedTrendStrengthResult): boolean {
    if (analysis.direction === 'down') {
      return true;
    }

    if (analysis.momentum.direction === 'down' && analysis.momentum.qualified) {
      return true;
    }

    return (
      analysis.followThrough.direction === 'down' &&
      analysis.followThrough.status === 'triggered'
    );
  }

  private shouldCancelPendingByNewSignal(
    pendingEntryTrades: ActiveSpotMartinTrade[],
    analysis: UnifiedTrendStrengthResult,
  ): boolean {
    if (!pendingEntryTrades.length) return false;
    if (!this.isLongEntrySignal(analysis)) return false;

    const triggerTimeMs = this.toTimestampMs(analysis.followThrough.triggerTime);
    if (!triggerTimeMs) return false;

    return pendingEntryTrades.some((trade) => {
      const createdAtMs =
        trade.createdAt instanceof Date
          ? trade.createdAt.getTime()
          : this.toTimestampMs(trade.createdAt as unknown as string);
      if (!createdAtMs) return false;
      return createdAtMs + this.PRICE_TOLERANCE < triggerTimeMs;
    });
  }

  private resolveSignalEntryPrice(
    shortKlines: Kline[],
    analysis: UnifiedTrendStrengthResult,
    fallbackPrice: number,
  ): number {
    const triggerTimeMs = this.toTimestampMs(analysis.followThrough.triggerTime);
    if (!triggerTimeMs) {
      return fallbackPrice;
    }

    const exact = shortKlines.find((kline) => {
      return this.toTimestampMs(kline.timestamp) === triggerTimeMs;
    });
    if (exact?.close && this.toNumber(exact.close) > 0) {
      return this.toNumber(exact.close);
    }

    let nearest: Kline | null = null;
    let minDiff = Number.MAX_SAFE_INTEGER;

    for (const kline of shortKlines) {
      const ts = this.toTimestampMs(kline.timestamp);
      if (!ts) continue;
      const diff = Math.abs(ts - triggerTimeMs);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = kline;
      }
    }

    return nearest ? this.toNumber(nearest.close, fallbackPrice) : fallbackPrice;
  }

  private extractOpenOrderSets(openOrders: any[]): {
    openBuyOrderIds: Set<string>;
    openSellOrderIds: Set<string>;
  } {
    const openBuyOrderIds = new Set<string>();
    const openSellOrderIds = new Set<string>();

    for (const order of openOrders || []) {
      const orderId = this.normalizeOrderId(order?.id);
      if (!orderId) continue;

      const side = String(order?.side || '').toLowerCase();
      if (side === OrderSide.BUY) {
        openBuyOrderIds.add(orderId);
      } else if (side === OrderSide.SELL) {
        openSellOrderIds.add(orderId);
      }
    }

    return { openBuyOrderIds, openSellOrderIds };
  }

  private filterStrategyTrades(
    allTrades: ActiveSpotMartinTrade[],
    symbol: string,
    exchangeConfigId: number,
  ): ActiveSpotMartinTrade[] {
    return (allTrades || []).filter((trade) => {
      return (
        trade.strategyName === this.STRATEGY_NAME &&
        trade.symbol === symbol &&
        this.toNumber(trade.exchangeConfigId) === exchangeConfigId
      );
    });
  }

  private resolveResistancePrices(
    keyLevels: StrategyKeyLevel[],
    channelUpperLines: StrategyStructureLine[],
    currentTimestampMs: number,
  ): number[] {
    const levelPrices = (keyLevels || [])
      .map((item) => this.toNumber(item.price))
      .filter((price) => price > 0);

    const channelPrices = (channelUpperLines || [])
      .map((line) => this.projectLinePriceAtTime(line, currentTimestampMs))
      .filter((price): price is number => {
        return Number.isFinite(price) && (price as number) > 0;
      });

    return [...levelPrices, ...channelPrices];
  }

  private projectLinePriceAtTime(
    line: StrategyStructureLine,
    targetTimestampMs: number,
  ): number | null {
    const p1Time = this.toNumber(line.p1Time);
    const p2Time = this.toNumber(line.p2Time);
    const p1Price = this.toNumber(line.p1Price);
    const p2Price = this.toNumber(line.p2Price);

    if (!p1Time || !p2Time || !p1Price || !p2Price) {
      return null;
    }

    if (p1Time === p2Time) {
      return null;
    }

    const slope = (p2Price - p1Price) / (p2Time - p1Time);
    return p1Price + slope * (targetTimestampMs - p1Time);
  }

  private findNearestResistancePrice(
    resistancePrices: number[],
    basePrice: number,
  ): number | null {
    const candidates = (resistancePrices || []).filter(
      (price) => price > basePrice + this.PRICE_TOLERANCE,
    );

    if (!candidates.length) {
      return null;
    }

    return Math.min(...candidates);
  }

  private toTimestampMs(timestamp: string | null | undefined): number | null {
    if (!timestamp) return null;
    const value = Date.parse(timestamp);
    return Number.isFinite(value) ? value : null;
  }

  private normalizeOrderId(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  private toOrderAmount(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;
    const normalized = roundFractional(value, 8);
    return this.toNumber(normalized);
  }

  private toNumber(value: unknown, fallback = 0): number {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return fallback;
    }
    return num;
  }
}
