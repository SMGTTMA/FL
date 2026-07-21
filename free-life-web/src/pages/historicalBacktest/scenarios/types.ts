import type {
  BacktestEnv,
  BacktestTimeframe,
  ForwardBacktestResult,
  GridCashKeypointsBacktestResponse,
  HistoricalBacktestKeyPoint,
  TrendStrengthAnchor,
  TrendStrengthBacktestResponse,
  UnifiedTrendStrengthResult,
} from "@/api/types/historicalBacktestTypes";

export type BacktestScenarioId = "grid_cash_keypoints" | "trend_strength";

export type BacktestFieldType = "input" | "select" | "number" | "switch" | "datetime";

export type BacktestFieldOption = {
  label: string;
  value: string | number;
};

export type BacktestFieldSchema = {
  name: string;
  label: string;
  type: BacktestFieldType;
  section: "basic" | "advanced";
  required?: boolean;
  placeholder?: string;
  options?: BacktestFieldOption[];
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
};

export type BacktestLineType = "solid" | "dashed";

export type BacktestHorizontalLine = {
  id: string;
  label: string;
  source: "final" | "support" | "resistance";
  price: number;
  color: string;
  lineType: BacktestLineType;
};

export type BacktestChartKline = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type BacktestChartData = {
  symbol: string;
  timeframe: BacktestTimeframe;
  env: BacktestEnv;
  latestClose: number | null;
  klines: BacktestChartKline[];
  // 仅趋势强弱场景使用：用于在图上标记用户选择时间对应的K线
  selectedKlineTimestamp?: number | null;
  // 仅趋势强弱场景使用：用于在图上标记“做单决策点”
  decisionKlineTimestamp?: number | null;
  lines: {
    final: BacktestHorizontalLine[];
    supports: BacktestHorizontalLine[];
    resistances: BacktestHorizontalLine[];
  };
};

export type GridCashKeypointsScenarioViewData = BacktestChartData & {
  keyPoints: HistoricalBacktestKeyPoint[];
  supports: HistoricalBacktestKeyPoint[];
  resistances: HistoricalBacktestKeyPoint[];
  meta: Record<string, unknown>;
};

export type TrendStrengthScenarioViewData = BacktestChartData & {
  evaluateAt: string;
  anchor: TrendStrengthAnchor | null;
  trendResult: UnifiedTrendStrengthResult;
  forwardBacktest: ForwardBacktestResult;
  meta: Record<string, unknown>;
};

export type GridCashKeypointsScenarioRunResult = {
  scenarioId: "grid_cash_keypoints";
  chartData: BacktestChartData;
  viewData: GridCashKeypointsScenarioViewData;
  rawResponse: GridCashKeypointsBacktestResponse;
  requestSnapshot: Record<string, unknown>;
};

export type TrendStrengthScenarioRunResult = {
  scenarioId: "trend_strength";
  chartData: BacktestChartData;
  viewData: TrendStrengthScenarioViewData;
  rawResponse: TrendStrengthBacktestResponse;
  requestSnapshot: Record<string, unknown>;
};

export type BacktestScenarioRunResult =
  | GridCashKeypointsScenarioRunResult
  | TrendStrengthScenarioRunResult;

export type BacktestScenarioDefinition = {
  id: BacktestScenarioId;
  label: string;
  description: string;
  fields: BacktestFieldSchema[];
  initialValues: Record<string, unknown>;
  run: (values: Record<string, unknown>) => Promise<BacktestScenarioRunResult>;
};
