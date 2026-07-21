import { useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TablePaginationConfig } from "antd/es/table/interface";
import { useRequest } from "ahooks";
import dayjs from "dayjs";
import { getAiMarketMonitorLogList } from "@/api/services/aiMarketMonitorService";
import type {
  AiMarketMonitorCheckInterval,
  AiMarketMonitorLogItem,
  AiMarketMonitorLogListParams,
  AiMarketMonitorNotifyStatus,
} from "@/api/types/aiMarketMonitorTypes";

const PAGE_SIZE = 20;

const CHECK_INTERVAL_OPTIONS: {
  label: string;
  value: AiMarketMonitorCheckInterval;
}[] = [
  { label: "5m", value: "5m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
  { label: "1w", value: "1w" },
];

const NOTIFY_STATUS_OPTIONS: {
  label: string;
  value: AiMarketMonitorNotifyStatus;
}[] = [
  { label: "无需通知", value: "not_needed" },
  { label: "通知成功", value: "success" },
  { label: "通知失败", value: "failed" },
  { label: "数据不足", value: "data_insufficient" },
  { label: "配置无效", value: "config_invalid" },
  { label: "未到通知时间", value: "skipped_not_due" },
];

type QueryFormValues = {
  ruleId?: number;
  symbol?: string;
  checkInterval?: AiMarketMonitorCheckInterval;
  isTriggered?: 0 | 1;
  notifyStatus?: AiMarketMonitorNotifyStatus;
};

const formatDateTime = (value?: string | null) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";

const getIsTriggeredTag = (value: 0 | 1) =>
  value === 1 ? <Tag color="green">命中</Tag> : <Tag>未命中</Tag>;

const getNotifyStatusTag = (value: AiMarketMonitorNotifyStatus) => {
  const statusMap: Record<
    AiMarketMonitorNotifyStatus,
    { color: string; text: string }
  > = {
    not_needed: { color: "default", text: "无需通知" },
    success: { color: "green", text: "通知成功" },
    failed: { color: "red", text: "通知失败" },
    data_insufficient: { color: "orange", text: "数据不足" },
    config_invalid: { color: "volcano", text: "配置无效" },
    skipped_not_due: { color: "default", text: "未到通知时间" },
  };

  const target = statusMap[value];
  return <Tag color={target.color}>{target.text}</Tag>;
};

const showTextModal = (title: string, content?: string | null) => {
  Modal.info({
    title,
    width: 860,
    content: (
      <pre
        style={{
          maxHeight: "500px",
          overflow: "auto",
          backgroundColor: "#f5f5f5",
          padding: "10px",
          borderRadius: "4px",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
        }}
      >
        {content || "-"}
      </pre>
    ),
  });
};

const AiMarketMonitorLog = () => {
  const [queryForm] = Form.useForm<QueryFormValues>();
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE);
  const [queryParams, setQueryParams] = useState<
    Omit<AiMarketMonitorLogListParams, "page" | "pageSize">
  >({});

  const { data, loading, refresh } = useRequest(
    () =>
      getAiMarketMonitorLogList({
        page,
        pageSize,
        ...queryParams,
      }),
    {
      refreshDeps: [page, pageSize, queryParams],
    },
  );

  const handleSearch = (values: QueryFormValues) => {
    setPage(1);
    setQueryParams({
      ruleId: values.ruleId,
      symbol: values.symbol?.trim() || undefined,
      checkInterval: values.checkInterval,
      isTriggered: values.isTriggered,
      notifyStatus: values.notifyStatus,
    });
  };

  const handleReset = () => {
    queryForm.resetFields();
    setPage(1);
    setPageSize(PAGE_SIZE);
    setQueryParams({});
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPage(pagination.current || 1);
    setPageSize(pagination.pageSize || PAGE_SIZE);
  };

  const columns: ColumnsType<AiMarketMonitorLogItem> = [
    {
      title: "日志ID",
      dataIndex: "id",
      key: "id",
      width: 90,
      fixed: "left",
    },
    {
      title: "规则ID",
      dataIndex: "ruleId",
      key: "ruleId",
      width: 90,
    },
    {
      title: "交易对",
      dataIndex: "symbol",
      key: "symbol",
      width: 130,
    },
    {
      title: "周期",
      dataIndex: "checkInterval",
      key: "checkInterval",
      width: 90,
    },
    {
      title: "是否命中",
      dataIndex: "isTriggered",
      key: "isTriggered",
      width: 100,
      render: (value: 0 | 1) => getIsTriggeredTag(value),
    },
    {
      title: "通知状态",
      dataIndex: "notifyStatus",
      key: "notifyStatus",
      width: 130,
      render: (value: AiMarketMonitorNotifyStatus) => getNotifyStatusTag(value),
    },
    {
      title: "检查时间",
      dataIndex: "checkTime",
      key: "checkTime",
      width: 180,
      render: (value: string | null) => formatDateTime(value),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "命中原因",
      dataIndex: "triggerReason",
      key: "triggerReason",
      width: 220,
      ellipsis: true,
      render: (value: string | null) => value || "-",
    },
    {
      title: "通知错误",
      dataIndex: "notifyError",
      key: "notifyError",
      width: 220,
      ellipsis: true,
      render: (value: string | null) =>
        value ? <span style={{ color: "red" }}>{value}</span> : "-",
    },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 240,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => showTextModal("AI Prompt", record.prompt)}
          >
            查看 Prompt
          </Button>
          <Button
            type="link"
            onClick={() => showTextModal("AI 响应", record.aiResponse)}
          >
            查看响应
          </Button>
          <Button
            type="link"
            onClick={() =>
              showTextModal(
                "AI 决策",
                record.decision
                  ? JSON.stringify(record.decision, null, 2)
                  : "-",
              )
            }
          >
            查看决策
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-2">
      <Form<QueryFormValues>
        form={queryForm}
        layout="inline"
        className="!mb-[10px]"
        onFinish={handleSearch}
      >
        <Form.Item label="监控周期" name="checkInterval">
          <Select
            allowClear
            placeholder="请选择周期"
            style={{ width: 140 }}
            options={CHECK_INTERVAL_OPTIONS}
          />
        </Form.Item>
        <Form.Item label="是否命中" name="isTriggered">
          <Select
            allowClear
            placeholder="请选择"
            style={{ width: 140 }}
            options={[
              { label: "未命中", value: 0 },
              { label: "命中", value: 1 },
            ]}
          />
        </Form.Item>
        <Form.Item label="通知状态" name="notifyStatus">
          <Select
            allowClear
            placeholder="请选择通知状态"
            style={{ width: 180 }}
            options={NOTIFY_STATUS_OPTIONS}
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
            <Button onClick={refresh}>刷新</Button>
          </Space>
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data?.list || []}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total: data?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
          showQuickJumper: false,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1900, y: "calc(100vh - 360px)" }}
      />
    </div>
  );
};

export default AiMarketMonitorLog;
