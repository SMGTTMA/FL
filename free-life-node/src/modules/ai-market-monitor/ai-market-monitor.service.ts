import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { In, Repository } from 'typeorm';
import {
  KlineCacheService,
  KlineEnv,
} from '@/modules/kline-cache/kline-cache.service';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import { ExceptionLogService } from '@/modules/exception-log/exception-log.service';
import { DeepseekService } from '@/modules/deepseek/deepseek.service';
import { ExchangeConfig } from '@/modules/exchange/entities/exchange-config.entity';
import { TradingPairsService } from '@/modules/trading-pairs/trading-pairs.service';
import { ResponseDto } from '@/common/dto/response.dto';
import { Kline } from '@/types/trading';
import { CreateAiMarketMonitorRuleDto } from './dto/create-ai-market-monitor-rule.dto';
import { QueryAiMarketMonitorLogDto } from './dto/query-ai-market-monitor-log.dto';
import { StopAiMarketMonitorRuleDto } from './dto/stop-ai-market-monitor-rule.dto';
import { TestAiMarketMonitorRuleDto } from './dto/test-ai-market-monitor-rule.dto';
import { AiMarketMonitorRule } from './entities/ai-market-monitor-rule.entity';
import { AiMarketMonitorLog } from './entities/ai-market-monitor-log.entity';
import {
  CHECK_INTERVAL_DEFAULT_WINDOW_MAP,
  intervalToTimeframe,
  MonitorCheckInterval,
  MonitorDecision,
  MonitorNotifyStatus,
} from './types/ai-market-monitor.types';

interface WxWebhookMessage {
  msgtype: 'text' | 'markdown';
  text?: {
    content: string;
    mentioned_list?: string[];
    mentioned_mobile_list?: string[];
  };
  markdown?: {
    content: string;
  };
}

interface ExecuteRuleResult {
  triggered: boolean;
  notifyStatus: MonitorNotifyStatus;
  reason: string;
  confidence: number;
  autoStopped: boolean;
}

@Injectable()
export class AiMarketMonitorService implements OnModuleInit {
  private readonly logger = new Logger(AiMarketMonitorService.name);
  private readonly wxWebhookUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly klineCacheService: KlineCacheService,
    private readonly exceptionLogService: ExceptionLogService,
    private readonly deepseekService: DeepseekService,
    private readonly tradingPairsService: TradingPairsService,
    @InjectRepository(AiMarketMonitorRule)
    private readonly ruleRepository: Repository<AiMarketMonitorRule>,
    @InjectRepository(AiMarketMonitorLog)
    private readonly logRepository: Repository<AiMarketMonitorLog>,
    @InjectRepository(ExchangeConfig)
    private readonly exchangeConfigRepository: Repository<ExchangeConfig>,
  ) {
    this.wxWebhookUrl = this.configService.get<string>('WX_WEBHOOK') || '';
    if (!this.wxWebhookUrl) {
      this.logger.warn('WX_WEBHOOK 环境变量未配置，命中后将无法推送企业微信消息');
    }
  }

  async onModuleInit() {
    this.logger.log('[启动] AI 市场监控模块已初始化（每5分钟轮询规则）');
  }

  async createRule(dto: CreateAiMarketMonitorRuleDto, userId: number) {
    const symbol = dto.symbol.trim().toUpperCase();
    const instruction = dto.instruction.trim();

    if (!instruction) {
      throw new BadRequestException('监控指令不能为空');
    }

    const exchangeConfig = await this.exchangeConfigRepository.findOne({
      where: {
        id: dto.exchangeConfigId,
        userId,
        isActive: 1,
      },
    });
    if (!exchangeConfig) {
      throw new BadRequestException('无效的交易所配置');
    }

    const tradingPairsRes = await this.tradingPairsService.findAll({
      symbol,
      isActive: 1,
    });
    if (!Array.isArray(tradingPairsRes?.data) || tradingPairsRes.data.length === 0) {
      throw new BadRequestException(`交易对 ${symbol} 不存在或未启用`);
    }

    const existingRule = await this.ruleRepository.findOne({
      where: {
        userId,
        exchangeConfigId: dto.exchangeConfigId,
        symbol,
        instruction,
        checkInterval: dto.checkInterval,
        status: 1,
      },
    });
    if (existingRule) {
      throw new BadRequestException('存在相同的运行中监控规则，请勿重复创建');
    }

    const rule = this.ruleRepository.create({
      userId,
      exchangeConfigId: dto.exchangeConfigId,
      symbol,
      instruction,
      checkInterval: dto.checkInterval,
      klineWindow:
        dto.klineWindow ?? CHECK_INTERVAL_DEFAULT_WINDOW_MAP[dto.checkInterval],
      repeatMonitor: dto.repeatMonitor ? 1 : 0,
      status: 1,
    });
    await this.ruleRepository.save(rule);

    return ResponseDto.success({
      ruleId: rule.id,
      symbol: rule.symbol,
      checkInterval: rule.checkInterval,
      klineWindow: rule.klineWindow,
      repeatMonitor: !!rule.repeatMonitor,
      status: rule.status,
    });
  }

  async stopRule(dto: StopAiMarketMonitorRuleDto, userId: number) {
    const rule = await this.ruleRepository.findOne({
      where: {
        id: dto.ruleId,
        userId,
        status: 1,
      },
    });
    if (!rule) {
      throw new BadRequestException('未找到运行中的监控规则');
    }

    rule.status = 0;
    await this.ruleRepository.save(rule);

    return ResponseDto.success(`监控规则已停止 - ID=${rule.id}`);
  }

  async listRules(userId: number) {
    const rules = await this.ruleRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return ResponseDto.success(
      rules.map((rule) => ({
        ruleId: rule.id,
        symbol: rule.symbol,
        instruction: rule.instruction,
        checkInterval: rule.checkInterval,
        klineWindow: rule.klineWindow,
        repeatMonitor: !!rule.repeatMonitor,
        exchangeConfigId: rule.exchangeConfigId,
        status: rule.status,
        lastCheckAt: rule.lastCheckAt,
        lastTriggerAt: rule.lastTriggerAt,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      })),
    );
  }

  async listLogs(dto: QueryAiMarketMonitorLogDto, userId: number) {
    const {
      page = 1,
      pageSize = 20,
      ruleId,
      symbol,
      checkInterval,
      isTriggered,
      notifyStatus,
    } = dto;

    const queryBuilder = this.logRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId });

    if (ruleId) {
      queryBuilder.andWhere('log.ruleId = :ruleId', { ruleId });
    }

    if (symbol?.trim()) {
      queryBuilder.andWhere('log.symbol = :symbol', {
        symbol: symbol.trim().toUpperCase(),
      });
    }

    if (checkInterval) {
      queryBuilder.andWhere('log.checkInterval = :checkInterval', {
        checkInterval,
      });
    }

    if (typeof isTriggered === 'number') {
      queryBuilder.andWhere('log.isTriggered = :isTriggered', { isTriggered });
    }

    if (notifyStatus) {
      queryBuilder.andWhere('log.notifyStatus = :notifyStatus', { notifyStatus });
    }

    const [logs, total] = await queryBuilder
      .orderBy('log.checkTime', 'DESC')
      .addOrderBy('log.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return ResponseDto.success({
      list: logs.map((log) => ({
        id: log.id,
        ruleId: log.ruleId,
        symbol: log.symbol,
        checkInterval: log.checkInterval,
        checkTime: log.checkTime,
        prompt: log.prompt,
        aiResponse: log.aiResponse,
        decision: log.decision,
        isTriggered: log.isTriggered,
        triggerReason: log.triggerReason,
        notifyStatus: log.notifyStatus,
        notifyError: log.notifyError,
        createdAt: log.createdAt,
      })),
      total,
      page,
      pageSize,
    });
  }

  async testRule(dto: TestAiMarketMonitorRuleDto, userId: number) {
    const rule = await this.ruleRepository.findOne({
      where: {
        id: dto.ruleId,
        userId,
      },
    });
    if (!rule) {
      throw new BadRequestException('规则不存在');
    }

    const envMap = await this.getExchangeConfigEnvMap([rule.exchangeConfigId]);
    const envType = envMap.get(rule.exchangeConfigId);
    const result = await this.executeRule(rule, envType, true, false);

    return ResponseDto.success({
      ruleId: rule.id,
      symbol: rule.symbol,
      checkInterval: rule.checkInterval,
      triggered: result.triggered,
      notifyStatus: result.notifyStatus,
      confidence: result.confidence,
      reason: result.reason,
      autoStopped: result.autoStopped,
    });
  }

  /**
   * 每 5 分钟轮询一次，检查每条规则是否到了自己的执行周期
   * 统一在第20秒执行，避开日线/周线在整点后短暂的交易所数据更新窗口
   */
  @Cron('20 */5 * * * *')
  async scanAndExecuteRules() {
    this.logger.log('[定时任务] 开始轮询 AI 市场监控规则...');
    try {
      const activeRules = await this.ruleRepository.find({
        where: { status: 1 },
      });
      if (!activeRules.length) {
        this.logger.log('无运行中的监控规则，跳过轮询');
        return;
      }

      const now = new Date();
      const dueRules = activeRules.filter((rule) => this.isRuleDue(rule, now));
      if (!dueRules.length) {
        this.logger.log('当前无到期规则，跳过执行');
        return;
      }

      const envMap = await this.getExchangeConfigEnvMap(
        dueRules.map((rule) => rule.exchangeConfigId),
      );

      await this.prepareKlineCaches(dueRules, envMap);

      for (const rule of dueRules) {
        const envType = envMap.get(rule.exchangeConfigId);
        const checkSlotTime = this.getRuleCheckSlot(now, rule.checkInterval);
        try {
          await this.executeRule(rule, envType, true, true, checkSlotTime);
        } catch (error) {
          await this.exceptionLogService.create({
            url: 'cronjob/ai-market-monitor/execute-single-rule',
            method: 'CRON',
            statusCode: 500,
            message: error?.message || String(error),
            stack: error?.stack || '',
            userId: rule.userId,
          });
          this.logger.error(
            `[规则${rule.id}] 执行失败: ${error?.message || String(error)}`,
            error,
          );
        }
      }

      this.logger.log(`[定时任务] 本轮执行完成，执行规则数: ${dueRules.length}`);
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/ai-market-monitor/scan',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[定时任务] AI 市场监控规则轮询失败', error);
    }
  }

  private async executeRule(
    rule: AiMarketMonitorRule,
    envType: KlineEnv | undefined,
    forceExecute: boolean,
    autoStopOnTrigger: boolean,
    checkTimeOverride?: Date,
  ): Promise<ExecuteRuleResult> {
    const checkTime = checkTimeOverride ? new Date(checkTimeOverride) : new Date();
    let prompt: string | null = null;
    let aiResponse: string | null = null;
    let decision: MonitorDecision | null = null;
    let isTriggered = false;
    let triggerReason = '';
    let notifyStatus: MonitorNotifyStatus = 'not_needed';
    let notifyError: string | null = null;
    let confidence = 0;
    let autoStopped = false;

    try {
      if (!forceExecute && !this.isRuleDue(rule, checkTime)) {
        notifyStatus = 'skipped_not_due';
        triggerReason = '未到执行周期';
        return {
          triggered: false,
          notifyStatus,
          reason: triggerReason,
          confidence: 0,
          autoStopped,
        };
      }

      if (!envType) {
        notifyStatus = 'config_invalid';
        triggerReason = '交易所配置不存在或未启用';
        return {
          triggered: false,
          notifyStatus,
          reason: triggerReason,
          confidence: 0,
          autoStopped,
        };
      }

      const recentKlines = await this.getRecentClosedKlines(rule, envType);
      if (recentKlines.length === 0) {
        notifyStatus = 'data_insufficient';
        triggerReason = 'K线数据不足，跳过本次监控';
        return {
          triggered: false,
          notifyStatus,
          reason: triggerReason,
          confidence: 0,
          autoStopped,
        };
      }

      const currentPrice = recentKlines[0].close;
      prompt = this.buildMonitorPrompt(rule, recentKlines, currentPrice);
      const aiResult = await this.callDeepSeekForMonitor(prompt);
      aiResponse = aiResult.response;
      decision = aiResult.decision;
      isTriggered = decision.matched;
      triggerReason = decision.reason;
      confidence = decision.confidence;

      if (isTriggered) {
        try {
          await this.sendMatchedMessageToWx(
            rule,
            decision,
            recentKlines[0],
            checkTime,
          );
          notifyStatus = 'success';
          rule.lastTriggerAt = checkTime;
          if (!rule.repeatMonitor && autoStopOnTrigger) {
            rule.status = 0;
            autoStopped = true;
          }
        } catch (error) {
          notifyStatus = 'failed';
          notifyError = error?.message || String(error);
          await this.exceptionLogService.create({
            url: 'ai-market-monitor/sendMatchedMessageToWx',
            method: 'WEBHOOK',
            statusCode: 500,
            message: notifyError,
            stack: error?.stack || '',
            userId: rule.userId,
          });
        }
      } else {
        notifyStatus = 'not_needed';
      }
    } finally {
      rule.lastCheckAt = checkTime;
      if (aiResponse) {
        rule.lastAiResponse = aiResponse;
      }
      await this.ruleRepository.save(rule);
      await this.saveExecutionLog({
        rule,
        checkTime,
        prompt,
        aiResponse,
        decision,
        isTriggered,
        triggerReason,
        notifyStatus,
        notifyError,
      });
    }

    return {
      triggered: isTriggered,
      notifyStatus,
      reason: triggerReason,
      confidence,
      autoStopped,
    };
  }

  private async getRecentClosedKlines(
    rule: AiMarketMonitorRule,
    envType: KlineEnv,
  ): Promise<Kline[]> {
    const timeframe = intervalToTimeframe(rule.checkInterval);
    const requiredCount = Math.max(rule.klineWindow, 1);

    let rawKlines = this.klineCacheService.getKlines(
      rule.symbol,
      timeframe,
      envType,
      {
        needReverse: true,
        klinesSliceNum: requiredCount + 1,
      },
    );

    if (rawKlines.length < requiredCount + 1) {
      await this.klineCacheService.updateKlines(
        rule.symbol,
        timeframe,
        Math.max(requiredCount + 5, 30),
        rule.exchangeConfigId,
        envType,
      );

      rawKlines = this.klineCacheService.getKlines(
        rule.symbol,
        timeframe,
        envType,
        {
          needReverse: true,
          klinesSliceNum: requiredCount + 1,
        },
      );
    }

    if (rawKlines.length < 2) {
      return [];
    }

    return rawKlines.slice(1, requiredCount + 1);
  }

  private buildMonitorPrompt(
    rule: AiMarketMonitorRule,
    recentKlines: Kline[],
    currentPrice: number,
  ): string {
    const klinesStr = recentKlines
      .map((k, index) => {
        const date = new Date(k.timestamp)
          .toISOString()
          .slice(0, 16)
          .replace('T', ' ');
        return `${index + 1}. [${date}] 开:${k.open}, 高:${k.high}, 低:${k.low}, 收:${k.close}, 量:${k.volume.toFixed(2)}`;
      })
      .join('\n');

    const systemPrompt = `你是一个“市场条件匹配引擎”，只做一件事：判断给定K线数据是否满足用户的监控指令。

规则：
1. 不要给交易建议，不要预测未来，只判断“当前是否已满足条件”
2. 若信息不足、语义不明确或信心不足，请返回 matched=false
3. 必须返回 JSON（不要有任何额外文字），格式如下：
{
  "matched": true | false,
  "confidence": 0-100,
  "reason": "简要说明依据"
}`;

    const userPrompt = `【交易对】${rule.symbol}
【监控周期】${rule.checkInterval}
【用户监控指令】${rule.instruction}
【当前价格】${currentPrice} USDT

【最近${recentKlines.length}根已收盘K线】（从新到旧）
${klinesStr}

请严格按 JSON 返回是否命中监控指令。`;

    return `${systemPrompt}\n\n${userPrompt}`;
  }

  private async callDeepSeekForMonitor(
    prompt: string,
  ): Promise<{ decision: MonitorDecision; response: string }> {
    const model = this.configService.get<string>(
      'AI_MARKET_MONITOR_AI_MODEL',
      this.configService.get<string>('INDICATOR_SIGNAL_AI_MODEL', 'deepseek-reasoner'),
    );
    const temperature = parseFloat(
      this.configService.get<string>('AI_MARKET_MONITOR_TEMPERATURE', '0.2'),
    );

    try {
      const response = await this.deepseekService.createChatCompletion({
        userPrompt: prompt,
        model,
        temperature,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          decision: {
            matched: false,
            confidence: 0,
            reason: 'AI 返回内容无法解析为 JSON',
          },
          response,
        };
      }

      const parsed = JSON.parse(jsonMatch[0]) as Partial<MonitorDecision> & {
        matched?: boolean | string;
      };

      const decision: MonitorDecision = {
        matched:
          parsed.matched === true || String(parsed.matched).toLowerCase() === 'true',
        confidence:
          typeof parsed.confidence === 'number'
            ? Math.max(0, Math.min(100, parsed.confidence))
            : 0,
        reason: parsed.reason ? String(parsed.reason) : '',
      };

      return {
        decision,
        response,
      };
    } catch (error) {
      const errorMessage = error?.message || String(error);
      return {
        decision: {
          matched: false,
          confidence: 0,
          reason: `AI 调用失败: ${errorMessage}`,
        },
        response: errorMessage,
      };
    }
  }

  private async sendMatchedMessageToWx(
    rule: AiMarketMonitorRule,
    decision: MonitorDecision,
    latestKline: Kline,
    checkTime: Date,
  ): Promise<void> {
    if (!this.wxWebhookUrl) {
      throw new Error('WX_WEBHOOK 未配置');
    }

    const localTime = checkTime.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });

    const content = `【AI市场监控命中】
规则ID: ${rule.id}
交易对: ${rule.symbol}
周期: ${rule.checkInterval}
监控指令: ${rule.instruction}
命中结果: 是
信心指数: ${decision.confidence}
原因: ${decision.reason}
最近收盘价: ${latestKline.close}
检查时间: ${localTime}`;

    const message: WxWebhookMessage = {
      msgtype: 'text',
      text: { content },
    };

    await this.sendWxWebhook(message);
  }

  private async sendWxWebhook(message: WxWebhookMessage): Promise<void> {
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

  private async prepareKlineCaches(
    dueRules: AiMarketMonitorRule[],
    envMap: Map<number, KlineEnv>,
  ) {
    const cacheTaskMap = new Map<
      string,
      {
        symbol: string;
        timeframe: TimeFrame;
        env: KlineEnv;
        exchangeConfigId: number;
        limit: number;
      }
    >();

    for (const rule of dueRules) {
      const env = envMap.get(rule.exchangeConfigId);
      if (!env) continue;

      const timeframe = intervalToTimeframe(rule.checkInterval);
      const limit = Math.max(rule.klineWindow + 5, 30);
      const key = `${rule.symbol}_${timeframe}_${env}`;
      const existing = cacheTaskMap.get(key);

      if (existing) {
        existing.limit = Math.max(existing.limit, limit);
        continue;
      }

      cacheTaskMap.set(key, {
        symbol: rule.symbol,
        timeframe,
        env,
        exchangeConfigId: rule.exchangeConfigId,
        limit,
      });
    }

    const tasks = Array.from(cacheTaskMap.values()).map((item) =>
      this.klineCacheService.updateKlines(
        item.symbol,
        item.timeframe,
        item.limit,
        item.exchangeConfigId,
        item.env,
      ),
    );

    await Promise.all(tasks);
  }

  private async getExchangeConfigEnvMap(
    exchangeConfigIds: number[],
  ): Promise<Map<number, KlineEnv>> {
    const uniqueIds = Array.from(new Set(exchangeConfigIds));
    if (!uniqueIds.length) return new Map();

    const exchangeConfigs = await this.exchangeConfigRepository.find({
      where: {
        id: In(uniqueIds),
        isActive: 1,
      },
    });

    const envMap = new Map<number, KlineEnv>();
    for (const config of exchangeConfigs) {
      envMap.set(config.id, config.isTestNet === 1 ? 'test' : 'prod');
    }
    return envMap;
  }

  private isRuleDue(rule: AiMarketMonitorRule, now: Date): boolean {
    if (!rule.lastCheckAt) return true;
    const currentSlot = this.getRuleCheckSlot(now, rule.checkInterval);
    const lastSlot = this.getRuleCheckSlot(
      new Date(rule.lastCheckAt),
      rule.checkInterval,
    );
    return currentSlot.getTime() > lastSlot.getTime();
  }

  private getRuleCheckSlot(
    time: Date,
    checkInterval: MonitorCheckInterval,
  ): Date {
    const slot = new Date(time);
    slot.setUTCMilliseconds(0);
    slot.setUTCSeconds(0);

    switch (checkInterval) {
      case MonitorCheckInterval.M5: {
        const minute = slot.getUTCMinutes();
        slot.setUTCMinutes(Math.floor(minute / 5) * 5, 0, 0);
        return slot;
      }
      case MonitorCheckInterval.M30: {
        const minute = slot.getUTCMinutes();
        slot.setUTCMinutes(Math.floor(minute / 30) * 30, 0, 0);
        return slot;
      }
      case MonitorCheckInterval.H1: {
        slot.setUTCMinutes(0, 0, 0);
        return slot;
      }
      case MonitorCheckInterval.H4: {
        const hour = slot.getUTCHours();
        slot.setUTCHours(Math.floor(hour / 4) * 4, 0, 0, 0);
        return slot;
      }
      case MonitorCheckInterval.D1: {
        slot.setUTCHours(0, 0, 0, 0);
        return slot;
      }
      case MonitorCheckInterval.W1: {
        slot.setUTCHours(0, 0, 0, 0);
        const day = slot.getUTCDay();
        const diffToMonday = (day + 6) % 7;
        slot.setUTCDate(slot.getUTCDate() - diffToMonday);
        return slot;
      }
      default: {
        return slot;
      }
    }
  }

  private async saveExecutionLog(args: {
    rule: AiMarketMonitorRule;
    checkTime: Date;
    prompt: string | null;
    aiResponse: string | null;
    decision: MonitorDecision | null;
    isTriggered: boolean;
    triggerReason: string;
    notifyStatus: MonitorNotifyStatus;
    notifyError: string | null;
  }) {
    const {
      rule,
      checkTime,
      prompt,
      aiResponse,
      decision,
      isTriggered,
      triggerReason,
      notifyStatus,
      notifyError,
    } = args;

    const log = this.logRepository.create({
      ruleId: rule.id,
      userId: rule.userId,
      symbol: rule.symbol,
      checkInterval: rule.checkInterval,
      checkTime,
      prompt,
      aiResponse,
      decision,
      isTriggered: isTriggered ? 1 : 0,
      triggerReason: triggerReason || null,
      notifyStatus,
      notifyError,
    });

    await this.logRepository.save(log);
  }
}
