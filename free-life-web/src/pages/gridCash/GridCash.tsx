import { useState } from "react";
import { Space, Table, Tag, Tooltip, Button } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRequest } from "ahooks";
import dayjs from "dayjs";
import { getStrategiesList } from "@/api/services/strategiesService";
import type { StrategiesListItem } from "@/api/types/strategiesTypes";
import { StrategyStatusEnum, StrategyTypeEnum } from "@/api/enums/global";
import { AddOrEditGridCash } from "./components/addOrEditGridCash/AddOrEditGridCash";
import { StopGridCash } from "./components/stopGridCash/StopGridCash";

/** 每页显示数量 */
const PAGE_SIZE = 10;

const GridCash = () => {
  const [page, setPage] = useState<number>(1);

  const {
    data,
    loading,
    run: refresh,
  } = useRequest(
    () =>
      getStrategiesList({
        strategyName: StrategyTypeEnum.GRID_CASH,
        page,
        pageSize: PAGE_SIZE,
      }),
    {
      refreshDeps: [page],
    }
  );

  /** 表格列定义 */
  const columns: ColumnsType<StrategiesListItem> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
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
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: number, record) => {
        if (status === StrategyStatusEnum.RUNNING) {
          return <Tag color="green">运行中</Tag>;
        }
        return (
          <Tooltip title={record.stopReason || "已停止"}>
            <Tag color="red">已停止</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "总仓位(USDT)",
      dataIndex: "totalPositionSize",
      key: "totalPositionSize",
      width: 130,
      render: (value: string) => Number(value).toFixed(2),
    },
    {
      title: "最小仓位(USDT)",
      dataIndex: "miniPositionSize",
      key: "miniPositionSize",
      width: 140,
      render: (value: string) => (value ? Number(value).toFixed(2) : "-"),
    },
    {
      title: "交易所配置ID",
      dataIndex: "exchangeConfigId",
      key: "exchangeConfigId",
      width: 120,
    },
    {
      title: "停止原因",
      dataIndex: "stopReason",
      key: "stopReason",
      width: 120,
      render: (value: string) => (value ? value : "-"),
    },
    {
      title: "最后执行时间",
      dataIndex: "lastExecutionTime",
      key: "lastExecutionTime",
      width: 180,
      render: (text: string) =>
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
      dataIndex: "action",
      key: "action",
      fixed: "right",
      width: 140,
      render: (_, record) => {
        const isRunning = record.status === StrategyStatusEnum.RUNNING;
        return (
          <Space>
            {isRunning && (
              <AddOrEditGridCash
                onSuccess={refresh}
                type="edit"
                record={record}
              />
            )}
            {isRunning && (
              <StopGridCash strategyId={record.id} onSuccess={refresh} />
            )}
          </Space>
        );
      },
    },
  ];

  /** 处理分页变化 */
  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
  };

  return (
    <div className="p-2">
      <Space className="mb-2">
        <AddOrEditGridCash onSuccess={refresh} type="add" />
        <Button onClick={refresh}>刷新</Button>
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.list || []}
        loading={loading}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.total || 0,
          showSizeChanger: false,
          showQuickJumper: false,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1200, y: "calc(100vh - 300px)" }}
      />
    </div>
  );
};

export default GridCash;
