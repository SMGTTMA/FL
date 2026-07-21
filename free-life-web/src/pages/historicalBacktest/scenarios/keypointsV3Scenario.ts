import { getKeypointsV3HistoricalBacktest } from "@/api/services/historicalBacktestService";
import type {
  BacktestEnv,
  BacktestTimeframe,
  HistoricalBacktestKeyPoint,
  HistoricalBacktestKline,
  KeypointsV3BacktestRequest,
} from "@/api/types/historicalBacktestTypes";
import type {
  BacktestHorizontalLine,
  BacktestScenarioDefinition,
  BacktestScenarioRunResult,
  KeypointsV3ScenarioViewData,
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
  if (typeof value === "boolean") {
    return value;
  }
  return undefined;
};

const buildLine = (
  prefix: string,
  point: HistoricalBacktestKeyPoint,
  index: number,
  source: BacktestHorizontalLine["source"],
  color: string,
  lineType: BacktestHorizontalLine["lineType"],
): BacktestHorizontalLine => ({
  id: `${prefix}-${index}-${point.price}`,
  label: `${prefix.toUpperCase()}-${index + 1}`,
  source,
  price: point.price,
  color,
  lineType,
});

const normalizeKlines = (klines: HistoricalBacktestKline[]) => {
  return [...klines]
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
};

export const keypointsV3Scenario: BacktestScenarioDefinition = {
  id: "keypoints_v3",
  label: "关键位 V3 历史回测",
  description:
    "用于验证关键位算法在历史K线上的表现，支持 raw/final 对比和阶段信息展示。",
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
      min: 1,
      max: 300,
      precision: 0,
    },
    {
      name: "dropUnclosed",
      label: "去掉未收盘K线",
      type: "switch",
      section: "basic",
    },
    {
      name: "includeKlines",
      label: "返回K线数组",
      type: "switch",
      section: "basic",
    },
    {
      name: "applyRegimeFilter",
      label: "启用阶段过滤",
      type: "switch",
      section: "basic",
    },
    {
      name: "priceTolerance",
      label: "关键位容差",
      type: "number",
      section: "advanced",
      min: 0.0001,
      max: 0.05,
      step: 0.0001,
    },
    {
      name: "reactionLookahead",
      label: "反应观察根数",
      type: "number",
      section: "advanced",
      min: 1,
      max: 20,
      precision: 0,
    },
    {
      name: "reactionThreshold",
      label: "反应幅度阈值",
      type: "number",
      section: "advanced",
      min: 0.001,
      max: 0.2,
      step: 0.001,
    },
    {
      name: "minTouchGap",
      label: "触及最小间隔",
      type: "number",
      section: "advanced",
      min: 1,
      max: 30,
      precision: 0,
    },
    {
      name: "recentWindowRatio",
      label: "近期窗口比例",
      type: "number",
      section: "advanced",
      min: 0.1,
      max: 0.8,
      step: 0.01,
    },
    {
      name: "obviousReactionMultiplier",
      label: "明显拐点倍数阈值",
      type: "number",
      section: "advanced",
      min: 1,
      max: 10,
      step: 0.1,
    },
    {
      name: "regimeBreakoutBuffer",
      label: "突破缓冲",
      type: "number",
      section: "advanced",
      min: 0.0001,
      max: 0.05,
      step: 0.0001,
    },
    {
      name: "regimeBreakoutConfirmBars",
      label: "连续突破确认根数",
      type: "number",
      section: "advanced",
      min: 1,
      max: 20,
      precision: 0,
    },
    {
      name: "regimeRecentPivotBars",
      label: "突破阶段保留最近新拐点根数",
      type: "number",
      section: "advanced",
      min: 1,
      max: 120,
      precision: 0,
    },
  ],
  initialValues: {
    symbol: "",
    timeframe: "4h",
    env: "prod",
    klineNum: 100,
    dropUnclosed: true,
    includeKlines: true,
    applyRegimeFilter: true,
    priceTolerance: 0.003,
    reactionLookahead: 4,
    reactionThreshold: 0.006,
    minTouchGap: 1,
    recentWindowRatio: 0.4,
    obviousReactionMultiplier: 2,
    regimeBreakoutBuffer: 0.002,
    regimeBreakoutConfirmBars: 3,
    regimeRecentPivotBars: 12,
  },
  run: async (values): Promise<BacktestScenarioRunResult> => {
    const symbol = String(values.symbol ?? "")
      .trim()
      .toUpperCase();
    const timeframe = values.timeframe as BacktestTimeframe;
    const env = values.env as BacktestEnv;

    const request: KeypointsV3BacktestRequest = {
      symbol,
      timeframe,
      env,
    };

    const optionalNumberKeys: Array<keyof KeypointsV3BacktestRequest> = [
      "klineNum",
      "priceTolerance",
      "reactionLookahead",
      "reactionThreshold",
      "minTouchGap",
      "recentWindowRatio",
      "obviousReactionMultiplier",
      "regimeBreakoutBuffer",
      "regimeBreakoutConfirmBars",
      "regimeRecentPivotBars",
    ];
    optionalNumberKeys.forEach((key) => {
      const parsed = toNumber(values[key]);
      if (typeof parsed === "number") {
        (request as Record<string, unknown>)[key] = parsed;
      }
    });

    const optionalBooleanKeys: Array<keyof KeypointsV3BacktestRequest> = [
      "dropUnclosed",
      "includeKlines",
      "applyRegimeFilter",
    ];
    optionalBooleanKeys.forEach((key) => {
      const parsed = toBoolean(values[key]);
      if (typeof parsed === "boolean") {
        (request as Record<string, unknown>)[key] = parsed;
      }
    });

    const response = await getKeypointsV3HistoricalBacktest(request);
    const normalizedKlines = normalizeKlines(response.klines ?? []);

    const rawLines = (response.keyPointsRaw ?? []).map((point, index) =>
      buildLine("raw", point, index, "raw", "#8c8c8c", "dashed"),
    );
    const finalLines = (response.keyPoints ?? []).map((point, index) =>
      buildLine("final", point, index, "final", "#1677ff", "solid"),
    );
    const supportLines = (response.supports ?? []).map((point, index) =>
      buildLine("support", point, index, "support", "#2f9e44", "solid"),
    );
    const resistanceLines = (response.resistances ?? []).map((point, index) =>
      buildLine("resistance", point, index, "resistance", "#d9480f", "solid"),
    );

    const rangeLines: BacktestHorizontalLine[] = [];
    if (response.rangeDetection) {
      const { rangeLow, rangeHigh } = response.rangeDetection;
      rangeLines.push(
        {
          id: "range-low",
          label: "RANGE-LOW",
          source: "range",
          price: rangeLow,
          color: "#fa8c16",
          lineType: "dashed",
        },
        {
          id: "range-high",
          label: "RANGE-HIGH",
          source: "range",
          price: rangeHigh,
          color: "#fa8c16",
          lineType: "dashed",
        },
      );
    }

    const viewData: KeypointsV3ScenarioViewData = {
      symbol: response.symbol,
      timeframe: response.timeframe,
      env: response.env,
      latestClose: response.latestClose,
      klines: normalizedKlines,
      lines: {
        raw: rawLines,
        final: finalLines,
        supports: supportLines,
        resistances: resistanceLines,
        range: rangeLines,
      },
      keyPointsRaw: response.keyPointsRaw ?? [],
      keyPoints: response.keyPoints ?? [],
      supports: response.supports ?? [],
      resistances: response.resistances ?? [],
      rangeDetection: response.rangeDetection,
      marketRegime: response.marketRegime,
      meta: response.meta ?? {},
    };

    return {
      scenarioId: "keypoints_v3",
      chartData: viewData,
      viewData,
      rawResponse: response,
      requestSnapshot: request,
    };
  },
};
