import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import { StrategyKeyLevel } from '@/modules/strategy-structures/entities/strategy-key-level.entity';
import { StrategyMarketDirectionType } from '@/modules/strategy-structures/constants/strategy-structure.constants';
import {
  STRUCTURE_EMA_SPOT_CONFIG_LIMITS,
  STRUCTURE_EMA_SPOT_DEFAULT_CONFIG,
  STRUCTURE_EMA_SPOT_DEFAULT_RUNTIME,
  STRUCTURE_EMA_SPOT_RANGE_TIMEFRAMES,
  STRUCTURE_EMA_SPOT_UP_TIMEFRAMES,
} from './constants/structure-ema-spot.constants';
import {
  StructureEmaMode,
  StructureEmaProfileConfig,
  StructureEmaRuntimeState,
  StructureEmaSpotConfig,
} from './types/structure-ema-spot.types';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeNumber(args: {
  value: unknown;
  fallback: number;
  name: string;
  min: number;
  max: number;
  integer?: boolean;
}): number {
  const parsed = Number(args.value ?? args.fallback);
  if (!Number.isFinite(parsed)) {
    throw new BadRequestException(`${args.name} 必须是有效数字`);
  }
  if (args.integer && !Number.isInteger(parsed)) {
    throw new BadRequestException(`${args.name} 必须是整数`);
  }
  if (parsed < args.min || parsed > args.max) {
    throw new BadRequestException(
      `${args.name} 必须在 ${args.min} 到 ${args.max} 之间`,
    );
  }
  return parsed;
}

function normalizeTimeframe(
  value: unknown,
  fallback: TimeFrame,
  allowed: readonly TimeFrame[],
  name: string,
): TimeFrame {
  const timeframe = String(value ?? fallback) as TimeFrame;
  if (!allowed.includes(timeframe)) {
    throw new BadRequestException(`${name} 仅支持 ${allowed.join(', ')}`);
  }
  return timeframe;
}

function normalizeProfile(args: {
  raw: Record<string, unknown>;
  defaults: StructureEmaProfileConfig;
  mode: StructureEmaMode;
}): StructureEmaProfileConfig {
  const { raw, defaults, mode } = args;
  const allowed =
    mode === 'UP'
      ? STRUCTURE_EMA_SPOT_UP_TIMEFRAMES
      : STRUCTURE_EMA_SPOT_RANGE_TIMEFRAMES;

  return {
    timeframe: normalizeTimeframe(
      raw.timeframe,
      defaults.timeframe,
      allowed,
      `${mode}.timeframe`,
    ),
    emaPeriod: normalizeNumber({
      value: raw.emaPeriod,
      fallback: defaults.emaPeriod,
      name: `${mode}.emaPeriod`,
      ...STRUCTURE_EMA_SPOT_CONFIG_LIMITS.emaPeriod,
      integer: true,
    }),
    positionParts: normalizeNumber({
      value: raw.positionParts,
      fallback: defaults.positionParts,
      name: `${mode}.positionParts`,
      ...STRUCTURE_EMA_SPOT_CONFIG_LIMITS.positionParts,
      integer: true,
    }),
    entrySpacingRate: normalizeNumber({
      value: raw.entrySpacingRate,
      fallback: defaults.entrySpacingRate,
      name: `${mode}.entrySpacingRate`,
      ...STRUCTURE_EMA_SPOT_CONFIG_LIMITS.entrySpacingRate,
    }),
    entryOrderExpireBars: normalizeNumber({
      value: raw.entryOrderExpireBars,
      fallback: defaults.entryOrderExpireBars,
      name: `${mode}.entryOrderExpireBars`,
      ...STRUCTURE_EMA_SPOT_CONFIG_LIMITS.entryOrderExpireBars,
      integer: true,
    }),
  };
}

export function normalizeStructureEmaSpotConfig(
  value: unknown,
): StructureEmaSpotConfig {
  const raw = asRecord(value);
  const rawUp = asRecord(raw.up);
  const rawRange = asRecord(raw.range);
  const up = normalizeProfile({
    raw: rawUp,
    defaults: STRUCTURE_EMA_SPOT_DEFAULT_CONFIG.up,
    mode: 'UP',
  });

  return {
    profitPoint: normalizeNumber({
      value: raw.profitPoint,
      fallback: STRUCTURE_EMA_SPOT_DEFAULT_CONFIG.profitPoint,
      name: 'profitPoint',
      ...STRUCTURE_EMA_SPOT_CONFIG_LIMITS.profitPoint,
    }),
    up: {
      ...up,
      keyLevelAvoidanceRate: normalizeNumber({
        value: rawUp.keyLevelAvoidanceRate,
        fallback: STRUCTURE_EMA_SPOT_DEFAULT_CONFIG.up.keyLevelAvoidanceRate,
        name: 'UP.keyLevelAvoidanceRate',
        ...STRUCTURE_EMA_SPOT_CONFIG_LIMITS.keyLevelAvoidanceRate,
      }),
    },
    range: normalizeProfile({
      raw: rawRange,
      defaults: STRUCTURE_EMA_SPOT_DEFAULT_CONFIG.range,
      mode: 'RANGE',
    }),
  };
}

export function parseStructureEmaRuntimeState(
  value: unknown,
): StructureEmaRuntimeState {
  const raw = asRecord(value);
  const rawLastProcessed = asRecord(raw.lastProcessedKlineTime);
  const lastProcessedKlineTime = Object.entries(rawLastProcessed).reduce<
    Record<string, number>
  >((acc, [key, item]) => {
    const time = Number(item);
    if (Number.isFinite(time) && time > 0) acc[key] = time;
    return acc;
  }, {});

  const brokenKeyLevelIds = Array.isArray(raw.brokenKeyLevelIds)
    ? raw.brokenKeyLevelIds
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    : [];

  const lastDirection = [
    'UP',
    'DOWN',
    'RANGE',
    'UP_CHANNEL',
    'DOWN_CHANNEL',
  ].includes(String(raw.lastDirection))
    ? (raw.lastDirection as StrategyMarketDirectionType)
    : null;

  return {
    ...STRUCTURE_EMA_SPOT_DEFAULT_RUNTIME,
    structureSnapshotHash:
      typeof raw.structureSnapshotHash === 'string'
        ? raw.structureSnapshotHash
        : null,
    lastDirection,
    lastProcessedKlineTime,
    brokenKeyLevelIds,
  };
}

export function calculateStructureSnapshotHash(args: {
  direction: StrategyMarketDirectionType | null;
  keyLevels: Pick<StrategyKeyLevel, 'id' | 'price'>[];
}): string {
  const keyLevels = args.keyLevels
    .map((item) => ({ id: Number(item.id), price: Number(item.price) }))
    .filter(
      (item) =>
        Number.isInteger(item.id) &&
        item.id > 0 &&
        Number.isFinite(item.price) &&
        item.price > 0,
    )
    .sort((a, b) => a.price - b.price || a.id - b.id);

  return createHash('sha256')
    .update(JSON.stringify({ direction: args.direction, keyLevels }))
    .digest('hex');
}

export function resolveModeByDirection(
  direction: StrategyMarketDirectionType | null,
): StructureEmaMode | null {
  if (direction === 'UP' || direction === 'UP_CHANNEL') return 'UP';
  if (direction === 'RANGE') return 'RANGE';
  return null;
}

export function getProfileKey(args: {
  mode: StructureEmaMode;
  timeframe: string;
  emaPeriod: number;
}): string {
  return `${args.mode}:${args.timeframe}:${args.emaPeriod}`;
}

export function shouldProcessKline(args: {
  lastProcessedKlineTime: Record<string, number>;
  profileKey: string;
  currentKlineTime: number;
}): boolean {
  return (
    Number(args.currentKlineTime) >
    Number(args.lastProcessedKlineTime[args.profileKey] || 0)
  );
}

export function timeframeToMilliseconds(timeframe: string): number {
  const map: Record<string, number> = {
    [TimeFrame.M5]: 5 * 60 * 1000,
    [TimeFrame.M15]: 15 * 60 * 1000,
    [TimeFrame.M30]: 30 * 60 * 1000,
    [TimeFrame.H1]: 60 * 60 * 1000,
    [TimeFrame.H4]: 4 * 60 * 60 * 1000,
  };
  const duration = map[timeframe];
  if (!duration) throw new Error(`不支持的K线周期: ${timeframe}`);
  return duration;
}

export function toFinitePositiveNumber(value: unknown, name: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} 必须是有限且大于0的数字`);
  }
  return parsed;
}

function decimalPlaces(value: string | number): number {
  const text = String(value).toLowerCase();
  if (text.includes('e-')) {
    return Number(text.split('e-')[1]) || 0;
  }
  return text.includes('.') ? text.split('.')[1].length : 0;
}

export function truncateDownByStep(
  value: unknown,
  step: string | number,
): number {
  const valueNumber = toFinitePositiveNumber(value, '数量');
  const stepNumber = toFinitePositiveNumber(step, '数量步长');
  const units = Math.floor(valueNumber / stepNumber + 1e-12);
  const result = units * stepNumber;
  return Number(result.toFixed(decimalPlaces(step)));
}

export function aggregateEmaTrades(
  trades: Array<{ tradeAmount: unknown; positionCost: unknown }>,
  stepLength: string | number,
): { tradeAmount: number; positionCost: number; entryPrice: number } {
  if (!trades.length) throw new Error('没有可聚合的交易记录');

  const rawAmount = trades.reduce(
    (sum, item) => sum + toFinitePositiveNumber(item.tradeAmount, '交易数量'),
    0,
  );
  const positionCost = trades.reduce(
    (sum, item) =>
      sum + toFinitePositiveNumber(item.positionCost, '持仓占用资金'),
    0,
  );
  const tradeAmount = truncateDownByStep(rawAmount, stepLength);
  return {
    tradeAmount,
    positionCost,
    entryPrice: positionCost / tradeAmount,
  };
}
