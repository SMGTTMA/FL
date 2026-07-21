import { ResponseDto } from '@/common/dto/response.dto';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import { ExchangeConfig } from '@/modules/exchange/entities/exchange-config.entity';
import { ExceptionLogService } from '@/modules/exception-log/exception-log.service';
import {
  KlineCacheService,
  KlineEnv,
} from '@/modules/kline-cache/kline-cache.service';
import { StrategyKeyLevel } from '@/modules/strategy-structures/entities/strategy-key-level.entity';
import { StrategyStructureLine } from '@/modules/strategy-structures/entities/strategy-structure-line.entity';
import { Kline } from '@/types/trading';
import { calculateCloseTime } from '@/utils/trading/trading';
import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { In, Repository } from 'typeorm';
import { CreateStructureAlertRuleDto } from './dto/create-structure-alert-rule.dto';
import { QueryStructureAlertRuleDto } from './dto/query-structure-alert-rule.dto';
import { StructureAlertRule } from './entities/structure-alert-rule.entity';
import {
  StructureAlertEventType,
  StructureAlertTargetType,
} from './types/structure-alert.types';

interface WxWebhookMessage {
  msgtype: 'text';
  text: {
    content: string;
  };
}

interface AlertTargetContext {
  symbol: string;
  timeframe: TimeFrame;
  title: string;
  targetType: StructureAlertTargetType;
  staticTargetPrice?: number;
  line?: StrategyStructureLine;
}

interface ClosedPairContext {
  latestClosed: Kline;
  prevClosed: Kline;
}

interface EvaluatedTargetContext {
  currentTargetPrice: number;
  prevTargetPrice: number;
}

@Injectable()
export class StructureAlertsService {
  private readonly logger = new Logger(StructureAlertsService.name);
  private readonly wxWebhookUrl: string;
  private readonly defaultNearThreshold: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly klineCacheService: KlineCacheService,
    private readonly exceptionLogService: ExceptionLogService,
    @InjectRepository(StructureAlertRule)
    private readonly ruleRepository: Repository<StructureAlertRule>,
    @InjectRepository(ExchangeConfig)
    private readonly exchangeConfigRepository: Repository<ExchangeConfig>,
    @InjectRepository(StrategyKeyLevel)
    private readonly strategyKeyLevelRepository: Repository<StrategyKeyLevel>,
    @InjectRepository(StrategyStructureLine)
    private readonly strategyStructureLineRepository: Repository<StrategyStructureLine>,
  ) {
    this.wxWebhookUrl = this.configService.get<string>('WX_WEBHOOK') || '';
    this.defaultNearThreshold = parseFloat(
      this.configService.get<string>('STRUCTURE_ALERT_DEFAULT_NEAR_THRESHOLD', '0.002'),
    );
  }

  async createRule(dto: CreateStructureAlertRuleDto, userId: number) {
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

    const monitorNear = dto.monitorNear ?? true;
    const monitorBreakUp = dto.monitorBreakUp ?? true;
    const monitorBreakDown = dto.monitorBreakDown ?? true;
    if (!monitorNear && !monitorBreakUp && !monitorBreakDown) {
      throw new BadRequestException('至少选择一种监控方式');
    }

    const target = await this.getTargetForRule(dto.targetType, dto.targetId, userId);

    const existing = await this.ruleRepository.findOne({
      where: {
        userId,
        exchangeConfigId: dto.exchangeConfigId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: 1,
      },
    });
    if (existing) {
      throw new BadRequestException('该目标已存在启用中的监控规则');
    }

    const entity = this.ruleRepository.create({
      userId,
      exchangeConfigId: dto.exchangeConfigId,
      symbol: target.symbol,
      timeframe: target.timeframe,
      targetType: dto.targetType,
      targetId: dto.targetId,
      monitorNear: monitorNear ? 1 : 0,
      monitorBreakUp: monitorBreakUp ? 1 : 0,
      monitorBreakDown: monitorBreakDown ? 1 : 0,
      nearThreshold: dto.nearThreshold ?? this.defaultNearThreshold,
      breakoutThreshold:
        dto.breakoutThreshold === undefined ? null : dto.breakoutThreshold,
      remark: this.normalizeRemark(dto.remark),
      status: 1,
    });

    const saved = await this.ruleRepository.save(entity);
    return ResponseDto.success(saved);
  }

  async listRules(dto: QueryStructureAlertRuleDto, userId: number) {
    const symbol = dto.symbol?.trim().toUpperCase();
    const rules = await this.ruleRepository.find({
      where: {
        userId,
        ...(symbol ? { symbol } : {}),
        ...(dto.timeframe ? { timeframe: dto.timeframe } : {}),
        ...(dto.targetType ? { targetType: dto.targetType } : {}),
      },
      order: {
        status: 'DESC',
        symbol: 'ASC',
        timeframe: 'ASC',
        id: 'DESC',
      },
    });

    return ResponseDto.success(rules);
  }

  async enableRule(ruleId: number, userId: number) {
    const rule = await this.getOwnedRule(ruleId, userId);
    rule.status = 1;
    const saved = await this.ruleRepository.save(rule);
    return ResponseDto.success(saved);
  }

  async disableRule(ruleId: number, userId: number) {
    const rule = await this.getOwnedRule(ruleId, userId);
    rule.status = 0;
    const saved = await this.ruleRepository.save(rule);
    return ResponseDto.success(saved);
  }

  async deleteRule(ruleId: number, userId: number) {
    const rule = await this.getOwnedRule(ruleId, userId);
    await this.ruleRepository.delete({
      id: rule.id,
      userId,
    });
    return ResponseDto.success(`监控规则已删除 - ID=${rule.id}`);
  }

  @Cron('15 * * * * *')
  async scanRules() {
    try {
      const activeRules = await this.ruleRepository.find({
        where: { status: 1 },
      });
      if (!activeRules.length) {
        return;
      }

      const now = new Date();
      const dueRules = activeRules.filter((rule) =>
        this.isTimeframeBoundary(now, rule.timeframe),
      );
      if (!dueRules.length) {
        return;
      }

      const envMap = await this.getExchangeConfigEnvMap(
        dueRules.map((rule) => rule.exchangeConfigId),
      );
      await this.prepareKlineCaches(dueRules, envMap);

      for (const rule of dueRules) {
        const env = envMap.get(rule.exchangeConfigId);
        if (!env) continue;
        await this.executeRule(rule, env, now);
      }
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/structure-alerts/scan',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: null,
      });
      this.logger.error('[结构监控] 定时扫描失败', error);
    }
  }

  private async executeRule(
    rule: StructureAlertRule,
    env: KlineEnv,
    now: Date,
  ) {
    try {
      const target = await this.getAlertTargetContext(rule);
      const closedPair = await this.getLatestClosedPair(
        rule.symbol,
        rule.timeframe,
        rule.exchangeConfigId,
        env,
        now,
      );

      if (!closedPair) {
        this.logger.warn(
          `[结构监控] 已收线K线不足，跳过 ruleId=${rule.id}, symbol=${rule.symbol}, timeframe=${rule.timeframe}`,
        );
        return;
      }

      const evaluatedTarget = this.evaluateTargetPrices(target, closedPair);
      const events = this.evaluateEvents(
        rule,
        evaluatedTarget,
        closedPair,
      );
      for (const event of events) {
        await this.sendAlertMessage(
          rule,
          target,
          evaluatedTarget,
          closedPair,
          event,
          now,
        );
      }
    } catch (error) {
      await this.exceptionLogService.create({
        url: 'cronjob/structure-alerts/execute-rule',
        method: 'CRON',
        statusCode: 500,
        message: error?.message || String(error),
        stack: error?.stack || '',
        userId: rule.userId,
      });
      this.logger.error(
        `[结构监控] 执行失败 ruleId=${rule.id}, symbol=${rule.symbol}`,
        error,
      );
    }
  }

  private evaluateEvents(
    rule: StructureAlertRule,
    evaluatedTarget: EvaluatedTargetContext,
    closedPair: ClosedPairContext,
  ): StructureAlertEventType[] {
    const latestClose = this.toNumber(closedPair.latestClosed.close);
    const prevClose = this.toNumber(closedPair.prevClosed.close);
    const currentTargetPrice = this.toNumber(evaluatedTarget.currentTargetPrice);
    const prevTargetPrice = this.toNumber(
      evaluatedTarget.prevTargetPrice,
      currentTargetPrice,
    );
    const nearThreshold = this.toNumber(
      rule.nearThreshold,
      this.defaultNearThreshold,
    );
    const distanceRate =
      currentTargetPrice > 0
        ? Math.abs(latestClose - currentTargetPrice) / currentTargetPrice
        : Number.POSITIVE_INFINITY;

    if (
      rule.monitorBreakUp === 1 &&
      prevClose <= prevTargetPrice &&
      latestClose > currentTargetPrice
    ) {
      return ['BREAK_UP'];
    }

    if (
      rule.monitorBreakDown === 1 &&
      prevClose >= prevTargetPrice &&
      latestClose < currentTargetPrice
    ) {
      return ['BREAK_DOWN'];
    }

    if (rule.monitorNear === 1 && distanceRate <= nearThreshold) {
      return ['NEAR'];
    }

    return [];
  }

  private async getAlertTargetContext(
    rule: StructureAlertRule,
  ): Promise<AlertTargetContext> {
    if (rule.targetType === 'KEY_LEVEL') {
      const keyLevel = await this.strategyKeyLevelRepository.findOne({
        where: {
          id: rule.targetId,
          userId: rule.userId,
        },
      });
      if (!keyLevel) {
        throw new BadRequestException('关键位不存在，无法继续监控');
      }

      return {
        symbol: keyLevel.symbol,
        timeframe: keyLevel.timeframe as TimeFrame,
        title: `关键位 ${keyLevel.levelGroup}${
          keyLevel.boundary ? `/${keyLevel.boundary}` : ''
        }`,
        targetType: 'KEY_LEVEL',
        staticTargetPrice: this.toNumber(keyLevel.price),
      };
    }

    const line = await this.strategyStructureLineRepository.findOne({
      where: {
        id: rule.targetId,
        userId: rule.userId,
      },
    });
    if (!line) {
      throw new BadRequestException('结构线不存在，无法继续监控');
    }

    return {
      symbol: line.symbol,
      timeframe: line.timeframe as TimeFrame,
      title: `结构线 ${line.lineGroup}${line.boundary ? `/${line.boundary}` : ''}`,
      targetType: 'STRUCTURE_LINE',
      line,
    };
  }

  private async getLatestClosedPair(
    symbol: string,
    timeframe: TimeFrame,
    exchangeConfigId: number,
    env: KlineEnv,
    now: Date,
  ): Promise<ClosedPairContext | null> {
    let recentKlines = this.klineCacheService.getKlines(symbol, timeframe, env, {
      needReverse: true,
      klinesSliceNum: 6,
    });

    if (recentKlines.length < 3) {
      await this.klineCacheService.updateKlines(
        symbol,
        timeframe,
        20,
        exchangeConfigId,
        env,
      );
      recentKlines = this.klineCacheService.getKlines(symbol, timeframe, env, {
        needReverse: true,
        klinesSliceNum: 6,
      });
    }

    const closedKlines = recentKlines.filter((kline) =>
      calculateCloseTime(kline.timestamp, timeframe).getTime() <= now.getTime(),
    );

    if (closedKlines.length < 2) {
      return null;
    }

    return {
      latestClosed: closedKlines[0],
      prevClosed: closedKlines[1],
    };
  }

  private evaluateTargetPrices(
    target: AlertTargetContext,
    closedPair: ClosedPairContext,
  ): EvaluatedTargetContext {
    if (target.targetType === 'KEY_LEVEL') {
      const targetPrice = this.toNumber(target.staticTargetPrice);
      return {
        currentTargetPrice: targetPrice,
        prevTargetPrice: targetPrice,
      };
    }

    const line = target.line;
    if (!line) {
      throw new BadRequestException('结构线数据缺失，无法计算目标价格');
    }

    return {
      currentTargetPrice: this.projectLinePrice(
        this.toNumber(line.p1Time),
        this.toNumber(line.p1Price),
        this.toNumber(line.p2Time),
        this.toNumber(line.p2Price),
        new Date(closedPair.latestClosed.timestamp).getTime(),
      ),
      prevTargetPrice: this.projectLinePrice(
        this.toNumber(line.p1Time),
        this.toNumber(line.p1Price),
        this.toNumber(line.p2Time),
        this.toNumber(line.p2Price),
        new Date(closedPair.prevClosed.timestamp).getTime(),
      ),
    };
  }

  private async sendAlertMessage(
    rule: StructureAlertRule,
    target: AlertTargetContext,
    evaluatedTarget: EvaluatedTargetContext,
    closedPair: ClosedPairContext,
    event: StructureAlertEventType,
    now: Date,
  ) {
    if (!this.wxWebhookUrl) {
      this.logger.warn(
        `[结构监控] WX_WEBHOOK 未配置，跳过通知 ruleId=${rule.id}`,
      );
      return;
    }

    const latestClose = this.toNumber(closedPair.latestClosed.close);
    const targetPrice = this.toNumber(evaluatedTarget.currentTargetPrice);
    const distanceRate =
      targetPrice > 0 ? (Math.abs(latestClose - targetPrice) / targetPrice) * 100 : 0;

    const eventTextMap: Record<StructureAlertEventType, string> = {
      NEAR: '靠近',
      BREAK_UP: '向上突破',
      BREAK_DOWN: '向下跌破',
    };

    const content = `【结构监控提醒】
规则ID: ${rule.id}
交易对: ${rule.symbol}
周期: ${rule.timeframe}
目标: ${target.title}
事件: ${eventTextMap[event]}
目标价格: ${targetPrice}
最新已收盘价: ${latestClose}
上一根已收盘价: ${this.toNumber(closedPair.prevClosed.close)}
上一根目标价: ${this.toNumber(evaluatedTarget.prevTargetPrice)}
偏离比例: ${distanceRate.toFixed(4)}%
K线时间: ${closedPair.latestClosed.timestamp}
检查时间: ${now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
备注: ${rule.remark || '-'}`;

    await this.sendWxWebhook({
      msgtype: 'text',
      text: { content },
    });
  }

  private async sendWxWebhook(message: WxWebhookMessage) {
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
    rules: StructureAlertRule[],
    envMap: Map<number, KlineEnv>,
  ) {
    const tasks = new Map<
      string,
      {
        symbol: string;
        timeframe: TimeFrame;
        exchangeConfigId: number;
        env: KlineEnv;
      }
    >();

    for (const rule of rules) {
      const env = envMap.get(rule.exchangeConfigId);
      if (!env) continue;
      const key = `${rule.symbol}_${rule.timeframe}_${env}_${rule.exchangeConfigId}`;
      if (!tasks.has(key)) {
        tasks.set(key, {
          symbol: rule.symbol,
          timeframe: rule.timeframe,
          exchangeConfigId: rule.exchangeConfigId,
          env,
        });
      }
    }

    await Promise.all(
      Array.from(tasks.values()).map((item) =>
        this.klineCacheService.updateKlines(
          item.symbol,
          item.timeframe,
          20,
          item.exchangeConfigId,
          item.env,
        ),
      ),
    );
  }

  private async getExchangeConfigEnvMap(
    exchangeConfigIds: number[],
  ): Promise<Map<number, KlineEnv>> {
    const uniqueIds = Array.from(new Set(exchangeConfigIds));
    const exchangeConfigs = await this.exchangeConfigRepository.find({
      where: {
        id: In(uniqueIds),
        isActive: 1,
      },
    });

    const map = new Map<number, KlineEnv>();
    for (const config of exchangeConfigs) {
      map.set(config.id, config.isTestNet === 1 ? 'test' : 'prod');
    }
    return map;
  }

  private isTimeframeBoundary(now: Date, timeframe: TimeFrame) {
    const minute = now.getUTCMinutes();
    const hour = now.getUTCHours();
    const day = now.getUTCDay();

    switch (timeframe) {
      case TimeFrame.M1:
        return true;
      case TimeFrame.M5:
        return minute % 5 === 0;
      case TimeFrame.M15:
        return minute % 15 === 0;
      case TimeFrame.M30:
        return minute % 30 === 0;
      case TimeFrame.H1:
        return minute === 0;
      case TimeFrame.H4:
        return minute === 0 && hour % 4 === 0;
      case TimeFrame.D1:
        return minute === 0 && hour === 0;
      case TimeFrame.W1:
        return minute === 0 && hour === 0 && day === 1;
      default:
        return false;
    }
  }

  private async getTargetForRule(
    targetType: StructureAlertTargetType,
    targetId: number,
    userId: number,
  ) {
    if (targetType === 'KEY_LEVEL') {
      const keyLevel = await this.strategyKeyLevelRepository.findOne({
        where: {
          id: targetId,
          userId,
        },
      });
      if (!keyLevel) {
        throw new BadRequestException('关键位不存在或无权限访问');
      }
      return {
        symbol: keyLevel.symbol,
        timeframe: keyLevel.timeframe as TimeFrame,
      };
    }

    const line = await this.strategyStructureLineRepository.findOne({
      where: {
        id: targetId,
        userId,
      },
    });
    if (!line) {
      throw new BadRequestException('结构线不存在或无权限访问');
    }
    return {
      symbol: line.symbol,
      timeframe: line.timeframe as TimeFrame,
    };
  }

  private async getOwnedRule(ruleId: number, userId: number) {
    const rule = await this.ruleRepository.findOne({
      where: {
        id: ruleId,
        userId,
      },
    });
    if (!rule) {
      throw new BadRequestException('监控规则不存在或无权限访问');
    }
    return rule;
  }

  private normalizeRemark(remark?: string | null) {
    const value = remark?.trim();
    return value ? value.slice(0, 255) : null;
  }

  private projectLinePrice(
    p1Time: number,
    p1Price: number,
    p2Time: number,
    p2Price: number,
    targetTime: number,
  ) {
    if (p1Time === p2Time) {
      return p2Price;
    }
    const slope = (p2Price - p1Price) / (p2Time - p1Time);
    return p1Price + slope * (targetTime - p1Time);
  }

  private toNumber(value: unknown, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }
}
