import { TradingPairIsActive, TradingPairType } from "@/api/enums/global";
import { getOKXApiConfig } from "@/api/services/apiConfig";
import {
	editStructureEmaSpotStrategy,
	getStructureEmaSpotStrategyConfig,
	startStructureEmaSpotStrategy,
} from "@/api/services/strategiesService";
import { findAll } from "@/api/services/tradingPairsService";
import type {
	EditStructureEmaSpotParams,
	GetStructureEmaSpotConfigResponse,
	StartStructureEmaSpotParams,
	StrategiesListItem,
	StructureEmaSpotConfig,
} from "@/api/types/strategiesTypes";
import { ActionModal } from "@/components/actionModal/ActionModal";
import { useRequest } from "ahooks";
import { Alert, App, Card, Col, Form, InputNumber, Row, Select } from "antd";
import { useState } from "react";

type AddOrEditStructureEmaSpotProps = {
	onSuccess?: () => void;
	type: "add" | "edit";
	record?: StrategiesListItem;
};

type StructureEmaSpotFormValues = Omit<StartStructureEmaSpotParams, "configJson"> & StructureEmaSpotConfig;

const parseConfig = (value: string | undefined, fallback: StructureEmaSpotConfig): StructureEmaSpotConfig => {
	if (!value) return fallback;
	try {
		const parsed = JSON.parse(value) as Partial<StructureEmaSpotConfig>;
		return {
			profitPoint: parsed.profitPoint ?? fallback.profitPoint,
			up: { ...fallback.up, ...parsed.up },
			range: { ...fallback.range, ...parsed.range },
		};
	} catch {
		return fallback;
	}
};

export const AddOrEditStructureEmaSpot = ({ onSuccess, type: mode, record }: AddOrEditStructureEmaSpotProps) => {
	const { message } = App.useApp();
	const [form] = Form.useForm<StructureEmaSpotFormValues>();
	const [configData, setConfigData] = useState<GetStructureEmaSpotConfigResponse | null>(null);

	const {
		data: tradingPairsList,
		loading: tradingPairsLoading,
		runAsync: requestTradingPairsList,
	} = useRequest(findAll, { manual: true });

	const {
		data: apiConfigList,
		loading: apiConfigLoading,
		runAsync: requestApiConfigList,
	} = useRequest(getOKXApiConfig, { manual: true });

	const { runAsync: requestGetConfig } = useRequest(getStructureEmaSpotStrategyConfig, { manual: true });

	const { runAsync: startStrategy, loading: startLoading } = useRequest(startStructureEmaSpotStrategy, {
		manual: true,
	});

	const { runAsync: editStrategy, loading: editLoading } = useRequest(editStructureEmaSpotStrategy, { manual: true });

	const handleInit = async () => {
		form.resetFields();
		requestTradingPairsList({
			type: TradingPairType.SPOT,
			isActive: TradingPairIsActive.ACTIVE,
		});
		requestApiConfigList();

		const configResponse = await requestGetConfig();
		if (!configResponse) return;

		setConfigData(configResponse);
		const config =
			mode === "edit" && record ? parseConfig(record.configJson, configResponse.default) : configResponse.default;

		form.setFieldsValue({
			exchangeConfigId: mode === "edit" && record ? String(record.exchangeConfigId) : undefined,
			symbol: mode === "edit" && record ? record.symbol : undefined,
			totalPositionSize: mode === "edit" && record ? Number(record.totalPositionSize) : undefined,
			...config,
		});
	};

	const handleOk = async (closeModal: () => void) => {
		const values = await form.validateFields();
		const config: StructureEmaSpotConfig = {
			profitPoint: values.profitPoint,
			up: values.up,
			range: values.range,
		};

		if (mode === "edit") {
			if (!record) return;
			const params: EditStructureEmaSpotParams = {
				strategyId: record.id,
				totalPositionSize: values.totalPositionSize,
				configJson: JSON.stringify(config),
			};
			const result = await editStrategy(params);
			message.success(result);
			closeModal();
			onSuccess?.();
			return;
		}

		const result = await startStrategy({
			exchangeConfigId: Number(values.exchangeConfigId),
			symbol: values.symbol,
			totalPositionSize: values.totalPositionSize,
			configJson: JSON.stringify(config),
		});
		message.success(result);
		closeModal();
		onSuccess?.();
	};

	const limits = configData?.limits;
	const numberPlaceholder = (value: number | undefined) => `默认值: ${value ?? "-"}`;

	return (
		<ActionModal
			buttonProps={{
				title: mode === "add" ? "添加" : "编辑",
				type: mode === "add" ? "primary" : "link",
				onClick: handleInit,
			}}
			modalProps={{
				title: mode === "add" ? "添加EMA结构现货策略" : "编辑EMA结构现货策略",
				maskClosable: false,
				onOk: handleOk,
				confirmLoading: mode === "edit" ? editLoading : startLoading,
				width: 900,
			}}
		>
			<Form form={form} layout="vertical">
				<Row gutter={16}>
					<Col span={8}>
						<Form.Item
							label="OKX API配置"
							name="exchangeConfigId"
							rules={[{ required: true, message: "请选择OKX API配置" }]}
						>
							<Select
								disabled={mode === "edit"}
								loading={apiConfigLoading}
								options={apiConfigList?.map((item) => ({
									label: item.configName,
									value: item.id,
								}))}
								placeholder="请选择OKX API配置"
								allowClear
							/>
						</Form.Item>
					</Col>

					<Col span={8}>
						<Form.Item label="交易对" name="symbol" rules={[{ required: true, message: "请选择交易对" }]}>
							<Select
								disabled={mode === "edit"}
								loading={tradingPairsLoading}
								showSearch
								filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
								options={tradingPairsList?.map((item) => ({
									label: item.symbol,
									value: item.symbol,
								}))}
								placeholder="请选择交易对"
								allowClear
							/>
						</Form.Item>
					</Col>

					<Col span={8}>
						<Form.Item
							label="策略总资金"
							name="totalPositionSize"
							rules={[{ required: true, message: "请输入策略总资金" }]}
						>
							<InputNumber style={{ width: "100%" }} min={0} addonAfter="USDT" placeholder="请输入策略总资金" />
						</Form.Item>
					</Col>

					<Col span={24} className="mb-4">
						<Alert
							message="日线结构决定运行模式：上涨使用上涨配置，震荡使用震荡配置，下跌不创建新买单。比例字段均使用小数，例如 0.01 表示 1%。"
							type="info"
							showIcon
						/>
					</Col>

					<Col span={8}>
						<Form.Item label="最低盈利点" name="profitPoint" rules={[{ required: true, message: "请输入最低盈利点" }]}>
							<InputNumber
								style={{ width: "100%" }}
								min={limits?.profitPoint.min}
								max={limits?.profitPoint.max}
								step={0.0001}
								placeholder={numberPlaceholder(configData?.default.profitPoint)}
							/>
						</Form.Item>
					</Col>

					<Col span={24} className="mb-4">
						<Card size="small" title="上涨模式（默认使用 H1 EMA20）">
							<Row gutter={16}>
								<Col span={8}>
									<Form.Item
										label="K线周期"
										name={["up", "timeframe"]}
										rules={[{ required: true, message: "请选择上涨模式周期" }]}
									>
										<Select
											options={(configData?.timeframes.up || []).map((item) => ({
												label: item,
												value: item,
											}))}
										/>
									</Form.Item>
								</Col>
								<Col span={8}>
									<Form.Item
										label="EMA周期"
										name={["up", "emaPeriod"]}
										rules={[{ required: true, message: "请输入EMA周期" }]}
									>
										<InputNumber
											style={{ width: "100%" }}
											min={limits?.emaPeriod.min}
											max={limits?.emaPeriod.max}
											precision={0}
										/>
									</Form.Item>
								</Col>
								<Col span={8}>
									<Form.Item
										label="资金份数"
										name={["up", "positionParts"]}
										rules={[{ required: true, message: "请输入资金份数" }]}
									>
										<InputNumber
											style={{ width: "100%" }}
											min={limits?.positionParts.min}
											max={limits?.positionParts.max}
											precision={0}
										/>
									</Form.Item>
								</Col>
								<Col span={8}>
									<Form.Item
										label="入场价格间距"
										name={["up", "entrySpacingRate"]}
										rules={[{ required: true, message: "请输入入场价格间距" }]}
									>
										<InputNumber
											style={{ width: "100%" }}
											min={limits?.entrySpacingRate.min}
											max={limits?.entrySpacingRate.max}
											step={0.0001}
										/>
									</Form.Item>
								</Col>
								<Col span={8}>
									<Form.Item
										label="关键位避让距离"
										name={["up", "keyLevelAvoidanceRate"]}
										rules={[{ required: true, message: "请输入关键位避让距离" }]}
									>
										<InputNumber
											style={{ width: "100%" }}
											min={limits?.keyLevelAvoidanceRate.min}
											max={limits?.keyLevelAvoidanceRate.max}
											step={0.0001}
										/>
									</Form.Item>
								</Col>
								<Col span={8}>
									<Form.Item
										label="买单有效K线数"
										name={["up", "entryOrderExpireBars"]}
										rules={[{ required: true, message: "请输入有效K线数" }]}
									>
										<InputNumber
											style={{ width: "100%" }}
											min={limits?.entryOrderExpireBars.min}
											max={limits?.entryOrderExpireBars.max}
											precision={0}
										/>
									</Form.Item>
								</Col>
							</Row>
						</Card>
					</Col>

					<Col span={24}>
						<Card size="small" title="震荡模式（默认使用 M5 EMA20）">
							<Row gutter={16}>
								<Col span={8}>
									<Form.Item
										label="K线周期"
										name={["range", "timeframe"]}
										rules={[{ required: true, message: "请选择震荡模式周期" }]}
									>
										<Select
											options={(configData?.timeframes.range || []).map((item) => ({ label: item, value: item }))}
										/>
									</Form.Item>
								</Col>
								<Col span={8}>
									<Form.Item
										label="EMA周期"
										name={["range", "emaPeriod"]}
										rules={[{ required: true, message: "请输入EMA周期" }]}
									>
										<InputNumber
											style={{ width: "100%" }}
											min={limits?.emaPeriod.min}
											max={limits?.emaPeriod.max}
											precision={0}
										/>
									</Form.Item>
								</Col>
								<Col span={8}>
									<Form.Item
										label="资金份数"
										name={["range", "positionParts"]}
										rules={[{ required: true, message: "请输入资金份数" }]}
									>
										<InputNumber
											style={{ width: "100%" }}
											min={limits?.positionParts.min}
											max={limits?.positionParts.max}
											precision={0}
										/>
									</Form.Item>
								</Col>
								<Col span={8}>
									<Form.Item
										label="入场价格间距"
										name={["range", "entrySpacingRate"]}
										rules={[{ required: true, message: "请输入入场价格间距" }]}
									>
										<InputNumber
											style={{ width: "100%" }}
											min={limits?.entrySpacingRate.min}
											max={limits?.entrySpacingRate.max}
											step={0.0001}
										/>
									</Form.Item>
								</Col>
								<Col span={8}>
									<Form.Item
										label="买单有效K线数"
										name={["range", "entryOrderExpireBars"]}
										rules={[{ required: true, message: "请输入有效K线数" }]}
									>
										<InputNumber
											style={{ width: "100%" }}
											min={limits?.entryOrderExpireBars.min}
											max={limits?.entryOrderExpireBars.max}
											precision={0}
										/>
									</Form.Item>
								</Col>
							</Row>
						</Card>
					</Col>
				</Row>
			</Form>
		</ActionModal>
	);
};
