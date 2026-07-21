import { Card, Form, Input, Button } from "antd";
import { registerUser } from "@/api/services/userService";
import { useRequest } from "ahooks";
import { App } from "antd";

type RegisterUserProps = {
  onSuccess?: () => void;
  useCard?: boolean;
};

export const RegisterUser = ({ onSuccess, useCard = true }: RegisterUserProps) => {
  const { message } = App.useApp();

  const { runAsync: registerUserAsync, loading: registerUserLoading } =
    useRequest(registerUser, {
      manual: true,
    });

  const [form] = Form.useForm();

  const onFinish = (values: { username: string; password: string }) => {
    registerUserAsync(values).then(() => {
      message.success("注册成功");
      form.resetFields();
      onSuccess?.();
    });
  };

  const formNode = (
    <>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={useCard ? { maxWidth: 400 } : undefined}
      >
        <Form.Item
          label="账号"
          name="username"
          rules={[
            { required: true, message: "请输入账号" },
            { min: 1, max: 50, message: "账号长度为 1-50 位" },
          ]}
          normalize={(value) => value?.trim()}
        >
          <Input placeholder="请输入账号" autoComplete="username" />
        </Form.Item>
        <Form.Item
          label="密码"
          name="password"
          rules={[
            { required: true, message: "请输入密码" },
            { min: 6, message: "密码至少 6 位" },
          ]}
        >
          <Input.Password
            placeholder="请输入密码"
            autoComplete="new-password"
          />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={registerUserLoading}
          >
            注册
          </Button>
        </Form.Item>
      </Form>
    </>
  );

  if (!useCard) {
    return formNode;
  }

  return (
    <Card title="注册用户">
      {formNode}
    </Card>
  );
};
