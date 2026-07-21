import dayjs from "dayjs";
import { getTrendStrengthHistoricalBacktest } from "@/api/services/historicalBacktestService";
import type {
  BacktestEnv,
  BacktestTimeframe,
  HistoricalBacktestKline,
  TrendStrengthBacktestRequest,
} from "@/api/types/historicalBacktestTypes";
import type {
  BacktestScenarioDefinition,
  BacktestScenarioRunResult,
  TrendStrengthScenarioViewData,
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

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;

  if (typeof value === "string") {
    const date = dayjs(value);
    return date.isValid() ? date.toISOString() : undefined;
  }

  if (typeof value === "object" && value !== null) {
    const maybeDayjs = value as { toISOString?: () => string; isValid?: () => boolean };
    if (typeof maybeDayjs.toISOString === "function") {
      if (typeof maybeDayjs.isValid === "function" && !maybeDayjs.isValid()) {
        return undefined;
      }
      return maybeDayjs.toISOString();
    }
  }

  return undefined;
};

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

const resolveDecisionTimestamp = (
  response: Awaited<ReturnType<typeof getTrendStrengthHistoricalBacktest>>,
): number | null => {
  const forward = response.forwardBacktest;
  const sourceTime =
    forward?.triggerTime ??
    forward?.breakoutReferenceTime ??
    response.result?.lastConfirmedLegTime ??
    null;
  if (!sourceTime) {
    return null;
  }
  const ts = Date.parse(sourceTime);
  return Number.isFinite(ts) ? ts : null;
};

export const trendStrengthScenario: BacktestScenarioDefinition = {
  id: "trend_strength",
  label: "趋势强弱回测",
  description: "按选定历史时间点回放K线，输出动量/投影/深度联合强弱结论。",
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
      name: "evaluateAt",
      label: "回测时间点",
      type: "datetime",
      section: "basic",
      required: true,
      placeholder: "请选择回测日期时间",
    },
    {
      name: "klineNum",
      label: "K线数量",
      type: "number",
      section: "basic",
      min: 50,
      max: 2000,
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
      name: "similarTolerance",
      label: "相近容差",
      type: "number",
      section: "advanced",
      min: 0,
      max: 0.5,
      step: 0.01,
    },
    {
      name: "minClarity",
      label: "最小显著度",
      type: "number",
      section: "advanced",
      min: 0,
      max: 3,
      step: 0.01,
    },
    {
      name: "dominanceGap",
      label: "主导差值",
      type: "number",
      section: "advanced",
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      name: "maxLegs",
      label: "结构段上限",
      type: "number",
      section: "advanced",
      min: 6,
      max: 120,
      precision: 0,
    },
    {
      name: "forwardBars",
      label: "后续验证K线数",
      type: "number",
      section: "advanced",
      min: 1,
      max: 1000,
      precision: 0,
    },
  ],
  initialValues: {
    symbol: "",
    timeframe: "4h",
    env: "prod",
    evaluateAt: dayjs().subtract(1, "day"),
    klineNum: 300,
    dropUnclosed: true,
    includeKlines: true,
    similarTolerance: 0.05,
    minClarity: 0.2,
    dominanceGap: 0.05,
    maxLegs: 24,
    forwardBars: 100,
  },
  run: async (values): Promise<BacktestScenarioRunResult> => {
    const symbol = String(values.symbol ?? "")
      .trim()
      .toUpperCase();
    const timeframe = values.timeframe as BacktestTimeframe;
    const env = values.env as BacktestEnv;
    const evaluateAt = toIsoString(values.evaluateAt);

    if (!evaluateAt) {
      throw new Error("请选择合法的回测时间点");
    }

    const request: TrendStrengthBacktestRequest = {
      symbol,
      timeframe,
      env,
      evaluateAt,
    };

    const optionalNumberKeys: Array<keyof TrendStrengthBacktestRequest> = [
      "klineNum",
      "similarTolerance",
      "minClarity",
      "dominanceGap",
      "maxLegs",
      "forwardBars",
    ];
    optionalNumberKeys.forEach((key) => {
      const parsed = toNumber(values[key]);
      if (typeof parsed === "number") {
        (request as Record<string, unknown>)[key] = parsed;
      }
    });

    const optionalBooleanKeys: Array<keyof TrendStrengthBacktestRequest> = [
      "dropUnclosed",
      "includeKlines",
    ];
    optionalBooleanKeys.forEach((key) => {
      const parsed = toBoolean(values[key]);
      if (typeof parsed === "boolean") {
        (request as Record<string, unknown>)[key] = parsed;
      }
    });

    const response = await getTrendStrengthHistoricalBacktest(request);
    const chartSourceKlines =
      response.chartKlines && response.chartKlines.length > 0
        ? response.chartKlines
        : response.klines ?? [];
    const normalizedKlines = normalizeKlines(chartSourceKlines);

    const latestClose =
      response.anchor?.close ?? response.klines?.[0]?.close ?? null;

    const anchorTimestampMs = response.anchor?.timestamp
      ? Date.parse(response.anchor.timestamp)
      : Number.NaN;
    const selectedKlineTimestamp = Number.isFinite(anchorTimestampMs)
      ? anchorTimestampMs
      : null;
    const decisionKlineTimestamp = resolveDecisionTimestamp(response);

    const viewData: TrendStrengthScenarioViewData = {
      symbol: response.symbol,
      timeframe: response.timeframe,
      env: response.env,
      latestClose,
      klines: normalizedKlines,
      selectedKlineTimestamp,
      decisionKlineTimestamp,
      lines: {
        raw: [],
        final: [],
        supports: [],
        resistances: [],
        range: [],
      },
      evaluateAt: response.evaluateAt,
      anchor: response.anchor,
      trendResult: response.result,
      forwardBacktest: response.forwardBacktest,
      meta: response.meta ?? {},
    };

    return {
      scenarioId: "trend_strength",
      chartData: viewData,
      viewData,
      rawResponse: response,
      requestSnapshot: request,
    };
  },
};
