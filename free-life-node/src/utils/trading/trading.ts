import { Kline, KeyPoint } from 'src/types/trading';

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
 * 按最新收盘价动态划分关键位（支撑/阻力）
 *
 * 使用方式：
 * - 传入“中性关键位”（只有 price/strength/timestamps）
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
