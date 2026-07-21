import { Card, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { HistoricalBacktestKeyPoint } from "@/api/types/historicalBacktestTypes";
import type {
  BacktestScenarioRunResult,
  GridCashKeypointsScenarioViewData,
  TrendStrengthScenarioViewData,
} from "../scenarios/types";

const { Text } = Typography;

type BacktestResultPanelProps = {
  result?: BacktestScenarioRunResult;
};

type KeyPointRow = {
  key: string;
  price: number;
  strength: number;
  touches: number;
  latestTouchAt?: string;
};

const toRows = (
  list: HistoricalBacktestKeyPoint[],
  latestTouchAtEnd = false,
): KeyPointRow[] => {
  return list.map((item, index) => ({
    key: `${item.price}-${index}`,
    price: item.price,
    strength: item.strength,
    touches: item.timestamps?.length ?? 0,
    latestTouchAt: latestTouchAtEnd
      ? item.timestamps?.[item.timestamps.length - 1]
      : item.timestamps?.[0],
  }));
};

const columns: ColumnsType<KeyPointRow> = [
  {
    title: "价格",
    dataIndex: "price",
    key: "price",
    width: 120,
    render: (value: number) => value.toFixed(6),
  },
  {
    title: "强度",
    dataIndex: "strength",
    key: "strength",
    width: 100,
    render: (value: number) => value.toFixed(4),
  },
  {
    title: "触及次数",
    dataIndex: "touches",
    key: "touches",
    width: 100,
  },
  {
    title: "最近触及时间",
    dataIndex: "latestTouchAt",
    key: "latestTouchAt",
    render: (value?: string) =>
      value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-",
  },
];

const getFollowStatusTagColor = (status: string): string => {
  if (status === "triggered") return "success";
  if (status === "waiting_pullback" || status === "waiting_breakout") {
    return "warning";
  }
  if (status === "insufficient_data") return "default";
  return "default";
};

const renderKeypointsPanel = (
  viewData: GridCashKeypointsScenarioViewData,
) => {
  const finalRows = toRows(viewData.keyPoints ?? [], true);
  const supportRows = toRows(viewData.supports ?? [], true);
  const resistanceRows = toRows(viewData.resistances ?? [], true);
  const effectiveOptions =
    typeof viewData.meta?.options === "object" && viewData.meta.options !== null
      ? (viewData.meta.options as Record<string, unknown>)
      : null;
  const effectiveOptionsText = effectiveOptions
    ? Object.entries(effectiveOptions)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join("，")
    : "";

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Card title="回测摘要">
        <Space wrap>
          <Tag color="processing">{viewData.symbol}</Tag>
          <Tag>{viewData.timeframe}</Tag>
          <Tag>{viewData.env}</Tag>
          <Tag color="gold">latestClose: {viewData.latestClose ?? "-"}</Tag>
        </Space>

        <div className="mt-3">
          <Text>关键位数量：</Text>
          <Text strong>{viewData.keyPoints.length}</Text>
        </div>
        <div className="mt-1">
          <Text>支撑/阻力：</Text>
          <Text
            strong
          >{`${viewData.supports.length}/${viewData.resistances.length}`}</Text>
        </div>
        {effectiveOptionsText && (
          <div className="mt-2">
            <Text type="secondary">生效参数：{effectiveOptionsText}</Text>
          </div>
        )}
      </Card>

      <Card title="关键位（最终）">
        <Table
          size="small"
          rowKey="key"
          columns={columns}
          dataSource={finalRows}
          pagination={false}
          scroll={{ x: 680, y: 220 }}
        />
      </Card>

      <Card title="支撑位">
        <Table
          size="small"
          rowKey="key"
          columns={columns}
          dataSource={supportRows}
          pagination={false}
          scroll={{ x: 680, y: 180 }}
        />
      </Card>

      <Card title="阻力位">
        <Table
          size="small"
          rowKey="key"
          columns={columns}
          dataSource={resistanceRows}
          pagination={false}
          scroll={{ x: 680, y: 180 }}
        />
      </Card>
    </Space>
  );
};

const renderTrendPanel = (
  _result: BacktestScenarioRunResult,
  viewData: TrendStrengthScenarioViewData,
) => {
  const trend = viewData.trendResult;
  const followThrough = trend.followThrough;
  const forwardBacktest = viewData.forwardBacktest;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Card title="回测摘要（趋势强弱）">
        <Space wrap>
          <Tag color="processing">{viewData.symbol}</Tag>
          <Tag>{viewData.timeframe}</Tag>
          <Tag>{viewData.env}</Tag>
          <Tag color="gold">latestClose: {viewData.latestClose ?? "-"}</Tag>
          <Tag color="purple">source: {trend.chosenSource}</Tag>
          <Tag
            color={
              trend.direction === "up"
                ? "green"
                : trend.direction === "down"
                  ? "red"
                  : "default"
            }
          >
            direction: {trend.direction}
          </Tag>
          <Tag color="blue">confidence: {trend.confidence.toFixed(4)}</Tag>
          <Tag color={getFollowStatusTagColor(followThrough.status)}>
            followThrough: {followThrough.status}
          </Tag>
          <Tag color={getFollowStatusTagColor(forwardBacktest.status)}>
            forwardBacktest: {forwardBacktest.status}
          </Tag>
        </Space>

        <div className="mt-2">
          <Text type="secondary">
            evaluateAt:{" "}
            {dayjs(viewData.evaluateAt).format("YYYY-MM-DD HH:mm:ss")}
          </Text>
        </div>
        {viewData.anchor && (
          <div className="mt-1">
            <Text>
              锚点K线：
              {dayjs(viewData.anchor.timestamp).format("YYYY-MM-DD HH:mm:ss")}
              （close: {viewData.anchor.close}）
            </Text>
          </div>
        )}
        <div className="mt-1">
          <Text type="secondary">
            最后确认腿时间：
            {trend.lastConfirmedLegTime
              ? dayjs(trend.lastConfirmedLegTime).format("YYYY-MM-DD HH:mm:ss")
              : "-"}
          </Text>
        </div>
        <div className="mt-2">
          <Text strong>{trend.reason}</Text>
        </div>
        <div className="mt-1">
          <Text type="secondary">
            图表标记：青色虚线=evaluateAt，橙色实线=决策点（优先triggerTime，其次refTime，再次lastConfirmedLegTime）。
          </Text>
        </div>
      </Card>

      <Card title="后续行为验证">
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <div>
            <Text strong>识别窗口内状态：</Text>
            <Text>{` status=${followThrough.status}, direction=${followThrough.direction ?? "-"}`}</Text>
            <div>
              <Text type="secondary">{followThrough.reason}</Text>
            </div>
            <div>
              <Text type="secondary">
                anchorTime:{" "}
                {followThrough.anchorTime
                  ? dayjs(followThrough.anchorTime).format("YYYY-MM-DD HH:mm:ss")
                  : "-"}
                ，triggerTime:{" "}
                {followThrough.triggerTime
                  ? dayjs(followThrough.triggerTime).format("YYYY-MM-DD HH:mm:ss")
                  : "-"}
                ，triggerPrice: {followThrough.triggerPrice ?? "-"}
              </Text>
            </div>
          </div>

          <div>
            <Text strong>evaluateAt 后验证：</Text>
            <Text>{` status=${forwardBacktest.status}, direction=${forwardBacktest.direction ?? "-"}, barsChecked=${forwardBacktest.barsChecked}`}</Text>
            <div>
              <Text type="secondary">{forwardBacktest.reason}</Text>
            </div>
            <div>
              <Text type="secondary">
                refTime:{" "}
                {forwardBacktest.breakoutReferenceTime
                  ? dayjs(forwardBacktest.breakoutReferenceTime).format(
                      "YYYY-MM-DD HH:mm:ss",
                    )
                  : "-"}
                ，triggerTime:{" "}
                {forwardBacktest.triggerTime
                  ? dayjs(forwardBacktest.triggerTime).format(
                      "YYYY-MM-DD HH:mm:ss",
                    )
                  : "-"}
                ，triggerPrice: {forwardBacktest.triggerPrice ?? "-"}
              </Text>
            </div>
          </div>
        </Space>
      </Card>

      <Card title="三类信号对比">
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <div>
            <Text strong>动量：</Text>
            <Text>{` direction=${trend.momentum.direction}, clarity=${trend.momentum.clarity.toFixed(4)}, qualified=${trend.momentum.qualified}`}</Text>
            <div>
              <Text type="secondary">{trend.momentum.reason}</Text>
            </div>
          </div>
          <div>
            <Text strong>投影：</Text>
            <Text>{` direction=${trend.projection.direction}, clarity=${trend.projection.clarity.toFixed(4)}, qualified=${trend.projection.qualified}`}</Text>
            <div>
              <Text type="secondary">{trend.projection.reason}</Text>
            </div>
          </div>
          <div>
            <Text strong>深度：</Text>
            <Text>{` direction=${trend.depth.direction}, clarity=${trend.depth.clarity.toFixed(4)}, qualified=${trend.depth.qualified}`}</Text>
            <div>
              <Text type="secondary">{trend.depth.reason}</Text>
            </div>
          </div>
        </Space>
      </Card>
    </Space>
  );
};

export const BacktestResultPanel = ({ result }: BacktestResultPanelProps) => {
  if (!result) {
    return (
      <Card title="回测结果">
        <Empty description="请先执行一次回测" />
      </Card>
    );
  }

  if (result.scenarioId === "trend_strength") {
    return renderTrendPanel(
      result,
      result.viewData as TrendStrengthScenarioViewData,
    );
  }

  return renderKeypointsPanel(
    result.viewData as GridCashKeypointsScenarioViewData,
  );
};
