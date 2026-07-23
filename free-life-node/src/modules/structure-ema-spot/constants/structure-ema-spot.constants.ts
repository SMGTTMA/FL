import { SPOT_CLOSE_PROFIT_POINT } from '@/common/constants/trading.constants';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import {
  StructureEmaRuntimeState,
  StructureEmaSpotConfig,
} from '../types/structure-ema-spot.types';

export const STRUCTURE_EMA_SPOT_STRATEGY_NAME = 'structure_ema_spot';

export const STRUCTURE_EMA_SPOT_DEFAULT_CONFIG: StructureEmaSpotConfig = {
  profitPoint: SPOT_CLOSE_PROFIT_POINT,
  up: {
    timeframe: TimeFrame.H1,
    emaPeriod: 20,
    positionParts: 3,
    entrySpacingRate: 0.01,
    keyLevelAvoidanceRate: 0.01,
    entryOrderExpireBars: 1,
  },
  range: {
    timeframe: TimeFrame.M5,
    emaPeriod: 20,
    positionParts: 30,
    entrySpacingRate: 0.002,
    entryOrderExpireBars: 1,
  },
};

export const STRUCTURE_EMA_SPOT_UP_TIMEFRAMES = [
  TimeFrame.M30,
  TimeFrame.H1,
  TimeFrame.H4,
] as const;

export const STRUCTURE_EMA_SPOT_RANGE_TIMEFRAMES = [
  TimeFrame.M5,
  TimeFrame.M15,
  TimeFrame.M30,
] as const;

export const STRUCTURE_EMA_SPOT_CONFIG_LIMITS = {
  profitPoint: { min: SPOT_CLOSE_PROFIT_POINT, max: 10 },
  emaPeriod: { min: 2, max: 100 },
  positionParts: { min: 1, max: 300 },
  entrySpacingRate: { min: 0, max: 1 },
  keyLevelAvoidanceRate: { min: 0, max: 1 },
  entryOrderExpireBars: { min: 1, max: 100 },
} as const;

export const STRUCTURE_EMA_SPOT_DEFAULT_RUNTIME: StructureEmaRuntimeState = {
  structureSnapshotHash: null,
  lastDirection: null,
  lastProcessedKlineTime: {},
  brokenKeyLevelIds: [],
  entryPaused: false,
};
