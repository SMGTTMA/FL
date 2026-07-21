import { useEffect, useState } from "react";
import { useRequest } from "ahooks";
import dayjs, { type Dayjs } from "dayjs";
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { findAll } from "@/api/services/tradingPairsService";
import {
  createStrategyKeyLevel,
  createStrategyStructureLine,
  deleteBatchStrategyKeyLevels,
  deleteBatchStrategyStructureLines,
  listStrategyDirections,
  listStrategyKeyLevels,
  listStrategyStructureLines,
  setStrategyDirection,
  updateStrategyKeyLevel,
  updateStrategyStructureLine,
} from "@/api/services/strategyStructuresService";
import type {
  CreateStrategyKeyLevelParams,
  CreateStrategyStructureLineParams,
  QueryStrategyDirectionListParams,
  QueryStrategyKeyLevelParams,
  QueryStrategyStructureLineParams,
  StrategyBoundary,
  StrategyDirection,
  StrategyDirectionItem,
  StrategyKeyLevelItem,
  StrategyLevelGroup,
  StrategyLineGroup,
  StrategyStructureLineItem,
  StrategyTimeframe,
} from "@/api/types/strategyStructuresTypes";

const TIMEFRAME_OPTIONS: Array<{ label: string; value: StrategyTimeframe }> = [
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
  { label: "1w", value: "1w" },
];

const LEVEL_GROUP_OPTIONS: Array<{ label: string; value: StrategyLevelGroup }> =
  [
    { label: "普通关键位", value: "NORMAL" },
    { label: "震荡区间", value: "RANGE" },
  ];

const LINE_GROUP_OPTIONS: Array<{ label: string; value: StrategyLineGroup }> = [
  { label: "趋势线", value: "TREND" },
  { label: "通道线", value: "CHANNEL" },
];

const BOUNDARY_OPTIONS: Array<{ label: string; value: StrategyBoundary }> = [
  { label: "上沿", value: "UPPER" },
  { label: "下沿", value: "LOWER" },
];

const DIRECTION_OPTIONS: Array<{ label: string; value: StrategyDirection }> = [
  { label: "上升", value: "UP" },
  { label: "下降", value: "DOWN" },
  { label: "震荡", value: "RANGE" },
  { label: "上升通道", value: "UP_CHANNEL" },
  { label: "下降通道", value: "DOWN_CHANNEL" },
];

const LEVEL_GROUP_TEXT: Record<StrategyLevelGroup, string> = {
  NORMAL: "普通关键位",
  RANGE: "震荡区间",
};

const LINE_GROUP_TEXT: Record<StrategyLineGroup, string> = {
  TREND: "趋势线",
  CHANNEL: "通道线",
};

const BOUNDARY_TEXT: Record<StrategyBoundary, string> = {
  UPPER: "上沿",
  LOWER: "下沿",
};

const DIRECTION_TEXT: Record<StrategyDirection, string> = {
  UP: "上升",
  DOWN: "下降",
  RANGE: "震荡",
  UP_CHANNEL: "上升通道",
  DOWN_CHANNEL: "下降通道",
};

type FilterFormValues = {
  symbol?: string;
  timeframe?: StrategyTimeframe;
};

type KeyLevelFormValues = {
  symbol: string;
  timeframe: StrategyTimeframe;
  price: number;
  levelGroup: StrategyLevelGroup;
  boundary?: StrategyBoundary;
  remark?: string;
};

type StructureLineFormValues = {
  symbol: string;
  timeframe: StrategyTimeframe;
  lineGroup: StrategyLineGroup;
  boundary?: StrategyBoundary;
  p1Time: Dayjs;
  p1Price: number;
  p2Time: Dayjs;
  p2Price: number;
  remark?: string;
};

type DirectionFormValues = {
  symbol: string;
  timeframe: StrategyTimeframe;
  direction: StrategyDirection;
  remark?: string;
};

const StrategyStructures = () => {
  const { message } = App.useApp();

  const [filterForm] = Form.useForm<FilterFormValues>();
  const [keyLevelForm] = Form.useForm<KeyLevelFormValues>();
  const [lineForm] = Form.useForm<StructureLineFormValues>();
  const [directionForm] = Form.useForm<DirectionFormValues>();
  const keyLevelGroup = Form.useWatch("levelGroup", keyLevelForm);
  const lineGroup = Form.useWatch("lineGroup", lineForm);

  const [filters, setFilters] = useState<FilterFormValues>({});

  const [keyLevelModalOpen, setKeyLevelModalOpen] = useState(false);
  const [editingKeyLevel, setEditingKeyLevel] =
    useState<StrategyKeyLevelItem | null>(null);
  const [selectedKeyLevelIds, setSelectedKeyLevelIds] = useState<number[]>([]);

  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [editingLine, setEditingLine] =
    useState<StrategyStructureLineItem | null>(null);
  const [selectedLineIds, setSelectedLineIds] = useState<number[]>([]);

  const [directionModalOpen, setDirectionModalOpen] = useState(false);
  const [editingDirection, setEditingDirection] =
    useState<StrategyDirectionItem | null>(null);
  const midnightTime = dayjs().startOf("day");

  const { data: tradingPairsList, loading: tradingPairsLoading } = useRequest(
    () => findAll({ isActive: 1 }),
  );

  const {
    data: keyLevels,
    loading: keyLevelsLoading,
    runAsync: runListKeyLevels,
  } = useRequest(listStrategyKeyLevels, {
    manual: true,
  });

  const {
    data: lines,
    loading: linesLoading,
    runAsync: runListLines,
  } = useRequest(listStrategyStructureLines, {
    manual: true,
  });

  const {
    data: directions,
    loading: directionsLoading,
    runAsync: runListDirections,
  } = useRequest(listStrategyDirections, {
    manual: true,
  });

  const { runAsync: runCreateKeyLevel, loading: createKeyLevelLoading } =
    useRequest(createStrategyKeyLevel, {
      manual: true,
    });

  const { runAsync: runUpdateKeyLevel, loading: updateKeyLevelLoading } =
    useRequest(updateStrategyKeyLevel, {
      manual: true,
    });

  const { runAsync: runDeleteKeyLevels, loading: deleteKeyLevelsLoading } =
    useRequest(deleteBatchStrategyKeyLevels, {
      manual: true,
    });

  const { runAsync: runCreateLine, loading: createLineLoading } = useRequest(
    createStrategyStructureLine,
    {
      manual: true,
    },
  );

  const { runAsync: runUpdateLine, loading: updateLineLoading } = useRequest(
    updateStrategyStructureLine,
    {
      manual: true,
    },
  );

  const { runAsync: runDeleteLines, loading: deleteLinesLoading } = useRequest(
    deleteBatchStrategyStructureLines,
    {
      manual: true,
    },
  );

  const { runAsync: runSetDirection, loading: setDirectionLoading } =
    useRequest(setStrategyDirection, {
      manual: true,
    });

  const normalizeFilters = (
    input: FilterFormValues,
  ): QueryStrategyKeyLevelParams &
    QueryStrategyStructureLineParams &
    QueryStrategyDirectionListParams => {
    const normalizedSymbol = input.symbol?.trim();
    return {
      ...(normalizedSymbol ? { symbol: normalizedSymbol } : {}),
      ...(input.timeframe ? { timeframe: input.timeframe } : {}),
    };
  };

  const loadAllData = async (nextFilters: FilterFormValues) => {
    const payload = normalizeFilters(nextFilters);
    await Promise.all([
      runListKeyLevels(payload),
      runListLines(payload),
      runListDirections(payload),
    ]);
  };

  useEffect(() => {
    void loadAllData({});
  }, []);

  const refreshAll = async () => {
    await loadAllData(filters);
  };

  const handleSearch = async () => {
    const values = await filterForm.validateFields();
    const nextFilters = normalizeFilters(values);
    setFilters(nextFilters);
    await loadAllData(nextFilters);
  };

  const handleResetFilters = async () => {
    filterForm.resetFields();
    setFilters({});
    await loadAllData({});
  };

  const symbolOptions = (tradingPairsList || []).map((item) => ({
    label: item.symbol,
    value: item.symbol,
  }));

  const handleOpenCreateKeyLevel = () => {
    setEditingKeyLevel(null);
    keyLevelForm.resetFields();
    keyLevelForm.setFieldsValue({
      symbol: filters.symbol,
      timeframe: filters.timeframe,
      levelGroup: "NORMAL",
    });
    setKeyLevelModalOpen(true);
  };

  const handleOpenEditKeyLevel = (record: StrategyKeyLevelItem) => {
    setEditingKeyLevel(record);
    keyLevelForm.setFieldsValue({
      symbol: record.symbol,
      timeframe: record.timeframe as StrategyTimeframe,
      price: Number(record.price),
      levelGroup: record.levelGroup,
      boundary: record.boundary ?? undefined,
      remark: record.remark ?? undefined,
    });
    setKeyLevelModalOpen(true);
  };

  const handleSubmitKeyLevel = async () => {
    const values = await keyLevelForm.validateFields();

    if (values.levelGroup === "RANGE" && !values.boundary) {
      message.error("震荡区间必须选择上下沿");
      return;
    }

    if (editingKeyLevel) {
      await runUpdateKeyLevel({
        id: editingKeyLevel.id,
        price: Number(values.price),
        levelGroup: values.levelGroup,
        boundary: values.levelGroup === "RANGE" ? values.boundary : undefined,
        remark: values.remark?.trim() || undefined,
      });
      message.success("关键位更新成功");
    } else {
      const payload: CreateStrategyKeyLevelParams = {
        symbol: values.symbol.trim(),
        timeframe: values.timeframe,
        price: Number(values.price),
        levelGroup: values.levelGroup,
        boundary: values.levelGroup === "RANGE" ? values.boundary : undefined,
        remark: values.remark?.trim() || undefined,
      };
      await runCreateKeyLevel(payload);
      message.success("关键位创建成功");
    }

    setKeyLevelModalOpen(false);
    setEditingKeyLevel(null);
    await runListKeyLevels(normalizeFilters(filters));
  };

  const handleDeleteKeyLevel = async (id: number) => {
    await runDeleteKeyLevels({ ids: [id] });
    message.success("删除成功");
    await runListKeyLevels(normalizeFilters(filters));
    setSelectedKeyLevelIds((prev) => prev.filter((item) => item !== id));
  };

  const handleDeleteSelectedKeyLevels = async () => {
    if (!selectedKeyLevelIds.length) return;

    await runDeleteKeyLevels({ ids: selectedKeyLevelIds });
    message.success("批量删除成功");
    await runListKeyLevels(normalizeFilters(filters));
    setSelectedKeyLevelIds([]);
  };

  const handleOpenCreateLine = () => {
    setEditingLine(null);
    lineForm.resetFields();
    lineForm.setFieldsValue({
      symbol: filters.symbol,
      timeframe: filters.timeframe,
      lineGroup: "TREND",
      p1Time: dayjs().startOf("day"),
      p2Time: dayjs().add(1, "day").startOf("day"),
    });
    setLineModalOpen(true);
  };

  const handleOpenEditLine = (record: StrategyStructureLineItem) => {
    setEditingLine(record);
    lineForm.setFieldsValue({
      symbol: record.symbol,
      timeframe: record.timeframe as StrategyTimeframe,
      lineGroup: record.lineGroup,
      boundary: record.boundary ?? undefined,
      p1Time: dayjs(Number(record.p1Time)),
      p1Price: Number(record.p1Price),
      p2Time: dayjs(Number(record.p2Time)),
      p2Price: Number(record.p2Price),
      remark: record.remark ?? undefined,
    });
    setLineModalOpen(true);
  };

  const handleSubmitLine = async () => {
    const values = await lineForm.validateFields();

    if (values.lineGroup === "CHANNEL" && !values.boundary) {
      message.error("通道线必须选择上下沿");
      return;
    }

    const p1Time = values.p1Time.valueOf();
    const p2Time = values.p2Time.valueOf();
    if (p1Time === p2Time) {
      message.error("两个锚点时间不能相同");
      return;
    }

    if (editingLine) {
      await runUpdateLine({
        id: editingLine.id,
        lineGroup: values.lineGroup,
        boundary: values.lineGroup === "CHANNEL" ? values.boundary : undefined,
        p1Time,
        p1Price: Number(values.p1Price),
        p2Time,
        p2Price: Number(values.p2Price),
        remark: values.remark?.trim() || undefined,
      });
      message.success("结构线更新成功");
    } else {
      const payload: CreateStrategyStructureLineParams = {
        symbol: values.symbol.trim(),
        timeframe: values.timeframe,
        lineGroup: values.lineGroup,
        boundary: values.lineGroup === "CHANNEL" ? values.boundary : undefined,
        p1Time,
        p1Price: Number(values.p1Price),
        p2Time,
        p2Price: Number(values.p2Price),
        remark: values.remark?.trim() || undefined,
      };
      await runCreateLine(payload);
      message.success("结构线创建成功");
    }

    setLineModalOpen(false);
    setEditingLine(null);
    await runListLines(normalizeFilters(filters));
  };

  const handleDeleteLine = async (id: number) => {
    await runDeleteLines({ ids: [id] });
    message.success("删除成功");
    await runListLines(normalizeFilters(filters));
    setSelectedLineIds((prev) => prev.filter((item) => item !== id));
  };

  const handleDeleteSelectedLines = async () => {
    if (!selectedLineIds.length) return;

    await runDeleteLines({ ids: selectedLineIds });
    message.success("批量删除成功");
    await runListLines(normalizeFilters(filters));
    setSelectedLineIds([]);
  };

  const handleOpenCreateDirection = () => {
    setEditingDirection(null);
    directionForm.resetFields();
    directionForm.setFieldsValue({
      symbol: filters.symbol,
      timeframe: filters.timeframe,
    });
    setDirectionModalOpen(true);
  };

  const handleOpenEditDirection = (record: StrategyDirectionItem) => {
    setEditingDirection(record);
    directionForm.setFieldsValue({
      symbol: record.symbol,
      timeframe: record.timeframe as StrategyTimeframe,
      direction: record.direction,
      remark: record.remark ?? undefined,
    });
    setDirectionModalOpen(true);
  };

  const handleSubmitDirection = async () => {
    const values = await directionForm.validateFields();

    await runSetDirection({
      symbol: values.symbol.trim(),
      timeframe: values.timeframe,
      direction: values.direction,
      remark: values.remark?.trim() || undefined,
    });

    message.success(editingDirection ? "方向更新成功" : "方向创建成功");
    setDirectionModalOpen(false);
    setEditingDirection(null);
    await runListDirections(normalizeFilters(filters));
  };

  const keyLevelColumns: ColumnsType<StrategyKeyLevelItem> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      fixed: "left",
    },
    {
      title: "交易对",
      dataIndex: "symbol",
      key: "symbol",
      width: 120,
    },
    {
      title: "周期",
      dataIndex: "timeframe",
      key: "timeframe",
      width: 90,
    },
    {
      title: "价格",
      dataIndex: "price",
      key: "price",
      width: 140,
      render: (value: number | string) => Number(value).toFixed(8),
    },
    {
      title: "类型",
      dataIndex: "levelGroup",
      key: "levelGroup",
      width: 120,
      render: (value: StrategyLevelGroup) => LEVEL_GROUP_TEXT[value],
    },
    {
      title: "边界",
      dataIndex: "boundary",
      key: "boundary",
      width: 100,
      render: (value: StrategyBoundary | null) =>
        value ? <Tag color="blue">{BOUNDARY_TEXT[value]}</Tag> : "-",
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      width: 220,
      render: (value: string | null) => value || "-",
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "操作",
      key: "action",
      width: 140,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handleOpenEditKeyLevel(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该关键位？"
            onConfirm={() => handleDeleteKeyLevel(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const lineColumns: ColumnsType<StrategyStructureLineItem> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      fixed: "left",
    },
    {
      title: "交易对",
      dataIndex: "symbol",
      key: "symbol",
      width: 120,
    },
    {
      title: "周期",
      dataIndex: "timeframe",
      key: "timeframe",
      width: 90,
    },
    {
      title: "类型",
      dataIndex: "lineGroup",
      key: "lineGroup",
      width: 120,
      render: (value: StrategyLineGroup) => LINE_GROUP_TEXT[value],
    },
    {
      title: "边界",
      dataIndex: "boundary",
      key: "boundary",
      width: 100,
      render: (value: StrategyBoundary | null) =>
        value ? <Tag color="blue">{BOUNDARY_TEXT[value]}</Tag> : "-",
    },
    {
      title: "P1 时间",
      dataIndex: "p1Time",
      key: "p1Time",
      width: 180,
      render: (value: number | string) =>
        dayjs(Number(value)).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "P1 价格",
      dataIndex: "p1Price",
      key: "p1Price",
      width: 140,
      render: (value: number | string) => Number(value).toFixed(8),
    },
    {
      title: "P2 时间",
      dataIndex: "p2Time",
      key: "p2Time",
      width: 180,
      render: (value: number | string) =>
        dayjs(Number(value)).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "P2 价格",
      dataIndex: "p2Price",
      key: "p2Price",
      width: 140,
      render: (value: number | string) => Number(value).toFixed(8),
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      width: 220,
      render: (value: string | null) => value || "-",
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "操作",
      key: "action",
      width: 140,
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handleOpenEditLine(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该结构线？"
            onConfirm={() => handleDeleteLine(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const directionColumns: ColumnsType<StrategyDirectionItem> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      fixed: "left",
    },
    {
      title: "交易对",
      dataIndex: "symbol",
      key: "symbol",
      width: 120,
    },
    {
      title: "周期",
      dataIndex: "timeframe",
      key: "timeframe",
      width: 90,
    },
    {
      title: "方向",
      dataIndex: "direction",
      key: "direction",
      width: 140,
      render: (value: StrategyDirection) => DIRECTION_TEXT[value],
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      width: 260,
      render: (value: string | null) => value || "-",
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 180,
      render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "操作",
      key: "action",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Button type="link" onClick={() => handleOpenEditDirection(record)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div className="p-2">
      <Card className="mb-3">
        <Form form={filterForm}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="交易对" name="symbol">
                <Select
                  showSearch
                  loading={tradingPairsLoading}
                  options={symbolOptions}
                  placeholder="全部"
                  allowClear
                  filterOption={(input, option) =>
                    String(option?.label || "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item label="周期" name="timeframe">
                <Select
                  options={TIMEFRAME_OPTIONS}
                  placeholder="全部"
                  allowClear
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Space>
                <Button type="primary" onClick={handleSearch}>
                  查询
                </Button>
                <Button onClick={handleResetFilters}>重置</Button>
                <Button onClick={refreshAll}>刷新</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </Card>

      <Tabs
        items={[
          {
            key: "key-levels",
            label: "关键位",
            children: (
              <>
                <Space className="mb-2">
                  <Button type="primary" onClick={handleOpenCreateKeyLevel}>
                    新增关键位
                  </Button>
                  <Popconfirm
                    title="确认批量删除已选关键位？"
                    onConfirm={handleDeleteSelectedKeyLevels}
                    okText="确定"
                    cancelText="取消"
                    disabled={!selectedKeyLevelIds.length}
                  >
                    <Button
                      danger
                      loading={deleteKeyLevelsLoading}
                      disabled={!selectedKeyLevelIds.length}
                    >
                      批量删除
                    </Button>
                  </Popconfirm>
                </Space>

                <Table
                  rowKey="id"
                  columns={keyLevelColumns}
                  dataSource={keyLevels || []}
                  loading={keyLevelsLoading}
                  pagination={false}
                  rowSelection={{
                    selectedRowKeys: selectedKeyLevelIds,
                    onChange: (keys) =>
                      setSelectedKeyLevelIds(keys.map((key) => Number(key))),
                  }}
                  scroll={{ x: 1300, y: "calc(100vh - 360px)" }}
                />
              </>
            ),
          },
          {
            key: "structure-lines",
            label: "结构线",
            children: (
              <>
                <Space className="mb-2">
                  <Button type="primary" onClick={handleOpenCreateLine}>
                    新增结构线
                  </Button>
                  <Popconfirm
                    title="确认批量删除已选结构线？"
                    onConfirm={handleDeleteSelectedLines}
                    okText="确定"
                    cancelText="取消"
                    disabled={!selectedLineIds.length}
                  >
                    <Button
                      danger
                      loading={deleteLinesLoading}
                      disabled={!selectedLineIds.length}
                    >
                      批量删除
                    </Button>
                  </Popconfirm>
                </Space>

                <Table
                  rowKey="id"
                  columns={lineColumns}
                  dataSource={lines || []}
                  loading={linesLoading}
                  pagination={false}
                  rowSelection={{
                    selectedRowKeys: selectedLineIds,
                    onChange: (keys) =>
                      setSelectedLineIds(keys.map((key) => Number(key))),
                  }}
                  scroll={{ x: 1700, y: "calc(100vh - 360px)" }}
                />
              </>
            ),
          },
          {
            key: "directions",
            label: "方向",
            children: (
              <>
                <Space className="mb-2">
                  <Button type="primary" onClick={handleOpenCreateDirection}>
                    新增方向
                  </Button>
                </Space>

                <Table
                  rowKey="id"
                  columns={directionColumns}
                  dataSource={directions || []}
                  loading={directionsLoading}
                  pagination={false}
                  scroll={{ x: 1100, y: "calc(100vh - 360px)" }}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title={editingKeyLevel ? "编辑关键位" : "新增关键位"}
        open={keyLevelModalOpen}
        onCancel={() => {
          setKeyLevelModalOpen(false);
          setEditingKeyLevel(null);
        }}
        onOk={handleSubmitKeyLevel}
        confirmLoading={createKeyLevelLoading || updateKeyLevelLoading}
        destroyOnClose
      >
        <Form
          form={keyLevelForm}
          layout="vertical"
          preserve={false}
          onValuesChange={(changedValues: Partial<KeyLevelFormValues>) => {
            if (changedValues.levelGroup === "NORMAL") {
              keyLevelForm.setFieldValue("boundary", undefined);
            }
          }}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="交易对"
                name="symbol"
                rules={[{ required: true, message: "请选择交易对" }]}
              >
                <Select
                  showSearch
                  options={symbolOptions}
                  placeholder="请选择交易对"
                  disabled={!!editingKeyLevel}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="周期"
                name="timeframe"
                rules={[{ required: true, message: "请选择周期" }]}
              >
                <Select
                  options={TIMEFRAME_OPTIONS}
                  placeholder="请选择周期"
                  disabled={!!editingKeyLevel}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="价格"
            name="price"
            rules={[{ required: true, message: "请输入价格" }]}
          >
            <InputNumber style={{ width: "100%" }} min={0.00000001} />
          </Form.Item>

          <Form.Item
            label="类型"
            name="levelGroup"
            rules={[{ required: true, message: "请选择类型" }]}
          >
            <Select options={LEVEL_GROUP_OPTIONS} />
          </Form.Item>

          <Form.Item label="边界" name="boundary">
            <Select
              options={BOUNDARY_OPTIONS}
              placeholder="仅震荡区间需要"
              allowClear
              disabled={keyLevelGroup !== "RANGE"}
            />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea
              rows={3}
              maxLength={255}
              showCount
              placeholder="可选"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingLine ? "编辑结构线" : "新增结构线"}
        open={lineModalOpen}
        onCancel={() => {
          setLineModalOpen(false);
          setEditingLine(null);
        }}
        onOk={handleSubmitLine}
        confirmLoading={createLineLoading || updateLineLoading}
        destroyOnClose
        width={760}
      >
        <Form
          form={lineForm}
          layout="vertical"
          preserve={false}
          onValuesChange={(changedValues: Partial<StructureLineFormValues>) => {
            if (changedValues.lineGroup === "TREND") {
              lineForm.setFieldValue("boundary", undefined);
            }
          }}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="交易对"
                name="symbol"
                rules={[{ required: true, message: "请选择交易对" }]}
              >
                <Select
                  showSearch
                  options={symbolOptions}
                  placeholder="请选择交易对"
                  disabled={!!editingLine}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="周期"
                name="timeframe"
                rules={[{ required: true, message: "请选择周期" }]}
              >
                <Select
                  options={TIMEFRAME_OPTIONS}
                  placeholder="请选择周期"
                  disabled={!!editingLine}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="类型"
                name="lineGroup"
                rules={[{ required: true, message: "请选择类型" }]}
              >
                <Select options={LINE_GROUP_OPTIONS} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="边界" name="boundary">
                <Select
                  options={BOUNDARY_OPTIONS}
                  placeholder="仅通道线需要"
                  allowClear
                  disabled={lineGroup !== "CHANNEL"}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="P1 时间"
                name="p1Time"
                rules={[{ required: true, message: "请选择 P1 时间" }]}
              >
                <DatePicker
                  showTime={{ defaultOpenValue: midnightTime }}
                  style={{ width: "100%" }}
                  format="YYYY-MM-DD HH:mm:ss"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="P1 价格"
                name="p1Price"
                rules={[{ required: true, message: "请输入 P1 价格" }]}
              >
                <InputNumber style={{ width: "100%" }} min={0.00000001} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="P2 时间"
                name="p2Time"
                rules={[{ required: true, message: "请选择 P2 时间" }]}
              >
                <DatePicker
                  showTime={{ defaultOpenValue: midnightTime }}
                  style={{ width: "100%" }}
                  format="YYYY-MM-DD HH:mm:ss"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="P2 价格"
                name="p2Price"
                rules={[{ required: true, message: "请输入 P2 价格" }]}
              >
                <InputNumber style={{ width: "100%" }} min={0.00000001} />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item label="备注" name="remark">
                <Input.TextArea
                  rows={3}
                  maxLength={255}
                  showCount
                  placeholder="可选"
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={editingDirection ? "编辑方向" : "新增方向"}
        open={directionModalOpen}
        onCancel={() => {
          setDirectionModalOpen(false);
          setEditingDirection(null);
        }}
        onOk={handleSubmitDirection}
        confirmLoading={setDirectionLoading}
        destroyOnClose
      >
        <Form form={directionForm} layout="vertical" preserve={false}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="交易对"
                name="symbol"
                rules={[{ required: true, message: "请选择交易对" }]}
              >
                <Select
                  showSearch
                  options={symbolOptions}
                  placeholder="请选择交易对"
                  disabled={!!editingDirection}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                label="周期"
                name="timeframe"
                rules={[{ required: true, message: "请选择周期" }]}
              >
                <Select
                  options={TIMEFRAME_OPTIONS}
                  placeholder="请选择周期"
                  disabled={!!editingDirection}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="方向"
            name="direction"
            rules={[{ required: true, message: "请选择方向" }]}
          >
            <Select options={DIRECTION_OPTIONS} placeholder="请选择方向" />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea
              rows={3}
              maxLength={255}
              showCount
              placeholder="可选"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StrategyStructures;
