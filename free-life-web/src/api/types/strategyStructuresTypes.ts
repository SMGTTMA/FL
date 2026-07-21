export type StrategyTimeframe =
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "1d"
  | "1w";

export type StrategyLevelGroup = "NORMAL" | "RANGE";

export type StrategyLineGroup = "TREND" | "CHANNEL";

export type StrategyBoundary = "UPPER" | "LOWER";

export type StrategyDirection =
  | "UP"
  | "DOWN"
  | "RANGE"
  | "UP_CHANNEL"
  | "DOWN_CHANNEL";

export type StrategyContextPayload = {
  symbol: string;
  timeframe: StrategyTimeframe;
};

export type StrategyKeyLevelItem = StrategyContextPayload & {
  id: number;
  price: number | string;
  levelGroup: StrategyLevelGroup;
  boundary: StrategyBoundary | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStrategyKeyLevelParams = StrategyContextPayload & {
  price: number;
  levelGroup: StrategyLevelGroup;
  boundary?: StrategyBoundary;
  remark?: string;
};

export type UpdateStrategyKeyLevelParams = {
  id: number;
  price?: number;
  levelGroup?: StrategyLevelGroup;
  boundary?: StrategyBoundary;
  remark?: string;
};

export type QueryStrategyKeyLevelParams = {
  symbol?: string;
  timeframe?: StrategyTimeframe;
  levelGroup?: StrategyLevelGroup;
};

export type DeleteBatchStrategyKeyLevelParams = {
  ids: number[];
};

export type StrategyStructureLineItem = StrategyContextPayload & {
  id: number;
  lineGroup: StrategyLineGroup;
  boundary: StrategyBoundary | null;
  p1Time: number | string;
  p1Price: number | string;
  p2Time: number | string;
  p2Price: number | string;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStrategyStructureLineParams = StrategyContextPayload & {
  lineGroup: StrategyLineGroup;
  boundary?: StrategyBoundary;
  p1Time: number;
  p1Price: number;
  p2Time: number;
  p2Price: number;
  remark?: string;
};

export type UpdateStrategyStructureLineParams = {
  id: number;
  lineGroup?: StrategyLineGroup;
  boundary?: StrategyBoundary;
  p1Time?: number;
  p1Price?: number;
  p2Time?: number;
  p2Price?: number;
  remark?: string;
};

export type QueryStrategyStructureLineParams = {
  symbol?: string;
  timeframe?: StrategyTimeframe;
  lineGroup?: StrategyLineGroup;
};

export type DeleteBatchStrategyStructureLineParams = {
  ids: number[];
};

export type SetStrategyDirectionParams = StrategyContextPayload & {
  direction: StrategyDirection;
  remark?: string;
};

export type QueryStrategyDirectionParams = StrategyContextPayload;

export type QueryStrategyDirectionListParams = {
  symbol?: string;
  timeframe?: StrategyTimeframe;
  direction?: StrategyDirection;
};

export type StrategyDirectionItem = StrategyContextPayload & {
  id: number;
  direction: StrategyDirection;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
};
