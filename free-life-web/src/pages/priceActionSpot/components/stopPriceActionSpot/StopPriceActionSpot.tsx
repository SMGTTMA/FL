import { useState } from "react";
import { Popconfirm, Button, App } from "antd";
import { stopPriceActionSpotStrategy } from "@/api/services/strategiesService";

type StopPriceActionSpotProps = {
  strategyId: number;
  onSuccess?: () => void;
};

export const StopPriceActionSpot = ({
  strategyId,
  onSuccess,
}: StopPriceActionSpotProps) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleStop = async () => {
    setLoading(true);
    try {
      await stopPriceActionSpotStrategy({ strategyId });
      message.success("策略已停止");
      onSuccess?.();
    } catch {
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
