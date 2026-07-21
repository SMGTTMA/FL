import { useState } from "react";
import { Popconfirm, Button, App } from "antd";
import { stopSignalWatch } from "@/api/services/indicatorSignalService";

/**
 * StopSignalWatch 组件 props 类型
 */
type StopSignalWatchProps = {
  /** 监听ID */
  watchId: number;
  /** 停止后刷新 */
  onSuccess?: () => void;
};

/**
 * 停止信号监听组件
 */
export const StopSignalWatch = ({
  watchId,
  onSuccess,
}: StopSignalWatchProps) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  /** 停止监听 */
  const handleStop = async () => {
    setLoading(true);
    try {
      await stopSignalWatch({ watchId });
      message.success("监听已停止");
      onSuccess?.();
    } catch (error) {
      message.error("停止监听失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popconfirm
      title="确定要停止该监听吗？"
      description="停止后将不再监控该交易对的技术指标信号"
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
