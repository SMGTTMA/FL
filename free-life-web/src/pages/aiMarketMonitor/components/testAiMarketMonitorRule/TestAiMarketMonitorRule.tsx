import { useState } from "react";
import { App, Button, Descriptions, Modal, Tag } from "antd";
import { testAiMarketMonitorRule } from "@/api/services/aiMarketMonitorService";

type TestAiMarketMonitorRuleProps = {
  /** 规则ID */
  ruleId: number;
  /** 测试后回调 */
  onSuccess?: () => void;
};

const notifyStatusTextMap: Record<string, string> = {
  not_needed: "无需通知",
  success: "通知成功",
  failed: "通知失败",
  data_insufficient: "数据不足",
  config_invalid: "配置无效",
  skipped_not_due: "未到执行时间",
};

/**
 * 测试 AI 市场监控规则
 */
export const TestAiMarketMonitorRule = ({
  ruleId,
  onSuccess,
}: TestAiMarketMonitorRuleProps) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      const res = await testAiMarketMonitorRule({ ruleId });
      Modal.info({
        title: "规则测试结果",
        width: 680,
        content: (
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="规则ID">{res.ruleId}</Descriptions.Item>
            <Descriptions.Item label="交易对">{res.symbol}</Descriptions.Item>
            <Descriptions.Item label="监控周期">
              {res.checkInterval}
            </Descriptions.Item>
            <Descriptions.Item label="是否命中">
              {res.triggered ? (
                <Tag color="green">已命中</Tag>
              ) : (
                <Tag color="default">未命中</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="通知状态">
              {notifyStatusTextMap[res.notifyStatus] ?? res.notifyStatus}
            </Descriptions.Item>
            <Descriptions.Item label="置信度">
              {res.confidence}
            </Descriptions.Item>
            <Descriptions.Item label="自动停止">
              {res.autoStopped ? (
                <Tag color="orange">是</Tag>
              ) : (
                <Tag color="default">否</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="原因">{res.reason || "-"}</Descriptions.Item>
          </Descriptions>
        ),
      });
      onSuccess?.();
    } catch (error) {
      message.error("测试规则失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="link" loading={loading} onClick={handleTest}>
      测试
    </Button>
  );
};
