import { Kline, KeyPoint } from 'src/types/trading';
import { ADX } from 'technicalindicators';
import { calculateEMA } from '../indicators/indicators';

type StablePivot = {
  index: number;
  price: number;
  timestamp: string;
  atr: number;
};

type StableKeyPointCluster = {
  anchor: StablePivot;
  tolerance: number;
  touches: StablePivot[];
};

/**
 * 计算候选拐点当时的局部 ATR。
 *
 * 输入 K 线为「新 -> 旧」，因此每根 K 线的前收盘价在 index + 1。
 * 这里只使用候选点及其更旧的数据，确保候选点确认后不会因为新 K 线
 * 加入而改变 ATR，从而避免关键位反复出现/消失。
 */
function calculateLocalAtr(
  klines: Kline[],
  startIndex: number,
  period: number,
): number | null {
  if (startIndex < 0 || startIndex + period >= klines.length) {
    return null;
  }

  let trueRangeSum = 0;
  for (let i = startIndex; i < startIndex + period; i++) {
    const kline = klines[i];
    const previousClose = klines[i + 1].close;
    const trueRange = Math.max(
      kline.high - kline.low,
      Math.abs(kline.high - previousClose),
      Math.abs(kline.low - previousClose),
    );
    trueRangeSum += trueRange;
  }

  const atr = trueRangeSum / period;
  return Number.isFinite(atr) && atr > 0 ? atr : null;
}

/**
 * 通过 K 线计算稳定关键位（固定锚点 + ATR 反转确认）。
 *
 * 核心约束：
 * 1. 输入必须为「新 -> 旧」，index 0 为当前未收盘 K 线；
 * 2. 只有局部高/低点在后续产生足够大的 ATR 反向波动才算有效触碰；
 * 3. 相近触碰按「旧 -> 新」聚合，并始终使用最早触碰的真实 high/low
 *    作为固定价格，后续触碰只增加 strength，不移动 price；
 * 4. 返回值保持原有 KeyPoint 结构，兼容现有挂单和撤单逻辑。
 */
export function calculateKeyPoints(
  klines: Kline[],
  extArgs: {
    /**
     * 要求测试的次数
     * @default 3
     */
    testCount: number;
    /**
     * 价格波动容差（百分比）
     * @default 0.001 (0.1%)
     */
    priceTolerance?: number;
    /** ATR 周期，默认14 */
    atrPeriod?: number;
    /** 拐点左右各比较多少根K线，默认2 */
    pivotWindow?: number;
    /** 触碰后观察多少根已收盘K线，默认3 */
    reactionBars?: number;
    /** 最小反转幅度（ATR倍数），默认0.8 */
    minReactionAtr?: number;
    /** 同一关键位两次触碰的最小K线间隔，默认4 */
    minTouchGap?: number;
  },
): KeyPoint[] {
  const {
    testCount = 3,
    priceTolerance = 0.001,
    atrPeriod = 14,
    pivotWindow = 2,
    reactionBars = 3,
    minReactionAtr = 0.8,
    minTouchGap = 4,
  } = extArgs || ({} as typeof extArgs);

  const requiredTouches = Math.max(1, Math.floor(testCount));
  const safePriceTolerance = Math.max(0, priceTolerance);
  const safeAtrPeriod = Math.max(1, Math.floor(atrPeriod));
  const safePivotWindow = Math.max(1, Math.floor(pivotWindow));
  const safeReactionBars = Math.max(1, Math.floor(reactionBars));
  const safeMinReactionAtr = Math.max(0, minReactionAtr);
  const safeMinTouchGap = Math.max(1, Math.floor(minTouchGap));

  if (!klines?.length) {
    return [];
  }

  // index 0 是当前未收盘K线，不参与关键位计算。
  const closedKlines = klines.slice(1);
  const startIndex = Math.max(safePivotWindow, safeReactionBars);
  const endIndex =
    closedKlines.length - Math.max(safePivotWindow, safeAtrPeriod) - 1;
  if (startIndex > endIndex) {
    return [];
  }

  const pivots: StablePivot[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const current = closedKlines[i];
    const atr = calculateLocalAtr(closedKlines, i, safeAtrPeriod);
    if (atr == null) {
      continue;
    }

    const neighborKlines = closedKlines.slice(
      i - safePivotWindow,
      i + safePivotWindow + 1,
    );
    const isSupportPivot = neighborKlines.every(
      (kline, offset) => offset === safePivotWindow || current.low < kline.low,
    );
    const isResistancePivot = neighborKlines.every(
      (kline, offset) =>
        offset === safePivotWindow || current.high > kline.high,
    );
    if (!isSupportPivot && !isResistancePivot) {
      continue;
    }

    // 数组为「新 -> 旧」，候选点触碰后的行情位于更小的 index。
    const reactionKlines = closedKlines.slice(i - safeReactionBars, i);
    const minReactionMove = atr * safeMinReactionAtr;

    if (isSupportPivot) {
      const maxHighAfterTouch = Math.max(
        ...reactionKlines.map((kline) => kline.high),
      );
      if (maxHighAfterTouch - current.low >= minReactionMove) {
        pivots.push({
          index: i,
          price: current.low,
          timestamp: current.timestamp,
          atr,
        });
      }
    }

    if (isResistancePivot) {
      const minLowAfterTouch = Math.min(
        ...reactionKlines.map((kline) => kline.low),
      );
      if (current.high - minLowAfterTouch >= minReactionMove) {
        pivots.push({
          index: i,
          price: current.high,
          timestamp: current.timestamp,
          atr,
        });
      }
    }
  }

  // 旧拐点先建立锚点。新增K线只会给已有锚点增加触碰，不会改写其价格。
  pivots.sort((a, b) => b.index - a.index || a.price - b.price);
  const clusters: StableKeyPointCluster[] = [];

  for (const pivot of pivots) {
    const nearbyClusters = clusters
      .map((cluster) => ({
        cluster,
        distanceRatio:
          Math.abs(cluster.anchor.price - pivot.price) / cluster.anchor.price,
      }))
      .filter((item) => item.distanceRatio <= item.cluster.tolerance)
      .sort(
        (a, b) =>
          a.distanceRatio - b.distanceRatio ||
          b.cluster.anchor.index - a.cluster.anchor.index,
      );

    if (nearbyClusters.length === 0) {
      const atrTolerance = (pivot.atr / pivot.price) * 0.5;
      const tolerance = Math.min(
        safePriceTolerance,
        Math.max(safePriceTolerance * 0.25, atrTolerance),
      );
      clusters.push({
        anchor: pivot,
        tolerance,
        touches: [pivot],
      });
      continue;
    }

    const targetCluster = nearbyClusters[0].cluster;
    const lastTouch = targetCluster.touches[targetCluster.touches.length - 1];
    if (lastTouch.index - pivot.index < safeMinTouchGap) {
      continue;
    }
    targetCluster.touches.push(pivot);
  }

  return clusters
    .filter((cluster) => cluster.touches.length >= requiredTouches)
    .map((cluster) => ({
      price: cluster.anchor.price,
      strength: cluster.touches.length,
      timestamps: cluster.touches.map((touch) => touch.timestamp),
    }))
    .sort((a, b) => a.price - b.price);
}

/**
 * 通过k线计算关键位V2版
 * 关键位的定义：
 *  1、该价格反转达到要求的次数
 *  2、前后三根K线的趋势判断：
 *     - 高点：前三根K线高价递增，后三根K线最低价低于当前最低价
 *     - 低点：前三根K线低价递减，后三根K线最高价高于当前最高价
 */
export function calculateKeyPointsV2(
  klines: Kline[],
  extArgs: {
    /**
     * 要求测试的次数
     * @default 3
     */
    testCount: number;
    /**
     * 价格波动容差（百分比）
     * @default 0.001 (0.1%)
     */
    priceTolerance?: number;
  },
): KeyPoint[] {
  const { testCount = 3, priceTolerance = 0.001 } = extArgs;

  // 如果K线数据不足，返回空数组
  if (!klines || klines.length < 7) {
    // 需要至少7根K线（当前+前3+后3）
    return [];
  }

  // 用于存储潜在的关键点位
  const potentialPoints: Map<
    number,
    {
      count: number;
      timestamps: string[];
    }
  > = new Map();

  // 遍历所有K线（从第4根开始，到倒数第4根结束，确保前后各有3根K线）
  for (let i = 3; i < klines.length - 3; i++) {
    const kline = klines[i];
    const { high, low, timestamp } = kline;

    // 获取前后三根K线的数据
    const prev3Klines = klines.slice(i - 3, i);
    const next3Klines = klines.slice(i + 1, i + 4);

    // 判断是否是潜在的支撑位（原有逻辑）
    if (low <= klines[i - 1].low && low <= klines[i + 1].low) {
      const supportPrice = findNearbyPrice(
        potentialPoints,
        low,
        priceTolerance,
      );
      const point = potentialPoints.get(supportPrice) || {
        count: 0,
        timestamps: [],
      };
      point.count++;
      point.timestamps.push(timestamp);
      potentialPoints.set(supportPrice, point);
    }

    // 判断是否是潜在的阻力位（原有逻辑）
    if (high >= klines[i - 1].high && high >= klines[i + 1].high) {
      const resistancePrice = findNearbyPrice(
        potentialPoints,
        high,
        priceTolerance,
      );
      const point = potentialPoints.get(resistancePrice) || {
        count: 0,
        timestamps: [],
      };
      point.count++;
      point.timestamps.push(timestamp);
      potentialPoints.set(resistancePrice, point);
    }

    // 新增：前后三根K线极值比较判断
    // 判断当前K线是否为高点：之前三根K线的高价一个比一个高，之后三根K线的最低价都低于当前价格的最低价
    const prev3Highs = prev3Klines.map((k) => k.high);
    const prev3Lows = prev3Klines.map((k) => k.low);
    const next3MinLow = Math.min(...next3Klines.map((k) => k.low));

    // 检查前三根K线的高价是否递增：prev3Klines[0].high < prev3Klines[1].high < prev3Klines[2].high
    const isPrev3HighsIncreasing =
      prev3Highs[0] < prev3Highs[1] && prev3Highs[1] < prev3Highs[2];

    if (isPrev3HighsIncreasing && next3MinLow < low) {
      const highPrice = findNearbyPrice(potentialPoints, high, priceTolerance);
      const point = potentialPoints.get(highPrice) || {
        count: 0,
        timestamps: [],
      };
      point.count++;
      point.timestamps.push(timestamp);
      potentialPoints.set(highPrice, point);
    }

    // 判断当前K线是否为低点：之前三根K线的最低价一个比一个低，之后三根K线最高价都高于当前价格的最高价
    const next3Highs = next3Klines.map((k) => k.high);
    const next3MaxHigh = Math.max(...next3Highs);

    // 检查前三根K线的最低价是否递减：prev3Klines[0].low > prev3Klines[1].low > prev3Klines[2].low
    const isPrev3LowsDecreasing =
      prev3Lows[0] > prev3Lows[1] && prev3Lows[1] > prev3Lows[2];

    if (isPrev3LowsDecreasing && next3MaxHigh > high) {
      const lowPrice = findNearbyPrice(potentialPoints, low, priceTolerance);
      const point = potentialPoints.get(lowPrice) || {
        count: 0,
        timestamps: [],
      };
      point.count++;
      point.timestamps.push(timestamp);
      potentialPoints.set(lowPrice, point);
    }
  }

  // 转换为关键点位数组，并按强度排序
  const keyPoints: KeyPoint[] = Array.from(potentialPoints.entries())
    .filter(([price, point]) => point.count >= testCount)
    .map(([price, point]) => ({
      price,
      strength: point.count,
      timestamps: point.timestamps,
    }));

  return keyPoints;
}

/**
 * 通过 K 线计算普通关键位（V3，锚点驱动）
 *
 * 核心思想（不做数学漂移）：
 * 1. 先在“近期窗口”里找反转锚点（局部高/低点 + 触及后快速反向）
 * 2. 锚点价格固定，不因历史数据做平均/加权而移动
 * 3. 再向历史回溯，验证该锚点价位是否被市场重复触及并出现反应
 * 4. 普通关键位：达到 3 次有效触及（锚点1次 + 历史2次）才确认
 * 5. 明显高/低点：若触及后出现“剧烈反向反应”，即使未满3次也直接入选
 *
 * 输入约束：
 * - klines 必须是「从新到旧」顺序（index 越小越新）
 *
 * 输出约束：
 * - 普通关键位 strength = 3
 * - 明显高/低点 strength = 实际记录到的有效触及次数（1~3）
 * - 本方法只产出“关键位价格”，不在这里固化支撑/阻力属性
 *
 * 参数说明：
 * - priceTolerance: 触及价位时允许的相对误差（容差带）
 * - reactionLookahead: 触及后回看多少根更“新”的 K 线来确认反应
 * - reactionThreshold: 触及后价格离开该位的最小幅度
 * - minTouchGap: 同一关键位两次有效触及的最小 K 线间隔
 * - recentWindowRatio: 只在近期窗口里寻找“锚点”，保证关键位贴近近端结构
 * - obviousReactionMultiplier: “明显高/低点”阈值倍数，剧烈反应阈值 = reactionThreshold * 该倍数
 * - applyRegimeFilter: 是否按市场阶段过滤关键位（默认开启）
 * - regimeBreakoutBuffer: 横盘边界突破缓冲（避免刚好贴边时误判）
 * - regimeBreakoutConfirmBars: 连续收盘突破多少根后视为新趋势
 * - regimeRecentPivotBars: 在突破阶段保留“新拐点”时允许的最近根数
 *
 * 说明：
 * - 默认会在基础关键位输出后，按市场阶段（横盘/突破/趋势）做二次过滤
 */
export function calculateKeyPointsV3(
  klines: Kline[],
  extArgs?: {
    /**
     * 价格容差（相对误差）
     * @default 0.0015 (0.15%)
     */
    priceTolerance?: number;
    /**
     * 触及后用于判断“快速反应”的观察根数（朝更新方向看）
     * @default 4
     */
    reactionLookahead?: number;
    /**
     * 触及后最小反应幅度（相对价格）
     * @default 0.004 (0.4%)
     */
    reactionThreshold?: number;
    /**
     * 同一价位两次有效触及的最小间隔（K 线根数）
     * @default 3
     */
    minTouchGap?: number;
    /**
     * 近期窗口比例（用于“近端优先但不过度集中”）
     * @default 0.4
     */
    recentWindowRatio?: number;
    /**
     * 明显高/低点的剧烈反应倍数阈值
     * @default 2
     */
    obviousReactionMultiplier?: number;
    /**
     * 是否按市场阶段过滤关键位
     * @default true
     */
    applyRegimeFilter?: boolean;
    /**
     * 横盘边界突破缓冲
     * @default 0.002 (0.2%)
     */
    regimeBreakoutBuffer?: number;
    /**
     * 连续收盘突破确认根数
     * @default 3
     */
    regimeBreakoutConfirmBars?: number;
    /**
     * 突破阶段保留最近新拐点的根数
     * @default 12
     */
    regimeRecentPivotBars?: number;
  },
): KeyPoint[] {
  const {
    priceTolerance = 0.0015,
    reactionLookahead = 4,
    reactionThreshold = 0.004,
    minTouchGap = 3,
    recentWindowRatio = 0.4,
    obviousReactionMultiplier = 2,
    applyRegimeFilter = true,
    regimeBreakoutBuffer = 0.002,
    regimeBreakoutConfirmBars = 3,
    regimeRecentPivotBars = 12,
  } = extArgs || {};

  // 固定普通关键位只统计 3 次有效触及
  const REQUIRED_TOUCHES = 3;

  // 最小长度保护：既要能形成局部极值（前后邻居），又要有反应观察窗口
  const minLength = reactionLookahead + 7;
  if (!klines || klines.length < minLength) {
    return [];
  }

  type TouchPoint = {
    index: number;
    timestamp: string;
  };
  type LevelKind = 'normal' | 'obvious';
  type ConfirmedLevel = {
    anchorIndex: number;
    kind: LevelKind;
    keyPoint: KeyPoint;
  };

  // 扫描区间：
  // - i 从 1 开始，确保 i-1 存在（用于局部极值比较）
  // - 到 length-2 结束，确保 i+1 存在
  const startIndex = 1;
  const endIndex = klines.length - 2;
  if (startIndex > endIndex) {
    return [];
  }

  const scanCount = endIndex - startIndex + 1;
  const safeRecentRatio = Math.min(Math.max(recentWindowRatio, 0.1), 0.8);
  const recentWindowSize = Math.max(1, Math.floor(scanCount * safeRecentRatio));
  const recentEndIndex = Math.min(endIndex, startIndex + recentWindowSize - 1);

  const getReactionCandles = (index: number): Kline[] => {
    // 在「新 -> 旧」数组中，某点“触及后”的走势是更“新”的区间：
    // [index - reactionLookahead, index - 1]
    const reactionStart = Math.max(0, index - reactionLookahead);
    return klines.slice(reactionStart, index);
  };

  const hasMoveAwayFromLevel = (index: number, levelPrice: number): boolean => {
    const reactionCandles = getReactionCandles(index);
    if (reactionCandles.length === 0 || levelPrice <= 0) {
      return false;
    }
    const maxHigh = Math.max(...reactionCandles.map((k) => k.high));
    const minLow = Math.min(...reactionCandles.map((k) => k.low));
    // 不预设方向，只要离开该价位足够远即可视为“有反应”
    const upMove = (maxHigh - levelPrice) / levelPrice;
    const downMove = (levelPrice - minLow) / levelPrice;
    return Math.max(upMove, downMove) >= reactionThreshold;
  };

  const isTouchedLevel = (kline: Kline, levelPrice: number): boolean => {
    const lower = levelPrice * (1 - priceTolerance);
    const upper = levelPrice * (1 + priceTolerance);
    // 只要 K 线区间与关键位容差带相交，即视为触及
    return kline.low <= upper && kline.high >= lower;
  };

  const collectHistoricalTouches = (
    anchorIndex: number,
    anchorPrice: number,
  ): TouchPoint[] => {
    // 第一次触及固定为锚点本身
    const touches: TouchPoint[] = [
      {
        index: anchorIndex,
        timestamp: klines[anchorIndex].timestamp,
      },
    ];

    let lastAcceptedIndex = anchorIndex;
    for (let j = anchorIndex + 1; j <= endIndex; j++) {
      if (touches.length >= REQUIRED_TOUCHES) {
        // 达到 3 次即停止；普通关键位不继续累计更多触及
        break;
      }
      // 避免同一段短周期震荡被重复统计为多次触及
      if (j - lastAcceptedIndex < minTouchGap) {
        continue;
      }
      // 必须“碰到容差带”
      if (!isTouchedLevel(klines[j], anchorPrice)) {
        continue;
      }
      // 且碰到后要出现有效离开，避免把无效噪音算作测试
      if (!hasMoveAwayFromLevel(j, anchorPrice)) {
        continue;
      }
      touches.push({
        index: j,
        timestamp: klines[j].timestamp,
      });
      lastAcceptedIndex = j;
    }

    return touches;
  };

  const confirmedLevels: ConfirmedLevel[] = [];

  const appendLevel = (
    anchorIndex: number,
    kind: LevelKind,
    anchorPrice: number,
    strength: number,
    touches: TouchPoint[],
  ): void => {
    const keyPoint: KeyPoint = {
      // 锚点价格固定为最新反转点价格，不随历史触及漂移
      price: anchorPrice,
      strength,
      timestamps: touches.map((t) => t.timestamp),
    };

    // 去重策略：
    // 容差内视作同一关键位；优先保留更强点位，强度相同再保留更近（更新）锚点
    const existedIdx = confirmedLevels.findIndex(
      (level) =>
        Math.abs(level.keyPoint.price - anchorPrice) / anchorPrice <=
        priceTolerance,
    );
    if (existedIdx === -1) {
      confirmedLevels.push({ anchorIndex, kind, keyPoint });
      return;
    }
    const existed = confirmedLevels[existedIdx];
    if (strength > existed.keyPoint.strength) {
      confirmedLevels[existedIdx] = { anchorIndex, kind, keyPoint };
      return;
    }
    if (
      strength === existed.keyPoint.strength &&
      anchorIndex < existed.anchorIndex
    ) {
      confirmedLevels[existedIdx] = { anchorIndex, kind, keyPoint };
    }
  };

  // Step 1：仅在近期窗口内寻找“反转锚点”
  // 目的：关键位优先贴近最近市场结构，而不是从很久以前开始选点
  for (let i = startIndex; i <= recentEndIndex; i++) {
    const current = klines[i];
    const newer = klines[i - 1];
    const older = klines[i + 1];
    const reactionCandles = getReactionCandles(i);
    if (reactionCandles.length === 0) {
      continue;
    }

    // 局部低点 / 局部高点候选（拐点候选）
    const isSupportPivot = current.low <= newer.low && current.low <= older.low;
    const isResistancePivot =
      current.high >= newer.high && current.high >= older.high;

    if (isSupportPivot) {
      const maxHighAfterTouch = Math.max(...reactionCandles.map((k) => k.high));
      const bounceMove = (maxHighAfterTouch - current.low) / current.low;
      const hasBounce = bounceMove >= reactionThreshold;
      const isObviousPivot =
        bounceMove >= reactionThreshold * obviousReactionMultiplier;
      if (hasBounce) {
        // Step 2：锚点确认后，向历史收集触及（锚点价固定，不漂移）
        const touches = collectHistoricalTouches(i, current.low);
        if (isObviousPivot && touches.length >= 1) {
          // 明显低点：不要求必须满 3 次测试
          appendLevel(i, 'obvious', current.low, touches.length, touches);
        } else if (touches.length === REQUIRED_TOUCHES) {
          // 普通关键位：3 次有效触及才确认
          appendLevel(
            i,
            'normal',
            current.low,
            REQUIRED_TOUCHES,
            touches,
          );
        }
      }
    }

    if (isResistancePivot) {
      const minLowAfterTouch = Math.min(...reactionCandles.map((k) => k.low));
      const dropMove = (current.high - minLowAfterTouch) / current.high;
      const hasDrop = dropMove >= reactionThreshold;
      const isObviousPivot =
        dropMove >= reactionThreshold * obviousReactionMultiplier;
      if (hasDrop) {
        // Step 2：锚点确认后，向历史收集触及（锚点价固定，不漂移）
        const touches = collectHistoricalTouches(i, current.high);
        if (isObviousPivot && touches.length >= 1) {
          // 明显高点：不要求必须满 3 次测试
          appendLevel(i, 'obvious', current.high, touches.length, touches);
        } else if (touches.length === REQUIRED_TOUCHES) {
          // 普通关键位：3 次有效触及才确认
          appendLevel(
            i,
            'normal',
            current.high,
            REQUIRED_TOUCHES,
            touches,
          );
        }
      }
    }
  }

  // Step 4：先输出基础关键位
  const baseKeyPoints = confirmedLevels
    .sort((a, b) => a.anchorIndex - b.anchorIndex)
    .map((level) => level.keyPoint);

  // Step 5：按市场阶段二次过滤（横盘中只留上下沿；突破后保留新拐点）
  if (!applyRegimeFilter) {
    return baseKeyPoints;
  }

  return filterKeyPointsByMarketRegime(baseKeyPoints, klines, {
    priceTolerance,
    breakoutBuffer: regimeBreakoutBuffer,
    breakoutConfirmBars: regimeBreakoutConfirmBars,
    recentPivotBars: regimeRecentPivotBars,
  });
}

/**
 * 按最新收盘价动态划分关键位（支撑/阻力）
 *
 * 使用方式：
 * - 先由 calculateKeyPointsV3 得到“中性关键位”（只有 price/strength/timestamps）
 * - 再用本函数按“当前最新收盘价”动态划分：
 *   - keyPoint.price < latestClose  => 支撑
 *   - keyPoint.price > latestClose  => 阻力
 *
 * 这样做的原因：
 * - 同一价格在不同时期可能角色互换（支撑变阻力、阻力变支撑）
 * - 因此不在计算阶段固定属性，而在使用阶段按当前价格关系动态判断
 */
export function classifyKeyPointsByLatestClose(
  keyPoints: KeyPoint[],
  latestClose: number,
): { supports: KeyPoint[]; resistances: KeyPoint[] } {
  if (latestClose <= 0) {
    throw new Error('latestClose 必须大于0');
  }

  return {
    supports: keyPoints.filter((kp) => kp.price < latestClose),
    resistances: keyPoints.filter((kp) => kp.price > latestClose),
  };
}

/**
 * 横盘识别结果
 */
export interface SidewaysRangeDetection {
  isSideways: boolean;
  rangeHigh: number | null;
  rangeLow: number | null;
  upperTouches: number;
  lowerTouches: number;
  confidence: number;
  reasons: string[];
}

/**
 * 检测近期是否处于横盘区间
 *
 * 输入要求：
 * - klines 必须是「从新到旧」顺序（index 越小越新）
 *
 * 识别思路（贴近盘面）：
 * 1. 先看区间宽度是否收敛到可接受范围
 * 2. 再看 EMA20/EMA50 是否贴合且走平（趋势衰减）
 * 3. 再看上沿/下沿是否都被反复触碰
 * 4. 再看价格是否有中轴往返（不是单边）
 */
export function detectSidewaysRange(
  klines: Kline[],
  options?: {
    /**
     * 横盘识别窗口（最近 N 根）
     * @default 60
     */
    windowSize?: number;
    /**
     * 区间最大宽度阈值（(HH-LL)/mid）
     * @default 0.12 (12%)
     */
    maxRangeRatio?: number;
    /**
     * 上下沿最少触碰次数
     * @default 2
     */
    minTouchesEachSide?: number;
    /**
     * 边界触碰容差
     * @default 0.003 (0.3%)
     */
    touchTolerance?: number;
    /**
     * EMA20/EMA50 最大距离阈值（相对 mid）
     * @default 0.015 (1.5%)
     */
    maxEmaDiffRatio?: number;
    /**
     * EMA 斜率最大阈值（相对 mid）
     * @default 0.006 (0.6%)
     */
    maxEmaSlopeRatio?: number;
    /**
     * EMA 斜率回看根数
     * @default 5
     */
    emaSlopeLookback?: number;
    /**
     * 中轴最少穿越次数
     * @default 3
     */
    minMidlineCrosses?: number;
    /**
     * 触碰去重的最小间隔（K 线根数）
     * @default 2
     */
    minTouchGap?: number;
  },
): SidewaysRangeDetection {
  const {
    windowSize = 60,
    maxRangeRatio = 0.12,
    minTouchesEachSide = 2,
    touchTolerance = 0.003,
    maxEmaDiffRatio = 0.015,
    maxEmaSlopeRatio = 0.006,
    emaSlopeLookback = 5,
    minMidlineCrosses = 3,
    minTouchGap = 2,
  } = options || {};

  if (!klines || klines.length < Math.max(windowSize, 20)) {
    return {
      isSideways: false,
      rangeHigh: null,
      rangeLow: null,
      upperTouches: 0,
      lowerTouches: 0,
      confidence: 0,
      reasons: ['K线数量不足，无法识别横盘'],
    };
  }

  const windowKlines = klines.slice(0, windowSize);
  const highs = windowKlines.map((k) => k.high);
  const lows = windowKlines.map((k) => k.low);
  const closes = windowKlines.map((k) => k.close);

  const hh = Math.max(...highs);
  const ll = Math.min(...lows);
  const mid = (hh + ll) / 2;
  if (mid <= 0) {
    return {
      isSideways: false,
      rangeHigh: null,
      rangeLow: null,
      upperTouches: 0,
      lowerTouches: 0,
      confidence: 0,
      reasons: ['价格异常，无法识别横盘'],
    };
  }

  const rangeRatio = (hh - ll) / mid;

  // EMA 计算要求 old -> new，这里将「新 -> 旧」转为「旧 -> 新」，且不修改原数组
  const closesOldToNew = closes.toReversed();
  const ema20Now = calculateEMA(closesOldToNew, 20);
  const ema50Now = calculateEMA(closesOldToNew, 50);

  const closesLookbackOldToNew = windowKlines
    .slice(emaSlopeLookback)
    .map((k) => k.close)
    .toReversed();
  const ema20Prev = calculateEMA(closesLookbackOldToNew, 20);
  const ema50Prev = calculateEMA(closesLookbackOldToNew, 50);

  const emaDiffRatio =
    ema20Now != null && ema50Now != null
      ? Math.abs(ema20Now - ema50Now) / mid
      : Number.POSITIVE_INFINITY;
  const ema20SlopeRatio =
    ema20Now != null && ema20Prev != null
      ? Math.abs(ema20Now - ema20Prev) / mid
      : Number.POSITIVE_INFINITY;
  const ema50SlopeRatio =
    ema50Now != null && ema50Prev != null
      ? Math.abs(ema50Now - ema50Prev) / mid
      : Number.POSITIVE_INFINITY;

  const upperBandLower = hh * (1 - touchTolerance);
  const lowerBandUpper = ll * (1 + touchTolerance);

  const countDistinctTouches = (indices: number[]): number => {
    if (indices.length === 0) return 0;
    let count = 1;
    let lastIndex = indices[0];
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] - lastIndex >= minTouchGap) {
        count++;
        lastIndex = indices[i];
      }
    }
    return count;
  };

  // index 越小越新，这里按遍历顺序收集后天然升序
  const upperTouchIndices: number[] = [];
  const lowerTouchIndices: number[] = [];
  const upperTouchPrices: number[] = [];
  const lowerTouchPrices: number[] = [];

  for (let i = 0; i < windowKlines.length; i++) {
    const k = windowKlines[i];
    if (k.high >= upperBandLower) {
      upperTouchIndices.push(i);
      upperTouchPrices.push(k.high);
    }
    if (k.low <= lowerBandUpper) {
      lowerTouchIndices.push(i);
      lowerTouchPrices.push(k.low);
    }
  }

  const upperTouches = countDistinctTouches(upperTouchIndices);
  const lowerTouches = countDistinctTouches(lowerTouchIndices);

  // 用触碰簇的中位数做边界，避免单根插针影响
  const getMedian = (arr: number[]): number | null => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const rangeHigh = getMedian(upperTouchPrices) ?? hh;
  const rangeLow = getMedian(lowerTouchPrices) ?? ll;

  // 中轴往返：统计收盘价对中轴的穿越次数
  const midlineEps = (hh - ll) * 0.02;
  let midlineCrosses = 0;
  let prevSide: -1 | 0 | 1 = 0;
  for (let i = windowKlines.length - 1; i >= 0; i--) {
    const close = windowKlines[i].close;
    let side: -1 | 0 | 1 = 0;
    if (close > mid + midlineEps) side = 1;
    else if (close < mid - midlineEps) side = -1;
    if (prevSide !== 0 && side !== 0 && side !== prevSide) {
      midlineCrosses++;
    }
    if (side !== 0) {
      prevSide = side;
    }
  }

  const reasons: string[] = [];
  let passed = 0;
  const total = 5;

  if (rangeRatio <= maxRangeRatio) {
    passed++;
    reasons.push(`区间宽度受控(${(rangeRatio * 100).toFixed(2)}%)`);
  }

  if (emaDiffRatio <= maxEmaDiffRatio) {
    passed++;
    reasons.push(`EMA20/50贴合(${(emaDiffRatio * 100).toFixed(2)}%)`);
  }

  if (ema20SlopeRatio <= maxEmaSlopeRatio && ema50SlopeRatio <= maxEmaSlopeRatio) {
    passed++;
    reasons.push(
      `EMA走平(ema20:${(ema20SlopeRatio * 100).toFixed(2)}%, ema50:${(ema50SlopeRatio * 100).toFixed(2)}%)`,
    );
  }

  if (upperTouches >= minTouchesEachSide && lowerTouches >= minTouchesEachSide) {
    passed++;
    reasons.push(`上下沿触碰充足(上:${upperTouches}, 下:${lowerTouches})`);
  }

  if (midlineCrosses >= minMidlineCrosses) {
    passed++;
    reasons.push(`中轴往返明显(${midlineCrosses}次)`);
  }

  // 满足 4/5 视为横盘；置信度用于外层调参观察
  const confidence = Number((passed / total).toFixed(2));
  const isSideways = passed >= 4;
  if (!isSideways && reasons.length === 0) {
    reasons.push('横盘特征不足');
  }

  return {
    isSideways,
    rangeHigh,
    rangeLow,
    upperTouches,
    lowerTouches,
    confidence,
    reasons,
  };
}

/**
 * 根据横盘识别结果过滤关键位
 *
 * 规则：
 * - 非横盘：返回原始关键位
 * - 横盘：只保留区间上沿阻力与下沿支撑（两条线）
 */
export function filterKeyPointsBySidewaysRange(
  keyPoints: KeyPoint[],
  range: SidewaysRangeDetection,
  options?: {
    /**
     * 关键位与区间边界的匹配容差
     * @default 0.003 (0.3%)
     */
    priceTolerance?: number;
  },
): KeyPoint[] {
  const { priceTolerance = 0.003 } = options || {};
  if (!range.isSideways || range.rangeHigh == null || range.rangeLow == null) {
    return keyPoints;
  }

  const pickNearest = (target: number): KeyPoint | null => {
    if (keyPoints.length === 0) return null;
    const near = keyPoints
      .filter((kp) => Math.abs(kp.price - target) / target <= priceTolerance)
      .sort((a, b) => Math.abs(a.price - target) - Math.abs(b.price - target))[0];
    return near || null;
  };

  const support =
    pickNearest(range.rangeLow) ||
    ({
      price: range.rangeLow,
      strength: Math.max(1, range.lowerTouches),
      timestamps: [],
    } as KeyPoint);

  const resistance =
    pickNearest(range.rangeHigh) ||
    ({
      price: range.rangeHigh,
      strength: Math.max(1, range.upperTouches),
      timestamps: [],
    } as KeyPoint);

  return [support, resistance].sort((a, b) => a.price - b.price);
}

/**
 * 市场阶段（结合横盘区间）
 */
export type MarketRegime =
  | 'no_sideways_context'
  | 'sideways_active'
  | 'breakout_pending'
  | 'trend_active';

/**
 * 市场阶段识别结果
 */
export interface MarketRegimeDetection {
  regime: MarketRegime;
  breakoutDirection: 'up' | 'down' | null;
  consecutiveBreakoutCloses: number;
  breakoutStartIndex: number | null;
  reasons: string[];
}

/**
 * 基于横盘区间识别当前市场阶段
 *
 * 规则：
 * - 当前价仍在区间内：sideways_active
 * - 刚突破但连续收盘不足：breakout_pending
 * - 连续收盘突破达到确认根数：trend_active
 */
export function detectMarketRegimeFromSidewaysRange(
  klines: Kline[],
  range: SidewaysRangeDetection,
  options?: {
    /**
     * 横盘边界突破缓冲，避免贴边误判
     * @default 0.002 (0.2%)
     */
    breakoutBuffer?: number;
    /**
     * 连续收盘突破确认根数
     * @default 3
     */
    breakoutConfirmBars?: number;
  },
): MarketRegimeDetection {
  const { breakoutBuffer = 0.002, breakoutConfirmBars = 3 } = options || {};

  if (
    !range.isSideways ||
    range.rangeHigh == null ||
    range.rangeLow == null ||
    !klines ||
    klines.length === 0
  ) {
    return {
      regime: 'no_sideways_context',
      breakoutDirection: null,
      consecutiveBreakoutCloses: 0,
      breakoutStartIndex: null,
      reasons: ['无可用横盘区间'],
    };
  }

  const upperBreak = range.rangeHigh * (1 + breakoutBuffer);
  const lowerBreak = range.rangeLow * (1 - breakoutBuffer);
  const latestClose = klines[0].close;

  if (latestClose <= upperBreak && latestClose >= lowerBreak) {
    return {
      regime: 'sideways_active',
      breakoutDirection: null,
      consecutiveBreakoutCloses: 0,
      breakoutStartIndex: null,
      reasons: ['最新收盘仍在横盘区间内'],
    };
  }

  const direction: 'up' | 'down' = latestClose > upperBreak ? 'up' : 'down';
  let consecutiveBreakoutCloses = 0;
  for (let i = 0; i < klines.length; i++) {
    const close = klines[i].close;
    const stillOutside =
      direction === 'up' ? close > upperBreak : close < lowerBreak;
    if (!stillOutside) {
      break;
    }
    consecutiveBreakoutCloses++;
  }

  const breakoutStartIndex =
    consecutiveBreakoutCloses > 0 ? consecutiveBreakoutCloses - 1 : null;

  if (consecutiveBreakoutCloses >= breakoutConfirmBars) {
    return {
      regime: 'trend_active',
      breakoutDirection: direction,
      consecutiveBreakoutCloses,
      breakoutStartIndex,
      reasons: [
        `已连续${consecutiveBreakoutCloses}根收盘突破，趋势已确认`,
      ],
    };
  }

  return {
    regime: 'breakout_pending',
    breakoutDirection: direction,
    consecutiveBreakoutCloses,
    breakoutStartIndex,
    reasons: [`突破中，连续收盘仅${consecutiveBreakoutCloses}根`],
  };
}

/**
 * 按市场阶段过滤关键位
 *
 * 目标：
 * - 横盘中：只保留上沿阻力与下沿支撑
 * - 突破确认前：保留上下沿 + 最近新拐点（突破方向）
 * - 趋势已确认：保留突破方向的新拐点 + 被突破边界（回踩/反抽参考）
 */
export function filterKeyPointsByMarketRegime(
  keyPoints: KeyPoint[],
  klines: Kline[],
  options?: {
    /**
     * 关键位容差（也用于边界匹配）
     * @default 0.003 (0.3%)
     */
    priceTolerance?: number;
    /**
     * 横盘识别参数透传
     */
    rangeOptions?: Parameters<typeof detectSidewaysRange>[1];
    /**
     * 突破缓冲
     * @default 0.002
     */
    breakoutBuffer?: number;
    /**
     * 突破确认根数
     * @default 3
     */
    breakoutConfirmBars?: number;
    /**
     * 仅保留最近多少根内的新拐点
     * @default 12
     */
    recentPivotBars?: number;
  },
): KeyPoint[] {
  const {
    priceTolerance = 0.003,
    rangeOptions,
    breakoutBuffer = 0.002,
    breakoutConfirmBars = 3,
    recentPivotBars = 12,
  } = options || {};

  if (!klines || klines.length === 0 || keyPoints.length === 0) {
    return keyPoints;
  }

  const range = detectSidewaysRange(klines, rangeOptions);
  const regime = detectMarketRegimeFromSidewaysRange(klines, range, {
    breakoutBuffer,
    breakoutConfirmBars,
  });

  if (regime.regime === 'no_sideways_context') {
    return keyPoints;
  }

  const rangeOnly = filterKeyPointsBySidewaysRange(keyPoints, range, {
    priceTolerance,
  });

  if (regime.regime === 'sideways_active') {
    return rangeOnly;
  }

  const indexByTimestamp = new Map<string, number>();
  for (let i = 0; i < klines.length; i++) {
    indexByTimestamp.set(klines[i].timestamp, i);
  }

  const withAnchorIndex = keyPoints.map((kp) => ({
    keyPoint: kp,
    // V3 中 timestamps[0] 是锚点；缺失时视作非常旧
    anchorIndex:
      kp.timestamps.length > 0
        ? (indexByTimestamp.get(kp.timestamps[0]) ?? Number.POSITIVE_INFINITY)
        : Number.POSITIVE_INFINITY,
  }));

  const nearPrice = (price: number, target: number): boolean =>
    Math.abs(price - target) / target <= priceTolerance;

  const ensureBoundaryKeyPoint = (
    target: number,
    fallbackStrength: number,
  ): KeyPoint => {
    const existed = keyPoints
      .filter((kp) => nearPrice(kp.price, target))
      .sort(
        (a, b) => Math.abs(a.price - target) - Math.abs(b.price - target),
      )[0];
    if (existed) return existed;
    return {
      price: target,
      strength: Math.max(1, fallbackStrength),
      timestamps: [],
    };
  };

  const dedupeByTolerance = (points: KeyPoint[]): KeyPoint[] => {
    const result: KeyPoint[] = [];
    for (const point of points) {
      const existedIdx = result.findIndex((r) => nearPrice(r.price, point.price));
      if (existedIdx === -1) {
        result.push(point);
        continue;
      }
      if (point.strength > result[existedIdx].strength) {
        result[existedIdx] = point;
      }
    }
    return result;
  };

  if (range.rangeHigh == null || range.rangeLow == null) {
    return keyPoints;
  }

  const direction = regime.breakoutDirection;
  if (!direction) {
    return rangeOnly;
  }

  const upperThreshold = range.rangeHigh * (1 + priceTolerance);
  const lowerThreshold = range.rangeLow * (1 - priceTolerance);

  const recentBreakoutPivots = withAnchorIndex
    .filter((item) => item.anchorIndex <= recentPivotBars)
    .filter((item) =>
      direction === 'up'
        ? item.keyPoint.price >= upperThreshold
        : item.keyPoint.price <= lowerThreshold,
    )
    .map((item) => item.keyPoint);

  const rangeLowPoint = ensureBoundaryKeyPoint(
    range.rangeLow,
    range.lowerTouches,
  );
  const rangeHighPoint = ensureBoundaryKeyPoint(
    range.rangeHigh,
    range.upperTouches,
  );

  if (regime.regime === 'breakout_pending') {
    // 突破确认前：保留两侧边界（风控+结构）并加入最近新拐点
    return dedupeByTolerance([
      rangeLowPoint,
      rangeHighPoint,
      ...recentBreakoutPivots,
    ]).sort((a, b) => a.price - b.price);
  }

  // trend_active：横盘结束，保留突破方向新拐点 + 被突破边界（回踩/反抽参考）
  const brokenBoundary = direction === 'up' ? rangeHighPoint : rangeLowPoint;
  return dedupeByTolerance([brokenBoundary, ...recentBreakoutPivots]).sort(
    (a, b) => a.price - b.price,
  );
}

export type EmaAdxTrend = 'uptrend' | 'downtrend' | 'sideways';

export interface EmaAdxTrendResult {
  trend: EmaAdxTrend;
  emaShort: number | null;
  emaLong: number | null;
  adx: number | null;
}

/**
 * 使用 EMA + ADX 做最简趋势判断
 *
 * 输入要求：
 * - klines 必须是「从新到旧」顺序（index 越小越新）
 * - klines[0] 必须是“最新一根已收盘 K 线”
 * - 例如：[最新, 次新, ... , 最旧]
 *
 * 默认参数：
 * - emaShortPeriod: 21
 * - emaLongPeriod: 55
 * - adxPeriod: 14
 * - adxThreshold: 23
 */
export function detectTrendByEmaAdx(
  klines: Kline[],
  options?: {
    emaShortPeriod?: number;
    emaLongPeriod?: number;
    adxPeriod?: number;
    adxThreshold?: number;
  },
): EmaAdxTrendResult {
  const {
    emaShortPeriod = 21,
    emaLongPeriod = 55,
    adxPeriod = 14,
    adxThreshold = 23,
  } = options || {};

  if (emaShortPeriod <= 0 || emaLongPeriod <= 0 || adxPeriod <= 0) {
    throw new Error('EMA/ADX 周期必须大于0');
  }

  const minBars = Math.max(emaLongPeriod, adxPeriod * 2);
  if (!klines || klines.length < minBars) {
    return {
      trend: 'sideways',
      emaShort: null,
      emaLong: null,
      adx: null,
    };
  }

  // technicalindicators 要求输入 old -> new，这里仅转换顺序，不修改原数组
  const klinesOldToNew = klines.toReversed();
  const closes = klinesOldToNew.map((k) => k.close);
  const highs = klinesOldToNew.map((k) => k.high);
  const lows = klinesOldToNew.map((k) => k.low);

  const emaShort = calculateEMA(closes, emaShortPeriod);
  const emaLong = calculateEMA(closes, emaLongPeriod);

  const adxValues = ADX.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: adxPeriod,
  });
  const adx =
    adxValues.length > 0
      ? Number(adxValues[adxValues.length - 1].adx.toFixed(2))
      : null;

  const latestClose = klines[0].close;
  if (emaShort == null || emaLong == null || adx == null) {
    return {
      trend: 'sideways',
      emaShort,
      emaLong,
      adx,
    };
  }

  if (adx < adxThreshold) {
    return {
      trend: 'sideways',
      emaShort,
      emaLong,
      adx,
    };
  }

  if (emaShort > emaLong && latestClose > emaShort) {
    return {
      trend: 'uptrend',
      emaShort,
      emaLong,
      adx,
    };
  }

  if (emaShort < emaLong && latestClose < emaShort) {
    return {
      trend: 'downtrend',
      emaShort,
      emaLong,
      adx,
    };
  }

  return {
    trend: 'sideways',
    emaShort,
    emaLong,
    adx,
  };
}

/**
 * 在指定容差范围内查找已存在的价格点位
 * @param points 现有点位集合
 * @param price 要查找的价格
 * @param tolerance 容差
 * @returns 找到的价格或新价格
 */
function findNearbyPrice(
  points: Map<number, any>,
  price: number,
  tolerance: number,
): number {
  for (const existingPrice of points.keys()) {
    // 检查价格是否在容差范围内
    if (Math.abs(existingPrice - price) / price <= tolerance) {
      return existingPrice;
    }
  }
  return price;
}

/**
 * 根据收盘价和方向查找没有挂单的关键位（支持价格容差）
 * @param args 配置对象
 * @param args.keyPoints 关键位数组
 * @param args.openOrders 当前市场未成交订单（ccxt.Order[]）
 * @param args.close 收盘价
 * @param args.direction 方向 'below' | 'above'
 * @param args.priceTolerance 价格容差（相对误差，默认0.001=0.1%）
 * @returns 没有挂单的关键位数组
 */
export function findKeyPointsByCloseWithoutOrder(args: {
  keyPoints: KeyPoint[];
  openOrders: { price: number }[];
  close: number;
  direction: 'below' | 'above';
  priceTolerance?: number;
}): KeyPoint[] {
  const {
    keyPoints,
    openOrders,
    close,
    direction,
    priceTolerance = 0.001,
  } = args;

  return keyPoints.filter(
    (kp) =>
      (direction === 'below' ? kp.price < close : kp.price > close) &&
      !openOrders.some(
        (order) =>
          Math.abs(order.price - kp.price) / kp.price <= priceTolerance,
      ),
  );
}

/**
 * 根据方向和基础止盈价过滤关键位（包含等于）
 * @param keyPoints 关键位数组
 * @param side 方向 'buy' | 'sell'
 * @param baseTakeProfitPrice 基础止盈价
 */
export function filterKeyPoints(
  keyPoints: KeyPoint[],
  side: 'buy' | 'sell',
  baseTakeProfitPrice: number,
): KeyPoint[] {
  return keyPoints.filter((k) =>
    side === 'buy'
      ? k.price >= baseTakeProfitPrice
      : k.price <= baseTakeProfitPrice,
  );
}

/**
 * 批量计算订单挂单价格和止盈价格（止盈价优先取关键位，找不到则取基础止盈价）
 * @param args 配置对象
 * @param args.side 方向 'buy' | 'sell'
 * @param args.noOrderKeyPoints 没有挂单的关键位数组
 * @param args.closeProfitPoint 平仓收益点（如 SPOT_CLOSE_PROFIT_POINT）
 * @param args.shortKeyPoints 短线关键位数组
 * @param args.longKeyPoints 长线关键位数组
 * @returns { entryPrice: number, takeProfitPrice: number }[]
 */
export function calculateOrderAndTakeProfitWithKeyPoints(args: {
  side: 'buy' | 'sell';
  noOrderKeyPoints: KeyPoint[];
  closeProfitPoint: number;
  shortKeyPoints: KeyPoint[];
  longKeyPoints: KeyPoint[];
}): {
  entryPrice: number;
  takeProfitPrice: number;
}[] {
  const {
    side,
    noOrderKeyPoints,
    closeProfitPoint,
    shortKeyPoints,
    longKeyPoints,
  } = args;

  // 遍历所有未挂单的关键位
  return noOrderKeyPoints.map((kp) => {
    const entryPrice = kp.price;
    // 1. 以挂单价格为基准计算基础止盈价
    const baseTakeProfitPrice =
      side === 'buy'
        ? entryPrice + entryPrice * closeProfitPoint
        : entryPrice - entryPrice * closeProfitPoint;

    // 2. 直接在短线关键位数组找盈利方向上最靠近的关键位
    const shortCandidates = filterKeyPoints(
      shortKeyPoints,
      side,
      baseTakeProfitPrice,
    );
    let takeProfitKeyPoint: KeyPoint | undefined = undefined;
    // 说明短线中存在可以止盈的关键位
    if (shortCandidates.length > 0) {
      takeProfitKeyPoint = shortCandidates.reduce((prev, curr) =>
        Math.abs(curr.price - baseTakeProfitPrice) <
        Math.abs(prev.price - baseTakeProfitPrice)
          ? curr
          : prev,
      );
    } else {
      // 说明短线中不存在可以止盈的关键位，再去长线关键位数组找
      const longCandidates = filterKeyPoints(
        longKeyPoints,
        side,
        baseTakeProfitPrice,
      );
      if (longCandidates.length > 0) {
        takeProfitKeyPoint = longCandidates.reduce((prev, curr) =>
          Math.abs(curr.price - baseTakeProfitPrice) <
          Math.abs(prev.price - baseTakeProfitPrice)
            ? curr
            : prev,
        );
      }
    }

    // 如果都找不到 直接取基础止盈价
    let takeProfitPrice: number = baseTakeProfitPrice;
    if (takeProfitKeyPoint) {
      takeProfitPrice = takeProfitKeyPoint.price;
    }

    return { entryPrice, takeProfitPrice };
  });
}

/**
 * 计算指定资金可买到多少币（根据交易所步长自动确定精度，支持最小买入量校验）
 * @param args 配置对象
 * @param args.price 币价（如ETH/USDT的价格）
 * @param args.quoteAmount 可用资金（如USDT数量）
 * @param args.step 交易所步长（如 '0.00000001'）
 * @param args.minAmount 最小可买数量
 * @returns 可买币数量（保留与步长一致的小数位数）
 */
export function calculateBuyAmount(args: {
  price: number;
  quoteAmount: number;
  step: string;
  minAmount: number;
}): number {
  const { price, quoteAmount, step, minAmount } = args;
  const strStep = String(step);

  if (price <= 0) throw new Error('价格必须大于0');
  if (quoteAmount < 0) throw new Error('资金不能为负');

  if (!/^0\.[0-9]*1$/.test(strStep)) throw new Error('步长格式不正确');
  if (minAmount <= 0) throw new Error('最小买入量必须大于0');

  const precision = strStep.split('.')[1]?.length || 0;
  const amount = Number((quoteAmount / price).toFixed(precision));
  if (amount < minAmount) {
    // throw new Error('可买数量低于最小买入量')
    // 小于的时候 不爆错，返回最小买入量
    return minAmount;
  }
  return amount;
}

/**
 * 根据步长截断数值精度，避免JavaScript浮点数精度问题
 * @param value 要处理的数值
 * @param step 步长（如 '0.00000001'）
 * @returns 截断后的数值
 */
export function truncateByStep(value: number, step: string | number): number {
  const strStep = String(step);

  // 验证步长格式
  if (!/^0\.[0-9]*1$/.test(strStep)) {
    throw new Error('步长格式不正确，应为类似 0.00000001 的格式');
  }

  // 计算步长对应的小数位数
  const precision = strStep.split('.')[1]?.length || 0;

  const valueNumber = Number(value);

  // 使用toFixed保留指定精度，然后转换为数字
  return Number(valueNumber.toFixed(precision));
}

/**
 * 根据偏移百分比计算偏移后的价格
 * @param args 配置对象
 * @param args.price 原价格
 * @param args.offsetPercent 偏移百分比（如 0.01 表示 1%）
 * @param args.direction 交易方向 'buy' | 'sell'
 * @returns 偏移后的价格
 */
export function calculateOffsetPrice(args: {
  price: number;
  offsetPercent: number;
  direction: 'buy' | 'sell';
}): number {
  const { price, offsetPercent, direction } = args;

  if (price <= 0) {
    throw new Error('价格必须大于0');
  }

  if (offsetPercent < 0) {
    throw new Error('偏移百分比不能为负数');
  }

  // 根据交易方向计算偏移价格
  // buy: 价格上涨（加偏移）
  // sell: 价格下跌（减偏移）
  const offsetAmount = price * offsetPercent;

  return direction === 'buy' ? price + offsetAmount : price - offsetAmount;
}

/**
 * 根据精度向上取整价格
 * @param args 配置对象
 * @param args.price 原价格
 * @param args.precision 精度（如 0.01 表示保留两位小数）
 * @returns 向上取整后的价格
 */
export function roundUpPrice(args: {
  price: number | string;
  precision: number | string;
}): number {
  const { price, precision } = args;

  // 转换参数为数字类型
  const priceNumber = typeof price === 'string' ? parseFloat(price) : price;
  const precisionNumber =
    typeof precision === 'string' ? parseFloat(precision) : precision;

  // 验证转换后的数值
  if (isNaN(priceNumber) || priceNumber <= 0) {
    throw new Error('价格必须大于0且为有效数字');
  }

  if (isNaN(precisionNumber) || precisionNumber <= 0) {
    throw new Error('精度必须大于0且为有效数字');
  }

  // 计算精度对应的小数位数
  const decimalPlaces = Math.abs(Math.floor(Math.log10(precisionNumber)));

  // 将价格除以精度，向上取整，再乘以精度
  const roundedPrice =
    Math.ceil(priceNumber / precisionNumber) * precisionNumber;

  // 保留指定的小数位数
  return Number(roundedPrice.toFixed(decimalPlaces));
}

/**
 * 根据开盘时间和周期计算收盘时间
 * @param openTime 开盘时间（ISO字符串格式）
 * @param timeframe 周期（如 '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'）
 * @returns 收盘时间的Date对象
 */
export function calculateCloseTime(openTime: string, timeframe: string): Date {
  const openDate = new Date(openTime);
  const closeDate = new Date(openDate);

  // 根据周期计算收盘时间
  switch (timeframe) {
    case '1m':
      closeDate.setMinutes(closeDate.getMinutes() + 1);
      break;
    case '5m':
      closeDate.setMinutes(closeDate.getMinutes() + 5);
      break;
    case '15m':
      closeDate.setMinutes(closeDate.getMinutes() + 15);
      break;
    case '30m':
      closeDate.setMinutes(closeDate.getMinutes() + 30);
      break;
    case '1h':
      closeDate.setHours(closeDate.getHours() + 1);
      break;
    case '4h':
      closeDate.setHours(closeDate.getHours() + 4);
      break;
    case '1d':
      closeDate.setDate(closeDate.getDate() + 1);
      break;
    case '1w':
      closeDate.setDate(closeDate.getDate() + 7);
      break;
    default:
      // 默认按1天计算
      closeDate.setDate(closeDate.getDate() + 1);
      break;
  }

  return closeDate;
}
