import { App, Card, Form, Segmented, Select, Space, Switch, Typography } from "antd";
import { useRequest } from "ahooks";
import { useEffect, useMemo, useState } from "react";
import { TradingPairIsActive } from "@/api/enums/global";
import { findAll } from "@/api/services/tradingPairsService";
import { BacktestKlineChart } from "./components/BacktestKlineChart";
import { BacktestParamsForm } from "./components/BacktestParamsForm";
import { BacktestResultPanel } from "./components/BacktestResultPanel";
import { backtestScenarios, getBacktestScenarioById } from "./scenarios/scenarioRegistry";
import type { BacktestScenarioId, BacktestScenarioRunResult } from "./scenarios/types";

const { Text, Title } = Typography;

const HistoricalBacktest = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<Record<string, unknown>>();
  const [scenarioId, setScenarioId] = useState<BacktestScenarioId>("keypoints_v3");
  const [result, setResult] = useState<BacktestScenarioRunResult>();
  const [loading, setLoading] = useState(false);

  const [compareMode, setCompareMode] = useState<"final" | "raw" | "both">(
    "final",
  );
  const [showSupportsAndResistances, setShowSupportsAndResistances] =
    useState(true);
  const [showRange, setShowRange] = useState(true);

  const activeScenario = useMemo(
    () => getBacktestScenarioById(scenarioId),
    [scenarioId],
  );

  const { data: tradingPairsList, loading: tradingPairsLoading } = useRequest(
    () =>
      findAll({
        isActive: TradingPairIsActive.ACTIVE,
      }),
    {
      refreshDeps: [],
    },
  );

  const symbolOptions = useMemo(() => {
    return (tradingPairsList ?? []).map((item) => ({
      label: item.symbol,
      value: item.symbol,
    }));
  }, [tradingPairsList]);

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue(activeScenario.initialValues as any);
    setResult(undefined);
    setCompareMode("final");
    setShowRange(activeScenario.id === "keypoints_v3");
  }, [activeScenario, form]);

  const handleRun = async (values: Record<string, unknown>) => {
    setLoading(true);
    try {
      const runResult = await activeScenario.run(values);
      setResult(runResult);
      message.success("回测完成");
    } catch (error) {
      message.error((error as Error)?.message || "回测失败");
    } finally {
      setLoading(false);
    }
  };

  const isTrendScenario = activeScenario.id === "trend_strength";
  const isKeypointsV3Scenario = activeScenario.id === "keypoints_v3";

  return (
    <div className="p-2">
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size={8}>
          <Title level={5} style={{ margin: 0 }}>
            历史回测
          </Title>
          <Text type="secondary">
            已接入现金网格关键位、关键位V3与趋势强弱回测场景。
          </Text>

          <Space wrap>
            <Text>回测类型：</Text>
            <Select
              style={{ width: 260 }}
              value={scenarioId}
              onChange={(value) => setScenarioId(value as BacktestScenarioId)}
              options={backtestScenarios.map((item) => ({
                label: item.label,
                value: item.id,
              }))}
            />
            <Text type="secondary">{activeScenario.description}</Text>
          </Space>
        </Space>
      </Card>

      <Space direction="vertical" style={{ width: "100%" }} size={12} className="mt-2">
        <Card title="回测参数">
          <BacktestParamsForm
            form={form}
            scenario={activeScenario}
            loading={loading}
            onSubmit={handleRun}
            fieldRuntimeConfig={{
              symbol: {
                options: symbolOptions,
                loading: tradingPairsLoading,
              },
            }}
          />
        </Card>

        <Card
          title="K线图"
          extra={
            isTrendScenario ? null : (
              <Space wrap>
                {isKeypointsV3Scenario && (
                  <Segmented
                    size="small"
                    options={[
                      { label: "Final", value: "final" },
                      { label: "Raw", value: "raw" },
                      { label: "Both", value: "both" },
                    ]}
                    value={compareMode}
                    onChange={(value) =>
                      setCompareMode(value as "final" | "raw" | "both")
                    }
                  />
                )}
                <Space size={4}>
                  <Text>支撑阻力</Text>
                  <Switch
                    size="small"
                    checked={showSupportsAndResistances}
                    onChange={setShowSupportsAndResistances}
                  />
                </Space>
                {isKeypointsV3Scenario && (
                  <Space size={4}>
                    <Text>横盘区间</Text>
                    <Switch
                      size="small"
                      checked={showRange}
                      onChange={setShowRange}
                    />
                  </Space>
                )}
              </Space>
            )
          }
        >
          <BacktestKlineChart
            data={result?.chartData}
            compareMode={compareMode}
            showSupportsAndResistances={showSupportsAndResistances}
            showRange={showRange}
          />
        </Card>

        <BacktestResultPanel result={result} />
      </Space>
    </div>
  );
};

export default HistoricalBacktest;
