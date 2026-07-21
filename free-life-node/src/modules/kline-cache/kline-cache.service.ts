import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import { Kline } from '@/types/trading';
import { ExchangeService } from '@/modules/exchange/exchange.service';
import { ResponseDto } from '@/common/dto/response.dto';
import { StrategyEnvService } from '@/modules/strategy-utils/strategy-env.service';
import { sleep } from '@/utils/base/baseUtils';
import { StrategyRecord } from '../strategy-records/entities/strategy-record.entity';
import { ExceptionLogService } from '../exception-log/exception-log.service';
import { TradingPairsService } from '@/modules/trading-pairs/trading-pairs.service';

export type KlineEnv = 'prod' | 'test';

@Injectable()
export class KlineCacheService implements OnModuleInit {
  private readonly logger = new Logger(KlineCacheService.name);

  // 常量定义
  private readonly H1_LIMIT = 300;
  private readonly H4_LIMIT = 200;
  private readonly M5_LIMIT = 300;
  private readonly M15_LIMIT = 300;
  private readonly M30_LIMIT = 300;
  private readonly D1_LIMIT = 100;
  private readonly W1_LIMIT = 120;

  // 主网缓存结构：key = symbol_timeframe
  private prodKlineMap: Map<string, Kline[]> = new Map();
  // 测试网缓存结构：key = symbol_timeframe
  private testKlineMap: Map<string, Kline[]> = new Map();

  // 周线最高最低值缓存结构：key = symbol_env
  private weeklyHighLowCache: Map<
    string,
    { high: number; low: number; updatedAt: Date }
  > = new Map();

  constructor(
    private readonly exchangeService: ExchangeService,
    @InjectRepository(StrategyRecord)
    private readonly strategyRecordRepository: Repository<StrategyRecord>,
    private readonly strategyEnvService: StrategyEnvService,
    private readonly exceptionLogService: ExceptionLogService,
    private readonly tradingPairsService: TradingPairsService,
  ) {}

  private getCacheKey(symbol: string, timeframe: TimeFrame): string {
    return `${symbol}_${timeframe}`;
  }

  private getKlineMapByEnv(env: KlineEnv): Map<string, Kline[]> {
    return env === 'prod' ? this.prodKlineMap : this.testKlineMap;
  }

  private getWeeklyHighLowCacheKey(symbol: string, env: KlineEnv): string {
    return `${symbol}_${env}`;
  }

  /**
   * 统一K线拉取前延迟：避免拿到交易所边界未完全更新的数据
   */
  private async waitBeforeFetchKlines() {
    await sleep(1000);
  }

  /**
   * 计算K线数组中的最高值和最低值
   */
  private calculateHighLow(klines: Kline[]): { high: number; low: number } {
    if (!klines || klines.length === 0) {
      return { high: 0, low: 0 };
    }

    let high = klines[0].high; // 第一根K线的最高价
    let low = klines[0].low; // 第一根K线的最低价

    for (const kline of klines) {
      if (kline.high > high) {
        high = kline.high;
      }
      if (kline.low < low) {
        low = kline.low;
      }
    }

    return { high, low };
  }

  /**
   * 使用已有K线同步周线高低缓存，避免重复请求交易所
   */
  private syncWeeklyHighLowByKlines(
    symbol: string,
    env: KlineEnv,
    klines: Kline[],
  ) {
    if (!klines || klines.length === 0) return;
    const { high, low } = this.calculateHighLow(klines);
    const cacheKey = this.getWeeklyHighLowCacheKey(symbol, env);
    this.weeklyHighLowCache.set(cacheKey, {
      high,
      low,
      updatedAt: new Date(),
    });
  }

  /**
   * 每小时自动更新所有运行中策略相关H1小时线K线缓存
   */
  @Cron('0 0 * * * *')
  async updateAllActiveStrategyH1Klines() {
    this.logger.log(
      '[定时任务] 开始每小时自动更新所有运行中策略相关H1小时线...',
    );
    try {
      const activeStrategies = await this.strategyRecordRepository.find({
        where: { status: 1 },
      });
      if (!activeStrategies.length) {
        this.logger.log('无运行中策略，跳过H1 K线更新');
        return;
      }
      const {
        testSymbols,
        prodSymbols,
        testExchangeConfigId,
        prodExchangeConfigId,
      } = await this.strategyEnvService.groupSymbolsByEnv(activeStrategies);
      const updateTasks: Promise<void>[] = [];
      if (testExchangeConfigId) {
        updateTasks.push(
          ...Array.from(testSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.H1,
              this.H1_LIMIT,
              testExchangeConfigId,
              'test',
            ),
          ),
        );
      }
      if (prodExchangeConfigId) {
        updateTasks.push(
          ...Array.from(prodSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.H1,
              this.H1_LIMIT,
              prodExchangeConfigId,
              'prod',
            ),
          ),
        );
      }
      await Promise.all(updateTasks);
      this.logger.log('[定时任务] 所有运行中策略相关H1小时线已完成自动更新');
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/updateAllActiveStrategyH1Klines',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] 自动更新H1小时线失败', error);
    }
  }

  /**
   * 每4小时自动更新所有运行中策略相关H4 K线缓存
   * 在整点执行：00:00, 04:00, 08:00, 12:00, 16:00, 20:00
   */
  @Cron('0 0 0,4,8,12,16,20 * * *')
  async updateAllActiveStrategyH4Klines() {
    this.logger.log(
      '[定时任务] 开始每4小时自动更新所有运行中策略相关H4线...',
    );
    try {
      const activeStrategies = await this.strategyRecordRepository.find({
        where: { status: 1 },
      });
      if (!activeStrategies.length) {
        this.logger.log('无运行中策略，跳过H4 K线更新');
        return;
      }
      const {
        testSymbols,
        prodSymbols,
        testExchangeConfigId,
        prodExchangeConfigId,
      } = await this.strategyEnvService.groupSymbolsByEnv(activeStrategies);
      const updateTasks: Promise<void>[] = [];
      if (testExchangeConfigId) {
        updateTasks.push(
          ...Array.from(testSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.H4,
              this.H4_LIMIT,
              testExchangeConfigId,
              'test',
            ),
          ),
        );
      }
      if (prodExchangeConfigId) {
        updateTasks.push(
          ...Array.from(prodSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.H4,
              this.H4_LIMIT,
              prodExchangeConfigId,
              'prod',
            ),
          ),
        );
      }
      await Promise.all(updateTasks);
      this.logger.log('[定时任务] 所有运行中策略相关H4线已完成自动更新');
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/updateAllActiveStrategyH4Klines',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] 自动更新H4线失败', error);
    }
  }

  /**
   * 每天 8:00:10（UTC）自动更新所有运行中策略相关 D1 日线 K 线缓存（OKX 为 UTC 时间）
   */
  @Cron('10 0 8 * * *')
  async updateAllActiveStrategyD1Klines() {
    this.logger.log(
      '[定时任务] 开始每天自动更新所有运行中策略相关D1日线...',
    );
    try {
      const activeStrategies = await this.strategyRecordRepository.find({
        where: { status: 1 },
      });
      if (!activeStrategies.length) {
        this.logger.log('无运行中策略，跳过D1 K线更新');
        return;
      }
      const {
        testSymbols,
        prodSymbols,
        testExchangeConfigId,
        prodExchangeConfigId,
      } = await this.strategyEnvService.groupSymbolsByEnv(activeStrategies);
      const updateTasks: Promise<void>[] = [];
      if (testExchangeConfigId) {
        updateTasks.push(
          ...Array.from(testSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.D1,
              this.D1_LIMIT,
              testExchangeConfigId,
              'test',
            ),
          ),
        );
      }
      if (prodExchangeConfigId) {
        updateTasks.push(
          ...Array.from(prodSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.D1,
              this.D1_LIMIT,
              prodExchangeConfigId,
              'prod',
            ),
          ),
        );
      }
      await Promise.all(updateTasks);
      this.logger.log('[定时任务] 所有运行中策略相关D1日线已完成自动更新');
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/updateAllActiveStrategyD1Klines',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] 自动更新D1日线失败', error);
    }
  }

  /**
   * 每周统一更新周线缓存（W1 K线 + 最高最低值）
   * 每周日 8:00:10（UTC）执行（OKX 为 UTC 时间）
   */
  @Cron('10 0 8 * * 0')
  async updateWeeklyHighLowCache() {
    this.logger.log(
      '[定时任务] 开始每周统一更新W1周线缓存与周线最高最低值...',
    );
    try {
      // 获取所有运行中策略 + 激活交易对
      const activeStrategies = await this.strategyRecordRepository.find({
        where: { status: 1 },
      });
      const tradingPairsRes = await this.tradingPairsService.findAll({
        isActive: 1,
      });
      const pairSymbols = Array.isArray(tradingPairsRes?.data)
        ? tradingPairsRes.data.map((pair) => pair.symbol)
        : [];

      if (!activeStrategies.length && pairSymbols.length === 0) {
        this.logger.log('无运行中策略且无激活交易对，跳过周线更新');
        return;
      }

      // 运行中策略按环境分组（用于补充 symbol）
      const { testSymbols, prodSymbols } =
        await this.strategyEnvService.groupSymbolsByEnv(activeStrategies);

      // 统一目标symbol集合：激活交易对 + 运行中策略交易对
      const prodTargetSymbols = new Set<string>(pairSymbols);
      const testTargetSymbols = new Set<string>(pairSymbols);
      for (const symbol of prodSymbols) {
        prodTargetSymbols.add(symbol);
      }
      for (const symbol of testSymbols) {
        testTargetSymbols.add(symbol);
      }

      // 获取主网和测试网的交易所配置
      const prodConfig = await this.exchangeService[
        'exchangeConfigRepository'
      ].findOne({
        where: { isActive: 1, isTestNet: 0 },
      });
      const testConfig = await this.exchangeService[
        'exchangeConfigRepository'
      ].findOne({
        where: { isActive: 1, isTestNet: 1 },
      });

      const updateTasks: Promise<void>[] = [];
      // 主网：统一更新W1缓存（updateKlines会自动同步weeklyHighLow缓存）
      if (prodConfig) {
        for (const symbol of prodTargetSymbols) {
          updateTasks.push(
            this.updateKlines(
              symbol,
              TimeFrame.W1,
              this.W1_LIMIT,
              prodConfig.id,
              'prod',
            ),
          );
        }
      }

      // 测试网：统一更新W1缓存（updateKlines会自动同步weeklyHighLow缓存）
      if (testConfig) {
        for (const symbol of testTargetSymbols) {
          updateTasks.push(
            this.updateKlines(
              symbol,
              TimeFrame.W1,
              this.W1_LIMIT,
              testConfig.id,
              'test',
            ),
          );
        }
      }

      if (!updateTasks.length) {
        this.logger.log('未找到可用交易所配置，跳过周线更新');
        return;
      }

      await Promise.all(updateTasks);
      this.logger.log(
        '[定时任务] W1周线缓存与周线最高最低值已统一更新完成',
      );
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/updateWeeklyHighLowCache',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] 自动更新周线最高最低值失败', error);
    }
  }

  /**
   * 每5分钟自动更新所有运行中策略相关M5线K线缓存
   */
  @Cron('0 */5 * * * *')
  async updateAllActiveStrategyM5Klines() {
    this.logger.log('[定时任务] 开始每5分钟自动更新所有运行中策略相关M5线...');
    try {
      const activeStrategies = await this.strategyRecordRepository.find({
        where: { status: 1 },
      });
      if (!activeStrategies.length) {
        this.logger.log('无运行中策略，跳过M5 K线更新');
        return;
      }
      const {
        testSymbols,
        prodSymbols,
        testExchangeConfigId,
        prodExchangeConfigId,
      } = await this.strategyEnvService.groupSymbolsByEnv(activeStrategies);
      const updateTasks: Promise<void>[] = [];
      if (testExchangeConfigId) {
        updateTasks.push(
          ...Array.from(testSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.M5,
              this.M5_LIMIT,
              testExchangeConfigId,
              'test',
            ),
          ),
        );
      }
      if (prodExchangeConfigId) {
        updateTasks.push(
          ...Array.from(prodSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.M5,
              this.M5_LIMIT,
              prodExchangeConfigId,
              'prod',
            ),
          ),
        );
      }
      await Promise.all(updateTasks);
      this.logger.log('[定时任务] 所有运行中策略相关M5线已完成自动更新');
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/updateAllActiveStrategyM5Klines',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] 自动更新M5线失败', error);
    }
  }

  /**
   * 每15分钟自动更新所有运行中策略相关M15线K线缓存
   */
  @Cron('0 */15 * * * *')
  async updateAllActiveStrategyM15Klines() {
    this.logger.log(
      '[定时任务] 开始每15分钟自动更新所有运行中策略相关M15线...',
    );
    try {
      const activeStrategies = await this.strategyRecordRepository.find({
        where: { status: 1 },
      });
      if (!activeStrategies.length) {
        this.logger.log('无运行中策略，跳过M15 K线更新');
        return;
      }
      const {
        testSymbols,
        prodSymbols,
        testExchangeConfigId,
        prodExchangeConfigId,
      } = await this.strategyEnvService.groupSymbolsByEnv(activeStrategies);
      const updateTasks: Promise<void>[] = [];
      if (testExchangeConfigId) {
        updateTasks.push(
          ...Array.from(testSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.M15,
              this.M15_LIMIT,
              testExchangeConfigId,
              'test',
            ),
          ),
        );
      }
      if (prodExchangeConfigId) {
        updateTasks.push(
          ...Array.from(prodSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.M15,
              this.M15_LIMIT,
              prodExchangeConfigId,
              'prod',
            ),
          ),
        );
      }
      await Promise.all(updateTasks);
      this.logger.log('[定时任务] 所有运行中策略相关M15线已完成自动更新');
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/updateAllActiveStrategyM15Klines',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] 自动更新M15线失败', error);
    }
  }

  /**
   * 每30分钟自动更新所有运行中策略相关M30线K线缓存
   */
  @Cron('0 */30 * * * *')
  async updateAllActiveStrategyM30Klines() {
    this.logger.log(
      '[定时任务] 开始每30分钟自动更新所有运行中策略相关M30线...',
    );
    try {
      const activeStrategies = await this.strategyRecordRepository.find({
        where: { status: 1 },
      });
      if (!activeStrategies.length) {
        this.logger.log('无运行中策略，跳过M30 K线更新');
        return;
      }
      const {
        testSymbols,
        prodSymbols,
        testExchangeConfigId,
        prodExchangeConfigId,
      } = await this.strategyEnvService.groupSymbolsByEnv(activeStrategies);
      const updateTasks: Promise<void>[] = [];
      if (testExchangeConfigId) {
        updateTasks.push(
          ...Array.from(testSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.M30,
              this.M30_LIMIT,
              testExchangeConfigId,
              'test',
            ),
          ),
        );
      }
      if (prodExchangeConfigId) {
        updateTasks.push(
          ...Array.from(prodSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.M30,
              this.M30_LIMIT,
              prodExchangeConfigId,
              'prod',
            ),
          ),
        );
      }
      await Promise.all(updateTasks);
      this.logger.log('[定时任务] 所有运行中策略相关M30线已完成自动更新');
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/updateAllActiveStrategyM30Klines',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] 自动更新M30线失败', error);
    }
  }

  /**
   * 更新所有运行中策略相关 W1 周线 K 线缓存（辅助方法）
   */
  async updateAllActiveStrategyW1Klines() {
    this.logger.log(
      '[任务] 开始更新所有运行中策略相关W1周线...',
    );
    try {
      const activeStrategies = await this.strategyRecordRepository.find({
        where: { status: 1 },
      });
      if (!activeStrategies.length) {
        this.logger.log('无运行中策略，跳过W1 K线更新');
        return;
      }
      const {
        testSymbols,
        prodSymbols,
        testExchangeConfigId,
        prodExchangeConfigId,
      } = await this.strategyEnvService.groupSymbolsByEnv(activeStrategies);
      const updateTasks: Promise<void>[] = [];
      if (testExchangeConfigId) {
        updateTasks.push(
          ...Array.from(testSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.W1,
              this.W1_LIMIT,
              testExchangeConfigId,
              'test',
            ),
          ),
        );
      }
      if (prodExchangeConfigId) {
        updateTasks.push(
          ...Array.from(prodSymbols).map((symbol) =>
            this.updateKlines(
              symbol,
              TimeFrame.W1,
              this.W1_LIMIT,
              prodExchangeConfigId,
              'prod',
            ),
          ),
        );
      }
      await Promise.all(updateTasks);
      this.logger.log('[任务] 所有运行中策略相关W1周线已更新完成');
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/updateAllActiveStrategyW1Klines',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] 自动更新W1周线失败', error);
    }
  }

  /**
   * 更新指定交易对的周线最高最低值缓存
   */
  async updateWeeklyHighLow(
    symbol: string,
    exchangeConfigId: number,
    env: KlineEnv,
    limit: number,
  ): Promise<void> {
    const cacheKey = this.getWeeklyHighLowCacheKey(symbol, env);
    const map = this.getKlineMapByEnv(env);
    const w1Key = this.getCacheKey(symbol, TimeFrame.W1);
    try {
      // 优先复用现有W1缓存，避免重复拉取
      const cachedW1Klines = map.get(w1Key) || [];
      if (cachedW1Klines.length > 0) {
        this.syncWeeklyHighLowByKlines(symbol, env, cachedW1Klines);
        const data = this.weeklyHighLowCache.get(cacheKey)!;
        this.logger.log(
          `复用W1缓存更新周线最高最低值成功: ${symbol} ${env} - 最高: ${data.high}, 最低: ${data.low}`,
        );
        return;
      }

      await this.waitBeforeFetchKlines();
      // 获取周线数据
      const klineRes = await this.exchangeService.getKlines({
        id: exchangeConfigId,
        symbol,
        timeframe: TimeFrame.W1,
        limit,
      });

      const klines = klineRes?.data?.klines || [];
      if (klines.length === 0) {
        this.logger.error(`获取周线数据失败: ${symbol}`);
        return;
      }

      // 回源后顺便更新W1缓存，供后续复用
      map.set(w1Key, klines);
      this.syncWeeklyHighLowByKlines(symbol, env, klines);
      const data = this.weeklyHighLowCache.get(cacheKey)!;

      this.logger.log(
        `更新周线最高最低值成功: ${symbol} ${env} - 最高: ${data.high}, 最低: ${data.low}`,
      );
    } catch (err) {
      this.logger.error(`更新周线最高最低值失败: ${symbol} ${env}`, err);
    }
  }

  /**
   * 更新指定 symbol、周期、环境的K线缓存
   */
  async updateKlines(
    symbol: string,
    timeframe: TimeFrame,
    limit: number,
    exchangeConfigId: number,
    env: KlineEnv,
  ): Promise<void> {
    const map = this.getKlineMapByEnv(env);
    const key = this.getCacheKey(symbol, timeframe);

    try {
      await this.waitBeforeFetchKlines();

      const klineRes = await this.exchangeService.getKlines({
        id: exchangeConfigId,
        symbol,
        timeframe,
        limit,
      });

      const newKlines = klineRes?.data?.klines || [];
      if (newKlines.length === 0) {
        this.logger.error(`获取K线失败: ${symbol} ${timeframe}`);
        return;
      }

      map.set(key, newKlines);
      if (timeframe === TimeFrame.W1) {
        this.syncWeeklyHighLowByKlines(symbol, env, newKlines);
      }
      this.logger.log(
        `更新K线成功: ${symbol} ${timeframe}, 数据量: ${newKlines.length}`,
      );
    } catch (err) {
      // 更新失败时清空缓存
      map.delete(key);
      this.logger.error(`更新K线失败: ${symbol} ${timeframe}`, err);
    }
  }

  /**
   * 获取指定 symbol、周期、环境的K线缓存
   */
  getKlines(
    symbol: string,
    timeframe: TimeFrame,
    env: KlineEnv,
    args?: { klinesSliceNum?: number, needReverse?: boolean },
  ): Kline[] {
    const map = env === 'prod' ? this.prodKlineMap : this.testKlineMap;
    const key = this.getCacheKey(symbol, timeframe);
    const klines = map.get(key) || [];
    let result = klines;
    // 先反转 再切片，使用 toReversed 避免修改缓存源数据
    if (args?.needReverse) {
      result = result.toReversed();
    }
    if (args?.klinesSliceNum) {
      return result.slice(0, args.klinesSliceNum);
    }
    return result;
  }

  /**
   * 清空指定 symbol、周期、环境的K线缓存
   */
  clearKlines(symbol: string, timeframe: TimeFrame, env: KlineEnv): void {
    const map = env === 'prod' ? this.prodKlineMap : this.testKlineMap;
    const key = this.getCacheKey(symbol, timeframe);
    map.delete(key);
  }

  /**
   * 获取指定交易对的周线最高最低值
   */
  getWeeklyHighLow(
    symbol: string,
    env: KlineEnv,
  ): { high: number; low: number; updatedAt: Date } | null {
    const cacheKey = this.getWeeklyHighLowCacheKey(symbol, env);
    return this.weeklyHighLowCache.get(cacheKey) || null;
  }

  /**
   * 获取当前所有缓存的K线数据
   */
  getAllCache() {
    return ResponseDto.success({
      prod: Array.from(this.prodKlineMap.entries()).map(([key, klines]) => ({
        key,
        klines,
      })),
      test: Array.from(this.testKlineMap.entries()).map(([key, klines]) => ({
        key,
        klines,
      })),
      weeklyHighLow: Array.from(this.weeklyHighLowCache.entries()).map(
        ([key, data]) => ({
          key,
          ...data,
        }),
      ),
    });
  }

  /**
   * 获取缓存状态统计信息
   */
  getCacheStatus() {
    const prodCacheCount = this.prodKlineMap.size;
    const testCacheCount = this.testKlineMap.size;
    const weeklyCacheCount = this.weeklyHighLowCache.size;

    const prodCacheKeys = Array.from(this.prodKlineMap.keys());
    const testCacheKeys = Array.from(this.testKlineMap.keys());
    const weeklyCacheKeys = Array.from(this.weeklyHighLowCache.keys());

    return ResponseDto.success({
      prod: {
        count: prodCacheCount,
        keys: prodCacheKeys,
      },
      test: {
        count: testCacheCount,
        keys: testCacheKeys,
      },
      weeklyHighLow: {
        count: weeklyCacheCount,
        keys: weeklyCacheKeys,
      },
      total: {
        prod: prodCacheCount,
        test: testCacheCount,
        weekly: weeklyCacheCount,
      },
    });
  }

  /**
   * 每分钟第20秒检查缓存状态，如果发现缓存为空则重新执行缓存
   */
  @Cron('20 * * * * *')
  async checkAndUpdateCache() {
    this.logger.log('[定时任务] 开始检查缓存状态...');
    try {
      const activeStrategies = await this.strategyRecordRepository.find({
        where: { status: 1 },
      });

      if (!activeStrategies.length) {
        this.logger.log('无运行中策略，跳过缓存检查');
        return;
      }

      const {
        testSymbols,
        prodSymbols,
        testExchangeConfigId,
        prodExchangeConfigId,
      } = await this.strategyEnvService.groupSymbolsByEnv(activeStrategies);

      const updateTasks: Promise<void>[] = [];

      // 检查主网缓存
      if (prodExchangeConfigId) {
        for (const symbol of prodSymbols) {
          const h1Key = this.getCacheKey(symbol, TimeFrame.H1);
          const h4Key = this.getCacheKey(symbol, TimeFrame.H4);
          const m5Key = this.getCacheKey(symbol, TimeFrame.M5);
          const m15Key = this.getCacheKey(symbol, TimeFrame.M15);
          const m30Key = this.getCacheKey(symbol, TimeFrame.M30);
          const d1Key = this.getCacheKey(symbol, TimeFrame.D1);
          const w1Key = this.getCacheKey(symbol, TimeFrame.W1);

          // 检查H1缓存是否为空
          if (
            !this.prodKlineMap.has(h1Key) ||
            this.prodKlineMap.get(h1Key)?.length === 0
          ) {
            this.logger.log(`检测到主网H1缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.H1,
                this.H1_LIMIT,
                prodExchangeConfigId,
                'prod',
              ),
            );
          }

          // 检查H4缓存是否为空
          if (
            !this.prodKlineMap.has(h4Key) ||
            this.prodKlineMap.get(h4Key)?.length === 0
          ) {
            this.logger.log(`检测到主网H4缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.H4,
                this.H4_LIMIT,
                prodExchangeConfigId,
                'prod',
              ),
            );
          }

          // 检查M5缓存是否为空
          if (
            !this.prodKlineMap.has(m5Key) ||
            this.prodKlineMap.get(m5Key)?.length === 0
          ) {
            this.logger.log(`检测到主网M5缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.M5,
                this.M5_LIMIT,
                prodExchangeConfigId,
                'prod',
              ),
            );
          }

          // 检查M15缓存是否为空
          if (
            !this.prodKlineMap.has(m15Key) ||
            this.prodKlineMap.get(m15Key)?.length === 0
          ) {
            this.logger.log(`检测到主网M15缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.M15,
                this.M15_LIMIT,
                prodExchangeConfigId,
                'prod',
              ),
            );
          }

          // 检查M30缓存是否为空
          if (
            !this.prodKlineMap.has(m30Key) ||
            this.prodKlineMap.get(m30Key)?.length === 0
          ) {
            this.logger.log(`检测到主网M30缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.M30,
                this.M30_LIMIT,
                prodExchangeConfigId,
                'prod',
              ),
            );
          }

          // 检查D1缓存是否为空
          if (
            !this.prodKlineMap.has(d1Key) ||
            this.prodKlineMap.get(d1Key)?.length === 0
          ) {
            this.logger.log(`检测到主网D1缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.D1,
                this.D1_LIMIT,
                prodExchangeConfigId,
                'prod',
              ),
            );
          }

          // 检查W1缓存是否为空
          if (
            !this.prodKlineMap.has(w1Key) ||
            this.prodKlineMap.get(w1Key)?.length === 0
          ) {
            this.logger.log(`检测到主网W1缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.W1,
                this.W1_LIMIT,
                prodExchangeConfigId,
                'prod',
              ),
            );
          }
        }
      }

      // 检查测试网缓存
      if (testExchangeConfigId) {
        for (const symbol of testSymbols) {
          const h1Key = this.getCacheKey(symbol, TimeFrame.H1);
          const h4Key = this.getCacheKey(symbol, TimeFrame.H4);
          const m5Key = this.getCacheKey(symbol, TimeFrame.M5);
          const m15Key = this.getCacheKey(symbol, TimeFrame.M15);
          const m30Key = this.getCacheKey(symbol, TimeFrame.M30);
          const d1Key = this.getCacheKey(symbol, TimeFrame.D1);
          const w1Key = this.getCacheKey(symbol, TimeFrame.W1);

          // 检查H1缓存是否为空
          if (
            !this.testKlineMap.has(h1Key) ||
            this.testKlineMap.get(h1Key)?.length === 0
          ) {
            this.logger.log(`检测到测试网H1缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.H1,
                this.H1_LIMIT,
                testExchangeConfigId,
                'test',
              ),
            );
          }

          // 检查H4缓存是否为空
          if (
            !this.testKlineMap.has(h4Key) ||
            this.testKlineMap.get(h4Key)?.length === 0
          ) {
            this.logger.log(`检测到测试网H4缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.H4,
                this.H4_LIMIT,
                testExchangeConfigId,
                'test',
              ),
            );
          }

          // 检查M5缓存是否为空
          if (
            !this.testKlineMap.has(m5Key) ||
            this.testKlineMap.get(m5Key)?.length === 0
          ) {
            this.logger.log(`检测到测试网M5缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.M5,
                this.M5_LIMIT,
                testExchangeConfigId,
                'test',
              ),
            );
          }

          // 检查M15缓存是否为空
          if (
            !this.testKlineMap.has(m15Key) ||
            this.testKlineMap.get(m15Key)?.length === 0
          ) {
            this.logger.log(`检测到测试网M15缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.M15,
                this.M15_LIMIT,
                testExchangeConfigId,
                'test',
              ),
            );
          }

          // 检查M30缓存是否为空
          if (
            !this.testKlineMap.has(m30Key) ||
            this.testKlineMap.get(m30Key)?.length === 0
          ) {
            this.logger.log(`检测到测试网M30缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.M30,
                this.M30_LIMIT,
                testExchangeConfigId,
                'test',
              ),
            );
          }

          // 检查D1缓存是否为空
          if (
            !this.testKlineMap.has(d1Key) ||
            this.testKlineMap.get(d1Key)?.length === 0
          ) {
            this.logger.log(`检测到测试网D1缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.D1,
                this.D1_LIMIT,
                testExchangeConfigId,
                'test',
              ),
            );
          }

          // 检查W1缓存是否为空
          if (
            !this.testKlineMap.has(w1Key) ||
            this.testKlineMap.get(w1Key)?.length === 0
          ) {
            this.logger.log(`检测到测试网W1缓存为空: ${symbol}，开始更新...`);
            updateTasks.push(
              this.updateKlines(
                symbol,
                TimeFrame.W1,
                this.W1_LIMIT,
                testExchangeConfigId,
                'test',
              ),
            );
          }
        }
      }

      // 检查周线最高最低值缓存
      const tradingPairsRes = await this.tradingPairsService.findAll({
        isActive: 1,
      });

      if (tradingPairsRes?.data && tradingPairsRes.data.length > 0) {
        const prodConfig = await this.exchangeService[
          'exchangeConfigRepository'
        ].findOne({
          where: { isActive: 1, isTestNet: 0 },
        });
        const testConfig = await this.exchangeService[
          'exchangeConfigRepository'
        ].findOne({
          where: { isActive: 1, isTestNet: 1 },
        });

        // 检查主网周线缓存
        if (prodConfig) {
          for (const pair of tradingPairsRes.data) {
            const weeklyKey = this.getWeeklyHighLowCacheKey(
              pair.symbol,
              'prod',
            );
            if (!this.weeklyHighLowCache.has(weeklyKey)) {
              this.logger.log(
                `检测到主网周线缓存为空: ${pair.symbol}，开始更新...`,
              );
              updateTasks.push(
                this.updateWeeklyHighLow(
                  pair.symbol,
                  prodConfig.id,
                  'prod',
                  this.W1_LIMIT,
                ),
              );
            }
          }
        }

        // 检查测试网周线缓存
        if (testConfig) {
          for (const pair of tradingPairsRes.data) {
            const weeklyKey = this.getWeeklyHighLowCacheKey(
              pair.symbol,
              'test',
            );
            if (!this.weeklyHighLowCache.has(weeklyKey)) {
              this.logger.log(
                `检测到测试网周线缓存为空: ${pair.symbol}，开始更新...`,
              );
              updateTasks.push(
                this.updateWeeklyHighLow(
                  pair.symbol,
                  testConfig.id,
                  'test',
                  this.W1_LIMIT,
                ),
              );
            }
          }
        }
      }

      if (updateTasks.length > 0) {
        this.logger.log(
          `发现 ${updateTasks.length} 个缓存需要更新，开始执行...`,
        );
        await Promise.all(updateTasks);
        this.logger.log('[定时任务] 缓存检查和更新完成');
      } else {
        this.logger.log('[定时任务] 所有缓存状态正常，无需更新');
      }
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/checkAndUpdateCache',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] 缓存检查失败', error);
    }
  }

  async onModuleInit() {
    this.logger.log('[启动] 初始化拉取所有运行中策略的K线缓存...');
    await this.updateAllActiveStrategyH1Klines();
    await this.updateAllActiveStrategyH4Klines();
    await this.updateAllActiveStrategyM5Klines();
    await this.updateAllActiveStrategyM15Klines();
    await this.updateAllActiveStrategyM30Klines();
    await this.updateAllActiveStrategyD1Klines();
    await this.updateWeeklyHighLowCache();
    this.logger.log('[启动] K线缓存初始化完成');
  }
}
