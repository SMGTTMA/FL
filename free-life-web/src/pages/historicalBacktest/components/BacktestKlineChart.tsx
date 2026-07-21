import { Empty } from "antd";
import { dispose, init, type Chart, type Period } from "klinecharts";
import { useEffect, useMemo, useRef } from "react";
import type { BacktestChartData, BacktestHorizontalLine } from "../scenarios/types";

type CompareMode = "final" | "raw" | "both";

type BacktestKlineChartProps = {
  data?: BacktestChartData;
  compareMode: CompareMode;
  showSupportsAndResistances: boolean;
  showRange: boolean;
};

const mapTimeframeToPeriod = (timeframe: string): Period => {
  switch (timeframe) {
    case "1m":
      return { type: "minute", span: 1 };
    case "5m":
      return { type: "minute", span: 5 };
    case "15m":
      return { type: "minute", span: 15 };
    case "30m":
      return { type: "minute", span: 30 };
    case "1h":
      return { type: "hour", span: 1 };
    case "4h":
      return { type: "hour", span: 4 };
    case "1d":
      return { type: "day", span: 1 };
    case "1w":
      return { type: "week", span: 1 };
    default:
      return { type: "hour", span: 1 };
  }
};

const resolvePricePrecision = (value: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 4;
  }
  const text = String(value);
  const decimalLength = text.includes(".") ? text.split(".")[1].length : 0;
  return Math.min(Math.max(decimalLength, 2), 8);
};

export const BacktestKlineChart = ({
  data,
  compareMode,
  showSupportsAndResistances,
  showRange,
}: BacktestKlineChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const overlayIdsRef = useRef<string[]>([]);

  const renderedLines = useMemo(() => {
    if (!data) {
      return [] as BacktestHorizontalLine[];
    }
    const compareLines =
      compareMode === "both"
        ? [...data.lines.raw, ...data.lines.final]
        : compareMode === "raw"
          ? data.lines.raw
          : data.lines.final;

    const lines = [...compareLines];
    if (showSupportsAndResistances) {
      lines.push(...data.lines.supports, ...data.lines.resistances);
    }
    if (showRange) {
      lines.push(...data.lines.range);
    }
    return lines;
  }, [data, compareMode, showSupportsAndResistances, showRange]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const chart = init(containerRef.current, {
      locale: "zh-CN",
      timezone: "Asia/Shanghai",
    });

    if (!chart) {
      return;
    }
    chartRef.current = chart;

    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      overlayIdsRef.current.forEach((id) => {
        chart.removeOverlay({ id });
      });
      overlayIdsRef.current = [];
      dispose(chart);
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }

    const klines = data?.klines ?? [];
    const pricePrecision = resolvePricePrecision(data?.latestClose ?? null);
    chart.setSymbol({
      ticker: data?.symbol || "-",
      pricePrecision,
      volumePrecision: 2,
    });
    chart.setPeriod(mapTimeframeToPeriod(data?.timeframe || "1h"));
    chart.setDataLoader({
      getBars: ({ type, callback }) => {
        if (type === "init") {
          callback(klines, { backward: false, forward: false });
          return;
        }
        callback([], { backward: false, forward: false });
      },
    });
    chart.resetData();
    chart.scrollToRealTime();
  }, [data]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) {
      return;
    }

    overlayIdsRef.current.forEach((id) => {
      chart.removeOverlay({ id });
    });
    overlayIdsRef.current = [];

    if (!data || data.klines.length === 0) {
      return;
    }

    const anchorTimestamp = data.klines[0].timestamp;
    renderedLines.forEach((line) => {
      const overlayId = chart.createOverlay({
        name: "horizontalStraightLine",
        lock: true,
        points: [{ timestamp: anchorTimestamp, value: line.price }],
        styles: {
          line: {
            color: line.color,
            size: 1,
            style: line.lineType,
          },
        },
      });
      if (typeof overlayId === "string") {
        overlayIdsRef.current.push(overlayId);
      }
    });

    if (
      typeof data.selectedKlineTimestamp === "number" &&
      Number.isFinite(data.selectedKlineTimestamp)
    ) {
      const selectedPrice =
        data.latestClose ?? data.klines[data.klines.length - 1]?.close ?? data.klines[0].close;

      const selectedOverlayId = chart.createOverlay({
        name: "verticalStraightLine",
        lock: true,
        points: [{ timestamp: data.selectedKlineTimestamp, value: selectedPrice }],
        styles: {
          line: {
            color: "#13c2c2",
            size: 1,
            style: "dashed",
          },
        },
      });

      if (typeof selectedOverlayId === "string") {
        overlayIdsRef.current.push(selectedOverlayId);
      }
    }

    if (
      typeof data.decisionKlineTimestamp === "number" &&
      Number.isFinite(data.decisionKlineTimestamp)
    ) {
      const decisionPrice =
        data.latestClose ??
        data.klines[data.klines.length - 1]?.close ??
        data.klines[0].close;

      const decisionOverlayId = chart.createOverlay({
        name: "verticalStraightLine",
        lock: true,
        points: [{ timestamp: data.decisionKlineTimestamp, value: decisionPrice }],
        styles: {
          line: {
            color: "#fa8c16",
            size: 1,
            style: "solid",
          },
        },
      });

      if (typeof decisionOverlayId === "string") {
        overlayIdsRef.current.push(decisionOverlayId);
      }
    }
  }, [data, renderedLines]);

  return (
    <div className="relative h-[520px] w-full rounded-md border border-border">
      <div ref={containerRef} className="h-full w-full" />
      {(!data || data.klines.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/85">
          <Empty description="暂无可渲染K线数据" />
        </div>
      )}
    </div>
  );
};
