import { pauseStructureEmaSpotEntry, resumeStructureEmaSpotEntry } from "@/api/services/strategiesService";
import { App, Button, Popconfirm } from "antd";
import { useState } from "react";

type ToggleStructureEmaEntryProps = {
	strategyId: number;
	paused: boolean;
	onSuccess?: () => void;
};

export const ToggleStructureEmaEntry = ({ strategyId, paused, onSuccess }: ToggleStructureEmaEntryProps) => {
	const { message } = App.useApp();
	const [loading, setLoading] = useState(false);

	const handleConfirm = async () => {
		setLoading(true);
		try {
			const result = paused
				? await resumeStructureEmaSpotEntry({ strategyId })
				: await pauseStructureEmaSpotEntry({ strategyId });
			message.success(result);
			onSuccess?.();
		} catch {
			message.error(paused ? "恢复开仓失败" : "暂停开仓失败");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Popconfirm
			title={paused ? "确定恢复开仓吗？" : "确定暂停开仓吗？"}
			description={paused ? "恢复后只处理新收盘K线产生的入场信号" : "暂停后会立即取消所有未成交买单，已有持仓继续运行"}
			onConfirm={handleConfirm}
			okText="确定"
			cancelText="取消"
			disabled={loading}
		>
			<Button type="link" loading={loading}>
				{paused ? "恢复开仓" : "暂停开仓"}
			</Button>
		</Popconfirm>
	);
};
