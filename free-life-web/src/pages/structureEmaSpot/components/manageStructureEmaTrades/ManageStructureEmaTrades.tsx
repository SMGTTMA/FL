import { getStructureEmaSpotTrades, manualExitStructureEmaSpot } from "@/api/services/strategiesService";
import type { ActiveSpotEmaTrade, ActiveSpotEmaTradeStatus } from "@/api/types/strategiesTypes";
import { useRequest } from "ahooks";
import { Alert, App, Button, Checkbox, Descriptions, InputNumber, Modal, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

type ManageStructureEmaTradesProps = {
	strategyId: number;
	symbol: string;
	onSuccess?: () => void;
};

const STATUS_OPTIONS: Record<ActiveSpotEmaTradeStatus, { label: string; color: string }> = {
	PENDING_BUY: { label: "待买入", color: "orange" },
	HOLDING: { label: "已持仓", color: "blue" },
	PENDING_SELL: { label: "待卖出", color: "green" },
};

const formatNumber = (value: string | number, digits = 8) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed.toLocaleString(undefined, { maximumFractionDigits: digits }) : "-";
};

export const ManageStructureEmaTrades = ({ strategyId, symbol, onSuccess }: ManageStructureEmaTradesProps) => {
	const { message } = App.useApp();
	const [open, setOpen] = useState(false);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [exitPrice, setExitPrice] = useState<number | null>(null);
	const [pauseEntry, setPauseEntry] = useState(true);

	const {
		data: trades,
		loading: tradesLoading,
		runAsync: loadTrades,
	} = useRequest(getStructureEmaSpotTrades, { manual: true });

	const { loading: exitLoading, runAsync: manualExit } = useRequest(manualExitStructureEmaSpot, { manual: true });

	const selectedTrades = useMemo(() => {
		const selectedSet = new Set(selectedIds);
		return (trades || []).filter((item) => selectedSet.has(item.id));
	}, [selectedIds, trades]);

	const summary = useMemo(() => {
		const amount = selectedTrades.reduce((sum, item) => sum + Number(item.tradeAmount), 0);
		const cost = selectedTrades.reduce((sum, item) => sum + Number(item.positionCost), 0);
		const estimatedProfit = exitPrice ? exitPrice * amount - cost : null;
		return {
			amount,
			cost,
			averageEntryPrice: amount > 0 ? cost / amount : 0,
			estimatedProfit,
			estimatedProfitRate: estimatedProfit !== null && cost > 0 ? estimatedProfit / cost : null,
		};
	}, [exitPrice, selectedTrades]);

	const handleOpen = async () => {
		setOpen(true);
		setSelectedIds([]);
		setExitPrice(null);
		setPauseEntry(true);
		await loadTrades({ strategyId });
	};

	const handleManualExit = async () => {
		if (!selectedIds.length) {
			message.warning("请先选择需要出场的持仓");
			return;
		}
		if (!exitPrice || exitPrice <= 0) {
			message.warning("请输入有效的手动出场价格");
			return;
		}

		const result = await manualExit({
			strategyId,
			tradeIds: selectedIds,
			exitPrice,
			pauseEntry,
		});
		message.success(result);
		setSelectedIds([]);
		setExitPrice(null);
		await loadTrades({ strategyId });
		onSuccess?.();
	};

	const columns: ColumnsType<ActiveSpotEmaTrade> = [
		{ title: "批次ID", dataIndex: "id", key: "id", width: 80 },
		{
			title: "状态",
			dataIndex: "tradeStatus",
			key: "tradeStatus",
			width: 90,
			render: (status: ActiveSpotEmaTradeStatus) => {
				const option = STATUS_OPTIONS[status];
				return <Tag color={option.color}>{option.label}</Tag>;
			},
		},
		{
			title: "来源",
			dataIndex: "sourceMode",
			key: "sourceMode",
			width: 80,
			render: (value: ActiveSpotEmaTrade["sourceMode"]) =>
				value === "UP" ? "上涨" : value === "RANGE" ? "震荡" : "聚合",
		},
		{
			title: "信号",
			key: "signal",
			width: 110,
			render: (_, record) =>
				record.signalTimeframe && record.emaPeriod ? `${record.signalTimeframe} / EMA${record.emaPeriod}` : "-",
		},
		{
			title: "入场价",
			dataIndex: "entryPrice",
			key: "entryPrice",
			width: 120,
			render: (value) => formatNumber(value),
		},
		{
			title: "目标出场价",
			dataIndex: "takeProfitPrice",
			key: "takeProfitPrice",
			width: 120,
			render: (value) => formatNumber(value),
		},
		{
			title: "数量",
			dataIndex: "tradeAmount",
			key: "tradeAmount",
			width: 120,
			render: (value) => formatNumber(value),
		},
		{
			title: "成本(USDT)",
			dataIndex: "positionCost",
			key: "positionCost",
			width: 120,
			render: (value) => formatNumber(value, 2),
		},
		{
			title: "订单ID",
			dataIndex: "orderId",
			key: "orderId",
			width: 160,
			ellipsis: true,
			render: (value: string | null) => value || "-",
		},
		{
			title: "创建时间",
			dataIndex: "createdAt",
			key: "createdAt",
			width: 170,
			render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm:ss"),
		},
	];

	return (
		<>
			<Button type="link" onClick={handleOpen}>
				持仓管理
			</Button>
			<Modal
				title={`${symbol} 持仓管理`}
				open={open}
				width={1180}
				footer={null}
				maskClosable={false}
				onCancel={() => setOpen(false)}
			>
				<Alert
					className="mb-4"
					type="warning"
					showIcon
					message="手动出场不判断最低盈利条件，既可以止盈也可以亏损退出；提交后还会取消当前所有未成交买单。"
				/>

				<Table
					rowKey="id"
					size="small"
					loading={tradesLoading}
					columns={columns}
					dataSource={trades || []}
					pagination={false}
					scroll={{ x: 1150, y: 360 }}
					rowSelection={{
						selectedRowKeys: selectedIds,
						onChange: (keys) => setSelectedIds(keys.map(Number)),
						getCheckboxProps: (record) => ({
							disabled: record.tradeStatus !== "HOLDING",
						}),
					}}
				/>

				<Descriptions className="mt-4" bordered size="small" column={5}>
					<Descriptions.Item label="选中批次">{selectedTrades.length}</Descriptions.Item>
					<Descriptions.Item label="总数量">{formatNumber(summary.amount)}</Descriptions.Item>
					<Descriptions.Item label="总成本">{formatNumber(summary.cost, 2)} USDT</Descriptions.Item>
					<Descriptions.Item label="加权入场价">{formatNumber(summary.averageEntryPrice)}</Descriptions.Item>
					<Descriptions.Item label="预计盈亏(未扣手续费)">
						{summary.estimatedProfit === null
							? "-"
							: `${formatNumber(summary.estimatedProfit, 2)} USDT (${(
									Number(summary.estimatedProfitRate) * 100
								).toFixed(2)}%)`}
					</Descriptions.Item>
				</Descriptions>

				<Space className="mt-4" align="end" wrap>
					<div>
						<div className="mb-1">手动出场价格</div>
						<InputNumber
							style={{ width: 240 }}
							min={0.00000001}
							precision={8}
							value={exitPrice}
							onChange={setExitPrice}
							placeholder="请输入限价卖出价格"
						/>
					</div>
					<Checkbox checked={pauseEntry} onChange={(event) => setPauseEntry(event.target.checked)}>
						出场后暂停开仓
					</Checkbox>
					<Popconfirm
						title="确认挂出手动卖单吗？"
						description={`将按 ${exitPrice || "-"} 的价格退出 ${selectedIds.length} 个持仓批次`}
						onConfirm={handleManualExit}
						okText="确定"
						cancelText="取消"
						disabled={!selectedIds.length || !exitPrice}
					>
						<Button type="primary" danger loading={exitLoading} disabled={!selectedIds.length || !exitPrice}>
							挂单出场
						</Button>
					</Popconfirm>
					<Button onClick={() => loadTrades({ strategyId })}>刷新持仓</Button>
				</Space>
			</Modal>
		</>
	);
};
