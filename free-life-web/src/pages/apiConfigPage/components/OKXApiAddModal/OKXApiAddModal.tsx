import { ActionModal } from "@/components/actionModal/ActionModal";
import { Form, Input, Switch } from "antd";
import { useForm } from "antd/es/form/Form";
import type { AddOKXApiConfigParams } from "@/api/types/apiConfigTypes";
import type { FC } from "react";
import { useRequest } from "ahooks";
import { addOKXApiConfig } from "@/api/services/apiConfig";
import { useRSAEncrypt } from "@/hooks/useRSAEncrypt";

/**
 * OKXApiAddModal 组件props类型
 * @property 无
 */
type OKXApiAddModalProps = {
  refresh: () => void;
};

/**
 * OKX API 新增弹窗表单组件
 * @default 无props
 */
export const OKXApiAddModal: FC<OKXApiAddModalProps> = ({ refresh }) => {
  const { encrypt } = useRSAEncrypt();

  const { runAsync: addOKXApiConfigRequest, loading } = useRequest(
    addOKXApiConfig,
    {
      manual: true,
    }
  );

  const [form] = useForm<AddOKXApiConfigParams>();

  const handleInit = () => {
    form.resetFields();
  };

  // 表单提交
  const handleFinish = async () => {
    const formValues = await form.validateFields();
    const { apiKey, secretKey, passphrase, ...rest } = formValues;
    const [encryptedApiKey, encryptedSecretKey, encryptedPassphrase] =
      await Promise.all([
        encrypt(apiKey),
        encrypt(secretKey),
        encrypt(passphrase),
      ]);

    await addOKXApiConfigRequest({
      ...rest,
      apiKey: encryptedApiKey,
      secretKey: encryptedSecretKey,
      passphrase: encryptedPassphrase,
    });
    refresh();
  };

  return (
    <ActionModal
      buttonProps={{
        title: "新增",
        type: "primary",
        onClick: handleInit,
      }}
      modalProps={{
        title: "OKX API新增",
        onOk: handleFinish,
        confirmLoading: loading,
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          isTestNet: false,
          isActive: true,
        }}
      >
        <Form.Item
          label="配置名称"
          name="configName"
          rules={[{ required: true, message: "请输入配置名称" }]}
        >
          <Input placeholder="请输入配置名称" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="API Key"
          name="apiKey"
          rules={[{ required: true, message: "请输入API Key" }]}
        >
          <Input placeholder="请输入API Key" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="Secret Key"
          name="secretKey"
          rules={[{ required: true, message: "请输入Secret Key" }]}
        >
          <Input placeholder="请输入Secret Key" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="api pwd"
          name="passphrase"
          rules={[{ required: true, message: "请输入api pwd" }]}
        >
          <Input placeholder="请输入api pwd" autoComplete="off" />
        </Form.Item>
        <Form.Item
          label="是否为测试网"
          name="isTestNet"
          valuePropName="checked"
        >
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
        <Form.Item label="是否激活" name="isActive" valuePropName="checked">
          <Switch checkedChildren="激活" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </ActionModal>
  );
};
