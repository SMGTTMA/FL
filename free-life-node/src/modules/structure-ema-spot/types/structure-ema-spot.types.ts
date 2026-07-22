import { TimeFrame } from '@/modules/exchange/dto/history.dto';
import { StrategyMarketDirectionType } from '@/modules/strategy-structures/constants/strategy-structure.constants';

export type StructureEmaMode = 'UP' | 'RANGE';

export interface StructureEmaProfileConfig {
  timeframe: TimeFrame;
  emaPeriod: number;
  positionParts: number;
  entrySpacingRate: number;
  entryOrderExpireBars: number;
  keyLevelAvoidanceRate?: number;
}

export interface StructureEmaSpotConfig {
  profitPoint: number;
  up: StructureEmaProfileConfig & {
    keyLevelAvoidanceRate: number;
  };
  range: StructureEmaProfileConfig;
}

export interface StructureEmaRuntimeState {
  structureSnapshotHash: string | null;
  lastDirection: StrategyMarketDirectionType | null;
  lastProcessedKlineTime: Record<string, number>;
  brokenKeyLevelIds: number[];
}

export interface EmaSignalContext {
  previousKlineTime: number;
  currentKlineTime: number;
  previousOpen: number;
  previousClose: number;
  currentOpen: number;
  currentClose: number;
  previousBodyMid: number;
  currentBodyMid: number;
  previousEma: number;
  currentEma: number;
  isEntrySignal: boolean;
  isExitSignal: boolean;
}
