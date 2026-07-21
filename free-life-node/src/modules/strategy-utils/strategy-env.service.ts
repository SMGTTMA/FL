import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeConfig } from '@/modules/exchange/entities/exchange-config.entity';
import { StrategyRecord } from '../strategy-records/entities/strategy-record.entity';
import { TradingPairsService } from '../trading-pairs/trading-pairs.service';
import { ExchangeService } from '../exchange/exchange.service';
import { ActiveSpotMartinTradesService } from '../active-spot-martin-trades/active-spot-martin-trades.service';
import { ActiveSpotMartinTrade } from '../active-spot-martin-trades/entities/active-spot-martin-trade.entity';
import { Order } from 'ccxt';
import {
  OrderSide,
  OrderType,
  PlaceOrderDto,
} from '../exchange/dto/place-order.dto';
import {
  calculateBuyAmount,
  calculateOffsetPrice,
  roundUpPrice,
  truncateByStep,
} from '@/utils/trading/trading';
import { UpdateActiveSpotMartinTradeDto } from '../active-spot-martin-trades/dto/update-active-spot-martin-trade.dto';

@Injectable()
export class StrategyEnvService {
  constructor(
    @InjectRepository(ExchangeConfig)
    private readonly exchangeConfigRepository: Repository<ExchangeConfig>,
    @InjectRepository(StrategyRecord)
    private strategyRecordRepository: Repository<StrategyRecord>,
    private readonly tradingPairsService: TradingPairsService,
    private readonly exchangeService: ExchangeService,
    private readonly activeSpotMartinTradesService: ActiveSpotMartinTradesService,
  ) {}

  /** 基础开策略验证 */
  async baseStrategyValidate(args: {
    symbol: string;
    totalPositionSize: number;
    exchangeConfigId: number;
    userId: number;
    strategyName: string;
    quoteAsset?: string;
    pairType?: 'spot' | 'contract';
  }): Promise<{
    exchangeConfig: ExchangeConfig;
  }> {
    const {
      symbol,
      totalPositionSize,
      exchangeConfigId,
      userId,
      // strategyName,
      quoteAsset = 'USDT',
      pairType = 'spot',
    } = args;

    const exchangeConfig = await this.exchangeConfigRepository.findOne({
      where: { id: exchangeConfigId, userId, isActive: 1 },
    });

    if (!exchangeConfig) {
      throw new BadRequestException('无效的交易所配置');
    }

    // 检查是否已有运行中的交易策略（同用户、同交易对、同配置）
    // 只检查交易策略，非交易策略（如信号监听）不影响交易策略的启动
    const existingStrategy = await this.strategyRecordRepository.findOne({
      where: {
        userId: userId,
        symbol: symbol,
        exchangeConfigId: exchangeConfigId,
        status: 1,
        isTradingStrategy: 1, // 只查找交易策略
      },
    });

    if (existingStrategy) {
      throw new BadRequestException('该交易对已有运行中的策略');
    }

    // 数据库校验交易对是否存在且启用
    const tradingPairRes = await this.tradingPairsService.findAll({
      symbol,
      type: pairType,
      isActive: 1,
    });
    if (!tradingPairRes?.data || tradingPairRes.data.length === 0) {
      throw new BadRequestException(`交易对 ${symbol} 不存在或未启用`);
    }

    // 检查账户余额
    const balanceRes = await this.exchangeService.getBalance(exchangeConfigId);
    if (!balanceRes?.data) {
      throw new BadRequestException('获取账户余额失败');
    }

    const quoteBalance = balanceRes.data[quoteAsset];

    if (!quoteBalance || quoteBalance.free < totalPositionSize) {
      throw new BadRequestException(
        `账户可用余额不足，策略需要 ${totalPositionSize} ${quoteAsset}，当前可用 ${quoteBalance.free} ${quoteAsset}`,
      );
    }

    return { exchangeConfig };
  }

  /**
   * 按 exchange_config_id 查询环境分组 symbols，并记录主网/测试网的 exchange_config_id（各取第一个）
   * 以及每个 exchange_config_id 的环境类型
   * @param strategies 策略列表
   * @returns { testSymbols, prodSymbols, testExchangeConfigId, prodExchangeConfigId, exchangeConfigEnvMap }
   */
  async groupSymbolsByEnv(strategies: StrategyRecord[]): Promise<{
    testSymbols: Set<string>;
    prodSymbols: Set<string>;
    testExchangeConfigId?: number;
    prodExchangeConfigId?: number;
    exchangeConfigEnvMap: Map<number, 'test' | 'prod'>;
  }> {
    const testSymbols = new Set<string>();
    const prodSymbols = new Set<string>();
    let testExchangeConfigId: number | undefined = undefined;
    let prodExchangeConfigId: number | undefined = undefined;
    const configEnvMap = new Map<number, boolean>();
    const exchangeConfigEnvMap = new Map<number, 'test' | 'prod'>();
    for (const strategy of strategies) {
      let isTestNet: boolean;
      if (configEnvMap.has(strategy.exchangeConfigId)) {
        isTestNet = configEnvMap.get(strategy.exchangeConfigId)!;
      } else {
        const config = await this.exchangeConfigRepository.findOne({
          where: { id: strategy.exchangeConfigId, isActive: 1 },
        });
        isTestNet = config?.isTestNet === 1;
        configEnvMap.set(strategy.exchangeConfigId, isTestNet);
      }
      if (isTestNet) {
        testSymbols.add(strategy.symbol);
        exchangeConfigEnvMap.set(strategy.exchangeConfigId, 'test');
        if (!testExchangeConfigId) {
          testExchangeConfigId = strategy.exchangeConfigId;
        }
      } else {
        prodSymbols.add(strategy.symbol);
        exchangeConfigEnvMap.set(strategy.exchangeConfigId, 'prod');
        if (!prodExchangeConfigId) {
          prodExchangeConfigId = strategy.exchangeConfigId;
        }
      }
    }
    return {
      testSymbols,
      prodSymbols,
      testExchangeConfigId,
      prodExchangeConfigId,
      exchangeConfigEnvMap,
    };
  }

  /**
   * 生成待开单的订单信息 (做多策略)
   */
  async generateMartinOrderInfo(args: {
    exchangeConfigId: number;
    symbol: string;
    userId: number;
    strategyName: string;
    openOrders: Order[];
    orderAndTPArr: {
      entryPrice: number;
      takeProfitPrice: number;
    }[];
    singleOrderAmount: number;
    tradingSide: OrderSide;
    /** 当前的收盘价 */
    currentClosePrice: number;
    /** 偏移多少百分比 需要取消订单 */
    priceOffsetPercent: number;
    pairType?: 'spot' | 'contract';
  }): Promise<{
    /** 需要创建新订单的订单列表 */
    needCreateOrderList: PlaceOrderDto[];
    /** 需要编辑的订单列表 但是价格没有偏离 */
    needEditOrderList: (ActiveSpotMartinTrade & { existOrderId: string })[];
    /** 需要在数据中编辑 但是不需要在交易所编辑的订单列表 */
    needEditOrderListInDatabase: (ActiveSpotMartinTrade & {
      existOrderId: string;
    })[];
    /** 需要删除的订单列表 */
    needDeleteOrderList: ActiveSpotMartinTrade[];
    /** 数据库中 活跃的现货马丁交易表中的数据 */
    saveActiveTradesList: ActiveSpotMartinTrade[];
    /** 回到偏移价格范围内的订单 */
    backPriceRangeTradesList: PlaceOrderDto[];
  }> {
    const {
      exchangeConfigId,
      symbol,
      userId,
      strategyName,
      openOrders,
      orderAndTPArr,
      singleOrderAmount,
      tradingSide,
      currentClosePrice,
      priceOffsetPercent,
    } = args;
    // 获取市场最小开单数量
    const marketMinOrderInfoRes =
      await this.exchangeService.fetchMarketMinOrderInfo(
        exchangeConfigId,
        symbol,
      );
    if (!marketMinOrderInfoRes.data) {
      throw new InternalServerErrorException('获取市场最小开单数量失败');
    }
    const { minSz, stepLength, precisionPrice } =
      marketMinOrderInfoRes.data;

    const offsetPrice = calculateOffsetPrice({
      price: currentClosePrice,
      offsetPercent: priceOffsetPercent,
      direction: tradingSide,
    });

    // 根据数据库中存储的订单信息 和 当前的挂单信息对比 计算出之前的那些订单已经入场了 由此计算出需要止盈的订单
    const saveActiveTrades = await this.activeSpotMartinTradesService.findAll(
      {
        strategyName,
        symbol,
        page: 1,
        pageSize: 9999,
      },
      userId,
    );
    const saveActiveTradesList = saveActiveTrades.data.list;
    /** 入场价回到偏移价格范围内的偏移订单 需要重新挂单 */
    const backPriceRangeTradesList: PlaceOrderDto[] = saveActiveTradesList
      .filter((ele) => {
        const { entryPrice: entryPriceFromDB, isPriceDeviated } = ele;
        const entryPrice = Number(entryPriceFromDB);

        if (tradingSide === OrderSide.BUY) {
          return entryPrice < offsetPrice && isPriceDeviated;
        } else {
          return entryPrice > offsetPrice && isPriceDeviated;
        }
      })
      .map((ele) => {
        return {
          symbol,
          side: ele.side as OrderSide,
          type: OrderType.LIMIT,
          amount: ele.tradeAmount,
          oldOrderId: ele.orderId,
          price: roundUpPrice({
            price: ele.entryPrice,
            precision: precisionPrice,
          }),
        };
      });
    /**
     * tradingSideTrades: 交易方向
     * oppositeSideTrades: 交易方向相反的方向
     */
    const { tradingSideTrades, oppositeSideTrades } =
      saveActiveTradesList.reduce<{
        tradingSideTrades: ActiveSpotMartinTrade[];
        oppositeSideTrades: ActiveSpotMartinTrade[];
      }>(
        (acc, trade) => {
          // 检查订单是否在当前的未成交订单列表中
          const stillOpenOrder = openOrders.find(
            (order) => String(order.id) === String(trade.orderId),
          );

          if (!stillOpenOrder) {
            // 如果订单不在未成交订单列表中，说明已经买入或者卖出了
            if (trade.side === tradingSide) {
              acc.tradingSideTrades.push(trade);
            } else {
              acc.oppositeSideTrades.push(trade);
            }
          }

          return acc;
        },
        {
          tradingSideTrades: [],
          oppositeSideTrades: [],
        },
      );

    /** 需要在空白关键位上挂单的订单 */
    const needRegistrationOrderList = orderAndTPArr.map((item) => {
      const { entryPrice, takeProfitPrice } = item;

      const amount = calculateBuyAmount({
        price: entryPrice,
        quoteAmount: singleOrderAmount,
        step: stepLength,
        minAmount: minSz,
      });

      return {
        symbol,
        side: tradingSide,
        type: OrderType.LIMIT,
        amount,
        price: roundUpPrice({
          price: entryPrice,
          precision: precisionPrice,
        }),
        takeProfitPrice: roundUpPrice({
          price: takeProfitPrice,
          precision: precisionPrice,
        }),
      };
    });

    /**
     *  需要创建的订单 由 空白关键位 以及
     *  交易方向相反的方向（止盈方向）的止盈订单组成（需要拆分： 现有的止盈订单 和 需要新挂的止盈订单）
     */

    /** 交易方向相反的订单 */
    const openOrdersForOppositeSide = openOrders.filter(
      (ele) => ele.side !== tradingSide,
    );
    const {
      existSameTakeProfitPriceOrderList:
        notTruncateByStepExistSameTakeProfitPriceOrderList,
      notExistSameTakeProfitPriceOrderList:
        notTruncateByStepNotExistSameTakeProfitPriceOrderList,
    } = tradingSideTrades.reduce<{
      existSameTakeProfitPriceOrderList: (ActiveSpotMartinTrade & {
        existOrderId: string;
      })[];
      notExistSameTakeProfitPriceOrderList: ActiveSpotMartinTrade[];
    }>(
      (acc, trade) => {
        const { takeProfitPrice, tradeAmount } = trade;
        /** 拿着交易方向上的订单，找对于的止盈订单 */
        const existSameTakeProfitPriceOrder = openOrdersForOppositeSide.find(
          (ele) => Number(ele.price) === Number(takeProfitPrice),
        );

        if (existSameTakeProfitPriceOrder) {
          // 在 existSameTakeProfitPriceOrderList 中查找是否有相同 takeProfitPrice 的
          const existingIndex = acc.existSameTakeProfitPriceOrderList.findIndex(
            (item) => Number(item.takeProfitPrice) === Number(takeProfitPrice),
          );

          if (existingIndex !== -1) {
            // 如果存在相同价格的，tradeAmount 相加
            const newTradeAmount =
              Number(tradeAmount) +
              Number(
                acc.existSameTakeProfitPriceOrderList[existingIndex]
                  .tradeAmount,
              );

            acc.existSameTakeProfitPriceOrderList[existingIndex].tradeAmount =
              newTradeAmount;
          } else {
            // 如果不存在，添加新的订单
            acc.existSameTakeProfitPriceOrderList.push({
              ...trade,
              side: existSameTakeProfitPriceOrder.side as OrderSide,
              tradeAmount:
                Number(tradeAmount) +
                Number(existSameTakeProfitPriceOrder.amount),
              existOrderId: existSameTakeProfitPriceOrder.id,
            });
          }
        } else {
          // 不在 existSameTakeProfitPriceOrderList 中，在 notExistSameTakeProfitPriceOrderList 中查找
          const existingIndex =
            acc.notExistSameTakeProfitPriceOrderList.findIndex(
              (item) =>
                Number(item.takeProfitPrice) === Number(takeProfitPrice),
            );

          if (existingIndex !== -1) {
            // 如果存在相同价格的，tradeAmount 相加
            const newTradeAmount =
              Number(tradeAmount) +
              Number(
                acc.notExistSameTakeProfitPriceOrderList[existingIndex]
                  .tradeAmount,
              );
            acc.notExistSameTakeProfitPriceOrderList[
              existingIndex
            ].tradeAmount = newTradeAmount;
          } else {
            // 如果不存在，添加新的订单
            acc.notExistSameTakeProfitPriceOrderList.push({
              ...trade,
              tradeAmount: Number(trade.tradeAmount),
            });
          }
        }

        return acc;
      },
      {
        existSameTakeProfitPriceOrderList: [],
        notExistSameTakeProfitPriceOrderList: [],
      },
    );

    // 处理精度问题
    const existSameTakeProfitPriceOrderList =
      notTruncateByStepExistSameTakeProfitPriceOrderList.map((ele) => {
        return {
          ...ele,
          tradeAmount: truncateByStep(ele.tradeAmount, stepLength),
        };
      });

    const notExistSameTakeProfitPriceOrderList =
      notTruncateByStepNotExistSameTakeProfitPriceOrderList.map((ele) => {
        return {
          ...ele,
          tradeAmount: truncateByStep(ele.tradeAmount, stepLength),
        };
      });

    /** 需要创建的止盈订单 */
    const needCreateOppositeSideOrderList =
      notExistSameTakeProfitPriceOrderList.map((ele) => {
        const { takeProfitPrice, tradeAmount } = ele;

        const side =
          tradingSide === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;

        return {
          symbol,
          side,
          type: OrderType.LIMIT,
          amount: tradeAmount,
          price: roundUpPrice({
            price: takeProfitPrice,
            precision: precisionPrice,
          }),
        };
      });

    // 需要删除的订单中 分离出 价格没有偏离的订单 进行删除 否则会删除到 价格偏离的订单
    const oppositeSideAndPriceNoDeviatedOrderList = oppositeSideTrades.filter(
      (ele) => {
        return !ele.isPriceDeviated;
      },
    );

    // 将需要编辑的订单进行分离 分离出价格偏离和没有偏离的订单
    // 价格偏离的订单直接修改数据库 没有偏离的订单 才进行 交易所编辑操作
    const { priceDeviatedOrderList, priceNoDeviatedOrderList } =
      existSameTakeProfitPriceOrderList.reduce(
        (acc, ele) => {
          if (ele.isPriceDeviated) {
            acc.priceDeviatedOrderList.push(ele);
          } else {
            acc.priceNoDeviatedOrderList.push(ele);
          }

          return acc;
        },
        { priceDeviatedOrderList: [], priceNoDeviatedOrderList: [] },
      );

    return {
      needCreateOrderList: [
        ...needRegistrationOrderList,
        ...needCreateOppositeSideOrderList,
      ],
      needEditOrderList: priceNoDeviatedOrderList,
      needEditOrderListInDatabase: priceDeviatedOrderList,
      needDeleteOrderList: [
        ...tradingSideTrades,
        ...oppositeSideAndPriceNoDeviatedOrderList,
      ],
      saveActiveTradesList,
      backPriceRangeTradesList,
    };
  }

  /**
   * 每小时需要取消的订单，进行计算
   * 获得 需要删除的订单记录 和需要记录偏移量的订单记录
   */
  async generateCancelOrderList(args: {
    strategyName: string;
    symbol: string;
    userId: number;
    /** 当前收盘价 */
    currentClosePrice: number;
    /** 偏移多少百分比 需要取消订单 */
    priceOffsetPercent: number;
    /** 交易方向 */
    tradingSide: OrderSide;
  }): Promise<{
    needToRecordPriceDeviatedTrades: ActiveSpotMartinTrade[];
    updateDtoList: Partial<UpdateActiveSpotMartinTradeDto>[];
    cancelOrderList: { id: string }[];
  }> {
    const {
      strategyName,
      symbol,
      userId,
      currentClosePrice,
      priceOffsetPercent,
      tradingSide,
    } = args;

    // 根据数据库中存储的订单信息 和 当前的挂单信息对比 计算出之前的那些订单已经入场了 由此计算出需要止盈的订单
    const saveActiveTrades = await this.activeSpotMartinTradesService.findAll(
      {
        strategyName,
        symbol,
        // 过滤出 交易方向相反的订单 只有交易方向相反的订单 才需要记录价格偏离
        side: tradingSide === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY,
        page: 1,
        pageSize: 9999,
      },
      userId,
    );
    const saveActiveTradesList = saveActiveTrades.data.list;

    const offsetPrice = calculateOffsetPrice({
      price: currentClosePrice,
      offsetPercent: priceOffsetPercent,
      direction: tradingSide,
    });

    /**
     * 需要记录的入场价格偏离的订单 这里只会拿到价格偏离的出场单 入场单不会拿到，因为tradingSide是固定的
     */
    const needToRecordPriceDeviatedTrades = saveActiveTradesList.filter(
      (ele) => {
        const { entryPrice: entryPriceFromDB, isPriceDeviated } = ele;
        const entryPrice = Number(entryPriceFromDB);

        if (tradingSide === OrderSide.BUY) {
          return entryPrice > offsetPrice && !isPriceDeviated;
        } else {
          return entryPrice < offsetPrice && !isPriceDeviated;
        }
      },
    );

    // 一次map将 需要传入数据库更新的和需要取消的订单 进行处理
    const { updateDtoList, cancelOrderList } =
      needToRecordPriceDeviatedTrades.reduce<{
        updateDtoList: { orderId: string; isPriceDeviated: boolean }[];
        cancelOrderList: { id: string }[];
      }>(
        (acc, item) => {
          acc.updateDtoList.push({
            orderId: item.orderId,
            isPriceDeviated: true,
          });

          acc.cancelOrderList.push({
            id: item.orderId,
          });
          return acc;
        },
        { updateDtoList: [], cancelOrderList: [] },
      );

    return {
      needToRecordPriceDeviatedTrades,
      updateDtoList,
      cancelOrderList,
    };
  }
}
