import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import {
  KlineCacheService,
  KlineEnv,
} from '@/modules/kline-cache/kline-cache.service';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import { OrderSide } from '@/modules/exchange/dto/place-order.dto';
import { ExceptionLogService } from '@/modules/exception-log/exception-log.service';
import { StrategyRecord } from '@/modules/strategy-records/entities/strategy-record.entity';
import { StrategyEnvService } from '@/modules/strategy-utils/strategy-env.service';
import { DeepseekService } from '@/modules/deepseek/deepseek.service';
import { WxWebhookMessage } from './types/indicator-signal.types';
import { StartSignalWatchDto } from './dto/start-signal-watch.dto';
import { StopSignalWatchDto } from './dto/stop-signal-watch.dto';
import { ResponseDto } from '@/common/dto/response.dto';
import { Kline, KeyPoint } from '@/types/trading';
import {
  AIDecision,
  TechnicalIndicators,
} from '@/types/ai-decision';
import {
  calculateAllIndicators,
  formatIndicators,
} from '@/utils/indicators/indicators';
import { getKlinePatternSummary } from '@/utils/trading/klinePattern';
import { calculateKeyPointsV2 } from '@/utils/trading/trading';

/** 日线 AI 分析用的简易配置 */
interface DailyAnalysisConfig {
  aiModel: string;
  temperature: number;
  klineNum: number;
  sendToAIKlineNum: number;
  useRSI: boolean;
  useMACD: boolean;
  useEMA: boolean;
  useVolume: boolean;
}

@Injectable()
export class IndicatorSignalService implements OnModuleInit {
  private readonly logger = new Logger(IndicatorSignalService.name);
  private readonly wxWebhookUrl: string;
  private readonly STRATEGY_NAME = 'indicator_signal';

  constructor(
    private readonly configService: ConfigService,
    private readonly klineCacheService: KlineCacheService,
    private readonly exceptionLogService: ExceptionLogService,
    private readonly strategyEnvService: StrategyEnvService,
    private readonly deepseekService: DeepseekService,
    @InjectRepository(StrategyRecord)
    private readonly strategyRecordRepository: Repository<StrategyRecord>,
  ) {
    this.wxWebhookUrl = this.configService.get<string>('WX_WEBHOOK') || '';
    if (!this.wxWebhookUrl) {
      this.logger.warn('WX_WEBHOOK 环境变量未配置，信号推送将不可用');
    }
  }

  async onModuleInit() {
    this.logger.log('[启动] 技术指标信号监听模块已初始化（日线 AI 分析 + 企业微信推送）');
  }

  /**
   * 获取日线 AI 分析配置
   * 使用 INDICATOR_SIGNAL_* 环境变量维护独立配置。
   */
  private getDailyAnalysisConfig(): DailyAnalysisConfig {
    return {
      aiModel: this.configService.get<string>(
        'INDICATOR_SIGNAL_AI_MODEL',
        'deepseek-reasoner',
      ),
      temperature: parseFloat(
        this.configService.get<string>('INDICATOR_SIGNAL_TEMPERATURE', '0.5'),
      ),
      klineNum: parseInt(
        this.configService.get<string>('INDICATOR_SIGNAL_KLINE_NUM', '60'),
        10,
      ),
      sendToAIKlineNum: parseInt(
        this.configService.get<string>(
          'INDICATOR_SIGNAL_SEND_TO_AI_KLINE_NUM',
          '10',
        ),
        10,
      ),
      useRSI: this.configService.get<string>('INDICATOR_SIGNAL_USE_RSI', 'true') === 'true',
      useMACD: this.configService.get<string>('INDICATOR_SIGNAL_USE_MACD', 'true') === 'true',
      useEMA: this.configService.get<string>('INDICATOR_SIGNAL_USE_EMA', 'true') === 'true',
      useVolume:
        this.configService.get<string>('INDICATOR_SIGNAL_USE_VOLUME', 'true') === 'true',
    };
  }

  /**
   * 启动信号监听
   */
  async start(dto: StartSignalWatchDto, userId: number) {
    const { symbol, exchangeConfigId } = dto;

    const existingWatch = await this.strategyRecordRepository.findOne({
      where: {
        strategyName: this.STRATEGY_NAME,
        symbol,
        exchangeConfigId,
        userId,
        status: 1,
      },
    });

    if (existingWatch) {
      throw new BadRequestException(
        `交易对 ${symbol} 已存在运行中的信号监听`,
      );
    }

    const watchRecord = new StrategyRecord();
    watchRecord.strategyName = this.STRATEGY_NAME;
    watchRecord.symbol = symbol;
    watchRecord.exchangeConfigId = exchangeConfigId;
    watchRecord.userId = userId;
    watchRecord.status = 1;
    watchRecord.side = OrderSide.BUY;
    watchRecord.totalPositionSize = 0;
    watchRecord.isTradingStrategy = 0;

    await this.strategyRecordRepository.save(watchRecord);

    this.logger.log(
      `启动信号监听 - 用户: ${userId}, 交易对: ${symbol}, 配置ID: ${exchangeConfigId}`,
    );

    return ResponseDto.success(`信号监听启动成功 - ${symbol}`);
  }

  /**
   * 停止信号监听
   */
  async stop(dto: StopSignalWatchDto, userId: number) {
    const watchRecord = await this.strategyRecordRepository.findOne({
      where: {
        id: dto.watchId,
        strategyName: this.STRATEGY_NAME,
        userId,
        status: 1,
      },
    });

    if (!watchRecord) {
      throw new BadRequestException('未找到运行中的信号监听');
    }

    watchRecord.status = 0;
    watchRecord.stopReason = '用户手动停止';
    await this.strategyRecordRepository.save(watchRecord);

    this.logger.log(
      `停止信号监听 - 用户: ${userId}, 交易对: ${watchRecord.symbol}`,
    );

    return ResponseDto.success(`信号监听已停止 - ${watchRecord.symbol}`);
  }

  /**
   * 获取用户的所有信号监听
   */
  async getWatchList(userId: number) {
    const watchList = await this.strategyRecordRepository.find({
      where: {
        strategyName: this.STRATEGY_NAME,
        userId,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return ResponseDto.success(
      watchList.map((w) => ({
        watchId: w.id,
        symbol: w.symbol,
        exchangeConfigId: w.exchangeConfigId,
        status: w.status,
        stopReason: w.stopReason,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        lastExecutionTime: w.lastExecutionTime,
      })),
    );
  }

  /**
   * 每天 8:00:20（UTC）执行日线 AI 分析并推送到企业微信（在 D1 K 线缓存 8:00:10 更新之后，OKX 为 UTC）
   * 每个被监听的交易对分析一次、推送一条，不记录对话到数据库
   */
  @Cron('20 0 8 * * *')
  async checkDailyIndicatorSignals() {
    this.logger.log('[定时任务] 开始日线 AI 分析并推送...');
    try {
      const activeWatches = await this.strategyRecordRepository.find({
        where: {
          strategyName: this.STRATEGY_NAME,
          status: 1,
        },
      });

      if (!activeWatches.length) {
        this.logger.log('无运行中的信号监听，跳过日线分析');
        return;
      }

      this.logger.log(`找到 ${activeWatches.length} 个运行中的信号监听`);

      const { exchangeConfigEnvMap } =
        await this.strategyEnvService.groupSymbolsByEnv(activeWatches);

      // 按 symbol 去重，同一交易对只分析一次
      const symbolSet = new Set<string>();
      for (const watch of activeWatches) {
        const envType = exchangeConfigEnvMap.get(
          watch.exchangeConfigId,
        ) as KlineEnv;
        if (!envType) {
          this.logger.warn(
            `${watch.symbol} 未找到对应的环境类型，跳过`,
          );
          continue;
        }
        const key = `${watch.symbol}_${envType}`;
        if (symbolSet.has(key)) continue;
        symbolSet.add(key);

        try {
          const analysisResult = await this.analyzeSymbolDaily(
            watch.symbol,
            envType,
          );
          if (analysisResult) {
            await this.sendDailyAnalysisToWx(watch.symbol, analysisResult);
          }
        } catch (error) {
          this.logger.error(
            `日线分析失败 ${watch.symbol}: ${error?.message}`,
            error,
          );
          await this.exceptionLogService.create({
            url: 'cronjob/checkDailyIndicatorSignals/symbol',
            method: 'CRON',
            statusCode: 500,
            message: error?.message || String(error),
            stack: error?.stack || '',
            userId: null,
          });
        }
      }

      this.logger.log('[定时任务] 日线 AI 分析推送完成');
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/checkDailyIndicatorSignals',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] 日线 AI 分析推送失败', error);
    }
  }

  /**
   * 对单个交易对执行日线 AI 分析（不落库）
   */
  private async analyzeSymbolDaily(
    symbol: string,
    envType: KlineEnv,
  ): Promise<{ decision: AIDecision; aiResponse: string } | null> {
    const config = this.getDailyAnalysisConfig();

    const rawKlines = this.klineCacheService.getKlines(
      symbol,
      TimeFrame.D1,
      envType,
      { klinesSliceNum: config.klineNum + 1, needReverse: true },
    );

    if (!rawKlines || rawKlines.length < 2) {
      this.logger.warn(`${symbol} D1 K线数据不足，跳过分析`);
      return null;
    }

    // 去除第一根未收盘的K线
    const klines = rawKlines.slice(1);
    const indicators = calculateAllIndicators(klines, {
      useRSI: config.useRSI,
      useMACD: config.useMACD,
      useEMA: config.useEMA,
      useVolume: config.useVolume,
    });

    // 基于日 K 线计算关键位（支撑/阻力），供 AI 参考；日线波动大，容差用 0.5% 避免点位过碎
    const keyPoints = calculateKeyPointsV2(klines, {
      testCount: 3,
      priceTolerance: 0.005,
    });

    const currentPrice = klines[0].close;
    const recentKlines = klines.slice(0, config.sendToAIKlineNum);
    const prompt = this.buildDailyAnalysisPrompt({
      symbol,
      currentPrice,
      indicators,
      recentKlines,
      keyPoints,
    });

    const { decision, response } = await this.callDeepSeekForAnalysis(
      prompt,
      config,
    );

    return { decision, aiResponse: response };
  }

  /**
   * 构建日线分析 Prompt（含 K 线形态摘要、关键位、原始 K 线、技术指标，并要求 AI 给出入场位）
   */
  private buildDailyAnalysisPrompt(params: {
    symbol: string;
    currentPrice: number;
    indicators: TechnicalIndicators;
    recentKlines: Kline[];
    keyPoints: KeyPoint[];
  }): string {
    const { symbol, currentPrice, indicators, recentKlines, keyPoints } = params;

    const patternSummary = getKlinePatternSummary(recentKlines);

    // 关键位：按价格排序，区分当前价下方的支撑与上方的阻力
    const keyPointsStr = this.formatKeyPointsForPrompt(keyPoints, currentPrice);

    const klinesStr = recentKlines
      .map((k, index) => {
        const date = new Date(k.timestamp)
          .toISOString()
          .slice(0, 16)
          .replace('T', ' ');
        return `${index + 1}. [${date}] 开:${k.open}, 高:${k.high}, 低:${k.low}, 收:${k.close}, 量:${k.volume.toFixed(2)}`;
      })
      .join('\n');

    const indicatorsStr = formatIndicators(indicators);

    const systemPrompt = `你是一位加密货币日线级别分析师。请结合下面三部分信息做复盘与展望：
1. 【K线形态】：系统根据最近1～3根K线自动识别的形态结论，供你参考
2. 【技术指标】：EMA/RSI/MACD/成交量等
3. 【关键位】：当前价格附近的支撑/阻力位（价格、强度），供入场与风控参考
4. 【原始日K线】：开、高、低、收、量

分析要点：
- 趋势：EMA20/50 多空排列、K 线形态与组合
- 动量：RSI、MACD
- 成交量：放量/缩量
- 关键位：当前价附近的支撑/阻力
- 结合形态与价位给出是否具备买卖参考价值，以及建议入场位置

当结论为看多(action 为 "buy")时，你必须给出建议入场价 buyPrice 和止盈幅度 takeProfitPercent，便于执行参考。
你必须返回 JSON（不要有多余文字），格式如下：
{
  "action": "buy" | "sell" | "hold",
  "confidence": 0-100,
  "reason": "分析结论（需包含形态与入场逻辑）",
  "buyPrice": 建议入场价数字（仅 action 为 buy 时必填，可为当前价附近合理区间中值），
  "takeProfitPercent": 建议止盈涨幅百分比（仅 action 为 buy 时必填，如 5 表示 5%）
}`;

    const userPrompt = `【交易对】${symbol}
【当前价格】${currentPrice} USDT

【技术指标】
- ${indicatorsStr}

${keyPointsStr ? keyPointsStr + '\n\n' : ''}${patternSummary ? patternSummary + '\n\n' : ''}【最近${recentKlines.length}根已收盘的日K线】（从新到旧）
${klinesStr}

请结合 K 线形态、关键位与技术指标给出日线级别分析与 JSON 决策。`;

    return `${systemPrompt}\n\n${userPrompt}`;
  }

  /**
   * 将关键位格式化为 Prompt 文本：只取当前价附近各若干档支撑/阻力，避免信息过多
   */
  private formatKeyPointsForPrompt(
    keyPoints: KeyPoint[],
    currentPrice: number,
  ): string {
    if (!keyPoints || keyPoints.length === 0) return '';

    /** 当前价附近只展示的支撑/阻力档数 */
    const nearbyLimit = 3;

    const support = keyPoints
      .filter((kp) => kp.price < currentPrice)
      .sort((a, b) => b.price - a.price)
      .slice(0, nearbyLimit);
    const resistance = keyPoints
      .filter((kp) => kp.price > currentPrice)
      .sort((a, b) => a.price - b.price)
      .slice(0, nearbyLimit);

    const fmt = (list: typeof support, label: string) =>
      list.length
        ? `【${label}】\n${list.map((kp) => `  ${kp.price.toFixed(4)} USDT `).join('\n')}`
        : '';

    const supportStr = fmt(support, '支撑位（当前价下方）');
    const resistanceStr = fmt(resistance, '阻力位（当前价上方）');
    if (!supportStr && !resistanceStr) return '';
    return [supportStr, resistanceStr].filter(Boolean).join('\n\n');
  }

  /**
   * 调用 DeepSeek 做日线分析，不落库
   */
  private async callDeepSeekForAnalysis(
    prompt: string,
    config: DailyAnalysisConfig,
  ): Promise<{ decision: AIDecision; response: string }> {
    try {
      const response = await this.deepseekService.createChatCompletion({
        userPrompt: prompt,
        model: config.aiModel,
        temperature: config.temperature,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          decision: {
            action: 'hold',
            confidence: 0,
            reason: 'AI 返回内容无法解析为 JSON',
          },
          response,
        };
      }

      const decision = JSON.parse(jsonMatch[0]) as AIDecision;
      if (!decision.action) decision.action = 'hold';
      if (typeof decision.confidence !== 'number') decision.confidence = 0;
      if (!decision.reason) decision.reason = '';
      if (decision.action !== 'buy') {
        decision.buyPrice = undefined;
        decision.takeProfitPercent = undefined;
      }

      return { decision, response };
    } catch (error) {
      this.logger.error('调用 DeepSeek 日线分析失败', error);
      return {
        decision: {
          action: 'hold',
          confidence: 0,
          reason: `API 调用失败: ${error?.message || String(error)}`,
        },
        response: String(error?.message || error),
      };
    }
  }

  /**
   * 将日线分析结果推送到企业微信
   */
  private async sendDailyAnalysisToWx(
    symbol: string,
    result: { decision: AIDecision; aiResponse: string },
  ): Promise<void> {
    if (!this.wxWebhookUrl) {
      this.logger.warn('WX_WEBHOOK 未配置，跳过推送');
      return;
    }

    const actionText =
      result.decision.action === 'buy'
        ? '看多'
        : result.decision.action === 'sell'
          ? '看空'
          : '观望';
    const now = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });

    let content = `【每日日线分析】
交易对: ${symbol}
周期: D1
结论: ${actionText}
信心指数: ${result.decision.confidence}
理由: ${result.decision.reason}`;
    if (result.decision.action === 'buy') {
      if (result.decision.buyPrice != null) {
        content += `\n建议入场价: ${result.decision.buyPrice} USDT`;
      }
      if (result.decision.takeProfitPercent != null) {
        content += `\n建议止盈: +${result.decision.takeProfitPercent}%`;
      }
    }
    content += `\n推送时间: ${now}`;

    const message: WxWebhookMessage = {
      msgtype: 'text',
      text: { content },
    };

    try {
      await this.sendWxWebhook(message);
      this.logger.log(`日线分析已推送: ${symbol}`);
    } catch (error) {
      this.logger.error(`日线分析推送失败: ${symbol}`, error);
      await this.exceptionLogService.create({
        url: 'indicator-signal/sendDailyAnalysisToWx',
        method: 'WEBHOOK',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
    }
  }

  /**
   * 测试发送消息到企业微信：拉取当前日线 K 线 → AI 分析 → 推送结果
   */
  async testSendMessage(dto: { symbol: string; exchangeConfigId: number }) {
    if (!this.wxWebhookUrl) {
      throw new BadRequestException('WX_WEBHOOK 未配置');
    }

    const { symbol, exchangeConfigId } = dto;
    const fakeWatch = {
      symbol,
      exchangeConfigId,
    } as StrategyRecord;
    const { exchangeConfigEnvMap } =
      await this.strategyEnvService.groupSymbolsByEnv([fakeWatch]);
    const envType = exchangeConfigEnvMap.get(exchangeConfigId) as KlineEnv;

    if (!envType) {
      throw new BadRequestException(
        `未找到 exchangeConfigId=${exchangeConfigId} 对应的环境类型`,
      );
    }

    const analysisResult = await this.analyzeSymbolDaily(symbol, envType);
    if (!analysisResult) {
      throw new BadRequestException(
        `${symbol} D1 K 线数据不足，无法进行分析`,
      );
    }

    await this.sendDailyAnalysisToWx(symbol, analysisResult);
    return ResponseDto.success('日线分析已推送至企业微信');
  }

  /**
   * 发送企业微信 Webhook 消息
   */
  async sendWxWebhook(message: WxWebhookMessage): Promise<void> {
    const response = await axios.post(this.wxWebhookUrl, message, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data?.errcode !== 0) {
      throw new Error(
        `企业微信 Webhook 返回错误: ${response.data?.errmsg || '未知错误'}`,
      );
    }
  }
}
