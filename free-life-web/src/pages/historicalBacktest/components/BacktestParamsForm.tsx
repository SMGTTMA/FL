import {
  Collapse,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Button,
  Row,
  Col,
} from "antd";
import type { FormInstance, Rule } from "antd/es/form";
import type {
  BacktestFieldOption,
  BacktestFieldSchema,
  BacktestScenarioDefinition,
} from "../scenarios/types";

type BacktestFieldRuntimeConfig = {
  options?: BacktestFieldOption[];
  loading?: boolean;
  disabled?: boolean;
};

type BacktestParamsFormProps = {
  form: FormInstance<Record<string, unknown>>;
  scenario: BacktestScenarioDefinition;
  loading?: boolean;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  fieldRuntimeConfig?: Record<string, BacktestFieldRuntimeConfig>;
};

const symbolRules: Rule[] = [{ required: true, message: "请选择交易对" }];

const getRules = (field: BacktestFieldSchema): Rule[] => {
  if (field.name === "symbol") {
    return symbolRules;
  }

  if (!field.required) {
    return [];
  }
  return [{ required: true, message: `请填写${field.label}` }];
};

const renderField = (
  field: BacktestFieldSchema,
  runtimeConfig?: BacktestFieldRuntimeConfig,
) => {
  switch (field.type) {
    case "input":
      return <Input placeholder={field.placeholder} allowClear />;
    case "select":
      return (
        <Select
          loading={runtimeConfig?.loading}
          disabled={runtimeConfig?.disabled}
          showSearch={field.name === "symbol"}
          filterOption={(input, option) =>
            String(option?.label ?? "")
              .toLowerCase()
              .includes(input.toLowerCase())
          }
          options={runtimeConfig?.options ?? field.options}
          placeholder={field.placeholder || `请选择${field.label}`}
          allowClear
        />
      );
    case "number":
      return (
        <InputNumber
          style={{ width: "100%" }}
          placeholder={field.placeholder || `请输入${field.label}`}
          min={field.min}
          max={field.max}
          step={field.step}
          precision={field.precision}
        />
      );
    case "switch":
      return <Switch checkedChildren="开" unCheckedChildren="关" />;
    case "datetime":
      return (
        <DatePicker
          style={{ width: "100%" }}
          showTime
          format="YYYY-MM-DD HH:mm:ss"
          placeholder={field.placeholder || `请选择${field.label}`}
        />
      );
    default:
      return null;
  }
};

export const BacktestParamsForm = ({
  form,
  scenario,
  loading,
  onSubmit,
  fieldRuntimeConfig,
}: BacktestParamsFormProps) => {
  const basicFields = scenario.fields.filter(
    (item) => item.section === "basic",
  );
  const advancedFields = scenario.fields.filter(
    (item) => item.section === "advanced",
  );

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      initialValues={scenario.initialValues}
    >
      <Row gutter={12}>
        {basicFields.map((field) => (
          <Col span={8} key={field.name}>
            <Form.Item
              label={field.label}
              name={field.name}
              valuePropName={field.type === "switch" ? "checked" : "value"}
              rules={getRules(field)}
            >
              {renderField(field, fieldRuntimeConfig?.[field.name])}
            </Form.Item>
          </Col>
        ))}
      </Row>

      {advancedFields.length > 0 && (
        <Collapse
          ghost
          size="small"
          items={[
            {
              key: "advanced",
              label: "高级参数",
              children: (
                <Row gutter={12}>
                  {advancedFields.map((field) => (
                    <Col span={8} key={field.name}>
                      <Form.Item
                        label={field.label}
                        name={field.name}
                        valuePropName={
                          field.type === "switch" ? "checked" : "value"
                        }
                        rules={getRules(field)}
                      >
                        {renderField(field, fieldRuntimeConfig?.[field.name])}
                      </Form.Item>
                    </Col>
                  ))}
                </Row>
              ),
            },
          ]}
        />
      )}

      <Space className="mt-2">
        <Button type="primary" htmlType="submit" loading={loading}>
          开始回测
        </Button>
        <Button
          onClick={() => {
            form.resetFields();
            form.setFieldsValue(scenario.initialValues as any);
          }}
          disabled={loading}
        >
          重置参数
        </Button>
      </Space>
    </Form>
  );
};
