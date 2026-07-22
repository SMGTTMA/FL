import { StrategyStatusEnum, StrategyTypeEnum } from "@/api/enums/global";
import { getStrategiesList } from "@/api/services/strategiesService";
import type { StrategiesListItem, StructureEmaSpotConfig } from "@/api/types/strategiesTypes";
import { useRequest } from "ahooks";
import { Button, Space, Table, Tag, Tooltip } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import dayjs from "dayjs";
import { useState } from "react";
import { AddOrEditStructureEmaSpot } from "./components/addOrEditStructureEmaSpot/AddOrEditStructureEmaSpot";
import { StopStructureEmaSpot } from "./components/stopStructureEmaSpot/StopStructureEmaSpot";

const PAGE_SIZE = 10;

const DIRECTION_LABELS: Record<string, { label: string; color: string }> = {
	UP: { label: "上涨", color: "green" },
	UP_CHANNEL: { label: "上涨通道", color: "green" },
	RANGE: { label: "震荡", color: "blue" },
	DOWN: { label: "下跌", color: "red" },
	DOWN_CHANNEL: { label: "下跌通道", color: "red" },
};

const parseConfig = (configJson?: string): Partial<StructureEmaSpotConfig> | null => {
	if (!configJson) return null;
	try {
		return JSON.parse(configJson) as Partial<StructureEmaSpotConfig>;
	} catch {
		return null;
	}
};

const formatRate = (value: number | undefined) => (typeof value === "number" ? `${(value * 100).toFixed(2)}%` : "-");

const StructureEmaSpot = () => {
	const [page, setPage] = useState(1);
	const {
		data,
		loading,
		run: refresh,
	} = useRequest(
		() =>
			getStrategiesList({
				strategyName: StrategyTypeEnum.STRUCTURE_EMA_SPOT,
				page,
				pageSize: PAGE_SIZE,
			}),
		{ refreshDeps: [page] },
	);

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
			width: 130,
			fixed: "left",
		},
		{
			title: "状态",
			dataIndex: "status",
			key: "status",
			width: 90,
			render: (status: number, record) =>
				status === StrategyStatusEnum.RUNNING ? (
					<Tag color="green">运行中</Tag>
				) : (
					<Tooltip title={record.stopReason || "已停止"}>
						<Tag color="red">已停止</Tag>
					</Tooltip>
				),
		},
		{
			title: "日线方向",
			key: "direction",
			width: 110,
			render: (_, record) => {
				const direction = record.parameters?.lastDirection;
				if (!direction) return "-";
				const option = DIRECTION_LABELS[direction];
				return option ? <Tag color={option.color}>{option.label}</Tag> : direction;
			},
		},
		{
			title: "总资金(USDT)",
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
			render: (value?: string) => (value ? Number(value).toFixed(2) : "-"),
		},
		{
			title: "上涨配置",
			key: "upConfig",
			width: 230,
			render: (_, record) => {
				const up = parseConfig(record.configJson)?.up;
				if (!up) return "-";
				return (
					<Space direction="vertical" size={0}>
						<span>
							{up.timeframe} / EMA{up.emaPeriod} / {up.positionParts}份
						</span>
						<span>入场间距：{formatRate(up.entrySpacingRate)}</span>
						<span>关键位避让：{formatRate(up.keyLevelAvoidanceRate)}</span>
						<span>买单有效：{up.entryOrderExpireBars}根K线</span>
					</Space>
				);
			},
		},
		{
			title: "震荡配置",
			key: "rangeConfig",
			width: 220,
			render: (_, record) => {
				const range = parseConfig(record.configJson)?.range;
				if (!range) return "-";
				return (
					<Space direction="vertical" size={0}>
						<span>
							{range.timeframe} / EMA{range.emaPeriod} / {range.positionParts}份
						</span>
						<span>入场间距：{formatRate(range.entrySpacingRate)}</span>
						<span>买单有效：{range.entryOrderExpireBars}根K线</span>
					</Space>
				);
			},
		},
		{
			title: "最低盈利点",
			key: "profitPoint",
			width: 110,
			render: (_, record) => formatRate(parseConfig(record.configJson)?.profitPoint),
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
			width: 180,
			ellipsis: true,
			render: (value: string | null) => value || "-",
		},
		{
			title: "最后执行时间",
			dataIndex: "lastExecutionTime",
			key: "lastExecutionTime",
			width: 180,
			render: (value: string | null) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-"),
		},
		{
			title: "创建时间",
			dataIndex: "createdAt",
			key: "createdAt",
			width: 180,
			render: (value: string) => (value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-"),
		},
		{
			title: "操作",
			key: "action",
			fixed: "right",
			width: 130,
			render: (_, record) => {
				if (record.status !== StrategyStatusEnum.RUNNING) return "-";
				return (
					<Space>
						<AddOrEditStructureEmaSpot type="edit" record={record} onSuccess={refresh} />
						<StopStructureEmaSpot strategyId={record.id} onSuccess={refresh} />
					</Space>
				);
			},
		},
	];

	const handleTableChange = (pagination: TablePaginationConfig) => {
		setPage(pagination.current || 1);
	};

	return (
		<div className="p-2">
			<Space className="mb-2">
				<AddOrEditStructureEmaSpot type="add" onSuccess={refresh} />
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
				scroll={{ x: 1900, y: "calc(100vh - 300px)" }}
			/>
		</div>
	);
};

export default StructureEmaSpot;
