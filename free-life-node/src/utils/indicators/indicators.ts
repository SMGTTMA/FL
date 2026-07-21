import { RSI, MACD, EMA } from 'technicalindicators';
import { Kline } from '@/types/trading';
import { TechnicalIndicators } from '@/types/ai-decision';

/**
 * 计算RSI指标
 * @param closes 收盘价数组
 * @param period 周期（默认14）
 * @returns RSI值
 */
export function calculateRSI(closes: number[], period: number = 14): number | null {
  if (closes.length < period) {
    return null;
  }

  const rsiValues = RSI.calculate({
    values: closes,
    period,
  });

  if (!rsiValues || rsiValues.length === 0) {
    return null;
  }

  return Number(rsiValues[rsiValues.length - 1].toFixed(2));
}

/**
 * 计算MACD指标
 * @param closes 收盘价数组
 * @returns MACD对象 {dif, dea, histogram}
 */
export function calculateMACD(closes: number[]): { dif: number; dea: number; histogram: number } | null {
  if (closes.length < 26) {
    return null;
  }

  const macdValues = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  if (!macdValues || macdValues.length === 0) {
    return null;
  }

  const lastMACD = macdValues[macdValues.length - 1];
  return {
    dif: Number(lastMACD.MACD?.toFixed(2) ?? 0),
    dea: Number(lastMACD.signal?.toFixed(2) ?? 0),
    histogram: Number(lastMACD.histogram?.toFixed(2) ?? 0),
  };
}

/**
 * 计算EMA指标
 * @param closes 收盘价数组
 * @param period 周期
 * @returns EMA值
 */
export function calculateEMA(closes: number[], period: number): number | null {
  if (closes.length < period) {
    return null;
  }

  const emaValues = EMA.calculate({
    values: closes,
    period,
  });

  if (!emaValues || emaValues.length === 0) {
    return null;
  }

  return Number(emaValues[emaValues.length - 1].toFixed(2));
}

/**
 * 计算成交量变化百分比
 * @param volumes 成交量数组（最新的在前）
 * @returns 成交量变化百分比字符串
 */
export function calculateVolumeChange(volumes: number[]): string | null {
  if (volumes.length < 2) {
    return null;
  }

  const currentVolume = volumes[0];
  const previousVolume = volumes[1];

  if (previousVolume === 0) {
    return null;
  }

  const change = ((currentVolume - previousVolume) / previousVolume) * 100;
  return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
}

/**
 * 计算所有技术指标
 * @param klines K线数据数组（最新的在前）
 * @param config 配置对象
 * @returns 技术指标对象
 */
export function calculateAllIndicators(
  klines: Kline[],
  config: {
    useRSI: boolean;
    useMACD: boolean;
    useEMA: boolean;
    useVolume: boolean;
  },
): TechnicalIndicators {
  // 转换顺序为最旧 -> 最新（technicalindicators 库要求），且不修改原数组
  const reversedKlines = klines.toReversed();
  const closes = reversedKlines.map((k) => k.close);
  const volumes = klines.map((k) => k.volume); // 保持最新的在前

  const indicators: TechnicalIndicators = {};

  // 计算RSI
  if (config.useRSI) {
    indicators.rsi = calculateRSI(closes) ?? undefined;
  }

  // 计算MACD
  if (config.useMACD) {
    indicators.macd = calculateMACD(closes) ?? undefined;
  }

  // 计算EMA
  if (config.useEMA) {
    indicators.ema20 = calculateEMA(closes, 20) ?? undefined;
    indicators.ema50 = calculateEMA(closes, 50) ?? undefined;
  }

  // 计算成交量变化
  if (config.useVolume) {
    indicators.volumeChange = calculateVolumeChange(volumes) ?? undefined;
  }

  return indicators;
}

/**
 * 格式化技术指标为可读字符串
 * @param indicators 技术指标对象
 * @returns 格式化后的字符串
 */
export function formatIndicators(indicators: TechnicalIndicators): string {
  const parts: string[] = [];

  if (indicators.rsi !== undefined) {
    let rsiStatus = '中性';
    if (indicators.rsi < 30) rsiStatus = '超卖';
    else if (indicators.rsi > 70) rsiStatus = '超买';
    else if (indicators.rsi < 40) rsiStatus = '偏弱';
    else if (indicators.rsi > 60) rsiStatus = '偏强';
    parts.push(`RSI(14): ${indicators.rsi} (${rsiStatus})`);
  }

  if (indicators.macd) {
    const { dif, dea, histogram } = indicators.macd;
    let macdStatus = histogram > 0 ? '金叉' : '死叉';
    if (Math.abs(histogram) < 10) macdStatus += '中';
    parts.push(`MACD: DIF:${dif}, DEA:${dea}, 柱状图:${histogram} (${macdStatus})`);
  }

  if (indicators.ema20 !== undefined && indicators.ema50 !== undefined) {
    const trend = indicators.ema20 > indicators.ema50 ? '多头排列' : '空头排列';
    parts.push(`EMA20: ${indicators.ema20}, EMA50: ${indicators.ema50} (${trend})`);
  }

  if (indicators.volumeChange) {
    const volumeTrend = indicators.volumeChange.startsWith('+') ? '放量' : '缩量';
    parts.push(`成交量: ${volumeTrend}${indicators.volumeChange}`);
  }

  return parts.join('\n- ');
}
