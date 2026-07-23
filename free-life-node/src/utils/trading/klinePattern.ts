import {
  Kline,
  PinbarType,
} from '@/types/trading';

/**
 * K线形态判断工具集
 * 用于识别各种K线形态，辅助交易决策
 */

/**
 * 计算K线实体长度
 * @param kline K线数据
 * @returns 实体长度（绝对值）
 */
export function getBodyLength(kline: Kline): number {
  return Math.abs(kline.close - kline.open);
}

/**
 * 计算K线上影线长度
 * @param kline K线数据
 * @returns 上影线长度
 */
export function getUpperShadow(kline: Kline): number {
  return kline.high - Math.max(kline.open, kline.close);
}

/**
 * 计算K线下影线长度
 * @param kline K线数据
 * @returns 下影线长度
 */
export function getLowerShadow(kline: Kline): number {
  return Math.min(kline.open, kline.close) - kline.low;
}

/**
 * 计算K线总长度（最高价 - 最低价）
 * @param kline K线数据
 * @returns K线总长度
 */
export function getTotalLength(kline: Kline): number {
  return kline.high - kline.low;
}

/**
 * 判断是否为阳线
 * @param kline K线数据
 * @returns 是否为阳线
 */
export function isBullish(kline: Kline): boolean {
  return kline.close > kline.open;
}

/**
 * 判断是否为阴线
 * @param kline K线数据
 * @returns 是否为阴线
 */
export function isBearish(kline: Kline): boolean {
  return kline.close < kline.open;
}

/**
 * 计算K线数组的平均成交量
 * @param klines K线数组
 * @returns 平均成交量
 */
export function getAverageVolume(klines: Kline[]): number {
  if (!klines || klines.length === 0) return 0;
  const totalVolume = klines.reduce((sum, kline) => sum + kline.volume, 0);
  return totalVolume / klines.length;
}

/**
 * 判断成交量是否为大量
 * @param volume 当前成交量
 * @param averageVolume 平均成交量
 * @param threshold 放量倍数阈值，默认 1.5 (1.5倍)
 * @returns 是否为大量
 */
export function isHighVolume(
  volume: number,
  averageVolume: number,
  threshold: number = 1.5,
): boolean {
  if (averageVolume === 0) return false;
  return volume >= averageVolume * threshold;
}

/**
 * 判断是否为十字星
 * 定义：实体长度小于总长度的一定比例
 * @param kline K线数据
 * @param threshold 实体占比阈值，默认 0.1 (10%)
 * @returns 是否为十字星
 */
export function isDoji(kline: Kline, threshold: number = 0.1): boolean {
  const totalLength = getTotalLength(kline);
  if (totalLength === 0) return true;

  const bodyLength = getBodyLength(kline);
  return bodyLength / totalLength <= threshold;
}

/**
 * 判断是否为Pinbar形态
 * 定义：长影线占总K线长度的 2/3 以上
 * Pinbar分为两种：
 * - 锤子线(hammer)：长下影线，适合在下跌趋势末端出现（看涨信号）
 * - 流星线(shooting_star)：长上影线，适合在上涨趋势末端出现（看跌信号）
 *
 * @param kline K线数据
 * @param options 配置选项
 * @param options.shadowRatio 长影线占总K线长度的比例阈值，默认 2/3
 * @param options.averageVolume 平均成交量，不传则不判断成交量
 * @param options.volumeThreshold 放量倍数阈值，默认 1.5
 * @returns 是否为Pinbar及类型
 */
export function isPinbar(
  kline: Kline,
  options: {
    shadowRatio?: number;
    averageVolume?: number;
    volumeThreshold?: number;
  } = {},
): { isPinbar: boolean; type: PinbarType | null } {
  const { shadowRatio = 2 / 3, averageVolume, volumeThreshold = 1.5 } = options;

  const totalLength = getTotalLength(kline);
  if (totalLength === 0) {
    return { isPinbar: false, type: null };
  }

  const upperShadow = getUpperShadow(kline);
  const lowerShadow = getLowerShadow(kline);

  let patternMatched = false;
  let patternType: PinbarType | null = null;

  // 锤子线：下影线占总长度的 2/3 以上
  if (lowerShadow / totalLength >= shadowRatio) {
    patternMatched = true;
    patternType = 'hammer';
  }
  // 流星线：上影线占总长度的 2/3 以上
  else if (upperShadow / totalLength >= shadowRatio) {
    patternMatched = true;
    patternType = 'shooting_star';
  }

  if (!patternMatched) {
    return { isPinbar: false, type: null };
  }

  // 如果没有传入平均成交量，只判断形态
  if (averageVolume === undefined) {
    return { isPinbar: true, type: patternType };
  }

  // 配合成交量判断
  if (isHighVolume(kline.volume, averageVolume, volumeThreshold)) {
    return { isPinbar: true, type: patternType };
  }

  return { isPinbar: false, type: null };
}

/**
 * 判断是否为大阳线
 * 定义：阳线且实体长度占总长度的比例较大，可选配合成交量判断
 * @param kline K线数据
 * @param options 配置选项
 * @param options.bodyRatio 实体占比阈值，默认 0.7 (70%)
 * @param options.averageVolume 平均成交量，不传则不判断成交量
 * @param options.volumeThreshold 放量倍数阈值，默认 1.5
 * @returns 是否为大阳线
 */
export function isStrongBullish(
  kline: Kline,
  options: {
    bodyRatio?: number;
    averageVolume?: number;
    volumeThreshold?: number;
  } = {},
): boolean {
  const { bodyRatio = 0.7, averageVolume, volumeThreshold = 1.5 } = options;

  const totalLength = getTotalLength(kline);
  if (totalLength === 0) return false;

  const bodyLength = getBodyLength(kline);
  const isBodyStrong = isBullish(kline) && bodyLength / totalLength >= bodyRatio;

  // 如果没有传入平均成交量，只判断实体
  if (averageVolume === undefined) {
    return isBodyStrong;
  }

  // 配合成交量判断
  return isBodyStrong && isHighVolume(kline.volume, averageVolume, volumeThreshold);
}

/**
 * 判断是否为大阴线
 * 定义：阴线且实体长度占总长度的比例较大，可选配合成交量判断
 * @param kline K线数据
 * @param options 配置选项
 * @param options.bodyRatio 实体占比阈值，默认 0.7 (70%)
 * @param options.averageVolume 平均成交量，不传则不判断成交量
 * @param options.volumeThreshold 放量倍数阈值，默认 1.5
 * @returns 是否为大阴线
 */
export function isStrongBearish(
  kline: Kline,
  options: {
    bodyRatio?: number;
    averageVolume?: number;
    volumeThreshold?: number;
  } = {},
): boolean {
  const { bodyRatio = 0.7, averageVolume, volumeThreshold = 1.5 } = options;

  const totalLength = getTotalLength(kline);
  if (totalLength === 0) return false;

  const bodyLength = getBodyLength(kline);
  const isBodyStrong = isBearish(kline) && bodyLength / totalLength >= bodyRatio;

  // 如果没有传入平均成交量，只判断实体
  if (averageVolume === undefined) {
    return isBodyStrong;
  }

  // 配合成交量判断
  return isBodyStrong && isHighVolume(kline.volume, averageVolume, volumeThreshold);
}

/**
 * 判断是否为看涨吞没形态
 * 定义：当前阳线的实体完全吞没前一根阴线的实体
 * @param prevKline 前一根K线
 * @param currKline 当前K线
 * @param options 配置选项
 * @param options.averageVolume 平均成交量，不传则不判断成交量
 * @param options.volumeThreshold 放量倍数阈值，默认 1.5
 * @returns 是否为看涨吞没形态
 */
export function isBullishEngulfing(
  prevKline: Kline,
  currKline: Kline,
  options: {
    averageVolume?: number;
    volumeThreshold?: number;
  } = {},
): boolean {
  const { averageVolume, volumeThreshold = 1.5 } = options;

  // 前一根必须是阴线，当前必须是阳线
  if (!isBearish(prevKline) || !isBullish(currKline)) {
    return false;
  }

  // 当前阳线开盘价低于前一根阴线收盘价
  // 当前阳线收盘价高于前一根阴线开盘价
  const isPatternMatched =
    currKline.open <= prevKline.close && currKline.close >= prevKline.open;

  if (!isPatternMatched) {
    return false;
  }

  // 如果没有传入平均成交量，只判断形态
  if (averageVolume === undefined) {
    return true;
  }

  // 配合成交量判断（当前K线需要放量）
  return isHighVolume(currKline.volume, averageVolume, volumeThreshold);
}

/**
 * 判断是否为看跌吞没形态
 * 定义：当前阴线的实体完全吞没前一根阳线的实体
 * @param prevKline 前一根K线
 * @param currKline 当前K线
 * @param options 配置选项
 * @param options.averageVolume 平均成交量，不传则不判断成交量
 * @param options.volumeThreshold 放量倍数阈值，默认 1.5
 * @returns 是否为看跌吞没形态
 */
export function isBearishEngulfing(
  prevKline: Kline,
  currKline: Kline,
  options: {
    averageVolume?: number;
    volumeThreshold?: number;
  } = {},
): boolean {
  const { averageVolume, volumeThreshold = 1.5 } = options;

  // 前一根必须是阳线，当前必须是阴线
  if (!isBullish(prevKline) || !isBearish(currKline)) {
    return false;
  }

  // 当前阴线开盘价高于前一根阳线收盘价
  // 当前阴线收盘价低于前一根阳线开盘价
  const isPatternMatched =
    currKline.open >= prevKline.close && currKline.close <= prevKline.open;

  if (!isPatternMatched) {
    return false;
  }

  // 如果没有传入平均成交量，只判断形态
  if (averageVolume === undefined) {
    return true;
  }

  // 配合成交量判断（当前K线需要放量）
  return isHighVolume(currKline.volume, averageVolume, volumeThreshold);
}

/**
 * 判断是否为乌云盖顶形态
 * 定义：
 * - 前一根是阳线
 * - 当前是阴线，开盘价高于前一根阳线收盘价
 * - 当前阴线收盘价深入前一根阳线实体的一半以上
 *
 * @param prevKline 前一根K线
 * @param currKline 当前K线
 * @param options 配置选项
 * @param options.penetrationRatio 刺入比例阈值，默认 0.5 (50%)
 * @param options.averageVolume 平均成交量，不传则不判断成交量
 * @param options.volumeThreshold 放量倍数阈值，默认 1.5
 * @returns 是否为乌云盖顶形态
 */
export function isDarkCloudCover(
  prevKline: Kline,
  currKline: Kline,
  options: {
    penetrationRatio?: number;
    averageVolume?: number;
    volumeThreshold?: number;
  } = {},
): boolean {
  const { penetrationRatio = 0.5, averageVolume, volumeThreshold = 1.5 } = options;

  // 前一根必须是阳线，当前必须是阴线
  if (!isBullish(prevKline) || !isBearish(currKline)) {
    return false;
  }

  // 当前阴线开盘价必须高于前一根阳线收盘价
  if (currKline.open <= prevKline.close) {
    return false;
  }

  // 计算前一根阳线的实体中点
  const prevBodyLength = getBodyLength(prevKline);
  const prevBodyMidPoint = prevKline.open + prevBodyLength * penetrationRatio;

  // 当前阴线收盘价必须深入前一根阳线实体的一半以上
  // 即收盘价低于阳线实体中点
  if (currKline.close >= prevBodyMidPoint) {
    return false;
  }

  // 如果没有传入平均成交量，只判断形态
  if (averageVolume === undefined) {
    return true;
  }

  // 配合成交量判断（当前K线需要放量）
  return isHighVolume(currKline.volume, averageVolume, volumeThreshold);
}

/**
 * 判断是否为刺透形态（也叫穿刺形态）
 * 定义：
 * - 前一根是阴线
 * - 当前是阳线，开盘价低于前一根阴线收盘价
 * - 当前阳线收盘价深入前一根阴线实体的一半以上
 *
 * @param prevKline 前一根K线
 * @param currKline 当前K线
 * @param options 配置选项
 * @param options.penetrationRatio 刺入比例阈值，默认 0.5 (50%)
 * @param options.averageVolume 平均成交量，不传则不判断成交量
 * @param options.volumeThreshold 放量倍数阈值，默认 1.5
 * @returns 是否为刺透形态
 */
export function isPiercingPattern(
  prevKline: Kline,
  currKline: Kline,
  options: {
    penetrationRatio?: number;
    averageVolume?: number;
    volumeThreshold?: number;
  } = {},
): boolean {
  const { penetrationRatio = 0.5, averageVolume, volumeThreshold = 1.5 } = options;

  // 前一根必须是阴线，当前必须是阳线
  if (!isBearish(prevKline) || !isBullish(currKline)) {
    return false;
  }

  // 当前阳线开盘价必须低于前一根阴线收盘价
  if (currKline.open >= prevKline.close) {
    return false;
  }

  // 计算前一根阴线的实体中点
  // 阴线：open > close，所以中点 = close + bodyLength * penetrationRatio
  const prevBodyLength = getBodyLength(prevKline);
  const prevBodyMidPoint = prevKline.close + prevBodyLength * penetrationRatio;

  // 当前阳线收盘价必须深入前一根阴线实体的一半以上
  // 即收盘价高于阴线实体中点
  if (currKline.close <= prevBodyMidPoint) {
    return false;
  }

  // 如果没有传入平均成交量，只判断形态
  if (averageVolume === undefined) {
    return true;
  }

  // 配合成交量判断（当前K线需要放量）
  return isHighVolume(currKline.volume, averageVolume, volumeThreshold);
}

/**
 * 判断是否为黄昏星形态
 * 定义：
 * - 第1根是阳线
 * - 第2根是小实体（实体不能超过第1根实体的一半）
 * - 第3根是阴线，收盘价刺入第1根阳线实体的一半以上
 *
 * @param kline1 第1根K线
 * @param kline2 第2根K线
 * @param kline3 第3根K线
 * @param options 配置选项
 * @param options.penetrationRatio 第3根刺入第1根实体的比例阈值，默认 0.5 (50%)
 * @param options.middleBodyRatio 第2根实体占第1根实体的最大比例，默认 0.5 (50%)
 * @param options.averageVolume 平均成交量，不传则不判断成交量
 * @param options.volumeThreshold 放量倍数阈值，默认 1.5
 * @returns 是否为黄昏星形态
 */
export function isEveningStar(
  kline1: Kline,
  kline2: Kline,
  kline3: Kline,
  options: {
    penetrationRatio?: number;
    middleBodyRatio?: number;
    averageVolume?: number;
    volumeThreshold?: number;
  } = {},
): boolean {
  const {
    penetrationRatio = 0.5,
    middleBodyRatio = 0.5,
    averageVolume,
    volumeThreshold = 1.5,
  } = options;

  // 第1根必须是阳线
  if (!isBullish(kline1)) {
    return false;
  }

  // 第3根必须是阴线
  if (!isBearish(kline3)) {
    return false;
  }

  const body1 = getBodyLength(kline1);
  const body2 = getBodyLength(kline2);

  // 第1根实体不能为0
  if (body1 === 0) {
    return false;
  }

  // 第2根实体不能超过第1根实体的一半
  if (body2 > body1 * middleBodyRatio) {
    return false;
  }

  // 计算第1根阳线实体的刺入点位
  // 阳线：open < close，刺入点 = open + body1 * penetrationRatio
  const penetrationPoint = kline1.open + body1 * penetrationRatio;

  // 第3根阴线收盘价必须刺入第1根阳线实体的一半以上
  // 即收盘价低于刺入点
  if (kline3.close >= penetrationPoint) {
    return false;
  }

  // 如果没有传入平均成交量，只判断形态
  if (averageVolume === undefined) {
    return true;
  }

  // 配合成交量判断（第3根K线需要放量）
  return isHighVolume(kline3.volume, averageVolume, volumeThreshold);
}

/**
 * 判断是否为启明星形态
 * 定义：
 * - 第1根是阴线
 * - 第2根是小实体（实体不能超过第1根实体的一半）
 * - 第3根是阳线，收盘价刺入第1根阴线实体的一半以上
 *
 * @param kline1 第1根K线
 * @param kline2 第2根K线
 * @param kline3 第3根K线
 * @param options 配置选项
 * @param options.penetrationRatio 第3根刺入第1根实体的比例阈值，默认 0.5 (50%)
 * @param options.middleBodyRatio 第2根实体占第1根实体的最大比例，默认 0.5 (50%)
 * @param options.averageVolume 平均成交量，不传则不判断成交量
 * @param options.volumeThreshold 放量倍数阈值，默认 1.5
 * @returns 是否为启明星形态
 */
export function isMorningStar(
  kline1: Kline,
  kline2: Kline,
  kline3: Kline,
  options: {
    penetrationRatio?: number;
    middleBodyRatio?: number;
    averageVolume?: number;
    volumeThreshold?: number;
  } = {},
): boolean {
  const {
    penetrationRatio = 0.5,
    middleBodyRatio = 0.5,
    averageVolume,
    volumeThreshold = 1.5,
  } = options;

  // 第1根必须是阴线
  if (!isBearish(kline1)) {
    return false;
  }

  // 第3根必须是阳线
  if (!isBullish(kline3)) {
    return false;
  }

  const body1 = getBodyLength(kline1);
  const body2 = getBodyLength(kline2);

  // 第1根实体不能为0
  if (body1 === 0) {
    return false;
  }

  // 第2根实体不能超过第1根实体的一半
  if (body2 > body1 * middleBodyRatio) {
    return false;
  }

  // 计算第1根阴线实体的刺入点位
  // 阴线：open > close，刺入点 = close + body1 * penetrationRatio
  const penetrationPoint = kline1.close + body1 * penetrationRatio;

  // 第3根阳线收盘价必须刺入第1根阴线实体的一半以上
  // 即收盘价高于刺入点
  if (kline3.close <= penetrationPoint) {
    return false;
  }

  // 如果没有传入平均成交量，只判断形态
  if (averageVolume === undefined) {
    return true;
  }

  // 配合成交量判断（第3根K线需要放量）
  return isHighVolume(kline3.volume, averageVolume, volumeThreshold);
}

/**
 * 根据最近 1～3 根 K 线（从新到旧）生成形态摘要，供日线 AI 分析使用
 * @param klines K 线数组，索引 0 为最新一根
 * @param options 可选：是否要求放量才输出形态，默认不要求（仅形态匹配即输出）
 * @returns 多行文本，可直接拼入 prompt 的【K线形态】段落
 */
export function getKlinePatternSummary(
  klines: Kline[],
  options: {
    useVolumeFilter?: boolean;
    volumeThreshold?: number;
  } = {},
): string {
  const { useVolumeFilter = false, volumeThreshold = 1.5 } = options;
  const lines: string[] = [];
  const avgVol = getAverageVolume(klines);
  const volOpt = useVolumeFilter && avgVol > 0 ? { averageVolume: avgVol, volumeThreshold } : {};

  // 单根形态：最新一根
  if (klines.length >= 1) {
    const curr = klines[0];
    const singleLabels: string[] = [];
    if (isDoji(curr)) singleLabels.push('十字星');
    const pinbarResult = isPinbar(curr, volOpt);
    if (pinbarResult.isPinbar) {
      singleLabels.push(pinbarResult.type === 'hammer' ? '锤子线(看涨)' : '流星线(看跌)');
    }
    if (isStrongBullish(curr, volOpt)) singleLabels.push('大阳线');
    if (isStrongBearish(curr, volOpt)) singleLabels.push('大阴线');
    lines.push(`- 最新一根: ${singleLabels.length ? singleLabels.join(' | ') : '无显著单根形态'}`);
  }

  // 双根形态：最近两根 (prev=klines[1], curr=klines[0])
  if (klines.length >= 2) {
    const prev = klines[1];
    const curr = klines[0];
    const twoLabels: string[] = [];
    if (isBullishEngulfing(prev, curr, volOpt)) twoLabels.push('看涨吞没');
    if (isBearishEngulfing(prev, curr, volOpt)) twoLabels.push('看跌吞没');
    if (isPiercingPattern(prev, curr, volOpt)) twoLabels.push('刺透形态(看涨)');
    if (isDarkCloudCover(prev, curr, volOpt)) twoLabels.push('乌云盖顶(看跌)');
    lines.push(`- 最近两根: ${twoLabels.length ? twoLabels.join(' | ') : '无显著双根形态'}`);
  }

  // 三根形态：最近三根 (k1=klines[2], k2=klines[1], k3=klines[0])
  if (klines.length >= 3) {
    const k1 = klines[2];
    const k2 = klines[1];
    const k3 = klines[0];
    const threeLabels: string[] = [];
    if (isMorningStar(k1, k2, k3, volOpt)) threeLabels.push('启明星(看涨)');
    if (isEveningStar(k1, k2, k3, volOpt)) threeLabels.push('黄昏星(看跌)');
    lines.push(`- 最近三根: ${threeLabels.length ? threeLabels.join(' | ') : '无显著三根形态'}`);
  }

  if (lines.length === 0) return '';
  return '【K线形态】（系统根据最近1～3根K线自动识别，供参考）\n' + lines.join('\n');
}
