import { useState } from "react";
import { App, Button, Popconfirm } from "antd";
import { stopAiMarketMonitorRule } from "@/api/services/aiMarketMonitorService";

type StopAiMarketMonitorRuleProps = {
  /** 规则ID */
  ruleId: number;
  /** 是否可操作 */
  disabled?: boolean;
  /** 成功回调 */
  onSuccess?: () => void;
};

/**
 * 停止 AI 市场监控规则
 */
export const StopAiMarketMonitorRule = ({
  ruleId,
  disabled,
  onSuccess,
}: StopAiMarketMonitorRuleProps) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleStop = async () => {
    setLoading(true);
    try {
      const res = await stopAiMarketMonitorRule({ ruleId: Number(ruleId) });
      message.success(res || "规则已停止");
      onSuccess?.();
    } catch (error) {
      message.error("停止规则失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popconfirm
      title="确定要停止该规则吗？"
      description="停止后该规则将不再执行监控"
      onConfirm={handleStop}
      okText="确定"
      cancelText="取消"
      disabled={disabled || loading}
    >
      <Button type="link" danger disabled={disabled} loading={loading}>
        停止
      </Button>
    </Popconfirm>
  );
};
