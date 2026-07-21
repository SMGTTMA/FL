import { getOKXApiConfig } from "@/api/services/apiConfig";
import { createStructureAlertRule } from "@/api/services/structureAlertsService";
import {
  listStrategyKeyLevels,
  listStrategyStructureLines,
} from "@/api/services/strategyStructuresService";
import type {
  CreateStructureAlertRuleParams,
  StructureAlertTargetOption,
  StructureAlertTargetType,
} from "@/api/types/structureAlertsTypes";
import type {
  StrategyBoundary,
  StrategyKeyLevelItem,
  StrategyStructureLineItem,
} from "@/api/types/strategyStructuresTypes";
import { ActionModal } from "@/components/actionModal/ActionModal";
import { useRequest } from "ahooks";
import { App, Col, Form, Input, InputNumber, Row, Select, Switch } from "antd";

type CreateStructureAlertRuleProps = {
  onSuccess?: () => void;
};

type CreateStructureAlertRuleFormValues = {
  exchangeConfigId: number;
  targetType: StructureAlertTargetType;
  targetId: number;
  monitorNear: boolean;
  monitorBreakUp: boolean;
  monitorBreakDown: boolean;
  nearThreshold?: number;
  breakoutThreshold?: number;
  remark?: string;
};

const TARGET_TYPE_OPTIONS: Array<{
  label: string;
  value: StructureAlertTargetType;
}> = [
  { label: "关键位", value: "KEY_LEVEL" },
  { label: "结构线", value: "STRUCTURE_LINE" },
];

const BOUNDARY_TEXT: Record<StrategyBoundary, string> = {
  UPPER: "上沿",
  LOWER: "下沿",
};

const formatKeyLevelLabel = (item: StrategyKeyLevelItem) => {
  const boundaryText = item.boundary ? `/${BOUNDARY_TEXT[item.boundary]}` : "";
  return `${item.symbol} | ${item.timeframe} | ${item.levelGroup}${boundaryText} | ${item.price}`;
};

const formatLineLabel = (item: StrategyStructureLineItem) => {
  const boundaryText = item.boundary ? `/${BOUNDARY_TEXT[item.boundary]}` : "";
  return `${item.symbol} | ${item.timeframe} | ${item.lineGroup}${boundaryText} | #${item.id}`;
};

export const CreateStructureAlertRule = ({
  onSuccess,
}: CreateStructureAlertRuleProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateStructureAlertRuleFormValues>();
  const targetType = Form.useWatch("targetType", form);

  const {
    data: apiConfigList,
    loading: apiConfigLoading,
    runAsync: loadApiConfig,
  } = useRequest(getOKXApiConfig, {
    manual: true,
  });

  const {
    data: keyLevels,
    loading: keyLevelsLoading,
    runAsync: loadKeyLevels,
  } = useRequest(listStrategyKeyLevels, {
    manual: true,
  });

  const {
    data: lines,
    loading: linesLoading,
    runAsync: loadLines,
  } = useRequest(listStrategyStructureLines, {
    manual: true,
  });

  const { runAsync: runCreateRule, loading: createRuleLoading } = useRequest(
    createStructureAlertRule,
    {
      manual: true,
    },
  );

  const loadTargets = async (nextTargetType: StructureAlertTargetType) => {
    if (nextTargetType === "KEY_LEVEL") {
      await loadKeyLevels({});
      return;
    }
    await loadLines({});
  };

  const handleInit = async () => {
    form.resetFields();
    form.setFieldsValue({
      targetType: "KEY_LEVEL",
      monitorNear: true,
      monitorBreakUp: true,
      monitorBreakDown: true,
      nearThreshold: 0.002,
    });

    await Promise.all([loadApiConfig(), loadTargets("KEY_LEVEL")]);
  };

  const handleTargetTypeChange = async (value: StructureAlertTargetType) => {
    form.setFieldValue("targetId", undefined);
    await loadTargets(value);
  };

  const getTargetOptions = (): StructureAlertTargetOption[] => {
    if (targetType === "STRUCTURE_LINE") {
      return (lines || []).map((item) => ({
        label: formatLineLabel(item),
        value: item.id,
        item,
      }));
    }

    return (keyLevels || []).map((item) => ({
      label: formatKeyLevelLabel(item),
      value: item.id,
      item,
    }));
  };

  const handleOk = async (closeModal: () => void) => {
    const values = await form.validateFields();

    if (
      !values.monitorNear &&
      !values.monitorBreakUp &&
      !values.monitorBreakDown
    ) {
      message.warning("至少选择一种监控方式");
      return;
    }

    const params: CreateStructureAlertRuleParams = {
      exchangeConfigId: Number(values.exchangeConfigId),
      targetType: values.targetType,
      targetId: Number(values.targetId),
      monitorNear: values.monitorNear,
      monitorBreakUp: values.monitorBreakUp,
      monitorBreakDown: values.monitorBreakDown,
      remark: values.remark?.trim(),
    };

    if (typeof values.nearThreshold === "number") {
      params.nearThreshold = values.nearThreshold;
    }

    if (typeof values.breakoutThreshold === "number") {
      params.breakoutThreshold = values.breakoutThreshold;
    }

    await runCreateRule(params);
    message.success("结构监控规则创建成功");
    closeModal();
    onSuccess?.();
  };

  return (
    <ActionModal
      buttonProps={{
        title: "新建规则",
        type: "primary",
        onClick: handleInit,
      }}
      modalProps={{
        title: "新建结构监控规则",
        width: 760,
        maskClosable: false,
        onOk: handleOk,
        confirmLoading: createRuleLoading,
      }}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="交易所配置"
              name="exchangeConfigId"
              rules={[{ required: true, message: "请选择交易所配置" }]}
            >
              <Select
                loading={apiConfigLoading}
                options={(apiConfigList || []).map((item) => ({
                  label: item.configName,
                  value: item.id,
                }))}
                placeholder="请选择交易所配置"
                allowClear
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="目标类型"
              name="targetType"
              rules={[{ required: true, message: "请选择目标类型" }]}
            >
              <Select
                options={TARGET_TYPE_OPTIONS}
                placeholder="请选择目标类型"
                onChange={handleTargetTypeChange}
                allowClear
              />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="监控目标"
              name="targetId"
              rules={[{ required: true, message: "请选择监控目标" }]}
            >
              <Select
                loading={
                  targetType === "STRUCTURE_LINE"
                    ? linesLoading
                    : keyLevelsLoading
                }
                showSearch
                filterOption={(input, option) =>
                  String(option?.label || "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={getTargetOptions()}
                placeholder="请选择监控目标"
                allowClear
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="监控靠近"
              name="monitorNear"
              valuePropName="checked"
            >
              <Switch checkedChildren="开" unCheckedChildren="关" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="监控向上突破"
              name="monitorBreakUp"
              valuePropName="checked"
            >
              <Switch checkedChildren="开" unCheckedChildren="关" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item
              label="监控向下跌破"
              name="monitorBreakDown"
              valuePropName="checked"
            >
              <Switch checkedChildren="开" unCheckedChildren="关" />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="靠近阈值"
              name="nearThreshold"
              rules={[
                {
                  type: "number",
                  min: 0,
                  message: "靠近阈值不能小于 0",
                },
              ]}
              extra="例如 0.002 表示 0.2%"
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                step={0.0001}
                placeholder="请输入靠近阈值"
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              label="突破阈值"
              name="breakoutThreshold"
              rules={[
                {
                  type: "number",
                  min: 0,
                  message: "突破阈值不能小于 0",
                },
              ]}
              extra="当前版本预留，后端暂未参与突破计算"
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                step={0.0001}
                placeholder="请输入突破阈值"
              />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item label="备注" name="remark">
              <Input.TextArea
                rows={3}
                maxLength={255}
                showCount
                placeholder="可选，填写这条监控规则的说明"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </ActionModal>
  );
};
