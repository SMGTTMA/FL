import { useState } from "react";
import { TradingPairIsActive, TradingPairType } from "@/api/enums/global";
import { getOKXApiConfig } from "@/api/services/apiConfig";
import {
  getGridCashStrategyConfig,
  startGridSpotStrategy,
  editGridCashStrategy,
} from "@/api/services/strategiesService";
import { findAll } from "@/api/services/tradingPairsService";
import {
  StartGridCashStrategyParams,
  EditGridCashStrategyParams,
  GetGridCashStrategyConfigResponse,
  ParseGridCashConfigJson,
} from "@/api/types/strategiesTypes";
import { ActionModal } from "@/components/actionModal/ActionModal";
import { useRequest } from "ahooks";
import { Alert, App, Col, Form, InputNumber, Row, Select } from "antd";

/**
 * 添加/编辑网格现货策略组件属性
 */
type AddOrEditGridCashProps = {
  /** 刷新回调 */
  onSuccess?: () => void;
  /** 类型: add: 添加, edit: 编辑 */
  type: "add" | "edit";
  /** 编辑时的记录数据 */
  record?: any;
};

/**
 * 表单字段类型（包含高级配置字段）
 */
type GridCashFormValues = StartGridCashStrategyParams &
  Partial<ParseGridCashConfigJson>;

/**
 * 添加/编辑网格现货策略组件
 */
export const AddOrEditGridCash = ({
  onSuccess,
  type: _type,
  record: _record,
}: AddOrEditGridCashProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<GridCashFormValues>();
  const [configData, setConfigData] =
    useState<GetGridCashStrategyConfigResponse | null>(null);

  const {
    data: tradingPairsList,
    loading: tradingPairsLoading,
    runAsync: requestTradingPairsList,
  } = useRequest(findAll, {
    manual: true,
  });

  const { runAsync: requestGetGridCashStrategyConfig } = useRequest(
    getGridCashStrategyConfig,
    {
      manual: true,
    }
  );

  const {
    data: apiConfigList,
    loading: apiConfigLoading,
    runAsync: requestApiConfigList,
  } = useRequest(getOKXApiConfig, {
    manual: true,
  });

  const { runAsync: startStrategy, loading: startStrategyLoading } = useRequest(
    startGridSpotStrategy,
    {
      manual: true,
    }
  );

  const { runAsync: editStrategy, loading: editStrategyLoading } = useRequest(
    editGridCashStrategy,
    {
      manual: true,
    }
  );

  /** 初始化弹窗 */
  const handleInit = async () => {
    form.resetFields();

    requestTradingPairsList({
      type: TradingPairType.SPOT,
      isActive: TradingPairIsActive.ACTIVE,
    });
    requestApiConfigList();

    // 获取配置并设置默认值
    const config = await requestGetGridCashStrategyConfig();
    if (config) {
      setConfigData(config);

      // 如果是编辑模式，回显数据
      if (_type === "edit" && _record) {
        // 解析 configJson
        let parsedConfig: Partial<ParseGridCashConfigJson> = {};
        if (_record.configJson) {
          try {
            parsedConfig = JSON.parse(_record.configJson);
          } catch (error) {
            console.error("解析 configJson 失败:", error);
          }
        }

        // 回显所有字段
        form.setFieldsValue({
          exchangeConfigId: String(_record.exchangeConfigId),
          symbol: _record.symbol,
          totalPositionSize: Number(_record.totalPositionSize),
          maxOrderCount:
            parsedConfig.maxOrderCount ?? config.default.maxOrderCount,
          shortTestCount:
            parsedConfig.shortTestCount ?? config.default.shortTestCount,
          shortPriceTolerance:
            parsedConfig.shortPriceTolerance ??
            config.default.shortPriceTolerance,
          longTestCount:
            parsedConfig.longTestCount ?? config.default.longTestCount,
          longPriceTolerance:
            parsedConfig.longPriceTolerance ??
            config.default.longPriceTolerance,
          priceOffsetPercent:
            parsedConfig.priceOffsetPercent ??
            config.default.priceOffsetPercent,
          fiveMinuteKlineNum:
            parsedConfig.fiveMinuteKlineNum ??
            config.default.fiveMinuteKlineNum,
          oneHourKlineNum:
            parsedConfig.oneHourKlineNum ?? config.default.oneHourKlineNum,
          historyHighPrice:
            parsedConfig.historyHighPrice ?? config.default.historyHighPrice,
          profitPoint: parsedConfig.profitPoint ?? config.default.profitPoint,
        });
      } else {
        // 新增模式，设置高级配置的默认值
        form.setFieldsValue({
          maxOrderCount: config.default.maxOrderCount,
          shortTestCount: config.default.shortTestCount,
          shortPriceTolerance: config.default.shortPriceTolerance,
          longTestCount: config.default.longTestCount,
          longPriceTolerance: config.default.longPriceTolerance,
          priceOffsetPercent: config.default.priceOffsetPercent,
          fiveMinuteKlineNum: config.default.fiveMinuteKlineNum,
          oneHourKlineNum: config.default.oneHourKlineNum,
          historyHighPrice: config.default.historyHighPrice,
          profitPoint: config.default.profitPoint,
        });
      }
    }
  };

  /** 确认提交 */
  const handleOk = async (closeModal: () => void) => {
    const formValues = await form.validateFields();
    const {
      exchangeConfigId,
      symbol,
      totalPositionSize,
      maxOrderCount,
      shortTestCount,
      shortPriceTolerance,
      longTestCount,
      longPriceTolerance,
      priceOffsetPercent,
      fiveMinuteKlineNum,
      oneHourKlineNum,
      historyHighPrice,
      profitPoint,
    } = formValues;

    // 组装高级配置 JSON
    const advancedConfig: Partial<ParseGridCashConfigJson> = {};
    if (maxOrderCount !== undefined && maxOrderCount !== null) {
      advancedConfig.maxOrderCount = maxOrderCount;
    }
    if (shortTestCount !== undefined && shortTestCount !== null) {
      advancedConfig.shortTestCount = shortTestCount;
    }
    if (shortPriceTolerance !== undefined && shortPriceTolerance !== null) {
      advancedConfig.shortPriceTolerance = shortPriceTolerance;
    }
    if (longTestCount !== undefined && longTestCount !== null) {
      advancedConfig.longTestCount = longTestCount;
    }
    if (longPriceTolerance !== undefined && longPriceTolerance !== null) {
      advancedConfig.longPriceTolerance = longPriceTolerance;
    }
    if (priceOffsetPercent !== undefined && priceOffsetPercent !== null) {
      advancedConfig.priceOffsetPercent = priceOffsetPercent;
    }
    if (fiveMinuteKlineNum !== undefined && fiveMinuteKlineNum !== null) {
      advancedConfig.fiveMinuteKlineNum = fiveMinuteKlineNum;
    }
    if (oneHourKlineNum !== undefined && oneHourKlineNum !== null) {
      advancedConfig.oneHourKlineNum = oneHourKlineNum;
    }
    if (historyHighPrice !== undefined && historyHighPrice !== null) {
      advancedConfig.historyHighPrice = historyHighPrice;
    }
    if (profitPoint !== undefined && profitPoint !== null) {
      advancedConfig.profitPoint = profitPoint;
    }

    // 根据类型调用不同的接口
    if (_type === "edit") {
      // 编辑模式：只需要 strategyId、totalPositionSize 和 configJson
      const editParams: EditGridCashStrategyParams = {
        strategyId: _record.id,
        totalPositionSize,
        configJson:
          Object.keys(advancedConfig).length > 0
            ? JSON.stringify(advancedConfig)
            : undefined,
      };

      await editStrategy(editParams).then((data) => {
        message.success(data);
        closeModal();
        onSuccess?.();
      });
    } else {
      // 新增模式：需要所有字段
      const params: StartGridCashStrategyParams = {
        exchangeConfigId: Number(exchangeConfigId),
        symbol,
        totalPositionSize,
      };

      // 如果有高级配置，则转换为 JSON 字符串
      if (Object.keys(advancedConfig).length > 0) {
        params.configJson = JSON.stringify(advancedConfig);
      }

      await startStrategy(params).then((data) => {
        message.success(data);
        closeModal();
        onSuccess?.();
      });
    }
  };

  return (
    <ActionModal
      buttonProps={{
        title: _type === "add" ? "添加" : "编辑",
        type: _type === "add" ? "primary" : "link",
        onClick: handleInit,
      }}
      modalProps={{
        maskClosable: false,
        onOk: handleOk,
        confirmLoading:
          _type === "edit" ? editStrategyLoading : startStrategyLoading,
        width: 800,
      }}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          {/* OKX API配置 */}
          <Col span={12}>
            <Form.Item
              label="OKX API配置"
              name="exchangeConfigId"
              rules={[{ required: true, message: "请选择OKX API配置" }]}
            >
              <Select
                disabled={_type === "edit"}
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

          {/* 交易对 */}
          <Col span={12}>
            <Form.Item
              label="交易对"
              name="symbol"
              rules={[{ required: true, message: "请选择交易对" }]}
            >
              <Select
                disabled={_type === "edit"}
                loading={tradingPairsLoading}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
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

          {/* 策略仓位大小 */}
          <Col span={12}>
            <Form.Item
              label="策略仓位大小"
              name="totalPositionSize"
              rules={[{ required: true, message: "请输入策略仓位大小" }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                max={1000000}
                addonAfter="USDT"
                placeholder="请输入策略仓位大小"
              />
            </Form.Item>
          </Col>

          {/* 高级配置提示 */}
          <Col span={24} className="mb-4">
            <Alert
              message="以下内容为策略运行的关键配置，不熟悉请不要随意输入或更改。可以不填写，系统会使用默认值"
              type="warning"
            />
          </Col>

          {/* 最大开单数量 */}
          <Col span={12}>
            <Form.Item label="最大开单数量" name="maxOrderCount">
              <InputNumber
                style={{ width: "100%" }}
                min={configData?.min.maxOrderCount}
                max={configData?.max.maxOrderCount}
                placeholder={`默认值: ${
                  configData?.default.maxOrderCount || "-"
                }`}
              />
            </Form.Item>
          </Col>

          {/* 5分钟周期测试次数 */}
          <Col span={12}>
            <Form.Item
              label="5分钟周期K线关键位计算测试次数"
              name="shortTestCount"
            >
              <InputNumber
                style={{ width: "100%" }}
                min={configData?.min.shortTestCount}
                max={configData?.max.shortTestCount}
                placeholder={`默认值: ${
                  configData?.default.shortTestCount || "-"
                }`}
              />
            </Form.Item>
          </Col>

          {/* 5分钟周期价格容忍度 */}
          <Col span={12}>
            <Form.Item
              label="5分钟周期K线关键位计算价格容差"
              name="shortPriceTolerance"
            >
              <InputNumber
                style={{ width: "100%" }}
                min={configData?.min.shortPriceTolerance}
                max={configData?.max.shortPriceTolerance}
                placeholder={`默认值: ${
                  configData?.default.shortPriceTolerance || "-"
                }`}
              />
            </Form.Item>
          </Col>

          {/* 1小时周期测试次数 */}
          <Col span={12}>
            <Form.Item
              label="1小时周期K线关键位计算测试次数"
              name="longTestCount"
            >
              <InputNumber
                style={{ width: "100%" }}
                min={configData?.min.longTestCount}
                max={configData?.max.longTestCount}
                placeholder={`默认值: ${
                  configData?.default.longTestCount || "-"
                }`}
              />
            </Form.Item>
          </Col>

          {/* 1小时周期价格容忍度 */}
          <Col span={12}>
            <Form.Item
              label="1小时周期K线关键位计算价格容差"
              name="longPriceTolerance"
            >
              <InputNumber
                style={{ width: "100%" }}
                min={configData?.min.longPriceTolerance}
                max={configData?.max.longPriceTolerance}
                placeholder={`默认值: ${
                  configData?.default.longPriceTolerance || "-"
                }`}
              />
            </Form.Item>
          </Col>

          {/* 价格偏移百分比 */}
          <Col span={12}>
            <Form.Item
              label="取消挂单的价格偏移百分比"
              name="priceOffsetPercent"
            >
              <InputNumber
                style={{ width: "100%" }}
                min={configData?.min.priceOffsetPercent}
                max={configData?.max.priceOffsetPercent}
                placeholder={`默认值: ${
                  configData?.default.priceOffsetPercent || "-"
                }`}
              />
            </Form.Item>
          </Col>

          {/* 5分钟k线 */}
          <Col span={12}>
            <Form.Item label="5分钟K线数量" name="fiveMinuteKlineNum">
              <InputNumber
                style={{ width: "100%" }}
                min={configData?.min.fiveMinuteKlineNum}
                max={configData?.max.fiveMinuteKlineNum}
                placeholder={`默认值: ${
                  configData?.default.fiveMinuteKlineNum || "-"
                }`}
              />
            </Form.Item>
          </Col>

          {/* 1小时k线 */}
          <Col span={12}>
            <Form.Item label="1小时K线数量" name="oneHourKlineNum">
              <InputNumber
                style={{ width: "100%" }}
                min={configData?.min.oneHourKlineNum}
                max={configData?.max.oneHourKlineNum}
                placeholder={`默认值: ${
                  configData?.default.oneHourKlineNum || "-"
                }`}
              />
            </Form.Item>
          </Col>

          {/* 历史最高价 */}
          <Col span={12}>
            <Form.Item
              label="设置最高价"
              name="historyHighPrice"
              tooltip="市场价格若超过该价格，会以交易所要求的最小开单数量运行。若没有设置，则以交易所数据为准"
            >
              <InputNumber
                style={{ width: "100%" }}
                min={configData?.min.historyHighPrice}
                max={configData?.max.historyHighPrice}
                placeholder={`默认值: ${
                  configData?.default.historyHighPrice || "交易所数据"
                }`}
              />
            </Form.Item>
          </Col>

          {/* 盈利收益点 */}
          <Col span={12}>
            <Form.Item
              label="盈利收益点"
              name="profitPoint"
              tooltip="手续费+滑点+资金费率+预计盈利"
            >
              <InputNumber
                style={{ width: "100%" }}
                min={configData?.min.profitPoint}
                max={configData?.max.profitPoint}
                placeholder={`默认值: ${
                  configData?.default.profitPoint || "-"
                }`}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </ActionModal>
  );
};
