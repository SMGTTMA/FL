import { ActionModal } from "@/components/actionModal/ActionModal";
import { App, Button, ButtonProps, Form, Input } from "antd";
import { create, findOne, update } from "@/api/services/tradingPairsService";
import type {
  CreateTradingPairDto,
  UpdateTradingPairDto,
} from "@/api/types/tradingPairsTypes";
import { ExchangeSelect } from "@/components/select/exchangeSelect/ExchangeSelect";
import { TradingTypeSelect } from "@/components/select/tradingTypeSelect/TradingTypeSelect";

type FormValues = CreateTradingPairDto;

export type AddOrEditTradingPairsProps = {
  operation: "add" | "edit";
  id?: number;
  onSuccess?: () => void;
};

const operationMap: Record<
  AddOrEditTradingPairsProps["operation"],
  {
    title: string;
    btnType: ButtonProps["type"];
  }
> = {
  add: {
    title: "新增",
    btnType: "primary",
  },
  edit: {
    title: "编辑",
    btnType: "link",
  },
};

// 处理输入框的值，去除前后空格
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value.trim();
  return value;
};

export const AddOrEditTradingPairs = (props: AddOrEditTradingPairsProps) => {
  const { operation, id, onSuccess } = props;
  const { message } = App.useApp();

  const [form] = Form.useForm<FormValues>();

  const handleOpen = () => {
    if (operation === "add") {
      form.resetFields();
    }

    if (operation === "edit" && id) {
      findOne(id).then((data) => {
        form.setFieldsValue(data);
      });
    }
  };

  const handleConvert = () => {
    const symbol = form.getFieldValue("symbol");
    if (!symbol) {
      message.error("请输入交易对符号");
      return;
    }
    const [baseAsset, quoteAsset] = symbol.split("/");
    form.setFieldsValue({
      baseAsset,
      quoteAsset,
    });
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (operation === "add") {
        await create(values);
      } else if (id) {
        // 更新时需要包含id
        const updateData: UpdateTradingPairDto = {
          ...values,
          id,
        };
        await update(id, updateData);
      }
      message.success(`${operationMap[operation].title}成功`);
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      console.error("表单提交失败:", error);
      message.error(`${operationMap[operation].title}失败`);
    }
  };

  return (
    <ActionModal
      buttonProps={{
        title: operationMap[operation].title,
        type: operationMap[operation].btnType,
        onClick: handleOpen,
      }}
      modalProps={{
        title: operationMap[operation].title,
        maskClosable: false,
        onOk: handleSubmit,
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="交易对符号"
          name="symbol"
          required
          rules={[{ required: true, message: "请输入交易对符号" }]}
          getValueFromEvent={handleInputChange}
          normalize={(value) => value?.trim()}
        >
          <Input
            placeholder="请输入交易对符号，例如：BTC/USDT"
            suffix={
              <Button type="link" onClick={handleConvert}>
                转化
              </Button>
            }
          />
        </Form.Item>
        <Form.Item
          label="基础资产"
          name="baseAsset"
          required
          rules={[{ required: true, message: "请输入基础资产" }]}
          getValueFromEvent={handleInputChange}
          normalize={(value) => value?.trim()}
        >
          <Input placeholder="请输入基础资产，例如：BTC" />
        </Form.Item>
        <Form.Item
          label="计价资产"
          name="quoteAsset"
          required
          rules={[{ required: true, message: "请输入计价资产" }]}
          getValueFromEvent={handleInputChange}
          normalize={(value) => value?.trim()}
        >
          <Input placeholder="请输入计价资产，例如：USDT" />
        </Form.Item>
        <Form.Item
          label="交易类型"
          name="type"
          required
          rules={[{ required: true, message: "请选择交易类型" }]}
        >
          <TradingTypeSelect />
        </Form.Item>
        <Form.Item
          label="交易所名称"
          name="exchangeName"
          required
          rules={[{ required: true, message: "请输入交易所名称" }]}
        >
          <ExchangeSelect />
        </Form.Item>
      </Form>
    </ActionModal>
  );
};
