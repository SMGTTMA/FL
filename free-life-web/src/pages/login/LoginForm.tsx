import { Button, Checkbox, Col, Form, Input, Row } from "antd";
import type { SignInReq } from "@/api/services/userService";
import { useSignIn } from "@/store/userStore";
import { useRSAEncrypt } from "@/hooks/useRSAEncrypt";

function LoginForm() {
  const { signIn, loading } = useSignIn();
  const { encrypt } = useRSAEncrypt();

  const handleFinish = async ({ username, password }: SignInReq) => {
    const encryptedPassword = await encrypt(password);
    await signIn({ username, password: encryptedPassword });
  };

  return (
    <>
      <div className="mb-4 text-2xl font-bold xl:text-3xl">登录</div>
      <Form
        name="login"
        size="large"
        initialValues={{
          remember: true,
        }}
        onFinish={handleFinish}
      >
        <Form.Item
          name="username"
          rules={[{ required: true, message: "请输入账号" }]}
        >
          <Input placeholder="请输入账号" />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: "请输入密码" }]}
        >
          <Input.Password type="password" placeholder="请输入密码" />
        </Form.Item>
        <Form.Item>
          <Row align="middle">
            <Col span={12}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住我</Checkbox>
              </Form.Item>
            </Col>
          </Row>
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            className="w-full"
            loading={loading}
          >
            登录
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}

export default LoginForm;
