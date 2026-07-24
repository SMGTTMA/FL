import { manualEntryStructureEmaSpot } from "@/api/services/strategiesService";
import type {
	StrategiesListItem,
	StructureEmaProfileConfig,
	StructureEmaSpotConfig,
} from "@/api/types/strategiesTypes";
import { useRequest } from "ahooks";
import { Alert, App, Button, Descriptions, InputNumber, Modal, Tag } from "antd";
import { useMemo, useState } from "react";

type ManualEntryStructureEmaSpotProps = {
	record: StrategiesListItem;
	onSuccess?: () => void;
};

const DIRECTION_LABELS: Record<string, string> = {
	UP: "上涨",
	UP_CHANNEL: "上涨通道",
	RANGE: "震荡",
	DOWN: "下跌",
	DOWN_CHANNEL: "下跌通道",
};

const parseConfig = (configJson?: string): StructureEmaSpotConfig | null => {
	if (!configJson) return null;
	try {
		return JSON.parse(configJson) as StructureEmaSpotConfig;
	} catch {
		return null;
	}
};

const resolveProfile = (
	direction: string | null | undefined,
	config: StructureEmaSpotConfig | null,
): { label: string; profile: StructureEmaProfileConfig } | null => {
	if (!config) return null;
	if (direction === "UP" || direction === "UP_CHANNEL") {
		return { label: "上涨模式", profile: config.up };
	}
	if (direction === "RANGE") {
		return { label: "震荡模式", profile: config.range };
	}
	return null;
};

const formatNumber = (value: number, digits = 8) =>
	Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: digits }) : "-";

export const ManualEntryStructureEmaSpot = ({ record, onSuccess }: ManualEntryStructureEmaSpotProps) => {
	const { message } = App.useApp();
	const [open, setOpen] = useState(false);
	const [entryPrice, setEntryPrice] = useState<number | null>(null);
	const config = useMemo(() => parseConfig(record.configJson), [record.configJson]);
	const direction = record.parameters?.lastDirection;
	const resolved = useMemo(() => resolveProfile(direction, config), [config, direction]);
	const paused = record.parameters?.entryPaused === true;
	const singleCapital = resolved ? Number(record.totalPositionSize) / resolved.profile.positionParts : 0;
	const estimatedAmount = entryPrice && entryPrice > 0 ? singleCapital / entryPrice : 0;
	const estimatedTakeProfit = entryPrice && entryPrice > 0 && config ? entryPrice * (1 + config.profitPoint) : 0;
	const canSubmit = Boolean(entryPrice && entryPrice > 0 && resolved && !paused);

	const { loading, runAsync: manualEntry } = useRequest(manualEntryStructureEmaSpot, { manual: true });

	const handleOpen = () => {
		setEntryPrice(null);
		setOpen(true);
	};

	const handleSubmit = async () => {
		if (!entryPrice || entryPrice <= 0) {
			message.warning("请输入有效的入场价格");
			return;
		}
		if (paused) {
			message.warning("策略已暂停开仓，请先恢复开仓");
			return;
		}
		if (!resolved) {
			message.warning("当前日线方向不允许创建买单");
			return;
		}

		const result = await manualEntry({ strategyId: record.id, entryPrice });
		message.success(result);
		setOpen(false);
		onSuccess?.();
	};

	return (
		<>
			<Button type="link" onClick={handleOpen}>
				手动挂单
			</Button>
			<Modal
				title={`${record.symbol} 手动挂入场单`}
				open={open}
				onCancel={() => setOpen(false)}
				onOk={handleSubmit}
				confirmLoading={loading}
				okText="确认挂单"
				cancelText="取消"
				okButtonProps={{ disabled: !canSubmit }}
				maskClosable={false}
			>
				{paused ? (
					<Alert className="mb-4" type="warning" showIcon message="策略已暂停开仓，请先恢复开仓" />
				) : !resolved ? (
					<Alert className="mb-4" type="error" showIcon message="当前日线方向不允许创建买单" />
				) : (
					<Alert
						className="mb-4"
						type="info"
						showIcon
						message="只手动指定入场价格；资金、数量、止盈条件和 EMA 出场全部由策略管理。"
					/>
				)}

				<Descriptions bordered size="small" column={2} className="mb-4">
					<Descriptions.Item label="交易对">{record.symbol}</Descriptions.Item>
					<Descriptions.Item label="日线方向">
						{direction ? <Tag>{DIRECTION_LABELS[direction] || direction}</Tag> : "未设置"}
					</Descriptions.Item>
					<Descriptions.Item label="管理模式">{resolved?.label || "-"}</Descriptions.Item>
					<Descriptions.Item label="EMA 管理">
						{resolved ? `${resolved.profile.timeframe} / EMA${resolved.profile.emaPeriod}` : "-"}
					</Descriptions.Item>
					<Descriptions.Item label="本次资金">{formatNumber(singleCapital, 2)} USDT</Descriptions.Item>
					<Descriptions.Item label="预计数量">{entryPrice ? formatNumber(estimatedAmount) : "-"}</Descriptions.Item>
					<Descriptions.Item label="预计最低止盈价" span={2}>
						{entryPrice ? formatNumber(estimatedTakeProfit) : "-"}
					</Descriptions.Item>
				</Descriptions>

				<div className="mb-1">入场价格</div>
				<InputNumber
					style={{ width: "100%" }}
					min={0.00000001}
					precision={8}
					value={entryPrice}
					onChange={setEntryPrice}
					placeholder="请输入限价买入价格"
				/>
			</Modal>
		</>
	);
};
