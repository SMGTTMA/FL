import { Button, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRequest } from "ahooks";
import dayjs from "dayjs";
import { getAiMarketMonitorRuleList } from "@/api/services/aiMarketMonitorService";
import type { AiMarketMonitorRuleItem } from "@/api/types/aiMarketMonitorTypes";
import { CreateAiMarketMonitorRule } from "./components/createAiMarketMonitorRule/CreateAiMarketMonitorRule";
import { StopAiMarketMonitorRule } from "./components/stopAiMarketMonitorRule/StopAiMarketMonitorRule";
// import { TestAiMarketMonitorRule } from "./components/testAiMarketMonitorRule/TestAiMarketMonitorRule";

const AiMarketMonitor = () => {
  const {
    data,
    loading,
    run: refresh,
  } = useRequest(() => getAiMarketMonitorRuleList(), {
    refreshDeps: [],
  });

  const columns: ColumnsType<AiMarketMonitorRuleItem> = [
    {
      title: "规则ID",
      dataIndex: "ruleId",
      key: "ruleId",
      width: 90,
      fixed: "left",
    },
    {
      title: "交易对",
      dataIndex: "symbol",
      key: "symbol",
      width: 130,
      fixed: "left",
    },
    {
      title: "监控指令",
      dataIndex: "instruction",
      key: "instruction",
      width: 340,
    },
    {
      title: "周期",
      dataIndex: "checkInterval",
      key: "checkInterval",
      width: 100,
    },
    {
      title: "K线窗口",
      dataIndex: "klineWindow",
      key: "klineWindow",
      width: 100,
      render: (value: number | null) => value ?? "-",
    },
    {
      title: "重复监听",
      dataIndex: "repeatMonitor",
      key: "repeatMonitor",
      width: 110,
      render: (value: boolean) =>
        value ? (
          <Tag color="processing">是</Tag>
        ) : (
          <Tag color="default">否</Tag>
        ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: number) =>
        status === 1 ? (
          <Tag color="green">运行中</Tag>
        ) : (
          <Tag color="red">已停止</Tag>
        ),
    },
    {
      title: "最后检查时间",
      dataIndex: "lastCheckAt",
      key: "lastCheckAt",
      width: 180,
      render: (text: string | null) =>
        text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "最后命中时间",
      dataIndex: "lastTriggerAt",
      key: "lastTriggerAt",
      width: 180,
      render: (text: string | null) =>
        text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (text: string) =>
        text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "操作",
      key: "action",
      width: 140,
      fixed: "right",
      render: (_, record) => (
        <Space>
          {/* <TestAiMarketMonitorRule ruleId={record.ruleId} onSuccess={refresh} /> */}
          <StopAiMarketMonitorRule
            ruleId={record.ruleId}
            disabled={record.status !== 1}
            onSuccess={refresh}
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="p-2">
      <Space className="mb-2">
        <CreateAiMarketMonitorRule onSuccess={refresh} />
        <Button onClick={refresh}>刷新</Button>
      </Space>

      <Table
        rowKey="ruleId"
        columns={columns}
        dataSource={data || []}
        loading={loading}
        pagination={false}
        scroll={{ x: 1600, y: "calc(100vh - 300px)" }}
      />
    </div>
  );
};

export default AiMarketMonitor;
