export type BacktestEnv = "prod" | "test";

export type BacktestTimeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";

export type MarketRegime =
  | "no_sideways_context"
  | "sideways_active"
  | "breakout_pending"
  | "trend_active";

export type BreakoutDirection = "up" | "down" | "none";

export type KeypointsV3BacktestRequest = {
  symbol: string;
  timeframe: BacktestTimeframe;
  env: BacktestEnv;
  klineNum?: number;
  dropUnclosed?: boolean;
  includeKlines?: boolean;
  priceTolerance?: number;
  reactionLookahead?: number;
  reactionThreshold?: number;
  minTouchGap?: number;
  recentWindowRatio?: number;
  obviousReactionMultiplier?: number;
  applyRegimeFilter?: boolean;
  regimeBreakoutBuffer?: number;
  regimeBreakoutConfirmBars?: number;
  regimeRecentPivotBars?: number;
};

export type HistoricalBacktestKline = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type HistoricalBacktestKeyPoint = {
  price: number;
  strength: number;
  timestamps: string[];
};

export type SidewaysRangeDetection = {
  isSideways: boolean;
  rangeHigh: number;
  rangeLow: number;
  upperTouches: number;
  lowerTouches: number;
  confidence: number;
  reasons: string[];
};

export type MarketRegimeDetection = {
  regime: MarketRegime;
  breakoutDirection: BreakoutDirection;
  consecutiveBreakoutCloses: number;
  breakoutStartIndex: number;
  reasons: string[];
};

export type KeypointsV3BacktestResponse = {
  symbol: string;
  timeframe: BacktestTimeframe;
  env: BacktestEnv;
  latestClose: number | null;
  klines: HistoricalBacktestKline[];
  keyPointsRaw: HistoricalBacktestKeyPoint[];
  keyPoints: HistoricalBacktestKeyPoint[];
  supports: HistoricalBacktestKeyPoint[];
  resistances: HistoricalBacktestKeyPoint[];
  rangeDetection: SidewaysRangeDetection | null;
  marketRegime: MarketRegimeDetection | null;
  meta: Record<string, unknown>;
};

export type GridCashKeypointsBacktestRequest = {
  symbol: string;
  timeframe: BacktestTimeframe;
  env: BacktestEnv;
  klineNum?: number;
  includeKlines?: boolean;
  testCount?: number;
  priceTolerance?: number;
  atrPeriod?: number;
  pivotWindow?: number;
  reactionBars?: number;
  minReactionAtr?: number;
  minTouchGap?: number;
};

export type GridCashKeypointsBacktestResponse = {
  symbol: string;
  timeframe: BacktestTimeframe;
  env: BacktestEnv;
  latestClose: number | null;
  klines: HistoricalBacktestKline[];
  keyPoints: HistoricalBacktestKeyPoint[];
  supports: HistoricalBacktestKeyPoint[];
  resistances: HistoricalBacktestKeyPoint[];
  meta: Record<string, unknown>;
};

export type TrendStrengthDirection = "up" | "down" | "balanced" | "insufficient_data";
export type UnifiedTrendSource = "momentum" | "projection" | "depth" | "none";

export type OppositeMomentumDominance = "up" | "down" | "balanced" | "insufficient_data";

export type LatestOppositeDirectionMomentumResult = {
  strongerSide: OppositeMomentumDominance;
  weakerSide: OppositeMomentumDominance;
  latestDirection: "up" | "down" | null;
  previousDirection: "up" | "down" | null;
  latestSpeed: number | null;
  previousSpeed: number | null;
  speedDiff: number | null;
  speedDiffRate: number | null;
  meaning: string;
};

export type ProjectionDepthChangeState = "increase" | "decrease" | "similar" | "insufficient_data";

export type ProjectionDepthMetricComparison = {
  current: number | null;
  previous: number | null;
  diff: number | null;
  diffRate: number | null;
  state: ProjectionDepthChangeState;
  meaning: string;
};

export type DirectionProjectionDepthResult = {
  direction: "up" | "down";
  projection: ProjectionDepthMetricComparison;
  depth: ProjectionDepthMetricComparison;
  hint: string;
};

export type LatestProjectionDepthAnalysisResult = {
  bullish: DirectionProjectionDepthResult;
  bearish: DirectionProjectionDepthResult;
  dominanceHint: string;
};

export type UnifiedTrendSignal = {
  source: "momentum" | "projection" | "depth";
  direction: TrendStrengthDirection;
  clarity: number;
  reason: string;
  qualified: boolean;
};

export type UnifiedTrendFollowThroughStatus =
  | "not_applicable"
  | "insufficient_data"
  | "waiting_pullback"
  | "waiting_breakout"
  | "triggered";

export type UnifiedTrendFollowThroughResult = {
  direction: "up" | "down" | null;
  status: UnifiedTrendFollowThroughStatus;
  anchorTime: string | null;
  triggerTime: string | null;
  triggerPrice: number | null;
  reason: string;
};

export type UnifiedTrendStrengthResult = {
  chosenSource: UnifiedTrendSource;
  direction: TrendStrengthDirection;
  confidence: number;
  reason: string;
  lastConfirmedLegTime: string | null;
  followThrough: UnifiedTrendFollowThroughResult;
  momentum: UnifiedTrendSignal;
  projection: UnifiedTrendSignal;
  depth: UnifiedTrendSignal;
  details: {
    momentum: LatestOppositeDirectionMomentumResult;
    projectionDepth: LatestProjectionDepthAnalysisResult;
  };
};

export type TrendStrengthBacktestRequest = {
  symbol: string;
  timeframe: BacktestTimeframe;
  env: BacktestEnv;
  evaluateAt: string;
  klineNum?: number;
  dropUnclosed?: boolean;
  includeKlines?: boolean;
  similarTolerance?: number;
  minClarity?: number;
  dominanceGap?: number;
  maxLegs?: number;
  forwardBars?: number;
};

export type TrendStrengthAnchor = {
  index: number;
  timestamp: string;
  close: number;
};

export type ForwardBacktestStatus =
  | "not_applicable"
  | "insufficient_data"
  | "waiting_pullback"
  | "waiting_breakout"
  | "triggered";

export type ForwardBacktestResult = {
  direction: "up" | "down" | null;
  status: ForwardBacktestStatus;
  evaluateAtTime: string | null;
  triggerTime: string | null;
  triggerPrice: number | null;
  breakoutReferenceTime: string | null;
  barsChecked: number;
  reason: string;
};

export type TrendStrengthBacktestResponse = {
  symbol: string;
  timeframe: BacktestTimeframe;
  env: BacktestEnv;
  evaluateAt: string;
  anchor: TrendStrengthAnchor | null;
  result: UnifiedTrendStrengthResult;
  forwardBacktest: ForwardBacktestResult;
  chartKlines?: HistoricalBacktestKline[];
  klines: HistoricalBacktestKline[];
  meta: Record<string, unknown>;
};
