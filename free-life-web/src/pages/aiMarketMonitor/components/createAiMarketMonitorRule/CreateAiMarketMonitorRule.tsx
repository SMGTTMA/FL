import { TradingPairIsActive } from "@/api/enums/global";
import { getOKXApiConfig } from "@/api/services/apiConfig";
import { createAiMarketMonitorRule } from "@/api/services/aiMarketMonitorService";
import { findAll } from "@/api/services/tradingPairsService";
import type {
  AiMarketMonitorCheckInterval,
  CreateAiMarketMonitorRuleParams,
} from "@/api/types/aiMarketMonitorTypes";
import { ActionModal } from "@/components/actionModal/ActionModal";
import { useRequest } from "ahooks";
import { App, Col, Form, Input, InputNumber, Row, Select, Switch } from "antd";

type CreateAiMarketMonitorRuleProps = {
  /** 成功回调 */
  onSuccess?: () => void;
};

type CreateRuleFormValues = {
  symbol: string;
  exchangeConfigId: number;
  instruction: string;
  checkInterval: AiMarketMonitorCheckInterval;
  klineWindow?: number;
  repeatMonitor: boolean;
};

const CHECK_INTERVAL_OPTIONS: Array<{
  label: string;
  value: AiMarketMonitorCheckInterval;
}> = [
  { label: "5m", value: "5m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1d", value: "1d" },
  { label: "1w", value: "1w" },
];

/**
 * 新建 AI 市场监控规则
 */
export const CreateAiMarketMonitorRule = ({
  onSuccess,
}: CreateAiMarketMonitorRuleProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateRuleFormValues>();

  const {
    data: tradingPairsList,
    loading: tradingPairsLoading,
    runAsync: requestTradingPairsList,
  } = useRequest(findAll, {
    manual: true,
  });

  const {
    data: apiConfigList,
    loading: apiConfigLoading,
    runAsync: requestApiConfigList,
  } = useRequest(getOKXApiConfig, {
    manual: true,
  });

  const { runAsync: runCreateRule, loading: createRuleLoading } = useRequest(
    createAiMarketMonitorRule,
    {
      manual: true,
    },
  );

  /** 初始化弹窗 */
  const handleInit = async () => {
    form.resetFields();
    form.setFieldsValue({
      repeatMonitor: false,
      klineWindow: 24,
    });
    await Promise.all([
      requestTradingPairsList({
        isActive: TradingPairIsActive.ACTIVE,
      }),
      requestApiConfigList(),
    ]);
  };

  /** 确认提交 */
  const handleOk = async (closeModal: () => void) => {
    const formValues = await form.validateFields();

    const params: CreateAiMarketMonitorRuleParams = {
      symbol: formValues.symbol.trim().toUpperCase(),
      exchangeConfigId: Number(formValues.exchangeConfigId),
      instruction: formValues.instruction.trim(),
      checkInterval: formValues.checkInterval,
      repeatMonitor: formValues.repeatMonitor ?? false,
    };

    if (typeof formValues.klineWindow === "number") {
      params.klineWindow = formValues.klineWindow;
    }

    await runCreateRule(params).then(() => {
      message.success("规则创建成功");
      closeModal();
      onSuccess?.();
    });
  };

  return (
    <ActionModal
      buttonProps={{
        title: "新建规则",
        type: "primary",
        onClick: handleInit,
      }}
      modalProps={{
        title: "新建AI市场监控规则",
        width: 680,
        maskClosable: false,
        onOk: handleOk,
        confirmLoading: createRuleLoading,
      }}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="交易对"
              name="symbol"
              rules={[{ required: true, message: "请选择交易对" }]}
            >
              <Select
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

          <Col span={12}>
            <Form.Item
              label="交易所配置ID"
              name="exchangeConfigId"
              rules={[{ required: true, message: "请选择交易所配置" }]}
            >
              <Select
                loading={apiConfigLoading}
                options={apiConfigList?.map((item) => ({
                  label: item.configName,
                  value: item.id,
                }))}
                placeholder="请选择交易所配置"
                allowClear
              />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="监控指令"
              name="instruction"
              rules={[{ required: true, message: "请输入监控指令" }]}
            >
              <Input.TextArea
                rows={4}
                placeholder="请输入自然语言监控指令"
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="监控周期"
              name="checkInterval"
              rules={[{ required: true, message: "请选择监控周期" }]}
            >
              <Select
                options={CHECK_INTERVAL_OPTIONS}
                placeholder="请选择监控周期"
                allowClear
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="K线窗口"
              name="klineWindow"
              rules={[
                {
                  type: "number",
                  min: 6,
                  max: 100,
                  message: "K线窗口范围为 6-100",
                },
              ]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={6}
                max={100}
                placeholder="默认 24，范围 6-100"
              />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="是否重复监听"
              name="repeatMonitor"
              valuePropName="checked"
            >
              <Switch checkedChildren="开" unCheckedChildren="关" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </ActionModal>
  );
};
