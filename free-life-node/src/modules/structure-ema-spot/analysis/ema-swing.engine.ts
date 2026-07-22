import { EMA } from 'technicalindicators';
import { Kline } from '@/types/trading';
import { EmaSignalContext } from '../types/structure-ema-spot.types';

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toTimestamp(value: unknown): number | null {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function buildEmaSignalContext(
  newestFirstKlines: Kline[],
  emaPeriod: number,
): EmaSignalContext | null {
  if (!Number.isInteger(emaPeriod) || emaPeriod < 2) return null;

  // 倒序缓存第0根是正在形成的K线，必须排除。
  const closedAscending = newestFirstKlines.slice(1).toReversed();
  if (closedAscending.length < emaPeriod + 1) return null;

  const closes = closedAscending.map((item) => toNumber(item.close));
  if (closes.some((item) => item === null)) return null;

  const emaValues = EMA.calculate({
    values: closes as number[],
    period: emaPeriod,
  });
  if (emaValues.length < 2) return null;

  const previous = closedAscending[closedAscending.length - 2];
  const current = closedAscending[closedAscending.length - 1];
  const previousOpen = toNumber(previous.open);
  const previousClose = toNumber(previous.close);
  const currentOpen = toNumber(current.open);
  const currentClose = toNumber(current.close);
  const previousKlineTime = toTimestamp(previous.timestamp);
  const currentKlineTime = toTimestamp(current.timestamp);
  const previousEma = toNumber(emaValues[emaValues.length - 2]);
  const currentEma = toNumber(emaValues[emaValues.length - 1]);

  if (
    previousOpen === null ||
    previousClose === null ||
    currentOpen === null ||
    currentClose === null ||
    previousKlineTime === null ||
    currentKlineTime === null ||
    previousEma === null ||
    currentEma === null
  ) {
    return null;
  }

  const previousBodyMid = (previousOpen + previousClose) / 2;
  const currentBodyMid = (currentOpen + currentClose) / 2;

  return {
    previousKlineTime,
    currentKlineTime,
    previousOpen,
    previousClose,
    currentOpen,
    currentClose,
    previousBodyMid,
    currentBodyMid,
    previousEma,
    currentEma,
    isEntrySignal:
      previousBodyMid <= previousEma &&
      currentBodyMid > currentEma &&
      currentClose > currentEma &&
      currentClose > currentOpen,
    isExitSignal:
      previousBodyMid >= previousEma &&
      currentBodyMid < currentEma &&
      currentClose < currentEma &&
      currentClose < currentOpen,
  };
}

export function isKeyLevelBreakUp(
  context: EmaSignalContext,
  keyLevelPrice: number,
): boolean {
  return (
    Number.isFinite(keyLevelPrice) &&
    keyLevelPrice > 0 &&
    context.previousBodyMid <= keyLevelPrice &&
    context.currentBodyMid > keyLevelPrice &&
    context.currentClose > keyLevelPrice &&
    context.currentClose > context.currentOpen
  );
}
