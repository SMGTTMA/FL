import { stopStructureEmaSpotStrategy } from "@/api/services/strategiesService";
import { App, Button, Popconfirm } from "antd";
import { useState } from "react";

type StopStructureEmaSpotProps = {
	strategyId: number;
	onSuccess?: () => void;
};

export const StopStructureEmaSpot = ({ strategyId, onSuccess }: StopStructureEmaSpotProps) => {
	const { message } = App.useApp();
	const [loading, setLoading] = useState(false);

	const handleStop = async () => {
		setLoading(true);
		try {
			const result = await stopStructureEmaSpotStrategy({ strategyId });
			message.success(result);
			onSuccess?.();
		} catch {
			message.error("停止策略失败");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Popconfirm
			title="确定要停止该策略吗？"
			description={
				<div>
					<div>停止后策略将不再执行，并删除本地交易记录。</div>
					<div>交易所挂单和现货不会处理，请自行检查交易所账户。</div>
				</div>
			}
			onConfirm={handleStop}
			okText="确定"
			cancelText="取消"
			disabled={loading}
		>
			<Button type="link" loading={loading} danger>
				停止
			</Button>
		</Popconfirm>
	);
};
