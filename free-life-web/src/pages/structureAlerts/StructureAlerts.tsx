import { Button, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRequest } from "ahooks";
import dayjs from "dayjs";
import { listStructureAlertRules } from "@/api/services/structureAlertsService";
import type {
  StructureAlertRuleItem,
  StructureAlertTargetType,
} from "@/api/types/structureAlertsTypes";
import { CreateStructureAlertRule } from "./components/createStructureAlertRule/CreateStructureAlertRule";
import { DeleteStructureAlertRule } from "./components/deleteStructureAlertRule/DeleteStructureAlertRule";
import { ToggleStructureAlertRuleStatus } from "./components/toggleStructureAlertRuleStatus/ToggleStructureAlertRuleStatus";

const TARGET_TYPE_TEXT = {
  KEY_LEVEL: "关键位",
  STRUCTURE_LINE: "结构线",
} as const;

const StructureAlerts = () => {
  const {
    data,
    loading,
    run: refresh,
  } = useRequest(() => listStructureAlertRules({}), {
    refreshDeps: [],
  });

  const columns: ColumnsType<StructureAlertRuleItem> = [
    {
      title: "规则ID",
      dataIndex: "id",
      key: "id",
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
      title: "周期",
      dataIndex: "timeframe",
      key: "timeframe",
      width: 100,
    },
    {
      title: "目标类型",
      dataIndex: "targetType",
      key: "targetType",
      width: 110,
      render: (value: StructureAlertTargetType) => TARGET_TYPE_TEXT[value],
    },
    {
      title: "目标ID",
      dataIndex: "targetId",
      key: "targetId",
      width: 100,
    },
    {
      title: "监控靠近",
      dataIndex: "monitorNear",
      key: "monitorNear",
      width: 100,
      render: (value: number) =>
        value === 1 ? <Tag color="processing">开启</Tag> : <Tag>关闭</Tag>,
    },
    {
      title: "监控向上突破",
      dataIndex: "monitorBreakUp",
      key: "monitorBreakUp",
      width: 130,
      render: (value: number) =>
        value === 1 ? <Tag color="success">开启</Tag> : <Tag>关闭</Tag>,
    },
    {
      title: "监控向下跌破",
      dataIndex: "monitorBreakDown",
      key: "monitorBreakDown",
      width: 130,
      render: (value: number) =>
        value === 1 ? <Tag color="error">开启</Tag> : <Tag>关闭</Tag>,
    },
    {
      title: "靠近阈值",
      dataIndex: "nearThreshold",
      key: "nearThreshold",
      width: 120,
      render: (value: number | string | null) => value ?? "-",
    },
    {
      title: "突破阈值",
      dataIndex: "breakoutThreshold",
      key: "breakoutThreshold",
      width: 120,
      render: (value: number | string | null) => value ?? "-",
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
          <Tag color="default">已停用</Tag>
        ),
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      width: 180,
      render: (value: string | null) => value || "-",
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
      width: 180,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <ToggleStructureAlertRuleStatus
            ruleId={record.id}
            enabled={record.status === 1}
            onSuccess={refresh}
          />
          <DeleteStructureAlertRule ruleId={record.id} onSuccess={refresh} />
        </Space>
      ),
    },
  ];

  return (
    <div className="p-2">
      <Space className="mb-2">
        <CreateStructureAlertRule onSuccess={refresh} />
        <Button onClick={refresh}>刷新</Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data || []}
        loading={loading}
        pagination={false}
        scroll={{ x: 1700, y: "calc(100vh - 300px)" }}
      />
    </div>
  );
};

export default StructureAlerts;
