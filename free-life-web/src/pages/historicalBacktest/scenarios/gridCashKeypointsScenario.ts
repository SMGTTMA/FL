import { getGridCashKeypointsHistoricalBacktest } from "@/api/services/historicalBacktestService";
import type {
  BacktestEnv,
  BacktestTimeframe,
  GridCashKeypointsBacktestRequest,
  HistoricalBacktestKeyPoint,
  HistoricalBacktestKline,
} from "@/api/types/historicalBacktestTypes";
import type {
  BacktestHorizontalLine,
  BacktestScenarioDefinition,
  BacktestScenarioRunResult,
  GridCashKeypointsScenarioViewData,
} from "./types";

const TIMEFRAME_OPTIONS: Array<{ label: string; value: BacktestTimeframe }> = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
  { label: "1w", value: "1w" },
];

const ENV_OPTIONS: Array<{ label: string; value: BacktestEnv }> = [
  { label: "prod", value: "prod" },
  { label: "test", value: "test" },
];

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const toBoolean = (value: unknown): boolean | undefined => {
  return typeof value === "boolean" ? value : undefined;
};

const normalizeKlines = (klines: HistoricalBacktestKline[]) =>
  [...klines]
    .reverse()
    .map((item) => ({
      timestamp: new Date(item.timestamp).getTime(),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }))
    .filter((item) => Number.isFinite(item.timestamp));

const buildLine = (
  prefix: string,
  point: HistoricalBacktestKeyPoint,
  index: number,
  source: BacktestHorizontalLine["source"],
  color: string,
): BacktestHorizontalLine => ({
  id: `${prefix}-${index}-${point.price}`,
  label: `${prefix.toUpperCase()}-${index + 1}`,
  source,
  price: point.price,
  color,
  lineType: "solid",
});

export const gridCashKeypointsScenario: BacktestScenarioDefinition = {
  id: "grid_cash_keypoints",
  label: "现金网格关键位回测",
  description:
    "验证现金网格生产策略使用的固定锚点 ATR 关键位算法；高级参数留空时使用后端策略默认值。",
  fields: [
    {
      name: "symbol",
      label: "交易对",
      type: "select",
      section: "basic",
      required: true,
      placeholder: "请选择交易对",
    },
    {
      name: "timeframe",
      label: "周期",
      type: "select",
      section: "basic",
      required: true,
      options: TIMEFRAME_OPTIONS,
    },
    {
      name: "env",
      label: "环境",
      type: "select",
      section: "basic",
      required: true,
      options: ENV_OPTIONS,
    },
    {
      name: "klineNum",
      label: "K线数量",
      type: "number",
      section: "basic",
      min: 20,
      max: 2000,
      precision: 0,
    },
    {
      name: "includeKlines",
      label: "返回K线数组",
      type: "switch",
      section: "basic",
    },
    {
      name: "testCount",
      label: "最小测试次数",
      type: "number",
      section: "advanced",
      min: 1,
      max: 10,
      precision: 0,
      placeholder: "留空使用策略默认值",
    },
    {
      name: "priceTolerance",
      label: "价格容差",
      type: "number",
      section: "advanced",
      min: 0.0001,
      max: 0.05,
      step: 0.0001,
      placeholder: "留空按周期使用策略默认值",
    },
    {
      name: "atrPeriod",
      label: "ATR周期",
      type: "number",
      section: "advanced",
      min: 2,
      max: 100,
      precision: 0,
      placeholder: "留空使用 14",
    },
    {
      name: "pivotWindow",
      label: "拐点比较窗口",
      type: "number",
      section: "advanced",
      min: 1,
      max: 20,
      precision: 0,
      placeholder: "留空使用 2",
    },
    {
      name: "reactionBars",
      label: "反转观察K线数",
      type: "number",
      section: "advanced",
      min: 1,
      max: 20,
      precision: 0,
      placeholder: "留空使用 3",
    },
    {
      name: "minReactionAtr",
      label: "最小反转ATR倍数",
      type: "number",
      section: "advanced",
      min: 0.1,
      max: 10,
      step: 0.1,
      placeholder: "留空使用 0.8",
    },
    {
      name: "minTouchGap",
      label: "触碰最小间隔",
      type: "number",
      section: "advanced",
      min: 1,
      max: 100,
      precision: 0,
      placeholder: "留空使用 4",
    },
  ],
  initialValues: {
    symbol: "",
    timeframe: "5m",
    env: "prod",
    klineNum: 300,
    includeKlines: true,
  },
  run: async (values): Promise<BacktestScenarioRunResult> => {
    const request: GridCashKeypointsBacktestRequest = {
      symbol: String(values.symbol ?? "")
        .trim()
        .toUpperCase(),
      timeframe: values.timeframe as BacktestTimeframe,
      env: values.env as BacktestEnv,
    };

    const optionalNumberKeys: Array<keyof GridCashKeypointsBacktestRequest> = [
      "klineNum",
      "testCount",
      "priceTolerance",
      "atrPeriod",
      "pivotWindow",
      "reactionBars",
      "minReactionAtr",
      "minTouchGap",
    ];
    for (const key of optionalNumberKeys) {
      const parsed = toNumber(values[key]);
      if (typeof parsed === "number") {
        (request as Record<string, unknown>)[key] = parsed;
      }
    }

    const includeKlines = toBoolean(values.includeKlines);
    if (typeof includeKlines === "boolean") {
      request.includeKlines = includeKlines;
    }

    const response = await getGridCashKeypointsHistoricalBacktest(request);
    const normalizedKlines = normalizeKlines(response.klines ?? []);
    const finalLines = (response.keyPoints ?? []).map((point, index) =>
      buildLine("keypoint", point, index, "final", "#1677ff"),
    );
    const supportLines = (response.supports ?? []).map((point, index) =>
      buildLine("support", point, index, "support", "#2f9e44"),
    );
    const resistanceLines = (response.resistances ?? []).map((point, index) =>
      buildLine("resistance", point, index, "resistance", "#d9480f"),
    );

    const viewData: GridCashKeypointsScenarioViewData = {
      symbol: response.symbol,
      timeframe: response.timeframe,
      env: response.env,
      latestClose: response.latestClose,
      klines: normalizedKlines,
      lines: {
        final: finalLines,
        supports: supportLines,
        resistances: resistanceLines,
      },
      keyPoints: response.keyPoints ?? [],
      supports: response.supports ?? [],
      resistances: response.resistances ?? [],
      meta: response.meta ?? {},
    };

    return {
      scenarioId: "grid_cash_keypoints",
      chartData: viewData,
      viewData,
      rawResponse: response,
      requestSnapshot: request,
    };
  },
};
