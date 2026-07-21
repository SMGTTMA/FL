import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ccxt from 'ccxt';
import { GetHistoryDto } from './dto/history.dto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { ExchangeConfig } from './entities/exchange-config.entity';
import { CreateExchangeConfigDto } from './dto/create-exchange-config.dto';
import { AESUtil } from '../../utils/crypto/aes.util';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { ExchangeConfigSimple } from './interfaces/exchange-config.interface';
import { GetKlinesRes } from './interfaces/market.interface';
import { MarketMinOrderInfo } from './interfaces/market.interface';
import { PlaceOrderDto } from '@/modules/exchange/dto/place-order.dto';
import { Cron } from '@nestjs/schedule';
import { TradingPair } from '@/modules/trading-pairs/entities/trading-pair.entity';
import { StrategyRecord } from '@/modules/strategy-records/entities/strategy-record.entity';

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name);

  /**
   * 主网市场信息缓存
   */
  private static prodMarketsCache: {
    markets: ccxt.MarketInterface[];
    date: string;
  } | null = null;
  /**
   * 测试网市场信息缓存
   */
  private static testMarketsCache: {
    markets: ccxt.MarketInterface[];
    date: string;
  } | null = null;

  constructor(
    @InjectRepository(ExchangeConfig)
    private readonly exchangeConfigRepository: Repository<ExchangeConfig>,
    private readonly cryptoService: CryptoService,
    @InjectRepository(TradingPair)
    private readonly tradingPairRepository: Repository<TradingPair>,
    @InjectRepository(StrategyRecord)
    private readonly strategyRecordRepository: Repository<StrategyRecord>,
  ) {}

  /**
   * 获取并初始化当前用户的 ccxt 交易所实例
   * @param userId 用户ID
   * @returns ccxt.Exchange 实例
   * @throws Error 未找到有效配置或解密失败
   */
  private async getExchangeInstance(id: number): Promise<ccxt.Exchange> {
    try {
      const config = await this.exchangeConfigRepository.findOne({
        where: { id, isActive: Number(true) },
      });
      if (!config) throw new Error('未找到有效的交易所配置');
      const secretKey = process.env.AES_COMMON_SECRET_KEY;
      const apiKey = await AESUtil.decrypt(config.apiKey, secretKey);
      const secret = await AESUtil.decrypt(config.secretKey, secretKey);
      const password = await AESUtil.decrypt(config.passphrase, secretKey);
      const exchange = new ccxt.okx({
        apiKey,
        secret,
        password,
      });
      exchange.setSandboxMode(config.isTestNet === 1);
      return exchange;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 创建新的交易所配置
   * @param userId 用户ID
   * @param dto 创建配置所需参数（包含加密后的API Key、Secret Key、Passphrase等）
   * @returns 创建成功后返回配置的简要信息
   * @throws InternalServerErrorException 创建或加密失败时抛出
   */
  async createConfig(
    userId: number,
    dto: CreateExchangeConfigDto,
  ): Promise<ResponseDto<ExchangeConfigSimple>> {
    try {
      const decryptedApiKey = this.cryptoService.decrypt(dto.apiKey);
      const decryptedSecretKey = this.cryptoService.decrypt(dto.secretKey);
      const decryptedPassphrase = this.cryptoService.decrypt(dto.passphrase);

      const secretKey = process.env.AES_COMMON_SECRET_KEY;

      // 加密敏感信息
      const encryptedApiKey = await AESUtil.encrypt(decryptedApiKey, secretKey);
      const encryptedSecretKey = await AESUtil.encrypt(
        decryptedSecretKey,
        secretKey,
      );
      const encryptedPassphrase = await AESUtil.encrypt(
        decryptedPassphrase,
        secretKey,
      );

      const config = this.exchangeConfigRepository.create({
        userId,
        exchangeName: 'OKX',
        configName: dto.configName,
        apiKey: encryptedApiKey,
        secretKey: encryptedSecretKey,
        passphrase: encryptedPassphrase,
        isTestNet: Number(dto.isTestNet),
        isActive: Number(true),
      });

      await this.exchangeConfigRepository.save(config);

      return ResponseDto.success({
        id: config.id,
        configName: config.configName,
        exchangeName: config.exchangeName,
        isTestNet: config.isTestNet,
        isActive: config.isActive,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 获取当前用户所有激活状态的交易所配置
   * @param userId 用户ID
   * @returns 配置列表，仅包含 isActive=true 的配置
   * @throws InternalServerErrorException 查询失败时抛出
   */
  async getConfig(
    userId: number,
  ): Promise<ResponseDto<ExchangeConfigSimple[]>> {
    try {
      const configs = await this.exchangeConfigRepository.find({
        where: {
          userId,
          isActive: Number(true),
        },
      });
      const result = configs.map((config) => ({
        id: config.id,
        configName: config.configName,
        exchangeName: config.exchangeName,
        isTestNet: config.isTestNet,
        isActive: config.isActive,
      }));
      return ResponseDto.success(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 禁用指定ID的交易所配置（逻辑删除，isActive=false）
   * @param id 配置ID
   * @returns 操作结果，成功时 data 为 null
   * @throws InternalServerErrorException 更新失败时抛出
   */
  async disableConfig(id: number): Promise<ResponseDto<boolean>> {
    try {
      // 禁用前先判断是否有正在运行的策略
      const runningStrategy = await this.strategyRecordRepository.findOne({
        where: { exchangeConfigId: id, status: 1 },
      });
      if (runningStrategy) {
        throw new BadRequestException('该配置下存在正在运行的策略，无法禁用');
      }
      await this.exchangeConfigRepository.update(id, {
        isActive: Number(false),
      });
      return ResponseDto.success(true);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 获取市场信息
   * @param id 配置ID
   * @returns 交易对信息，如果不存在返回 null
   */
  async getMarketInfo(
    id: number,
    symbol: string,
  ): Promise<ResponseDto<ccxt.MarketInterface[]> | null> {
    try {
      const exchange = await this.getExchangeInstance(id);
      const markets = await exchange.fetchMarkets();
      return ResponseDto.success(markets);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 获取账户余额
   * @param userId 用户ID
   * @returns 账户余额信息
   */
  async getBalance(id: number): Promise<ResponseDto<ccxt.Balances>> {
    try {
      const exchange = await this.getExchangeInstance(id);
      const balances = await exchange.fetchBalance();
      return ResponseDto.success(balances);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 获取K线数据
   * @param userId 用户ID
   * @param dto 查询参数
   * @returns K线数据
   */
  async getKlines(dto: GetHistoryDto): Promise<ResponseDto<GetKlinesRes>> {
    try {
      const { id, symbol, timeframe, startTime, limit } = dto;
      const exchange = await this.getExchangeInstance(id);
      const since = startTime ? new Date(startTime).valueOf() : undefined;
      const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, since, limit);
      const klines = ohlcv.map(
        ([timestamp, open, high, low, close, volume]) => ({
          timestamp: new Date(timestamp).toISOString(),
          open,
          high,
          low,
          close,
          volume,
        }),
      );
      return ResponseDto.success({
        symbol,
        timeframe,
        klines,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 批量下单（仅支持 OKX，每批最多 20 单，超出部分自动分批）
   * @param orders 下单参数数组
   * @returns 下单结果数组
   */
  async createOrders(
    exchangeConfigId: number,
    orders: PlaceOrderDto[],
    baseParams?: Record<string, any>,
  ): Promise<ResponseDto<ccxt.Order[]>> {
    try {
      if (!orders.length) {
        throw new BadRequestException('订单参数不能为空');
      }
      // 过滤掉一些无用数据 避免爆错
      const newOrderList = orders.map((ele) => ({
        symbol: ele.symbol,
        side: ele.side,
        type: ele.type,
        amount: ele.amount,
        price: ele.price,
        params: baseParams || {},
      }));
      const exchange = await this.getExchangeInstance(exchangeConfigId);
      const MAX_BATCH = 20;
      let allResults: ccxt.Order[] = [];
      // 分批处理
      for (let i = 0; i < newOrderList.length; i += MAX_BATCH) {
        const batch = newOrderList.slice(i, i + MAX_BATCH);
        const result = await exchange.createOrders(batch);
        allResults = allResults.concat(result);
      }
      return ResponseDto.success(allResults);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 查询未成交订单（open orders）
   * @param exchangeConfigId 配置ID
   * @param symbol 交易对（可选）
   * @returns 未成交订单列表
   */
  async fetchOpenOrders(
    exchangeConfigId: number,
    symbol?: string,
  ): Promise<ResponseDto<ccxt.Order[]>> {
    try {
      const exchange = await this.getExchangeInstance(exchangeConfigId);
      const openOrders = await exchange.fetchOpenOrders(symbol);
      return ResponseDto.success(openOrders);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 批量取消订单（每批最多 20 单，超出部分自动分批）
   * @param exchangeConfigId 配置ID
   * @param orderIds 订单ID数组
   * @param symbol 交易对（可选，部分交易所需要）
   * @returns 取消结果数组
   */
  async batchCancelOrders(
    exchangeConfigId: number,
    orderIds: string[],
    symbol?: string,
  ): Promise<ResponseDto<any>> {
    try {
      if (!orderIds.length) {
        throw new BadRequestException('订单ID数组不能为空');
      }
      const exchange = await this.getExchangeInstance(exchangeConfigId);
      const MAX_BATCH = 20;
      let allResults = [];

      // 分批处理
      for (let i = 0; i < orderIds.length; i += MAX_BATCH) {
        const batch = orderIds.slice(i, i + MAX_BATCH);

        // 优先使用 ccxt 的批量取消接口
        if (typeof (exchange as any).cancelOrders === 'function') {
          const result = await (exchange as any).cancelOrders(batch, symbol);
          allResults = allResults.concat(result);
        } else {
          // fallback: 循环单个取消
          for (const orderId of batch) {
            const res = await exchange.cancelOrder(orderId, symbol);
            allResults.push({ orderId, success: true, result: res });
          }
        }
      }

      return ResponseDto.success(allResults);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 自动定时任务：每天自动更新主网和测试网市场缓存
   * 只缓存 trading-pairs 表中支持的 symbol/type 的市场数据
   */
  @Cron('0 0 * * * *')
  async autoUpdateMarkets() {
    try {
      // 查询所有支持的交易对（OKX，激活状态）
      const supportedPairs = await this.tradingPairRepository.find({
        where: { exchangeName: 'OKX', isActive: 1 },
      });
      const supportedSymbols = new Set(
        supportedPairs.map((pair) => pair.symbol),
      );
      // 主网
      const prodConfig = await this.exchangeConfigRepository.findOne({
        where: { isActive: 1, isTestNet: 0 },
      });
      if (prodConfig) {
        const exchange = await this.getExchangeInstance(prodConfig.id);
        const markets = await exchange.fetchMarkets();
        const today = new Date().toISOString().slice(0, 10);
        // 只缓存支持的 symbol
        const filteredMarkets = markets.filter((market) =>
          supportedSymbols.has(market.symbol),
        );
        ExchangeService.prodMarketsCache = {
          markets: filteredMarkets,
          date: today,
        };
        this.logger.log('主网市场信息缓存已自动更新');
      }
      // 测试网
      const testConfig = await this.exchangeConfigRepository.findOne({
        where: { isActive: 1, isTestNet: 1 },
      });
      if (testConfig) {
        const exchange = await this.getExchangeInstance(testConfig.id);
        const markets = await exchange.fetchMarkets();
        const today = new Date().toISOString().slice(0, 10);
        // 只缓存支持的 symbol
        const filteredMarkets = markets.filter((market) =>
          supportedSymbols.has(market.symbol),
        );
        ExchangeService.testMarketsCache = {
          markets: filteredMarkets,
          date: today,
        };
        this.logger.log('测试网市场信息缓存已自动更新');
      }
    } catch (error) {
      this.logger.error('自动更新市场信息失败', error);
    }
  }

  /**
   * fetchMarkets 无缓存时也只缓存支持的 symbol/type
   */
  async fetchMarkets(
    isTestNet: boolean,
  ): Promise<ResponseDto<ccxt.MarketInterface[]>> {
    let cache = isTestNet
      ? ExchangeService.testMarketsCache
      : ExchangeService.prodMarketsCache;
    if (cache && cache.markets) {
      return ResponseDto.success(cache.markets);
    } else {
      // 无缓存时主动拉取并筛选
      const config = await this.exchangeConfigRepository.findOne({
        where: { isActive: 1, isTestNet: isTestNet ? 1 : 0 },
      });
      if (!config) {
        throw new BadRequestException('未找到有效的交易所配置');
      }
      // 查询所有支持的交易对（OKX，激活状态）
      const supportedPairs = await this.tradingPairRepository.find({
        where: { exchangeName: 'OKX', isActive: 1 },
      });
      const supportedSymbols = new Set(
        supportedPairs.map((pair) => pair.symbol),
      );
      const exchange = await this.getExchangeInstance(config.id);
      const markets = await exchange.fetchMarkets();
      const today = new Date().toISOString().slice(0, 10);
      const filteredMarkets = markets.filter((market) =>
        supportedSymbols.has(market.symbol),
      );
      if (isTestNet) {
        ExchangeService.testMarketsCache = {
          markets: filteredMarkets,
          date: today,
        };
      } else {
        ExchangeService.prodMarketsCache = {
          markets: filteredMarkets,
          date: today,
        };
      }
      return ResponseDto.success(filteredMarkets);
    }
  }

  /**
   * 获取杠杆倍数
   * @param exchangeConfigId 配置ID
   * @param symbol 交易对
   * @returns 杠杆倍数信息
   */
  async fetchLeverage(
    exchangeConfigId: number,
    symbol: string,
  ): Promise<ResponseDto<ccxt.Leverage>> {
    try {
      const exchange = await this.getExchangeInstance(exchangeConfigId);
      const leverage = await exchange.fetchLeverage(symbol);
      return ResponseDto.success(leverage);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 设置杠杆倍数
   * @param exchangeConfigId 配置ID
   * @param symbol 交易对
   * @param leverage 杠杆倍数
   * @returns 设置结果
   */
  async setLeverage(
    exchangeConfigId: number,
    symbol: string,
    leverage: number,
    params: Record<string, any> = {},
  ): Promise<ResponseDto<any>> {
    try {
      const exchange = await this.getExchangeInstance(exchangeConfigId);
      const result = await exchange.setLeverage(leverage, symbol, params);
      return ResponseDto.success(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 获取保证金模式
   * @param exchangeConfigId 配置ID
   * @param symbol 交易对
   * @returns 保证金模式信息
   */
  async fetchMarginMode(
    exchangeConfigId: number,
    symbol: string,
  ): Promise<ResponseDto<any>> {
    try {
      const exchange = await this.getExchangeInstance(exchangeConfigId);
      const marginMode = await exchange.fetchMarginMode(symbol);
      return ResponseDto.success(marginMode);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 设置保证金模式
   * @param exchangeConfigId 配置ID
   * @param symbol 交易对
   * @param marginMode 保证金模式 ('cross' | 'isolated')
   * @returns 设置结果
   */
  async setMarginMode(
    exchangeConfigId: number,
    symbol: string,
    marginMode: 'cross' | 'isolated',
    leverage: number,
  ): Promise<ResponseDto<unknown>> {
    try {
      const exchange = await this.getExchangeInstance(exchangeConfigId);
      const result = await exchange.setMarginMode(marginMode, symbol, {
        leverage,
      });
      return ResponseDto.success(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 获取市场最小开单数量
   * @param exchangeConfigId 配置ID
   * @param symbol 交易对
   * @returns 市场最小开单数量信息
   */
  async fetchMarketMinOrderInfo(
    exchangeConfigId: number,
    symbol: string,
  ): Promise<ResponseDto<MarketMinOrderInfo>> {
    try {
      // 获取当前环境类型（主网/测试网）
      const exchangeConfig = await this.exchangeConfigRepository.findOne({
        where: { id: exchangeConfigId },
      });
      if (!exchangeConfig) {
        throw new BadRequestException('未找到有效的交易所配置');
      }
      const isTestNet = exchangeConfig.isTestNet === 1;

      // 获取市场信息
      const marketsRes = await this.fetchMarkets(isTestNet);
      if (!marketsRes.data || !Array.isArray(marketsRes.data)) {
        throw new InternalServerErrorException('获取市场信息失败');
      }

      const market = marketsRes.data.find((m) => m.symbol === symbol);
      if (!market) {
        throw new InternalServerErrorException(
          `未找到交易对 ${symbol} 的市场信息`,
        );
      }

      // 最小开单数量
      const minSz = market.info?.minSz ?? 0;
      // 步长
      const stepLength = String(market.info?.lotSz ?? 2);
      // 最小精度单位
      const precisionPrice = market.precision?.price ?? 0;
      // 最小精度数量
      const precisionAmount = market.precision?.amount ?? 0;
      const lever = market.info?.lever ?? 1;
      // 合约最小开单数量
      const minSzForContract = Number(minSz) / Number(lever);

      this.logger.log(
        `交易对 ${symbol} 的最小开单数量为: ${minSz} 步长为: ${stepLength} 最小精度单位为: ${precisionPrice} 最小精度数量为: ${precisionAmount}`,
      );

      return ResponseDto.success({
        minSz,
        stepLength,
        symbol,
        precisionPrice,
        precisionAmount,
        lever,
        minSzForContract,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /** 编辑订单 */
  async editOrder(args: {
    orderId: string;
    exchangeConfigId: number;
    symbol: string;
    amount: number;
    side: ccxt.OrderSide;
    type: ccxt.OrderType;
  }) {
    const { orderId, exchangeConfigId, symbol, amount, side, type } = args;
    try {
      const exchange = await this.getExchangeInstance(exchangeConfigId);
      const result = await exchange.editOrder(
        orderId,
        symbol,
        type,
        side,
        amount,
      );
      return ResponseDto.success(result);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /**
   * 获取未平仓合约持仓信息
   * @param exchangeConfigId 配置ID
   * @param symbol 交易对（可选，不传则获取所有持仓）
   * @returns 持仓信息
   */
  async fetchPosition(
    exchangeConfigId: number,
    symbol?: string,
  ): Promise<ResponseDto<ccxt.Position[]>> {
    try {
      const exchange = await this.getExchangeInstance(exchangeConfigId);
      let positions: ccxt.Position[];
      if (symbol) {
        // 获取单个交易对的持仓
        const position = await exchange.fetchPosition(symbol);
        positions = [position];
      } else {
        // 获取所有持仓
        positions = await exchange.fetchPositions();
      }
      return ResponseDto.success(positions);
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  /** 批量编辑订单 */
  async batchEditOrders(args: {
    exchangeConfigId: number;
    editOrderList: {
      orderId: string;
      symbol: string;
      amount: number;
      side: ccxt.OrderSide;
      type: ccxt.OrderType;
    }[];
  }): Promise<
    ResponseDto<{
      total: number;
      success: number;
      failed: number;
      successResults: {
        orderId: string;
        amount: number;
      }[];
      failedResults: {
        error: string;
        symbol: string;
        amount: number;
        side: string;
      }[];
      failedOrderIds: string[];
    }>
  > {
    const { exchangeConfigId, editOrderList } = args;

    const failedOrderIds: string[] = [];

    try {
      const exchange = await this.getExchangeInstance(exchangeConfigId);

      // 使用 Promise.allSettled 来处理部分失败的情况
      const results = await Promise.allSettled(
        editOrderList.map(async (ele) => {
          try {
            const result = await exchange.editOrder(
              ele.orderId,
              ele.symbol,
              ele.type,
              ele.side,
              ele.amount,
            );
            return {
              orderId: ele.orderId,
              amount: ele.amount,
            };
          } catch (error) {
            this.logger.error(`编辑订单失败: ${ele.orderId}`, error);
            failedOrderIds.push(ele.orderId);
            return {
              error: error.message,
              symbol: ele.symbol,
              amount: ele.amount,
              side: ele.side,
            };
          }
        }),
      );

      // 处理结果
      const successResults: {
        orderId: string;
        amount: number;
      }[] = [];
      const failedResults: {
        error: string;
        symbol: string;
        amount: number;
        side: string;
      }[] = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          // 检查返回的是成功结果还是失败结果
          if ('orderId' in result.value) {
            successResults.push(
              result.value as { orderId: string; amount: number },
            );
          } else {
            failedResults.push(
              result.value as {
                error: string;
                symbol: string;
                amount: number;
                side: string;
              },
            );
          }
        } else {
          failedResults.push({
            error: result.reason?.message || '未知错误',
            symbol: '',
            amount: 0,
            side: '',
          });
        }
      });

      return ResponseDto.success({
        total: editOrderList.length,
        success: successResults.length,
        failed: failedResults.length,
        successResults,
        failedResults,
        failedOrderIds,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}
