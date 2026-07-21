import { TradingPairIsActive, TradingPairType } from "@/api/enums/global";
import { getOKXApiConfig } from "@/api/services/apiConfig";
import { startSignalWatch } from "@/api/services/indicatorSignalService";
import { findAll } from "@/api/services/tradingPairsService";
import { StartSignalWatchParams } from "@/api/types/indicatorSignalTypes";
import { ActionModal } from "@/components/actionModal/ActionModal";
import { useRequest } from "ahooks";
import { Alert, App, Col, Form, Row, Select } from "antd";

/**
 * 启动信号监听组件属性
 */
type StartSignalWatchProps = {
  /** 成功回调 */
  onSuccess?: () => void;
};

/**
 * 启动信号监听组件
 */
export const StartSignalWatch = ({ onSuccess }: StartSignalWatchProps) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<StartSignalWatchParams>();

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

  const { runAsync: startWatch, loading: startWatchLoading } = useRequest(
    startSignalWatch,
    {
      manual: true,
    }
  );

  /** 初始化弹窗 */
  const handleInit = async () => {
    form.resetFields();
    requestTradingPairsList({
      isActive: TradingPairIsActive.ACTIVE,
    });
    requestApiConfigList();
  };

  /** 确认提交 */
  const handleOk = async (closeModal: () => void) => {
    const formValues = await form.validateFields();
    const { exchangeConfigId, symbol } = formValues;

    const params: StartSignalWatchParams = {
      exchangeConfigId: Number(exchangeConfigId),
      symbol,
    };

    await startWatch(params).then((data) => {
      message.success(data);
      closeModal();
      onSuccess?.();
    });
  };

  return (
    <ActionModal
      buttonProps={{
        title: "启动监听",
        type: "primary",
        onClick: handleInit,
      }}
      modalProps={{
        maskClosable: false,
        onOk: handleOk,
        confirmLoading: startWatchLoading,
        width: 600,
        title: "启动技术指标信号监听",
      }}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          {/* 提示信息 */}
          <Col span={24} className="mb-4">
            <Alert
              message="技术指标信号监听：监控指定交易对的K线形态，检测到信号后会通过企业微信推送"
              type="info"
            />
          </Col>

          {/* OKX API配置 */}
          <Col span={24}>
            <Form.Item
              label="OKX API配置"
              name="exchangeConfigId"
              rules={[{ required: true, message: "请选择OKX API配置" }]}
            >
              <Select
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
          <Col span={24}>
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
        </Row>
      </Form>
    </ActionModal>
  );
};
