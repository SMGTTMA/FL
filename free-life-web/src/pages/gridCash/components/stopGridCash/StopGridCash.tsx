import { useState } from "react";
import { Popconfirm, Button, App } from "antd";
import { stopGridCashStrategy } from "@/api/services/strategiesService";

/**
 * StopGridCash 组件 props 类型
 */
type StopGridCashProps = {
  /** 策略ID */
  strategyId: number;
  /** 停止后刷新 */
  onSuccess?: () => void;
};

/**
 * 停止网格现货策略组件
 */
export const StopGridCash = ({ strategyId, onSuccess }: StopGridCashProps) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  /** 停止策略 */
  const handleStop = async () => {
    setLoading(true);
    try {
      await stopGridCashStrategy({ strategyId });
      message.success("策略已停止");
      onSuccess?.();
    } catch (error) {
      message.error("停止策略失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popconfirm
      title="确定要停止该策略吗？"
      description="停止后策略将不再执行"
      onConfirm={handleStop}
      okText="确定"
      cancelText="取消"
      disabled={loading}
    >
      <Button type="link" loading={loading} danger>
        停止
      </Button>
    </Popconfirm>
  );
};
