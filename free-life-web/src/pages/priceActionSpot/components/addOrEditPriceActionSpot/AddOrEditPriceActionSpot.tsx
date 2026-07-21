import { useState } from "react";
import { TradingPairIsActive, TradingPairType } from "@/api/enums/global";
import { getOKXApiConfig } from "@/api/services/apiConfig";
import {
  editPriceActionSpotStrategy,
  getPriceActionSpotStrategyConfig,
  startPriceActionSpotStrategy,
} from "@/api/services/strategiesService";
import { findAll } from "@/api/services/tradingPairsService";
import type {
  EditPriceActionSpotParams,
  GetPriceActionSpotStrategyConfigResponse,
  ParsePriceActionSpotConfigJson,
  StartPriceActionSpotParams,
  StrategiesListItem,
} from "@/api/types/strategiesTypes";
import { ActionModal } from "@/components/actionModal/ActionModal";
import { useRequest } from "ahooks";
import { Alert, App, Col, Form, InputNumber, Row, Select } from "antd";

type AddOrEditPriceActionSpotProps = {
  onSuccess?: () => void;
  type: "add" | "edit";
  record?: StrategiesListItem;
};

type PriceActionSpotFormValues = StartPriceActionSpotParams;

export const AddOrEditPriceActionSpot = ({
  onSuccess,
  type: mode,
  record,
}: AddOrEditPriceActionSpotProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<PriceActionSpotFormValues>();
  const [configData, setConfigData] =
    useState<GetPriceActionSpotStrategyConfigResponse | null>(null);

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

  const { runAsync: requestGetConfig } = useRequest(
    getPriceActionSpotStrategyConfig,
    { manual: true }
  );

  const { runAsync: startStrategy, loading: startStrategyLoading } = useRequest(
    startPriceActionSpotStrategy,
    { manual: true }
  );

  const { runAsync: editStrategy, loading: editStrategyLoading } = useRequest(
    editPriceActionSpotStrategy,
    { manual: true }
  );

  const handleInit = async () => {
    form.resetFields();

    requestTradingPairsList({
      type: TradingPairType.SPOT,
      isActive: TradingPairIsActive.ACTIVE,
    });
    requestApiConfigList();

    const config = await requestGetConfig();
    if (!config) return;

    setConfigData(config);

    if (mode === "edit" && record) {
      let parsedConfig: Partial<ParsePriceActionSpotConfigJson> = {};
      if (record.configJson) {
        try {
          parsedConfig = JSON.parse(record.configJson);
        } catch {
          parsedConfig = {};
        }
      }

      form.setFieldsValue({
        exchangeConfigId: String(record.exchangeConfigId),
        symbol: record.symbol,
        singleOrderAmount:
          parsedConfig.singleOrderAmount ?? config.default.singleOrderAmount,
        maxOrderCount: parsedConfig.maxOrderCount ?? config.default.maxOrderCount,
        shortTimeframe:
          parsedConfig.shortTimeframe ?? config.default.shortTimeframe,
        longTimeframe: parsedConfig.longTimeframe ?? config.default.longTimeframe,
        profitPoint: parsedConfig.profitPoint ?? config.default.profitPoint,
      });
      return;
    }

    form.setFieldsValue({
      singleOrderAmount: config.default.singleOrderAmount,
      maxOrderCount: config.default.maxOrderCount,
      shortTimeframe: config.default.shortTimeframe,
      longTimeframe: config.default.longTimeframe,
      profitPoint: config.default.profitPoint,
    });
  };

  const handleOk = async (closeModal: () => void) => {
    const formValues = await form.validateFields();

    if (mode === "edit") {
      if (!record) return;

      const params: EditPriceActionSpotParams = {
        strategyId: record.id,
        singleOrderAmount: formValues.singleOrderAmount,
        maxOrderCount: formValues.maxOrderCount,
        shortTimeframe: formValues.shortTimeframe,
        longTimeframe: formValues.longTimeframe,
        profitPoint: formValues.profitPoint,
      };

      await editStrategy(params).then((msg) => {
        message.success(msg);
        closeModal();
        onSuccess?.();
      });
      return;
    }

    await startStrategy({
      exchangeConfigId: Number(formValues.exchangeConfigId),
      symbol: formValues.symbol,
      singleOrderAmount: formValues.singleOrderAmount,
      maxOrderCount: formValues.maxOrderCount,
      shortTimeframe: formValues.shortTimeframe,
      longTimeframe: formValues.longTimeframe,
      profitPoint: formValues.profitPoint,
    }).then((msg) => {
      message.success(msg);
      closeModal();
      onSuccess?.();
    });
  };

  return (
    <ActionModal
      buttonProps={{
        title: mode === "add" ? "添加" : "编辑",
        type: mode === "add" ? "primary" : "link",
        onClick: handleInit,
      }}
      modalProps={{
        maskClosable: false,
        onOk: handleOk,
        confirmLoading: mode === "edit" ? editStrategyLoading : startStrategyLoading,
        width: 800,
      }}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
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

          <Col span={12}>
            <Form.Item
              label="交易对"
              name="symbol"
              rules={[{ required: true, message: "请选择交易对" }]}
            >
              <Select
                disabled={mode === "edit"}
                loading={tradingPairsLoading}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                options={tradingPairsList?.map((item) => ({
                  label: item.symbol,
                  value: item.symbol,
                }))}
                placeholder="请选择交易对"
                allowClear
              />
            </Form.Item>
          </Col>

          <Col span={24} className="mb-4">
            <Alert
              message="价格行为现货策略：仅在大周期方向允许时，依据价格行为信号尝试限价开单。"
              type="info"
            />
          </Col>

          <Col span={12}>
            <Form.Item
              label="每单投入资金 (USDT)"
              name="singleOrderAmount"
              rules={[{ required: true, message: "请输入每单投入资金" }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={configData?.min.singleOrderAmount}
                max={configData?.max.singleOrderAmount}
                placeholder={`默认值: ${configData?.default.singleOrderAmount || "-"}`}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="最多投入单数"
              name="maxOrderCount"
              rules={[{ required: true, message: "请输入最多投入单数" }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={configData?.min.maxOrderCount}
                max={configData?.max.maxOrderCount}
                placeholder={`默认值: ${configData?.default.maxOrderCount || "-"}`}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="小周期"
              name="shortTimeframe"
              rules={[{ required: true, message: "请选择小周期" }]}
            >
              <Select
                options={(configData?.timeframeOptions || []).map((item) => ({
                  label: item,
                  value: item,
                }))}
                placeholder="请选择小周期"
                allowClear
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="大周期"
              name="longTimeframe"
              rules={[{ required: true, message: "请选择大周期" }]}
            >
              <Select
                options={(configData?.timeframeOptions || []).map((item) => ({
                  label: item,
                  value: item,
                }))}
                placeholder="请选择大周期"
                allowClear
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="盈利收益点"
              name="profitPoint"
              rules={[{ required: true, message: "请输入盈利收益点" }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={configData?.min.profitPoint}
                max={configData?.max.profitPoint}
                step={0.0001}
                placeholder={`默认值: ${configData?.default.profitPoint || "-"}`}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </ActionModal>
  );
};
