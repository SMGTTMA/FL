import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeService } from '../exchange/exchange.service';
import { StartGridDto } from './dto/start-grid.dto';
import { BadRequestException } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { TimeFrame } from '../exchange/dto/history.dto';
import {
  calculateKeyPoints,
  findKeyPointsByCloseWithoutOrder,
  calculateOrderAndTakeProfitWithKeyPoints,
} from '@/utils/trading/trading';
import { Cron } from '@nestjs/schedule';
import { Kline } from '@/types/trading';
import {
  KlineCacheService,
  KlineEnv,
} from '@/modules/kline-cache/kline-cache.service';
import { StrategyEnvService } from '@/modules/strategy-utils/strategy-env.service';
import { OrderSide, OrderType } from '../exchange/dto/place-order.dto';
import { StrategyRecord } from '../strategy-records/entities/strategy-record.entity';
import { ExceptionLogService } from '@/modules/exception-log/exception-log.service';
import { StrategyRecordsService } from '../strategy-records/strategy-records.service';
import { ActiveSpotMartinTradesService } from '../active-spot-martin-trades/active-spot-martin-trades.service';
import { CreateActiveSpotMartinTradeDto } from '../active-spot-martin-trades/dto/create-active-spot-martin-trade.dto';
import { RejectedOrdersService } from '../rejected-orders/rejected-orders.service';
import { CreateRejectedOrderDto } from '../rejected-orders/dto/create-rejected-order.dto';
import { OperationOrderType } from '../rejected-orders/entities/rejected-order.entity';
import {
  gridCashDefaultConfig,
  gridCashMaxConfig,
  gridCashMinConfig,
} from './constants/grid-cash.cons';
import { GridCashConfig } from './types/grid-cash-config.type';
import { parseJSON } from '@/utils/base/baseUtils';
import { StopGridDto } from './dto/stop-grid.dto';

@Injectable()
export class GridCashService {
  private readonly logger = new Logger(GridCashService.name);
  private readonly STRATEGY_NAME = 'grid_cash';
  private readonly QUOTE_ASSET = 'USDT';
  private readonly LAST_K_LINE_INDEX = 0;

  constructor(
    private readonly exchangeService: ExchangeService,
    @InjectRepository(StrategyRecord)
    private strategyRecordRepository: Repository<StrategyRecord>,
    private readonly klineCacheService: KlineCacheService,
    private readonly strategyEnvService: StrategyEnvService,
    private readonly exceptionLogService: ExceptionLogService,
    private readonly strategyRecordsService: StrategyRecordsService,
    private readonly activeSpotMartinTradesService: ActiveSpotMartinTradesService,
    private readonly rejectedOrdersService: RejectedOrdersService,
  ) {}

  /**
   * 定时执行策略
   * 每5分钟第6秒执行
   * 例如：00:00:06, 00:05:06, 00:10:06, ...
   */
  @Cron('6 */5 * * * *')
  // 等待6秒，等待交易所k线完全更新，并且k线缓存模块也更新完成
  async executeStrategies() {
    try {
      const now = new Date();
      this.logger.log(`开始执行策略检查... 当前时间: ${now.toISOString()}`);

      // 获取所有运行中的策略
      const activeStrategies = await this.strategyRecordRepository.find({
        where: {
          strategyName: this.STRATEGY_NAME,
          status: 1,
        },
      });
      this.logger.log(`找到 ${activeStrategies.length} 个运行中的策略`);

      // 1. 按环境分组 symbols，并记录各自的 exchange_config_id 和环境类型
      const { exchangeConfigEnvMap } =
        await this.strategyEnvService.groupSymbolsByEnv(activeStrategies);

      // 2. 并发执行策略，传入对应环境的 shotKlineMap 的K线
      await Promise.all(
        activeStrategies.map(async (strategy) => {
          try {
            const configJson = parseJSON<GridCashConfig>(
              strategy.configJson,
              'object',
            );

            // 根据 exchange_config_id 查环境类型，选择正确的缓存map
            const envType = exchangeConfigEnvMap.get(
              strategy.exchangeConfigId,
            ) as KlineEnv;
            const shotKlines = this.klineCacheService.getKlines(
              strategy.symbol,
              TimeFrame.M5,
              envType,
              {
                klinesSliceNum: configJson.fiveMinuteKlineNum,
                needReverse: true,
              },
            );
            const longKlines = this.klineCacheService.getKlines(
              strategy.symbol,
              TimeFrame.H1,
              envType,
              { klinesSliceNum: configJson.oneHourKlineNum, needReverse: true },
            );
            await this.executeStrategy(strategy, shotKlines, longKlines);
            // 更新策略执行时间
            strategy.lastExecutionTime = now;
            await this.strategyRecordRepository.save(strategy);
            this.logger.log(`现金网格策略执行成功 - ${strategy.symbol}`);
          } catch (error) {
            await this.exceptionLogService.create({
              url: 'cronjob/executeGridCashStrategies/single',
              method: 'CRON',
              statusCode: 500,
              message: error?.message || String(error),
              stack: error?.stack || '',
              userId: null,
            });

            this.logger.error(
              `现金网格策略执行失败 - ${strategy.symbol}:`,
              error,
            );
          }
        }),
      );
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/executeGridCashStrategies',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] 执行现金网格策略检查失败', error);
    }
  }

  /**
   * 获取未成交的订单信息
   * 根据 k 线数据计算出没有挂单的关键位信息
   * 根据没有挂单的关键位信息 计算出挂单的价格、数量、止盈价等
   */
  private async executeStrategy(
    strategy: StrategyRecord,
    shotKlines: Kline[],
    longKlines: Kline[],
  ) {
    const {
      symbol,
      exchangeConfigId,
      totalPositionSize,
      userId,
      configJson: configJsonFromArgs,
    } = strategy;
    this.logger.log(`${userId}-${symbol} ===> 开始执行现金网格策略`);

    const configJson = parseJSON<GridCashConfig>(configJsonFromArgs, 'object');

    // 单次开单金额 向上取整 (整数USDT)
    const singleOrderAmount = Math.ceil(
      totalPositionSize / configJson.maxOrderCount,
    );

    if (!shotKlines?.length || !longKlines?.length) {
      throw new InternalServerErrorException('获取历史价格失败');
    }

    const shotKeyPoints = calculateKeyPoints(shotKlines, {
      testCount: configJson.shortTestCount,
      priceTolerance: configJson.shortPriceTolerance,
    });

    const longKeyPoints = calculateKeyPoints(longKlines, {
      testCount: configJson.longTestCount,
      priceTolerance: configJson.longPriceTolerance,
    });

    // 获取未成交订单
    const openOrdersRes = await this.exchangeService.fetchOpenOrders(
      exchangeConfigId,
      symbol,
    );
    if (!openOrdersRes?.data) {
      throw new InternalServerErrorException('获取未成交订单失败');
    }
    const openOrders = openOrdersRes.data;

    // 获取当前K线的收盘价
    const close = shotKlines[this.LAST_K_LINE_INDEX]?.close;
    if (!close) {
      throw new InternalServerErrorException('无法获取最新收盘价');
    }

    // 没有挂单的关键位
    const noOrderKeyPoints = findKeyPointsByCloseWithoutOrder({
      keyPoints: shotKeyPoints,
      openOrders,
      close,
      direction: 'below',
    });

    if (noOrderKeyPoints.length === 0) {
      this.logger.log(
        `${userId}-${symbol} ===> 没有可以挂单的关键位，不进行交易`,
      );
      return;
    }

    // 只做多单
    const side = OrderSide.BUY;
    const orderAndTPArr = calculateOrderAndTakeProfitWithKeyPoints({
      side,
      closeProfitPoint: configJson.profitPoint,
      noOrderKeyPoints,
      shortKeyPoints: shotKeyPoints,
      longKeyPoints: longKeyPoints,
    });

    // 理论上不会出现这种情况，但是为了严谨性，还是判断一下
    if (orderAndTPArr.length === 0) {
      throw new InternalServerErrorException(
        `${userId}-${symbol} ===> 没有计算出挂单价格和止盈价格`,
      );
    }

    // 判断是否有新的订单产生 有则获取账户余额，判断资产是否足够开单
    const balanceRes = await this.exchangeService.getBalance(exchangeConfigId);
    if (!balanceRes?.data || !balanceRes.data[this.QUOTE_ASSET]) {
      throw new InternalServerErrorException(
        `${userId}-${symbol} ===> 获取账户余额失败`,
      );
    }
    const usdtFree = balanceRes.data[this.QUOTE_ASSET].free;
    this.logger.log(
      `${userId}-${symbol} ===> 账户可用${this.QUOTE_ASSET}: ${usdtFree}`,
    );

    const allOrderNeedAmount = orderAndTPArr.length * singleOrderAmount;
    if (allOrderNeedAmount > usdtFree) {
      // 更新策略状态 停止策略 但是不要删除活跃交易记录 可以手动恢复
      // strategy.status = 0;
      strategy.stopReason = `账户可用${this.QUOTE_ASSET}不足，需要 ${allOrderNeedAmount} ${this.QUOTE_ASSET}，当前可用 ${usdtFree} ${this.QUOTE_ASSET}`;
      await this.strategyRecordRepository.save(strategy);
      return;
    }

    // 每次执行，判断全部的里面是否存在（存在 + amount），然后分离出 偏离的和未偏离的（偏离的使用创建逻辑，否则编辑逻辑）

    // 生成待开单的订单信息 和 需要删除的订单信息
    const {
      needCreateOrderList,
      needDeleteOrderList,
      needEditOrderList,
      needEditOrderListInDatabase,
      backPriceRangeTradesList,
    } = await this.strategyEnvService.generateMartinOrderInfo({
      exchangeConfigId,
      symbol,
      userId,
      strategyName: this.STRATEGY_NAME,
      openOrders,
      orderAndTPArr,
      singleOrderAmount,
      tradingSide: side,
      currentClosePrice: close,
      priceOffsetPercent: configJson.priceOffsetPercent,
      pairType: 'spot',
    });

    // 先删除已经触发的订单在活跃交易表中的数据
    await this.activeSpotMartinTradesService.batchRemove(
      needDeleteOrderList.map((ele) => ele.orderId),
      userId,
    );

    const allNeedCreateOrderList = [
      ...needCreateOrderList,
      ...backPriceRangeTradesList,
    ];
    /** 记录 回到偏移价格范围内的订单 在 allNeedCreateOrderList 中的开始索引 */
    const backPriceRangeTradesStartIndex = needCreateOrderList.length;

    const createOrderRes = await this.exchangeService.createOrders(
      exchangeConfigId,
      allNeedCreateOrderList,
    );
    // 找出批量创建中 成功的订单数据 和 失败的订单数据
    const {
      successOrderList,
      failedOrderList,
      backPriceRangeSuccessOrderList,
      backPriceRangeFailedOrderList,
    } = (createOrderRes?.data || []).reduce<{
      successOrderList: Partial<CreateActiveSpotMartinTradeDto>[];
      failedOrderList: Partial<CreateActiveSpotMartinTradeDto>[];
      backPriceRangeSuccessOrderList: Partial<
        CreateActiveSpotMartinTradeDto & { oldOrderId: string }
      >[];
      backPriceRangeFailedOrderList: Partial<
        CreateActiveSpotMartinTradeDto & { oldOrderId: string }
      >[];
    }>(
      (acc, ele, index) => {
        const currentOrder = allNeedCreateOrderList[index];
        const item = {
          entryPrice: currentOrder.price,
          takeProfitPrice: currentOrder.takeProfitPrice,
          tradeAmount: currentOrder.amount,
          side: currentOrder.side,
          orderId: ele.id,
        };

        if (index >= backPriceRangeTradesStartIndex) {
          if (ele.status === 'rejected') {
            acc.backPriceRangeFailedOrderList.push({
              ...item,
              oldOrderId: allNeedCreateOrderList[index].oldOrderId,
            });
          } else {
            acc.backPriceRangeSuccessOrderList.push({
              ...item,
              oldOrderId: allNeedCreateOrderList[index].oldOrderId,
            });
          }
          return acc;
        }

        if (ele.status === 'rejected') {
          acc.failedOrderList.push(item);
        } else {
          acc.successOrderList.push(item);
        }
        return acc;
      },
      {
        successOrderList: [],
        failedOrderList: [],
        backPriceRangeSuccessOrderList: [],
        backPriceRangeFailedOrderList: [],
      },
    );

    // 更新成功的回到偏移价格范围内的订单 到活跃现货马丁交易表
    if (backPriceRangeSuccessOrderList.length) {
      const backPriceRangeSuccessOrderListUpdateDtoList =
        backPriceRangeSuccessOrderList.map((ele) => ({
          orderId: ele.orderId,
          isPriceDeviated: false,
          oldOrderId: ele.oldOrderId,
        }));

      await this.activeSpotMartinTradesService.batchUpdateAndChangeId(
        backPriceRangeSuccessOrderListUpdateDtoList,
        this.STRATEGY_NAME,
        userId,
      );
    }

    // 删除失败的回到偏移价格范围内的订单 到活跃现货马丁交易表
    if (backPriceRangeFailedOrderList.length) {
      await this.activeSpotMartinTradesService.batchRemove(
        backPriceRangeFailedOrderList.map((ele) => ele.oldOrderId),
        userId,
      );
    }

    // 记录创建的订单到活跃现货马丁交易表
    const activeTrades = successOrderList.map((order) => ({
      strategyName: this.STRATEGY_NAME,
      symbol,
      entryPrice: order.entryPrice,
      takeProfitPrice: order.takeProfitPrice,
      tradeAmount: order.tradeAmount,
      side: order.side,
      exchangeConfigId,
      orderId: order.orderId,
    }));

    // 批量创建活跃交易记录
    await this.activeSpotMartinTradesService.batchCreate(activeTrades, userId);
    // 记录创建失败的订单
    const createFailedTrades: CreateRejectedOrderDto[] = failedOrderList.map(
      (order) => ({
        strategyName: this.STRATEGY_NAME,
        params: {
          order: JSON.stringify(order),
        },
        symbol,
        orderType: OperationOrderType.CREATE,
        rejectReason: 'rejected',
        userId,
        exchangeConfigId,
        exchangeName: 'OKX',
      }),
    );

    if (createFailedTrades.length) {
      await this.rejectedOrdersService.createBatch(createFailedTrades);
    }

    const editOrderRes = await this.exchangeService.batchEditOrders({
      exchangeConfigId,
      editOrderList: needEditOrderList.map((ele) => {
        return {
          orderId: ele.existOrderId,
          symbol,
          amount: ele.tradeAmount,
          side: ele.side,
          type: OrderType.LIMIT,
        };
      }),
    });
    const {
      successResults,
      failedResults,
      failedOrderIds: editFailedOrderIds,
    } = editOrderRes?.data || {};

    // 交易所编辑之后需要更新的数据
    const successEditOrderList = successResults.map((ele) => ({
      orderId: ele.orderId,
      tradeAmount: ele.amount,
    }));
    // 无需在交易所编辑的数据 直接更新数据库
    const noOKXEditForOrderListInDatabase = needEditOrderListInDatabase.map(
      (ele) => ({
        orderId: ele.existOrderId,
        tradeAmount: ele.tradeAmount,
      }),
    );
    await this.activeSpotMartinTradesService.batchUpdate(
      [...successEditOrderList, ...noOKXEditForOrderListInDatabase],
      this.STRATEGY_NAME,
      userId,
    );

    // 记录编辑失败的订单
    const editFailedTrades: CreateRejectedOrderDto[] = failedResults.map(
      (order) => ({
        strategyName: this.STRATEGY_NAME,
        params: {
          order: JSON.stringify(order),
        },
        symbol,
        orderType: OperationOrderType.EDIT,
        rejectReason: 'edit failed',
        userId,
        exchangeConfigId,
        exchangeName: 'OKX',
      }),
    );

    // 编辑失败的订单需要从记录表中删除 避免后续爆错
    await this.activeSpotMartinTradesService.batchRemove(
      editFailedOrderIds,
      userId,
    );

    if (editFailedTrades.length) {
      await this.rejectedOrdersService.createBatch(editFailedTrades);
    }
  }

  /**
   * 每小时零1分自动取消不在shotKlines关键位上的挂单，避免资金占用
   */
  @Cron('0 1 * * * *')
  async autoCancelInvalidOrders() {
    this.logger.log('[定时任务] 开始自动清理无效挂单...');
    try {
      // 获取所有运行中的策略
      const activeStrategies = await this.strategyRecordRepository.find({
        where: {
          strategyName: this.STRATEGY_NAME,
          status: 1,
        },
      });
      if (!activeStrategies.length) {
        this.logger.log('无运行中策略，跳过无效挂单清理');
        return;
      }
      // 按环境分组
      const { exchangeConfigEnvMap } =
        await this.strategyEnvService.groupSymbolsByEnv(activeStrategies);
      await Promise.all(
        activeStrategies.map(async (strategy) => {
          try {
            const configJson = parseJSON<GridCashConfig>(
              strategy.configJson,
              'object',
            );

            const envType = exchangeConfigEnvMap.get(strategy.exchangeConfigId);
            const shotKlines = this.klineCacheService.getKlines(
              strategy.symbol,
              TimeFrame.M5,
              envType,
              {
                klinesSliceNum: configJson.fiveMinuteKlineNum,
                needReverse: true,
              },
            );
            if (!shotKlines.length) {
              this.logger.warn(
                `${strategy.userId}-${strategy.symbol} ===> [清理无效挂单] 未获取到K线，跳过`,
              );
              return;
            }
            const shotKeyPoints = calculateKeyPoints(shotKlines, {
              testCount: configJson.shortTestCount,
              priceTolerance: configJson.shortPriceTolerance,
            });
            const keyPrices = shotKeyPoints.map((kp) => kp.price);
            // 获取未成交订单
            const openOrdersRes = await this.exchangeService.fetchOpenOrders(
              strategy.exchangeConfigId,
              strategy.symbol,
            );
            if (!openOrdersRes?.data) {
              this.logger.warn(
                `${strategy.userId}-${strategy.symbol} ===> [清理无效挂单] 获取未成交订单失败`,
              );
              return;
            }
            const openBuyOrders = openOrdersRes.data.filter(
              (ele) => ele.side === OrderSide.BUY,
            );
            // 找出不在关键位的订单
            const invalidBuyOrders = openBuyOrders.filter(
              (order) => !keyPrices.includes(order.price),
            );

            const { updateDtoList, cancelOrderList } =
              await this.strategyEnvService.generateCancelOrderList({
                strategyName: this.STRATEGY_NAME,
                symbol: strategy.symbol,
                userId: strategy.userId,
                currentClosePrice: shotKlines[this.LAST_K_LINE_INDEX]?.close,
                priceOffsetPercent: configJson.priceOffsetPercent,
                tradingSide: OrderSide.BUY,
              });

            if (!invalidBuyOrders.length && !cancelOrderList.length) {
              this.logger.log(
                `${strategy.userId}-${strategy.symbol} ===> [清理无效挂单] 没有需要取消的无效挂单`,
              );
              return;
            }

            // 记录价格偏离的订单
            await this.activeSpotMartinTradesService.batchUpdate(
              updateDtoList,
              this.STRATEGY_NAME,
              strategy.userId,
            );

            const invalidBuyOrderIds = [
              ...invalidBuyOrders,
              ...cancelOrderList,
            ].map((order) => order.id);
            await this.exchangeService.batchCancelOrders(
              strategy.exchangeConfigId,
              invalidBuyOrderIds,
              strategy.symbol,
            );

            this.logger.log(
              `${strategy.userId}-${strategy.symbol} ===> [清理无效挂单] 已取消 ${invalidBuyOrderIds.length} 个无效挂单并清理相关记录`,
            );
          } catch (err) {
            this.logger.error(
              `${strategy.userId}-${strategy.symbol} ===> [清理无效挂单] 处理失败`,
              err,
            );
          }
        }),
      );
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/autoCancelGridCashInvalidOrders',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] 自动清理现金网格策略无效挂单失败', error);
    }
  }

  validateConfigJson(configJson: string): GridCashConfig {
    try {
      const {
        maxOrderCount = gridCashDefaultConfig.maxOrderCount,
        shortTestCount = gridCashDefaultConfig.shortTestCount,
        shortPriceTolerance = gridCashDefaultConfig.shortPriceTolerance,
        longTestCount = gridCashDefaultConfig.longTestCount,
        longPriceTolerance = gridCashDefaultConfig.longPriceTolerance,
        priceOffsetPercent = gridCashDefaultConfig.priceOffsetPercent,
        fiveMinuteKlineNum = gridCashDefaultConfig.fiveMinuteKlineNum,
        oneHourKlineNum = gridCashDefaultConfig.oneHourKlineNum,
        historyHighPrice = gridCashDefaultConfig.historyHighPrice,
        profitPoint = gridCashDefaultConfig.profitPoint,
      } = JSON.parse(configJson) as Partial<GridCashConfig>;

      if (maxOrderCount > gridCashMaxConfig.maxOrderCount) {
        throw new BadRequestException(
          `最大开单数量不能大于${gridCashMaxConfig.maxOrderCount}`,
        );
      }
      if (maxOrderCount < gridCashMinConfig.maxOrderCount) {
        throw new BadRequestException(
          `最大开单数量不能小于${gridCashMinConfig.maxOrderCount}`,
        );
      }

      if (shortTestCount > gridCashMaxConfig.shortTestCount) {
        throw new BadRequestException(
          `短周期测试次数不能大于${gridCashMaxConfig.shortTestCount}`,
        );
      }
      if (shortTestCount < gridCashMinConfig.shortTestCount) {
        throw new BadRequestException(
          `短周期测试次数不能小于${gridCashMinConfig.shortTestCount}`,
        );
      }

      if (shortPriceTolerance > gridCashMaxConfig.shortPriceTolerance) {
        throw new BadRequestException(
          `短周期价格容忍度不能大于${gridCashMaxConfig.shortPriceTolerance}`,
        );
      }
      if (shortPriceTolerance < gridCashMinConfig.shortPriceTolerance) {
        throw new BadRequestException(
          `短周期价格容忍度不能小于${gridCashMinConfig.shortPriceTolerance}`,
        );
      }

      if (longTestCount > gridCashMaxConfig.longTestCount) {
        throw new BadRequestException(
          `长周期测试次数不能大于${gridCashMaxConfig.longTestCount}`,
        );
      }
      if (longTestCount < gridCashMinConfig.longTestCount) {
        throw new BadRequestException(
          `长周期测试次数不能小于${gridCashMinConfig.longTestCount}`,
        );
      }

      if (longPriceTolerance > gridCashMaxConfig.longPriceTolerance) {
        throw new BadRequestException(
          `长周期价格容忍度不能大于${gridCashMaxConfig.longPriceTolerance}`,
        );
      }
      if (longPriceTolerance < gridCashMinConfig.longPriceTolerance) {
        throw new BadRequestException(
          `长周期价格容忍度不能小于${gridCashMinConfig.longPriceTolerance}`,
        );
      }

      if (priceOffsetPercent > gridCashMaxConfig.priceOffsetPercent) {
        throw new BadRequestException(
          `价格偏移百分比不能大于${gridCashMaxConfig.priceOffsetPercent}`,
        );
      }
      if (priceOffsetPercent < gridCashMinConfig.priceOffsetPercent) {
        throw new BadRequestException(
          `价格偏移百分比不能小于${gridCashMinConfig.priceOffsetPercent}`,
        );
      }

      if (fiveMinuteKlineNum > gridCashMaxConfig.fiveMinuteKlineNum) {
        throw new BadRequestException(
          `5分钟k线数量不能大于${gridCashMaxConfig.fiveMinuteKlineNum}`,
        );
      }
      if (fiveMinuteKlineNum < gridCashMinConfig.fiveMinuteKlineNum) {
        throw new BadRequestException(
          `5分钟k线数量不能小于${gridCashMinConfig.fiveMinuteKlineNum}`,
        );
      }
      if (oneHourKlineNum > gridCashMaxConfig.oneHourKlineNum) {
        throw new BadRequestException(
          `1小时k线数量不能大于${gridCashMaxConfig.oneHourKlineNum}`,
        );
      }
      if (oneHourKlineNum < gridCashMinConfig.oneHourKlineNum) {
        throw new BadRequestException(
          `1小时k线数量不能小于${gridCashMinConfig.oneHourKlineNum}`,
        );
      }

      if (
        historyHighPrice &&
        historyHighPrice < gridCashMinConfig.historyHighPrice
      ) {
        throw new BadRequestException(
          `历史最高价不能小于${gridCashMinConfig.historyHighPrice}`,
        );
      }

      if (profitPoint > gridCashMaxConfig.profitPoint) {
        throw new BadRequestException(
          `盈利收益点不能大于${gridCashMaxConfig.profitPoint}`,
        );
      }
      if (profitPoint < gridCashMinConfig.profitPoint) {
        throw new BadRequestException(
          `盈利收益点不能小于${gridCashMinConfig.profitPoint}`,
        );
      }

      return {
        maxOrderCount,
        shortTestCount,
        shortPriceTolerance,
        longTestCount,
        longPriceTolerance,
        priceOffsetPercent,
        fiveMinuteKlineNum,
        oneHourKlineNum,
        historyHighPrice,
        profitPoint,
      };
    } catch (error) {
      throw new BadRequestException('配置JSON格式错误');
    }
  }

  /**
   * 启动策略
   * @param startGridDto 启动参数
   * @param userId 用户ID
   * @param exchangeConfigId 交易所配置ID
   */
  async start(startGridDto: StartGridDto, userId: number) {
    const { symbol, totalPositionSize, exchangeConfigId, configJson } =
      startGridDto;

    const newConfigJson = this.validateConfigJson(configJson);

    try {
      const { exchangeConfig } =
        await this.strategyEnvService.baseStrategyValidate({
          symbol,
          totalPositionSize,
          exchangeConfigId,
          userId,
          strategyName: this.STRATEGY_NAME,
          quoteAsset: this.QUOTE_ASSET,
          pairType: 'spot',
        });

      // 判断是否小于最小仓位
      const minPositionSize =
        await this.strategyRecordsService.calculateMinPositionSize({
          symbol,
          exchangeConfigId,
          env: exchangeConfig.isTestNet === 1 ? 'test' : 'prod',
          maxOrderCount: newConfigJson.maxOrderCount,
          pairType: 'spot',
        });

      if (totalPositionSize < minPositionSize) {
        throw new BadRequestException(
          `仓位大小不能低于最小仓位 ${minPositionSize} USDT，当前设置: ${totalPositionSize} USDT`,
        );
      }

      this.logger.log(
        `开始启动现金网格策略 - 交易对: ${symbol}, 总仓位: ${totalPositionSize} ${this.QUOTE_ASSET}, 配置ID: ${exchangeConfigId}`,
      );

      // 保存策略配置
      const strategyRecord = new StrategyRecord();
      strategyRecord.strategyName = this.STRATEGY_NAME;
      strategyRecord.symbol = symbol;
      strategyRecord.totalPositionSize = totalPositionSize;
      strategyRecord.status = 1;
      strategyRecord.side = OrderSide.BUY;
      strategyRecord.userId = userId;
      strategyRecord.exchangeConfigId = exchangeConfigId;
      strategyRecord.parameters = startGridDto;
      strategyRecord.miniPositionSize = minPositionSize;
      strategyRecord.configJson = JSON.stringify(newConfigJson);

      await this.strategyRecordRepository.save(strategyRecord);

      return ResponseDto.success('策略启动成功');
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 停止策略
   * @param userId 用户ID
   * @param symbol 交易对
   */
  async stop(strategyId: number, userId: number) {
    try {
      const strategy = await this.strategyRecordRepository.findOne({
        where: {
          id: strategyId,
          status: 1,
          userId,
        },
      });

      if (!strategy) {
        throw new BadRequestException('未找到运行中的策略');
      }

      // 删除活跃现货马丁交易表中的数据
      await this.activeSpotMartinTradesService.batchRemoveByStrategyName(
        this.STRATEGY_NAME,
        strategy.userId,
      );

      strategy.status = 0;
      strategy.stopReason = '用户手动停止';
      await this.strategyRecordRepository.save(strategy);

      return ResponseDto.success('策略停止成功');
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /** 编辑策略配置 */
  async edit(
    dto: Pick<StartGridDto, 'configJson' | 'totalPositionSize'> & StopGridDto,
    userId: number,
  ) {
    try {
      const newConfigJson = this.validateConfigJson(dto.configJson);

      const strategy = await this.strategyRecordRepository.findOne({
        where: {
          id: dto.strategyId,
          status: 1,
          userId,
        },
      });
      if (!strategy) {
        throw new BadRequestException('未找到运行中的策略');
      }
      strategy.configJson = JSON.stringify(newConfigJson);
      if (dto.totalPositionSize) {
        strategy.totalPositionSize = dto.totalPositionSize;
      }
      await this.strategyRecordRepository.save(strategy);

      return ResponseDto.success('现金网格策略配置编辑成功');
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /** 获取策略配置 */
  getStrategyConfig() {
    return {
      default: gridCashDefaultConfig,
      min: gridCashMinConfig,
      max: gridCashMaxConfig,
    };
  }
}
