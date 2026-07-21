import { Space, Table, Tag, Button } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRequest } from "ahooks";
import dayjs from "dayjs";
import { App } from "antd";
import {
  getSignalWatchList,
  testSend,
} from "@/api/services/indicatorSignalService";
import type { SignalWatchListItem } from "@/api/types/indicatorSignalTypes";
import { StartSignalWatch } from "./components/startSignalWatch/StartSignalWatch";
import { StopSignalWatch } from "./components/stopSignalWatch/StopSignalWatch";

const IndicatorSignal = () => {
  const { message } = App.useApp();
  const {
    data,
    loading,
    run: refresh,
  } = useRequest(() => getSignalWatchList(), {
    refreshDeps: [],
  });

  const { runAsync: runTestSend, loading: testSendLoading } = useRequest(
    testSend,
    { manual: true },
  );

  /** 测试发送 */
  const handleTestSend = async (record: SignalWatchListItem) => {
    try {
      const res = await runTestSend({
        symbol: record.symbol,
        exchangeConfigId: record.exchangeConfigId,
      });
      message.success(res ?? "测试发送成功");
    } catch (e) {
      message.error((e as Error)?.message ?? "测试发送失败");
    }
  };

  /** 表格列定义 */
  const columns: ColumnsType<SignalWatchListItem> = [
    {
      title: "监听ID",
      dataIndex: "watchId",
      key: "watchId",
      width: 70,
      fixed: "left",
    },
    {
      title: "交易对",
      dataIndex: "symbol",
      key: "symbol",
      width: 150,
      fixed: "left",
    },
    {
      title: "交易所配置ID",
      dataIndex: "exchangeConfigId",
      key: "exchangeConfigId",
      width: 120,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: number) => {
        if (status === 1) {
          return <Tag color="green">运行中</Tag>;
        }
        return <Tag color="red">已停止</Tag>;
      },
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
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (text: string) =>
        text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "操作",
      dataIndex: "action",
      key: "action",
      fixed: "right",
      width: 100,
      render: (_, record) => {
        const isRunning = record.status === 1;
        return (
          <Space>
            {isRunning && (
              <Button
                size="small"
                type="link"
                loading={testSendLoading}
                onClick={() => handleTestSend(record)}
              >
                DP分析
              </Button>
            )}
            {isRunning && (
              <StopSignalWatch watchId={record.watchId} onSuccess={refresh} />
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="p-2">
      <Space className="mb-2">
        <StartSignalWatch onSuccess={refresh} />
        <Button onClick={refresh}>刷新</Button>
      </Space>
      <Table
        rowKey="watchId"
        columns={columns}
        dataSource={data || []}
        loading={loading}
        pagination={false}
        scroll={{ x: 1000, y: "calc(100vh - 300px)" }}
      />
    </div>
  );
};

export default IndicatorSignal;
