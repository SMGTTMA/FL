import { Kline } from 'src/types/trading';

export type LegDirection = 'up' | 'down';

export interface SameDirectionMomentumOptions {
  /**
   * 速度变化的容差比例，默认 5%。
   * 例如 0.05 表示变化在 ±5% 内视为“相近”。
   */
  similarTolerance?: number;
}

export interface LegSnapshot {
  direction: LegDirection;
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  bars: number;
  projection: number;
  speed: number;
  /**
   * 该腿被“二段确认反转”确认完成时的K线索引（新->旧索引体系）。
   * null 表示这条腿尚未确认完成（在建腿）。
   */
  confirmedByIndex?: number | null;
}

export type OppositeMomentumDominance =
  | LegDirection
  | 'balanced'
  | 'insufficient_data';

export interface LatestOppositeDirectionMomentumResult {
  strongerSide: OppositeMomentumDominance;
  weakerSide: OppositeMomentumDominance;
  latestDirection: LegDirection | null;
  previousDirection: LegDirection | null;
  latestSpeed: number | null;
  previousSpeed: number | null;
  speedDiff: number | null;
  speedDiffRate: number | null;
  meaning: string;
}

export type ProjectionDepthChangeState =
  | 'increase'
  | 'decrease'
  | 'similar'
  | 'insufficient_data';

export interface ProjectionDepthMetricComparison {
  current: number | null;
  previous: number | null;
  diff: number | null;
  diffRate: number | null;
  state: ProjectionDepthChangeState;
  meaning: string;
}

export interface DirectionProjectionDepthResult {
  direction: LegDirection;
  projection: ProjectionDepthMetricComparison;
  depth: ProjectionDepthMetricComparison;
  hint: string;
}

export interface LatestProjectionDepthAnalysisResult {
  bullish: DirectionProjectionDepthResult;
  bearish: DirectionProjectionDepthResult;
  dominanceHint: string;
}

export interface UnifiedTrendStrengthOptions
  extends SameDirectionMomentumOptions {
  /**
   * 判定“明显”的最小显著度阈值。
   * 显著度使用绝对变化率（abs(rate)）。
   * @default 0.2
   */
  minClarity?: number;
  /**
   * 第一候选与第二候选显著度差值过小时，按优先级选择。
   * @default 0.05
   */
  dominanceGap?: number;
  /**
   * 结构段提取上限，越大越稳但计算略多。
   * @default 24
   */
  maxLegs?: number;
}

export type UnifiedTrendSource = 'momentum' | 'projection' | 'depth' | 'none';
export type UnifiedTrendDirection =
  | LegDirection
  | 'balanced'
  | 'insufficient_data';

export interface UnifiedTrendSignal {
  source: Exclude<UnifiedTrendSource, 'none'>;
  direction: UnifiedTrendDirection;
  clarity: number;
  reason: string;
  qualified: boolean;
}

export interface UnifiedTrendStrengthResult {
  chosenSource: UnifiedTrendSource;
  direction: UnifiedTrendDirection;
  confidence: number;
  reason: string;
  /**
   * 最新已确认腿的确认时间（腿被反转规则确认完成的K线时间）。
   * 该时间可作为后续价格行为验证的锚点。
   */
  lastConfirmedLegTime: string | null;
  followThrough: UnifiedTrendFollowThroughResult;
  momentum: UnifiedTrendSignal;
  projection: UnifiedTrendSignal;
  depth: UnifiedTrendSignal;
  details: {
    momentum: LatestOppositeDirectionMomentumResult;
    projectionDepth: LatestProjectionDepthAnalysisResult;
  };
}

export type UnifiedTrendFollowThroughStatus =
  | 'not_applicable'
  | 'insufficient_data'
  | 'waiting_pullback'
  | 'waiting_breakout'
  | 'triggered';

export interface UnifiedTrendFollowThroughResult {
  direction: LegDirection | null;
  status: UnifiedTrendFollowThroughStatus;
  anchorTime: string | null;
  triggerTime: string | null;
  triggerPrice: number | null;
  reason: string;
}

/**
 * 统一强弱判断（单次结构提取）：
 * 1) 一次提取结构段；
 * 2) 同时计算动量、投影、深度证据；
 * 3) 在“动量优先”的前提下，结合显著度选择最终方向。
 *
 * 决策逻辑：
 * - 动量若明显且具备单边方向，优先采用；
 * - 否则在投影与深度中选择更明显者；
 * - 若都不明显，返回 balanced / insufficient_data。
 */
export function analyzeUnifiedTrendStrength(
  klines: Kline[],
  options: UnifiedTrendStrengthOptions = {},
): UnifiedTrendStrengthResult {
  const {
    similarTolerance = 0.05,
    minClarity = 0.2,
    dominanceGap = 0.05,
    maxLegs = 24,
  } = options;

  const recentLegs = extractRecentLegSnapshots(klines, maxLegs, {
    includeBuildingLeg: false,
  });

  const momentumDetail = analyzeLatestOppositeMomentumFromLegs(
    recentLegs,
    similarTolerance,
  );
  const projectionDepthDetail = analyzeProjectionDepthFromLegs(
    recentLegs,
    similarTolerance,
  );

  const momentumSignal = buildMomentumSignal(momentumDetail, minClarity);
  const projectionSignal = buildProjectionSignal(
    projectionDepthDetail,
    minClarity,
  );
  const depthSignal = buildDepthSignal(projectionDepthDetail, minClarity);

  const chosen = chooseUnifiedSignal(
    [momentumSignal, projectionSignal, depthSignal],
    minClarity,
    dominanceGap,
  );

  const latestConfirmedLeg = recentLegs[recentLegs.length - 1] ?? null;
  const lastConfirmedLegIndex = latestConfirmedLeg?.confirmedByIndex ?? null;
  const lastConfirmedLegTime = resolveKlineTimestamp(klines, lastConfirmedLegIndex);
  const followThrough = analyzeDirectionalFollowThrough(
    klines,
    chosen.direction,
    lastConfirmedLegIndex,
    lastConfirmedLegTime,
  );

  return {
    chosenSource: chosen.source,
    direction: chosen.direction,
    confidence: chosen.confidence,
    reason: chosen.reason,
    lastConfirmedLegTime,
    followThrough,
    momentum: momentumSignal,
    projection: projectionSignal,
    depth: depthSignal,
    details: {
      momentum: momentumDetail,
      projectionDepth: projectionDepthDetail,
    },
  };
}

/**
 * 基于已提取的腿序列，比较“最新腿 vs 紧邻前一反向腿”的动量强弱。
 * - 输入 legs 需按时间“旧 -> 新”排序，最新腿默认取末尾元素。
 * - 速度差变化率在 similarTolerance 容差内时，判定为 balanced。
 * - 超出容差时，speedDiff > 0 视为最新腿方向更强，否则前一反向腿更强。
 * - 当样本不足两条相反方向腿时，返回 insufficient_data。
 */
function analyzeLatestOppositeMomentumFromLegs(
  legs: LegSnapshot[],
  similarTolerance: number,
): LatestOppositeDirectionMomentumResult {
  const pair = extractLatestOppositePairFromLegs(legs);

  if (!pair.latest || !pair.previousOpposite) {
    return {
      strongerSide: 'insufficient_data',
      weakerSide: 'insufficient_data',
      latestDirection: pair.latest?.direction ?? null,
      previousDirection: pair.previousOpposite?.direction ?? null,
      latestSpeed: pair.latest?.speed ?? null,
      previousSpeed: pair.previousOpposite?.speed ?? null,
      speedDiff: null,
      speedDiffRate: null,
      meaning: '最近相反方向动量段不足两段，无法判断哪边强弱。',
    };
  }

  const latest = pair.latest;
  const previous = pair.previousOpposite;
  const speedDiff = latest.speed - previous.speed;
  const speedDiffRate = previous.speed === 0 ? null : speedDiff / previous.speed;

  const isSimilar =
    speedDiffRate !== null
      ? Math.abs(speedDiffRate) <= similarTolerance
      : latest.speed === previous.speed;

  if (isSimilar) {
    return {
      strongerSide: 'balanced',
      weakerSide: 'balanced',
      latestDirection: latest.direction,
      previousDirection: previous.direction,
      latestSpeed: latest.speed,
      previousSpeed: previous.speed,
      speedDiff,
      speedDiffRate,
      meaning: '最近一组相反方向动量速度接近，暂未出现明显强弱差异。',
    };
  }

  if (speedDiff > 0) {
    return {
      strongerSide: latest.direction,
      weakerSide: previous.direction,
      latestDirection: latest.direction,
      previousDirection: previous.direction,
      latestSpeed: latest.speed,
      previousSpeed: previous.speed,
      speedDiff,
      speedDiffRate,
      meaning:
        latest.direction === 'up'
          ? '最近对比中上涨方向动量更强、下跌方向动量更弱。'
          : '最近对比中下跌方向动量更强、上涨方向动量更弱。',
    };
  }

  return {
    strongerSide: previous.direction,
    weakerSide: latest.direction,
    latestDirection: latest.direction,
    previousDirection: previous.direction,
    latestSpeed: latest.speed,
    previousSpeed: previous.speed,
    speedDiff,
    speedDiffRate,
    meaning:
      previous.direction === 'up'
        ? '最近对比中上涨方向动量更强、下跌方向动量更弱。'
        : '最近对比中下跌方向动量更强、上涨方向动量更弱。',
  };
}

/**
 * 基于结构腿序列计算投影/深度变化结果。
 * - 输入 legs 需按时间“旧 -> 新”排序。
 * - 各方向分别提取最近两组可比样本（current vs previous）。
 * - 输出包含上涨/下跌两个方向的投影与深度变化，以及联合提示。
 */
function analyzeProjectionDepthFromLegs(
  legs: LegSnapshot[],
  similarTolerance: number,
): LatestProjectionDepthAnalysisResult {
  const bullishSeries = buildProjectionDepthSeries(legs, 'up');
  const bearishSeries = buildProjectionDepthSeries(legs, 'down');

  const bullishProjection = compareProjectionOrDepth(
    pickLast(bullishSeries.map((item) => item.projection), 0),
    pickLast(bullishSeries.map((item) => item.projection), 1),
    similarTolerance,
    'projection',
  );
  const bullishDepth = compareProjectionOrDepth(
    pickLast(bullishSeries.map((item) => item.depth), 0),
    pickLast(bullishSeries.map((item) => item.depth), 1),
    similarTolerance,
    'depth',
  );

  const bearishProjection = compareProjectionOrDepth(
    pickLast(bearishSeries.map((item) => item.projection), 0),
    pickLast(bearishSeries.map((item) => item.projection), 1),
    similarTolerance,
    'projection',
  );
  const bearishDepth = compareProjectionOrDepth(
    pickLast(bearishSeries.map((item) => item.depth), 0),
    pickLast(bearishSeries.map((item) => item.depth), 1),
    similarTolerance,
    'depth',
  );

  const bullishHint = buildProjectionDepthHint(
    'up',
    bullishProjection.state,
    bullishDepth.state,
  );
  const bearishHint = buildProjectionDepthHint(
    'down',
    bearishProjection.state,
    bearishDepth.state,
  );

  return {
    bullish: {
      direction: 'up',
      projection: bullishProjection,
      depth: bullishDepth,
      hint: bullishHint,
    },
    bearish: {
      direction: 'down',
      projection: bearishProjection,
      depth: bearishDepth,
      hint: bearishHint,
    },
    dominanceHint: buildProjectionDepthDominanceHint(bullishHint, bearishHint),
  };
}

/**
 * 从腿序列中提取“最新腿 + 紧邻的前一反向腿”。
 * - 最新腿取 legs 最后一个元素（时间上最新）。
 * - 若未找到反向腿，previousOpposite 返回 null。
 */
function extractLatestOppositePairFromLegs(legs: LegSnapshot[]): {
  latest: LegSnapshot | null;
  previousOpposite: LegSnapshot | null;
} {
  if (!legs || legs.length === 0) {
    return { latest: null, previousOpposite: null };
  }

  const latest = legs[legs.length - 1];
  for (let i = legs.length - 2; i >= 0; i--) {
    if (legs[i].direction !== latest.direction) {
      return { latest, previousOpposite: legs[i] };
    }
  }

  return { latest, previousOpposite: null };
}

/**
 * 将“最近相反方向动量对比”细节转换为统一信号结构。
 * - clarity 优先使用相对变化率；无变化率时回退到归一化绝对差值。
 * - qualified 代表是否达到最小显著度阈值并形成单边方向。
 */
function buildMomentumSignal(
  detail: LatestOppositeDirectionMomentumResult,
  minClarity: number,
): UnifiedTrendSignal {
  const direction: UnifiedTrendDirection =
    detail.strongerSide === 'up' || detail.strongerSide === 'down'
      ? detail.strongerSide
      : detail.strongerSide;

  const clarity = computeClarityFromRate(
    detail.speedDiffRate,
    detail.speedDiff,
    detail.latestSpeed,
    detail.previousSpeed,
  );

  const qualified =
    (direction === 'up' || direction === 'down') && clarity >= minClarity;

  return {
    source: 'momentum',
    direction,
    clarity,
    reason: detail.meaning,
    qualified,
  };
}

/**
 * 将投影变化细节转换为统一信号结构。
 * - 方向由“上涨投影状态 + 下跌投影状态”联合决定。
 * - clarity 取多空两侧显著度中的较大值。
 */
function buildProjectionSignal(
  detail: LatestProjectionDepthAnalysisResult,
  minClarity: number,
): UnifiedTrendSignal {
  const bullishState = detail.bullish.projection.state;
  const bearishState = detail.bearish.projection.state;
  const direction = classifyProjectionDirection(bullishState, bearishState);
  const clarity = Math.max(
    computeClarityFromRate(
      detail.bullish.projection.diffRate,
      detail.bullish.projection.diff,
      detail.bullish.projection.current,
      detail.bullish.projection.previous,
    ),
    computeClarityFromRate(
      detail.bearish.projection.diffRate,
      detail.bearish.projection.diff,
      detail.bearish.projection.current,
      detail.bearish.projection.previous,
    ),
  );
  const qualified =
    (direction === 'up' || direction === 'down') && clarity >= minClarity;

  return {
    source: 'projection',
    direction,
    clarity,
    reason: `上涨投影=${bullishState}，下跌投影=${bearishState}。`,
    qualified,
  };
}

/**
 * 将深度变化细节转换为统一信号结构。
 * - 深度减小偏强、深度增大偏弱。
 * - clarity 取多空两侧显著度中的较大值。
 */
function buildDepthSignal(
  detail: LatestProjectionDepthAnalysisResult,
  minClarity: number,
): UnifiedTrendSignal {
  const bullishState = detail.bullish.depth.state;
  const bearishState = detail.bearish.depth.state;
  const direction = classifyDepthDirection(bullishState, bearishState);
  const clarity = Math.max(
    computeClarityFromRate(
      detail.bullish.depth.diffRate,
      detail.bullish.depth.diff,
      detail.bullish.depth.current,
      detail.bullish.depth.previous,
    ),
    computeClarityFromRate(
      detail.bearish.depth.diffRate,
      detail.bearish.depth.diff,
      detail.bearish.depth.current,
      detail.bearish.depth.previous,
    ),
  );
  const qualified =
    (direction === 'up' || direction === 'down') && clarity >= minClarity;

  return {
    source: 'depth',
    direction,
    clarity,
    reason: `上涨深度=${bullishState}，下跌深度=${bearishState}。`,
    qualified,
  };
}

/**
 * 根据投影状态推导统一方向：
 * - 仅上涨侧“增大” -> up
 * - 仅下跌侧“增大” -> down
 * - 两侧都不足 -> insufficient_data
 * - 其余 -> balanced
 */
function classifyProjectionDirection(
  bullishState: ProjectionDepthChangeState,
  bearishState: ProjectionDepthChangeState,
): UnifiedTrendDirection {
  if (
    bullishState === 'insufficient_data' &&
    bearishState === 'insufficient_data'
  ) {
    return 'insufficient_data';
  }
  if (bullishState === 'increase' && bearishState !== 'increase') return 'up';
  if (bearishState === 'increase' && bullishState !== 'increase') return 'down';
  return 'balanced';
}

/**
 * 根据深度状态推导统一方向：
 * - 仅上涨侧“减小” -> up
 * - 仅下跌侧“减小” -> down
 * - 两侧都不足 -> insufficient_data
 * - 其余 -> balanced
 */
function classifyDepthDirection(
  bullishState: ProjectionDepthChangeState,
  bearishState: ProjectionDepthChangeState,
): UnifiedTrendDirection {
  if (
    bullishState === 'insufficient_data' &&
    bearishState === 'insufficient_data'
  ) {
    return 'insufficient_data';
  }
  if (bullishState === 'decrease' && bearishState !== 'decrease') return 'up';
  if (bearishState === 'decrease' && bullishState !== 'decrease') return 'down';
  return 'balanced';
}

/**
 * 计算信号显著度（clarity）。
 * - 有相对变化率时直接取 abs(rate)。
 * - 无相对变化率时，用 |diff| / max(|current|, |previous|, epsilon) 归一化。
 */
function computeClarityFromRate(
  rate: number | null,
  diff: number | null,
  current: number | null,
  previous: number | null,
): number {
  if (rate !== null) {
    return Math.abs(rate);
  }
  if (diff === null) {
    return 0;
  }
  const base = Math.max(Math.abs(current ?? 0), Math.abs(previous ?? 0), 1e-8);
  return Math.abs(diff) / base;
}

/**
 * 在动量/投影/深度三个候选信号中选择最终结论。
 * - 先按 clarity 降序，再按优先级（momentum > projection > depth）。
 * - 若领先差距不超过 dominanceGap，则在近似最优集合中按优先级挑选。
 * - 若方向都不成立或显著度不足，则返回 none/balanced/insufficient_data。
 */
function chooseUnifiedSignal(
  signals: UnifiedTrendSignal[],
  minClarity: number,
  dominanceGap: number,
): {
  source: UnifiedTrendSource;
  direction: UnifiedTrendDirection;
  confidence: number;
  reason: string;
} {
  const decisiveSignals = signals.filter(
    (signal) => signal.direction === 'up' || signal.direction === 'down',
  );

  if (decisiveSignals.length === 0) {
    const hasInsufficient = signals.some(
      (signal) => signal.direction === 'insufficient_data',
    );
    return {
      source: 'none',
      direction: hasInsufficient ? 'insufficient_data' : 'balanced',
      confidence: 0,
      reason: hasInsufficient
        ? '样本不足，三类信号都无法形成单边结论。'
        : '三类信号都未给出单边结论。',
    };
  }

  const priority: Record<Exclude<UnifiedTrendSource, 'none'>, number> = {
    momentum: 0,
    projection: 1,
    depth: 2,
  };

  decisiveSignals.sort((a, b) => {
    if (b.clarity !== a.clarity) return b.clarity - a.clarity;
    return priority[a.source] - priority[b.source];
  });

  const top = decisiveSignals[0];
  const second = decisiveSignals[1] ?? null;

  if (top.clarity < minClarity && (!second || second.clarity < minClarity)) {
    return {
      source: 'none',
      direction: 'balanced',
      confidence: top.clarity,
      reason: '三类信号都有方向倾向，但显著度都不足，暂不判定单边。',
    };
  }

  let chosen = top;
  if (second && top.clarity - second.clarity <= dominanceGap) {
    const nearTop = decisiveSignals
      .filter((signal) => top.clarity - signal.clarity <= dominanceGap)
      .sort((a, b) => priority[a.source] - priority[b.source]);
    chosen = nearTop[0];
  }

  return {
    source: chosen.source,
    direction: chosen.direction,
    confidence: chosen.clarity,
    reason: `采用${chosen.source}信号：${chosen.reason}`,
  };
}

/**
 * 提取最近的结构段快照（按时间旧 -> 新排序）。
 * 该方法复用二段确认切分规则，供投影/深度分析使用。
 * - includeBuildingLeg=true 时会包含最后一条在建腿（confirmedByIndex=null）。
 * - includeBuildingLeg=false 时只返回已确认腿，适用于稳定的强弱判定。
 */
function extractRecentLegSnapshots(
  klines: Kline[],
  maxLegs: number,
  options: { includeBuildingLeg?: boolean } = {},
): LegSnapshot[] {
  const { includeBuildingLeg = true } = options;
  if (!klines || klines.length < 2) {
    return [];
  }

  const snapshots: LegSnapshot[] = [];

  type BuildingLeg = {
    direction: LegDirection;
    startIndex: number;
    startPrice: number;
    extremeHigh: number;
    extremeHighIndex: number;
    extremeLow: number;
    extremeLowIndex: number;
    pullbackLow: number | null;
    pullbackHigh: number | null;
    lastConfirmedSwingLow: number | null;
    lastConfirmedSwingHigh: number | null;
  };

  let buildingLeg: BuildingLeg | null = null;

  const pushSnapshot = (snapshot: LegSnapshot): void => {
    snapshots.push(snapshot);
    if (snapshots.length > maxLegs) {
      snapshots.shift();
    }
  };

  for (let newerIndex = klines.length - 2; newerIndex >= 0; newerIndex--) {
    const olderIndex = newerIndex + 1;
    const older = klines[olderIndex];
    const newer = klines[newerIndex];

    if (!buildingLeg) {
      const initialDirection = detectInitialDirection(newer, older);
      if (!initialDirection) {
        continue;
      }
      buildingLeg = createBuildingLegFromSeed(initialDirection, olderIndex, older);
      absorbBarIntoLeg(buildingLeg, newerIndex, newer);
      continue;
    }

    absorbBarIntoLeg(buildingLeg, newerIndex, newer);

    if (buildingLeg.direction === 'up') {
      const breaksPreviousLow = newer.low < older.low;
      const structureLow =
        buildingLeg.lastConfirmedSwingLow ?? buildingLeg.startPrice;
      const breaksStructureLow = newer.low < structureLow;

      if (breaksPreviousLow && breaksStructureLow) {
        pushSnapshot(finalizeLeg(buildingLeg, newerIndex));
        const nextLeg = createBuildingLegFromPivot(
          'down',
          buildingLeg.extremeHighIndex,
          buildingLeg.extremeHigh,
        );
        absorbBarIntoLeg(nextLeg, newerIndex, newer);
        buildingLeg = nextLeg;
      }
      continue;
    }

    const breaksPreviousHigh = newer.high > older.high;
    const structureHigh =
      buildingLeg.lastConfirmedSwingHigh ?? buildingLeg.startPrice;
    const breaksStructureHigh = newer.high > structureHigh;

    if (breaksPreviousHigh && breaksStructureHigh) {
      pushSnapshot(finalizeLeg(buildingLeg, newerIndex));
      const nextLeg = createBuildingLegFromPivot(
        'up',
        buildingLeg.extremeLowIndex,
        buildingLeg.extremeLow,
      );
      absorbBarIntoLeg(nextLeg, newerIndex, newer);
      buildingLeg = nextLeg;
    }
  }

  if (buildingLeg && includeBuildingLeg) {
    pushSnapshot(finalizeLeg(buildingLeg, null));
  }

  return snapshots;
}

/**
 * 构建指定方向的“投影-深度”样本序列。
 * - 每个样本由三段结构组成：前一同向段 -> 中间反向修正段 -> 当前同向段。
 * - 投影比较同向段终点差，深度比较修正段回撤幅度。
 */
function buildProjectionDepthSeries(
  legs: LegSnapshot[],
  direction: LegDirection,
): Array<{ projection: number; depth: number }> {
  const series: Array<{ projection: number; depth: number }> = [];

  for (let i = 0; i < legs.length; i++) {
    if (legs[i].direction !== direction) {
      continue;
    }

    const previousSameIndex = findPreviousSameDirectionIndex(legs, i - 1, direction);
    if (previousSameIndex === -1) {
      continue;
    }

    const correctionIndex = previousSameIndex + 1;
    if (correctionIndex >= i || legs[correctionIndex].direction === direction) {
      continue;
    }

    if (direction === 'up') {
      const projection = legs[i].endPrice - legs[previousSameIndex].endPrice;
      const depth = legs[previousSameIndex].endPrice - legs[correctionIndex].endPrice;
      series.push({ projection, depth });
      continue;
    }

    const projection = legs[previousSameIndex].endPrice - legs[i].endPrice;
    const depth = legs[correctionIndex].endPrice - legs[previousSameIndex].endPrice;
    series.push({ projection, depth });
  }

  return series;
}

/**
 * 从给定起点向前查找上一条同方向腿。
 * - 找到返回索引；未找到返回 -1。
 */
function findPreviousSameDirectionIndex(
  legs: LegSnapshot[],
  startIndex: number,
  direction: LegDirection,
): number {
  for (let i = startIndex; i >= 0; i--) {
    if (legs[i].direction === direction) {
      return i;
    }
  }
  return -1;
}

/**
 * 比较“当前值 vs 前一值”的变化状态。
 * - state: increase/decrease/similar/insufficient_data。
 * - previous=0 时退化为绝对差比较，避免除零。
 */
function compareProjectionOrDepth(
  current: number | null,
  previous: number | null,
  tolerance: number,
  metric: 'projection' | 'depth',
): ProjectionDepthMetricComparison {
  if (current === null || previous === null) {
    return {
      current,
      previous,
      diff: null,
      diffRate: null,
      state: 'insufficient_data',
      meaning: '历史对比样本不足。',
    };
  }

  const diff = current - previous;
  let state: ProjectionDepthChangeState;
  let diffRate: number | null = null;

  if (previous === 0) {
    if (diff === 0) {
      state = 'similar';
    } else {
      state = diff > 0 ? 'increase' : 'decrease';
    }
  } else {
    diffRate = diff / Math.abs(previous);
    if (Math.abs(diffRate) <= tolerance) {
      state = 'similar';
    } else {
      state = diff > 0 ? 'increase' : 'decrease';
    }
  }

  if (metric === 'projection') {
    return {
      current,
      previous,
      diff,
      diffRate,
      state,
      meaning:
        state === 'increase'
          ? '投影增大，是潜在趋势强势的征兆。'
          : state === 'decrease'
            ? '投影减小，是潜在趋势弱势的征兆。'
            : '投影变化不明显，信号偏中性。',
    };
  }

  return {
    current,
    previous,
    diff,
    diffRate,
    state,
    meaning:
      state === 'increase'
        ? '深度增大，是潜在趋势弱势的征兆。'
        : state === 'decrease'
          ? '深度减小，是潜在趋势强势的征兆。'
          : '深度变化不明显，信号偏中性。',
  };
}

/**
 * 将单方向的投影状态与深度状态合成为一句可读提示。
 * - projection 增大 + depth 减小 -> 偏强。
 * - projection 减小 + depth 增大 -> 偏弱。
 * - 其余视为混合信号。
 */
function buildProjectionDepthHint(
  direction: LegDirection,
  projectionState: ProjectionDepthChangeState,
  depthState: ProjectionDepthChangeState,
): string {
  const directionText = direction === 'up' ? '上涨方向' : '下跌方向';

  if (
    projectionState === 'insufficient_data' ||
    depthState === 'insufficient_data'
  ) {
    return `${directionText}样本不足，无法完成投影与深度联合判断。`;
  }

  if (projectionState === 'increase' && depthState === 'decrease') {
    return `${directionText}投影增大且深度减小，潜在偏强势。`;
  }

  if (projectionState === 'decrease' && depthState === 'increase') {
    return `${directionText}投影减小且深度增大，潜在偏弱势。`;
  }

  return `${directionText}投影与深度信号不一致，当前偏混合状态。`;
}

/**
 * 汇总多空两侧 hint，产出联合主导提示。
 * 这是解释层文本，不直接参与最终方向打分。
 */
function buildProjectionDepthDominanceHint(
  bullishHint: string,
  bearishHint: string,
): string {
  const bullishStrong = bullishHint.includes('偏强势');
  const bullishWeak = bullishHint.includes('偏弱势');
  const bearishStrong = bearishHint.includes('偏强势');
  const bearishWeak = bearishHint.includes('偏弱势');

  if (bullishStrong && bearishWeak) {
    return '投影与深度联合信号显示：上涨方向相对更强。';
  }
  if (bearishStrong && bullishWeak) {
    return '投影与深度联合信号显示：下跌方向相对更强。';
  }
  if (bullishStrong && bearishStrong) {
    return '上涨与下跌方向都出现强势特征，需结合结构再确认主导方向。';
  }
  if (bullishWeak && bearishWeak) {
    return '上涨与下跌方向都出现弱势特征，市场可能处于震荡或切换阶段。';
  }
  return '投影与深度联合信号暂未给出单边明确优势。';
}

/**
 * 取数组末尾第 N 个值（fromEnd=0 表示最后一个）。
 * 越界时返回 null。
 */
function pickLast(values: number[], fromEnd: number): number | null {
  const targetIndex = values.length - 1 - fromEnd;
  if (targetIndex < 0 || targetIndex >= values.length) {
    return null;
  }
  return values[targetIndex];
}

/**
 * 将“新->旧索引”映射为K线时间字符串。
 * - index 为空或越界时返回 null。
 */
function resolveKlineTimestamp(
  klines: Kline[],
  index: number | null | undefined,
): string | null {
  if (index === null || index === undefined) {
    return null;
  }
  return klines[index]?.timestamp ?? null;
}

/**
 * 在强弱方向确定后，评估锚点之后的价格是否出现“回调/反弹后突破前一根K线”。
 * - 该方法只做模式状态识别，不直接输出下单指令。
 * - 返回 waiting_pullback / waiting_breakout / triggered 等状态，供上层决策。
 */
function analyzeDirectionalFollowThrough(
  klines: Kline[],
  direction: UnifiedTrendDirection,
  anchorIndex: number | null,
  anchorTime: string | null,
): UnifiedTrendFollowThroughResult {
  if (direction !== 'up' && direction !== 'down') {
    return {
      direction: null,
      status:
        direction === 'insufficient_data' ? 'insufficient_data' : 'not_applicable',
      anchorTime,
      triggerTime: null,
      triggerPrice: null,
      reason:
        direction === 'insufficient_data'
          ? '强弱样本不足，无法评估后续行为。'
          : '强弱未形成单边方向，暂不评估后续行为。',
    };
  }

  if (anchorIndex === null || anchorIndex <= 0) {
    return {
      direction,
      status: 'insufficient_data',
      anchorTime,
      triggerTime: null,
      triggerPrice: null,
      reason: '缺少确认时间锚点或锚点后样本不足，无法评估后续行为。',
    };
  }

  const start = anchorIndex - 1;
  if (start < 1) {
    return {
      direction,
      status: 'insufficient_data',
      anchorTime,
      triggerTime: null,
      triggerPrice: null,
      reason: '锚点后K线数量不足，至少需要两根K线评估突破触发。',
    };
  }

  // 先等“顺势突破前一根K线”的触发模式：
  // up: high > prev.high；down: low < prev.low。
  for (let i = start; i >= 0; i--) {
    if (i + 1 >= klines.length) {
      continue;
    }

    const current = klines[i];
    const previous = klines[i + 1];
    const isPullbackBar =
      direction === 'up'
        ? current.low < previous.low
        : current.high > previous.high;
    if (!isPullbackBar) {
      continue;
    }

    for (let j = i - 1; j >= 0; j--) {
      const candidate = klines[j];
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
        anchorTime,
        triggerTime: candidate.timestamp,
        triggerPrice: direction === 'up' ? current.high : current.low,
        reason:
          direction === 'up'
            ? '锚点后出现回调K线，后续价格向上突破该K线高点，顺势触发。'
            : '锚点后出现反弹K线，后续价格向下突破该K线低点，顺势触发。',
      };
    }

    return {
      direction,
      status: 'waiting_breakout',
      anchorTime,
      triggerTime: null,
      triggerPrice: direction === 'up' ? current.high : current.low,
      reason:
        direction === 'up'
          ? '已出现回调K线，等待后续价格突破该K线高点。'
          : '已出现反弹K线，等待后续价格跌破该K线低点。',
    };
  }

  return {
    direction,
    status: 'waiting_pullback',
    anchorTime,
    triggerTime: null,
    triggerPrice: null,
    reason:
      direction === 'up'
        ? '锚点后尚未出现可用于触发的回调K线。'
        : '锚点后尚未出现可用于触发的反弹K线。',
  };
}

/**
 * 用首个可识别方向的K线创建在建腿。
 * - 上涨腿从 low 起步；下跌腿从 high 起步。
 * - 同时初始化极值与摆动点缓存，供后续二段确认使用。
 */
function createBuildingLegFromSeed(
  direction: LegDirection,
  startIndex: number,
  seed: Kline,
): {
  direction: LegDirection;
  startIndex: number;
  startPrice: number;
  extremeHigh: number;
  extremeHighIndex: number;
  extremeLow: number;
  extremeLowIndex: number;
  pullbackLow: number | null;
  pullbackHigh: number | null;
  lastConfirmedSwingLow: number | null;
  lastConfirmedSwingHigh: number | null;
} {
  if (direction === 'up') {
    return {
      direction,
      startIndex,
      startPrice: seed.low,
      extremeHigh: seed.high,
      extremeHighIndex: startIndex,
      extremeLow: seed.low,
      extremeLowIndex: startIndex,
      pullbackLow: null,
      pullbackHigh: null,
      lastConfirmedSwingLow: null,
      lastConfirmedSwingHigh: null,
    };
  }

  return {
    direction,
    startIndex,
    startPrice: seed.high,
    extremeHigh: seed.high,
    extremeHighIndex: startIndex,
    extremeLow: seed.low,
    extremeLowIndex: startIndex,
    pullbackLow: null,
    pullbackHigh: null,
    lastConfirmedSwingLow: null,
    lastConfirmedSwingHigh: null,
  };
}

/**
 * 在反转确认后，用前一腿极值作为新腿起点创建在建腿。
 * 例如：上升腿结束后，用其最高点作为下跌腿起点。
 */
function createBuildingLegFromPivot(
  direction: LegDirection,
  startIndex: number,
  pivotPrice: number,
): {
  direction: LegDirection;
  startIndex: number;
  startPrice: number;
  extremeHigh: number;
  extremeHighIndex: number;
  extremeLow: number;
  extremeLowIndex: number;
  pullbackLow: number | null;
  pullbackHigh: number | null;
  lastConfirmedSwingLow: number | null;
  lastConfirmedSwingHigh: number | null;
} {
  return {
    direction,
    startIndex,
    startPrice: pivotPrice,
    extremeHigh: pivotPrice,
    extremeHighIndex: startIndex,
    extremeLow: pivotPrice,
    extremeLowIndex: startIndex,
    pullbackLow: null,
    pullbackHigh: null,
    lastConfirmedSwingLow: null,
    lastConfirmedSwingHigh: null,
  };
}

/**
 * 将一根新K线吸收到在建腿，更新极值与摆动点缓存。
 * - 上涨腿：创新高会确认最近回撤低点为 swing low。
 * - 下跌腿：创新低会确认最近反弹高点为 swing high。
 */
function absorbBarIntoLeg(
  leg: {
    direction: LegDirection;
    startIndex: number;
    startPrice: number;
    extremeHigh: number;
    extremeHighIndex: number;
    extremeLow: number;
    extremeLowIndex: number;
    pullbackLow: number | null;
    pullbackHigh: number | null;
    lastConfirmedSwingLow: number | null;
    lastConfirmedSwingHigh: number | null;
  },
  newIndex: number,
  newKline: Kline,
): void {
  if (leg.direction === 'up') {
    if (newKline.high > leg.extremeHigh) {
      // 上升腿出现新高后，前一段回撤低点被确认为最近摆动低点。
      if (leg.pullbackLow !== null) {
        leg.lastConfirmedSwingLow = leg.pullbackLow;
      }
      leg.extremeHigh = newKline.high;
      leg.extremeHighIndex = newIndex;
      leg.pullbackLow = newKline.low;
    } else {
      leg.pullbackLow =
        leg.pullbackLow === null
          ? newKline.low
          : Math.min(leg.pullbackLow, newKline.low);
    }

    if (newKline.low < leg.extremeLow) {
      leg.extremeLow = newKline.low;
      leg.extremeLowIndex = newIndex;
    }
    return;
  }

  if (newKline.low < leg.extremeLow) {
    // 下降腿出现新低后，前一段反弹高点被确认为最近摆动高点。
    if (leg.pullbackHigh !== null) {
      leg.lastConfirmedSwingHigh = leg.pullbackHigh;
    }
    leg.extremeLow = newKline.low;
    leg.extremeLowIndex = newIndex;
    leg.pullbackHigh = newKline.high;
  } else {
    leg.pullbackHigh =
      leg.pullbackHigh === null
        ? newKline.high
        : Math.max(leg.pullbackHigh, newKline.high);
  }

  if (newKline.high > leg.extremeHigh) {
    leg.extremeHigh = newKline.high;
    leg.extremeHighIndex = newIndex;
  }
}

/**
 * 将在建腿固化为可比较的快照。
 * - 终点取方向推进极值（上涨取 extremeHigh，下跌取 extremeLow）。
 * - 速度(斜率) = 投影 / bars。
 */
function finalizeLeg(leg: {
  direction: LegDirection;
  startIndex: number;
  startPrice: number;
  extremeHigh: number;
  extremeHighIndex: number;
  extremeLow: number;
  extremeLowIndex: number;
}, confirmedByIndex: number | null = null): LegSnapshot {
  const endIndex =
    leg.direction === 'up' ? leg.extremeHighIndex : leg.extremeLowIndex;
  const endPrice = leg.direction === 'up' ? leg.extremeHigh : leg.extremeLow;
  const bars = Math.max(1, Math.abs(leg.startIndex - endIndex));
  const projection = Math.abs(endPrice - leg.startPrice);
  const speed = projection / bars;

  return {
    direction: leg.direction,
    startIndex: leg.startIndex,
    endIndex,
    startPrice: leg.startPrice,
    endPrice,
    bars,
    projection,
    speed,
    confirmedByIndex,
  };
}

/**
 * 当还没有在建腿时，基于相邻两根K线判定初始方向。
 * - 优先使用 high/low 同向抬升或下移；
 * - 若不明确，再使用 (high + low) 的中心和做兜底比较。
 */
function detectInitialDirection(
  newer: Kline,
  older: Kline,
): LegDirection | null {
  const strictlyUp =
    newer.high >= older.high &&
    newer.low >= older.low &&
    (newer.high > older.high || newer.low > older.low);
  if (strictlyUp) return 'up';

  const strictlyDown =
    newer.high <= older.high &&
    newer.low <= older.low &&
    (newer.high < older.high || newer.low < older.low);
  if (strictlyDown) return 'down';

  const newerCenterSum = newer.high + newer.low;
  const olderCenterSum = older.high + older.low;
  if (newerCenterSum > olderCenterSum) return 'up';
  if (newerCenterSum < olderCenterSum) return 'down';

  return null;
}
