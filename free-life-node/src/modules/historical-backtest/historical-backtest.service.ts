import { BadRequestException, Injectable } from '@nestjs/common';
import { ResponseDto } from '@/common/dto/response.dto';
import { KlineCacheService } from '@/modules/kline-cache/kline-cache.service';
import { GetKeyPointsV3BacktestDto } from './dto/get-keypoints-v3-backtest.dto';
import { GetTrendStrengthBacktestDto } from './dto/get-trend-strength-backtest.dto';
import { GetGridCashKeyPointsBacktestDto } from './dto/get-grid-cash-keypoints-backtest.dto';
import {
  calculateKeyPoints,
  calculateKeyPointsV3,
  classifyKeyPointsByLatestClose,
  detectMarketRegimeFromSidewaysRange,
  detectSidewaysRange,
} from '@/utils/trading/trading';
import { analyzeUnifiedTrendStrength } from '@/utils/trading/trendStrengthAnalyzer';
import { gridCashDefaultConfig } from '@/modules/grid-cash/constants/grid-cash.cons';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';

export type ForwardBacktestStatus =
  | 'not_applicable'
  | 'insufficient_data'
  | 'waiting_pullback'
  | 'waiting_breakout'
  | 'triggered';

export interface ForwardBacktestResult {
  direction: 'up' | 'down' | null;
  status: ForwardBacktestStatus;
  evaluateAtTime: string | null;
  triggerTime: string | null;
  triggerPrice: number | null;
  breakoutReferenceTime: string | null;
  barsChecked: number;
  reason: string;
}

@Injectable()
export class HistoricalBacktestService {
  constructor(private readonly klineCacheService: KlineCacheService) {}

  async getKeyPointsV3(dto: GetKeyPointsV3BacktestDto) {
    const {
      symbol,
      timeframe,
      env,
      klineNum = 300,
      dropUnclosed = true,
      includeKlines = true,
      priceTolerance,
      reactionLookahead,
      reactionThreshold,
      minTouchGap,
      recentWindowRatio,
      obviousReactionMultiplier,
      applyRegimeFilter = true,
      regimeBreakoutBuffer,
      regimeBreakoutConfirmBars,
      regimeRecentPivotBars,
    } = dto;

    // 多取一根用于可选地去除“未收盘K线”
    const rawKlines = this.klineCacheService.getKlines(symbol, timeframe, env, {
      klinesSliceNum: klineNum + (dropUnclosed ? 1 : 0),
      needReverse: true, // 保证输出顺序为“新->旧”，与 V3 输入要求一致
    });

    const klines = dropUnclosed ? rawKlines.slice(1) : rawKlines;

    if (!klines || klines.length === 0) {
      return ResponseDto.success({
        symbol,
        timeframe,
        env,
        latestClose: null,
        klines: [],
        keyPointsRaw: [],
        keyPoints: [],
        supports: [],
        resistances: [],
        rangeDetection: null,
        marketRegime: null,
        meta: {
          klineNum: 0,
          dropUnclosed,
          includeKlines,
        },
      });
    }

    const keyPointsOptions = {
      priceTolerance,
      reactionLookahead,
      reactionThreshold,
      minTouchGap,
      recentWindowRatio,
      obviousReactionMultiplier,
      regimeBreakoutBuffer,
      regimeBreakoutConfirmBars,
      regimeRecentPivotBars,
    };

    // 原始 V3 结果（不做阶段过滤），方便前端对比
    const keyPointsRaw = calculateKeyPointsV3(klines, {
      ...keyPointsOptions,
      applyRegimeFilter: false,
    });

    // 最终 V3 结果（默认开启市场阶段过滤）
    const keyPoints = calculateKeyPointsV3(klines, {
      ...keyPointsOptions,
      applyRegimeFilter,
    });

    const latestClose = klines[0]?.close ?? null;
    const { supports, resistances } =
      latestClose && latestClose > 0
        ? classifyKeyPointsByLatestClose(keyPoints, latestClose)
        : { supports: [], resistances: [] };

    const rangeDetection = detectSidewaysRange(klines);
    const marketRegime = detectMarketRegimeFromSidewaysRange(
      klines,
      rangeDetection,
      {
        breakoutBuffer: regimeBreakoutBuffer,
        breakoutConfirmBars: regimeBreakoutConfirmBars,
      },
    );

    return ResponseDto.success({
      symbol,
      timeframe,
      env,
      latestClose,
      klines: includeKlines ? klines : [],
      keyPointsRaw,
      keyPoints,
      supports,
      resistances,
      rangeDetection,
      marketRegime,
      meta: {
        klineNum: klines.length,
        dropUnclosed,
        includeKlines,
        v3Options: {
          ...keyPointsOptions,
          applyRegimeFilter,
        },
      },
    });
  }

  /** 获取现金网格生产策略正在使用的稳定关键位 */
  async getGridCashKeyPoints(dto: GetGridCashKeyPointsBacktestDto) {
    const {
      symbol,
      timeframe,
      env,
      klineNum = 300,
      includeKlines = true,
      testCount: testCountFromDto,
      priceTolerance: priceToleranceFromDto,
      atrPeriod = 14,
      pivotWindow = 2,
      reactionBars = 3,
      minReactionAtr = 0.8,
      minTouchGap = 4,
    } = dto;

    // H1 使用现金网格长周期默认值，其他周期默认沿用短周期配置。
    const isLongTimeframe = timeframe === TimeFrame.H1;
    const testCount =
      testCountFromDto ??
      (isLongTimeframe
        ? gridCashDefaultConfig.longTestCount
        : gridCashDefaultConfig.shortTestCount);
    const priceTolerance =
      priceToleranceFromDto ??
      (isLongTimeframe
        ? gridCashDefaultConfig.longPriceTolerance
        : gridCashDefaultConfig.shortPriceTolerance);
    const keyPointOptions = {
      testCount,
      priceTolerance,
      atrPeriod,
      pivotWindow,
      reactionBars,
      minReactionAtr,
      minTouchGap,
    };

    // 与生产策略保持一致：获取「新 -> 旧」K线，并保留 index 0，
    // 由 calculateKeyPoints 内部统一排除当前未收盘K线。
    const rawKlines = this.klineCacheService.getKlines(symbol, timeframe, env, {
      klinesSliceNum: klineNum,
      needReverse: true,
    });
    const closedKlines = rawKlines.slice(1);

    if (closedKlines.length === 0) {
      return ResponseDto.success({
        symbol,
        timeframe,
        env,
        latestClose: rawKlines[0]?.close ?? null,
        klines: [],
        keyPoints: [],
        supports: [],
        resistances: [],
        meta: {
          requestedKlineNum: klineNum,
          actualKlineNum: rawKlines.length,
          analyzedClosedKlineNum: 0,
          includeKlines,
          options: keyPointOptions,
        },
      });
    }

    const keyPoints = calculateKeyPoints(rawKlines, keyPointOptions);
    // 生产网格使用 index 0 的当前价格筛选下方入场关键位，这里保持一致。
    const latestClose = rawKlines[0]?.close ?? null;
    const { supports, resistances } =
      latestClose && latestClose > 0
        ? classifyKeyPointsByLatestClose(keyPoints, latestClose)
        : { supports: [], resistances: [] };

    return ResponseDto.success({
      symbol,
      timeframe,
      env,
      latestClose,
      klines: includeKlines ? closedKlines : [],
      keyPoints,
      supports,
      resistances,
      meta: {
        requestedKlineNum: klineNum,
        actualKlineNum: rawKlines.length,
        analyzedClosedKlineNum: closedKlines.length,
        includeKlines,
        options: keyPointOptions,
      },
    });
  }

  async getTrendStrength(dto: GetTrendStrengthBacktestDto) {
    const {
      symbol,
      timeframe,
      env,
      evaluateAt,
      klineNum = 300,
      dropUnclosed = true,
      includeKlines = false,
      similarTolerance,
      minClarity,
      dominanceGap,
      maxLegs,
      forwardBars = 100,
    } = dto;

    const evaluateAtMs = Date.parse(evaluateAt);
    if (Number.isNaN(evaluateAtMs)) {
      throw new BadRequestException('evaluateAt 不是合法时间');
    }

    const rawKlines = this.klineCacheService.getKlines(symbol, timeframe, env, {
      needReverse: true, // 保证输出顺序为“新->旧”
    });

    const klines = dropUnclosed ? rawKlines.slice(1) : rawKlines;
    if (!klines || klines.length === 0) {
      return ResponseDto.success({
        symbol,
        timeframe,
        env,
        evaluateAt,
        klines: [],
        chartKlines: [],
        forwardBacktest: {
          direction: null,
          status: 'insufficient_data',
          evaluateAtTime: null,
          triggerTime: null,
          triggerPrice: null,
          breakoutReferenceTime: null,
          barsChecked: 0,
          reason: 'K线为空，无法执行后续行为回测。',
        } satisfies ForwardBacktestResult,
        result: analyzeUnifiedTrendStrength([], {
          similarTolerance,
          minClarity,
          dominanceGap,
          maxLegs,
        }),
        meta: {
          requestedKlineNum: klineNum,
          actualKlineNum: 0,
          dropUnclosed,
          includeKlines,
          forwardBars,
        },
      });
    }

    const latestTimestamp = klines[0]?.timestamp ?? null;
    const oldestTimestamp = klines[klines.length - 1]?.timestamp ?? null;

    let anchorIndex = -1;
    for (let i = 0; i < klines.length; i++) {
      const ts = Date.parse(klines[i].timestamp);
      if (!Number.isNaN(ts) && ts <= evaluateAtMs) {
        anchorIndex = i;
        break;
      }
    }

    if (anchorIndex === -1) {
      throw new BadRequestException(
        `evaluateAt 早于当前缓存最旧K线。当前范围: [${oldestTimestamp}, ${latestTimestamp}]`,
      );
    }

    const contextWindowKlines = klines.slice(anchorIndex, anchorIndex + klineNum);
    const forwardStartIndex = Math.max(0, anchorIndex - forwardBars);
    const chartKlines = klines.slice(forwardStartIndex, anchorIndex + klineNum);
    const anchorKline = contextWindowKlines[0] ?? null;

    const result = analyzeUnifiedTrendStrength(contextWindowKlines, {
      similarTolerance,
      minClarity,
      dominanceGap,
      maxLegs,
    });
    const forwardBacktest = evaluateForwardFollowThroughFromAnchor(
      klines,
      anchorIndex,
      result.direction,
      forwardBars,
    );

    return ResponseDto.success({
      symbol,
      timeframe,
      env,
      evaluateAt,
      anchor: anchorKline
        ? {
            index: anchorIndex,
            timestamp: anchorKline.timestamp,
            close: anchorKline.close,
          }
        : null,
      result,
      forwardBacktest,
      chartKlines: includeKlines ? chartKlines : [],
      klines: includeKlines ? contextWindowKlines : [],
      meta: {
        requestedKlineNum: klineNum,
        actualKlineNum: contextWindowKlines.length,
        actualChartKlineNum: chartKlines.length,
        dropUnclosed,
        includeKlines,
        options: {
          similarTolerance,
          minClarity,
          dominanceGap,
          maxLegs,
          forwardBars,
        },
        availableRange: {
          oldestTimestamp,
          latestTimestamp,
        },
        analyzedRange: {
          newestTimestamp: contextWindowKlines[0]?.timestamp ?? null,
          oldestTimestamp:
            contextWindowKlines[contextWindowKlines.length - 1]?.timestamp ??
            null,
        },
        chartRange: {
          newestTimestamp: chartKlines[0]?.timestamp ?? null,
          oldestTimestamp: chartKlines[chartKlines.length - 1]?.timestamp ?? null,
          forwardBarsIncluded: anchorIndex - forwardStartIndex,
        },
      },
    });
  }
}

function evaluateForwardFollowThroughFromAnchor(
  klines: Array<{ timestamp: string; high: number; low: number }>,
  anchorIndex: number,
  direction: 'up' | 'down' | 'balanced' | 'insufficient_data',
  forwardBars: number,
): ForwardBacktestResult {
  const evaluateAtTime = klines[anchorIndex]?.timestamp ?? null;

  if (direction !== 'up' && direction !== 'down') {
    return {
      direction: null,
      status:
        direction === 'insufficient_data' ? 'insufficient_data' : 'not_applicable',
      evaluateAtTime,
      triggerTime: null,
      triggerPrice: null,
      breakoutReferenceTime: null,
      barsChecked: 0,
      reason:
        direction === 'insufficient_data'
          ? '趋势强弱样本不足，无法执行后续行为回测。'
          : '趋势强弱未形成单边方向，暂不执行后续行为回测。',
    };
  }

  const normalizedForwardBars = Math.max(1, Math.floor(forwardBars));
  const availableForwardBars = Math.min(normalizedForwardBars, anchorIndex);
  if (availableForwardBars <= 0) {
    return {
      direction,
      status: 'insufficient_data',
      evaluateAtTime,
      triggerTime: null,
      triggerPrice: null,
      breakoutReferenceTime: null,
      barsChecked: 0,
      reason: 'evaluateAt 之后没有可用于回测的K线。',
    };
  }

  const newestFutureIndex = anchorIndex - availableForwardBars;
  const firstFutureIndex = anchorIndex - 1;

  for (let i = firstFutureIndex; i >= newestFutureIndex; i--) {
    const current = klines[i];
    const previous = klines[i + 1];
    if (!current || !previous) {
      continue;
    }

    const isPullbackBar =
      direction === 'up'
        ? current.low < previous.low
        : current.high > previous.high;
    if (!isPullbackBar) {
      continue;
    }

    for (let j = i - 1; j >= newestFutureIndex; j--) {
      const candidate = klines[j];
      if (!candidate) {
        continue;
      }
      const triggered =
        direction === 'up'
          ? candidate.high > current.high
          : candidate.low < current.low;
      if (!triggered) {
        continue;
      }

      return {
        direction,
        status: 'triggered',
        evaluateAtTime,
        triggerTime: candidate.timestamp,
        triggerPrice: direction === 'up' ? current.high : current.low,
        breakoutReferenceTime: current.timestamp,
        barsChecked: anchorIndex - j,
        reason:
          direction === 'up'
            ? '回测窗口内出现回调K线，后续价格突破其高点，顺势触发。'
            : '回测窗口内出现反弹K线，后续价格跌破其低点，顺势触发。',
      };
    }

    return {
      direction,
      status: 'waiting_breakout',
      evaluateAtTime,
      triggerTime: null,
      triggerPrice: direction === 'up' ? current.high : current.low,
      breakoutReferenceTime: current.timestamp,
      barsChecked: availableForwardBars,
      reason:
        direction === 'up'
          ? '回测窗口内已出现回调K线，但尚未突破该K线高点。'
          : '回测窗口内已出现反弹K线，但尚未跌破该K线低点。',
    };
  }

  return {
    direction,
    status: 'waiting_pullback',
    evaluateAtTime,
    triggerTime: null,
    triggerPrice: null,
    breakoutReferenceTime: null,
    barsChecked: availableForwardBars,
    reason:
      direction === 'up'
        ? '回测窗口内尚未出现可触发的回调K线。'
        : '回测窗口内尚未出现可触发的反弹K线。',
  };
}
